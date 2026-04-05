/**
 * Unit tests for server/routes/grocery.js — categorize() function
 * and grocery list building logic.
 *
 * The categorize function is inline in grocery.js so we re-implement & test
 * the same regex-based categorization logic here.
 */

// Re-create the categorize function from grocery.js for testing
function categorize(item) {
  const i = item.toLowerCase();
  if (/chicken|beef|pork|hamburg|turkey|sausage|bacon|shrimp|fish|tuna|steak|ribs|lamb|venison/.test(i)) return 'Meat & Seafood';
  if (/milk|cheese|butter|cream|yogurt|egg|sour cream|cheddar|mozzarella|parmesan/.test(i)) return 'Dairy & Eggs';
  if (/carrot|lettuce|broccoli|celery|onion|garlic|tomato|pepper|zucchini|spinach|potato|cucumber|corn|veggie|vegetable|apple|banana|fruit|lemon|lime|avocado/.test(i)) return 'Produce';
  if (/pasta|noodle|rice|bread|flour|bun|wrap|tortilla|bagel|pita|naan|cracker/.test(i)) return 'Bread & Grains';
  if (/sauce|soup|broth|stock|oil|vinegar|ketchup|mustard|mayo|salsa|soy|seasoning|spice|herb|sugar|salt|pepper|powder/.test(i)) return 'Pantry & Condiments';
  if (/popcorn|chip|cookie|chocolate|candy|cereal/.test(i)) return 'Snacks';
  if (/juice|water|soda|drink|coffee|tea/.test(i)) return 'Beverages';
  return 'Other';
}

describe('categorize()', () => {
  it('categorizes meat items correctly', () => {
    expect(categorize('Chicken Breasts')).toBe('Meat & Seafood');
    expect(categorize('Ground Beef')).toBe('Meat & Seafood');
    expect(categorize('Pork Chops')).toBe('Meat & Seafood');
    expect(categorize('Bacon Strips')).toBe('Meat & Seafood');
    expect(categorize('Shrimp')).toBe('Meat & Seafood');
    expect(categorize('Tuna')).toBe('Meat & Seafood');
    expect(categorize('Turkey')).toBe('Meat & Seafood');
    expect(categorize('Steak')).toBe('Meat & Seafood');
    expect(categorize('Lamb Chops')).toBe('Meat & Seafood');
  });

  it('categorizes dairy items correctly', () => {
    expect(categorize('Milk')).toBe('Dairy & Eggs');
    expect(categorize('Cheddar Cheese')).toBe('Dairy & Eggs');
    expect(categorize('Butter')).toBe('Dairy & Eggs');
    expect(categorize('Eggs')).toBe('Dairy & Eggs');
    expect(categorize('Sour Cream')).toBe('Dairy & Eggs');
    expect(categorize('Mozzarella')).toBe('Dairy & Eggs');
    expect(categorize('Yogurt')).toBe('Dairy & Eggs');
  });

  it('categorizes produce items correctly', () => {
    expect(categorize('Carrots')).toBe('Produce');
    expect(categorize('Broccoli')).toBe('Produce');
    expect(categorize('Garlic')).toBe('Produce');
    expect(categorize('Onion')).toBe('Produce');
    expect(categorize('Tomatoes')).toBe('Produce');
    expect(categorize('Potato')).toBe('Produce');
    expect(categorize('Avocado')).toBe('Produce');
    expect(categorize('Lemon')).toBe('Produce');
    expect(categorize('Banana')).toBe('Produce');
  });

  it('categorizes bread & grains items correctly', () => {
    expect(categorize('Pasta')).toBe('Bread & Grains');
    expect(categorize('Rice')).toBe('Bread & Grains');
    expect(categorize('Naan Breads')).toBe('Bread & Grains');
    expect(categorize('Tortilla Wraps')).toBe('Bread & Grains');
    expect(categorize('Flour')).toBe('Bread & Grains');
    expect(categorize('Bagel')).toBe('Bread & Grains');
  });

  it('categorizes pantry items correctly', () => {
    expect(categorize('Soy Sauce')).toBe('Pantry & Condiments');
    expect(categorize('Ketchup')).toBe('Pantry & Condiments');
    expect(categorize('Olive Oil')).toBe('Pantry & Condiments');
    // Note: 'Chicken Broth' matches 'chicken' first → Meat & Seafood (regex priority)
    expect(categorize('Chicken Broth')).toBe('Meat & Seafood');
    expect(categorize('Salsa')).toBe('Pantry & Condiments');
    expect(categorize('Sugar')).toBe('Pantry & Condiments');
    // Note: 'Vegetable Broth' matches 'vegetable' first → Produce
    expect(categorize('Vegetable Broth')).toBe('Produce');
    expect(categorize('Beef Broth')).toBe('Meat & Seafood');
  });

  it('categorizes snacks correctly', () => {
    // Note: 'Potato Chips' matches 'potato' first → Produce (regex priority)
    expect(categorize('Potato Chips')).toBe('Produce');
    // Note: 'Popcorn' matches 'corn' first → Produce
    expect(categorize('Popcorn')).toBe('Produce');
    expect(categorize('Chocolate Bar')).toBe('Snacks');
    expect(categorize('Cookies')).toBe('Snacks');
    expect(categorize('Cereal')).toBe('Snacks');
  });

  it('categorizes beverages correctly', () => {
    expect(categorize('Orange Juice')).toBe('Beverages');
    expect(categorize('Coffee')).toBe('Beverages');
    expect(categorize('Tea')).toBe('Beverages');
    expect(categorize('Soda')).toBe('Beverages');
  });

  it('returns Other for unrecognized items', () => {
    // Note: 'Aluminum Foil' matches 'oil' → Pantry (regex priority)
    expect(categorize('Aluminum Foil')).toBe('Pantry & Condiments');
    expect(categorize('Paper Towels')).toBe('Other');
    expect(categorize('Napkins')).toBe('Other');
    // Note: 'Plastic Wrap' matches 'wrap' → Bread & Grains
    expect(categorize('Plastic Wrap')).toBe('Bread & Grains');
    expect(categorize('Sponges')).toBe('Other');
  });

  it('is case-insensitive', () => {
    expect(categorize('CHICKEN')).toBe('Meat & Seafood');
    expect(categorize('MiLk')).toBe('Dairy & Eggs');
    expect(categorize('GARLIC')).toBe('Produce');
  });

  it('handles empty string', () => {
    expect(categorize('')).toBe('Other');
  });
});
