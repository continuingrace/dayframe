(() => {
  'use strict';

  const VERSION = 'V32';
  const DECOR_KEY = 'dayframe.decorate.v32';
  const OLD_DECOR_KEY = 'dayframe.decorate.v31';
  const numericProps = new Set(['opacity', 'size', 'spacing', 'line', 'x', 'y']);
  const fields = [['date', '날짜'], ['weather', '날씨'], ['memo', '짧은 메모'], ['signature', '시그니처']];
  const defaults = {
    ratio: '4:5',
    date: { text: '', x: 78, y: 86, color: '#5e5b55', opacity: 1, size: 28, spacing: 0, line: 1.2 },
    weather: { text: '', x: 12, y: 86, color: '#5e5b55', opacity: 1, size: 28, spacing: 0, line: 1.2 },
    memo: { text: '', x: 12, y: 92, color: '#5e5b55', opacity: 1, size: 30, spacing: 0, line: 1.3 },
    signature: { text: '', x: 78, y: 94, color: '#5e5b55', opacity: 1, size: 26, spacing: 0, line: 1.2 }
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const readDecor = () => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(DECOR_KEY) || localStorage.getItem(OLD_DECOR_KEY) || 'null'); } catch (_) {}
    const value = clone(defaults);
    if (saved) {
      value.ratio = saved.ratio || value.ratio;
      fields.forEach(([key]) => Object.assign(value[key], saved[key] || {}));
    }
    return value;
  };

  let decor = readDecor();
  let unified = false;
  let drag = null;
  let originalDraw = null;
  let installed = false;

  const q = selector => document.querySelector(selector);
  const qa = selector => [...document.querySelectorAll(selector)];
  const esc = value => String(value || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const saveDecor = () => {
    try { localStorage.setItem(DECOR_KEY, JSON.stringify(decor)); } catch (_) {}
  };
  const requestAutosave = () => document.dispatchEvent(new Event('change', { bubbles: true }));
  const activeText = () => S.texts[S.active];

  function editorMarkup() {
    return `<div class="editor-card v32-card">
      <label class="field-label first-label">폰트 · 글자색</label>
      <select id="fontFamily" class="text-field"><option value="Pretendard, sans-serif">Pretendard</option><option value="Apple SD Gothic Neo, sans-serif">Apple SD Gothic Neo</option><option value="AppleMyungjo, serif">AppleMyungjo</option></select>
      <label class="font-file-button" for="fontFileInput"><input id="fontFileInput" type="file" accept=".ttf,.otf,.woff,.woff2" hidden><span>파일 앱에서 폰트 선택</span></label>
      <label class="color-control"><span>글자 색</span><input id="fontColor" type="color" value="#20211f"><output id="fontColorValue">#20211F</output></label><small id="fontStatus" class="editor-help"></small>
    </div>
    <div class="editor-card v32-card"><div class="v32-title-row"><label class="field-label first-label">4컷 텍스트 스타일 통일</label><button id="styleUnify" type="button" class="toggle-button">OFF</button></div><p class="editor-help">ON이면 공통 스타일을 적용하고 컷별 내용·위치는 따로 유지합니다.</p></div>
    <div class="editor-card v32-card"><label class="field-label first-label">컷별 텍스트</label><select id="captionSelect" class="text-field"></select><textarea id="captionEdit" class="notes-field"></textarea></div>
    <div class="editor-card v32-card"><label class="field-label first-label">크기 · 자간 · 행간</label><label class="range-label">크기 <input id="fontSize" type="range" min="18" max="100"></label><label class="range-label">자간 <input id="letterSpacing" type="range" min="-3" max="20"></label><label class="range-label">행간 <input id="lineHeight" type="range" min="1" max="2.4" step=".1"></label></div>
    <div class="editor-card v32-card"><label class="field-label first-label">정렬 및 X/Y 위치</label><div class="segmented align-group"><button type="button" class="align" data-align="left">왼쪽</button><button type="button" class="align" data-align="center">가운데</button><button type="button" class="align" data-align="right">오른쪽</button></div><label class="range-label">X 위치 <input id="textX" type="range" min="0" max="100"></label><label class="range-label">Y 위치 <input id="textY" type="range" min="0" max="100"></label></div>
    <div class="editor-card v32-card"><label class="field-label first-label">형태</label><div class="segmented bubble-group"><button type="button" class="bubble-style" data-box="plain">글자만</button><button type="button" class="bubble-style" data-box="box">텍스트박스</button><button type="button" class="bubble-style" data-box="bubble">말풍선</button></div><label class="color-control"><span>박스 배경</span><input id="boxColor" type="color" value="#fffdf8"><output id="boxColorValue">#FFFDF8</output></label><label class="range-label">박스 투명도 <input id="boxOpacity" type="range" min="0" max="1" step=".05" value="1"></label><label class="color-control"><span>테두리 색</span><input id="borderColor" type="color" value="#20211f"><output id="borderColorValue">#20211F</output></label><label class="range-label">테두리 굵기 <input id="borderWidth" type="range" min="1" max="10"></label><label class="range-label">박스 여백 <input id="boxPadding" type="range" min="8" max="60"></label></div>
    <div id="noteEditorCard" class="editor-card v32-card"><label class="field-label first-label">그림 아래 지문</label><textarea id="noteText" class="notes-field"></textarea><label class="color-control"><span>지문 색</span><input id="noteColor" type="color" value="#20211f"><output id="noteColorValue">#20211F</output></label><label class="range-label">크기 <input id="noteSize" type="range" min="18" max="90"></label><label class="range-label">자간 <input id="noteSpacing" type="range" min="-3" max="20"></label><label class="range-label">행간 <input id="noteLineHeight" type="range" min="1" max="2.2" step=".1"></label><label class="range-label">X 위치 <input id="noteX" type="range" min="0" max="100"></label><label class="range-label">Y 위치 <input id="noteY" type="range" min="50" max="100"></label></div>
    <div class="editor-card v32-card decorate-card"><div class="v32-title-row"><label class="field-label first-label">5 꾸미기</label><select id="outputRatio" class="text-field"><option value="4:5">Instagram 4:5</option><option value="original">원본 비율</option></select></div><p class="editor-help">각 요소는 입력 즉시 반영되며 캔버스에서 직접 이동할 수 있습니다.</p><div id="decorateFields"></div></div>
    <button class="primary" id="downloadImage">완성 이미지 만들기</button><div class="final-save-card hidden" id="finalSaveCard"><strong>완성 이미지</strong><p>이미지를 길게 눌러 사진에 저장하거나 공유 메뉴를 여세요.</p><img id="finalImage" alt="Dayframe 완성 이미지"><button class="secondary" id="shareFinalImage" type="button">공유 메뉴 열기</button></div>`;
  }

  function decorMarkup() {
    return fields.map(([key, label]) => {
      const d = decor[key];
      return `<fieldset class="decorate-item" data-decor-kind="${key}"><legend>${label}</legend>
        <input class="decorate-text text-field" data-kind="${key}" value="${esc(d.text)}" placeholder="${label} 입력">
        <label class="color-control"><span>색상</span><input class="decorate-color" data-kind="${key}" type="color" value="${d.color}"><output>${d.color.toUpperCase()}</output></label>
        <label class="range-label">투명도 <input class="decorate-opacity" data-kind="${key}" type="range" min="0" max="1" step=".05" value="${d.opacity}"></label>
        <label class="range-label">크기 <input class="decorate-size" data-kind="${key}" type="range" min="14" max="70" value="${d.size}"></label>
        <label class="range-label">자간 <input class="decorate-spacing" data-kind="${key}" type="range" min="-3" max="20" value="${d.spacing}"></label>
        <label class="range-label">행간 <input class="decorate-line" data-kind="${key}" type="range" min="1" max="2.4" step=".1" value="${d.line}"></label>
        <div class="control-row position-row"><label class="range-label">X <input class="decorate-x" data-kind="${key}" type="range" min="0" max="100" value="${d.x}"></label><label class="range-label">Y <input class="decorate-y" data-kind="${key}" type="range" min="0" max="100" value="${d.y}"></label></div>
      </fieldset>`;
    }).join('');
  }

  function defaultText(text, index) {
    if (typeof def === 'function') return def(text, index);
    return { text, x: 50, y: 50, size: 42, spacing: 0, line: 1.4, color: '#20211f', font: 'Pretendard, sans-serif', align: 'center', valign: 'middle', box: 'plain', boxColor: '#fffdf8', boxOpacity: 1, borderColor: '#20211f', padding: 26, border: 3 };
  }

  function rebuildScenes() {
    const raw = q('#diaryText').value.trim();
    if (!raw) { alert('오늘의 기록을 먼저 적어주세요.'); return false; }
    const count = S.mode === 'four' ? 4 : 1;
    const parts = sentences(raw);
    const sceneValues = S.mode === 'single' ? [raw] : Array.from({ length: count }, (_, i) => parts[i] || '');
    const captionValues = S.mode === 'single' ? [raw] : Array.from({ length: count }, (_, i) => parts[i] || '');
    S.scenes = sceneValues;
    S.captions = captionValues;
    S.texts = captionValues.map((text, i) => defaultText(text, i));
    S.note = { ...S.note, text: captionValues[0] || '', x: S.note.x ?? 12, y: S.note.y ?? 80.5, width: S.note.width ?? 76 };
    S.active = 0;
    S._sceneSource = raw;
    S._sceneMode = S.mode;
    renderSceneFields();
    q('#highlightCard').classList.remove('hidden');
    syncFreshEditor();
    q('#finalPrompt').value = '';
    q('#finalPrompt').dataset.promptEngine = 'pending';
    requestAutosave();
    return true;
  }

  function renderSceneFields() {
    q('#sceneFields').innerHTML = S.scenes.map((scene, i) => `<div class="scene-card"><strong>${S.mode === 'four' ? `CUT ${i + 1}` : '1컷 그림일기'}</strong><label>장면 설명</label><textarea class="scene-input" data-i="${i}">${esc(scene)}</textarea><label>지문 · 완성본에 넣을 글</label><textarea class="caption-input" data-i="${i}">${esc(S.captions[i] || '')}</textarea></div>`).join('');
    qa('.scene-input').forEach(el => el.addEventListener('input', () => { S.scenes[+el.dataset.i] = el.value; requestAutosave(); }));
    qa('.caption-input').forEach(el => el.addEventListener('input', () => {
      const i = +el.dataset.i;
      S.captions[i] = el.value;
      if (S.texts[i]) S.texts[i].text = el.value;
      if (S.mode === 'single') S.note.text = el.value;
      syncFreshEditor();
      requestAutosave();
    }));
  }

  function syncFreshEditor() {
    const select = q('#captionSelect');
    if (!select) return;
    select.innerHTML = S.texts.map((_, i) => `<option value="${i}">${S.mode === 'four' ? `CUT ${i + 1}` : '그림 안 텍스트'}</option>`).join('');
    S.active = Math.min(S.active || 0, Math.max(0, S.texts.length - 1));
    select.value = S.active;
    q('#noteEditorCard').classList.toggle('hidden', S.mode !== 'single');
    q('#noteText').value = S.note.text || '';
    controls();
    draw();
  }

  function setText(prop, value) {
    const text = activeText();
    if (!text) return;
    const number = ['size', 'spacing', 'line', 'x', 'y', 'border', 'padding', 'boxOpacity'].includes(prop);
    text[prop] = number ? +value : value;
    if (unified && S.mode === 'four' && !['text', 'x', 'y'].includes(prop)) S.texts.forEach(item => { item[prop] = text[prop]; });
    draw();
    requestAutosave();
  }

  function setControl(id, value) { const el = q('#' + id); if (el && value != null) el.value = value; }
  function controls() {
    const text = activeText();
    if (!text) return;
    [['captionEdit', text.text], ['fontFamily', text.font], ['fontColor', text.color], ['fontSize', text.size], ['letterSpacing', text.spacing], ['lineHeight', text.line], ['textX', text.x], ['textY', text.y], ['boxColor', text.boxColor], ['boxOpacity', text.boxOpacity ?? 1], ['borderColor', text.borderColor], ['boxPadding', text.padding], ['borderWidth', text.border]].forEach(([id, value]) => setControl(id, value));
    setControl('captionSelect', S.active);
    setControl('noteText', S.note.text || ''); setControl('noteColor', S.note.color); setControl('noteSize', S.note.size); setControl('noteSpacing', S.note.spacing); setControl('noteLineHeight', S.note.line); setControl('noteX', S.note.x ?? 12); setControl('noteY', S.note.y ?? 80.5);
    qa('.align').forEach(el => el.classList.toggle('active', el.dataset.align === text.align));
    qa('.bubble-style').forEach(el => el.classList.toggle('active', el.dataset.box === text.box));
    updateColorOutputs();
  }

  function updateColorOutputs() {
    qa('.color-control input[type="color"]').forEach(input => { const out = input.parentElement.querySelector('output'); if (out) out.textContent = input.value.toUpperCase(); });
  }

  async function loadUserFont(file) {
    if (!file) return;
    const status = q('#fontStatus');
    try {
      const name = `DayframeUserFont${Date.now()}`;
      const face = new FontFace(name, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      setText('font', `"${name}"`);
      q('#fontFamily').insertAdjacentHTML('beforeend', `<option value="&quot;${name}&quot;">${esc(file.name)}</option>`);
      q('#fontFamily').value = `"${name}"`;
      status.textContent = `✓ ${file.name} 적용됨`;
      await document.fonts.ready;
      draw();
    } catch (error) {
      status.textContent = '이 폰트 파일을 불러오지 못했습니다.';
      console.warn('Dayframe font load failed', error);
    }
  }

  function wireEditor() {
    q('#captionSelect').addEventListener('change', event => { S.active = +event.target.value; controls(); });
    q('#captionEdit').addEventListener('input', event => { setText('text', event.target.value); S.captions[S.active] = event.target.value; });
    [['fontColor', 'color'], ['fontSize', 'size'], ['letterSpacing', 'spacing'], ['lineHeight', 'line'], ['textX', 'x'], ['textY', 'y'], ['boxColor', 'boxColor'], ['boxOpacity', 'boxOpacity'], ['borderColor', 'borderColor'], ['boxPadding', 'padding'], ['borderWidth', 'border']].forEach(([id, prop]) => q('#' + id).addEventListener('input', event => { setText(prop, event.target.value); updateColorOutputs(); }));
    q('#fontFamily').addEventListener('change', event => setText('font', event.target.value));
    q('#fontFileInput').addEventListener('change', event => loadUserFont(event.target.files[0]));
    qa('.align').forEach(button => button.addEventListener('click', () => setText('align', button.dataset.align)));
    qa('.bubble-style').forEach(button => button.addEventListener('click', () => setText('box', button.dataset.box)));
    q('#styleUnify').addEventListener('click', event => { unified = !unified; event.currentTarget.textContent = unified ? 'ON' : 'OFF'; event.currentTarget.classList.toggle('on', unified); if (unified && activeText()) ['font', 'color', 'size', 'spacing', 'line', 'box', 'boxColor', 'boxOpacity', 'borderColor', 'padding', 'border'].forEach(prop => S.texts.forEach(item => { item[prop] = activeText()[prop]; })); draw(); requestAutosave(); });
    [['noteText', 'text'], ['noteColor', 'color'], ['noteSize', 'size'], ['noteSpacing', 'spacing'], ['noteLineHeight', 'line'], ['noteX', 'x'], ['noteY', 'y']].forEach(([id, prop]) => q('#' + id).addEventListener('input', event => { S.note[prop] = ['size', 'spacing', 'line', 'x', 'y'].includes(prop) ? +event.target.value : event.target.value; updateColorOutputs(); draw(); requestAutosave(); }));
    q('#outputRatio').addEventListener('change', event => { decor.ratio = event.target.value; saveDecor(); draw(); });
    qa('#decorateFields input').forEach(input => input.addEventListener('input', event => {
      const key = event.target.dataset.kind;
      const match = [...event.target.classList].find(name => name.startsWith('decorate-'));
      const prop = match.replace('decorate-', '');
      decor[key][prop] = numericProps.has(prop) ? +event.target.value : event.target.value;
      updateColorOutputs(); saveDecor(); draw();
    }));
  }

  function drawLetterSpaced(ctx, text, x, y, maxWidth, item, font) {
    if (!text) return;
    ctx.save(); ctx.globalAlpha = item.opacity ?? 1; ctx.fillStyle = item.color; ctx.font = `${item.size}px ${font}`; ctx.textBaseline = 'top';
    const paragraphs = String(text).split('\n');
    paragraphs.forEach((line, row) => {
      const chars = [...line];
      const width = chars.reduce((sum, ch, i) => sum + ctx.measureText(ch).width + (i ? item.spacing : 0), 0);
      let xx = item.x < 50 ? x : x - Math.min(width, maxWidth);
      chars.forEach((ch, i) => { if (i) xx += item.spacing; ctx.fillText(ch, xx, y + row * item.size * item.line); xx += ctx.measureText(ch).width; });
    });
    ctx.restore();
  }

  function drawDecorations(ctx, width, height) {
    const font = activeText()?.font || 'Pretendard, sans-serif';
    fields.forEach(([key]) => { const item = decor[key]; drawLetterSpaced(ctx, item.text, width * item.x / 100, height * item.y / 100, width * .86, item, font); });
  }

  function installDraw() {
    const baseDrawText = drawText;
    drawText = function drawTextV32(text) {
      if (text?.box !== 'plain' && text?.boxOpacity != null && text.boxOpacity < 1) {
        const hex = String(text.boxColor || '#fffdf8').replace('#', '');
        const full = hex.length === 3 ? [...hex].map(ch => ch + ch).join('') : hex;
        const red = parseInt(full.slice(0, 2), 16), green = parseInt(full.slice(2, 4), 16), blue = parseInt(full.slice(4, 6), 16);
        return baseDrawText({ ...text, boxColor: `rgba(${red},${green},${blue},${text.boxOpacity})` });
      }
      return baseDrawText(text);
    };
    originalDraw = draw;
    draw = function drawV32() {
      originalDraw();
      drawDecorations(X, C.width, C.height);
      q('.canvas-wrap')?.classList.toggle('portrait-preview', decor.ratio === '4:5');
    };
  }

  function canvasPoint(event) { const rect = C.getBoundingClientRect(); return { x: (event.clientX - rect.left) * C.width / rect.width, y: (event.clientY - rect.top) * C.height / rect.height }; }
  function findTarget(point) {
    for (const [key] of [...fields].reverse()) {
      const item = decor[key]; if (!item.text) continue;
      const x = C.width * item.x / 100, y = C.height * item.y / 100;
      if (Math.hypot(point.x - x, point.y - y) < Math.max(44, item.size * 2.4)) return { kind: 'decor', key, ox: item.x, oy: item.y };
    }
    const text = activeText();
    if (text) { const x = C.width * text.x / 100, y = C.height * text.y / 100; if (Math.hypot(point.x - x, point.y - y) < Math.max(60, text.size * 2.5)) return { kind: 'text', index: S.active, ox: text.x, oy: text.y }; }
    if (S.mode === 'single' && S.note.text) { const x = C.width * (S.note.x ?? 12) / 100, y = C.height * (S.note.y ?? 80.5) / 100; if (Math.hypot(point.x - x, point.y - y) < Math.max(70, S.note.size * 3)) return { kind: 'note', ox: S.note.x ?? 12, oy: S.note.y ?? 80.5 }; }
    return null;
  }

  function wireCanvasDrag() {
    C.style.touchAction = 'none';
    C.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse' && event.button !== 0) return; const start = canvasPoint(event); const target = findTarget(start); if (!target) return; drag = { ...target, pointerId: event.pointerId, start }; try { C.setPointerCapture(event.pointerId); } catch (_) {} event.preventDefault(); event.stopImmediatePropagation(); }, true);
    C.addEventListener('pointermove', event => { if (!drag || event.pointerId !== drag.pointerId) return; const point = canvasPoint(event); const x = Math.max(0, Math.min(100, drag.ox + (point.x - drag.start.x) / C.width * 100)); const y = Math.max(0, Math.min(100, drag.oy + (point.y - drag.start.y) / C.height * 100)); if (drag.kind === 'decor') { decor[drag.key].x = x; decor[drag.key].y = y; setControlForDecor(drag.key, 'x', x); setControlForDecor(drag.key, 'y', y); saveDecor(); } else if (drag.kind === 'text') { S.texts[drag.index].x = x; S.texts[drag.index].y = y; setControl('textX', x); setControl('textY', y); } else { S.note.x = x; S.note.y = y; setControl('noteX', x); setControl('noteY', y); } draw(); event.preventDefault(); event.stopImmediatePropagation(); }, true);
    const end = event => { if (!drag || event.pointerId !== drag.pointerId) return; try { C.releasePointerCapture(event.pointerId); } catch (_) {} drag = null; requestAutosave(); event.preventDefault(); event.stopImmediatePropagation(); };
    C.addEventListener('pointerup', end, true); C.addEventListener('pointercancel', end, true);
  }
  function setControlForDecor(key, prop, value) { const el = q(`.decorate-${prop}[data-kind="${key}"]`); if (el) el.value = value; }

  function outputCanvas() {
    const out = document.createElement('canvas');
    out.width = C.width;
    out.height = decor.ratio === '4:5' ? Math.round(C.width * 1.25) : C.height;
    const ctx = out.getContext('2d'); ctx.fillStyle = '#f6f3ec'; ctx.fillRect(0, 0, out.width, out.height);
    const scale = Math.min(out.width / C.width, out.height / C.height); const width = C.width * scale, height = C.height * scale;
    ctx.drawImage(C, (out.width - width) / 2, (out.height - height) / 2, width, height);
    return out;
  }

  async function finishImage() {
    if (!S.image) { alert('먼저 생성 이미지를 가져와주세요.'); return; }
    await document.fonts.ready; draw();
    S.finalBlob = await new Promise((resolve, reject) => outputCanvas().toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG export failed')), 'image/png', 1));
    const url = URL.createObjectURL(S.finalBlob); const image = q('#finalImage'); if (image.dataset.objectUrl) URL.revokeObjectURL(image.dataset.objectUrl); image.dataset.objectUrl = url; image.src = url; q('#finalSaveCard').classList.remove('hidden'); q('#finalSaveCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function shareImage() {
    if (!S.finalBlob) return;
    const file = new File([S.finalBlob], `dayframe-${Date.now()}.png`, { type: 'image/png' });
    try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Dayframe 완성본' }); } catch (_) {}
  }

  function applyVersion() {
    q('#versionBadge').textContent = VERSION; q('#footerVersion').textContent = VERSION;
    q('#buildPrompt').textContent = '현재 V32 스타일로 프롬프트 새로 만들기';
    let badge = q('#promptEngineBadge'); if (!badge) { badge = document.createElement('p'); badge.id = 'promptEngineBadge'; badge.className = 'copy-status'; q('#finalPrompt').insertAdjacentElement('afterend', badge); }
    badge.textContent = '프롬프트 엔진 V32 · 현재 장면과 입력값으로 새로 작성됩니다.';
  }

  function install() {
    if (installed) return; installed = true;
    q('.editor-controls').innerHTML = editorMarkup(); q('#decorateFields').innerHTML = decorMarkup(); q('#outputRatio').value = decor.ratio;
    installDraw(); wireEditor(); wireCanvasDrag();
    q('#makeHighlight').onclick = rebuildScenes;
    q('#buildPrompt').addEventListener('click', () => { if (q('#diaryText').value.trim() !== S._sceneSource || S.mode !== S._sceneMode) rebuildScenes(); setTimeout(applyVersion, 0); }, true);
    q('#downloadImage').onclick = event => { event.preventDefault(); finishImage(); };
    q('#shareFinalImage').onclick = shareImage;
    syncFreshEditor(); applyVersion(); updateColorOutputs();
    window.addEventListener('pageshow', applyVersion);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=32.0').then(reg => reg.update()).catch(() => {});
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', install, { once: true }); else install();
})();
