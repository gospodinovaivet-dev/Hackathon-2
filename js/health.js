// "Food & your body": AI advice on the foods you eat most: what they do for you, what they give you,
// how often is good, and when it becomes too much. "Most eaten" comes from the Eaten button in
// Eat Me First (last 30 days); food that's in the fridge but not eaten yet fills up the list.
const Health = (() => {
  const EXAMPLE = {
    summary: "A good mix of protein and dairy. Keep cheese portions small and add more vegetables.",
    foods: [
      { name: "Eggs", helps: "Complete protein for your muscles, and choline for your brain.", nutrients: ["Protein", "Vitamin B12", "Vitamin D", "Choline"],
        howOften: "1–2 eggs a day is fine for most healthy adults.", tooMuch: "If you have high cholesterol, ask your doctor how many suit you.", yourIntake: "About right" },
      { name: "Milk", helps: "Keeps bones and teeth strong.", nutrients: ["Calcium", "Protein", "Iodine", "Vitamin B12"],
        howOften: "2–3 portions of dairy a day (a portion is a 200 ml glass).", tooMuch: "Over about 1 litre a day adds a lot of saturated fat and can push out other foods.", yourIntake: "About right" },
      { name: "Cheddar", helps: "Calcium for your bones and protein to keep you full.", nutrients: ["Calcium", "Protein", "Vitamin A"],
        howOften: "About 30 g a day (a matchbox-sized piece).", tooMuch: "It's high in salt and saturated fat, so big daily portions raise blood pressure and cholesterol.", yourIntake: "More than recommended" },
      { name: "Baby spinach", helps: "Supports energy and healthy blood, and keeps bones strong.", nutrients: ["Iron", "Folate", "Vitamin K", "Vitamin A"],
        howOften: "A handful (30–80 g) most days counts towards your 5 a day.", tooMuch: "It's high in oxalates: very large daily amounts can add to kidney stones in people prone to them.", yourIntake: "Could eat more" }
    ]
  };
  let current = EXAMPLE;
  let isExample = true;

  // Foods ranked by how often they were eaten in the last 30 days, then what's in the fridge now
  function topFoods() {
    const st = Store.get();
    const since = Dates.addDays(Dates.today(), -30);
    const counts = new Map();
    (st.eaten || []).filter(e => e.date >= since).forEach(e => {
      const key = e.name.trim().toLowerCase();
      counts.set(key, { name: e.name, times: (counts.get(key)?.times || 0) + 1 });
    });
    st.items.forEach(i => {
      const key = i.name.trim().toLowerCase();
      if (!counts.has(key)) counts.set(key, { name: i.name, times: 0 });
    });
    return [...counts.values()].sort((a, b) => b.times - a.times).slice(0, 8);
  }

  function renderTop() {
    const top = topFoods();
    $("health-top").replaceChildren(...(top.length
      ? top.map(f => el("span", { class: "ing" }, f.name, " ",
          el("span", { class: "times" }, f.times ? `${f.times}× this month` : "in your fridge")))
      : [el("span", { class: "note" }, "Nothing yet. Tap “Eaten” in Eat Me First when you finish something.")]));
    return top;
  }

  function card(f) {
    const intake = String(f.yourIntake || "");
    const tone = /more than|too much|a lot/i.test(intake) ? "soon" : /more|less/i.test(intake) ? "unknown" : "safe";
    return el("article", { class: "food-card" },
      ProductPhotos.figure(f.name),
      el("div", { class: "food-head" },
        el("h3", {}, String(f.name)),
        intake && !isExample && el("span", { class: "pill " + tone }, intake)),   // no verdict without real data
      el("p", {}, String(f.helps || "")),
      el("div", { class: "uses" }, (Array.isArray(f.nutrients) ? f.nutrients : []).slice(0, 5).map(n => el("span", { class: "ing" }, String(n)))),
      el("dl", { class: "facts" },
        el("dt", {}, "How often"), el("dd", {}, String(f.howOften || "")),
        f.tooMuch && el("dt", {}, "When it's too much"), f.tooMuch && el("dd", { class: "warn" }, String(f.tooMuch)))
    );
  }

  function render() {
    renderTop();
    $("health-summary").textContent = current.summary || "";
    $("health-cards").replaceChildren(...(current.foods || []).map(card));
  }

  async function generate() {
    if (!Scanner.sample) return;
    const top = topFoods();
    if (!top.length) { $("health-status").textContent = "Scan your fridge or mark food as eaten first."; return; }
    const btn = $("health-ask");
    btn.disabled = true;
    $("health-status").textContent = "Thinking…";
    const prompt = `You are the nutrition assistant in a smart fridge app. These are the foods this household eats most. "times" = how often they ate it in the last 30 days (0 = in the fridge, not eaten yet):
${JSON.stringify(top.map(f => ({ food: f.name, times: f.times })))}

For up to 6 of these foods (most eaten first; skip drinks like wine and non-foods) give:
- name: the food
- helps: one short sentence on what it does for the body
- nutrients: the 2–4 main nutrients it gives, short words like "Protein", "Vitamin C", "Calcium"
- howOften: a sensible amount and frequency for an adult, based on common dietary guidance, e.g. "1 portion (150 g) a day"
- tooMuch: one short sentence on when it starts to be a problem (how much, and why), or "" if there's no realistic concern
- yourIntake: compare "times" with howOften in 2–4 words: "About right", "More than recommended" or "Could eat more". Use "Not enough data" when times is 0.
And "summary": one sentence about their overall pattern.
Plain, friendly and factual. General information, not medical advice: no diagnoses or cures.
Reply with only JSON: {"summary": "", "foods": [{"name": "", "helps": "", "nutrients": [""], "howOften": "", "tooMuch": "", "yourIntake": ""}]}`;
    try {
      const res = await Scanner.sample.json(prompt, { modelTier: "quick", cache: false });
      if (!Array.isArray(res?.foods) || !res.foods.length) throw { code: "invalid_json" };
      current = { summary: String(res.summary || ""), foods: res.foods.slice(0, 6) };
      isExample = false;
      render();
      $("health-status").textContent = "Made by AI from the foods you eat most.";
    } catch (e) {
      $("health-status").textContent = Scanner.errorText(e?.code);
      if (e?.code === "not_granted" || e?.code === "sampling_disabled") btn.hidden = true;
    } finally {
      btn.disabled = false;
    }
  }

  function init() {
    $("health-ask").addEventListener("click", generate);
    Scanner.ready.then(() => {
      if (Scanner.sample) return;
      $("health-ask").hidden = true;
      $("health-status").textContent = "Example advice.";
    });
  }

  return { init, render };
})();
