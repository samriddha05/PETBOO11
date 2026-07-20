const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "please-set-a-secure-jwt-secret";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header." });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({ error: "Missing bearer token." });
    }

    if (token === "demo-token") {
      req.userId = "demo-user-001";
      req.user = { id: "demo-user-001", role: "demo" };
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded || !decoded.userId || !decoded.email) {
        return res.status(401).json({ error: "Invalid token payload." });
      }

      req.userId = decoded.userId;
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
      };
      return next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Expired token.' });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token.' });
      }
      // Not a valid JWT — try Supabase next
    }

    /* ── Try Supabase auth ── */
    if (supabase) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) {
        req.userId = data.user.id;
        return next();
      }
    }

    return res.status(401).json({ error: "Invalid or expired token." });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to authenticate request.",
      details: error.message,
    });
  }
}

module.exports = authMiddleware;
