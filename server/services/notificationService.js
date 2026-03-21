'use strict';

const nodemailer = require('nodemailer');

function buildEmailHtml(plan) {
  const days = plan.days || [];
  const weekOf = plan.weekOf || '';

  const rows = days.map(d => {
    if (d.isTakeout) {
      return `<tr>
        <td style="padding:8px 12px;font-weight:bold;color:#555;">${d.day}</td>
        <td style="padding:8px 12px;color:#e67e22;">🥡 Takeout Night</td>
        <td style="padding:8px 12px;color:#999;"></td>
      </tr>`;
    }
    const sides = (d.sides || []).map(s => s.name).join(', ');
    const mealName = d.meal?.link
      ? `<a href="${d.meal.link}" style="color:#2980b9;text-decoration:none;">${d.meal.name}</a>`
      : d.meal?.name || '—';
    return `<tr>
      <td style="padding:8px 12px;font-weight:bold;color:#555;">${d.day}</td>
      <td style="padding:8px 12px;">${mealName}${sides ? `<br><span style="font-size:12px;color:#888;">${sides}</span>` : ''}</td>
      <td style="padding:8px 12px;font-size:13px;color:#666;">${d.cook || ''}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9f9f9;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#2ecc71;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:22px;">🍽️ Bell Family Meal Plan</h1>
      <p style="margin:4px 0 0;color:#d5f5e3;font-size:14px;">Week of ${weekOf}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#777;">Day</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#777;">Meal</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#777;">Cook</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="padding:16px 24px;background:#f9f9f9;font-size:12px;color:#aaa;text-align:center;">
      Generated automatically by your AI Meal Planner
    </div>
  </div>
</body>
</html>`;
}

async function sendMealPlanNotification(plan, settings) {
  const gmailUser = process.env.NOTIFY_GMAIL_USER;
  const gmailPass = process.env.NOTIFY_GMAIL_APP_PASSWORD;
  const recipients = settings.notificationEmails;

  if (!gmailUser || !gmailPass) {
    const msg = 'NOTIFY_GMAIL_USER or NOTIFY_GMAIL_APP_PASSWORD not set. Add these env vars in Render dashboard.';
    console.log('[Notify] ' + msg);
    throw new Error(msg);
  }
  if (!recipients || recipients.length === 0) {
    const msg = 'No notification email recipients configured.';
    console.log('[Notify] ' + msg);
    throw new Error(msg);
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: gmailUser, pass: gmailPass },
  });

  const weekOf = plan.weekOf || '';
  await transporter.sendMail({
    from: `"Bell Meal Planner" <${gmailUser}>`,
    to: recipients.join(', '),
    subject: `🍽️ Your meal plan is ready — week of ${weekOf}`,
    html: buildEmailHtml(plan),
  });

  console.log(`[Notify] Email sent to: ${recipients.join(', ')}`);
}

function buildChoreEmailHtml(plan) {
  const days = plan.days || [];
  const weekOf = plan.weekOf || '';

  const dayRows = days.map(d => {
    const assignments = (d.assignments || []);
    if (assignments.length === 0) return '';
    const choreRows = assignments.map(a => {
      const status = a.isCompleted ? '✅' : '⬜';
      return `<tr>
        <td style="padding:6px 12px;font-size:13px;color:#555;">${status} ${a.choreName}</td>
        <td style="padding:6px 12px;font-size:13px;color:#666;">${a.assignedTo}</td>
      </tr>`;
    }).join('');
    return `<tr><td colspan="2" style="padding:12px 12px 4px;font-weight:bold;font-size:14px;color:#374780;background:#f5f5ff;">${d.day}${d.date ? ' — ' + d.date : ''}</td></tr>${choreRows}`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f9f9f9;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#374780;padding:20px 24px;">
      <h1 style="margin:0;color:#fff;font-size:22px;">🧹 Bell Family Chore Plan</h1>
      <p style="margin:4px 0 0;color:#c5c8f0;font-size:14px;">Week of ${weekOf}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#777;">Chore</th>
          <th style="padding:8px 12px;text-align:left;font-size:13px;color:#777;">Assigned To</th>
        </tr>
      </thead>
      <tbody>${dayRows}</tbody>
    </table>
    <div style="padding:16px 24px;background:#f9f9f9;font-size:12px;color:#aaa;text-align:center;">
      Generated automatically by your AI Family Planner
    </div>
  </div>
</body>
</html>`;
}

async function sendChorePlanNotification(plan, settings) {
  const gmailUser = process.env.NOTIFY_GMAIL_USER;
  const gmailPass = process.env.NOTIFY_GMAIL_APP_PASSWORD;
  const recipients = settings.notificationEmails;

  if (!gmailUser || !gmailPass) {
    const msg = 'NOTIFY_GMAIL_USER or NOTIFY_GMAIL_APP_PASSWORD not set. Add these env vars in Render dashboard.';
    console.log('[Notify] ' + msg);
    throw new Error(msg);
  }
  if (!recipients || recipients.length === 0) {
    const msg = 'No notification email recipients configured.';
    console.log('[Notify] ' + msg);
    throw new Error(msg);
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: gmailUser, pass: gmailPass },
  });

  const weekOf = plan.weekOf || '';
  await transporter.sendMail({
    from: `"Bell Family Planner" <${gmailUser}>`,
    to: recipients.join(', '),
    subject: `🧹 Your chore plan is ready — week of ${weekOf}`,
    html: buildChoreEmailHtml(plan),
  });

  console.log(`[Notify] Chore email sent to: ${recipients.join(', ')}`);
}

module.exports = { sendMealPlanNotification, sendChorePlanNotification };
