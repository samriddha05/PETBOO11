const db = require('../utils/db');

async function getGroomers(req, res) {
  try {
    const { location, rating } = req.query;
    let sql = 'SELECT * FROM "Groomer" WHERE 1=1';
    const params = [];
    let i = 1;

    if (location) {
      sql += ` AND "location" ILIKE $${i++}`;
      params.push(`%${location}%`);
    }
    if (rating) {
      sql += ` AND "rating" >= $${i++}`;
      params.push(parseFloat(rating));
    }

    sql += ' ORDER BY "rating" DESC, "createdAt" DESC';
    const result = await db.query(sql, params);
    
    // Fetch services for each groomer
    const groomers = result.rows;
    for (let g of groomers) {
      const srvResult = await db.query('SELECT * FROM "GroomingService" WHERE "groomerId" = $1', [g.id]);
      g.services = srvResult.rows;
    }
    
    return res.status(200).json({ groomers });
  } catch (error) {
    console.error("[groomingController] getGroomers error:", error);
    return res.status(500).json({ error: "Failed to fetch groomers." });
  }
}

async function getGroomerById(req, res) {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM "Groomer" WHERE "id" = $1', [id]);
    const groomer = result.rows[0];
    if (!groomer) {
      return res.status(404).json({ error: "Groomer not found." });
    }

    const srvResult = await db.query('SELECT * FROM "GroomingService" WHERE "groomerId" = $1', [id]);
    groomer.services = srvResult.rows;

    const revResult = await db.query('SELECT r.*, u.name as "userName" FROM "GroomerReview" r JOIN "User" u ON r."userId" = u.id WHERE "groomerId" = $1 ORDER BY r."createdAt" DESC', [id]);
    groomer.reviews = revResult.rows;

    return res.status(200).json({ groomer });
  } catch (error) {
    console.error("[groomingController] getGroomerById error:", error);
    return res.status(500).json({ error: "Failed to fetch groomer details." });
  }
}

async function createBooking(req, res) {
  try {
    const userId = req.user?.id || req.body.userId; // fallback if no auth middleware
    const { groomerId, petId, serviceId, appointmentDate, notes } = req.body;

    if (!userId || !groomerId || !serviceId || !appointmentDate) {
      return res.status(400).json({ error: "Missing required fields for booking." });
    }

    const sql = `
      INSERT INTO "GroomingBooking" ("userId", "groomerId", "petId", "serviceId", "appointmentDate", "notes")
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await db.query(sql, [userId, groomerId, petId || null, serviceId, new Date(appointmentDate), notes || '']);

    return res.status(201).json({ booking: result.rows[0] });
  } catch (error) {
    console.error("[groomingController] createBooking error:", error);
    return res.status(500).json({ error: "Failed to create booking." });
  }
}

async function getUserBookings(req, res) {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID required." });
    }

    const sql = `
      SELECT b.*, g.name as "groomerName", s.title as "serviceTitle", p.name as "petName"
      FROM "GroomingBooking" b
      JOIN "Groomer" g ON b."groomerId" = g.id
      JOIN "GroomingService" s ON b."serviceId" = s.id
      LEFT JOIN "Pet" p ON b."petId" = p.id
      WHERE b."userId" = $1
      ORDER BY b."appointmentDate" DESC
    `;
    const result = await db.query(sql, [userId]);

    return res.status(200).json({ bookings: result.rows });
  } catch (error) {
    console.error("[groomingController] getUserBookings error:", error);
    return res.status(500).json({ error: "Failed to fetch bookings." });
  }
}

module.exports = { getGroomers, getGroomerById, createBooking, getUserBookings };
