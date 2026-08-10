// Vercel-style serverless function that creates a GitHub issue from a POST.
// Adds honeypot, message-length, origin checks, and a best-effort rate limiter.
//
// IMPORTANT:
// - Set GITHUB_TOKEN in environment (PAT with public_repo or repo scope).
// - Update ALLOWED_ORIGINS with your production domain(s) before deploying.

const ALLOWED_ORIGINS = [
  'https://thetasveerhouse.vercel.app', // update to your production URL
  'http://localhost:8000',              // for local testing
];

const MAX_MESSAGE_LENGTH = 4000; // reject overly long messages
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const RATE_LIMIT_MAX = 30; // max submissions per IP per window (tune as needed)

// Best-effort in-memory rate limiter (NOT reliable across multiple serverless instances)
const rateMap = new Map();

function now() {
  return Date.now();
}

function isOriginAllowed(originHeader) {
  if (!originHeader) return true; // allow if no origin sent (some clients)
  return ALLOWED_ORIGINS.some(o => originHeader.startsWith(o));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'server_misconfiguration', message: 'GITHUB_TOKEN not configured' });

  // Parse JSON body (hosting platforms generally parse JSON into req.body)
  let payload = req.body || {};
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) { payload = {}; }
  }

  const hp = (payload.hp_field || payload.hpField || '').toString();
  const name = (payload.name || '').toString().trim();
  const email = (payload.email || '').toString().trim();
  const phone = (payload.phone || '').toString().trim();
  const message = (payload.message || '').toString().trim();
  const preferred = (payload.method || '').toString().trim();
  const page = (payload.page || '').toString().trim();

  // Honeypot check
  if (hp && hp.trim() !== '') {
    return res.status(400).json({ error: 'honeypot_triggered', message: 'Rejected as spam' });
  }

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'missing_fields', message: 'Name, email, and message are required' });
  }

  // Message length
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'message_too_long', message: `Message exceeds ${MAX_MESSAGE_LENGTH} characters` });
  }

  // Origin check (optional but recommended)
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin && !isOriginAllowed(origin)) {
    return res.status(403).json({ error: 'origin_not_allowed', message: 'Submissions from this origin are not allowed' });
  }

  // Rate limiting by IP (best-effort)
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const nowTs = now();
  const entry = rateMap.get(ip) || [];
  // keep only recent timestamps
  const recent = entry.filter(ts => ts > nowTs - RATE_LIMIT_WINDOW_MS);
  recent.push(nowTs);
  rateMap.set(ip, recent);
  if (recent.length > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'rate_limited', message: 'Too many submissions from your IP, please try later' });
  }

  // Build issue content (Markdown)
  const title = `Website inquiry: ${name}`.slice(0, 120);
  let body = `**New website inquiry**\n\n`;
  body += `- **Name:** ${name}\n`;
  body += `- **Email:** ${email}\n`;
  body += `- **Phone:** ${phone || '(not provided)'}\n`;
  body += `- **Preferred contact:** ${preferred || '(not provided)'}\n`;
  if (page) body += `- **Page:** ${page}\n`;
  body += `\n**Message**\n\n${message}\n\n`;
  body += `---\nSubmitted via site at ${new Date().toISOString()}`;

  const repoOwner = 'abbasniaz';
  const repoName = 'thetasveerhouse';
  const issueData = { title, body };

  try {
    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(issueData)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('GitHub API error', response.status, errText);
      return res.status(502).json({ error: 'github_api_error', details: errText });
    }

    const data = await response.json();
    return res.status(201).json({ ok: true, issueUrl: data.html_url });
  } catch (err) {
    console.error('Unexpected error creating issue', err);
    return res.status(500).json({ error: 'unexpected_error', message: String(err) });
  }
}
