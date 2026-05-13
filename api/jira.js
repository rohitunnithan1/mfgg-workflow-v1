/**
 * Jira proxy — called by the MO Dashboard frontend.
 * Set these environment variables in Vercel project settings:
 *   JIRA_EMAIL      — your Atlassian account email
 *   JIRA_API_TOKEN  — API token from https://id.atlassian.com/manage-profile/security/api-tokens
 */

// Direct tenant URL — works with Basic auth (email + API token)
const JIRA_BASE = 'https://ati-motors.atlassian.net/rest/api/3';

module.exports = async function handler(req, res) {
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

  const { jql, fields, maxResults = 100, startAt = 0 } = req.body || {};
  if (!jql) return res.status(400).json({ error: 'Missing required field: jql' });

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  try {
    const upstream = await fetch(`${JIRA_BASE}/issue/search`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ jql, fields, maxResults, startAt }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: Array.isArray(data.errorMessages)
          ? data.errorMessages.join('; ')
          : data.message || `Jira returned ${upstream.status}`,
      });
    }

    // Compute isLast + nextStartAt for frontend pagination
    const total = data.total || 0;
    const returned = (data.issues || []).length;
    const currentStart = data.startAt || 0;
    data.isLast = (currentStart + returned) >= total;
    data.nextStartAt = data.isLast ? null : currentStart + returned;

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: `Proxy error: ${err.message}` });
  }
};
