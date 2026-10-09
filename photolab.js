// ════════════════════════════════
// 📷 시크릿 포토랩 (photolab.js)  —  프리미엄 현상 / 현상 효과
//
// 공연장(broadcast-expedition.js)에서 이벤트 20번을 채우면 열리는 앵콜 스테이지에서 들어온다.
// 가진 프리미엄 카드를 골라 '현상'하면 슬롯 3칸에 랜덤 효과가 붙는다. (필름 🎞️ + 코인)
// 효과는 broadcast-expedition.js 의 원정에 바로 적용된다 (window.getEngraveBonus).
//
// 저장: localStorage 'ph_engrave' (ph_ 로 시작해서 클라우드 저장에 자동 포함)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var STORE = 'ph_engrave';
  var PREMIUM_STORE = 'ph_premiumCards';
  var FILM_NAME = '필름', FILM_EMOJI = '🎞️';
  var BASE_COIN = 30000;          // 현상 1번(잠금 없음) 코인
  var BASE_FILM = 1;              // 현상 1번(잠금 없음) 필름
  // ── 옵션 강화 (현상액 🧪) ──  센터/컴백/연습생 칸만, 실패하면 재료·코인만 사라지고 단계는 그대로, 다시 현상하면 그 칸의 강화는 사라짐(🔒 잠근 칸은 유지)
  var DEV_NAME = '현상액', DEV_EMOJI = '🧪';
  var ENH_MAX = 5;                // 최대 +5강
  var ENH_RATE = [70, 50, 35, 20, 10];   // 성공 확률(%) — 왼쪽부터 +1강, +2강, +3강, +4강, +5강 도전 (숫자만 고치면 됨)
  var ENH_STEP = 0.10;            // 1강마다 효과 +10% (예: 센터 코인 +30% → +5강 +45%)
  var ENH_DEV_PER = 1;            // 현상액: (지금 강화 단계 + 1) × 이 값  → +1강 1개, +2강 2개 … +5강 5개 (전부 15개)
  var ENH_COIN_PER = 20000;       // 코인: (지금 강화 단계 + 1) × 이 값
  var LOCK_ADD = 1;               // 슬롯 하나 잠글 때마다 비용이 기본의 몇 배 더해지는지 (1 = 잠금 1개면 2배)
  var ESC_STEP = 0.10, ESC_MAX = 3;   // 카드마다 현상할 때마다 코인 +10%, 최대 3배
  var IMG_BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var BUST = '?v=' + Date.now();
  var NAMES = { minjun: '민준', sion: '시온', doyun: '도윤', harin: '하린', yuna: '유나', ara: '아라' };
  var COLORS = { minjun: '#F59E0B', sion: '#6366F1', doyun: '#9D6B2A', harin: '#7C3AED', yuna: '#EC4899', ara: '#DC2626' };

  // 등급: 한 칸마다 따로 뽑는다 (합계 100)
  var GRADES = [
    { id: 'center',   name: '센터',   color: '#FFD700', w: 5 },
    { id: 'comeback', name: '컴백',   color: '#C084FC', w: 20 },
    { id: 'trainee',  name: '연습생', color: '#7dd3fc', w: 40 },
    { id: 'rumor',    name: '구설수', color: '#f87171', w: 20 },
    { id: 'black',    name: '흑역사', color: '#9ca3af', w: 15 }
  ];
  function gradeOf(id) { for (var i = 0; i < GRADES.length; i++) if (GRADES[i].id === id) return GRADES[i]; return GRADES[2]; }

  // 효과 목록. v = 등급별 값(센터/컴백/연습생), bad = 구설수 값. 값은 비율(0.2 = 20%)
  // text(v): 슬롯에 보여줄 문구
  function pct(v) { return Math.round(Math.abs(v) * 100) + '%'; }
  var OPTS = [
    { key: 'stamina', icon: '⚡', name: '스태미나 절약', bad: 0.10, v: { center: -0.20, comeback: -0.10, trainee: -0.05 },
      text: function (v) { return v < 0 ? '이벤트 스태미나 -' + pct(v) : '이벤트 스태미나 +' + pct(v); } },
    { key: 'coin', icon: '🍔', name: '코인', bad: -0.10, v: { center: 0.30, comeback: 0.15, trainee: 0.08 },
      text: function (v) { return '원정 코인 ' + (v > 0 ? '+' : '-') + pct(v); } },
    { key: 'exp', icon: '⭐', name: '카드 EXP', bad: -0.10, v: { center: 0.30, comeback: 0.15, trainee: 0.08 },
      text: function (v) { return '카드 경험치 ' + (v > 0 ? '+' : '-') + pct(v); } },
    { key: 'zone', icon: '📸', name: '셔터 칸', bad: -0.08, v: { center: 0.25, comeback: 0.12, trainee: 0.06 },
      text: function (v) { return '셔터 노란 칸 ' + (v > 0 ? '+' : '-') + pct(v); } },
    { key: 'npc', icon: '🕶️', name: 'NPC 경계', bad: -0.10, v: { center: 0.30, comeback: 0.15, trainee: 0.08 },
      text: function (v) { return 'NPC 경계 게이지 ' + (v > 0 ? '+' : '-') + pct(v) + ' 더 깎임'; } },
    { key: 'ticket', icon: '🎫', name: '등교권 드랍', bad: -0.20, v: { center: 0.50, comeback: 0.25, trainee: 0.12 },
      text: function (v) { return '등교권·조각 드랍 ' + (v > 0 ? '+' : '-') + pct(v); } },
    { key: 'stone', icon: '🔨', name: '강화석 드랍', bad: -0.15, v: { center: 0.40, comeback: 0.20, trainee: 0.10 },
      text: function (v) { return '강화석 드랍 ' + (v > 0 ? '+' : '-') + pct(v); } },
    { key: 'protect', icon: '🛡️', name: '방지권 드랍', bad: -0.15, v: { center: 0.40, comeback: 0.20, trainee: 0.10 },
      text: function (v) { return '방지권 드랍 ' + (v > 0 ? '+' : '-') + pct(v); } },
    { key: 'film', icon: FILM_EMOJI, name: '필름 드랍', bad: -0.20, v: { center: 0.40, comeback: 0.20, trainee: 0.10 },
      text: function (v) { return '필름 드랍 ' + (v > 0 ? '+' : '-') + pct(v); } },
    // 센터 전용: 방송국 앞에서 프리미엄 조각이 나왔을 때 한 번 더
    { key: 'pieceExtra', icon: '🖼️', name: '조각 추가', bad: null, v: { center: 0.15 },
      text: function (v) { return '방송국 앞 조각 획득 시 ' + pct(v) + ' 확률로 +1'; } }
  ];
  // 흑역사: 효과 없는 장식. (놀리는 맛)
  var CHEERS = ['오늘도 열심히 찍는다… 아마도?', '표정관리 실패! 그래도 찍는다!', '눈 감은 컷만 백 장째!', '화이팅! (흑역사 한 장 추가)'];
  var BLACKS = [
    { key: 'fish', icon: '🐟', name: '물고기', text: function () { return '이름 옆에 🐟 이 붙어요'; } },
    { key: 'cheer', icon: '📣', name: '응원 멘트', text: function () { return '원정 시작 때 이상한 응원 멘트'; } },
    { key: 'rainbow', icon: '🌈', name: '무지개 테두리', text: function () { return '포토랩 테두리가 무지개색'; } }
  ];

  // ════════ 순수 로직 ════════
  function pickGrade(rnd) {
    var tot = 0, i;
    for (i = 0; i < GRADES.length; i++) tot += GRADES[i].w;
    var r = rnd() * tot, acc = 0;
    for (i = 0; i < GRADES.length; i++) { acc += GRADES[i].w; if (r < acc) return GRADES[i].id; }
    return 'trainee';
  }

  // 한 칸 뽑기. taken = 이미 쓰인 효과 key 목록 (같은 카드 안에서 겹치지 않게)
  function rollSlot(taken, rnd) {
    for (var tries = 0; tries < 20; tries++) {
      var g = pickGrade(rnd);
      var pool;
      if (g === 'black') pool = BLACKS.filter(function (o) { return taken.indexOf(o.key) === -1; });
      else if (g === 'rumor') pool = OPTS.filter(function (o) { return o.bad !== null && taken.indexOf(o.key) === -1; });
      else pool = OPTS.filter(function (o) { return o.v[g] !== undefined && taken.indexOf(o.key) === -1; });
      if (!pool.length) continue;
      var o = pool[Math.floor(rnd() * pool.length)];
      if (g === 'black') {
        var s = { id: o.key, grade: 'black' };
        if (o.key === 'cheer') s.t = Math.floor(rnd() * CHEERS.length);
        return s;
      }
      return { id: o.key, grade: g };
    }
    return null;
  }

  // 현상: slots(길이 3, 빈 칸은 null), locked(길이 3 불린). 잠긴 칸은 유지, 나머지만 새로 뽑음
  function rollAll(slots, locked, rnd) {
    rnd = rnd || Math.random;
    var out = [null, null, null], taken = [], i;
    for (i = 0; i < 3; i++) if (locked[i] && slots[i]) { out[i] = slots[i]; taken.push(slots[i].id); }
    for (i = 0; i < 3; i++) {
      if (out[i]) continue;
      var s = rollSlot(taken, rnd);
      out[i] = s;
      if (s) taken.push(s.id);
    }
    return out;
  }

  function optOf(id) {
    var i;
    for (i = 0; i < OPTS.length; i++) if (OPTS[i].key === id) return OPTS[i];
    for (i = 0; i < BLACKS.length; i++) if (BLACKS[i].key === id) return BLACKS[i];
    return null;
  }
  function enhLv(s) { return Math.max(0, Math.min(ENH_MAX, Math.floor((s && s.lv) || 0))); }
  function canEnhance(s) { return !!s && (s.grade === 'center' || s.grade === 'comeback' || s.grade === 'trainee') && enhLv(s) < ENH_MAX; }
  function enhRate(lv) { return ENH_RATE[Math.min(lv, ENH_RATE.length - 1)]; }   // lv = 지금 단계 → 다음 단계 도전 성공률(%)
  function enhCost(lv) { return { dev: (lv + 1) * ENH_DEV_PER, coin: (lv + 1) * ENH_COIN_PER }; }
  function slotBase(s) {   // 강화 전 기본 값
    var o = optOf(s.id);
    if (!o || s.grade === 'black') return 0;
    return s.grade === 'rumor' ? o.bad : o.v[s.grade];
  }
  function slotValue(s) {
    var v = slotBase(s);
    return (s.grade === 'black' || s.grade === 'rumor') ? v : v * (1 + ENH_STEP * enhLv(s));
  }
  function slotText(s) {
    var o = optOf(s.id);
    if (!o) return '';
    return s.grade === 'black' ? (s.id === 'cheer' ? '응원 멘트: "' + CHEERS[s.t || 0] + '"' : o.text()) : o.text(slotValue(s));
  }
  // 강화 1번: 비용만 있으면 100% 성공. 돌려주는 값 = 결과(바뀐 칸) 또는 null
  function enhanceSlot(slots, idx) {
    var s = slots[idx];
    if (!canEnhance(s)) return null;
    var out = slots.slice(); out[idx] = { id: s.id, grade: s.grade, lv: enhLv(s) + 1 };
    if (s.t !== undefined) out[idx].t = s.t;
    return out;
  }

  function costFor(rolls, lockCount) {
    var esc = Math.min(ESC_MAX, 1 + ESC_STEP * (rolls || 0));
    var mult = 1 + LOCK_ADD * lockCount;
    return { coin: Math.round(BASE_COIN * mult * esc / 100) * 100, film: Math.ceil(BASE_FILM * mult) };
  }

  // ════════ 저장 ════════
  function readAll() {
    try { var d = JSON.parse(localStorage.getItem(STORE) || '{}'); return (d && typeof d === 'object') ? d : {}; } catch (e) { return {}; }
  }
  function writeAll(d) { try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} }
  function getCard(charId) {
    var c = readAll()[charId];
    if (!c || !Array.isArray(c.slots)) c = { slots: [null, null, null], rolls: 0 };
    while (c.slots.length < 3) c.slots.push(null);
    c.rolls = Math.max(0, Math.floor(c.rolls || 0));
    return c;
  }
  function setCard(charId, c) { var d = readAll(); d[charId] = c; writeAll(d); }
  function ownedIds() {
    try {
      var d = JSON.parse(localStorage.getItem(PREMIUM_STORE) || '{}');
      return Object.keys(NAMES).filter(function (id) { return d && d[id]; });
    } catch (e) { return []; }
  }
  function charName(id) {
    return (typeof CHARS !== 'undefined' && CHARS[id] && CHARS[id].name) ? CHARS[id].name : (NAMES[id] || id);
  }

  // 원정에서 읽는 효과 합계 (이 캐릭터의 프리미엄 카드를 가졌을 때만)
  window.getEngraveBonus = function (charId) {
    var out = { stamina: 0, coin: 0, exp: 0, zone: 0, npc: 0, ticket: 0, stone: 0, protect: 0, film: 0, pieceExtra: 0, cheer: null, fish: false, rainbow: false };
    if (!charId || ownedIds().indexOf(charId) === -1) return out;
    getCard(charId).slots.forEach(function (s) {
      if (!s) return;
      if (s.grade === 'black') {
        if (s.id === 'cheer') out.cheer = CHEERS[s.t || 0];
        else if (s.id === 'fish') out.fish = true;
        else if (s.id === 'rainbow') out.rainbow = true;
      } else if (out.hasOwnProperty(s.id)) out[s.id] += slotValue(s);
    });
    return out;
  };

  // ════════ 화면 ════════
  function $(id) { return document.getElementById(id); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function filmQty() {
    if (typeof bagItems === 'undefined' || !Array.isArray(bagItems)) return 0;
    var it = bagItems.find(function (i) { return i.name === FILM_NAME; });
    return it ? it.qty : 0;
  }
  function devQty() {
    if (typeof bagItems === 'undefined' || !Array.isArray(bagItems)) return 0;
    var it = bagItems.find(function (i) { return i.name === DEV_NAME; });
    return it ? it.qty : 0;
  }
  function coinsNow() { return (typeof coins !== 'undefined') ? coins : 0; }

  function injectStyle() {
    if ($('pl-style')) return;
    var st = document.createElement('style');
    st.id = 'pl-style';
    st.textContent =
      '@keyframes plFlash{0%{opacity:.95}100%{opacity:0}}' +
      '@keyframes plDevelop{0%{opacity:0;filter:sepia(1) brightness(.4) blur(4px);transform:scale(.94)}60%{opacity:1;filter:sepia(.8) brightness(.9) blur(1px)}100%{opacity:1;filter:none;transform:scale(1)}}' +
      '@keyframes plGlow{0%,100%{box-shadow:0 0 0 rgba(255,60,60,0)}50%{box-shadow:0 0 22px rgba(255,60,60,.35)}}' +
      '@keyframes plRainbow{0%{border-color:#ff5a5a}20%{border-color:#ffd24a}40%{border-color:#5aff8a}60%{border-color:#5ab8ff}80%{border-color:#c05aff}100%{border-color:#ff5a5a}}' +
      '.pl-strip{position:absolute;top:0;bottom:0;width:14px;background:#111;background-image:repeating-linear-gradient(to bottom,transparent 0 10px,#2b2b2b 10px 20px);opacity:.9}';
    document.head.appendChild(st);
  }

  var BTN = 'width:100%;padding:13px;border:none;border-radius:13px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;background:linear-gradient(135deg,#be123c,#f43f5e);';
  var ST = null;   // { charId, locked:[..], onClose, anim }

  function close() {
    var o = $('pl-overlay');
    if (o) o.remove();
    var cb = ST && ST.onClose;
    ST = null;
    if (typeof cb === 'function') { try { cb(); } catch (e) {} }
  }

  function shell(inner, rainbow) {
    var o = $('pl-overlay');
    if (!o) {
      o = document.createElement('div');
      o.id = 'pl-overlay';
      o.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow-y:auto;color:#fff;font-family:\'Noto Sans KR\',sans-serif;' +
        'background:radial-gradient(ellipse at 50% 0%,#5a0f1c 0%,#1a0509 55%,#0a0204 100%);';
      document.body.appendChild(o);
      var bg = new Image();
      bg.onload = function () {
        var el = $('pl-overlay');
        if (el) { el.style.backgroundImage = 'linear-gradient(rgba(10,2,4,.55),rgba(10,2,4,.8)),url("' + IMG_BASE + 'photolab-bg.png' + BUST + '")'; el.style.backgroundSize = 'cover'; el.style.backgroundPosition = 'center'; }
      };
      bg.src = IMG_BASE + 'photolab-bg.png' + BUST;
    }
    o.innerHTML = '<div style="position:relative;max-width:480px;margin:0 auto;min-height:100%;padding:16px 28px 28px;box-sizing:border-box;">' +
      '<div class="pl-strip" style="left:4px;"></div><div class="pl-strip" style="right:4px;"></div>' + inner + '</div>';
    return o;
  }

  function header(title) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
      '<div style="font-size:17px;font-weight:900;color:#fecaca;text-shadow:0 0 10px rgba(255,60,60,.6);">📷 ' + title + '</div>' +
      '<button id="pl-close" style="background:rgba(255,255,255,.12);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;">닫기</button></div>';
  }

  // 📋 옵션표: 현상 등급·효과·강화 확률을 미리 볼 수 있음 (설정값에서 자동으로 만들어져요)
  function renderInfo() {
    var tot = 0;
    GRADES.forEach(function (g) { tot += g.w; });
    var gdesc = { center: '최상급 · 효과가 가장 크고 센터 전용 효과도 있어요', comeback: '중간 · 센터의 절반 정도 효과', trainee: '기본 · 효과가 작아요', rumor: '나쁜 효과 (손해가 나요)', black: '효과 없는 장식 (놀리는 맛)' };
    function fv(v) { return (v > 0 ? '+' : '-') + pct(v); }
    var box = 'background:rgba(255,255,255,.07);border-radius:14px;padding:12px;margin-bottom:12px;font-size:12px;line-height:1.75;';
    var gradeRows = GRADES.map(function (g) {
      return '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:5px;"><div style="min-width:58px;font-weight:900;color:' + g.color + ';">' + g.name + '</div><div style="flex:1;">' + gdesc[g.id] + '<div style="color:#9ab;font-size:11px;">칸마다 뽑힐 확률 ' + Math.round(g.w / tot * 100) + '%</div></div></div>';
    }).join('');
    var head = '<tr style="color:#9ab;font-size:11px;"><td style="padding:3px 0;">효과</td><td style="color:#FFD700;">센터</td><td style="color:#C084FC;">컴백</td><td style="color:#7dd3fc;">연습생</td><td style="color:#f87171;">구설수</td></tr>';
    var rows = OPTS.filter(function (o) { return o.key !== 'pieceExtra'; }).map(function (o) {
      var label = o.key === 'stamina' ? '이벤트 스태미나' : o.name;
      return '<tr style="border-top:1px solid rgba(255,255,255,.08);"><td style="padding:5px 4px 5px 0;white-space:nowrap;">' + o.icon + ' ' + label + '</td>' +
        '<td>' + fv(o.v.center) + '</td><td>' + fv(o.v.comeback) + '</td><td>' + fv(o.v.trainee) + '</td><td style="color:#fca5a5;">' + (o.bad === null ? '-' : fv(o.bad)) + '</td></tr>';
    }).join('');
    var piece = OPTS.filter(function (o) { return o.key === 'pieceExtra'; })[0];
    var blacks = BLACKS.map(function (b) { return b.icon + ' ' + b.name + ' — ' + b.text(); }).join('<br>');
    var enhRows = ENH_RATE.map(function (r, i) {
      var c = enhCost(i);
      return '+' + (i + 1) + '강 ' + r + '% · ' + DEV_EMOJI + ' ' + c.dev + ' · 🍔 ' + c.coin.toLocaleString();
    }).join('<br>');
    shell(header('옵션표') +
      '<div style="' + box + '"><div style="font-weight:900;font-size:13px;margin-bottom:6px;">🎞️ 칸마다 이 등급이 따로 뽑혀요</div>' + gradeRows +
        '<div style="color:#9ab;font-size:11px;margin-top:4px;">카드 한 장에 3칸 · 같은 카드 안에서는 같은 효과가 겹치지 않아요</div></div>' +
      '<div style="' + box + '"><div style="font-weight:900;font-size:13px;margin-bottom:6px;">📊 효과 종류와 수치</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">' + head + rows + '</table>' +
        '<div style="color:#9ab;font-size:11px;margin-top:6px;">⚡ 스태미나는 -가 좋은 효과(덜 들어요), 구설수에서는 더 들어요.<br>' +
        (piece ? '🖼️ 센터 전용 — ' + piece.text(piece.v.center) + '<br>' : '') + '효과는 이 카드의 아이돌이 원정에 나갈 때 적용돼요.</div></div>' +
      '<div style="' + box + '"><div style="font-weight:900;font-size:13px;margin-bottom:6px;">⚪ 흑역사 (장식 3종)</div>' + blacks + '</div>' +
      '<div style="' + box + '"><div style="font-weight:900;font-size:13px;margin-bottom:6px;">' + DEV_EMOJI + ' 옵션 강화 (센터·컴백·연습생 칸만)</div>' + enhRows +
        '<div style="color:#9ab;font-size:11px;margin-top:6px;">1강마다 효과 +' + Math.round(ENH_STEP * 100) + '% · 최대 +' + ENH_MAX + '강 · 실패해도 재료·코인만 사라져요<br>다시 현상하면 그 칸의 강화는 사라져요 (🔒 잠그면 유지)</div></div>' +
      '<div style="' + box + '"><div style="font-weight:900;font-size:13px;margin-bottom:6px;">💰 현상 비용</div>' +
        FILM_EMOJI + ' ' + BASE_FILM + ' + 🍔 ' + BASE_COIN.toLocaleString() + ' (카드별로 현상할 때마다 코인 +' + Math.round(ESC_STEP * 100) + '%, 최대 ' + ESC_MAX + '배)<br>' +
        '🔒 칸을 잠그면 그 칸은 유지돼요 · 잠금 1개마다 비용 +' + LOCK_ADD + '배 · 3칸 모두 잠글 수는 없어요</div>' +
      '<button id="pl-info-back" style="' + BTN + 'background:rgba(255,255,255,.12);">돌아가기</button>');
    $('pl-close').onclick = close;
    $('pl-info-back').onclick = function () { if (ST && ST.charId) renderLab(false); else renderPicker(); };
  }

  // 카드 고르기
  function renderPicker() {
    var ids = ownedIds();
    var rows = ids.map(function (id) {
      var c = getCard(id), n = c.slots.filter(Boolean).length;
      return '<button class="pl-pick" data-id="' + id + '" style="width:100%;display:flex;align-items:center;gap:12px;padding:10px;margin-bottom:9px;background:rgba(255,255,255,.06);border:1.5px solid ' + COLORS[id] + ';border-radius:14px;color:#fff;cursor:pointer;text-align:left;font-family:inherit;">' +
        '<span style="width:46px;height:62px;border-radius:7px;background:#222 url(\'' + IMG_BASE + 'premium-' + id + '.jpg' + BUST + '\') center/cover;flex:none;"></span>' +
        '<span style="font-size:15px;font-weight:900;">' + charName(id) + '<br><span style="font-size:11px;font-weight:400;color:#fda4af;">현상 슬롯 ' + n + '/3 · 현상 ' + c.rolls + '번</span></span>' +
        '<span style="margin-left:auto;color:#888;font-size:16px;">›</span></button>';
    }).join('');
    shell(header('시크릿 포토랩') +
      '<div style="font-size:12px;color:#fda4af;margin-bottom:12px;">현상할 프리미엄 카드를 골라요 · 보유 필름 ' + FILM_EMOJI + ' ' + filmQty() + '개</div>' +
      '<button id="pl-info" style="' + BTN + 'background:rgba(255,255,255,.12);margin-bottom:12px;">📋 옵션표 보기</button>' +
      (rows || '<div style="text-align:center;color:#aaa;padding:30px 0;font-size:13px;">프리미엄 카드가 아직 없어요<br>방송국 앞에서 프리미엄 조각을 모아 교환해요</div>'));
    $('pl-close').onclick = close;
    $('pl-info').onclick = function () { renderInfo(); };
    Array.prototype.forEach.call(document.querySelectorAll('.pl-pick'), function (b) {
      b.onclick = function () { ST.charId = b.getAttribute('data-id'); ST.locked = [false, false, false]; renderLab(false); };
    });
  }

  // 현상 화면. animate=true 면 방금 뽑은 칸을 현상 연출로 보여줌
  function renderLab(animate, fresh) {
    var id = ST.charId, c = getCard(id);
    var bonus = window.getEngraveBonus(id);
    var lockCount = 0;
    for (var i = 0; i < 3; i++) if (ST.locked[i] && c.slots[i]) lockCount++;
    var firstRoll = c.slots.every(function (s) { return !s; });
    if (firstRoll) { ST.locked = [false, false, false]; lockCount = 0; }
    var cost = costFor(c.rolls, lockCount);
    var canRoll = lockCount < 3 || firstRoll;
    var enough = filmQty() >= cost.film && coinsNow() >= cost.coin;

    var slotsHtml = c.slots.map(function (s, idx) {
      var base = 'position:relative;border-radius:14px;padding:13px 12px;margin-bottom:10px;min-height:54px;display:flex;align-items:center;gap:10px;';
      if (!s) {
        return '<div style="' + base + 'background:rgba(255,255,255,.04);border:1.5px dashed rgba(255,255,255,.2);color:#9ca3af;font-size:13px;">🎞️ 빈 필름 — 현상해서 채워요</div>';
      }
      var g = gradeOf(s.grade), o = optOf(s.id);
      var anim = (animate && fresh && fresh[idx]) ? 'opacity:0;animation:plDevelop .9s ease-out forwards;animation-delay:' + (0.5 + idx * 0.45) + 's;' : '';
      var locked = ST.locked[idx];
      return '<div style="' + base + 'background:rgba(0,0,0,.45);border:2px solid ' + g.color + ';' + anim + '">' +
        '<span style="font-size:24px;">' + (o ? o.icon : '❔') + '</span>' +
        '<span style="flex:1;font-size:13px;font-weight:700;"><span style="font-size:10px;font-weight:900;color:' + g.color + ';">[' + g.name + ']</span>' + (enhLv(s) ? ' <span style="font-size:10px;font-weight:900;color:#34d399;">+' + enhLv(s) + '강</span>' : '') + '<br>' + slotText(s) + '</span>' +
        (canEnhance(s) ? '<button class="pl-enh" data-i="' + idx + '" style="background:rgba(52,211,153,.18);border:1.5px solid #34d399;border-radius:10px;color:#fff;padding:6px 8px;cursor:pointer;font-size:12px;font-weight:900;">🧪 강화</button>' : '') +
        '<button class="pl-lock" data-i="' + idx + '" style="background:' + (locked ? 'rgba(250,204,21,.25)' : 'rgba(255,255,255,.08)') + ';border:1.5px solid ' + (locked ? '#facc15' : 'rgba(255,255,255,.25)') + ';border-radius:10px;color:#fff;padding:6px 9px;cursor:pointer;font-size:14px;">' + (locked ? '🔒' : '🔓') + '</button></div>';
    }).join('');

    var tint = Object.keys(bonus).filter(function (k) { return typeof bonus[k] === 'number' && bonus[k]; }).length;
    shell(header('프리미엄 현상') +
      '<div style="text-align:center;margin-bottom:12px;">' +
      '<div style="display:inline-block;width:96px;height:132px;border-radius:10px;border:3px solid ' + COLORS[id] + ';background:#222 url(\'' + IMG_BASE + 'premium-' + id + '.jpg' + BUST + '\') center/cover;box-shadow:0 0 20px rgba(255,60,60,.4);"></div>' +
      '<div style="font-size:16px;font-weight:900;margin-top:6px;">' + charName(id) + (bonus.fish ? ' 🐟' : '') + '</div>' +
      '<div style="font-size:11px;color:#fda4af;">' + (tint ? '현상 효과 적용 중' : '아직 효과 없음') + ' · 현상 ' + c.rolls + '번</div></div>' +
      '<div id="pl-flash"></div>' + slotsHtml +
      '<div style="font-size:11px;color:#fda4af;text-align:center;margin:4px 0 10px;">🔒 잠그면 그 칸은 그대로! (잠금 1개마다 비용 +' + LOCK_ADD + '배) · 되돌릴 수 없어요<br>' + DEV_EMOJI + ' 강화한 칸은 다시 현상하면 사라져요 (🔒 잠그면 유지)</div>' +
      '<div style="font-size:12px;text-align:center;margin-bottom:8px;color:' + (enough ? '#fff' : '#f87171') + ';">비용 ' + FILM_EMOJI + ' ' + cost.film + ' + 🍔 ' + cost.coin.toLocaleString() + '<br><span style="font-size:10px;color:#9ca3af;">보유 ' + FILM_EMOJI + ' ' + filmQty() + ' · ' + DEV_EMOJI + ' ' + devQty() + ' · 🍔 ' + coinsNow().toLocaleString() + '</span></div>' +
      '<button id="pl-roll" style="' + BTN + (canRoll && enough ? '' : 'opacity:.45;') + '">' + (firstRoll ? '📷 첫 현상하기' : '📷 다시 현상하기') + '</button>' +
      '<button id="pl-info" style="' + BTN + 'margin-top:8px;background:rgba(255,255,255,.12);">📋 옵션표 보기</button>' +
      '<button id="pl-back" style="' + BTN + 'margin-top:8px;background:rgba(255,255,255,.12);">다른 카드 고르기</button>',
      bonus.rainbow);
    var cardBox = $('pl-overlay').firstChild;
    if (bonus.rainbow) { cardBox.style.border = '3px solid #ff5a5a'; cardBox.style.animation = 'plRainbow 3s linear infinite'; cardBox.style.borderRadius = '18px'; }
    $('pl-close').onclick = close;
    $('pl-back').onclick = function () { renderPicker(); };
    $('pl-info').onclick = function () { renderInfo(); };
    Array.prototype.forEach.call(document.querySelectorAll('.pl-lock'), function (b) {
      b.onclick = function () {
        var i = +b.getAttribute('data-i');
        ST.locked[i] = !ST.locked[i];
        renderLab(false);
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('.pl-enh'), function (b) {
      b.onclick = function () { openSlotEnhance(+b.getAttribute('data-i')); };
    });
    $('pl-roll').onclick = function () { doRoll(); };
  }

  // 🧪 슬롯 강화 (실패 없음 · 현상액 + 코인)
  function openSlotEnhance(idx) {
    if (!ST || ST.busy) return;
    var id = ST.charId, c = getCard(id), s = c.slots[idx];
    if (!canEnhance(s)) { toast('이 칸은 더 강화할 수 없어요'); return; }
    var lv = enhLv(s), cost = enhCost(lv);
    var after = enhanceSlot(c.slots, idx)[idx];
    var old = $('pl-enh-pop'); if (old) old.remove();
    var pop = document.createElement('div');
    pop.id = 'pl-enh-pop';
    pop.style.cssText = 'position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:18px;font-family:\'Noto Sans KR\',sans-serif;';
    var enough = devQty() >= cost.dev && coinsNow() >= cost.coin;
    pop.innerHTML = '<div style="width:100%;max-width:320px;background:linear-gradient(135deg,#1a0509,#3b0d1a);border:2px solid #34d399;border-radius:18px;padding:20px;text-align:center;color:#fff;">' +
      '<div style="font-size:16px;font-weight:900;margin-bottom:10px;">🧪 옵션 강화 도전 +' + lv + ' → +' + (lv + 1) + '</div>' +
      '<div style="font-size:12px;color:#9ca3af;">' + slotText(s) + '</div>' +
      '<div style="font-size:18px;margin:2px 0;">⬇</div>' +
      '<div style="font-size:14px;font-weight:900;color:#34d399;margin-bottom:12px;">' + slotText(after) + '</div>' +
      '<div style="font-size:14px;font-weight:900;color:#fde68a;margin-bottom:6px;">성공 확률 ' + enhRate(lv) + '%</div>' +
      '<div style="font-size:12px;margin-bottom:4px;color:' + (enough ? '#fff' : '#f87171') + ';">비용 ' + DEV_EMOJI + ' ' + cost.dev + ' + 🍔 ' + cost.coin.toLocaleString() + '</div>' +
      '<div style="font-size:10px;color:#9ca3af;margin-bottom:6px;">보유 ' + DEV_EMOJI + ' ' + devQty() + ' · 🍔 ' + coinsNow().toLocaleString() + '</div>' +
      '<div style="font-size:10px;color:#fda4af;margin-bottom:12px;">실패하면 재료와 코인만 사라지고 단계는 그대로예요 · 다시 현상하면 이 칸의 강화는 사라져요</div>' +
      '<button id="pl-enh-go" style="' + BTN + 'background:linear-gradient(135deg,#059669,#34d399);' + (enough ? '' : 'opacity:.45;') + '">강화하기</button>' +
      '<button id="pl-enh-no" style="' + BTN + 'margin-top:8px;background:rgba(255,255,255,.12);">취소</button></div>';
    pop.querySelector('#pl-enh-no').onclick = function () { pop.remove(); };
    pop.querySelector('#pl-enh-go').onclick = function () {
      if (devQty() < cost.dev) { toast(DEV_EMOJI + ' 현상액이 부족해요! (' + devQty() + '/' + cost.dev + ') · 공연장에서 모아요'); return; }
      if (coinsNow() < cost.coin) { toast('🍔 코인이 부족해요! (' + cost.coin.toLocaleString() + ' 필요)'); return; }
      var cur = getCard(id);
      var next = enhanceSlot(cur.slots, idx);
      if (!next || enhLv(cur.slots[idx]) !== lv) { pop.remove(); renderLab(false); return; }   // 그 사이 칸이 바뀐 경우
      if (typeof useFromBag === 'function') useFromBag(DEV_NAME, cost.dev);
      coins -= cost.coin;
      if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      var success = (Math.random() * 100) < enhRate(lv);
      var beforeTxt = slotText(cur.slots[idx]);
      if (success) { cur.slots = next; setCard(id, cur); }
      if (typeof saveBag === 'function') saveBag();
      if (typeof saveAll === 'function') saveAll();
      try { if (window.pocaSfx) window.pocaSfx.play(success ? (lv + 1 >= ENH_MAX ? 'transOk' : 'enhOk') : 'enhFail'); } catch (e) {}
      pop.remove();
      var f = document.createElement('div');
      f.style.cssText = 'position:fixed;inset:0;background:' + (success ? '#34d399' : '#ef4444') + ';z-index:100000;pointer-events:none;animation:plFlash .45s ease-out forwards;';
      document.body.appendChild(f); setTimeout(function () { f.remove(); }, 480);
      renderLab(false);
      showEnhResult(idx, lv, success, beforeTxt, success ? slotText(next[idx]) : beforeTxt);
    };
    pop.addEventListener('click', function (e) { if (e.target === pop) pop.remove(); });
    document.body.appendChild(pop);
  }

  // 🧪 강화 결과 팝업 (성공/실패 + 바뀐 옵션, 이어서 한 번 더 강화 가능)
  function showEnhResult(idx, lv, success, beforeTxt, afterTxt) {
    var old = $('pl-enh-res'); if (old) old.remove();
    var c = getCard(ST ? ST.charId : ''), s2 = c && c.slots ? c.slots[idx] : null;
    var again = !!(s2 && canEnhance(s2));
    var pop = document.createElement('div');
    pop.id = 'pl-enh-res';
    var col = success ? '#34d399' : '#f87171';
    pop.style.cssText = 'position:fixed;inset:0;z-index:100002;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:18px;font-family:\'Noto Sans KR\',sans-serif;';
    pop.innerHTML = '<div style="width:100%;max-width:320px;background:linear-gradient(135deg,#1a0509,#3b0d1a);border:2px solid ' + col + ';border-radius:18px;padding:22px 20px;text-align:center;color:#fff;box-shadow:0 0 30px ' + col + '55;">' +
      '<div style="font-size:44px;">' + (success ? '✨' : '💨') + '</div>' +
      '<div style="font-size:19px;font-weight:900;color:' + col + ';margin:4px 0 10px;">' + (success ? '+' + (lv + 1) + '강 성공!' : '강화 실패…') + '</div>' +
      (success
        ? '<div style="font-size:12px;color:#9ca3af;">' + beforeTxt + '</div><div style="font-size:18px;margin:2px 0;">⬇</div><div style="font-size:15px;font-weight:900;color:#34d399;margin-bottom:10px;">' + afterTxt + '</div>'
        : '<div style="font-size:13px;color:#fca5a5;line-height:1.6;margin-bottom:8px;">' + DEV_EMOJI + ' 현상액과 코인만 사라졌어요.<br>단계는 +' + lv + '강 그대로예요.</div><div style="font-size:12px;color:#9ca3af;margin-bottom:10px;">' + beforeTxt + '</div>') +
      '<div style="font-size:10px;color:#9ca3af;margin-bottom:12px;">보유 ' + DEV_EMOJI + ' ' + devQty() + ' · 🍔 ' + coinsNow().toLocaleString() + '</div>' +
      (again ? '<button id="pl-enh-again" style="' + BTN + 'background:linear-gradient(135deg,#059669,#34d399);margin-bottom:8px;">' + (success ? '+' + (lv + 2) + '강 계속 도전' : '다시 도전') + '</button>' : '') +
      '<button id="pl-enh-ok" style="' + BTN + 'background:rgba(255,255,255,.14);">확인</button></div>';
    document.body.appendChild(pop);
    pop.querySelector('#pl-enh-ok').onclick = function () { pop.remove(); };
    var ag = pop.querySelector('#pl-enh-again');
    if (ag) ag.onclick = function () { pop.remove(); openSlotEnhance(idx); };
  }

  function doRoll() {
    if (!ST || ST.busy) return;
    var id = ST.charId, c = getCard(id);
    var firstRoll = c.slots.every(function (s) { return !s; });
    var locked = firstRoll ? [false, false, false] : ST.locked.map(function (l, i) { return !!(l && c.slots[i]); });
    var lockCount = locked.filter(Boolean).length;
    if (lockCount >= 3) { toast('🔓 한 칸은 풀어야 현상할 수 있어요'); return; }
    var cost = costFor(c.rolls, lockCount);
    if (filmQty() < cost.film) { toast(FILM_EMOJI + ' 필름이 부족해요! (' + filmQty() + '/' + cost.film + ') · 공연장에서 모아요'); return; }
    if (coinsNow() < cost.coin) { toast('🍔 코인이 부족해요! (' + cost.coin.toLocaleString() + ' 필요)'); return; }
    var risky = c.slots.some(function (s, i) { return s && !locked[i] && (s.grade === 'center' || s.grade === 'comeback'); });
    var lostEnh = c.slots.some(function (s, i) { return s && !locked[i] && enhLv(s) > 0; });
    if ((risky || lostEnh) && !window.confirm('좋은 효과(센터/컴백)가 있는 칸도 새로 바뀌어요.' + (lostEnh ? '\n🧪 강화한 단계도 함께 사라져요!' : '') + '\n되돌릴 수 없어요. 현상할까요?\n(지키려면 🔒 잠금)')) return;

    if (typeof useFromBag === 'function') useFromBag(FILM_NAME, cost.film);
    coins -= cost.coin;
    if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    var before = c.slots.slice();
    c.slots = rollAll(c.slots, locked);
    if (lockCount > 0) { try { localStorage.setItem('ph_lab_lockroll', '1'); } catch (e) {} }   // 길잡이: 잠그고 다시 현상하기
    c.rolls += 1;
    setCard(id, c);
    if (typeof saveBag === 'function') saveBag();
    if (typeof saveAll === 'function') saveAll();

    var fresh = c.slots.map(function (s, i) { return !locked[i]; });
    ST.locked = [false, false, false];
    ST.busy = true;
    // 플래시 → 현상 연출
    var f = document.createElement('div');
    f.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:100000;pointer-events:none;animation:plFlash .5s ease-out forwards;';
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 540);
    renderLab(true, fresh);
    setTimeout(function () { if (ST) ST.busy = false; }, 500 + 3 * 450 + 900);
  }

  window.openPhotoLab = function (opts) {
    opts = opts || {};
    injectStyle();
    ST = { charId: null, locked: [false, false, false], onClose: opts.onClose, busy: false };
    var owned = ownedIds();
    if (opts.charId && owned.indexOf(opts.charId) !== -1) { ST.charId = opts.charId; renderLab(false); }
    else renderPicker();
  };

  // 테스트용 (원정 화면 밖에서 확인)
  window.__photolabTest = { enhanceSlot: enhanceSlot, enhCost: enhCost, canEnhance: canEnhance, enhLv: enhLv, slotBase: slotBase, enhRate: enhRate, ENH: { MAX: ENH_MAX, STEP: ENH_STEP }, rollAll: rollAll, costFor: costFor, GRADES: GRADES, OPTS: OPTS, slotText: slotText, slotValue: slotValue };
})();
