const APP_VERSION='V3';
const API_BASE='https://dayframe.continuingrace.workers.dev';
const state={mode:'single',characterImages:[],dna:null};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
$('#versionBadge').textContent=APP_VERSION; $('#footerVersion').textContent=APP_VERSION;

async function api(path,body){
  const res=await fetch(`${API_BASE}${path}`,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  let data={};try{data=await res.json();}catch{}
  if(!res.ok) throw new Error(data.error||`연결 오류 (${res.status})`);
  return data;
}
function friendlyError(err){
  const m=String(err?.message||err||'알 수 없는 오류');
  if(m.includes('runtime secret')) return 'OpenAI API 키가 Worker의 Runtime Secret에 아직 등록되지 않았습니다.';
  if(/quota|billing|credit/i.test(m)) return 'OpenAI API 사용 한도 또는 결제 상태를 확인해주세요.';
  if(/verification|verify/i.test(m)) return 'OpenAI 이미지 기능 사용을 위해 계정/조직 인증이 필요할 수 있습니다.';
  return m;
}
async function checkAI(){
  const box=$('#aiStatus'),text=$('#aiStatusText');
  try{const h=await api('/health');box.classList.toggle('ready',!!h.secretConfigured);box.classList.toggle('warning',!h.secretConfigured);text.textContent=h.secretConfigured?'AI 연결됨 · OpenAI Secret 확인':'Worker 연결됨 · Runtime Secret 확인 필요';}
  catch{box.classList.add('warning');text.textContent='AI Worker 연결을 확인해주세요.';}
}
$$('.tab').forEach(b=>b.addEventListener('click',()=>{$$('.tab').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(p=>p.classList.toggle('active',p.id===b.dataset.target));window.scrollTo({top:0,behavior:'smooth'});}));
$$('.choice').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;$$('.choice').forEach(x=>x.classList.toggle('active',x===b));}));
function renderThumbs(images){$('#thumbs').innerHTML='';images.forEach(src=>{const img=document.createElement('img');img.src=src;img.alt='캐릭터 기준 이미지';$('#thumbs').append(img);});}
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
function dnaSummary(dna){if(!dna)return '아직 분석된 Character DNA가 없습니다.';const entries=Object.entries(dna).filter(([,v])=>v&&String(v).length);return entries.slice(0,5).map(([k,v])=>`${k.replaceAll('_',' ')}: ${Array.isArray(v)?v.join(', '):v}`).join(' · ');}
$('#characterInput').addEventListener('change',async e=>{const files=[...e.target.files].slice(0,5);state.characterImages=await Promise.all(files.map(fileToDataURL));state.dna=null;renderThumbs(state.characterImages);$('#saveStatus').classList.add('hidden');$('#dnaText').textContent='새 기준 이미지가 준비되었습니다. 저장하면 AI가 Character DNA를 분석합니다.';});
$('#saveCharacter').addEventListener('click',async()=>{
  const btn=$('#saveCharacter'),name=$('#characterName').value.trim()||'MY CHARACTER';if(!state.characterImages.length){alert('기준 이미지를 먼저 추가해주세요.');return;}
  btn.disabled=true;btn.textContent='저장 및 분석 중…';$('#saveStatus').classList.remove('hidden');$('#saveStatusTitle').textContent='Character DNA 분석 중';$('#saveStatusText').textContent='기준 이미지를 AI가 분석하고 있습니다.';
  try{
    localStorage.setItem('dayframe.characterName',name);localStorage.setItem('dayframe.characterImages',JSON.stringify(state.characterImages));localStorage.setItem('dayframe.characterSavedAt',new Date().toISOString());
    const result=await api('/analyze-character',{name,images:state.characterImages});state.dna=result.dna||{};localStorage.setItem('dayframe.characterDNA',JSON.stringify(state.dna));
    $('#dnaText').textContent=dnaSummary(state.dna);$('#saveStatusTitle').textContent='캐릭터 저장 + AI 분석 완료';$('#saveStatusText').textContent=`${name} · 기준 이미지 ${state.characterImages.length}장 · Character DNA 저장됨`;btn.textContent='✓ 분석 완료';setTimeout(()=>btn.textContent='캐릭터 다시 분석',1500);
  }catch(err){$('#saveStatusTitle').textContent='이미지는 저장됨 · AI 분석 실패';$('#saveStatusText').textContent=friendlyError(err);btn.textContent='다시 분석';}
  finally{btn.disabled=false;}
});
$('#makeHighlight').addEventListener('click',()=>{const t=$('#diaryText').value.trim();if(!t){alert('오늘의 기록을 먼저 적어주세요.');return;}const sentences=t.split(/(?<=[.!?。]|다\.)\s+|\n+/).map(x=>x.trim()).filter(Boolean);const n=state.mode==='four'?4:1;$('#highlightText').textContent=sentences.slice(0,n).join(state.mode==='four'?'  ·  ':' ');$('#highlightCard').classList.remove('hidden');localStorage.setItem('dayframe.diary',t);});
const caption=$('#previewCaption');$('#captionInput').addEventListener('input',e=>caption.textContent=e.target.value);$('#fontSize').addEventListener('input',e=>caption.style.fontSize=e.target.value+'px');$('#letterSpacing').addEventListener('input',e=>caption.style.letterSpacing=e.target.value+'px');$('#lineHeight').addEventListener('input',e=>caption.style.lineHeight=e.target.value);
$('#generateScene').addEventListener('click',async()=>{
  const btn=$('#generateScene'),status=$('#generateStatus'),diary=$('#diaryText').value.trim();if(!state.characterImages.length){alert('먼저 캐릭터 기준 이미지를 저장해주세요.');return;}if(!diary){alert('오늘의 기록을 먼저 적어주세요.');return;}
  localStorage.setItem('dayframe.diary',diary);btn.disabled=true;btn.textContent='장면 생성 중…';status.classList.remove('hidden');status.textContent='캐릭터 기준 이미지를 유지하며 오늘의 장면을 만들고 있습니다. 잠시 걸릴 수 있어요.';
  try{const result=await api('/generate-scene',{images:state.characterImages,dna:state.dna||{},diary,mode:state.mode,caption:$('#captionInput').value.trim()});$('#generatedImage').src=result.image;$('#generatedImage').classList.remove('hidden');$('#previewPlaceholder').classList.add('hidden');status.textContent='생성 완료 · 캡션 조절값은 바로 미리보기에 반영됩니다.';}
  catch(err){status.textContent=`생성 실패 · ${friendlyError(err)}`;}
  finally{btn.disabled=false;btn.textContent='오늘의 장면 다시 생성';}
});
$('#resetDraft').addEventListener('click',()=>{if(confirm('현재 작성 중인 기록과 조절값을 초기화할까요?')){localStorage.removeItem('dayframe.diary');location.reload();}});
window.addEventListener('DOMContentLoaded',()=>{const name=localStorage.getItem('dayframe.characterName');const diary=localStorage.getItem('dayframe.diary');let images=[],dna=null;try{images=JSON.parse(localStorage.getItem('dayframe.characterImages')||'[]');dna=JSON.parse(localStorage.getItem('dayframe.characterDNA')||'null');}catch{}if(name)$('#characterName').value=name;if(diary)$('#diaryText').value=diary;if(images.length){state.characterImages=images;renderThumbs(images);}if(dna){state.dna=dna;$('#dnaText').textContent=dnaSummary(dna);$('#saveStatusTitle').textContent='저장된 캐릭터 불러옴';$('#saveStatusText').textContent=`${name||'MY CHARACTER'} · 기준 이미지 ${images.length}장 · Character DNA 저장됨`;$('#saveStatus').classList.remove('hidden');}else if(images.length){$('#dnaText').textContent=`${name||'MY CHARACTER'}의 기준 이미지 ${images.length}장이 저장되어 있습니다. AI 분석을 실행해주세요.`;}checkAI();});
if('serviceWorker' in navigator){window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js?v=3');reg.update();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)$('#updateToast').classList.remove('hidden');});});navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload());}catch(e){console.warn('Service worker registration failed',e);}});}
$('#refreshApp').addEventListener('click',()=>{navigator.serviceWorker.getRegistration().then(reg=>reg?.waiting?.postMessage({type:'SKIP_WAITING'}));});