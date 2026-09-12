module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase environment variables are missing');
    return res.status(500).json({ error: 'Analytics is not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const visitorId = String(body.visitor_id || '').trim().slice(0, 100);
  if (!visitorId || !/^[a-zA-Z0-9_-]+$/.test(visitorId)) {
    return res.status(400).json({ error: 'Invalid visitor id' });
  }

  const path = String(body.path || '/').slice(0, 500);
  const referrer = body.referrer ? String(body.referrer).slice(0, 1000) : null;
  const userAgent = req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 1000) : null;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/site_visits`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        visitor_id: visitorId,
        path,
        referrer,
        user_agent: userAgent
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Supabase insert failed:', response.status, detail);
      return res.status(502).json({ error: 'Could not record visit' });
    }

    return res.status(204).end();
  } catch (error) {
    console.error('Visit endpoint failed:', error);
    return res.status(500).json({ error: 'Could not record visit' });
  }
};