function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function sanitizeText(value, max = 4000) {
  return String(value || '').trim().slice(0, max);
}

function normalizeOrigin(origin) {
  try {
    const url = new URL(String(origin || '').trim());
    const protocol = url.protocol.toLowerCase();
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const port = url.port ? `:${url.port}` : '';
    return `${protocol}//${host}${port}`;
  } catch (_) {
    return '';
  }
}

function getAllowedOrigins() {
  return String(process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(v => normalizeOrigin(v))
    .filter(Boolean);
}

function getRequestOrigin(req) {
  const headerOrigin = normalizeOrigin(req.headers.origin || '');
  if (headerOrigin) return headerOrigin;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host) return '';
  return normalizeOrigin(`${proto}://${host}`);
}

function allowOrigin(req) {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = getRequestOrigin(req);
  if (!allowedOrigins.length || !requestOrigin) return true;
  return allowedOrigins.includes(requestOrigin);
}

module.exports = async (req, res) => {
  const requestOrigin = getRequestOrigin(req);
  const allowedOrigins = getAllowedOrigins();
  const corsOrigin = allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : (allowedOrigins[0] || '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    return res.end();
  }

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);

  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!allowOrigin(req)) return json(res, 403, { ok: false, error: 'Origin not allowed' });

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'support@creditfinancials.xyz';
  const senderName = process.env.BREVO_SENDER_NAME || 'CreditFinancials';
  const replyTo = process.env.BREVO_REPLY_TO || senderEmail;

  if (!apiKey) return json(res, 500, { ok: false, error: 'Missing BREVO_API_KEY' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const to = sanitizeText(body.to, 320);
    const subject = sanitizeText(body.subject, 180);
    const text = sanitizeText(body.text, 8000);
    const html = String(body.html || '').trim().slice(0, 20000);

    if (!to || !subject || (!text && !html)) {
      return json(res, 400, { ok: false, error: 'Missing required email fields' });
    }

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        replyTo: { email: replyTo, name: senderName },
        subject,
        textContent: text || undefined,
        htmlContent: html || undefined
      })
    });

    const result = await brevoRes.json().catch(() => ({}));
    if (!brevoRes.ok) {
      return json(res, brevoRes.status || 500, {
        ok: false,
        error: result.message || 'Brevo send failed',
        details: result
      });
    }

    return json(res, 200, { ok: true, messageId: result.messageId || null });
  } catch (err) {
    return json(res, 500, { ok: false, error: err?.message || 'Unexpected server error' });
  }
};
