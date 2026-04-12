import achievements from './data/achievements.json';
import users from './data/users.json';

// In-memory store for user stats to simulate history
const userStats = users.reduce((acc, user) => {
  acc[user.name] = {
    mealsHelped: 0,
    choresCompleted: 0,
    cookingStreak: 0,
    choreStreaks: {},
    chores: {},
  };
  return acc;
}, {});

/**
 * Checks for newly earned achievements.
 *
 * @param {string} userId - The ID of the user.
 * @param {string} action - The action the user just completed (e.g., 'completed_chore', 'helped_with_meal').
 * @param {object} data - Additional data about the action (e.g., { choreName: 'dishes' }).
 * @returns {Array} - A list of newly earned achievements.
 */
export function checkAchievements(userId, action, data) {
  const user = users.find(u => u.name === userId);
  if (!user) {
    return [];
  }

  // Update stats based on action
  const stats = userStats[userId];
  if (action === 'helped_with_meal') {
    stats.mealsHelped += 1;
    stats.cookingStreak += 1; // Simplified streak
  } else if (action === 'completed_chore') {
    stats.choresCompleted += 1;
    if (data && data.choreName) {
      stats.chores[data.choreName] = (stats.chores[data.choreName] || 0) + 1;
    }
  }

  const earnedAchievements = [];

  for (const achievement of achievements) {
    if (user.stickers.includes(achievement.id)) {
      continue; // Already earned
    }

    let earned = false;
    const { criteria } = achievement;

    switch (criteria.type) {
      case 'meal':
        if (action === 'helped_with_meal' && stats.mealsHelped >= criteria.count) {
          earned = true;
        }
        break;
      case 'chore':
        if (action === 'completed_chore') {
          if (criteria.name) {
            if (stats.chores[criteria.name] && stats.chores[criteria.name] >= criteria.count) {
              earned = true;
            }
          } else if (stats.choresCompleted >= criteria.count) {
            earned = true;
          }
        }
        break;
      case 'streak':
        if (criteria.task === 'cook' && stats.cookingStreak >= criteria.days) {
          earned = true;
        }
        break;
      default:
        break;
    }

    if (earned) {
      earnedAchievements.push(achievement);
      user.stickers.push(achievement.id); // Add to user's earned stickers
    }
  }

  return earnedAchievements;
}
