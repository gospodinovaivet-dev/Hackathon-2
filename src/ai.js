/* Replace the Claude embedded runtime with our authenticated Supabase function. */
window.ChillAI = (() => {
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
    const {data,error}=await ChillAPI.client().functions.invoke('chill-ai',{body:{prompt,image}});
    if(error){let message='Live AI is unavailable. Deploy chill-ai and configure ANTHROPIC_API_KEY and ANTHROPIC_MODEL in Supabase Edge Function secrets.';
      try {const body=await error.context.json();message=body.error||message;}catch{}
      throw Error(message);
    }
    if(data?.error)throw Error(data.error);
    return data;
  }
  Scanner.sample={json,limits:async()=>({images:true})};Scanner.canReadPhotos=true;Scanner.ready=Promise.resolve();
  return {json,imageData};
})();
