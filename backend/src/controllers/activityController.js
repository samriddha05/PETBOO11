const db = require('../utils/db');
const { mockDB } = require('../utils/mockData');

function formatDay(d) {
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short' });
}

async function getDashboardData(req, res) {
  try {
    const { petId } = req.params;

    // Build last 7 days array
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      days.push(dt.toISOString().split('T')[0]);
    }

    if (process.env.DATABASE_URL) {
      const q = `SELECT date::text as date, type, SUM(value) as total
        FROM "ActivityLog"
        WHERE "petId" = $1 AND date >= current_date - INTERVAL '6 days'
        GROUP BY date, type
        ORDER BY date`;
      const result = await db.query(q, [petId]);
      const grouped = {};
      for (const r of result.rows) {
        grouped[`${r.date}-${r.type}`] = Number(r.total);
      }

      const chartData = days.map(d => ({ day: formatDay(d), value: Number(grouped[`${d}-exercise`] || 0) }));

      return res.status(200).json({
        petName: null,
        chartData,
        hasActivities: chartData.some(c => c.value > 0),
        healthScore: null,
        healthStats: {},
      });
    }

    // Mock mode
    const logs = mockDB.getActivityLogsForPet(petId);
    const byDate = {};
    for (const d of days) byDate[d] = { exercise: 0, nutrition: 0, hydration: 0, sleep: 0 };
    for (const l of logs) {
      if (byDate[l.date]) byDate[l.date][l.type] = (byDate[l.date][l.type] || 0) + Number(l.value);
    }

    const chartData = days.map(d => ({ day: formatDay(d), value: Math.round(byDate[d].exercise || 0) }));

    // Simple health stats (mocked)
    const last = logs.slice(-14);
    const avg = { nutrition: null, exercise: null, sleep: null, hydration: null };
    if (last.length > 0) {
      const sums = { nutrition: 0, exercise: 0, sleep: 0, hydration: 0 };
      let counts = { nutrition: 0, exercise: 0, sleep: 0, hydration: 0 };
      for (const l of last) {
        if (sums[l.type] !== undefined) {
          sums[l.type] += Number(l.value);
          counts[l.type]++;
        }
      }
      for (const k of Object.keys(avg)) {
        avg[k] = counts[k] ? Math.round(sums[k] / counts[k]) : null;
      }
    }

    const healthScore = (() => {
      const vals = Object.values(avg).filter(v => v !== null);
      if (vals.length === 0) return null;
      const norm = vals.reduce((s, v) => s + Math.min(100, v), 0) / vals.length;
      return Math.round(norm);
    })();

    return res.status(200).json({
      petName: null,
      chartData,
      hasActivities: chartData.some(c => c.value > 0),
      healthScore,
      healthStats: avg,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch dashboard data.', details: err.message });
  }
}

async function getActivities(req, res) {
  try {
    const { petId } = req.params;
    if (process.env.DATABASE_URL) {
      const result = await db.query('SELECT * FROM "ActivityLog" WHERE "petId" = $1 ORDER BY "date" DESC, "createdAt" DESC', [petId]);
      return res.status(200).json({ activities: result.rows });
    }

    return res.status(200).json({ activities: mockDB.getActivityLogsForPet(petId).reverse() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch activities.', details: err.message });
  }
}

async function addActivity(req, res) {
  try {
    const { petId } = req.params;
    const { type, value, date } = req.body;
    if (!type || value === undefined) return res.status(400).json({ error: 'Type and value are required.' });

    if (process.env.DATABASE_URL) {
      const result = await db.query(
        `INSERT INTO "ActivityLog" ("petId", "type", "value", "date", "createdAt") VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
        [petId, type, value, date || new Date().toISOString().split('T')[0]]
      );
      return res.status(201).json({ activity: result.rows[0] });
    }

    const log = mockDB.addActivityLog({ petId, type, value, date });
    return res.status(201).json({ activity: log });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add activity.', details: err.message });
  }
}

module.exports = {
  getDashboardData,
  getActivities,
  addActivity,
};
