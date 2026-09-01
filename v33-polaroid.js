(()=>{
  'use strict';
  const VERSION='V33';
  const BG_KEY='dayframe.decorate.background.v33';
  const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
  const getBg=()=>localStorage.getItem(BG_KEY)||'#f6f3ec';
  const setBg=v=>{try{localStorage.setItem(BG_KEY,v)}catch{}};
  let baseDraw=null,installed=false,normalHeight=0;

  function decorItemFromDOM(kind){
    const text=q(`.decorate-text[data-kind="${kind}"]`)?.value||'';
    const color=q(`.decorate-color[data-kind="${kind}"]`)?.value||'#5e5b55';
    const opacity=+(q(`.decorate-opacity[data-kind="${kind}"]`)?.value??1);
    const size=+(q(`.decorate-size[data-kind="${kind}"]`)?.value??28);
    const spacing=+(q(`.decorate-spacing[data-kind="${kind}"]`)?.value??0);
    const line=+(q(`.decorate-line[data-kind="${kind}"]`)?.value??1.2);
    const x=+(q(`.decorate-x[data-kind="${kind}"]`)?.value??50);
    const y=+(q(`.decorate-y[data-kind="${kind}"]`)?.value??88);
    return{text,color,opacity,size,spacing,line,x,y};
  }
  function drawLetters(ctx,item,font){
    if(!item.text)return;
    ctx.save();ctx.globalAlpha=item.opacity;ctx.fillStyle=item.color;ctx.font=`${item.size}px ${font}`;ctx.textBaseline='top';
    String(item.text).split('\n').forEach((line,row)=>{
      const chars=[...line];const w=chars.reduce((a,ch,i)=>a+ctx.measureText(ch).width+(i?item.spacing:0),0);
      let x=C.width*item.x/100;if(item.x>=50)x-=Math.min(w,C.width*.86);
      const y=C.height*item.y/100+row*item.size*item.line;
      chars.forEach((ch,i)=>{if(i)x+=item.spacing;ctx.fillText(ch,x,y);x+=ctx.measureText(ch).width});
    });ctx.restore();
  }
  function redrawLowerDecor(){
    if(q('#outputRatio')?.value!=='4:5')return;
    const font=S.texts?.[S.active]?.font||'Pretendard, sans-serif';
    ['date','weather','memo','signature'].forEach(kind=>{
      const item=decorItemFromDOM(kind);
      if(C.height*item.y/100>=S.imageH*.82)drawLetters(X,item,font);
    });
  }
  function applyCanvasRatio(){
    if(!S.image)return;
    if(!normalHeight)normalHeight=C.height;
    const ratio=q('#outputRatio')?.value||'4:5';
    if(ratio==='4:5'){
      const target=Math.round(C.width*1.25);
      if(C.height!==target)C.height=target;
    }else{
      const target=normalHeight||S.imageH||C.height;
      if(C.height!==target)C.height=target;
    }
  }
  function installDraw(){
    baseDraw=draw;
    draw=function drawV33(){
      applyCanvasRatio();
      baseDraw();
      if(!S.image||q('#outputRatio')?.value!=='4:5')return;
      const bg=getBg();
      const sourceH=Math.min(S.imageH||C.height,C.height);
      const snap=document.createElement('canvas');snap.width=C.width;snap.height=sourceH;
      snap.getContext('2d').drawImage(C,0,0,C.width,sourceH,0,0,C.width,sourceH);
      X.save();X.setTransform(1,0,0,1,0,0);X.globalAlpha=1;X.fillStyle=bg;X.fillRect(0,0,C.width,C.height);
      if(S.mode==='four'){
        const targetW=C.width*.94;const targetH=sourceH*(targetW/C.width);const x=C.width*.03;const y=C.width*.012;
        X.drawImage(snap,0,0,C.width,sourceH,x,y,targetW,targetH);
      }else{
        X.drawImage(snap,0,0,C.width,sourceH,0,0,C.width,sourceH);
        if(sourceH<C.height){X.fillStyle=bg;X.fillRect(0,sourceH,C.width,C.height-sourceH)}
      }
      X.restore();
      redrawLowerDecor();
    };
  }
  function addBackgroundControl(){
    const card=q('.decorate-card');if(!card||q('#decorBackground'))return;
    const help=card.querySelector('.editor-help');
    const row=document.createElement('label');row.className='color-control v33-background-control';
    row.innerHTML=`<span>하단 배경색</span><input id="decorBackground" type="color" value="${getBg()}"><output>${getBg().toUpperCase()}</output>`;
    help?.insertAdjacentElement('afterend',row);
    const input=q('#decorBackground');input.addEventListener('input',()=>{setBg(input.value);row.querySelector('output').textContent=input.value.toUpperCase();draw()});
  }
  function interceptExport(){
    const btn=q('#downloadImage');if(!btn)return;
    btn.addEventListener('click',async e=>{
      if(q('#outputRatio')?.value!=='4:5')return;
      e.preventDefault();e.stopImmediatePropagation();
      if(!S.image){alert('먼저 생성 이미지를 가져와주세요.');return}
      await document.fonts.ready;draw();
      C.toBlob(blob=>{
        if(!blob)return;S.finalBlob=blob;const image=q('#finalImage');
        if(image.dataset.objectUrl)URL.revokeObjectURL(image.dataset.objectUrl);
        const url=URL.createObjectURL(blob);image.dataset.objectUrl=url;image.src=url;q('#finalSaveCard').classList.remove('hidden');q('#finalSaveCard').scrollIntoView({behavior:'smooth',block:'center'});
      },'image/png',1);
    },true);
  }
  function authority(){
    q('#versionBadge')&&(q('#versionBadge').textContent=VERSION);q('#footerVersion')&&(q('#footerVersion').textContent=VERSION);
    q('#buildPrompt')&&(q('#buildPrompt').textContent='현재 V33 스타일로 프롬프트 새로 만들기');
    const badge=q('#promptEngineBadge');if(badge)badge.textContent='프롬프트 엔진 V33 · 현재 장면과 입력값으로 새로 작성됩니다.';
  }
  function install(){
    if(installed)return;installed=true;normalHeight=C.height;addBackgroundControl();installDraw();interceptExport();
    q('#outputRatio')?.addEventListener('change',()=>{applyCanvasRatio();draw()});
    q('#resultInput')?.addEventListener('change',()=>setTimeout(()=>{normalHeight=S.mode==='four'?(S.imageH||C.height):C.height;applyCanvasRatio();draw()},60));
    authority();window.addEventListener('pageshow',authority);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')authority()});
    if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=33.0').then(r=>r.update()).catch(()=>{});
    setTimeout(()=>{applyCanvasRatio();draw();authority()},0);
  }
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();