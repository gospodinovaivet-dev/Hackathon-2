/* Replace the Claude embedded runtime with our authenticated Supabase function, or with the local
   ChillCheck server (npm start) when the page is served by it: that server holds the Claude key in .env. */
window.ChillAI = (() => {
  const localServer = fetch('/api/status').then(r => r.ok ? r.json() : null).then(d => !!d?.ok).catch(() => false);
  const LOCAL_ERRORS = {
    no_key: 'The AI has no Claude API key yet. Add ANTHROPIC_API_KEY=sk-ant-… to .env, then restart npm start.',
    rate_limited: 'The AI is busy right now. Please try again in a minute.',
    image_rejected: 'This photo could not be read. Try a sharper or smaller photo.',
    bad_request: 'The AI could not read that request. Please try again.',
    upstream_error: 'The AI could not be reached. Check your internet connection and try again.'
  };
  // The answer as JSON: the whole reply, a ```json block, or the part from the first { to the last }
  function parse(text) {
    const s = String(text || ''), start = s.search(/[{[]/), end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    for (const t of [s, (s.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1], start >= 0 && end > start ? s.slice(start, end + 1) : '']) {
      if (!t) continue;
      try { return JSON.parse(t); } catch { /* next form */ }
    }
    throw Error('The AI returned an incomplete response. Please try again.');
  }
  async function viaLocal(prompt, image) {
    let res;
    try {
      res = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, effort: 'medium', images: image ? [{ mediaType: 'image/jpeg', data: image }] : [] }) });
    } catch { throw Error('The ChillCheck server stopped. Run npm start again and reload the page.'); }
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw Error(LOCAL_ERRORS[out.code] || LOCAL_ERRORS.upstream_error);
    if (out.refused) throw Error('The AI declined this request. Try a different photo or wording.');
    return parse(out.text);
  }
  async function imageData(blob) {
    if(blob.size>15*1024*1024)throw Error('Choose an image smaller than 15 MB.');
    const bitmap=await createImageBitmap(blob);
    const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    return canvas.toDataURL('image/jpeg',.85).split(',')[1];
  }
  async function json(prompt,{images=[]}={}) {
    const image=images[0]?await imageData(images[0]):null;
    if(await localServer) return viaLocal(prompt,image);
    const {data,error}=await ChillAPI.client().functions.invoke('chill-ai',{body:{prompt,image}});
    if(error){let message='Live AI is unavailable. Deploy chill-ai and configure its AI provider secrets (Anthropic or Gemini) in Supabase Edge Function secrets.';
      try {const body=await error.context.json();message=body.error||message;}catch{}
      throw Error(message);
    }
    if(data?.error)throw Error(data.error);
    return data;
  }
  Scanner.sample={json,limits:async()=>({images:true})};Scanner.canReadPhotos=true;Scanner.ready=Promise.resolve();
  return {json,imageData};
})();
