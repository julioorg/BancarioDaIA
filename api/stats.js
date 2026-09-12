module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Analytics is not configured' });
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/site_stats_summary`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Stats query failed:', response.status, detail);
      return res.status(502).json({ error: 'Could not load stats' });
    }

    const rows = await response.json();
    const uniqueVisitors = Array.isArray(rows) && rows.length
      ? Number(rows[0].unique_visitors || 0)
      : 0;

    return res.status(200).json({ visitors: uniqueVisitors });
  } catch (error) {
    console.error('Stats endpoint failed:', error);
    return res.status(500).json({ error: 'Could not load stats' });
  }
};