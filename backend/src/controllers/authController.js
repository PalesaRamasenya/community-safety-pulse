const axios = require('axios');
const supabase = require('../config/supabase');
const { admin, isInitialized } = require('../config/firebaseAdmin');

require('dotenv').config();

// Public Firebase Web API key (safe to expose - same value used in the frontend
// firebaseConfig). Needed because only the Firebase client SDK / Identity Toolkit
// REST API can verify a password; the Admin SDK cannot sign a user in.
const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || 'AIzaSyAF6iZtMQp2TZOlNDQrXn2oc9nm5OM5QBc';

const ROLES = ['resident', 'coordinator', 'admin'];

async function register(req, res) {
  try {
    const { email, password, role, registered_area } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }
    const finalRole = ROLES.includes(role) ? role : 'resident';

    if (!isInitialized) {
      return res.status(500).json({ error: 'Firebase Admin is not configured on the server' });
    }

    // Create the user in Firebase Auth (source of truth for credentials)
    const firebaseUser = await admin.auth().createUser({ email, password });
    await admin.auth().setCustomUserClaims(firebaseUser.uid, { role: finalRole });

    // Save profile to Supabase. password_hash is intentionally not populated -
    // Firebase Auth owns the credential, duplicating it here would just be a
    // second, driftable copy of the same secret.
    const { data: profile, error } = await supabase
      .from('users')
      .insert({
        user_id: firebaseUser.uid,
        email,
        password_hash: null,
        role: finalRole,
        registered_area: registered_area || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Roll back the Firebase user if the Supabase profile insert fails
      await admin.auth().deleteUser(firebaseUser.uid).catch(() => {});
      throw error;
    }

    return res.status(201).json({ user: profile });
  } catch (err) {
    console.error('[auth] register error:', err.message);
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data } = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
      { email, password, returnSecureToken: true }
    );

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', data.localId)
      .single();

    return res.json({
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      user: profile || { user_id: data.localId, email: data.email }
    });
  } catch (err) {
    const message = err.response?.data?.error?.message || err.message;
    console.error('[auth] login error:', message);
    return res.status(401).json({ error: 'Login failed', details: message });
  }
}

module.exports = { register, login };
