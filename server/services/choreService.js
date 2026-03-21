const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Ask Gemini to generate a weekly chore assignment plan for the Bell family.
 */
async function generateWeeklyChores({ choreDefinitions = [], familyMembers = [], preferences = {}, recentAssignments = [], notes = {} }) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const choreList = choreDefinitions.map(c =>
    `- ${c.name} (id: ${c.id}, category: ${c.category}, difficulty: ${c.difficulty}, ~${c.estimatedMinutes}min, frequency: ${c.frequency}, min age: ${c.ageMin})`
  ).join('\n');

  const memberList = familyMembers.map(m =>
    `- ${m.name} (age: ${m.age || 'adult'}, isAdult: ${m.isAdult})`
  ).join('\n');

  const prefSection = Object.entries(preferences)
    .filter(([, p]) => p.preferred?.length > 0 || p.disliked?.length > 0)
    .map(([name, p]) => {
      const parts = [];
      if (p.preferred?.length) parts.push(`prefers: ${p.preferred.join(', ')}`);
      if (p.disliked?.length) parts.push(`dislikes: ${p.disliked.join(', ')}`);
      return `- ${name}: ${parts.join('; ')}`;
    }).join('\n');

  const recentSection = recentAssignments.length > 0
    ? `RECENT CHORE ASSIGNMENTS (last 4 weeks — rotate fairly, avoid giving the same person the same chore every week):\n${
        recentAssignments.slice(0, 60).map(a => `- ${a.day}: ${a.choreName} → ${a.assignedTo}`).join('\n')
      }`
    : '';

  const notesSection = Object.entries(notes).map(([k, v]) => `- ${k}: ${v}`).join('\n');

  const prompt = `You are a family chore allocator for the Bell family. Your goal is to generate fair, balanced, and age-appropriate chore assignments for the upcoming week.

FAMILY MEMBERS:
${memberList}

CHORE LIBRARY:
${choreList}

${prefSection ? `CHORE PREFERENCES:\n${prefSection}` : ''}

${recentSection}

${notesSection ? `HOUSEHOLD NOTES:\n${notesSection}` : ''}

RULES:
1. "daily" chores must be assigned every day (Sun-Sat), rotating the assignee. Not every daily chore needs to be done every single day — use judgement. For example, "Make supper" only needs one person per day.
2. "weekly" chores should be assigned once during the week to one person.
3. "biweekly" chores should be assigned this week (alternate weeks in practice).
4. "monthly" chores: include 1-2 if they seem due.
5. Respect ageMin — don't give chores requiring age 15+ to someone younger.
6. Distribute workload fairly by total estimated minutes. Teens get lighter loads than adults.
7. Respect preferences — assign preferred chores when possible, avoid disliked ones.
8. Rotate fairly — if someone did a chore last week, give it to someone else this week.
9. Sunday and Saturday can have more chores; weekdays should be lighter (people work/school).
10. Every family member should have 2-4 chores per day, with lighter days being fine.

RESPONSE FORMAT: Return ONLY valid JSON. No markdown, no explanation.
{
  "weekOf": "YYYY-MM-DD (the Sunday of this week)",
  "generatedAt": "ISO timestamp",
  "days": [
    {
      "day": "Sunday",
      "date": "YYYY-MM-DD",
      "assignments": [
        {
          "choreId": "dishwasher",
          "choreName": "Dishwasher (load/unload)",
          "assignedTo": "Maya",
          "isCompleted": false
        }
      ]
    }
  ]
}

Generate the chore plan for the week starting this coming Sunday. Today is ${new Date().toDateString()}.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  let plan;
  try {
    plan = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Gemini returned invalid JSON: ${e.message}\n\nRaw:\n${text.substring(0, 500)}`);
  }

  return plan;
}

module.exports = { generateWeeklyChores };
