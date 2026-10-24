// Food rules: statuses, where each expiry date comes from, and merging a new scan into the saved list.
const SHELVES = ["Top shelf", "Middle shelf", "Bottom shelf", "Crisper drawer", "Door rack"];
const EAT_SOON_DAYS = 2;
const COOKED_DAYS = 3; // home-cooked food and leftovers: eat within 3 days of first being seen

// Status labels; STATUS_ORDER lists them most urgent first.
// "unknown" = a package whose printed date couldn't be read: it gets no date rather than a guess.
const STATUS = {
  expired: { label: "Expired" },
  soon: { label: "Eat soon" },
  unknown: { label: "Date unrecognised" },
  safe: { label: "Safe" }
};
const STATUS_ORDER = ["expired", "soon", "unknown", "safe"];

// Where an expiry date came from. A weaker source never overwrites a stronger one.
const DATE_SOURCES = {
  manual: { text: "Date set by you", rank: 4 },
  label: { text: "Date printed on the pack", rank: 3 },
  receipt: { text: "Date from shop bill + shelf life", rank: 2 },
  cooked: { text: `Cooked food: ${COOKED_DAYS} days from first photo`, rank: 1 },
  look: { text: "Estimated from how it looks", rank: 1 },
  unknown: { text: "Printed date couldn't be read. Tap “Scan date” or set it yourself.", rank: 0 }
};

// Food types for the filters. Dairy is extra to the plan's list: cheese, yogurt and butter fit nowhere else.
const CATEGORIES = [
  { id: "fruit", label: "Fruit", icon: "🍓" },
  { id: "veg", label: "Vegetables", icon: "🥕" },
  { id: "protein", label: "Meat, fish & eggs", icon: "🍗" },
  { id: "dairy", label: "Dairy", icon: "🧀" },
  { id: "drink", label: "Liquids", icon: "🥛" },
  { id: "nuts", label: "Nuts", icon: "🥜" },
  { id: "snack", label: "Snacks", icon: "🍪" },
  { id: "cooked", label: "Cooked meals", icon: "🍲" },
  { id: "unknown", label: "Unknown", icon: "❔" }
];
const CATEGORY_IDS = CATEGORIES.map(c => c.id);
// For items saved before types existed, or when the AI says "unknown": guess from the name.
// Order matters: "ice cream" is a snack, "peanut butter" nuts, "apple juice" a liquid, "eggplant" a vegetable.
const CATEGORY_WORDS = [
  ["cooked", /leftover|soup|stew|cooked|curry|lasagn|casserole|pizza|noodle|risotto|goulash|meal/],
  ["snack", /chip|crisp|cookie|biscuit|chocolate|candy|\bsweets?\b|cracker|cake|dessert|ice cream|snack|wafer|gummy|popcorn/],
  ["nuts", /nut|almond|cashew|pistachio|hazelnut|walnut|pecan|seed/],
  ["drink", /milk|juice|water|soda|cola|wine|beer|drink|smoothie|lemonade|half & half|tea|coffee|kefir/],
  ["dairy", /cheese|cheddar|feta|parm|mozzarella|yog|butter|cream|curd|ricotta|spread/],
  ["veg", /spinach|lettuce|salad|tomato|carrot|cucumber|pepper|onion|garlic|broccoli|cabbage|mushroom|green|herb|kale|zucchini|eggplant|potato|celery|leek|\bpeas?\b|bean|veg|produce/],
  ["fruit", /apple|banana|berr|grape|orange|lemon|lime|pear|peach|plum|melon|kiwi|mango|cherr|fruit|avocado|pineapple/],
  ["protein", /chicken|beef|pork|meat|ham|bacon|sausage|salami|fish|salmon|tuna|shrimp|egg|turkey|mince|tofu/]
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const norm = s => String(s || "").trim().toLowerCase();

// "Milk" and "Milk 3.6%" are the same food; very short names must match exactly
function sameFood(a, b) {
  const x = norm(a), y = norm(b);
  if (x === y) return true;
  if (x.length < 4 || y.length < 4) return false;
  return x.includes(y) || y.includes(x);
}

const Food = {
  status(item) {
    if (!item.expires) return "unknown";
    const d = Dates.daysUntil(item.expires);
    return d < 0 ? "expired" : d <= EAT_SOON_DAYS ? "soon" : "safe";
  },

  daysText(item) {
    if (!item.expires) return "Date unrecognised";
    const d = Dates.daysUntil(item.expires);
    if (d < 0) return `Expired ${plural(-d, "day")} ago`;
    if (d === 0) return "Eat today";
    return `${plural(d, "day")} left`;
  },

  categoryOf(item) {
    if (CATEGORY_IDS.includes(item.category) && item.category !== "unknown") return item.category;
    if (item.kind === "cooked") return "cooked";
    const name = norm(item.name);
    const hit = CATEGORY_WORDS.find(([, re]) => re.test(name));
    if (hit) return hit[0];
    return item.kind === "cooked" ? "cooked" : "unknown";
  },

  category(item) {
    return CATEGORIES.find(c => c.id === Food.categoryOf(item));
  },

  sourceText(item) {
    const src = DATE_SOURCES[item.dateSource] || DATE_SOURCES.look;
    return src.text + (item.dateText ? ` (on the pack: “${item.dateText}”)` : "");
  },

  // Undated items sort after dated ones
  byUrgency(items) {
    return [...items].sort((a, b) => (a.expires || "9999").localeCompare(b.expires || "9999") || a.name.localeCompare(b.name));
  },

  counts(items) {
    const c = { expired: 0, soon: 0, unknown: 0, safe: 0 };
    items.forEach(i => { c[Food.status(i)]++; });
    return c;
  },

  newId() {
    return Math.random().toString(36).slice(2, 10);
  },

  // Expiry date for one scanned item, from the best information the scan has.
  // A package's date must be read, never guessed: if it couldn't be read the item gets no date,
  // unless it visibly looks spoiled.
  dateFor(s, firstSeen) {
    const today = Dates.today();
    if (s.kind !== "cooked" && Dates.valid(s.printedDate)) return { expires: s.printedDate, dateSource: "label", dateText: s.dateText || "" };
    if (s.kind !== "cooked" && Dates.valid(s.purchaseDate) && s.shelfLifeDays > 0) {
      return { expires: Dates.addDays(s.purchaseDate, s.shelfLifeDays), dateSource: "receipt", dateText: "" };
    }
    const byLook = Dates.addDays(today, s.daysLeft ?? 5);
    if (s.kind === "cooked") {
      const byRule = Dates.addDays(firstSeen, COOKED_DAYS);
      return { expires: byLook < byRule ? byLook : byRule, dateSource: "cooked", dateText: "" };
    }
    if (s.kind === "packaged" && !(s.daysLeft < 0)) {
      return { expires: null, dateSource: "unknown", dateText: s.dateText || "" };
    }
    return { expires: byLook, dateSource: "look", dateText: "" };
  },

  // Merge a scan into the saved list. Every photo is dated today.
  // An item is matched to a saved one by container first (the AI recognised a container it was
  // told about, so a renamed "blue box" stays "Chicken soup"), then by name.
  // Items seen before keep their name, first-seen day and date unless the new scan has a
  // stronger date source, or the food now looks spoiled.
  // trackMissing: a fridge photo shows everything, so saved items it didn't see are asked about.
  // A shop bill doesn't, so unmatched saved items are left as they are ("untouched").
  merge(saved, scanned, { trackMissing = true } = {}) {
    const today = Dates.today();
    const pool = [...saved];
    const rows = scanned.map(s => {
      let k = s.knownId ? pool.findIndex(e => e.id === s.knownId) : -1;
      if (k < 0) k = pool.findIndex(e => sameFood(e.name, s.name));
      const e = k >= 0 ? pool.splice(k, 1)[0] : null;
      const firstSeen = e?.firstSeen || Dates.addDays(today, -(s.seenDaysAgo || 0));
      const found = Food.dateFor(s, firstSeen);
      const info = {
        condition: s.condition || "", confidence: s.confidence || "high", note: s.note || "",
        container: s.container || e?.container || "",
        photoKey: e?.photoKey || s.photoKey || null,
        category: CATEGORY_IDS.includes(s.category) && s.category !== "unknown" ? s.category : (e?.category || s.category || ""),
        box: s.box || null   // where it is in this photo; only used to draw the circles, not saved
      };

      if (!e) {
        return { id: Food.newId(), name: s.name, qty: s.qty, shelf: s.shelf, kind: s.kind || "other", firstSeen, ...found, ...info, isNew: true };
      }
      const savedSource = e.dateSource || "look";
      const stronger = DATE_SOURCES[found.dateSource].rank > DATE_SOURCES[savedSource].rank;
      const looksSpoiled = s.daysLeft < 0 && found.expires && (!e.expires || found.expires < e.expires);
      const dates = stronger || looksSpoiled ? found : { expires: e.expires, dateSource: savedSource, dateText: e.dateText || "" };
      return {
        ...e, qty: s.qty || e.qty, shelf: s.shelf || e.shelf, kind: s.kind || e.kind,
        ...info, ...dates, isNew: false, dateChanged: dates.expires !== e.expires
      };
    });
    return {
      rows,
      missing: trackMissing ? pool.map(item => ({ item, keep: true })) : [],
      untouched: trackMissing ? [] : pool
    };
  }
};

// Example data for demos without a camera. The second set shows the pasta gone, a new item,
// a mislabelled box and something the AI can't see into.
const EXAMPLE_SCANS = [
  [
    { name: "Leftover vegetable soup", kind: "cooked", qty: "1 box · 2 portions", shelf: "Top shelf", daysLeft: 2, seenDaysAgo: 1, container: "clear glass soup box with cream lid", condition: "carrot and potato pieces visible in broth", confidence: "high", note: "Homemade leftovers. Check when the soup was cooked and adjust the date." },
    { name: "Rice-stuffed peppers", kind: "cooked", qty: "6 peppers", shelf: "Middle shelf", daysLeft: 1, seenDaysAgo: 2, container: "vanilla ice cream tub with pink lid", condition: "cooked peppers and rice visible inside the open tub", confidence: "low", note: "Reused ice cream tub: these are rice-stuffed peppers, not ice cream. Confirm the contents and when they were cooked; the tub's printed date does not apply." },
    { name: "Chicken breast", kind: "packaged", qty: "500 g", shelf: "Bottom shelf", printedDate: "", daysLeft: -1, seenDaysAgo: 3, condition: "grey patches on the meat", confidence: "high" },
    { name: "Leftover pasta", kind: "cooked", qty: "1 box", shelf: "Top shelf", daysLeft: 2, seenDaysAgo: 2, condition: "home-cooked, in a glass box", confidence: "high" },
    { name: "Baby spinach", kind: "fresh", qty: "200 g", shelf: "Crisper drawer", daysLeft: 1, seenDaysAgo: 4, condition: "a few leaves turning dark", confidence: "high" },
    { name: "Milk 3.6%", kind: "packaged", qty: "1 L", shelf: "Door rack", printedDate: "", dateText: "2?.1?.2?", daysLeft: 2, seenDaysAgo: 3, condition: "sealed carton, date partly hidden", confidence: "medium" },
    { name: "Greek yogurt", kind: "packaged", qty: "2 cups", shelf: "Middle shelf", printedIn: 4, daysLeft: 4, seenDaysAgo: 6, condition: "sealed, looks fine", confidence: "high" },
    { name: "Tomatoes", kind: "fresh", qty: "6 pcs", shelf: "Crisper drawer", daysLeft: 5, seenDaysAgo: 1, condition: "firm and bright red", confidence: "high" },
    { name: "Eggs", kind: "fresh", qty: "10 pcs", shelf: "Middle shelf", daysLeft: 12, seenDaysAgo: 5, condition: "carton closed", confidence: "medium" },
    { name: "Cheddar", kind: "packaged", qty: "250 g", shelf: "Middle shelf", printedIn: 18, daysLeft: 18, seenDaysAgo: 8, condition: "sealed block", confidence: "high" }
  ],
  [
    { name: "Leftover vegetable soup", kind: "cooked", qty: "1 box · 2 portions", shelf: "Top shelf", daysLeft: 2, seenDaysAgo: 1, container: "clear glass soup box with cream lid", condition: "carrot and potato pieces visible in broth", confidence: "high", note: "Homemade leftovers. Check when the soup was cooked and adjust the date." },
    { name: "Rice-stuffed peppers", kind: "cooked", qty: "6 peppers", shelf: "Middle shelf", daysLeft: 1, seenDaysAgo: 2, container: "vanilla ice cream tub with pink lid", condition: "cooked peppers and rice visible inside the open tub", confidence: "low", note: "Reused ice cream tub: these are rice-stuffed peppers, not ice cream. Confirm the contents and when they were cooked; the tub's printed date does not apply." },
    { name: "Chicken breast", kind: "packaged", qty: "500 g", shelf: "Bottom shelf", daysLeft: -1, condition: "grey patches on the meat", confidence: "high" },
    { name: "Baby spinach", kind: "fresh", qty: "150 g", shelf: "Crisper drawer", daysLeft: 1, condition: "more leaves turning dark", confidence: "high" },
    { name: "Milk 3.6%", kind: "packaged", qty: "0.5 L", shelf: "Door rack", daysLeft: 2, condition: "opened carton", confidence: "medium" },
    { name: "Greek yogurt", kind: "packaged", qty: "1 cup", shelf: "Middle shelf", daysLeft: 4, condition: "sealed, looks fine", confidence: "high" },
    { name: "Cookies", kind: "other", qty: "1 tub", shelf: "Top shelf", daysLeft: 20, container: "vanilla ice cream tub", condition: "cookies visible through the lid gap", confidence: "low", note: "An ice cream tub outside the freezer, holding cookies" },
    { name: "Unknown container", kind: "cooked", qty: "1 box", shelf: "Middle shelf", daysLeft: 3, container: "blue opaque box, white lid", condition: "can't see inside", confidence: "low", note: "Contents unknown. Type what's inside, and the app will remember this box." },
    { name: "Tomatoes", kind: "fresh", qty: "5 pcs", shelf: "Crisper drawer", daysLeft: 5, condition: "firm and bright red", confidence: "high" },
    { name: "Eggs", kind: "fresh", qty: "8 pcs", shelf: "Middle shelf", daysLeft: 12, condition: "carton closed", confidence: "medium" },
    { name: "Cheddar", kind: "packaged", qty: "200 g", shelf: "Middle shelf", daysLeft: 18, condition: "opened, edges dry", confidence: "high" }
  ]
];
