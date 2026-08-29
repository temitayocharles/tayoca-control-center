import { createHash } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const token = process.env.TAYOCA_CONTROL_GATEWAY_TOKEN;
  if (!token) {
    return res.status(503).json({ present: false });
  }

  return res.status(200).json({
    present: true,
    sha256: createHash('sha256').update(token).digest('hex'),
  });
}
