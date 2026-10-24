// Recipes: AI recipe ideas from the food list, with taste preferences and a "happy to shop" mode.
const Recipes = (() => {
  const PREFS = ["Sweet", "Salty", "On a diet", "Under 15 min", "Vegetarian", "High protein", "No oven"];
  const chosen = new Set();
  let shopMode = false;

  const EXAMPLES = [
    { name: "Spinach and tomato omelette", minutes: 10, kcal: 340, servings: 1,
      why: "Uses the spinach before it goes off.",
      uses: ["Eggs", "Baby spinach", "Tomatoes", "Cheddar"], extra: ["Olive oil", "Salt", "Pepper"], buy: [],
      steps: ["Beat 3 eggs with a pinch of salt and pepper.", "Wilt a big handful of spinach in a pan with a little oil.", "Pour in the eggs, add sliced tomato and 20 g grated cheddar.", "Cook 3–4 minutes on medium heat, fold and serve."],
      look: { vessel: "plate", base: "#F2C14E", toppings: [{ shape: "leaf", color: "#3E8E41" }, { shape: "slice", color: "#D9412B" }, { shape: "crumb", color: "#E9962E" }] } },
    { name: "Leftover pasta with creamy spinach", minutes: 12, kcal: 520, servings: 2,
      why: "Finishes the pasta today and the milk before it runs out.",
      uses: ["Leftover pasta", "Baby spinach", "Milk 3.6%", "Cheddar"], extra: ["Garlic", "Butter"], buy: [],
      steps: ["Melt a knob of butter with a chopped garlic clove.", "Add 100 ml milk and 40 g grated cheddar, stir until smooth.", "Stir in the spinach and the leftover pasta.", "Heat through for 4 minutes and season."],
      look: { vessel: "pan", base: "#EBC98A", toppings: [{ shape: "leaf", color: "#2F7D3A" }, { shape: "crumb", color: "#F3E3B5" }] } },
    { name: "Honey yogurt breakfast bowl", minutes: 5, kcal: 280, servings: 1,
      why: "A sweet way to finish the yogurt.",
      uses: ["Greek yogurt"], extra: ["Honey", "Oats"], buy: ["Fresh berries"],
      steps: ["Spoon a cup of Greek yogurt into a bowl.", "Top with 2 tablespoons of oats and some berries.", "Drizzle with honey."],
      look: { vessel: "bowl", base: "#F6F2EA", toppings: [{ shape: "drizzle", color: "#D99A2B" }, { shape: "crumb", color: "#B88A55" }, { shape: "dot", color: "#B5304A" }] } }
  ];
  let current = EXAMPLES;

  const items = () => Store.get().items;
  const findItem = name => items().find(i => i.name.toLowerCase() === String(name).toLowerCase());

  function renderMode() {
    $("mode-fridge").setAttribute("aria-selected", !shopMode);
    $("mode-any").setAttribute("aria-selected", shopMode);
    $("mode-hint").textContent = shopMode
      ? "Ask for any dish you like. The AI uses what's in your fridge where it can and tells you what to buy."
      : "Pick what you want. The AI builds recipes from your fridge and uses the food that expires soonest first.";
    $("pref-text").placeholder = shopMode
      ? "What do you want to cook? e.g. lasagna, sushi, pancakes"
      : "Anything else? e.g. no dairy, cooking for 4, kid friendly";
  }

  function renderPrefs() {
    $("prefs").replaceChildren(...PREFS.map((p, idx) => el("button", {
      class: "chip", type: "button", id: "pref-" + idx, "aria-pressed": String(chosen.has(p)),
      onclick: () => { chosen.has(p) ? chosen.delete(p) : chosen.add(p); renderPrefs(); }
    }, p)));
  }

  function renderEatFirst() {
    const soon = Food.byUrgency(items().filter(i => Food.status(i) === "soon"));
    $("rec-eat-first").replaceChildren(...(soon.length
      ? soon.map(i => el("span", { class: "ing soon" }, `${i.name} · ${Food.daysText(i).toLowerCase()}`))
      : [el("span", { class: "note" }, "Nothing needs eating urgently.")]));
  }

  function card(r, idx) {
    const cv = el("canvas", { role: "img", "aria-label": `Illustration of ${r.name}` });
    const meta = [[r.minutes, "min"], [r.kcal, "kcal"], [r.servings, r.servings === 1 ? "serving" : "servings"]]
      .filter(([v]) => v != null)
      .map(([v, u]) => el("span", {}, el("b", {}, String(v)), " " + u));
    const tags = [
      ...(r.uses || []).map(u => el("span", { class: "ing" + (findItem(u) && Food.status(findItem(u)) === "soon" ? " soon" : "") }, String(u))),
      ...(r.extra || []).map(u => el("span", { class: "ing pantry" }, String(u))),
      ...(r.buy || []).map(u => el("span", { class: "ing buy" }, "Buy: " + String(u)))
    ];
    const article = el("article", { class: "recipe" },
      el("figure", {}, cv, el("figcaption", {}, "Illustration of the dish")),
      el("div", { class: "rbody" },
        el("h3", {}, String(r.name)),
        el("div", { class: "rmeta2" }, meta),
        r.why && el("p", { class: "why" }, String(r.why)),
        el("div", { class: "uses" }, tags),
        el("details", { id: "steps-" + idx },
          el("summary", {}, "How to make it"),
          el("ol", {}, (r.steps || []).map(s => el("li", {}, String(s)))))
      )
    );
    return { article, draw: () => Dish.draw(cv, r.look, String(r.name)) };
  }

  function renderList() {
    const cards = current.map(card);
    $("recipe-list").replaceChildren(...cards.map(c => c.article));
    cards.forEach(c => c.draw());
    $("rec-count").textContent = plural(current.length, "recipe");
  }

  async function generate() {
    if (!Scanner.sample) return;
    const btn = $("gen-recipes");
    btn.disabled = true;
    $("rec-status").textContent = "Cooking up ideas…";
    const usable = items().filter(i => Food.status(i) !== "expired");
    const fridge = usable.map(i => ({ item: i.name, amount: i.qty || "unknown", expiresInDays: i.expires ? Dates.daysUntil(i.expires) : "unknown" }));
    const expired = items().filter(i => Food.status(i) === "expired").map(i => i.name);
    const wants = [...chosen].join(", ") || "no special preference";
    const extra = $("pref-text").value.trim().slice(0, 200);
    const prompt = `You are the recipe assistant in a smart fridge app.
Fridge contents (name, amount, days until expiry):
${JSON.stringify(fridge, null, 1)}
Expired, never use: ${expired.join(", ") || "none"}.
Basic pantry is available: salt, pepper, oil, butter, sugar, honey, flour, oats, rice, dry pasta, garlic, onion, common spices.

The user wants: ${wants}.${extra ? `\nThey also said: "${extra}"` : ""}

${shopMode
  ? "The user is happy to go shopping. If they name a dish, make that dish (3 different versions or close variations), even if the fridge doesn't have the ingredients. Use fridge items where they fit, especially ones that expire within 2 days."
  : "Suggest 3 different recipes that follow the user's wishes. Use only fridge items and the basic pantry, and prefer the items that expire within 2 days."}
Keep steps short and practical (3 to 6 steps, with amounts).
In "uses", list fridge items using their exact names from the list above. In "extra", list basic pantry items used. In "buy", list ingredients the user must buy${shopMode ? "" : " (this must be an empty list)"}.
"look" describes how the finished dish looks from above, for an illustration: vessel is one of plate, bowl, glass, pan; base is the main colour of the food as #rrggbb; toppings is 1 to 3 visible toppings, each with shape (leaf, dot, slice, drizzle or crumb) and color as #rrggbb.
Reply with only JSON:
{"recipes":[{"name":"","minutes":10,"kcal":350,"servings":2,"why":"one short sentence on why it fits","uses":[""],"extra":[""],"buy":[""],"steps":[""],"look":{"vessel":"plate","base":"#e8c27a","toppings":[{"shape":"leaf","color":"#3e8e41"}]}}]}`;
    try {
      const res = await Scanner.sample.json(prompt, { modelTier: "quick", cache: false });
      const list = Array.isArray(res?.recipes) ? res.recipes.filter(r => r && r.name).slice(0, 4) : [];
      if (!list.length) throw { code: "invalid_json" };
      current = list;
      renderList();
      const toBuy = new Set(list.flatMap(r => Array.isArray(r.buy) ? r.buy.map(String) : []));
      $("rec-status").textContent = `Made by AI for: ${wants}${extra ? `, ${extra}` : ""}.`
        + (shopMode ? (toBuy.size ? ` You'll need to buy ${plural(toBuy.size, "ingredient")} (blue tags).` : " You have everything already.") : "");
    } catch (e) {
      $("rec-status").textContent = Scanner.errorText(e?.code);
      if (e?.code === "not_granted" || e?.code === "sampling_disabled") btn.hidden = true;
    } finally {
      btn.disabled = false;
    }
  }

  function init() {
    $("mode-fridge").addEventListener("click", () => { shopMode = false; renderMode(); });
    $("mode-any").addEventListener("click", () => { shopMode = true; renderMode(); $("pref-text").focus(); });
    $("gen-recipes").addEventListener("click", generate);
    $("pref-text").addEventListener("keydown", e => { if (e.key === "Enter") generate(); });
    Scanner.ready.then(() => {
      if (Scanner.sample) return;
      $("gen-recipes").hidden = true;
      $("rec-status").textContent = "Example recipes.";
    });
    // Redraw the dish pictures when the theme changes so their background matches
    const redraw = () => { if (!$("screen-recipes").hidden) renderList(); };
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", redraw);
  }

  return {
    init,
    render() { renderMode(); renderPrefs(); renderEatFirst(); renderList(); }
  };
})();
