// Vercel serverless function to create a GitHub issue from form submissions.
// Requires an environment variable GITHUB_TOKEN with permission to create issues on the repository.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

  const repoOwner = 'abbasniaz';
  const repoName = 'thetasveerhouse';

  // Accept JSON body or form-encoded body
  const payload = req.body || {};
  const name = payload.name || '(no name)';
  const email = payload.email || '(no email)';
  const phone = payload.phone || '(no phone)';
  const message = payload.message || '(no message)';
  const preferred = payload.method || '(no method)';
  const page = payload.page || '';

  const title = `Website inquiry: ${name}`.slice(0, 120);

  let body = `**New website inquiry**\n\n`;
  body += `- **Name:** ${name}\n`;
  body += `- **Email:** ${email}\n`;
  body += `- **Phone:** ${phone}\n`;
  body += `- **Preferred contact:** ${preferred}\n`;
  if (page) body += `- **Page:** ${page}\n`;
  body += `\n**Message**\n\n${message}\n\n`;
  body += `---\nSubmitted via site at ${new Date().toISOString()}`;

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
      return res.status(502).json({ error: 'GitHub API error', details: errText });
    }

    const data = await response.json();
    return res.status(201).json({ ok: true, issueUrl: data.html_url });
  } catch (err) {
    console.error('Unexpected error creating issue', err);
    return res.status(500).json({ error: 'Unexpected error', details: String(err) });
  }
}
