const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { mockDB, uuid } = require('../utils/mockData');

const JWT_SECRET = process.env.JWT_SECRET || 'please-set-a-secure-jwt-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const db = require('../utils/db');
const { sendPasswordResetEmail } = require('../utils/mailer');

/**
 * POST /api/v1/auth/signup
 * Body: { email, password, name }
 */
async function signup(req, res) {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const displayName = (name && name.trim()) || email.split('@')[0];
    const hashedPassword = await bcrypt.hash(password, 10);
    let user = null;
    const role = 'user';

    if (process.env.DATABASE_URL) {
      try {
        // Check if user already exists
        const existingResult = await db.query(
          'SELECT id FROM "User" WHERE email = $1 LIMIT 1',
          [email]
        );
        if (existingResult.rows.length > 0) {
          return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Create user with password
        const result = await db.query(
          'INSERT INTO "User" (id, email, name, password, role, "createdAt") VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING id, email, name, role, "createdAt"',
          [email, displayName, hashedPassword, role]
        );
        user = result.rows[0];
      } catch (dbErr) {
        if (dbErr.code === '23505') { // PostgreSQL unique violation code
          return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        throw dbErr;
      }
    } else {
      // Mock fallback
      const existing = mockDB.findUser(email);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      user = mockDB.upsertUser({ id: uuid(), email, name: displayName, password: hashedPassword, role });
    }

    const userRole = user.role || 'user';
    const token = jwt.sign({ userId: user.id, email: user.email, role: userRole }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.status(201).json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: userRole },
    });
  } catch (error) {
    console.error('[authController] signup error:', error);
    return res.status(500).json({ error: 'Failed to create account.', details: error.message });
  }
}

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    let user = null;
    let storedPassword = null;

    if (process.env.DATABASE_URL) {
      try {
        const result = await db.query(
          `SELECT id, email, name, password, COALESCE(role, 'user') AS role FROM "User" WHERE email = $1 LIMIT 1`,
          [email]
        );
        if (result.rows.length > 0) {
          user = result.rows[0];
          storedPassword = user.password;
        }
      } catch (error) {
        console.error('[authController] DB error during login:', error);
      }
    } else {
      // Mock fallback
      const found = mockDB.findUserByEmail(email);
      if (found) {
        user = found;
        storedPassword = found.password;
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!storedPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, storedPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userRole = user.role || 'user';
    const token = jwt.sign({ userId: user.id, email: user.email, role: userRole }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: userRole },
    });
  } catch (error) {
    console.error('[authController] login error:', error);
    return res.status(500).json({ error: 'Failed to sign in.', details: error.message });
  }
}

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile (requires valid JWT in header)
 */
async function getMe(req, res) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    let user = null;
    if (process.env.DATABASE_URL) {
      try {
        const result = await db.query(
          `SELECT id, email, name, COALESCE(role, 'user') AS role, "createdAt" FROM "User" WHERE id = $1 LIMIT 1`,
          [userId]
        );
        if (result.rows.length > 0) user = result.rows[0];
      } catch (error) {
        console.error('[authController] DB error during getMe:', error);
      }
    }

    if (!user) {
      user = mockDB.findUser(userId);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role || 'user' },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get profile.', details: error.message });
  }
}

/**
 * POST /api/v1/auth/forgot-password
 * Body: { email }
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    let user = null;

    if (process.env.DATABASE_URL) {
      try {
        const result = await db.query(
          'SELECT id, email, name FROM "User" WHERE email = $1 LIMIT 1',
          [email]
        );
        if (result.rows.length > 0) {
          user = result.rows[0];
        }
      } catch (error) {
        console.error('[authController] DB error during forgotPassword:', error);
      }
    } else {
      // Mock fallback
      user = mockDB.findUserByEmail(email);
    }

    if (!user) {
      return res.status(404).json({ error: 'No user is registered with this email address.' });
    }

    // Generate secure random token and expiration time (30 minutes)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Save token to database
    if (process.env.DATABASE_URL) {
      await db.query(
        'UPDATE "User" SET "resetToken" = $1, "resetExpires" = $2 WHERE id = $3',
        [token, expiresAt, user.id]
      );
    } else {
      // Mock database save
      user.resetToken = token;
      user.resetExpires = expiresAt.toISOString();
    }

    let frontendUrl = process.env.FRONTEND_URL;

    // 1. Try to use Origin header if present and valid
    if (!frontendUrl && req.headers.origin && req.headers.origin !== 'null' && req.headers.origin !== 'undefined') {
      frontendUrl = req.headers.origin;
    }

    // 2. Try to extract origin from Referer header if present and valid
    if (!frontendUrl && req.headers.referer) {
      try {
        const parsedReferer = new URL(req.headers.referer);
        if (parsedReferer.origin && parsedReferer.origin !== 'null' && parsedReferer.origin !== 'undefined') {
          frontendUrl = parsedReferer.origin;
        }
      } catch (e) {
        // Ignored URL parsing errors
      }
    }

    // 3. Try to use Host header (mapping backend port 5000 to frontend port 3000 for local development)
    if (!frontendUrl && req.headers.host) {
      const host = req.headers.host;
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      if (host.includes('localhost:') || host.includes('127.0.0.1:')) {
        frontendUrl = `${protocol}://${host.split(':')[0]}:3000`;
      } else if (host.match(/^\d+\.\d+\.\d+\.\d+(:\d+)?$/)) {
        // Local IP address (e.g. 192.168.1.5:5000)
        frontendUrl = `${protocol}://${host.split(':')[0]}:3000`;
      } else {
        frontendUrl = `${protocol}://${host}`;
      }
    }

    // 4. Default fallback
    if (!frontendUrl || frontendUrl === 'null' || frontendUrl === 'undefined') {
      frontendUrl = 'http://localhost:3000';
    }

    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    // Send password reset email
    await sendPasswordResetEmail({
      userEmail: user.email,
      userName: user.name,
      resetLink,
    });

    return res.status(200).json({
      message: 'Password reset link has been successfully sent to your email address.',
    });
  } catch (error) {
    console.error('[authController] forgotPassword error:', error);
    return res.status(500).json({ error: 'Failed to request password reset.', details: error.message });
  }
}

async function logout(req, res) {
  return res.status(200).json({ success: true, message: 'Successfully logged out.' });
}

/**
 * POST /api/v1/auth/reset-password
 * Body: { token, password }
 */
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    let user = null;

    if (process.env.DATABASE_URL) {
      try {
        const result = await db.query(
          'SELECT id, email, name FROM "User" WHERE "resetToken" = $1 AND "resetExpires" > NOW() LIMIT 1',
          [token]
        );
        if (result.rows.length > 0) {
          user = result.rows[0];
        }
      } catch (error) {
        console.error('[authController] DB error during resetPassword token verification:', error);
        return res.status(500).json({ error: 'Database verification failed.', details: error.message });
      }
    } else {
      // Mock verification
      const found = mockDB.findUserByResetToken(token);
      if (found) {
        const hasExpired = new Date() > new Date(found.resetExpires);
        if (!hasExpired) {
          user = found;
        }
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (process.env.DATABASE_URL) {
      try {
        await db.query(
          'UPDATE "User" SET password = $1, "resetToken" = NULL, "resetExpires" = NULL WHERE id = $2',
          [hashedPassword, user.id]
        );
      } catch (error) {
        console.error('[authController] DB error during resetPassword save:', error);
        return res.status(500).json({ error: 'Failed to update password.', details: error.message });
      }
    } else {
      // Mock save
      user.password = hashedPassword;
      delete user.resetToken;
      delete user.resetExpires;
    }

    return res.status(200).json({
      message: 'Your password has been successfully reset. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('[authController] resetPassword error:', error);
    return res.status(500).json({ error: 'Failed to reset password.', details: error.message });
  }
}

module.exports = { signup, login, getMe, logout, forgotPassword, resetPassword, JWT_SECRET };
