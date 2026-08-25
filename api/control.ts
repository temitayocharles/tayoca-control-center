import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';

const ALLOWED_ACTIONS = new Set([
  'list_workflows','get_workflow','create_workflow','update_workflow','delete_workflow',
  'publish_workflow','unpublish_workflow','run_workflow',
  'list_executions','get_execution','list_credentials','list_variables',
  'list_content','get_content','create_content','update_content','delete_content',
]);

const secureHeaders = (res: VercelResponse) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
};

type GatewayResult = { status: number; data: unknown };

async function gatewayRequest(gatewayUrl: string, gatewayToken: string, body: Record<string, unknown>): Promise<GatewayResult> {
  const timestamp = String(Date.now());
  const nonce = randomBytes(24).toString('base64url');
  const upstream = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-tayoca-gateway-token': gatewayToken,
      'x-tayoca-timestamp': timestamp,
      'x-tayoca-nonce': nonce,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  const text = await upstream.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { error: 'invalid_gateway_response' }; }
  return { status: upstream.status, data };
}

async function runWebhookWorkflow(
  gatewayUrl: string,
  gatewayToken: string,
  id: string,
): Promise<GatewayResult> {
  if (!id) return { status: 400, data: { error: 'workflow_id_required' } };

  const lookup = await gatewayRequest(gatewayUrl, gatewayToken, { action: 'get_workflow', id });
  if (lookup.status < 200 || lookup.status >= 300) return lookup;

  const workflow = lookup.data as Record<string, unknown>;
  if (workflow.active !== true) {
    return { status: 409, data: { error: 'workflow_not_published', message: 'Publish the workflow before running its production webhook.' } };
  }

  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes as Array<Record<string, unknown>> : [];
  const candidates = nodes.filter(node => {
    if (node.type !== 'n8n-nodes-base.webhook') return false;
    const parameters = node.parameters as Record<string, unknown> | undefined;
    if (!parameters || parameters.authentication !== 'none' || parameters.multipleMethods === true) return false;
    const method = String(parameters.httpMethod || 'GET').toUpperCase();
    const path = String(parameters.path || '');
    return (method === 'GET' || method === 'POST') && Boolean(path) && !path.includes(':');
  });

  if (candidates.length !== 1) {
    return {
      status: 409,
      data: {
        error: 'workflow_not_directly_runnable',
        message: 'Direct Run is available only for a published workflow with exactly one unauthenticated static GET or POST webhook trigger.',
      },
    };
  }

  const parameters = candidates[0].parameters as Record<string, unknown>;
  const method = String(parameters.httpMethod || 'GET').toUpperCase();
  const path = String(parameters.path || '').replace(/^\/+/, '');
  const origin = new URL(gatewayUrl).origin;
  const triggerUrl = `${origin}/webhook/${path}`;

  const response = await fetch(triggerUrl, {
    method,
    headers: method === 'POST' ? { 'content-type': 'application/json' } : undefined,
    body: method === 'POST' ? '{}' : undefined,
    signal: AbortSignal.timeout(45_000),
  });

  const text = await response.text();
  let result: unknown = text;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = text;
  }

  if (!response.ok) {
    return {
      status: response.status,
      data: { error: 'workflow_trigger_failed', statusCode: response.status, response: result },
    };
  }

  return { status: 200, data: { ok: true, statusCode: response.status, response: result } };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  secureHeaders(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  if (process.env.VERCEL_ENV === 'production' && process.env.ALLOW_PRODUCTION_CONTROL_CENTER !== 'true') {
    return res.status(404).json({ error: 'not_found' });
  }

  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  const host = typeof req.headers.host === 'string' ? req.headers.host : '';
  if (origin && host && origin !== `https://${host}` && origin !== `http://${host}`) {
    return res.status(403).json({ error: 'origin_rejected' });
  }

  const gatewayUrl = process.env.TAYOCA_CONTROL_GATEWAY_URL;
  const gatewayToken = process.env.TAYOCA_CONTROL_GATEWAY_TOKEN;
  if (!gatewayUrl || !gatewayToken) return res.status(503).json({ error: 'control_gateway_not_configured' });

  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  const action = String(body.action || '');
  if (!ALLOWED_ACTIONS.has(action)) return res.status(400).json({ error: 'unsupported_action' });

  try {
    const result = action === 'run_workflow'
      ? await runWebhookWorkflow(gatewayUrl, gatewayToken, String(body.id || ''))
      : await gatewayRequest(gatewayUrl, gatewayToken, body);
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error('control gateway request failed', error instanceof Error ? error.message : 'unknown');
    return res.status(502).json({ error: 'control_gateway_unavailable' });
  }
}
