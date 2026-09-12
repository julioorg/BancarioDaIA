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

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  try {
    const [summaryResponse, dailyResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/rpc/site_stats_summary`, {
        method: 'POST', headers, body: '{}'
      }),
      fetch(`${supabaseUrl}/rest/v1/rpc/site_stats_daily`, {
        method: 'POST', headers, body: JSON.stringify({ days_back: 30 })
      })
    ]);

    if (!summaryResponse.ok || !dailyResponse.ok) {
      const summaryError = summaryResponse.ok ? '' : await summaryResponse.text();
      const dailyError = dailyResponse.ok ? '' : await dailyResponse.text();
      console.error('Stats query failed:', summaryError, dailyError);
      return res.status(502).json({ error: 'Could not load stats' });
    }

    const summaryRows = await summaryResponse.json();
    const daily = await dailyResponse.json();
    const summary = Array.isArray(summaryRows) && summaryRows.length ? summaryRows[0] : {
      total_views: 0,
      unique_visitors: 0,
      views_today: 0,
      unique_today: 0
    };

    return res.status(200).json({ summary, daily });
  } catch (error) {
    console.error('Stats endpoint failed:', error);
    return res.status(500).json({ error: 'Could not load stats' });
  }
};