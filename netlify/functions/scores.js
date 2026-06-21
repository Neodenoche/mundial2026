exports.handler = async function(event, context) {
  const API_KEY = process.env.FOOTBALL_DATA_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured" })
    };
  }

  try {
    // FIFA World Cup 2026 competition ID = 2000
    const [matchesRes, standingsRes] = await Promise.all([
      fetch('https://api.football-data.org/v4/competitions/2000/matches', {
        headers: { 'X-Auth-Token': API_KEY }
      }),
      fetch('https://api.football-data.org/v4/competitions/2000/standings', {
        headers: { 'X-Auth-Token': API_KEY }
      })
    ]);

    const matchesData = await matchesRes.json();
    const standingsData = await standingsRes.json();

    const live = (matchesData.matches || [])
      .filter(m => m.status === 'IN_PLAY' || m.status === 'PAUSED')
      .map(m => ({
        home: m.homeTeam.tla || m.homeTeam.shortName,
        away: m.awayTeam.tla || m.awayTeam.shortName,
        homeName: m.homeTeam.shortName || m.homeTeam.name,
        awayName: m.awayTeam.shortName || m.awayTeam.name,
        sh: m.score.fullTime.home ?? m.score.halfTime.home ?? 0,
        sa: m.score.fullTime.away ?? m.score.halfTime.away ?? 0,
        min: m.minute || null,
        status: m.status
      }));

    const finished = (matchesData.matches || [])
      .filter(m => m.status === 'FINISHED')
      .map(m => ({
        home: m.homeTeam.tla || m.homeTeam.shortName,
        away: m.awayTeam.tla || m.awayTeam.shortName,
        homeName: m.homeTeam.shortName || m.homeTeam.name,
        awayName: m.awayTeam.shortName || m.awayTeam.name,
        sh: m.score.fullTime.home ?? 0,
        sa: m.score.fullTime.away ?? 0,
        date: m.utcDate,
        stage: m.stage,
        group: m.group
      }));

    const upcoming = (matchesData.matches || [])
      .filter(m => m.status === 'TIMED' || m.status === 'SCHEDULED')
      .map(m => ({
        home: m.homeTeam.tla || m.homeTeam.shortName,
        away: m.awayTeam.tla || m.awayTeam.shortName,
        homeName: m.homeTeam.shortName || m.homeTeam.name,
        awayName: m.awayTeam.shortName || m.awayTeam.name,
        date: m.utcDate,
        stage: m.stage,
        group: m.group
      }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({
        live,
        finished,
        upcoming,
        standings: standingsData.standings || [],
        updated: new Date().toISOString()
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
