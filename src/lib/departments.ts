// Typical walk-through order of a grocery store; used to sort the shopping list.
export const DEPARTMENTS: { name: string; keywords: RegExp }[] = [
  { name: "Produce", keywords: /\b(apples?|bananas?|oranges?|lemons?|limes?|grapes?|berr(y|ies)|strawberr\w*|avocados?|lettuce|spinach|kale|salad|tomato(es)?|potato(es)?|onions?|garlic|carrots?|celery|peppers?|cucumbers?|broccoli|cauliflower|mushrooms?|corn|squash|zucchini|cilantro|parsley|herbs?|melons?|peach(es)?|pears?|pineapples?|fruit|vegetables?|produce)\b/i },
  { name: "Bakery", keywords: /\b(bread|bagels?|rolls?|buns?|tortillas?|muffins?|donuts?|cakes?|pie|croissants?|pita|baguette)\b/i },
  { name: "Meat & Seafood", keywords: /\b(chicken|beef|pork|steaks?|ground|bacon|sausages?|turkey|ham|fish|salmon|shrimp|meat|ribs|roast|hot dogs?)\b/i },
  { name: "Deli", keywords: /\b(deli|lunch ?meat|salami|prosciutto|hummus|rotisserie)\b/i },
  { name: "Dairy & Eggs", keywords: /\b(milk|cheese|butter|yogurt|eggs?|cream|cottage|margarine|creamer|half and half)\b/i },
  { name: "Canned & Packaged", keywords: /\b(cans?|canned|soup|beans|sauce|broth|stock|tuna|pasta|noodles?|spaghetti|rice|macaroni|mac)\b/i },
  { name: "Breakfast & Cereal", keywords: /\b(cereal|oats?|oatmeal|granola|pancake|syrup|pop-?tarts?)\b/i },
  { name: "Baking & Spices", keywords: /\b(flour|sugar|baking|yeast|vanilla|spices?|salt|cinnamon|cocoa|chocolate chips?)\b/i },
  { name: "Condiments & Oils", keywords: /\b(ketchup|mustard|mayo|mayonnaise|dressing|oil|vinegar|salsa|jam|jelly|peanut butter|honey)\b/i },
  { name: "Snacks", keywords: /\b(chips?|crackers?|cookies?|pretzels?|popcorn|nuts?|snacks?|candy|granola bars?)\b/i },
  { name: "Beverages", keywords: /\b(water|soda|cola|juice|coffee|tea|drinks?|lemonade|sparkling|beer|wine)\b/i },
  { name: "Frozen", keywords: /\b(frozen|ice cream|pizza|waffles?|fries|popsicles?)\b/i },
  { name: "Household", keywords: /\b(paper towels?|toilet paper|tissues?|napkins?|detergent|soap|dish|trash bags?|foil|wrap|cleaner|sponges?|laundry)\b/i },
  { name: "Health & Beauty", keywords: /\b(shampoo|toothpaste|deodorant|lotion|vitamins?|medicine|razors?|conditioner|toothbrush)\b/i },
  { name: "Pet", keywords: /\b(dog|cat|pet|litter)\b/i },
];

// Match priority differs from walk order (e.g. "peanut butter" is a condiment, "ice cream" is frozen).
const MATCH_FIRST = ["Frozen", "Condiments & Oils", "Baking & Spices", "Breakfast & Cereal", "Household", "Health & Beauty", "Pet"];

export function departmentFor(query: string): { department: string; deptOrder: number } {
  const ordered = [
    ...DEPARTMENTS.filter((d) => MATCH_FIRST.includes(d.name)),
    ...DEPARTMENTS.filter((d) => !MATCH_FIRST.includes(d.name)),
  ];
  const hit = ordered.find((d) => d.keywords.test(query));
  if (!hit) return { department: "Other", deptOrder: DEPARTMENTS.length };
  return { department: hit.name, deptOrder: DEPARTMENTS.indexOf(hit) };
}
