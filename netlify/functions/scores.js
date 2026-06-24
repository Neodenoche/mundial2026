exports.handler = async function(event, context) {
  const API_KEY = process.env.FOOTBALL_DATA_KEY;

  if (!API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not configured" })
    };
  }

  try {
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

    const allMatches = matchesData.matches || [];

    const live = allMatches
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

    const finished = allMatches
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

    const upcoming = allMatches
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

    // Knockout matches (ROUND_OF_16, QUARTER_FINALS, SEMI_FINALS, FINAL)
    const knockoutStages = ['ROUND_OF_16','QUARTER_FINALS','SEMI_FINALS','FINAL'];
    const knockout = allMatches
      .filter(m => knockoutStages.includes(m.stage))
      .map(m => ({
        home: m.homeTeam.tla || m.homeTeam.shortName || null,
        away: m.awayTeam.tla || m.awayTeam.shortName || null,
        homeName: m.homeTeam.shortName || m.homeTeam.name || null,
        awayName: m.awayTeam.shortName || m.awayTeam.name || null,
        sh: m.score?.fullTime?.home ?? null,
        sa: m.score?.fullTime?.away ?? null,
        date: m.utcDate,
        stage: m.stage,
        status: m.status
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
        knockout,
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
