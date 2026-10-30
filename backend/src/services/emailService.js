const transporter = require('../config/mailer');
const supabase = require('../config/supabase');

/**
 * Notifies every registered user in `area` that a new High-severity,
 * non-spam incident was reported. Failures are logged, never thrown,
 * so a broken mail config can't fail the incident submission itself.
 */
async function notifyAreaResidents(area, incident) {
  if (!transporter) {
    console.warn('[emailService] Mailer not configured - skipping area notification email.');
    return { sent: 0 };
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('user_id, email')
      .eq('registered_area', area);

    if (error) throw error;
    if (!users || users.length === 0) return { sent: 0 };

    const recipients = users.map((u) => u.email).filter(Boolean);
    if (recipients.length === 0) return { sent: 0 };

    const subject = `Safety Alert: High severity ${incident.category} reported in ${area}`;
    const text =
      `A new high-severity incident was reported in your registered area (${area}).\n\n` +
      `Category: ${incident.category}\n` +
      `Description: ${incident.description}\n` +
      `Reported at: ${incident.created_at || new Date().toISOString()}\n\n` +
      `Stay safe and check the Community Safety Pulse map for details.`;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      bcc: recipients,
      subject,
      text
    });

    console.log(`[emailService] Sent area notification for "${area}" to ${recipients.length} recipient(s).`);

    for (const user of users) {
      await supabase.from('notifications').insert({
        user_id: user.user_id,
        incident_id: incident.incident_id,
        message: subject,
        sent_at: new Date().toISOString()
      });
    }

    return { sent: recipients.length };
  } catch (err) {
    // Log the specific SMTP failure reason (never credentials) so "emails aren't
    // sending" can actually be diagnosed: code is e.g. EAUTH/ECONNECTION/ETIMEDOUT,
    // responseCode/response are the raw SMTP server reply (e.g. 535 bad credentials).
    console.error(
      `[emailService] Failed to send area notification for area "${area}": ` +
      `message=${err.message} code=${err.code || 'n/a'} responseCode=${err.responseCode || 'n/a'} ` +
      `response=${err.response || 'n/a'}`
    );
    return { sent: 0, error: err.message };
  }
}

module.exports = { notifyAreaResidents };
