const supabase = require('../config/supabase');
const { firestore, isInitialized } = require('../config/firebaseAdmin');
const { classifySeverity, checkSpam } = require('../services/mlService');
const { notifyAreaResidents } = require('../services/emailService');
const { ensureAreaExists } = require('./areasController');

const CATEGORIES = [
  'Theft',
  'Robbery',
  'Assault',
  'Vandalism',
  'Suspicious Activity',
  'Road Hazard',
  'Fire',
  'Other'
];

async function createIncident(req, res) {
  try {
    const { category, description, latitude, longitude, photo_url, area_name, user_id } = req.body;

    // 1. Validate required fields
    const errors = {};
    if (!category || !CATEGORIES.includes(category)) errors.category = 'A valid category is required';
    if (!description || !description.trim()) errors.description = 'Description is required';
    if (latitude === undefined || latitude === null || isNaN(Number(latitude))) {
      errors.latitude = 'A valid latitude is required';
    }
    if (longitude === undefined || longitude === null || isNaN(Number(longitude))) {
      errors.longitude = 'A valid longitude is required';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    // 2 & 3. Call ML API for severity classification and spam check (each has its own 3s timeout + fallback)
    const [severityResult, spamResult] = await Promise.all([
      classifySeverity(description, category),
      checkSpam(description)
    ]);

    // 5. Save to Supabase
    const { data: incident, error: insertError } = await supabase
      .from('incidents')
      .insert({
        user_id: user_id || null,
        category,
        description,
        latitude: Number(latitude),
        longitude: Number(longitude),
        photo_url: photo_url || null,
        area_name: area_name || null,
        ai_severity: severityResult.severity,
        spam_flag: spamResult.flagged,
        spam_confidence: spamResult.spamScore,
        status: 'Open',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('[incidents] Supabase insert failed:', insertError.message);
      return res.status(500).json({ error: 'Failed to save incident', details: insertError.message });
    }

    // 5b. Register the area (if any) so it shows up on the risk-score dashboard.
    // Best-effort: an area-creation failure must not prevent the incident itself
    // from being recorded.
    if (incident.area_name) {
      try {
        await ensureAreaExists(incident.area_name);
      } catch (areaErr) {
        console.error('[incidents] ensureAreaExists failed:', areaErr.message);
      }
    }

    // 6. Sync to Firestore for real-time heatmap
    if (isInitialized && firestore) {
      try {
        await firestore.collection('incidents').doc(String(incident.incident_id)).set({
          incident_id: incident.incident_id,
          category: incident.category,
          description: incident.description,
          latitude: incident.latitude,
          longitude: incident.longitude,
          ai_severity: incident.ai_severity,
          spam_flag: incident.spam_flag,
          status: incident.status,
          area_name: incident.area_name,
          created_at: incident.created_at
        });
      } catch (firestoreErr) {
        console.error('[incidents] Firestore sync failed:', firestoreErr.message);
      }
    }

    // 7. Email alert for High severity, non-spam incidents in a known area
    if (incident.ai_severity === 'High' && !incident.spam_flag && incident.area_name) {
      notifyAreaResidents(incident.area_name, incident).catch((err) =>
        console.error('[incidents] notifyAreaResidents error:', err.message)
      );
    }

    // 8. Return 201 with incident data
    return res.status(201).json({ incident });
  } catch (err) {
    console.error('[incidents] createIncident unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getIncidents(req, res) {
  try {
    const { severity, category, status, from, to } = req.query;

    let query = supabase.from('incidents').select('*').order('created_at', { ascending: false });

    if (severity) query = query.eq('ai_severity', severity);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ incidents: data || [] });
  } catch (err) {
    console.error('[incidents] getIncidents error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch incidents', details: err.message });
  }
}

async function getIncidentById(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('incidents').select('*').eq('incident_id', id).single();

    if (error || !data) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    return res.json({ incident: data });
  } catch (err) {
    console.error('[incidents] getIncidentById error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch incident' });
  }
}

async function updateIncidentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['Open', 'Under Review', 'Resolved'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowedStatuses.join(', ')}` });
    }

    // Check existence first so a genuinely-missing incident (real 404) can be told
    // apart from an update that Supabase silently no-ops (e.g. a Row Level Security
    // policy blocking UPDATE for this connection's credentials, which PostgREST
    // reports as a normal 0-row success rather than an error).
    const { data: existing, error: lookupError } = await supabase
      .from('incidents')
      .select('incident_id, status')
      .eq('incident_id', id)
      .maybeSingle();

    if (lookupError) {
      if (lookupError.code === '22P02') {
        // Malformed incident_id (incident_id is a uuid column) - client error, not a server error.
        return res.status(400).json({ error: 'Invalid incident id' });
      }
      console.error('[incidents] updateIncidentStatus lookup failed:', lookupError.message);
      return res.status(500).json({ error: 'Failed to look up incident', details: lookupError.message });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const { error: updateError } = await supabase
      .from('incidents')
      .update({ status })
      .eq('incident_id', id);

    if (updateError) {
      console.error('[incidents] updateIncidentStatus update failed:', updateError.message);
      return res.status(500).json({ error: 'Failed to update incident status', details: updateError.message });
    }

    const { data: updated, error: verifyError } = await supabase
      .from('incidents')
      .select('*')
      .eq('incident_id', id)
      .single();

    if (verifyError || !updated) {
      console.error('[incidents] updateIncidentStatus verify failed:', verifyError?.message);
      return res.status(500).json({ error: 'Failed to verify incident update', details: verifyError?.message });
    }

    if (updated.status !== status) {
      // The row exists and the update call reported no error, but the value on
      // record still doesn't match what we tried to write - this is the RLS
      // silent-no-op signature, not a "not found" condition.
      console.error(
        `[incidents] updateIncidentStatus: update reported success but status is still "${updated.status}" ` +
        `(expected "${status}") for incident ${id}. This usually means a Supabase Row Level Security ` +
        'policy is blocking UPDATE on the incidents table for the credentials this server uses.'
      );
      return res.status(500).json({
        error: 'Incident status was not updated. Check Supabase Row Level Security UPDATE policy on the incidents table.'
      });
    }

    if (firestoreIsAvailable()) {
      try {
        await firestore.collection('incidents').doc(String(id)).update({ status });
      } catch (firestoreErr) {
        console.error('[incidents] Firestore status sync failed:', firestoreErr.message);
      }
    }

    return res.json({ incident: updated });
  } catch (err) {
    console.error('[incidents] updateIncidentStatus error:', err.message);
    return res.status(500).json({ error: 'Failed to update incident status', details: err.message });
  }
}

async function deleteIncident(req, res) {
  try {
    const { id } = req.params;

    const { data: existing, error: lookupError } = await supabase
      .from('incidents')
      .select('incident_id')
      .eq('incident_id', id)
      .maybeSingle();

    if (lookupError) {
      if (lookupError.code === '22P02') {
        return res.status(400).json({ error: 'Invalid incident id' });
      }
      return res.status(500).json({ error: 'Failed to look up incident', details: lookupError.message });
    }
    if (!existing) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const { error } = await supabase.from('incidents').delete().eq('incident_id', id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete incident', details: error.message });
    }

    // Supabase/PostgREST reports a delete that matched 0 rows (e.g. blocked by a
    // Row Level Security policy) the same way it reports a real delete: no error.
    // Re-check so a silently-blocked delete surfaces as an error instead of a
    // false-positive 204.
    const { data: stillThere } = await supabase
      .from('incidents')
      .select('incident_id')
      .eq('incident_id', id)
      .maybeSingle();

    if (stillThere) {
      console.error(
        `[incidents] deleteIncident: delete reported success but incident ${id} still exists. ` +
        'This usually means a Supabase Row Level Security policy is blocking DELETE on the incidents table.'
      );
      return res.status(500).json({
        error: 'Incident was not deleted. Check Supabase Row Level Security DELETE policy on the incidents table.'
      });
    }

    if (firestoreIsAvailable()) {
      try {
        await firestore.collection('incidents').doc(String(id)).delete();
      } catch (firestoreErr) {
        console.error('[incidents] Firestore delete sync failed:', firestoreErr.message);
      }
    }

    return res.status(204).send();
  } catch (err) {
    console.error('[incidents] deleteIncident error:', err.message);
    return res.status(500).json({ error: 'Failed to delete incident' });
  }
}

function firestoreIsAvailable() {
  return !!firestore;
}

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncidentStatus,
  deleteIncident,
  CATEGORIES
};
