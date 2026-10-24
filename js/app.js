// ChillCheck MVP: pair a fridge, scan, check dates, Eat Me First list, recipes, sensor alerts.
const state = Store.get();
const APP_LINK = "https://claude.ai/artifact/YAGAy8EvHWCznEqzx6mWfz"; // opened on the phone to use its camera

let draft = null;          // the latest scan, waiting for the user to check it
let exampleCount = 0;      // which example data set to use next
let editingId = null;      // item whose date is being changed on Eat Me First
let labelTargetId = null;  // item whose package label is being photographed

/* ---------- Navigation ---------- */
const SCREENS = ["setup", "home", "review", "eat", "recipes", "health"];
const render = { recipes: () => Recipes.render(), health: () => Health.render() };
function go(name) {
  SCREENS.forEach(s => { $("screen-" + s).hidden = s !== name; });
  $("header-back").hidden = name === "home" || name === "setup";
  render[name]?.();
  window.scrollTo(0, 0);
}
$("header-back").addEventListener("click", () => go("home"));

/* ---------- Setup ---------- */
const CODE_RE = /^CC-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

$("device-code").addEventListener("input", e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
});
$("demo-fill").addEventListener("click", () => {
  $("user-name").value = "Katerina";
  $("user-email").value = "katerina@example.com";
  $("device-code").value = "CC-A7F3-2291";
});
$("setup-form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("user-name").value.trim();
  const email = $("user-email").value.trim();
  const code = $("device-code").value.trim();
  const error =
    !name ? "Enter your name." :
    !/^\S+@\S+\.\S+$/.test(email) ? "Enter a valid email address." :
    !CODE_RE.test(code) ? "The device code looks like CC-A7F3-2291. It's on the sticker inside the fridge door." : "";
  $("setup-error").textContent = error;
  $("setup-error").hidden = !error;
  if (error) return;
  state.user = { name, email };
  state.device = { code, pairedAt: new Date().toISOString() };
  Store.save();
  toast("Fridge paired");
  go("home");
});

/* ---------- Home ---------- */
render.home = () => {
  $("hello").textContent = `Hi ${state.user.name}`;
  $("device-label").textContent = state.device.code;
  $("last-scan").textContent = state.lastScan ? `Last photo: ${Dates.stamp(state.lastScan)}` : "No photos yet";

  const c = Food.counts(state.items);
  $("eat-sub").textContent =
    !state.items.length ? "Your list fills in after the first scan." :
    c.expired ? `${plural(c.expired, "item")} expired. Throw ${c.expired === 1 ? "it" : "them"} away.` :
    c.soon ? `${plural(c.soon, "item")} to eat in the next ${EAT_SOON_DAYS} days.` :
    c.unknown ? `${plural(c.unknown, "item")} with a date we couldn't read.` :
    "Everything is fresh.";
  $("eat-counts").replaceChildren(...(state.items.length ? STATUS_ORDER.filter(s => s !== "unknown" || c.unknown).map(s =>
    el("span", { class: "count " + s }, el("span", { class: "dot" }), STATUS[s].label, " ", el("span", { class: "n" }, String(c[s])))
  ) : []));
  setSteps("fridge", -1);
};

$("open-eat").addEventListener("click", () => go("eat"));
$("open-recipes").addEventListener("click", () => go("recipes"));
$("open-health").addEventListener("click", () => go("health"));
$("add-by-hand").addEventListener("click", () => { go("eat"); $("add-name").focus(); });

let unpairArmed = false;
$("unpair").addEventListener("click", () => {
  if (!unpairArmed) {
    unpairArmed = true;
    $("unpair").textContent = "Tap again to unpair and clear the list";
    setTimeout(() => { unpairArmed = false; $("unpair").textContent = "Unpair fridge"; }, 4000);
    return;
  }
  unpairArmed = false;
  $("unpair").textContent = "Unpair fridge";
  Store.reset();
  exampleCount = 0;
  go("setup");
});

/* ---------- Scanning ---------- */
// Only the fridge camera is triggered by the door closing. A phone photo says nothing about the door.
const SCAN_STEPS = {
  fridge: ["Door closed", "Light on", "Photo taken", "Finding food"],
  phone: ["Photo from your phone", "Finding food"]
};

function setSteps(kind, active) {
  $("scan-steps").replaceChildren(...SCAN_STEPS[kind].map((label, k) => el("li", {
    class: "step", "data-state": active < 0 ? "idle" : k < active ? "done" : k === active ? "active" : "idle"
  }, label)));
}

function setScanning(on) {
  ["check-inside", "scan-photo"].forEach(id => { $(id).disabled = on; });
  document.querySelectorAll(".photo-pick").forEach(b => { b.disabled = on; });
}

async function runScan(kind, getResult, photoUrl = null) {
  setScanning(true);
  $("scan-status").textContent = "";
  const last = SCAN_STEPS[kind].length - 1;
  try {
    for (let k = 0; k < last; k++) { setSteps(kind, k); await wait(550); }
    setSteps(kind, last);
    const res = await getResult();
    if (res.type === "other" || res.unclear) {
      setSteps(kind, -1);
      showWarning(kind, res.unclear ? "unclear" : "notFood");
      return;
    }
    if (!res.items.length) {
      setSteps(kind, -1);
      showWarning(kind, res.type === "bill" ? "emptyBill" : "notFood");
      return;
    }
    setSteps(kind, last + 1);
    draft = {
      kind, photoUrl,
      type: res.type,
      takenAt: new Date().toISOString(),
      doorOpen: !!res.doorOpen,
      store: res.store || "",
      purchaseDate: res.purchaseDate || "",
      billDateRead: !!res.billDateRead,
      billDateText: res.billDateText || "",
      // Only a photo of the whole fridge can tell that something is no longer there
      ...Food.merge(state.items, res.items, { trackMissing: res.type === "fridge" })
    };
    await wait(300);
    go("review");
    if (res.photo && draft.rows.some(r => r.box)) tightenSquares(draft, res.photo);
  } catch (e) {
    setSteps(kind, -1);
    $("scan-status").textContent = Scanner.errorText(e?.code);
  } finally {
    setScanning(false);
  }
}

// Small warning in the middle of the screen when a photo can't be checked
const WARNINGS = {
  notFood: ["There's no food in this photo", "We can check the inside of your fridge, food anywhere else, or a shop bill. This photo shows none of them, so we can't check it."],
  emptyBill: ["No fridge food on this bill", "Make sure the whole bill is in the photo. Things like rice, tins or cleaning products aren't added."],
  unclear: ["We can't see the food clearly", "The photo is too dark, blurry or foggy. Turn on the light and try again."]
};
let retryKind = null;
function showWarning(kind, reason) {
  retryKind = kind;
  $("warn-title").textContent = WARNINGS[reason][0];
  $("warn-text").textContent = WARNINGS[reason][1];
  $("warn-modal").hidden = false;
  $("warn-retry").focus();
}
function closeWarning() {
  $("warn-modal").hidden = true;
}
$("warn-close").addEventListener("click", closeWarning);
$("warn-modal").addEventListener("click", e => { if (e.target === $("warn-modal")) closeWarning(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("warn-modal").hidden) closeWarning(); });
$("warn-retry").addEventListener("click", () => {
  closeWarning();
  if (retryKind === "phone") $("photo-input").click();
  else $("inside-picker").hidden = false;
});

async function photoBlob(src) {
  if (src.startsWith("data:")) {
    const [head, b64] = src.split(",");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: head.slice(5, head.indexOf(";")) });
  }
  const res = await fetch(src);
  if (!res.ok) throw { code: "photo_load" };
  return res.blob();
}

// "Check inside": the photos/ folder stands in for the fridge camera until the hardware exists
const runExample = () => runScan("fridge", async () => Scanner.example(exampleCount++));
const runCameraPhoto = photo => runScan("fridge", async () => {
  await Scanner.ready;
  if (!Scanner.canReadPhotos) throw { code: "no_ai" };
  return Scanner.readPhoto(await photoBlob(photo.src), state.items);
}, photo.src);

$("photo-grid").replaceChildren(
  ...CAMERA_PHOTOS.map(photo => el("button", {
    class: "photo-pick", type: "button",
    onclick: () => { $("inside-picker").hidden = true; runCameraPhoto(photo); }
  }, el("img", { src: photo.src, alt: "" }), el("span", {}, photo.name))),
  el("button", {
    class: "photo-pick", type: "button",
    onclick: () => { $("inside-picker").hidden = true; runExample(); }
  }, el("span", { class: "no-photo" }, "No photo"), el("span", {}, "Example data"))
);
$("check-inside").addEventListener("click", () => {
  if (!CAMERA_PHOTOS.length) return runExample();
  $("inside-picker").hidden = !$("inside-picker").hidden;
});

// Phone camera: one button for everything. The AI decides if it's the fridge, food elsewhere or a shop bill.
// On a phone the input opens the camera directly; on a computer it opens a file picker.
const pickFile = (input, onFile) => input.addEventListener("change", e => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (file) onFile(file);
});
$("scan-photo").addEventListener("click", () => $("photo-input").click());
pickFile($("photo-input"), file => runScan("phone", () => Scanner.readPhoto(file, state.items), URL.createObjectURL(file)));

// "Use my phone's camera" (on a computer): a QR code opens this app on the phone.
// Same Claude account on both, so whatever the phone scans shows up here live.
let qrDrawn = false;
$("phone-cam").addEventListener("click", () => {
  const panel = $("phone-panel");
  panel.hidden = !panel.hidden;
  if (panel.hidden || qrDrawn) return;
  qrDrawn = true;
  $("phone-link").textContent = APP_LINK;
  if (window.QRCode) {
    new QRCode($("phone-qr"), { text: APP_LINK, width: 180, height: 180, colorDark: "#11222C", colorLight: "#FFFFFF" });
  } else {
    $("phone-qr").replaceChildren(el("p", { class: "note" }, "The QR code needs an internet connection. Open the link below on your phone instead."));
  }
});

/* ---------- Review the scan ---------- */
const KIND_LABEL = { packaged: "Packaged", cooked: "Cooked", fresh: "Fresh", other: "Other" };

render.review = () => {
  if (!draft) return go("home");
  const n = draft.rows.length;
  const fresh = draft.rows.filter(r => r.isNew).length;
  const redated = draft.rows.filter(r => r.dateChanged).length;
  const toCheck = draft.rows.filter(r => r.confidence === "low").length;
  const taken = `Photo taken today at ${Dates.stamp(draft.takenAt)}`;
  const counts = `${fresh} new, ${n - fresh} already in your list` + (redated ? `, ${redated} with a new date` : "") + "." +
    (toCheck ? ` ${plural(toCheck, "item")} marked “Check this”.` : "");
  const unread = draft.rows.filter(r => r.dateSource === "unknown").length;
  $("review-lead").textContent =
    draft.type === "bill"
      ? `Shop bill${draft.store ? ` from ${draft.store}` : ""}: ${plural(n, "fridge item")}. ` +
        (draft.billDateRead
          ? `Bought ${Dates.format(draft.purchaseDate)}. Each date is the purchase date plus the item's usual shelf life.`
          : `The date on the bill couldn't be read${draft.billDateText ? ` (“${draft.billDateText}”)` : ""}, so today is used as the purchase date. Change the dates if you bought it earlier.`)
      : draft.type === "food"
        ? `${taken}: ${plural(n, "food")} outside the fridge, ${counts} Dates assume you store them the right way from now.`
        : `${taken}: ${plural(n, "item")} in your fridge, ${counts}`;
  if (unread && draft.type !== "bill") {
    $("review-lead").textContent += ` ${plural(unread, "package")} with a date we couldn't read: set ${unread === 1 ? "it" : "them"} or use “Scan date” later.`;
  }

  $("review-door").hidden = !draft.doorOpen;
  const photo = $("review-photo");
  $("review-photo-wrap").hidden = !draft.photoUrl;
  if (draft.photoUrl && photo.getAttribute("src") !== draft.photoUrl) {
    photo.onload = renderOverlay;
    photo.src = draft.photoUrl;
  }
  renderOverlay();

  $("review-list").replaceChildren(...Food.byUrgency(draft.rows).map(reviewRow));

  const missing = $("review-missing");
  missing.replaceChildren();
  if (draft.missing.length) {
    missing.append(el("div", { class: "missing" },
      el("h2", {}, "Not in this photo"),
      el("p", { class: "note" }, "These were in your fridge before. They may be hidden behind something, or already gone."),
      draft.missing.map(m => el("label", { class: "check", for: "keep-" + m.item.id },
        el("span", {}, m.item.name, " ", el("small", {}, `· ${Food.daysText(m.item)}`)),
        el("span", { class: "rmeta" }, "Still in the fridge",
          el("input", { type: "checkbox", id: "keep-" + m.item.id, checked: m.keep, onchange: e => { m.keep = e.target.checked; } }))
      ))
    ));
  }
};

// Squares on the photo around each food, in its status colour. No names, to keep the photo calm:
// by default only food that needs attention is marked, and the item under the pointer in the list
// is highlighted while the rest fade.
const BOX_COLORS = { safe: "#B5CC8E", soon: "#F5D76E", expired: "#F0708C", unknown: "#A877FF" };
let boxFilter = "attention";   // "attention" or "all"
let highlightId = null;

// Runs while the user already sees the list: zoom in on each item and tighten its square
async function tightenSquares(d, photo) {
  const note = $("legend-note");
  note.textContent = "Tightening the squares…";
  try {
    await Scanner.refineBoxes(photo, d.rows, () => { if (draft === d) renderOverlay(); });
  } catch { /* keep the first squares */ }
  if (draft === d) note.textContent = "";
}
function svgEl(tag, attrs, text) {
  const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text) n.textContent = text;
  return n;
}
function renderOverlay() {
  const svg = $("review-overlay");
  const img = $("review-photo");
  const all = draft?.photoUrl ? draft.rows.filter(r => r.box) : [];
  const attention = all.filter(r => Food.status(r) !== "safe");
  $("review-legend").hidden = !all.length;
  $("boxes-attention").textContent = `Needs attention (${attention.length})`;
  $("boxes-all").textContent = `All food (${all.length})`;
  $("boxes-attention").setAttribute("aria-selected", boxFilter === "attention");
  $("boxes-all").setAttribute("aria-selected", boxFilter === "all");
  if (!all.length || !img.naturalWidth) { svg.replaceChildren(); return; }

  const shown = all.filter(r => boxFilter === "all" || Food.status(r) !== "safe" || r.id === highlightId);
  const W = img.naturalWidth, H = img.naturalHeight;
  const unit = Math.max(W, H) / 500;   // keeps lines the same thickness on any photo
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.replaceChildren(...shown
    .map(r => {
      const [x1, y1, x2, y2] = r.box;
      return { r, x: x1 / 1000 * W, y: y1 / 1000 * H, w: (x2 - x1) / 1000 * W, h: (y2 - y1) / 1000 * H };
    })
    .sort((a, b) => (a.r.id === highlightId) - (b.r.id === highlightId) || b.w * b.h - a.w * a.h)  // highlighted on top
    .map(s => {
      const color = BOX_COLORS[Food.status(s.r)];
      const lit = s.r.id === highlightId;
      const faded = highlightId && !lit;
      return svgEl("rect", {
        x: s.x, y: s.y, width: s.w, height: s.h, rx: 3 * unit,
        fill: lit ? color : "none", "fill-opacity": lit ? 0.18 : 0,
        stroke: color, "stroke-width": (lit ? 3.5 : 2) * unit, "stroke-opacity": faded ? 0.25 : 1
      });
    }));
}

$("boxes-attention").addEventListener("click", () => { boxFilter = "attention"; renderOverlay(); });
$("boxes-all").addEventListener("click", () => { boxFilter = "all"; renderOverlay(); });
function highlight(id) {
  if (highlightId === id) return;
  highlightId = id;
  renderOverlay();
}

function reviewRow(row) {
  const pill = el("span", { class: "pill" });
  const source = el("span", { class: "source" });
  const paint = () => {
    pill.className = "pill " + Food.status(row);
    pill.textContent = Food.daysText(row);
    source.textContent = Food.sourceText(row);
    renderOverlay();
  };
  paint();
  return el("div", {
    class: "rrow" + (row.confidence === "low" ? " uncertain" : ""),
    onmouseenter: () => highlight(row.id), onmouseleave: () => highlight(null),
    onfocusin: () => highlight(row.id), onfocusout: () => highlight(null)
  },
    el("div", { class: "rname" },
      el("input", {
        class: "field", id: "name-" + row.id, value: row.name, maxlength: 40, "aria-label": "Food name", placeholder: "Food name",
        oninput: e => { row.name = e.target.value; renderOverlay(); }
      }),
      el("span", { class: "rmeta" },
        el("span", { class: "tag" + (row.isNew ? " new" : "") }, row.isNew ? "New" : "Seen before"),
        row.kind && el("span", { class: "tag" }, KIND_LABEL[row.kind] || "Other"),
        row.confidence === "low" && el("span", { class: "tag check-tag" }, "Check this"),
        [row.shelf, row.qty].filter(Boolean).join(" · ")),
      row.container && el("span", { class: "source" }, `Container: ${row.container}`),
      row.condition && el("span", { class: "condition" }, `AI saw: ${row.condition}`),
      row.note && el("span", { class: "warn-note" }, row.note),
      row.confidence === "low" && el("span", { class: "source" }, "Fix the name if it's wrong. The app remembers this container on the next scan."),
      source
    ),
    el("input", {
      class: "field mono", type: "date", id: "date-" + row.id, value: row.expires || "", "aria-label": `Expiry date for ${row.name || "item"}`,
      oninput: e => { if (Dates.valid(e.target.value)) { row.expires = e.target.value; row.dateSource = "manual"; row.dateText = ""; paint(); } }
    }),
    pill,
    el("button", {
      class: "icon-btn", type: "button", "aria-label": `Remove ${row.name || "item"}`,
      onclick: () => { draft.rows = draft.rows.filter(r => r !== row); render.review(); }
    }, "×")
  );
}

$("review-add").addEventListener("click", () => {
  const today = Dates.today();
  const row = {
    id: Food.newId(), name: "", qty: "", shelf: "", kind: "other", confidence: "high",
    expires: Dates.addDays(today, 3), dateSource: "manual", firstSeen: today, isNew: true
  };
  draft.rows.push(row);
  render.review();
  $("name-" + row.id).focus();
});

$("review-save").addEventListener("click", () => {
  const rows = draft.rows
    .filter(r => r.name.trim())
    .map(({ isNew, dateChanged, box, ...r }) => ({ ...r, name: r.name.trim() }));
  state.items = [...rows, ...draft.missing.filter(m => m.keep).map(m => m.item), ...draft.untouched];
  if (draft.type === "fridge") state.lastScan = draft.takenAt;
  Store.save();
  draft = null;
  toast(`Saved ${plural(state.items.length, "item")}`);
  go("eat");
});

/* ---------- Eat Me First ---------- */
render.eat = () => {
  const c = Food.counts(state.items);
  $("eat-lead").textContent =
    !state.items.length ? "Nothing here yet. Run a scan, or add an item by hand." :
    [
      c.expired && `${plural(c.expired, "item")} expired: throw ${c.expired === 1 ? "it" : "them"} away.`,
      c.soon && `${plural(c.soon, "item")} to eat in the next ${EAT_SOON_DAYS} days.`,
      c.unknown && `${plural(c.unknown, "item")} with a date we couldn't read: tap “Scan date” or “Set date”.`,
      !c.expired && !c.soon && !c.unknown && "Everything is fresh."
    ].filter(Boolean).join(" ") + (state.lastScan ? ` Last photo: ${Dates.stamp(state.lastScan)}.` : "");

  const groups = $("eat-groups");
  groups.replaceChildren();
  if (!state.items.length) {
    groups.append(el("div", { class: "empty" }, "Your food list is empty."));
    return;
  }
  const sorted = Food.byUrgency(state.items);
  STATUS_ORDER.forEach(s => {
    const list = sorted.filter(i => Food.status(i) === s);
    if (!list.length) return;
    groups.append(el("section", { class: "group " + s, "aria-label": STATUS[s].label },
      el("h2", { class: "group-head" }, el("span", { class: "dot" }), STATUS[s].label, el("span", { class: "n" }, String(list.length))),
      list.map(eatRow)
    ));
  });
};

function eatRow(item) {
  const s = Food.status(item);
  const meta = [item.shelf, item.qty, item.firstSeen && `in since ${Dates.format(item.firstSeen)}`, item.barcode && `barcode ${item.barcode}`]
    .filter(Boolean).join(" · ");

  let right;
  if (editingId === item.id) {
    const input = el("input", { class: "field mono", type: "date", id: "edit-" + item.id, value: item.expires || "", "aria-label": `New expiry date for ${item.name}` });
    right = el("div", { class: "edit" },
      input,
      el("button", { class: "btn primary small", type: "button", onclick: () => {
        if (Dates.valid(input.value)) {
          item.expires = input.value;
          item.dateSource = "manual";
          item.dateText = "";
          Store.save();
          toast(`${item.name}: date changed`);
        }
        editingId = null; render.eat();
      } }, "Save"),
      el("button", { class: "btn small", type: "button", onclick: () => { editingId = null; render.eat(); } }, "Cancel")
    );
  } else {
    right = el("div", { class: "right" },
      el("span", { class: "pill" }, Food.daysText(item)),
      item.expires && el("span", { class: "date mono" }, Dates.format(item.expires)),
      el("div", { class: "actions" },
        el("button", { class: "btn small", type: "button", onclick: () => {
          labelTargetId = item.id;
          $("label-input").click();
        } }, "Scan date"),
        el("button", { class: "btn small", type: "button", onclick: () => {
          editingId = item.id; render.eat(); $("edit-" + item.id)?.focus();
        } }, item.expires ? "Change date" : "Set date"),
        el("button", { class: "btn small", type: "button", onclick: () => {
          state.items = state.items.filter(i => i !== item);
          if (s !== "expired") state.eaten = [...(state.eaten || []), { name: item.name, date: Dates.today() }].slice(-300);
          Store.save(); render.eat();
          toast(`Removed ${item.name}`);
        } }, s === "expired" ? "Thrown away" : "Eaten")
      )
    );
  }
  return el("div", { class: "erow " + s },
    el("span", { class: "bar" }),
    el("div", {},
      el("div", { class: "name" }, item.name),
      meta && el("div", { class: "meta" }, meta),
      el("div", { class: "source" }, Food.sourceText(item)),
      item.note && el("div", { class: "warn-note" }, item.note)),
    right
  );
}

// "Scan date": a phone photo of one package's printed date. A printed date beats any estimate.
pickFile($("label-input"), async file => {
  const item = state.items.find(i => i.id === labelTargetId);
  if (!item) return;
  toast(`Reading the date on ${item.name}…`);
  try {
    const res = await Scanner.readLabel(file, item.name);
    if (!res.found) {
      toast(res.dateText
        ? `Date unrecognised: we could only read “${res.dateText}”. Take a closer, sharper photo of the date.`
        : "Date unrecognised: no printed date found. Take a closer, sharper photo of the date.");
      return;
    }
    item.expires = res.date;
    item.dateSource = "label";
    item.dateText = res.dateText;
    if (res.barcode) item.barcode = res.barcode;
    Store.save();
    render.eat();
    toast(`${item.name}: ${res.dateType || "date"} ${Dates.format(res.date)}`);
  } catch (e) {
    toast(Scanner.errorText(e?.code));
  }
});

// Manual add: for food the camera can't see or didn't recognize
$("add-shelf").replaceChildren(el("option", { value: "" }, "Not sure"), ...SHELVES.map(s => el("option", { value: s }, s)));
$("add-date").value = Dates.addDays(Dates.today(), 3);
$("add-form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("add-name").value.trim();
  const expires = $("add-date").value;
  const error = !name ? "Enter the food's name." : !Dates.valid(expires) ? "Pick an expiry date." : "";
  $("add-error").textContent = error;
  $("add-error").hidden = !error;
  if (error) return;
  state.items.push({
    id: Food.newId(), name, qty: "", shelf: $("add-shelf").value, kind: "other",
    expires, dateSource: "manual", firstSeen: Dates.today()
  });
  Store.save();
  $("add-name").value = "";
  render.eat();
  toast(`Added ${name}`);
});

/* ---------- Sync between devices ---------- */
function currentScreen() {
  return SCREENS.find(s => !$("screen-" + s).hidden);
}
Store.onRemoteChange(() => {
  const screen = currentScreen();
  if (!state.user || !state.device) return go("setup");
  if (screen === "setup") return go("home");
  if (screen !== "review") render[screen]?.();   // never wipe a scan the user is checking
  toast("Updated from your other device");
});
Store.connect();

/* ---------- Start ---------- */
Scanner.init();
Recipes.init();
Health.init();
Sensors.init();
go(state.user && state.device ? "home" : "setup");
