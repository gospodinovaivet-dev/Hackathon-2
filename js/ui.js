// Small shared UI helpers used by every screen.
const $ = id => document.getElementById(id);
const wait = ms => new Promise(r => setTimeout(r, ms));

// Element builder; text children are always set as text, never as HTML
function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k === "value" || k === "checked") n[k] = v;
    else if (v != null && v !== false) n.setAttribute(k, v === true ? "" : v);
  }
  n.append(...kids.flat().filter(k => k != null && k !== false && k !== ""));
  return n;
}

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, Math.max(2600, msg.length * 55));
}
