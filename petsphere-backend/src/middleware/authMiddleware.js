const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function authMiddleware(req, res, next) {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: "Supabase auth is not configured on backend.",
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header." });
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return res.status(401).json({ error: "Missing bearer token." });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      return res.status(401).json({ error: "Invalid or expired token." });
    }

    req.userId = data.user.id;
    return next();
  } catch (error) {
    return res.status(500).json({
      error: "Failed to authenticate request.",
      details: error.message,
    });
  }
}

module.exports = authMiddleware;
