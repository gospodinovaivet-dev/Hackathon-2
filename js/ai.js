// One door to Claude for the whole app (photos, recipes, food advice).
// On the shared claude.ai link it uses Claude's built-in connection. Anywhere else it uses the
// local server (server.mjs), which keeps the API key on the computer and out of the browser.
// With neither, AI features show example data.
const AI = {
  mode: null,           // "claude", "server" or null (no AI here)
  sample: null,
  canReadPhotos: false,
  maxImages: 1,         // photos per request
  ready: null,

  init() {
    Scanner.ready = this.ready = (async () => {
      try { this.sample = await window.claude?.use?.("sample"); } catch { this.sample = null; }
      if (this.sample) {
        this.mode = "claude";
        const limits = await this.sample.limits().catch(() => null);
        this.canReadPhotos = !!limits?.images;
        this.maxImages = limits?.images?.maxCount || 1;
        return;
      }
      if (!location.protocol.startsWith("http")) return;   // opened as a file: no server to ask
      try {
        const res = await fetch("/api/status");
        if (res.ok && (await res.json()).ok) {
          this.mode = "server";
          this.canReadPhotos = true;
          this.maxImages = 6;
        }
      } catch { /* no local server running */ }
    })().then(() => {
      if (!this.mode) return;
      Scanner.sample = { json: (prompt, opts) => this.json(prompt, opts), limits: async () => ({ images: { maxCount: this.maxImages } }) };
      Scanner.canReadPhotos = this.canReadPhotos;
    });
    return this.ready;
  },

  get available() { return !!this.mode; },

  // Ask Claude for a JSON answer. images: Blob[]; quick: true for short, simple work.
  async json(prompt, { images = [], quick = false } = {}) {
    await this.ready;
    if (this.mode === "claude") {
      const opts = { cache: false };
      if (images.length) opts.images = images;
      if (quick) opts.modelTier = "quick";
      return this.sample.json(prompt, opts);
    }
    if (this.mode !== "server") throw { code: "no_ai" };

    let res;
    try {
      res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, effort: quick ? "low" : "medium", images: await Promise.all(images.map(imagePayload)) })
      });
    } catch {
      throw { code: "server_down" };
    }
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw { code: out.code || "upstream_error" };
    if (out.refused) throw { code: "refused" };
    const value = parseJsonReply(out.text);
    if (value === undefined) throw { code: "invalid_json", text: out.text };
    return value;
  }
};

// A photo as base64 for the server. Big phone photos are scaled down first: Claude reads
// ~1.5 megapixels anyway, and the API limits the size of each image.
async function imagePayload(blob) {
  let send = blob;
  if (blob.size > 3_000_000 || !/^image\/(jpeg|png|webp|gif)$/.test(blob.type)) {
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement("canvas");
    cv.width = Math.round(bmp.width * scale);
    cv.height = Math.round(bmp.height * scale);
    cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    send = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.88));
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(send);
  });
  return { mediaType: send.type || "image/jpeg", data: String(dataUrl).split(",")[1] };
}

// Read the JSON out of a reply: the whole reply, a ```json block, or the part from the first { or [
function parseJsonReply(text) {
  const tries = [text, (String(text).match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1]];
  const start = String(text).search(/[{[]/);
  const end = Math.max(String(text).lastIndexOf("}"), String(text).lastIndexOf("]"));
  if (start >= 0 && end > start) tries.push(String(text).slice(start, end + 1));
  for (const t of tries) {
    if (!t) continue;
    try { return JSON.parse(t); } catch { /* try the next form */ }
  }
  return undefined;
}
