// Diagnostic: checks auth and inspects a few recent Done builds for date fields
const JIRA_BASE = 'https://ati-motors.atlassian.net/rest/api/3';

module.exports = async function handler(req, res) {
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!email || !token) return res.status(200).json({ ok: false, error: 'Env vars not set' });

  const auth = Buffer.from(`${email}:${token}`).toString('base64');

  const search = await fetch(
    `${JIRA_BASE}/search/jql?jql=project%3DMOM%20AND%20status%3D%22Done%22%20ORDER%20BY%20updated%20DESC&maxResults=5&fields=summary,status,customfield_10743,customfield_11203,customfield_10709,duedate`,
    { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } }
  );
  const data = await search.json();

  const issues = (data.issues || []).map(i => ({
    key: i.key,
    summary: i.fields.summary,
    status: i.fields.status?.name,
    actualDispatchDate: i.fields.customfield_10743,
    dispatchMonthActual: i.fields.customfield_11203?.value,
    dispatchMonthPlan: i.fields.customfield_10709?.value,
    duedate: i.fields.duedate,
  }));

  return res.status(200).json({ total: data.total, sample: issues });
};
