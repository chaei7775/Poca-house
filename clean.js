// ════════════════════════════════
// 🧹 포카하우스 청소 알바
// ════════════════════════════════

const CLEAN_TOOLS = [
  { id:'broom',  emoji:'🧹', label:'빗자루' },
  { id:'trash',  emoji:'🗑️', label:'쓰레기통' },
  { id:'sponge', emoji:'🧽', label:'스펀지' },
  { id:'bucket', emoji:'🪣', label:'물통' },
  { id:'tongs',  emoji:'🧤', label:'집게' },
  { id:'spray',  emoji:'✨', label:'정화스프레이' }
];

const CLEAN_OBJECTS = {
  broom:  [ {emoji:'💨', label:'먼지'}, {emoji:'🕸️', label:'거미줄'}, {emoji:'➿', label:'머리카락'} ],
  trash:  [ {emoji:'📰', label:'종이조각'}, {emoji:'🥤', label:'음료컵'}, {emoji:'🍟', label:'과자봉지'} ],
  sponge: [ {emoji:'💢', label:'얼룩'}, {emoji:'☕', label:'커피자국'}, {emoji:'👟', label:'발자국'} ],
  bucket: [ {emoji:'💧', label:'물웅덩이'}, {emoji:'🥔', label:'진흙'}, {emoji:'🐾', label:'흙자국'} ],
  tongs:  [ {emoji:'🔻', label:'깨진유리'}, {emoji:'📌', label:'압정'}, {emoji:'🪛', label:'못'} ],
  spray:  [ {emoji:'🦋', label:'그림자나비'}, {emoji:'🕷️', label:'그림자거미'}, {emoji:'🦇', label:'그림자박쥐'} ]
};

const CLEAN_TOOL_COLORS = {
  broom:  '#A0784D',
  trash:  '#FF9F43',
  sponge: '#A855F7',
  bucket: '#3B9CFF',
  tongs:  '#FF5C5C',
  spray:  '#7C3AED'
};

const CLEAN_DIFFICULTIES = {
  easy:   { label:'초급', toolCount:2, objCount:6,  time:12, hitBase:100, mult:1 },
  normal: { label:'중급', toolCount:4, objCount:12, time:20, hitBase:60,  mult:1.3 },
  hard:   { label:'고급', toolCount:6, objCount:18, time:40, hitBase:50,  mult:1.7 }
};
const CLEAN_COMBO_STEP = 0.2; // 콤보 1당 +20%

let cleanState = null; // { diff, tools, objects:[{id,toolId,emoji,x,y,el,done}], selectedTool, mistakes, timer, totalTime }

function openCleanAlba() {
  if (!document.getElementById('clean-style')) {
    const st = document.createElement('style');
    st.id = 'clean-style';
    st.textContent = '@keyframes cleanCoinFloat { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.7);} 20%{opacity:1;} 100%{opacity:0;transform:translate(-50%,-160%) scale(1.1);} }';
    document.head.appendChild(st);
  }
  if (isAlbaPenaltyActive && isAlbaPenaltyActive(true)) return;
  const old = document.getElementById('clean-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'clean-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#1a1a2e;display:flex;align-items:center;justify-content:center;padding:20px;';

  overlay.innerHTML = '<div style="width:100%;max-width:360px;background:#fff;border-radius:22px;padding:24px 20px;text-align:center;">' +
    '<div style="font-size:40px;margin-bottom:8px;">🧹</div>' +
    '<div style="font-size:17px;font-weight:900;color:#222;margin-bottom:4px;">포카하우스 청소 알바</div>' +
    '<div style="font-size:12px;color:#888;margin-bottom:18px;">올바른 도구로 오브젝트를 제거해보세요!</div>' +
    Object.keys(CLEAN_DIFFICULTIES).map(function(key) {
      const d = CLEAN_DIFFICULTIES[key];
      return '<button onclick="startCleanGame(\'' + key + '\')" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:13px 16px;margin-bottom:9px;background:#FFF0F5;border:1.5px solid #FFB3CC;border-radius:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">' +
        '<span style="font-size:14px;font-weight:900;color:#FF6B9D;">' + d.label + '</span>' +
        '<span style="font-size:11px;color:#888;">도구' + d.toolCount + ' · 오브젝트' + d.objCount + ' · ' + d.time + '초</span></button>';
    }).join('') +
    '<button onclick="document.getElementById(\'clean-overlay\').remove()" style="width:100%;padding:10px;background:#f3f3f3;border:none;border-radius:12px;color:#888;font-size:13px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">나가기</button>' +
    '</div>';
  document.body.appendChild(overlay);
}

function startCleanGame(diffKey) {
  const diff = CLEAN_DIFFICULTIES[diffKey];
  const tools = CLEAN_TOOLS.slice(0, diff.toolCount);

  // 오브젝트 생성 (사용 가능한 도구 풀에서만, 위치 중복 방지, 바닥 우선)
  const objects = [];
  const usedSpots = [];
  function farEnough(x, y) {
    return usedSpots.every(function(p) { return Math.hypot(p.x - x, p.y - y) > 13; });
  }
  for (let i = 0; i < diff.objCount; i++) {
    const tool = tools[Math.floor(Math.random() * tools.length)];
    const pool = CLEAN_OBJECTS[tool.id];
    const obj = pool[Math.floor(Math.random() * pool.length)];
    let x, y, tries = 0;
    do {
      x = 10 + Math.random() * 80;
      y = (Math.random() < 0.78) ? (40 + Math.random() * 48) : (12 + Math.random() * 22); // 바닥 우선, 가끔 가구위
      tries++;
    } while (!farEnough(x, y) && tries < 30);
    usedSpots.push({ x: x, y: y });
    objects.push({ id: 'cleanobj_' + i, toolId: tool.id, emoji: obj.emoji, label: obj.label, x: x, y: y, done: false });
  }

  cleanState = { diff: diff, diffKey: diffKey, tools: tools, objects: objects, selectedTool: tools[0].id, mistakes: 0, combo: 0, earnedCoins: 0, totalTime: diff.time, timeLeft: diff.time, timerInterval: null };

  renderCleanGameScreen();
}

function renderCleanGameScreen() {
  const old = document.getElementById('clean-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'clean-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:#1a1a2e;display:flex;flex-direction:column;';

  overlay.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(0,0,0,0.5);flex-shrink:0;">' +
    '<div style="color:#fff;font-size:13px;font-weight:900;">🧹 ' + cleanState.diff.label + '</div>' +
    '<div id="clean-timer-text" style="color:#FFD700;font-size:14px;font-weight:900;">⏱️ ' + cleanState.timeLeft + 's</div>' +
    '<div id="clean-mistake-text" style="color:#ff8a8a;font-size:12px;font-weight:700;">실수 0</div>' +
    '</div>' +
    '<div id="clean-combo-display" style="text-align:center;padding:4px 0;font-size:13px;font-weight:900;color:#FFD700;flex-shrink:0;min-height:20px;"></div>' +
    '<div id="clean-timer-bar-wrap" style="height:6px;background:rgba(255,255,255,0.15);flex-shrink:0;"><div id="clean-timer-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#FF6B9D,#C084FC);transition:width 0.2s linear;"></div></div>' +
    '<div id="clean-play-area" style="flex:1;position:relative;background:url(\'https://raw.githubusercontent.com/chaei7775/Poca-house/main/clean-living-bg.png\') center/cover; overflow:hidden;"></div>' +
    '<div id="clean-tool-bar" style="display:flex;gap:8px;padding:12px 14px;background:rgba(0,0,0,0.55);flex-shrink:0;overflow-x:auto;"></div>';

  document.body.appendChild(overlay);

  const area = document.getElementById('clean-play-area');
  cleanState.objects.forEach(function(obj) {
    const el = document.createElement('div');
    el.id = obj.id;
    el.style.cssText = 'position:absolute;left:' + obj.x + '%;top:' + obj.y + '%;transform:translate(-50%,-50%);font-size:38px;cursor:pointer;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.5));';
    el.textContent = obj.emoji;
    el.onclick = function() { handleCleanObjectTap(obj.id); };
    area.appendChild(el);
  });

  const toolBar = document.getElementById('clean-tool-bar');
  cleanState.tools.forEach(function(tool) {
    const btn = document.createElement('button');
    btn.id = 'clean-tool-' + tool.id;
    btn.onclick = function() { selectCleanTool(tool.id); };
    btn.style.cssText = 'flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 14px;border-radius:14px;border:2px solid ' + (tool.id === cleanState.selectedTool ? '#FFD700' : 'rgba(255,255,255,0.25)') + ';background:' + (tool.id === cleanState.selectedTool ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.08)') + ';color:#fff;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;';
    btn.innerHTML = '<span style="font-size:24px;">' + tool.emoji + '</span><span style="font-size:10px;font-weight:700;">' + tool.label + '</span>';
    toolBar.appendChild(btn);
  });

  cleanState.timerInterval = setInterval(function() {
    cleanState.timeLeft -= 0.2;
    const pct = Math.max(0, cleanState.timeLeft / cleanState.totalTime * 100);
    const bar = document.getElementById('clean-timer-bar');
    const timerText = document.getElementById('clean-timer-text');
    if (bar) bar.style.width = pct + '%';
    if (timerText) timerText.textContent = '⏱️ ' + Math.max(0, Math.ceil(cleanState.timeLeft)) + 's';
    if (cleanState.timeLeft <= 0) {
      endCleanGame();
    }
  }, 200);
}

function selectCleanTool(toolId) {
  cleanState.selectedTool = toolId;
  cleanState.tools.forEach(function(tool) {
    const btn = document.getElementById('clean-tool-' + tool.id);
    if (!btn) return;
    const active = tool.id === toolId;
    btn.style.border = '2px solid ' + (active ? '#FFD700' : 'rgba(255,255,255,0.25)');
    btn.style.background = active ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.08)';
  });
}

function handleCleanObjectTap(objId) {
  const obj = cleanState.objects.find(function(o) { return o.id === objId; });
  if (!obj || obj.done) return;
  const el = document.getElementById(objId);
  if (obj.toolId === cleanState.selectedTool) {
    obj.done = true;
    cleanState.combo++;
    const hitValue = Math.round(cleanState.diff.hitBase * (1 + CLEAN_COMBO_STEP * (cleanState.combo - 1)));
    cleanState.earnedCoins += hitValue;

    const comboEl = document.getElementById('clean-combo-display');
    if (comboEl) {
      comboEl.textContent = cleanState.combo >= 2 ? '🔥 ' + cleanState.combo + ' COMBO' : '';
    }

    if (el) {
      el.onclick = null;
      el.style.pointerEvents = 'none';
      el.style.transition = 'transform 0.18s, opacity 0.18s';
      el.style.transform = 'translate(-50%,-50%) scale(1.6)';
      el.style.opacity = '0';
      setTimeout(function() {
        const stillThere = document.getElementById(objId);
        if (stillThere && stillThere.parentNode) stillThere.parentNode.removeChild(stillThere);
      }, 200);

      // 떠오르는 +코인 효과
      const popup = document.createElement('div');
      const popupScale = Math.min(1.6, 1 + cleanState.combo * 0.04);
      popup.style.cssText = 'position:absolute;left:' + obj.x + '%;top:' + obj.y + '%;transform:translate(-50%,-50%) scale(' + popupScale + ');font-size:16px;font-weight:900;color:#FFD700;text-shadow:0 2px 4px rgba(0,0,0,0.6);pointer-events:none;animation:cleanCoinFloat 0.7s ease-out forwards;z-index:50;';
      popup.textContent = '+' + hitValue;
      const area = document.getElementById('clean-play-area');
      if (area) area.appendChild(popup);
      setTimeout(function() { if (popup.parentNode) popup.remove(); }, 700);
    }
    if (typeof recordAlbaAttempt === 'function') recordAlbaAttempt(true, 'clean');
    if (cleanState.objects.every(function(o) { return o.done; })) {
      endCleanGame();
    }
  } else {
    cleanState.mistakes++;
    cleanState.combo = 0;
    const comboEl = document.getElementById('clean-combo-display');
    if (comboEl) comboEl.textContent = '';
    const mistakeText = document.getElementById('clean-mistake-text');
    if (mistakeText) mistakeText.textContent = '실수 ' + cleanState.mistakes;
    if (el) {
      el.style.transition = 'transform 0.15s';
      el.style.transform = 'translate(-50%,-50%) scale(0.85) rotate(-8deg)';
      setTimeout(function() { if (el) el.style.transform = 'translate(-50%,-50%)'; }, 150);
    }
    if (typeof recordAlbaAttempt === 'function') recordAlbaAttempt(false, 'clean');
  }
}

function endCleanGame() {
  if (cleanState.timerInterval) { clearInterval(cleanState.timerInterval); cleanState.timerInterval = null; }
  const mistakes = cleanState.mistakes;
  let grade = 'GOOD';
  if (mistakes === 0) grade = 'PERFECT';
  else if (mistakes <= 2) grade = 'GREAT';
  const earn = cleanState.earnedCoins;

  coins += earn;
  albaDone++;
  saveAll();
  if (typeof addPlayerExp === 'function') addPlayerExp(15);
  if (typeof checkWishFragment === 'function') checkWishFragment(0.005);
  if (typeof checkQuestProgress === 'function') checkQuestProgress('first_alba');

  const gradeColor = grade === 'PERFECT' ? '#FFD700' : (grade === 'GREAT' ? '#FF6B9D' : '#9333ea');
  const gradeEmoji = grade === 'PERFECT' ? '🌟' : (grade === 'GREAT' ? '✨' : '🧹');

  const overlay = document.getElementById('clean-overlay');
  if (overlay) {
    overlay.innerHTML = '<div style="width:100%;max-width:360px;margin:0 auto;align-self:center;background:#fff;border-radius:22px;padding:28px 22px;text-align:center;">' +
      '<div style="font-size:48px;margin-bottom:8px;">' + gradeEmoji + '</div>' +
      '<div style="font-size:22px;font-weight:900;color:' + gradeColor + ';margin-bottom:6px;">' + grade + '!</div>' +
      '<div style="font-size:13px;color:#888;margin-bottom:18px;">실수 ' + mistakes + '회</div>' +
      '<div style="font-size:16px;font-weight:900;color:#222;margin-bottom:18px;">🍔 +' + earn + ' 코인</div>' +
      '<button onclick="document.getElementById(\'clean-overlay\').remove();openCleanAlba();" style="width:100%;padding:13px;margin-bottom:9px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">한 번 더!</button>' +
      '<button onclick="document.getElementById(\'clean-overlay\').remove();" style="width:100%;padding:11px;background:#f3f3f3;border:none;border-radius:14px;color:#888;font-size:13px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">나가기</button>' +
      '</div>';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
  }
  if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
}
