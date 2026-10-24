// Representative photos are separate from camera evidence and expiry estimates.
const ProductPhotos = (() => {
  const sources = {
  "omelette": "assets/products/omelette.jpg",
  "creamy-pasta": "assets/products/creamy-pasta.jpg",
  "breakfast-bowl": "assets/products/breakfast-bowl.jpg",
  "soup": "assets/products/soup.jpg",
  "stuffed-peppers": "assets/products/stuffed-peppers.jpg",

  "chicken": "assets/products/chicken.jpg",
  "pasta": "assets/products/pasta.jpg",
  "spinach": "assets/products/spinach.jpg",
  "milk": "assets/products/milk.jpg",
  "yogurt": "assets/products/yogurt.jpg",
  "tomatoes": "assets/products/tomatoes.jpg",
  "eggs": "assets/products/eggs.jpg",
  "cheddar": "assets/products/cheddar.jpg",
  "cookies": "assets/products/cookies.jpg",
  "container": "assets/products/container.jpg"
};
  const rules = [
    [/\bsoup\b/i, "soup"], [/stuffed.*(?:pepper|paprica)|(?:pepper|paprica).*rice/i, "stuffed-peppers"],
    [/\bchicken\b/i, "chicken"], [/\bpasta\b/i, "pasta"],
    [/\bspinach\b/i, "spinach"], [/\bmilk\b/i, "milk"],
    [/\byog(?:h)?urt\b/i, "yogurt"], [/\btomato(?:es)?\b/i, "tomatoes"],
    [/\beggs?\b/i, "eggs"], [/\bcheddar\b/i, "cheddar"],
    [/\bcookies?\b/i, "cookies"]
  ];
  function update(figure, name) {
    const key = rules.find(([pattern]) => pattern.test(String(name)))?.[1] || "container";
    const img = el("img", { src: sources[key], alt: key === "container" ? "Closed food container; product photo unavailable" : `Illustrative photo of ${name}`, loading: "lazy", decoding: "async", width: 480, height: 480 });
    img.addEventListener("error", () => { img.hidden = true; });
    figure.replaceChildren(img, el("figcaption", {}, key === "container" ? "Photo unavailable" : "Serving illustration"));
  }
  function figure(name) {
    const node = el("figure", { class: "product-photo" });
    update(node, name);
    return node;
  }
  function recipe(name) {
    const photos = {
      "Spinach and tomato omelette": "omelette",
      "Leftover pasta with creamy spinach": "creamy-pasta",
      "Honey yogurt breakfast bowl": "breakfast-bowl"
    };
    const key = photos[name];
    if (!key) return null;
    return el("figure", { class: "recipe-photo" },
      el("img", { src: sources[key], alt: `Serving suggestion for ${name}`, loading: "lazy", width: 640, height: 640 }),
      el("figcaption", {}, "Serving suggestion"));
  }
  return { figure, update, recipe };
})();
