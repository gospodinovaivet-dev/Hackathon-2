// Everything the AI reads from photos. One photo can show the inside of the fridge, food anywhere
// else, a shop bill or a package close-up; the AI works out which. Plus "Scan date" for one item.
// Uses Claude when the page runs inside Claude. Elsewhere only the example data works;
// the real product would send photos to a backend that calls the Claude API.
const RULER = 36;      // px of white margin holding the rulers
const MAX_SIDE = 1024; // the photo is scaled to this before it is sent

const Scanner = {
  sample: null,
  canReadPhotos: false,
  ready: null,

  init() {
    this.ready = (async () => {
      try { this.sample = await window.claude?.use?.("sample"); } catch { this.sample = null; }
      const limits = this.sample ? await this.sample.limits().catch(() => null) : null;
      this.canReadPhotos = !!limits?.images;
    })();
    return this.ready;
  },

  async ask(prompt, file) {
    await this.ready;
    if (!this.canReadPhotos) throw { code: "no_ai" };
    return this.sample.json(prompt, { images: [file], cache: false });
  },

  // Any photo, always treated as taken today.
  // `known` = saved items with their container, so the AI can recognise a reused box it has seen before.
  async readPhoto(file, known = []) {
    const { blob, w, h } = await withRulers(file);
    const knownList = known.filter(i => i.container).slice(0, 40)
      .map(i => ({ id: i.id, container: i.container, contents: i.name }));
    const shelves = SHELVES.map(s => `"${s}"`).join(", ");

    const res = await this.ask(`This photo was taken today, ${Dates.today()}. The photo is ${w} × ${h} pixels. It sits inside a white margin with rulers: the ruler along the top gives x in pixels and the ruler down the left gives y in pixels, both counted from the photo's own top-left corner.

First decide what the photo shows and set "type":
- "fridge": the inside of a fridge (from the camera inside it, or from a phone with the door open)
- "food": one or more foods that are not in a fridge, e.g. on a table or counter, in a bag, or a close-up of a package
- "bill": a shop receipt
- "other": no food at all (a room, a person, a screen, an empty shelf)
If "other", return an empty items list. If the photo is too dark, blurry or foggy to read, set "unclear" to true and return an empty list.
${knownList.length ? `
Containers the user has already told us about (id, what the container looks like, what is inside):
${JSON.stringify(knownList)}
If you see one of these containers, set "knownId" to its id and use its contents as the name, even if the packaging says something else.
` : ""}
For "fridge" and "food", list every food item you can see. For each item give:
- name: short and plain. Name what is actually inside, not only what the packaging says. If a container's label doesn't match what you can see inside (e.g. rice-stuffed peppers or soup in an ice cream tub), name the contents and explain in "note". Packaging that doesn't belong in a fridge (an ice cream tub outside the freezer, a biscuit tin) is often reused for something else: if you can't see the contents, say so in "note" and use confidence "low".
- container: a short description of the packaging as it looks, e.g. "vanilla ice cream tub", "blue opaque box, white lid". Use "" for loose food.
- knownId: the id from the list above if this is one of those containers, otherwise "".
- kind: "packaged" (shop packaging), "cooked" (home-cooked food or leftovers), "fresh" (fruit, vegetables, eggs, loose items) or "other".
- category: one of "fruit", "veg" (vegetables, salad, herbs), "protein" (meat, fish, eggs, tofu), "dairy" (cheese, yogurt, butter, cream), "drink" (milk, juice, any liquid), "nuts", "snack" (chips, sweets, chocolate, crackers, biscuits, cake), "cooked" (cooked meals, leftovers), or "unknown" if you can't tell.
- qty: a short amount if you can tell, e.g. "1 L", "6 pcs", "half a pack", otherwise "".
- shelf: for "fridge", the shelf it is on; for "food", the shelf where it should be stored, or "" if it doesn't belong in a fridge (bread, bananas). One of ${shelves}.
- dateText: the use-by, best-before or expiry date EXACTLY as printed, character by character, e.g. "28.10.26" or "BB 03 NOV". Write a "?" for every character you can't read with certainty. Use "" if no date is visible.
- printedDate: that date as YYYY-MM-DD, but ONLY if every digit in dateText is certain (no "?"). Dates are usually written day first (28.10.26 = 2026-10-28). If anything is blurry, cut off, too small, covered, or you can't tell day from month, use "". Never complete, round or guess a date: a wrong date is worse than no date, and the app will show "Date unrecognised" instead.
- daysLeft: how many days until it should be eaten, if stored the right way from now. Judge by how it looks and its typical life. Look closely for mould, dark or grey patches, slime, wilted or brown leaves, wrinkled skin, separated liquid or bloated packaging. Negative if it already looks spoiled (-1 slightly off, -5 clearly mouldy).
- condition: a few words on what you see that tells you how fresh it is.
- confidence: "high", "medium" or "low": how sure you are what it is and how fresh it is. "low" for opaque containers you can't see into, food mostly hidden, or labels that don't match the contents.
- note: anything the user should check, otherwise "".
- box: [x1, y1, x2, y2] in pixels read off the rulers: the left, top, right and bottom edges of this one item. Make it tight around the whole item, edge to edge, without the shelf or neighbouring items.
Transparent packaging: judge the food you see through it.
Reused packaging is common in Balkan households: rice-stuffed peppers (papricas), soup and other leftovers may be in an ice cream tub. Visible cooked contents mean kind "cooked" even when the tub says ice cream. Ignore the original tub's printed date: return empty dateText and printedDate, and ask the user to confirm when the food was cooked. If the tub is closed and unfamiliar, never guess peppers or ice cream: use "Unknown container", confidence "low", and ask what is inside.

For "bill": set "billDateText" to the purchase date exactly as printed ("?" for unreadable characters, "" if none) and "purchaseDate" as YYYY-MM-DD only if it is fully readable, otherwise "". Set "store", and list the food items that are kept in a fridge (skip non-food and shelf-stable items) with name, qty, kind, category, shelf, and shelfLifeDays (typical fridge life from the purchase date, unopened). No boxes.

For "fridge" only: set "doorOpen" to true if the photo was clearly taken with the fridge door open (you can see the door edge, the room outside, or a hand).

Reply with only JSON:
{"type": "fridge", "unclear": false, "doorOpen": false, "store": "", "billDateText": "", "purchaseDate": "", "items": [{"name": "", "container": "", "knownId": "", "kind": "packaged", "category": "dairy", "qty": "", "shelf": "Middle shelf", "dateText": "", "printedDate": "", "daysLeft": 5, "shelfLifeDays": 0, "condition": "", "confidence": "high", "note": "", "box": [120, 340, 260, 470]}]}`, blob);

    const type = ["fridge", "food", "bill", "other"].includes(res?.type) ? res.type : "fridge";
    if (type === "other") return { type, items: [] };
    if (res?.unclear) return { type, unclear: true, items: [] };

    // Bill date: only trusted if it was fully read and matches what is printed. Otherwise today is
    // used, and the review screen says so.
    let purchaseDate = "", billDateRead = false;
    if (type === "bill") {
      const read = String(res?.purchaseDate || "");
      billDateRead = dateMatchesText(read, res?.billDateText) && Dates.daysUntil(read) <= 0;
      purchaseDate = billDateRead ? read : Dates.today();
    }
    const items = (Array.isArray(res?.items) ? res.items.slice(0, 40) : []).map(i => {
      const item = cleanScanItem(i, w, h);
      if (type === "bill") {
        item.box = null;
        item.purchaseDate = purchaseDate;
        item.shelfLifeDays = Math.min(365, Math.max(1, Math.round(Number(i?.shelfLifeDays)) || 5));
      }
      return item;
    });
    return {
      type, items, purchaseDate, billDateRead,
      billDateText: String(res?.billDateText || "").slice(0, 30),
      photo: file,
      doorOpen: type === "fridge" && !!res?.doorOpen,
      store: String(res?.store || "").slice(0, 40)
    };
  },

  // Second pass for the squares: in the whole photo each product is small, so the first boxes are
  // rough. Cut a zoomed-in piece around each item (with its own rulers), ask for a tight box inside
  // it, and map that back onto the photo. Updates row.box in place; onUpdate runs after each batch.
  async refineBoxes(file, rows, onUpdate) {
    await this.ready;
    const limits = this.sample ? await this.sample.limits().catch(() => null) : null;
    if (!limits?.images) return false;
    const bmp = await loadBitmap(file);
    const perCall = Math.max(1, Math.min(limits.images.maxCount || 1, 6));
    const targets = rows.filter(r => r.box);

    for (let k = 0; k < targets.length; k += perCall) {
      const batch = targets.slice(k, k + perCall);
      const crops = await Promise.all(batch.map(r => cropAround(bmp, r.box)));
      const list = batch.map((r, i) => `${i + 1}. "${r.name}"${r.container ? ` (${r.container})` : ""}`).join("\n");
      const res = await this.sample.json(`You get ${batch.length} image${batch.length === 1 ? "" : "s"}, in order. Each is a zoomed-in piece of a photo of food, inside a white margin with pixel rulers on the top and left edges, counted from that piece's own top-left corner.
Each piece should contain one item:
${list}
For each image, give the box around that one item as [x1, y1, x2, y2] read off that image's rulers: its left, top, right and bottom edges. Make it tight around the whole item, edge to edge, without the shelf, neighbouring items or the white margin. If the item isn't in that piece, use null.
Reply with only JSON with exactly ${batch.length} entries: {"boxes": [[x1, y1, x2, y2]]}`, { images: crops.map(c => c.blob), cache: false });

      const boxes = Array.isArray(res?.boxes) ? res.boxes : [];
      batch.forEach((r, i) => {
        const b = boxes[i], c = crops[i];
        if (!Array.isArray(b) || b.length !== 4) return;
        const [x1, y1, x2, y2] = b.map(Number);
        if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) return;
        // piece pixels → photo pixels → 0–1000
        const toX = v => (c.sx + Math.min(c.w, Math.max(0, v)) / c.scale) / bmp.width * 1000;
        const toY = v => (c.sy + Math.min(c.h, Math.max(0, v)) / c.scale) / bmp.height * 1000;
        const box = [toX(x1), toY(y1), toX(x2), toY(y2)];
        if (box[2] - box[0] > 2 && box[3] - box[1] > 2) r.box = box;
      });
      onUpdate?.();
    }
    return true;
  },

  // A close-up of one package, taken with the phone: read its printed date
  async readLabel(file, itemName) {
    const res = await this.ask(`This is a close-up photo of a food package, taken today (${Dates.today()}). The user says the food is: "${itemName}".
Find the use-by, best-before or expiry date printed on it.
- dateText: the date EXACTLY as printed, character by character, e.g. "28.10.26" or "BB 03 NOV". Write a "?" for every character you can't read with certainty. "" if there is no date.
- date: that date as YYYY-MM-DD, ONLY if every character is certain. Numbers are usually day first (28.10.26 = 2026-10-28). If only month and year are printed, use the last day of that month. If anything is blurry, cut off, covered, or you can't tell day from month, set "found" to false and "date" to "". Never complete or guess a date: a wrong date is worse than none.
Also read the product name and the barcode number if they are visible.
Reply with only JSON: {"found": true, "dateText": "", "date": "YYYY-MM-DD", "dateType": "use by", "product": "", "barcode": ""}
dateType is one of "use by", "best before", "expiry", "other".`, file);
    const date = String(res?.date || "");
    const dateText = String(res?.dateText || "").slice(0, 30);
    return {
      found: !!res?.found && dateMatchesText(date, dateText),
      date,
      dateText,
      dateType: String(res?.dateType || "").slice(0, 20),
      product: String(res?.product || "").slice(0, 60),
      barcode: String(res?.barcode || "").replace(/[^0-9]/g, "").slice(0, 20)
    };
  },

  // Example items with printedIn get a printed date that many days from today, as if read off the pack
  example(n) {
    const items = EXAMPLE_SCANS[n % EXAMPLE_SCANS.length].map(i => {
      if (i.printedIn == null) return { ...i };
      const iso = Dates.addDays(Dates.today(), i.printedIn);
      const [y, m, d] = iso.split("-");
      return { ...i, printedDate: iso, dateText: `${d}.${m}.${y.slice(2)}` };
    });
    return { type: "fridge", doorOpen: false, items };
  },

  errorText(code) {
    return {
      no_ai: "The AI can only read photos when the app is open on the shared claude.ai link. Here, use Check inside → Example data.",
      not_granted: "The app wasn't allowed to send the photo to the AI. Allow it and try again.",
      sampling_disabled: "AI isn't available on this account.",
      images_unavailable: "This view can't send photos to the AI.",
      image_rejected: "This photo couldn't be read. Try a sharper photo.",
      photo_load: "That photo couldn't be loaded. Run node build.js again and reload.",
      rate_limited: "Too many requests in a short time. Wait a minute and try again.",
      invalid_json: "The AI answer came back in the wrong format. Try again."
    }[code] || "Couldn't reach the AI. Check your connection and try again.";
  }
};

async function loadBitmap(file) {
  try { return await createImageBitmap(file); } catch { throw { code: "image_rejected" }; }
}

const toJpeg = async cv => {
  const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.9));
  if (!blob) throw { code: "image_rejected" };
  return blob;
};

// The whole photo, scaled to at most MAX_SIDE px, with rulers
async function withRulers(file) {
  const bmp = await loadBitmap(file);
  const { cv, w, h } = rulerCanvas(bmp, 0, 0, bmp.width, bmp.height, MAX_SIDE);
  return { blob: await toJpeg(cv), w, h };
}

// A zoomed-in piece around one item (box on the 0–1000 scale), with generous room around it
// in case the first box was off
async function cropAround(bmp, box) {
  const W = bmp.width, H = bmp.height;
  const [x1, y1, x2, y2] = [box[0] / 1000 * W, box[1] / 1000 * H, box[2] / 1000 * W, box[3] / 1000 * H];
  const pad = Math.max(x2 - x1, y2 - y1) * 0.6 + Math.max(W, H) * 0.04;
  const sx = Math.max(0, x1 - pad), sy = Math.max(0, y1 - pad);
  const ex = Math.min(W, x2 + pad), ey = Math.min(H, y2 + pad);
  const { cv, w, h, scale } = rulerCanvas(bmp, sx, sy, ex - sx, ey - sy, 448);
  return { blob: await toJpeg(cv), w, h, scale, sx, sy };
}

// Draw part of an image (sx, sy, sw, sh) scaled to at most maxSide px, inside a white margin with
// pixel rulers on the top and left edges, so the AI can read off where things are instead of guessing
function rulerCanvas(source, sx, sy, sw, sh, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.round(sw * scale), h = Math.round(sh * scale);
  const cv = document.createElement("canvas");
  cv.width = w + RULER;
  cv.height = h + RULER;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.drawImage(source, sx, sy, sw, sh, RULER, RULER, w, h);

  ctx.fillStyle = "#000000";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1;
  ctx.font = "11px sans-serif";
  for (let x = 0; x <= w; x += 25) {
    const major = x % 100 === 0;
    ctx.beginPath(); ctx.moveTo(RULER + x + 0.5, RULER - (major ? 14 : 6)); ctx.lineTo(RULER + x + 0.5, RULER); ctx.stroke();
    if (major) ctx.fillText(String(x), RULER + x + 2, 11);
  }
  for (let y = 0; y <= h; y += 25) {
    const major = y % 100 === 0;
    ctx.beginPath(); ctx.moveTo(RULER - (major ? 14 : 6), RULER + y + 0.5); ctx.lineTo(RULER, RULER + y + 0.5); ctx.stroke();
    if (major) ctx.fillText(String(y), 1, RULER + y + 12);
  }
  return { cv, w, h, scale };
}

// Guard against made-up dates: the date must be built from what the AI copied off the pack.
// Any "?" means part of it couldn't be read, so no date. Numbers must be in the printed order:
// day.month.year (28.10.26), year-month-day (2026-10-28), month/year (10/2026 = last day of the
// month) or day + month name (03 NOV).
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function dateMatchesText(iso, text) {
  text = String(text || "").toLowerCase();
  if (!Dates.valid(iso) || !text || text.includes("?")) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const n = (text.match(/\d+/g) || []).map(Number);
  const yearIs = v => v === y || v === y % 100;
  const monthWord = MONTH_NAMES.findIndex(name => text.includes(name)) + 1;
  const lastDay = new Date(y, m, 0).getDate();

  if (monthWord) {                                   // "03 NOV", "BB 03 NOV 26"
    return monthWord === m && n[0] === d && (n.length < 2 || yearIs(n[1]));
  }
  if (n.length >= 3) {
    return n[0] >= 1000
      ? n[0] === y && n[1] === m && n[2] === d       // 2026-10-28
      : n[0] === d && n[1] === m && yearIs(n[2]);    // 28.10.26, 28/10/2026
  }
  if (n.length === 2) {
    return n[1] > 31 || n[1] >= 1000
      ? n[0] === m && yearIs(n[1]) && d === lastDay  // 10/2026, 10/26
      : n[0] === d && n[1] === m;                    // 28.10 (year not printed)
  }
  return false;
}

// Box in photo pixels (of a w × h photo) → [x1, y1, x2, y2] on a 0–1000 scale, or null
function cleanBox(b, w, h) {
  if (!Array.isArray(b) || b.length !== 4 || !w || !h) return null;
  const n = b.map(Number);
  if (!n.every(Number.isFinite)) return null;
  const [x1, x2] = [n[0], n[2]].map(v => Math.min(1000, Math.max(0, v / w * 1000)));
  const [y1, y2] = [n[1], n[3]].map(v => Math.min(1000, Math.max(0, v / h * 1000)));
  return x2 > x1 && y2 > y1 ? [x1, y1, x2, y2] : null;
}

function cleanScanItem(i, w, h) {
  const days = Math.round(Number(i?.daysLeft));
  const pick = (v, list, fallback) => list.includes(v) ? v : fallback;
  return {
    name: String(i?.name || "").trim().slice(0, 40) || "Unknown item",
    container: String(i?.container || "").trim().slice(0, 60),
    knownId: String(i?.knownId || "").slice(0, 20),
    kind: pick(i?.kind, ["packaged", "cooked", "fresh", "other"], "other"),
    category: pick(i?.category, CATEGORY_IDS, "unknown"),
    qty: String(i?.qty || "").trim().slice(0, 20),
    shelf: pick(i?.shelf, SHELVES, ""),
    dateText: String(i?.dateText || "").trim().slice(0, 30),
    printedDate: dateMatchesText(i?.printedDate, i?.dateText) ? i.printedDate : "",
    daysLeft: Number.isFinite(days) ? Math.min(365, Math.max(-30, days)) : 5,
    condition: String(i?.condition || "").trim().slice(0, 80),
    confidence: pick(i?.confidence, ["high", "medium", "low"], "medium"),
    note: String(i?.note || "").trim().slice(0, 100),
    box: cleanBox(i?.box, w, h),
    seenDaysAgo: 0
  };
}
