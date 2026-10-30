const supabase = require('../config/supabase');

const SEVERITY_WEIGHT = {
  High: 3,
  Medium: 2,
  Low: 1,
  Unclassified: 1
};

/**
 * Recalculates an area's risk score from its non-spam incidents.
 * Score = weighted severity sum, scaled 0-100 and capped, so a handful of
 * High-severity reports pushes an area red without needing hundreds of reports.
 */
async function recalculateAreaRisk(areaId) {
  const { data: area, error: areaError } = await supabase
    .from('areas')
    .select('*')
    .eq('area_id', areaId)
    .single();

  if (areaError || !area) {
    throw new Error(`Area ${areaId} not found`);
  }

  // The incidents table only carries lat/lng, not an area_id FK, so incidents
  // are associated with an area by matching incidents.area_name to areas.area_name.
  const { data: incidents, error: incidentError } = await supabase
    .from('incidents')
    .select('ai_severity, spam_flag')
    .eq('area_name', area.area_name)
    .eq('spam_flag', false);

  if (incidentError) throw incidentError;

  const weightedSum = (incidents || []).reduce((sum, incident) => {
    return sum + (SEVERITY_WEIGHT[incident.ai_severity] || 1);
  }, 0);

  const riskScore = Math.min(100, Math.round(weightedSum * 2.5));

  const { data: updated, error: updateError } = await supabase
    .from('areas')
    .update({ risk_score: riskScore, last_updated: new Date().toISOString() })
    .eq('area_id', areaId)
    .select()
    .single();

  if (updateError) throw updateError;

  return updated;
}

module.exports = { recalculateAreaRisk };
