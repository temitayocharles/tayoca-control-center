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

  const timestamp = String(Date.now());
  const nonce = randomBytes(24).toString('base64url');

  try {
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
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: 'invalid_gateway_response' }; }
    return res.status(upstream.status).json(data);
  } catch (error) {
    console.error('control gateway request failed', error instanceof Error ? error.message : 'unknown');
    return res.status(502).json({ error: 'control_gateway_unavailable' });
  }
}
