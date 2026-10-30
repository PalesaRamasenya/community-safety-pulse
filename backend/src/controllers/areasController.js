const supabase = require('../config/supabase');
const { recalculateAreaRisk } = require('../services/riskService');

async function getAreaRiskScore(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('areas').select('*').eq('area_id', id).single();

    if (error || !data) {
      return res.status(404).json({ error: 'Area not found' });
    }
    return res.json({ area: data });
  } catch (err) {
    console.error('[areas] getAreaRiskScore error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch area risk score' });
  }
}

async function recalculateArea(req, res) {
  try {
    const { id } = req.params;
    const updated = await recalculateAreaRisk(id);
    return res.json({ area: updated });
  } catch (err) {
    console.error('[areas] recalculateArea error:', err.message);
    return res.status(500).json({ error: 'Failed to recalculate area risk', details: err.message });
  }
}

async function getAllAreas(req, res) {
  try {
    const { data, error } = await supabase.from('areas').select('*');
    if (error) throw error;
    return res.json({ areas: data });
  } catch (err) {
    console.error('[areas] getAllAreas error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch areas' });
  }
}

/**
 * Registers `areaName` in the areas table with a starting risk_score of 0 if it
 * doesn't already exist. Equivalent to:
 *   INSERT INTO areas (area_name, risk_score) VALUES (area_name, 0)
 *   ON CONFLICT (area_name) DO NOTHING
 * Relies on a unique constraint on areas.area_name so ignoreDuplicates never
 * overwrites an existing row's risk_score.
 */
async function ensureAreaExists(areaName) {
  if (!areaName || !String(areaName).trim()) return;

  const { error } = await supabase
    .from('areas')
    .upsert(
      { area_name: areaName, risk_score: 0 },
      { onConflict: 'area_name', ignoreDuplicates: true }
    );

  if (error) throw error;
}

module.exports = { getAreaRiskScore, recalculateArea, getAllAreas, ensureAreaExists };
