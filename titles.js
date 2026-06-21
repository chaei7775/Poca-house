// ════════════════════════════════
// 🏷️ 칭호 & 업적 시스템 (1차: 수집/성장/알바/NPC/제작/재조합/캐릭터EH)
// ════════════════════════════════

let titleStats = JSON.parse(localStorage.getItem('ph_titleStats') || '{}');
function saveTitleStats() { localStorage.setItem('ph_titleStats', JSON.stringify(titleStats)); }
function bumpTitleStat(key, amt) { titleStats[key] = (titleStats[key] || 0) + (amt || 1); saveTitleStats(); }

let unlockedTitles = JSON.parse(localStorage.getItem('ph_unlockedTitles') || '[]');
function saveUnlockedTitles() { localStorage.setItem('ph_unlockedTitles', JSON.stringify(unlockedTitles)); }
let equippedTitle = localStorage.getItem('ph_equippedTitle') || null;

function getTotalCardLevel() {
  const lv = JSON.parse(localStorage.getItem('ph_cardLevels') || '{}');
  return Object.values(lv).reduce(function(s, v) { return s + (v || 0); }, 0);
}
function hasAnyAffectionStage(stage) {
  if (typeof CHARS === 'undefined' || typeof getAffectionInfo !== 'function') return false;
  return Object.keys(CHARS).some(function(cid) { return getAffectionInfo(cid).stage === stage; });
}
function hasHiddenChar(charId) {
  return (typeof ownedHiddenCards !== 'undefined') && ownedHiddenCards.some(function(id) { return id.indexOf('hidden_' + charId + '_') === 0; });
}

const TITLES = [
  { id:'collect_10',  cat:'🎴 수집', name:'포카 입문자',   title:'수집가',         cond: function(){ return (typeof owned !== 'undefined' ? owned.length : 0) >= 10; } },
  { id:'collect_30',  cat:'🎴 수집', name:'신인 수집가',   title:'포카 애호가',     cond: function(){ return (typeof owned !== 'undefined' ? owned.length : 0) >= 30; } },
  { id:'collect_60',  cat:'🎴 수집', name:'베테랑 수집가', title:'전설의 수집가',   cond: function(){ return (typeof owned !== 'undefined' ? owned.length : 0) >= 60; } },
  { id:'collect_eh',  cat:'🎴 수집', name:'EH 카드 획득',  title:'운명의 선택자',   cond: function(){ return (typeof ownedHiddenCards !== 'undefined' ? ownedHiddenCards.length : 0) >= 1; } },

  { id:'grow_50',     cat:'⭐ 성장', name:'성장의 시작',   title:'새싹 천사',       cond: function(){ return getTotalCardLevel() >= 50; } },
  { id:'grow_300',    cat:'⭐ 성장', name:'추억 수집가',   title:'추억 수집가',     cond: function(){ return getTotalCardLevel() >= 300; } },
  { id:'grow_1000',   cat:'⭐ 성장', name:'포카 마스터',   title:'포카 마스터',     cond: function(){ return getTotalCardLevel() >= 1000; } },

  { id:'alba_1',      cat:'💰 알바', name:'첫 출근',       title:'신입 알바생',     cond: function(){ return (typeof albaDone !== 'undefined' ? albaDone : 0) >= 1; } },
  { id:'alba_100',    cat:'💰 알바', name:'성실한 알바생', title:'성실한 알바생',   cond: function(){ return (typeof albaDone !== 'undefined' ? albaDone : 0) >= 100; } },
  { id:'alba_1000',   cat:'💰 알바', name:'알바의 신',     title:'알바의 신',       cond: function(){ return (typeof albaDone !== 'undefined' ? albaDone : 0) >= 1000; } },

  { id:'npc_friend',  cat:'🧑‍🤝‍🧑 NPC', name:'좋은 친구',   title:'친절한 친구',   cond: function(){ return hasAnyAffectionStage('우호'); } },
  { id:'npc_trust',   cat:'🧑‍🤝‍🧑 NPC', name:'믿음',         title:'신뢰받는 자',   cond: function(){ return hasAnyAffectionStage('신뢰'); } },
  { id:'npc_bond',    cat:'🧑‍🤝‍🧑 NPC', name:'특별한 인연', title:'인연의 수집가', cond: function(){ return hasAnyAffectionStage('인연'); } },

  { id:'craft_1',         cat:'🔨 제작', name:'첫 제작',       title:'초보 장인',       cond: function(){ return ((titleStats.craftSuccess||0) + (titleStats.craftGreat||0)) >= 1; } },
  { id:'craft_great_10',  cat:'🔨 제작', name:'황금손',         title:'황금손',         cond: function(){ return (titleStats.craftGreat||0) >= 10; } },
  { id:'craft_great_100', cat:'🔨 제작', name:'공방의 지배자', title:'공방의 지배자', cond: function(){ return (titleStats.craftGreat||0) >= 100; } },

  { id:'rc_1',    cat:'🔮 재조합', name:'새로운 가능성',   title:'연금술 견습생',   cond: function(){ return (titleStats.recombineCount||0) >= 1; } },
  { id:'rc_100',  cat:'🔮 재조합', name:'수정구 중독자',   title:'수정구 중독자',   cond: function(){ return (titleStats.recombineCount||0) >= 100; } },
  { id:'rc_eh',   cat:'🔮 재조합', name:'기적',             title:'기적의 목격자',   cond: function(){ return (titleStats.recombineHidden||0) >= 1; } },

  { id:'eh_minjun', cat:'🎭 EH칭호', name:'민준의 EH 카드', title:'천공기사단 신입',     cond: function(){ return hasHiddenChar('minjun'); } },
  { id:'eh_sion',   cat:'🎭 EH칭호', name:'시온의 EH 카드', title:'재앙의 목격자',       cond: function(){ return hasHiddenChar('sion'); } },
  { id:'eh_doyun',  cat:'🎭 EH칭호', name:'도윤의 EH 카드', title:'금서관 출입 허가자', cond: function(){ return hasHiddenChar('doyun'); } },
  { id:'eh_harin',  cat:'🎭 EH칭호', name:'하린의 EH 카드', title:'별의 인도자',         cond: function(){ return hasHiddenChar('harin'); } },
  { id:'eh_yuna',   cat:'🎭 EH칭호', name:'윤아의 EH 카드', title:'황혼궁의 손님',      cond: function(){ return hasHiddenChar('yuna'); } },
  { id:'eh_ara',    cat:'🎭 EH칭호', name:'아라의 EH 카드', title:'흑요석 공방 견습생', cond: function(){ return hasHiddenChar('ara'); } },
];

function showTitleUnlockToast(t) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:1200;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFD700;color:#fff;border-radius:18px;padding:12px 20px;font-size:13px;font-weight:900;text-align:center;box-shadow:0 6px 24px #0005;pointer-events:none;line-height:1.5;max-width:88%;';
  el.innerHTML = '🏷️ 새 칭호 획득!<br><span style="color:#FFD700;">[' + t.title + ']</span>';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 2800);
}

function checkTitles() {
  let changed = false;
  TITLES.forEach(function(t) {
    if (unlockedTitles.indexOf(t.id) === -1) {
      try {
        if (t.cond()) {
          unlockedTitles.push(t.id);
          changed = true;
          showTitleUnlockToast(t);
        }
      } catch (e) { /* 관련 데이터가 아직 준비 안 됐으면 그냥 다음에 다시 체크 */ }
    }
  });
  if (changed) saveUnlockedTitles();
}

function equipTitle(titleId) {
  if (titleId && unlockedTitles.indexOf(titleId) === -1) return;
  equippedTitle = titleId || null;
  if (equippedTitle) localStorage.setItem('ph_equippedTitle', equippedTitle);
  else localStorage.removeItem('ph_equippedTitle');
  renderEquippedTitleBadge();
  openTitleOverlay();
}

function renderEquippedTitleBadge() {
  // 상단바에는 칭호를 표시하지 않음 (닉네임만 유지, 중복 방지)
  const old = document.getElementById('equipped-title-badge');
  if (old) old.remove();
  renderHomeTitleBadge();
}

function ensureTitleStyles() {
  if (document.getElementById('ph-title-style')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'ph-title-style';
  styleEl.textContent = `
    #home-title-badge {
      margin: -4px 42px 22px;
      text-align: center;
      position: relative;
      animation: phTitlePop .22s ease-out;
    }
    #home-title-badge .ph-title-nick {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 92px;
      max-width: 78%;
      padding: 2px 12px 4px;
      border-radius: 999px 999px 10px 10px;
      background: rgba(255,255,255,.70);
      color: #302635;
      font-size: 20px;
      line-height: 1.15;
      font-weight: 950;
      letter-spacing: -.04em;
      box-shadow: 0 6px 18px rgba(255,120,170,.12);
      backdrop-filter: blur(4px);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #home-title-badge .ph-title-ribbon {
      width: fit-content;
      max-width: 92%;
      margin: -1px auto 0;
      padding: 7px 18px 8px;
      border-radius: 999px;
      color: var(--title-text, #fff);
      background: var(--title-bg, linear-gradient(135deg,#ff7aab,#b26cff));
      border: 1.5px solid rgba(255,255,255,.82);
      box-shadow:
        0 8px 18px rgba(255,103,157,.18),
        inset 0 1px 0 rgba(255,255,255,.55),
        inset 0 -5px 12px rgba(0,0,0,.08);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: -.02em;
      line-height: 1;
      position: relative;
      text-shadow: 0 1px 1px rgba(0,0,0,.10);
      overflow: hidden;
    }
    #home-title-badge .ph-title-ribbon::before {
      content: '';
      position: absolute;
      inset: 1px 8px auto;
      height: 40%;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255,255,255,.45), rgba(255,255,255,0));
      pointer-events: none;
    }
    #home-title-badge .ph-title-spark {
      position: absolute;
      top: 21px;
      font-size: 12px;
      filter: drop-shadow(0 2px 2px rgba(255,145,190,.22));
      opacity: .95;
    }
    #home-title-badge .ph-title-spark.left { left: 18px; transform: rotate(-14deg); }
    #home-title-badge .ph-title-spark.right { right: 18px; transform: rotate(14deg); }
    @keyframes phTitlePop {
      from { transform: translateY(4px); opacity: .3; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(styleEl);
}

function escapeTitleHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>'"]/g, function(c) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c];
  });
}

function renderHomeTitleBadge() {
  const actions = document.querySelector('.home-actions');
  if (!actions) return;
  ensureTitleStyles();
  let badge = document.getElementById('home-title-badge');
  const t = TITLES.find(function(x) { return x.id === equippedTitle; });
  if (!t) {
    if (badge) badge.remove();
    return;
  }
  const style = CATEGORY_STYLE[t.cat] || { color:'#9333ea', bg:'linear-gradient(135deg,#ff7aab,#b26cff)', icon:'💖', text:'#fff' };
  const nick = (typeof localStorage !== 'undefined' && localStorage.getItem('ph_nickname')) || '플레이어';
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'home-title-badge';
    actions.parentNode.insertBefore(badge, actions);
  }
  badge.style.setProperty('--title-bg', style.bg);
  badge.style.setProperty('--title-text', style.text || '#fff');
  badge.innerHTML =
    '<div class="ph-title-nick">' + escapeTitleHtml(nick) + '</div>' +
    '<span class="ph-title-spark left">✦</span>' +
    '<span class="ph-title-spark right">✦</span>' +
    '<div class="ph-title-ribbon">' + style.icon + ' ' + escapeTitleHtml(t.title) + ' ' + style.icon + '</div>';
}

const CATEGORY_STYLE = {
  '🎴 수집':   { color:'#FF6B9D', bg:'linear-gradient(135deg,#ff78aa,#ffb2cf,#ffd5a7)', icon:'🎀', text:'#fff' },
  '⭐ 성장':   { color:'#F59E0B', bg:'linear-gradient(135deg,#f7b733,#ffd36b,#fff0b8)', icon:'⭐', text:'#6b3a00' },
  '💰 알바':   { color:'#FB923C', bg:'linear-gradient(135deg,#ff8a4c,#ffbd72,#ffe0a8)', icon:'🍔', text:'#fff' },
  '🧑‍🤝‍🧑 NPC': { color:'#60A5FA', bg:'linear-gradient(135deg,#63b3ff,#9ad8ff,#d9f0ff)', icon:'💙', text:'#16406b' },
  '🔨 제작':   { color:'#C084FC', bg:'linear-gradient(135deg,#b46cff,#d9a7ff,#ffe1f4)', icon:'🧵', text:'#fff' },
  '🔮 재조합': { color:'#9333ea', bg:'linear-gradient(135deg,#7c3aed,#c084fc,#f0abfc)', icon:'✨', text:'#fff' },
  '🎭 EH칭호': { color:'#FFD700', bg:'linear-gradient(135deg,#1b1235,#6d3bff,#ffd66b)', icon:'🪽', text:'#fff7cf' }
};

function openTitleOverlay() {
  const old = document.getElementById('title-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'title-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:980;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  const cats = [];
  TITLES.forEach(function(t) { if (cats.indexOf(t.cat) === -1) cats.push(t.cat); });

  let html = '<div style="width:100%;max-width:430px;margin:0 auto;max-height:80vh;overflow-y:auto;background:#1a1a2e;border-radius:24px 24px 0 0;padding:20px 16px 36px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
    '<div style="color:#fff;font-size:16px;font-weight:900;">🏷️ 칭호</div>' +
    '<button onclick="document.getElementById(\'title-overlay\').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:#fff;padding:6px 12px;cursor:pointer;">닫기</button></div>' +
    '<div style="font-size:11px;color:#aaa;margin-bottom:14px;">' + unlockedTitles.length + ' / ' + TITLES.length + ' 칭호 보유</div>' +
    '<button onclick="equipTitle(null)" style="width:100%;padding:10px;margin-bottom:14px;background:' + (equippedTitle ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#FF6B9D,#C084FC)') + ';border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">칭호 해제 (기본 닉네임만 표시)</button>';

  cats.forEach(function(cat) {
    const style = CATEGORY_STYLE[cat] || { color:'#9333ea', bg:'#F3E8FF', icon:'🏷️' };
    html += '<div style="font-size:12px;font-weight:900;color:' + style.color + ';margin:14px 0 8px;">' + cat + '</div>';
    TITLES.filter(function(t) { return t.cat === cat; }).forEach(function(t) {
      const unlocked = unlockedTitles.indexOf(t.id) !== -1;
      const equipped = equippedTitle === t.id;
      html += '<div style="position:relative;display:flex;align-items:center;justify-content:space-between;background:' + (unlocked ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.04)') + ';border:1.5px solid ' + (unlocked ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.12)') + ';border-left:5px solid ' + (unlocked ? style.color : 'rgba(255,255,255,0.15)') + ';border-radius:16px;padding:10px 12px 10px 14px;margin-bottom:9px;' + (equipped ? 'box-shadow:0 0 0 2px #FFD700;' : '') + '">' +
        (unlocked ? '<span style="position:absolute;top:-9px;left:10px;font-size:14px;background:' + style.bg + ';padding:0 4px;border-radius:50%;">' + style.icon + '</span>' : '') +
        '<div>' +
        '<div style="font-size:13px;font-weight:900;color:' + (unlocked ? '#222' : '#777') + ';margin-top:2px;">' + (unlocked ? '[' + t.title + ']' : '🔒 ???') + '</div>' +
        '<div style="font-size:10px;color:' + (unlocked ? '#666' : '#666') + ';margin-top:2px;">' + t.name + '</div></div>' +
        (unlocked ? '<button onclick="equipTitle(\'' + t.id + '\')" style="flex-shrink:0;padding:7px 12px;background:' + (equipped ? '#FFD700' : style.color) + ';border:none;border-radius:10px;color:' + (equipped ? '#1a1a2e' : '#fff') + ';font-size:11px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">' + (equipped ? '장착중' : '장착') + '</button>' : '') +
        '</div>';
    });
  });

  html += '</div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

// ── 제작 성공/대성공 카운트 (showSewingResult 후킹) ──
(function hookShowSewingResultForTitles() {
  if (typeof window.showSewingResult !== 'function') {
    setTimeout(hookShowSewingResultForTitles, 50);
    return;
  }
  const originalShowSewingResult = window.showSewingResult;
  window.showSewingResult = function(titleText) {
    if (titleText === '대성공!') bumpTitleStat('craftGreat');
    else if (titleText === '성공!') bumpTitleStat('craftSuccess');
    const result = originalShowSewingResult.apply(this, arguments);
    checkTitles();
    return result;
  };
})();

// ── 재조합 횟수/히든획득 카운트 (doRecombine 후킹) ──
(function hookDoRecombineForTitles() {
  if (typeof window.doRecombine !== 'function') {
    setTimeout(hookDoRecombineForTitles, 50);
    return;
  }
  const originalDoRecombine = window.doRecombine;
  window.doRecombine = function() {
    const beforeHidden = (typeof ownedHiddenCards !== 'undefined') ? ownedHiddenCards.length : 0;
    const result = originalDoRecombine.apply(this, arguments);
    bumpTitleStat('recombineCount');
    const afterHidden = (typeof ownedHiddenCards !== 'undefined') ? ownedHiddenCards.length : 0;
    if (afterHidden > beforeHidden) bumpTitleStat('recombineHidden');
    checkTitles();
    return result;
  };
})();

// ── 알바 미니게임에서 콤보 기록 갱신용: 다른 파일에서 recordTitleCombo(combo)를 호출하면 됨 ──
window.recordTitleCombo = function(combo) {
  combo = Number(combo || 0);
  if (combo > (titleStats.maxCombo || 0)) {
    titleStats.maxCombo = combo;
    saveTitleStats();
    checkTitles();
  }
};

// ── 더보기 메뉴에 칭호 버튼 추가 ──
(function hookOpenMoreMenuForTitles() {
  if (typeof window.openMoreMenu !== 'function') {
    setTimeout(hookOpenMoreMenuForTitles, 50);
    return;
  }
  const originalOpenMoreMenu = window.openMoreMenu;
  window.openMoreMenu = function() {
    const result = originalOpenMoreMenu.apply(this, arguments);
    const overlay = document.getElementById('more-menu-overlay');
    if (overlay && !document.getElementById('more-menu-title-btn')) {
      const list = overlay.querySelector('div > div:last-child');
      if (list) {
        const btn = document.createElement('button');
        btn.id = 'more-menu-title-btn';
        btn.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px;background:rgba(255,215,0,0.12);border:1.5px solid #FFD700;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;';
        btn.innerHTML = '<span style="font-size:24px;">🏷️</span> 칭호';
        btn.onclick = function() { overlay.remove(); openTitleOverlay(); };
        list.appendChild(btn);
      }
    }
    return result;
  };
})();

renderEquippedTitleBadge();
setTimeout(checkTitles, 2000);
setInterval(checkTitles, 5000);
