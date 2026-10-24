// Draws a top-down picture of a dish on a canvas from a recipe's "look":
// { vessel: plate|bowl|glass|pan, base: "#rrggbb", toppings: [{ shape: leaf|dot|slice|drizzle|crumb, color }] }
const Dish = (() => {
  const HEX = /^#[0-9a-f]{6}$/i;
  const hashStr = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
  // Seeded random numbers, so the same recipe always looks the same
  const rng = seed => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const mix = (hex, other, amt) => {
    const a = parseInt(hex.slice(1), 16), b = parseInt(other.slice(1), 16);
    const ch = s => Math.round(((a >> s) & 255) * (1 - amt) + ((b >> s) & 255) * amt);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  };

  function draw(cv, look, seedText) {
    const S = 240, dpr = window.devicePixelRatio || 1;
    cv.width = S * dpr; cv.height = S * dpr;
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rnd = rng(hashStr(seedText));
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--well").trim() || "#F7FAFB";
    ctx.fillRect(0, 0, S, S);

    const c = S / 2;
    const vessel = ["plate", "bowl", "glass", "pan"].includes(look?.vessel) ? look.vessel : "plate";
    const base = HEX.test(look?.base || "") ? look.base : "#E8C27A";
    const circle = (r, fill, dx = 0, dy = 0) => { ctx.beginPath(); ctx.arc(c + dx, c + dy, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };

    let foodR;
    if (vessel === "pan") {
      ctx.save(); ctx.translate(c, c); ctx.rotate(-0.6);
      ctx.fillStyle = "#23292D"; ctx.beginPath(); ctx.roundRect(88, -9, 60, 18, 9); ctx.fill(); ctx.restore();
      circle(98, "rgba(0,0,0,.18)", 3, 5); circle(98, "#2E3438"); circle(88, "#3B4247"); foodR = 80;
    } else if (vessel === "bowl") {
      circle(94, "rgba(0,0,0,.14)", 3, 6); circle(94, "#ECE8E1"); circle(80, "#D8D3CA"); foodR = 74;
    } else if (vessel === "glass") {
      circle(72, "rgba(0,0,0,.12)", 3, 5); circle(72, "#E4EEF1"); foodR = 62;
    } else {
      circle(102, "rgba(0,0,0,.12)", 3, 6); circle(102, "#F8F8F5"); circle(84, "#EEEEE9"); circle(80, "#F8F8F5"); foodR = 70;
    }

    // Base: an uneven blob with a soft highlight
    ctx.beginPath();
    for (let k = 0; k <= 28; k++) {
      const a = (k / 28) * Math.PI * 2, r = foodR * (0.9 + rnd() * 0.1);
      const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    const g = ctx.createRadialGradient(c - 20, c - 24, 6, c, c, foodR);
    g.addColorStop(0, mix(base, "#FFFFFF", 0.3));
    g.addColorStop(1, mix(base, "#000000", 0.12));
    ctx.fillStyle = g; ctx.fill();

    const spot = (spread = 0.78) => {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * foodR * spread;
      return [c + Math.cos(a) * r, c + Math.sin(a) * r];
    };
    (look?.toppings || []).slice(0, 4).forEach(t => {
      const col = HEX.test(t?.color || "") ? t.color : "#7A9A3A";
      if (t?.shape === "leaf") {
        for (let n = 0; n < 8; n++) {
          const [x, y] = spot();
          ctx.save(); ctx.translate(x, y); ctx.rotate(rnd() * Math.PI);
          ctx.beginPath(); ctx.ellipse(0, 0, 10, 4.5, 0, 0, Math.PI * 2); ctx.fillStyle = mix(col, "#000000", rnd() * 0.2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.strokeStyle = mix(col, "#FFFFFF", 0.35); ctx.lineWidth = 1; ctx.stroke();
          ctx.restore();
        }
      } else if (t?.shape === "slice") {
        for (let n = 0; n < 5; n++) {
          const [x, y] = spot(0.7);
          ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fillStyle = mix(col, "#FFFFFF", 0.25); ctx.fill();
          for (let s = 0; s < 4; s++) {
            ctx.beginPath(); ctx.arc(x + Math.cos(s * 1.57) * 3.5, y + Math.sin(s * 1.57) * 3.5, 1.3, 0, Math.PI * 2);
            ctx.fillStyle = mix(col, "#FFF3C4", 0.6); ctx.fill();
          }
        }
      } else if (t?.shape === "drizzle") {
        ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.lineCap = "round";
        for (let n = 0; n < 3; n++) {
          const y0 = c - foodR * 0.5 + n * foodR * 0.5;
          ctx.beginPath(); ctx.moveTo(c - foodR * 0.7, y0);
          ctx.bezierCurveTo(c - 20, y0 - 18 + rnd() * 10, c + 20, y0 + 18 - rnd() * 10, c + foodR * 0.7, y0 + (rnd() - 0.5) * 12);
          ctx.stroke();
        }
      } else if (t?.shape === "dot") {
        for (let n = 0; n < 12; n++) { const [x, y] = spot(); circle(3 + rnd() * 3, mix(col, "#000000", rnd() * 0.15), x - c, y - c); }
      } else {
        for (let n = 0; n < 40; n++) { const [x, y] = spot(0.85); circle(1.2 + rnd() * 1.6, mix(col, "#FFFFFF", rnd() * 0.2), x - c, y - c); }
      }
    });
  }

  return { draw };
})();
