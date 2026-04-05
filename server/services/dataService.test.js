/**
 * Unit tests for dataService — ratings, settings defaults, history trimming logic.
 * Uses a temp directory so we don't touch real data.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

let tmpDir;

function freshModule() {
  // Set DATA_DIR to temp dir before requiring the module
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meal-test-'));
  process.env.DATA_DIR = tmpDir;

  // Clear the module cache so dataService re-initializes with the new DATA_DIR
  const modulePath = require.resolve('../services/dataService');
  delete require.cache[modulePath];

  // Suppress console logs during seed
  const origLog = console.log;
  console.log = () => {};
  const ds = require('../services/dataService');
  console.log = origLog;
  return ds;
}

describe('dataService', () => {
  afterEach(() => {
    // Clean up temp dir
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    delete process.env.DATA_DIR;
  });

  describe('getSettings() / saveSettings()', () => {
    it('returns default settings when no file exists', () => {
      const ds = freshModule();
      const settings = ds.getSettings();
      expect(settings).toBeDefined();
      expect(settings.familyMembers).toEqual(['Mom', 'Dad', 'Maya', 'Maddy']);
      expect(settings.scheduleDay).toBe('Saturday');
      expect(settings.defaultPortions).toBe(4);
    });

    it('saves and retrieves custom settings', () => {
      const ds = freshModule();
      const custom = { familyMembers: ['Alice', 'Bob'], scheduleDay: 'Monday' };
      ds.saveSettings(custom);
      const loaded = ds.getSettings();
      expect(loaded.familyMembers).toEqual(['Alice', 'Bob']);
      expect(loaded.scheduleDay).toBe('Monday');
    });
  });

  describe('addRating() / getAverageRatings()', () => {
    it('adds a rating and retrieves it', () => {
      const ds = freshModule();
      ds.addRating('Tacos', 'Mom', 5);
      const ratings = ds.getRatings();
      expect(ratings).toHaveLength(1);
      expect(ratings[0].meal).toBe('Tacos');
      expect(ratings[0].stars).toBe(5);
    });

    it('rejects stars outside 1-5 range', () => {
      const ds = freshModule();
      expect(() => ds.addRating('Tacos', 'Mom', 0)).toThrow('Stars must be 1–5');
      expect(() => ds.addRating('Tacos', 'Mom', 6)).toThrow('Stars must be 1–5');
    });

    it('calculates average ratings correctly', () => {
      const ds = freshModule();
      ds.addRating('Tacos', 'Mom', 5);
      ds.addRating('Tacos', 'Dad', 3);
      ds.addRating('Pizza', 'Mom', 4);
      const avgs = ds.getAverageRatings();
      expect(avgs).toHaveLength(2);
      // Tacos: (5+3)/2 = 4.0, Pizza: 4.0 — sorted by avg desc
      const tacos = avgs.find(a => a.meal === 'Tacos');
      expect(tacos.avgRating).toBe(4);
      expect(tacos.ratingCount).toBe(2);
    });

    it('sorts by highest average first', () => {
      const ds = freshModule();
      ds.addRating('Tacos', 'Mom', 2);
      ds.addRating('Pizza', 'Mom', 5);
      const avgs = ds.getAverageRatings();
      expect(avgs[0].meal).toBe('Pizza');
      expect(avgs[1].meal).toBe('Tacos');
    });
  });

  describe('savePlan() / getCurrentPlan()', () => {
    it('returns null when no plan exists', () => {
      const ds = freshModule();
      expect(ds.getCurrentPlan()).toBeNull();
    });

    it('saves and retrieves a plan', () => {
      const ds = freshModule();
      const plan = { weekOf: '2026-04-05', days: [{ day: 'Sunday' }] };
      ds.savePlan(plan);
      const loaded = ds.getCurrentPlan();
      expect(loaded.weekOf).toBe('2026-04-05');
    });

    it('appends to history when saving a plan', () => {
      const ds = freshModule();
      ds.savePlan({ weekOf: '2026-04-05', days: [] });
      const history = ds.getPlanHistory();
      expect(history).toHaveLength(1);
      expect(history[0].weekOf).toBe('2026-04-05');
    });

    it('trims history to 12 entries', () => {
      const ds = freshModule();
      for (let i = 0; i < 15; i++) {
        ds.savePlan({ weekOf: `2026-01-${String(i + 1).padStart(2, '0')}`, days: [] });
      }
      const history = ds.getPlanHistory();
      expect(history).toHaveLength(12);
    });
  });

  describe('deletePlan()', () => {
    it('deletes the current plan', () => {
      const ds = freshModule();
      ds.savePlan({ weekOf: '2026-04-05', days: [] });
      expect(ds.getCurrentPlan()).not.toBeNull();
      ds.deletePlan();
      expect(ds.getCurrentPlan()).toBeNull();
    });
  });

  describe('clearHistory()', () => {
    it('clears all history', () => {
      const ds = freshModule();
      ds.savePlan({ weekOf: '2026-04-05', days: [] });
      expect(ds.getPlanHistory().length).toBeGreaterThan(0);
      ds.clearHistory();
      expect(ds.getPlanHistory()).toEqual([]);
    });
  });

  describe('getChoreDefinitions() / saveChoreDefinitions()', () => {
    it('returns empty defaults when no file', () => {
      const ds = freshModule();
      const defs = ds.getChoreDefinitions();
      expect(defs.choreDefinitions).toBeDefined();
      expect(Array.isArray(defs.choreDefinitions)).toBe(true);
    });

    it('saves and retrieves chore definitions', () => {
      const ds = freshModule();
      const data = {
        choreDefinitions: [{ id: 'test', name: 'Test Chore' }],
        familyMembers: [{ name: 'Mom' }],
        chorePreferences: {},
        notes: {},
      };
      ds.saveChoreDefinitions(data);
      const loaded = ds.getChoreDefinitions();
      expect(loaded.choreDefinitions).toHaveLength(1);
      expect(loaded.choreDefinitions[0].name).toBe('Test Chore');
    });
  });

  describe('saveChorePlan() / getCurrentChorePlan()', () => {
    it('saves and retrieves a chore plan', () => {
      const ds = freshModule();
      const plan = { weekOf: '2026-04-05', days: [{ day: 'Sunday', assignments: [] }] };
      ds.saveChorePlan(plan);
      expect(ds.getCurrentChorePlan()).toBeDefined();
      expect(ds.getCurrentChorePlan().weekOf).toBe('2026-04-05');
    });

    it('appends to chore history', () => {
      const ds = freshModule();
      ds.saveChorePlan({ weekOf: '2026-04-05', days: [] });
      const history = ds.getChoreHistory();
      expect(history).toHaveLength(1);
    });
  });

  describe('getRecentChoreAssignments()', () => {
    it('returns empty array when no history', () => {
      const ds = freshModule();
      const recent = ds.getRecentChoreAssignments();
      expect(recent).toEqual([]);
    });

    it('extracts assignments from last 4 weeks of history', () => {
      const ds = freshModule();
      ds.saveChorePlan({
        weekOf: '2026-04-05',
        days: [{
          day: 'Sunday',
          assignments: [{ choreId: 'test', choreName: 'Test', assignedTo: 'Mom', isCompleted: false }],
        }],
      });
      const recent = ds.getRecentChoreAssignments();
      expect(recent).toHaveLength(1);
      expect(recent[0].assignedTo).toBe('Mom');
      expect(recent[0].day).toBe('Sunday');
    });
  });

  describe('getKnownMeals()', () => {
    it('returns seed meals when no meals file', () => {
      const ds = freshModule();
      const meals = ds.getKnownMeals();
      // Should at least have the structure
      expect(meals).toHaveProperty('meals');
      expect(meals).toHaveProperty('sides');
    });
  });
});
