// Serverless endpoint to fetch Instagram Business account media via the Instagram Graph API.
// Expects environment variables:
// - IG_ACCESS_TOKEN (long-lived access token with required permissions)
// - IG_USER_ID (the Instagram Business/Creator user ID)
// Optional:
// - CACHE_TTL_MS (override default cache TTL in ms)
//
// Deploy this as a serverless function (Vercel/Netlify) at /api/instagram. Keep your tokens secret.

const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
let cache = { ts: 0, data: null };

function now() { return Date.now(); }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const token = process.env.IG_ACCESS_TOKEN;
  const userId = process.env.IG_USER_ID;
  if (!token || !userId) {
    return res.status(500).json({ error: 'missing_env', message: 'IG_ACCESS_TOKEN and IG_USER_ID must be configured' });
  }

  const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS);
  const nowTs = now();
  if (cache.data && (nowTs - cache.ts) < CACHE_TTL_MS) {
    return res.status(200).json(cache.data);
  }

  // Fields: media_type, media_url, thumbnail_url (for videos), permalink, caption, timestamp
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
  const url = `https://graph.instagram.com/${userId}/media?fields=${fields}&access_token=${token}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Instagram API error', resp.status, txt);
      return res.status(502).json({ error: 'instagram_api_error', status: resp.status, details: txt });
    }

    const json = await resp.json();
    // Basic shape: { data: [ ... ], paging: { ... } }
    cache = { ts: nowTs, data: json };
    return res.status(200).json(json);
  } catch (err) {
    console.error('Failed to fetch Instagram media', err);
    return res.status(500).json({ error: 'fetch_failed', message: String(err) });
  }
}
