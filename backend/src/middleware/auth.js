const jwt = require('jsonwebtoken');
const { admin, isInitialized } = require('../config/firebaseAdmin');

require('dotenv').config();

/**
 * Verifies the Firebase ID token sent in the Authorization header,
 * then attaches { uid, email, role } to req.user.
 * Role is looked up from Supabase (attached upstream) or from a
 * custom claim set on the Firebase user.
 */
async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization bearer token' });
  }

  try {
    if (isInitialized) {
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role || 'resident'
      };
    } else {
      // Fallback for local dev without Firebase Admin credentials configured yet.
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', details: err.message });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  next();
}

module.exports = { verifyFirebaseToken, requireAdmin };
