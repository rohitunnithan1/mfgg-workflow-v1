// Quick diagnostic — visit /api/test to confirm credentials + Jira access
const JIRA_V3 = 'https://ati-motors.atlassian.net/rest/api/3';
const JIRA_V2 = 'https://ati-motors.atlassian.net/rest/api/2';

module.exports = async function handler(req, res) {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!email || !token) {
    return res.status(200).json({ ok: false, error: 'Env vars not set', JIRA_EMAIL: !!email, JIRA_API_TOKEN: !!token });
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  // Step 1: confirm auth works
  const me = await fetch(`${JIRA_V3}/myself`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  const meData = await me.json();
  if (!me.ok) return res.status(200).json({ ok: false, step: 'auth', status: me.status, body: meData });

  // Step 2a: try v3 search
  const s3 = await fetch(
    `${JIRA_V3}/issue/search?jql=project%3DMOM&maxResults=1`,
    { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }
  );
  const d3 = await s3.json();

  // Step 2b: try v2 search (classic endpoint)
  const s2 = await fetch(
    `${JIRA_V2}/search?jql=project%3DMOM&maxResults=1`,
    { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }
  );
  const d2 = await s2.json();

  return res.status(200).json({
    authUser: meData.emailAddress,
    v3: { status: s3.status, total: d3.total, firstIssue: d3.issues?.[0]?.key, error: d3.errorMessages || null },
    v2: { status: s2.status, total: d2.total, firstIssue: d2.issues?.[0]?.key, error: d2.errorMessages || null },
  });
};
