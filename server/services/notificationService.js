'use strict';

const sgMail = require('@sendgrid/mail');

const APP_URL = 'https://family-weekly-planner.up.railway.app';

const MEMBER_COLORS = {
  Mom:   { bg: '#f3e8ff', text: '#7c3aed', accent: '#8b5cf6' },
  Dad:   { bg: '#dbeafe', text: '#2563eb', accent: '#3b82f6' },
  Maya:  { bg: '#fce7f3', text: '#db2777', accent: '#ec4899' },
  Maddy: { bg: '#fef3c7', text: '#d97706', accent: '#f59e0b' },
};

function initSendGrid() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY not set. Add it as a Railway variable.');
  sgMail.setApiKey(apiKey);
}

function buildCombinedEmailHtml(mealPlan, chorePlan) {
  const weekOf = mealPlan?.weekOf || chorePlan?.weekOf || '';
  const mealDays = mealPlan?.days || [];
  const choreDays = chorePlan?.days || [];

  // ── Meal table rows ─────────────────────────────────────────────────────────
  const mealRows = mealDays.map(d => {
    if (d.isTakeout) {
      return `<tr>
        <td style="padding:10px 14px;font-weight:600;color:#475569;border-bottom:1px solid #f1f5f9;">${d.day}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;"><span style="color:#ea580c;font-weight:500;">🥡 Takeout Night</span></td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#94a3b8;">—</td>
      </tr>`;
    }
    if (d.isLeftover) {
      return `<tr>
        <td style="padding:10px 14px;font-weight:600;color:#475569;border-bottom:1px solid #f1f5f9;">${d.day}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;"><span style="color:#16a34a;font-weight:500;">♻️ Leftover Night</span></td>
        <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;color:#94a3b8;">—</td>
      </tr>`;
    }
    const sides = (d.sides || []).map(s => s.name).join(', ');
    const mealName = d.meal?.link
      ? `<a href="${d.meal.link}" style="color:#2563eb;text-decoration:none;font-weight:500;">${d.meal.name}</a>`
      : `<span style="font-weight:500;color:#1e293b;">${d.meal?.name || '—'}</span>`;
    const sidesHtml = sides ? `<br><span style="font-size:12px;color:#94a3b8;">+ ${sides}</span>` : '';
    const cookColor = MEMBER_COLORS[d.cook] || { text: '#475569' };
    return `<tr>
      <td style="padding:10px 14px;font-weight:600;color:#475569;border-bottom:1px solid #f1f5f9;">${d.day}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;">${mealName}${sidesHtml}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;"><span style="color:${cookColor.text};font-weight:600;">${d.cook || '—'}</span></td>
    </tr>`;
  }).join('');

  // ── Per-person breakdown ────────────────────────────────────────────────────
  const members = ['Mom', 'Dad', 'Maya', 'Maddy'];
  const personSections = members.map(name => {
    const colors = MEMBER_COLORS[name];

    const cookingDays = mealDays.filter(d => d.cook === name && !d.isTakeout && !d.isLeftover);
    const cookingHtml = cookingDays.length > 0
      ? cookingDays.map(d => {
          const mealLabel = d.meal?.name || 'TBD';
          return `<div style="padding:4px 0;font-size:13px;color:#475569;">🍳 <strong>${d.day}</strong> — ${mealLabel}</div>`;
        }).join('')
      : '<div style="padding:4px 0;font-size:13px;color:#94a3b8;font-style:italic;">No cooking this week</div>';

    const choresByDay = {};
    for (const day of choreDays) {
      const myChores = (day.assignments || []).filter(a => a.assignedTo === name && !a.choreName?.toLowerCase().includes('make supper'));
      if (myChores.length > 0) choresByDay[day.day] = myChores;
    }
    const choreKeys = Object.keys(choresByDay);
    const choresHtml = choreKeys.length > 0
      ? choreKeys.map(dayName => {
          const items = choresByDay[dayName].map(a => `<span style="font-size:12px;color:#475569;">${a.choreName}</span>`).join(', ');
          return `<div style="padding:3px 0;font-size:13px;color:#475569;">📋 <strong>${dayName}</strong> — ${items}</div>`;
        }).join('')
      : '<div style="padding:4px 0;font-size:13px;color:#94a3b8;font-style:italic;">No chores this week</div>';

    return `
    <div style="background:${colors.bg};border-radius:10px;padding:16px 18px;margin-bottom:12px;border-left:4px solid ${colors.accent};">
      <h3 style="margin:0 0 10px 0;font-size:16px;color:${colors.text};">${name}</h3>
      <div style="margin-bottom:8px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:${colors.text};font-weight:700;margin-bottom:4px;">Cooking</div>
        ${cookingHtml}
      </div>
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:${colors.text};font-weight:700;margin-bottom:4px;">Chores</div>
        ${choresHtml}
      </div>
    </div>`;
  }).join('');

  // ── Full email ──────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:20px;margin:0;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:24px 28px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">🏠 Bell Family Weekly Plan</h1>
      <p style="margin:6px 0 0;color:#c7d2fe;font-size:14px;">Week of ${weekOf}</p>
      <a href="${APP_URL}" style="display:inline-block;margin-top:12px;padding:8px 18px;background:rgba(255,255,255,0.2);color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">📱 Open Planner App →</a>
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <div style="padding:16px 24px;background:#f0fdf4;border-bottom:1px solid #dcfce7;">
        <p style="margin:0;font-size:13px;color:#166534;font-weight:600;">✅ How to mark chores as done:</p>
        <ol style="margin:8px 0 0;padding-left:20px;font-size:12px;color:#15803d;line-height:1.8;">
          <li>Open the <a href="${APP_URL}" style="color:#2563eb;font-weight:600;">Planner App</a></li>
          <li>Go to <strong>My Week</strong> and tap on a day</li>
          <li>Check off your chores as you complete them</li>
        </ol>
      </div>
      <div style="padding:20px 24px;">
        <h2 style="margin:0 0 14px;font-size:17px;color:#1e293b;">👨‍👩‍👧‍👧 Your Assignments</h2>
        ${personSections}
      </div>
      <div style="padding:20px 24px 8px;border-top:1px solid #f1f5f9;">
        <h2 style="margin:0 0 12px;font-size:17px;color:#1e293b;">🍽️ This Week's Suppers</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:8px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:600;">Day</th>
            <th style="padding:8px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:600;">Meal</th>
            <th style="padding:8px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:600;">Cook</th>
          </tr>
        </thead>
        <tbody>${mealRows}</tbody>
      </table>
      <div style="padding:16px 24px;background:#f8fafc;text-align:center;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Generated by Bell Family Planner — AI-powered by Gemini</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendWeeklyNotification(mealPlan, chorePlan, settings) {
  initSendGrid();
  const recipients = settings.notificationEmails;

  if (!recipients || recipients.length === 0) {
    throw new Error('No notification email configured in Settings.');
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!fromEmail) throw new Error('SENDGRID_FROM_EMAIL not set. Add it as a Railway variable.');

  const weekOf = mealPlan?.weekOf || chorePlan?.weekOf || '';
  const htmlBody = buildCombinedEmailHtml(mealPlan, chorePlan);
  const messages = recipients.map(email => ({
    to: email,
    from: { email: fromEmail, name: 'Bell Family Planner' },
    subject: `🏠 Bell Family Plan — Week of ${weekOf}`,
    html: htmlBody,
  }));

  try {
    await sgMail.send(messages);
    console.log(`[Notify] Combined email sent to: ${recipients.join(', ')}`);
  } catch (err) {
    const body = err.response?.body;
    throw new Error(body?.errors?.[0]?.message || err.message);
  }
}

// ── Daily email (single day's meals + chores) ─────────────────────────────────

function buildDailyEmailHtml(dayMeal, dayChores, dayName) {
  // ── Meal row ──────────────────────────────────────────────────────────────
  let mealHtml;
  if (!dayMeal) {
    mealHtml = '<p style="font-size:14px;color:#94a3b8;font-style:italic;">No meal planned for today.</p>';
  } else if (dayMeal.isTakeout) {
    mealHtml = '<p style="font-size:15px;font-weight:500;color:#ea580c;">🥡 Takeout Night</p>';
  } else if (dayMeal.isLeftover) {
    mealHtml = '<p style="font-size:15px;font-weight:500;color:#16a34a;">♻️ Leftover Night</p>';
  } else {
    const mealName = dayMeal.meal?.link
      ? `<a href="${dayMeal.meal.link}" style="color:#2563eb;text-decoration:none;font-weight:600;">${dayMeal.meal.name}</a>`
      : `<span style="font-weight:600;color:#1e293b;">${dayMeal.meal?.name || '—'}</span>`;
    const sides = (dayMeal.sides || []).map(s => s.name).join(', ');
    const sidesHtml = sides ? `<br><span style="font-size:13px;color:#64748b;">+ ${sides}</span>` : '';
    const cookColor = MEMBER_COLORS[dayMeal.cook] || { text: '#475569' };
    const cookHtml = dayMeal.cook
      ? `<p style="font-size:13px;color:#475569;margin:6px 0 0;">👨‍🍳 Cook: <span style="color:${cookColor.text};font-weight:600;">${dayMeal.cook}</span></p>`
      : '';
    mealHtml = `<p style="font-size:15px;margin:0;">${mealName}${sidesHtml}</p>${cookHtml}`;
  }

  // ── Per-person chore cards ────────────────────────────────────────────────
  const members = ['Mom', 'Dad', 'Maya', 'Maddy'];
  const assignments = dayChores?.assignments || [];

  const personSections = members.map(name => {
    const colors = MEMBER_COLORS[name];
    const myChores = assignments.filter(a => a.assignedTo === name && !a.choreName?.toLowerCase().includes('make supper'));
    const isCooking = dayMeal && !dayMeal.isTakeout && !dayMeal.isLeftover && dayMeal.cook === name;

    if (myChores.length === 0 && !isCooking) return '';

    const choreItems = myChores.map(a => `<div style="padding:2px 0;font-size:13px;color:#475569;">📋 ${a.choreName}</div>`).join('');
    const cookItem = isCooking
      ? `<div style="padding:2px 0;font-size:13px;color:#475569;">🍳 Make Supper — ${dayMeal.meal?.name || 'TBD'}</div>`
      : '';

    return `
    <div style="background:${colors.bg};border-radius:10px;padding:14px 16px;margin-bottom:10px;border-left:4px solid ${colors.accent};">
      <h3 style="margin:0 0 8px 0;font-size:15px;color:${colors.text};">${name}</h3>
      ${cookItem}${choreItems}
    </div>`;
  }).filter(Boolean).join('');

  const noTasksHtml = personSections
    ? ''
    : '<p style="font-size:13px;color:#94a3b8;font-style:italic;">No chores assigned for today.</p>';

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:20px;margin:0;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,#0891b2,#2563eb);padding:24px 28px;border-radius:12px 12px 0 0;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">📋 Today's Plan — ${dayName}</h1>
      <p style="margin:6px 0 0;color:#bae6fd;font-size:13px;">Bell Family Daily Rundown</p>
      <a href="${APP_URL}" style="display:inline-block;margin-top:12px;padding:8px 18px;background:rgba(255,255,255,0.2);color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">📱 Open Planner App →</a>
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <div style="padding:20px 24px;border-bottom:1px solid #f1f5f9;">
        <h2 style="margin:0 0 10px;font-size:16px;color:#1e293b;">🍽️ Tonight's Supper</h2>
        ${mealHtml}
      </div>
      <div style="padding:20px 24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1e293b;">👨‍👩‍👧‍👧 Today's Assignments</h2>
        ${personSections}${noTasksHtml}
      </div>
      <div style="padding:14px 24px;background:#f0fdf4;border-top:1px solid #dcfce7;">
        <p style="margin:0;font-size:12px;color:#166534;">✅ Mark chores done in the <a href="${APP_URL}" style="color:#2563eb;font-weight:600;">Planner App</a> → My Week → ${dayName}</p>
      </div>
      <div style="padding:14px 24px;background:#f8fafc;text-align:center;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Generated by Bell Family Planner — AI-powered by Gemini</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildPersonalDailyEmailHtml(person, dayMeal, dayChores, dayName) {
  const colors = MEMBER_COLORS[person] || { bg: '#f1f5f9', text: '#475569', accent: '#64748b' };
  const assignments = dayChores?.assignments || [];
  const myChores = assignments.filter(a => a.assignedTo === person && !a.choreName?.toLowerCase().includes('make supper'));
  const isCooking = dayMeal && !dayMeal.isTakeout && !dayMeal.isLeftover && dayMeal.cook === person;

  // ── Supper section ────────────────────────────────────────────────────────
  let supperHtml;
  if (!dayMeal) {
    supperHtml = '<p style="font-size:14px;color:#94a3b8;font-style:italic;">No meal planned for today.</p>';
  } else if (dayMeal.isTakeout) {
    supperHtml = '<p style="font-size:15px;font-weight:500;color:#ea580c;">🥡 Takeout Night — no cooking!</p>';
  } else if (dayMeal.isLeftover) {
    supperHtml = '<p style="font-size:15px;font-weight:500;color:#16a34a;">♻️ Leftover Night — no cooking!</p>';
  } else {
    const mealName = dayMeal.meal?.link
      ? `<a href="${dayMeal.meal.link}" style="color:#2563eb;text-decoration:none;font-weight:600;">${dayMeal.meal.name}</a>`
      : `<span style="font-weight:600;color:#1e293b;">${dayMeal.meal?.name || '—'}</span>`;
    const sides = (dayMeal.sides || []).map(s => s.name).join(', ');
    const sidesHtml = sides ? `<br><span style="font-size:13px;color:#64748b;">+ ${sides}</span>` : '';
    const cookColor = MEMBER_COLORS[dayMeal.cook] || { text: '#475569' };
    const cookHtml = isCooking
      ? `<p style="font-size:13px;margin:8px 0 0;"><strong style="color:${colors.text};">👨‍🍳 That's you cooking tonight!</strong></p>`
      : dayMeal.cook
        ? `<p style="font-size:13px;color:#475569;margin:6px 0 0;">👨‍🍳 Cook tonight: <span style="color:${cookColor.text};font-weight:600;">${dayMeal.cook}</span></p>`
        : '';
    supperHtml = `<p style="font-size:15px;margin:0;">${mealName}${sidesHtml}</p>${cookHtml}`;
  }

  // ── Tasks section ─────────────────────────────────────────────────────────
  const hasTasks = isCooking || myChores.length > 0;
  let tasksHtml;
  if (!hasTasks) {
    tasksHtml = '<p style="font-size:14px;color:#94a3b8;font-style:italic;">No chores assigned for today. Enjoy your day off! 🎉</p>';
  } else {
    const cookItem = isCooking
      ? `<div style="background:#fff7ed;border-radius:8px;padding:10px 14px;margin-bottom:8px;border-left:3px solid #f59e0b;">
          <span style="font-size:14px;color:#92400e;font-weight:600;">🍳 Make Supper — ${dayMeal.meal?.name || 'TBD'}</span>
         </div>`
      : '';
    const choreItems = myChores.map(a =>
      `<div style="background:#f8fafc;border-radius:8px;padding:10px 14px;margin-bottom:8px;border-left:3px solid #e2e8f0;">
        <span style="font-size:14px;color:#475569;">📋 ${a.choreName}</span>
       </div>`
    ).join('');
    tasksHtml = cookItem + choreItems;
  }

  return `<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="background:linear-gradient(135deg,${colors.accent},${colors.text});padding:24px 28px;border-radius:12px 12px 0 0;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.75);font-size:13px;">Hey ${person}! Here's your day:</p>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">📋 ${dayName}'s Plan</h1>
      <a href="${APP_URL}" style="display:inline-block;margin-top:12px;padding:8px 18px;background:rgba(255,255,255,0.2);color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">📱 Open Planner App →</a>
    </div>
    <div style="background:#fff;border-radius:0 0 12px 12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <div style="padding:20px 24px;border-bottom:1px solid #f1f5f9;">
        <h2 style="margin:0 0 10px;font-size:16px;color:#1e293b;">🍽️ Tonight's Supper</h2>
        ${supperHtml}
      </div>
      <div style="padding:20px 24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#1e293b;">✅ Your Tasks for Today</h2>
        ${tasksHtml}
      </div>
      ${hasTasks ? `
      <div style="padding:14px 24px;background:#f0fdf4;border-top:1px solid #dcfce7;">
        <p style="margin:0;font-size:12px;color:#166534;">✅ Mark chores done in the <a href="${APP_URL}" style="color:#2563eb;font-weight:600;">Planner App</a> → My Week → ${dayName}</p>
      </div>` : ''}
      <div style="padding:14px 24px;background:#f8fafc;text-align:center;border-top:1px solid #f1f5f9;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Bell Family Planner — AI-powered by Gemini</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function sendDailyNotification(mealPlan, chorePlan, settings) {
  initSendGrid();

  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  if (!fromEmail) throw new Error('SENDGRID_FROM_EMAIL not set. Add it as a Railway variable.');

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];

  const dayMeal = (mealPlan?.days || []).find(d => d.day === todayName) || null;
  const dayChores = (chorePlan?.days || []).find(d => d.day === todayName) || null;

  // ── Personalized per-person emails ───────────────────────────────────────
  const memberEmails = settings.memberEmails || {};
  const membersWithEmail = Object.entries(memberEmails).filter(([, email]) => email?.trim());

  if (membersWithEmail.length > 0) {
    const messages = membersWithEmail.map(([member, email]) => ({
      to: email.trim(),
      from: { email: fromEmail, name: 'Bell Family Planner' },
      subject: `📋 Your Plan for ${todayName}`,
      html: buildPersonalDailyEmailHtml(member, dayMeal, dayChores, todayName),
    }));
    try {
      await sgMail.send(messages);
      console.log(`[Notify] Personalized daily emails sent for ${todayName} to: ${membersWithEmail.map(([m, e]) => `${m}<${e}>`).join(', ')}`);
    } catch (err) {
      const body = err.response?.body;
      throw new Error(body?.errors?.[0]?.message || err.message);
    }
    return;
  }

  // ── Fallback: combined email to notificationEmails ────────────────────────
  const recipients = settings.notificationEmails || [];
  if (recipients.length === 0) {
    throw new Error('No notification emails configured in Settings. Add member emails or a notification email.');
  }

  const htmlBody = buildDailyEmailHtml(dayMeal, dayChores, todayName);
  const messages = recipients.map(email => ({
    to: email,
    from: { email: fromEmail, name: 'Bell Family Planner' },
    subject: `📋 Today's Plan — ${todayName}`,
    html: htmlBody,
  }));

  try {
    await sgMail.send(messages);
    console.log(`[Notify] Daily email (combined) sent for ${todayName} to: ${recipients.join(', ')}`);
  } catch (err) {
    const body = err.response?.body;
    throw new Error(body?.errors?.[0]?.message || err.message);
  }
}

// Legacy exports for scheduler compatibility
const sendMealPlanNotification = async (plan, settings) => sendWeeklyNotification(plan, null, settings);
const sendChorePlanNotification = async (plan, settings) => sendWeeklyNotification(null, plan, settings);

module.exports = { sendWeeklyNotification, sendDailyNotification, sendMealPlanNotification, sendChorePlanNotification };
