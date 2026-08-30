const OPENAI_URL='https://api.openai.com/v1/responses';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'Content-Type',
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Content-Type':'application/json; charset=utf-8'
};

function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:corsHeaders});}

async function callOpenAI(env,body){
  if(!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY runtime secret is not configured.');
  const res=await fetch(OPENAI_URL,{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await res.json();
  if(!res.ok) throw new Error(data?.error?.message||`OpenAI API error ${res.status}`);
  return data;
}

function outputText(response){
  if(response.output_text) return response.output_text;
  const parts=[];
  for(const item of response.output||[]){for(const c of item.content||[]){if(c.type==='output_text'&&c.text)parts.push(c.text);}}
  return parts.join('\n');
}

function imageResult(response){
  const call=(response.output||[]).find(x=>x.type==='image_generation_call'&&x.result);
  return call?.result||null;
}

function imageContent(images=[]){
  return images.slice(0,5).map(image_url=>({type:'input_image',image_url,detail:'high'}));
}

export default {
  async fetch(request,env){
    if(request.method==='OPTIONS') return new Response(null,{headers:corsHeaders});
    const url=new URL(request.url);
    if(request.method==='GET'&&(url.pathname==='/'||url.pathname==='/health')){
      return json({ok:true,service:'dayframe-ai',version:'V3',secretConfigured:Boolean(env.OPENAI_API_KEY)});
    }
    if(request.method!=='POST') return json({error:'Not found'},404);
    try{
      const body=await request.json();
      if(url.pathname==='/analyze-character'){
        if(!Array.isArray(body.images)||!body.images.length) return json({error:'Character reference images are required.'},400);
        const prompt=`You are creating a reusable visual identity profile for a recurring illustrated character named ${body.name||'MY CHARACTER'}.
Analyze ONLY stable, visually observable identity traits from the supplied reference images. Do not infer sensitive traits or personality. Return strict JSON only with these keys: face, eyes, nose, mouth, hair, body_proportions, clothing, accessories, palette, must_preserve, must_avoid. Values should be concise Korean strings or arrays. Prioritize traits that help reproduce the same character consistently across new scenes.`;
        const response=await callOpenAI(env,{model:'gpt-5.6',input:[{role:'user',content:[{type:'input_text',text:prompt},...imageContent(body.images)]}]});
        const text=outputText(response).trim().replace(/^```json\s*/,'').replace(/```$/,'').trim();
        let dna;try{dna=JSON.parse(text);}catch{dna={raw:text};}
        return json({ok:true,dna});
      }
      if(url.pathname==='/generate-scene'){
        if(!Array.isArray(body.images)||!body.images.length) return json({error:'Character reference images are required.'},400);
        if(!body.diary) return json({error:'Diary text is required.'},400);
        const mode=body.mode==='four'?'4-panel comic':'single illustrated diary scene';
        const dna=typeof body.dna==='string'?body.dna:JSON.stringify(body.dna||{});
        const prompt=`Create a ${mode} for a personal diary app.

CHARACTER IDENTITY — HIGHEST PRIORITY
Use the supplied reference images as the single visual source of truth for the recurring character. The character must remain recognizably the same illustrated identity in every panel. Preserve face proportions, eye style, nose style, mouth style, hair silhouette/part/length/texture, body proportions, distinctive clothing or accessories when present. Do not redesign the character.

SAVED CHARACTER DNA
${dna}

TODAY'S DIARY
${body.diary}

USER CAPTION
${body.caption||''}

COMPOSITION
${body.mode==='four'?'Exactly four clearly separated panels in reading order, each showing one concise beat from the diary. Keep the same character identity in all four panels.':'One strong, emotionally clear scene that represents the most visually meaningful moment from the diary.'}

STYLE
Clean, charming, restrained contemporary illustration. Simple background, no unnecessary decorative objects, no text inside the generated artwork, generous visual breathing room. The app will add caption text separately.

CRITICAL
Do not invent a different face. Do not add pupils/highlights or facial details absent from the references. Do not add extra characters unless the diary clearly requires them.`;
        const response=await callOpenAI(env,{model:'gpt-5.6',input:[{role:'user',content:[{type:'input_text',text:prompt},...imageContent(body.images)]}],tools:[{type:'image_generation'}]});
        const image=imageResult(response);
        if(!image) return json({error:outputText(response)||'Image generation returned no image.'},502);
        return json({ok:true,image:`data:image/png;base64,${image}`});
      }
      return json({error:'Not found'},404);
    }catch(error){return json({error:error.message||'Unknown error'},500);}
  }
};