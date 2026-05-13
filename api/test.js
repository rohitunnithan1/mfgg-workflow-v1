// Quick diagnostic — visit /api/test to confirm credentials + Jira access
const JIRA_BASE = 'https://ati-motors.atlassian.net/rest/api/3';

module.exports = async function handler(req, res) {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!email || !token) {
    return res.status(200).json({ ok: false, error: 'Env vars not set', JIRA_EMAIL: !!email, JIRA_API_TOKEN: !!token });
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  // Step 1: confirm auth works
  const me = await fetch(`${JIRA_BASE}/myself`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
  });
  const meData = await me.json();
  if (!me.ok) return res.status(200).json({ ok: false, step: 'auth', status: me.status, body: meData });

  // Step 2: minimal search — no fields param
  const search = await fetch(
    `${JIRA_BASE}/issue/search?jql=project%3DMOM%20ORDER%20BY%20created%20DESC&maxResults=1`,
    { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }
  );
  const searchData = await search.json();

  return res.status(200).json({
    ok: search.ok,
    authUser: meData.emailAddress,
    searchStatus: search.status,
    totalIssues: searchData.total,
    firstIssue: searchData.issues?.[0]?.key,
    searchError: searchData.errorMessages || null,
  });
};
