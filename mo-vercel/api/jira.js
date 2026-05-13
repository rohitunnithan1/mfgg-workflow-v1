/**
 * Jira proxy — called by the MO Dashboard frontend.
 * Set these environment variables in Vercel project settings:
 *   JIRA_EMAIL      — your Atlassian account email
 *   JIRA_API_TOKEN  — API token from https://id.atlassian.com/manage-profile/security/api-tokens
 */

const CLOUD_ID = '0906a834-871d-4220-adc1-d160b95921e1';
const JIRA_BASE = `https://api.atlassian.com/ex/jira/${CLOUD_ID}/rest/api/3`;

module.exports = async function handler(req, res) {
  // CORS — allow the Vercel frontend to call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!email || !token) {
    return res.status(500).json({
      error: 'Jira credentials not configured. Set JIRA_EMAIL and JIRA_API_TOKEN in Vercel environment variables.',
    });
  }

  const { jql, fields, maxResults = 100, nextPageToken } = req.body || {};
  if (!jql) return res.status(400).json({ error: 'Missing required field: jql' });

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const body = { jql, fields, maxResults };
  if (nextPageToken) body.nextPageToken = nextPageToken;

  try {
    const upstream = await fetch(`${JIRA_BASE}/issue/search`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: Array.isArray(data.errorMessages)
          ? data.errorMessages.join('; ')
          : data.message || `Jira returned ${upstream.status}`,
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
};
