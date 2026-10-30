const axios = require('axios');
require('dotenv').config();

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5000';
const ML_TIMEOUT_MS = 3000;

/**
 * Calls the Flask ML API to classify incident severity.
 * On timeout/error, resolves to an "Unclassified" fallback instead of throwing,
 * so incident submission never blocks on the ML service being down.
 */
async function classifySeverity(description, category) {
  try {
    const { data } = await axios.post(
      `${ML_API_URL}/ml/classify`,
      { description, category },
      { timeout: ML_TIMEOUT_MS }
    );
    return {
      severity: data.severity || 'Unclassified',
      confidence: typeof data.confidence === 'number' ? data.confidence : null
    };
  } catch (err) {
    console.warn('[mlService] classify failed, falling back to Unclassified:', err.message);
    return { severity: 'Unclassified', confidence: null };
  }
}

/**
 * Calls the Flask ML API spam checker.
 * On timeout/error, resolves to a non-flagged, zero-confidence result so a
 * down ML service never blocks or silently spam-flags legitimate reports.
 */
async function checkSpam(description) {
  try {
    const { data } = await axios.post(
      `${ML_API_URL}/ml/spam-check`,
      { description },
      { timeout: ML_TIMEOUT_MS }
    );
    return {
      spamScore: typeof data.spamScore === 'number' ? data.spamScore : 0,
      flagged: !!data.flagged
    };
  } catch (err) {
    console.warn('[mlService] spam-check failed, defaulting to not flagged:', err.message);
    return { spamScore: 0, flagged: false };
  }
}

module.exports = { classifySeverity, checkSpam };
