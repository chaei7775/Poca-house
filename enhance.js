// ════════════════════════════════
// ⚒️ 히든카드 강화 · 초월 (enhance.js)
// 더보기 메뉴에 "🎤 트레이닝룸" 타일을 붙인다. (game.js / recombine.js / special-explore.js는 건드리지 않음)
//
// - 강화 대상은 히든카드(재조합기에서 나오는 12장)만.
//   한 회차 = +1 ~ +10강. 비용: 강화석 + 코인(+ 6강부터 방지권). 천장 없음(순수 확률).
//   +5강까지는 실패해도 아무 일 없음(재료만 소모).
//   +6강 도전부터는 방지권 없이 실패하면 카드가 사라짐.
//   방지권을 쓰고 실패하면 방지권만 사라지고 카드는 그대로. (방지권은 성공하면 안 줄어듦)
// - +10강이면 초월: 초월석 + 같은 멤버의 여분 SSR/UR 카드 + 코인. 초월은 실패 없음.
//   초월하면 강화가 +0으로 돌아가 다시 +10강까지 올린다. (쌓은 수익 보너스는 영구로 남음)
//   초월 3단계까지 = 총 3회차(사실상 +30강). 3회차 +10강에서 마지막 초월을 하면 완료(★★★, 반짝임).
//   회차가 올라갈수록 성공 확률은 ×1 → ×0.5 → ×0.25, 강화석/방지권 소모는 ×1 → ×1.5 → ×2.
// - 강화/초월하면 그 멤버의 기획사 수익이 오른다 (agency.js에서 getEnhanceIncomeMult를 불러서 곱함)
//   한 멤버의 레어히든 + 에픽히든이 둘 다 있으면 보너스를 더한다.
// - 재료는 특별탐험 촬영에 성공할 때 드랍: 강화석, 방지권, 초월석(변종만)
// - 특별탐험을 한 번 시작할 때마다 스태미나 SPECIAL_STAMINA 소모
// - 저장: localStorage 'ph_enhance' (기획사 / 팬카페와 같은 방식 — 이 기기에만 저장됨)
//
// 값을 바꾸고 싶으면 아래 설정만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var MAX_LEVEL = 10;
  var RATE = [50, 45, 40, 37.5, 35, 30, 25, 20, 15, 10];                  // +1 ~ +10 성공 확률(%) — 1회차(초월 전) 기준
  var RATE_MULT = [1, 0.5, 0.25];                                             // 회차별 확률 배율 (초월 0/1/2단계일 때)
  var COST_MULT = [1, 1.5, 2];                                                // 회차별 강화석·방지권 소모 배율 (올림)
  var SAFE_UNTIL = 5;                                                         // 이 단계로 올리는 도전까지는 실패해도 안 깨짐 (그 다음부터 방지권 필요)
  var COIN_COST = [5000, 10000, 15000, 20000, 25000, 50000, 100000, 150000, 200000, 250000];  // 한 번 도전할 때 내는 코인 (실패해도 안 돌려줌)
  var STONE_COST = [1, 1, 1, 2, 2, 3, 3, 5, 5, 8];                            // 한 번 도전할 때 내는 강화석 (1회차 기준)
  var PROTECT_COST = [0, 0, 0, 0, 0, 1, 1, 2, 2, 3];                          // 방지권을 쓰고 실패했을 때 사라지는 방지권 (1회차 기준)
  var BONUS_SPLIT = 5;                                                        // 이 강화 단계까지는 단계당 LOW, 그 위로는 HIGH
  var ENH_BONUS_LOW = 10;                                                     // 수익 보너스(%): +1~+5강은 단계당
  var ENH_BONUS_HIGH = 20;                                                    // 수익 보너스(%): +6~+10강은 단계당
  var TRANS_MAX = 3;                                                          // 초월 최대 단계
  var TRANS_BONUS = [0, 100, 200, 350];                                       // 초월 단계별 수익 보너스(%) — 누적값
  var TRANS_COIN = [5000000, 15000000, 50000000];                             // 초월 1/2/3단계 코인
  var TRANS_STONE = [1, 1, 1];                                                // 초월 1/2/3단계 초월석
  var TRANS_POINT = [3, 6, 10];                                               // 초월 1/2/3단계 카드 점수 (같은 멤버 여분 카드)
  var POINT_OF = { SSR: 1, UR: 3 };                                           // 카드 1장당 점수
  var GRADE_WEIGHT = { '레어히든': 1, '에픽히든': 1 };                          // 멤버 수익 배율에 반영하는 비율
  var SPECIAL_STAMINA = 30;                                                   // 특별탐험 한 번(탐험하기)에 드는 스태미나
  var DROP = {                                                                // 특별탐험 촬영 성공 시 드랍 확률 (1 = 100%)
    normal:  { stone: 0.035, protect: 0.015, trans: 0 },
    variant: { stone: 0.20,  protect: 0.10,  trans: 0.07 }
  };
  var STORAGE_KEY = 'ph_enhance';

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function roundOf(stage) { return clamp(Math.floor(stage || 0), 0, RATE_MULT.length - 1); }   // 초월 단계 → 몇 회차인지(0~2)
  function rateRaw(target, stage) { return RATE[target - 1] * RATE_MULT[roundOf(stage)]; }      // 실제 굴리는 확률(%)
  function rateOf(target, stage) { return Math.round(rateRaw(target, stage) * 100) / 100; }     // 화면에 보여주는 확률(%)
  function costOf(target, stage) {                            // target강으로 올리는 도전 한 번의 비용
    var m = COST_MULT[roundOf(stage)];
    return {
      coin: COIN_COST[target - 1],
      stone: Math.ceil(STONE_COST[target - 1] * m),
      protect: Math.ceil(PROTECT_COST[target - 1] * m)
    };
  }

  function enhBonus(level) {                                  // 강화 단계 → 수익 보너스(%) (한 회차 안에서)
    level = clamp(Math.floor(level || 0), 0, MAX_LEVEL);
    if (level <= BONUS_SPLIT) return level * ENH_BONUS_LOW;
    return BONUS_SPLIT * ENH_BONUS_LOW + (level - BONUS_SPLIT) * ENH_BONUS_HIGH;
  }
  function cardBonus(level, stage) {                          // 카드 1장의 수익 보너스(%) — 끝낸 회차의 보너스는 영구로 남는다
    stage = clamp(Math.floor(stage || 0), 0, TRANS_MAX);
    var done = stage * enhBonus(MAX_LEVEL);                   // 초월로 끝낸 회차들
    var cur = stage >= TRANS_MAX ? 0 : enhBonus(level);       // 지금 올리는 중인 회차
    return done + cur + TRANS_BONUS[stage];
  }
  function rollEnhance(level, useProtect, rng, stage) {       // level → level+1 도전 결과
    rng = rng || Math.random;
    var target = level + 1;
    if (target > MAX_LEVEL) return null;
    if (rng() * 100 < rateRaw(target, stage)) return 'success';
    if (target <= SAFE_UNTIL) return 'fail';                  // 안전 구간: 아무 일 없음
    return useProtect ? 'protected' : 'destroyed';            // 방지권이 대신 사라지거나, 카드가 사라짐
  }
  function planSpend(d, need) {                               // d: { SSR: 여분 장수, UR: 여분 장수 } → 쓸 장수 (부족하면 null)
    var ssr = Math.min(d.SSR || 0, need);
    var rem = need - ssr;
    var ur = rem > 0 ? Math.ceil(rem / POINT_OF.UR) : 0;
    if (ur > (d.UR || 0)) return null;
    return { SSR: ssr, UR: ur };
  }
  function rollDrops(isVariant, rng) {                        // 촬영 성공 한 번의 드랍
    rng = rng || Math.random;
    var t = isVariant ? DROP.variant : DROP.normal;
    return {
      stone: rng() < t.stone ? 1 : 0,
      protect: rng() < t.protect ? 1 : 0,
      trans: rng() < t.trans ? 1 : 0
    };
  }

  // ════════ 저장 ════════
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    ['stone', 'protect', 'trans'].forEach(function (k) { s[k] = Math.max(0, Math.floor(Number(s[k]) || 0)); });
    if (!s.level || typeof s.level !== 'object') s.level = {};     // { 히든카드id: 강화 단계 (지금 회차 안에서) }
    if (!s.stage || typeof s.stage !== 'object') s.stage = {};     // { 히든카드id: 초월 단계 }
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }

  // ════════ 게임 데이터 읽기 ════════
  function hiddenList() { return (typeof HIDDEN_CARDS !== 'undefined') ? HIDDEN_CARDS : []; }
  function hiddenById(id) { return hiddenList().filter(function (h) { return h.id === id; })[0] || null; }
  function isOwned(id) { return (typeof ownedHiddenCards !== 'undefined') && ownedHiddenCards.indexOf(id) !== -1; }
  function charCards(cid) { return (typeof CARDS !== 'undefined' ? CARDS : []).filter(function (c) { return c.charId === cid; }); }
  function dupsOf(cid) {                                      // 같은 멤버 SSR/UR 여분(2장째부터) 장수
    var out = { SSR: 0, UR: 0 };
    charCards(cid).forEach(function (c) {
      if (out[c.grade] === undefined) return;
      var n = (cardCounts[c.id] || (owned.indexOf(c.id) !== -1 ? 1 : 0));
      if (n > 1) out[c.grade] += n - 1;
    });
    return out;
  }
  function spendCards(cid, plan) {
    ['SSR', 'UR'].forEach(function (g) {
      var need = plan[g] || 0;
      charCards(cid).forEach(function (c) {
        while (need > 0 && c.grade === g && (cardCounts[c.id] || 0) > 1) { cardCounts[c.id] -= 1; need--; }
      });
    });
    localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts));
  }
  function coinsNow() { return (typeof coins !== 'undefined') ? coins : 0; }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function afterChange() {
    if (typeof saveAll === 'function') saveAll();
    if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
  }

  // 멤버의 기획사 수익 배율 (agency.js가 부름) — 히든카드가 없으면 1
  function incomeMult(charId) {
    var st = load(), total = 0;
    hiddenList().forEach(function (h) {
      if (h.charId !== charId || !isOwned(h.id)) return;
      var w = GRADE_WEIGHT[h.grade]; if (w === undefined) w = 1;
      total += w * cardBonus(st.level[h.id] || 0, st.stage[h.id] || 0);
    });
    return 1 + total / 100;
  }
  window.getEnhanceIncomeMult = incomeMult;

  // ════════ 강화 / 초월 실행 ════════
  function doEnhance(id, useProtect) {
    var st = load(), L = st.level[id] || 0, S = st.stage[id] || 0;
    if (!isOwned(id) || L >= MAX_LEVEL) return null;
    var target = L + 1, c = costOf(target, S);
    var risky = target > SAFE_UNTIL;
    var protect = risky && !!useProtect;
    if (coinsNow() < c.coin) { toast('코인이 부족해요!'); return null; }
    if (st.stone < c.stone) { toast('강화석이 부족해요!'); return null; }
    if (protect && st.protect < c.protect) { toast('방지권이 부족해요!'); return null; }
    coins -= c.coin;                                         // 비용은 먼저 낸다
    st.stone -= c.stone;
    var out = rollEnhance(L, protect, null, S);
    if (out === 'success') st.level[id] = target;
    else if (out === 'protected') st.protect -= c.protect;
    else if (out === 'destroyed') {
      delete st.level[id]; delete st.stage[id];
      var i = ownedHiddenCards.indexOf(id);
      if (i !== -1) ownedHiddenCards.splice(i, 1);
      if (typeof saveRcData === 'function') saveRcData();
      else localStorage.setItem('ph_hiddenCards', JSON.stringify(ownedHiddenCards));
    }
    save(st); afterChange();
    return { out: out, target: target, stage: S, protectCost: c.protect };
  }

  function transReq(id) {                                     // 다음 초월에 필요한 것들
    var h = hiddenById(id), st = load(), S = st.stage[id] || 0;
    if (!h || S >= TRANS_MAX) return null;
    var d = dupsOf(h.charId), need = TRANS_POINT[S];
    var plan = planSpend(d, need);
    return {
      stage: S + 1, coin: TRANS_COIN[S], stone: TRANS_STONE[S], need: need,
      have: d.SSR * POINT_OF.SSR + d.UR * POINT_OF.UR, d: d, plan: plan
    };
  }
  function doTranscend(id) {
    var st = load(), h = hiddenById(id);
    if (!h || !isOwned(id) || (st.level[id] || 0) < MAX_LEVEL) return null;
    var r = transReq(id); if (!r) return null;
    if (coinsNow() < r.coin) { toast('코인이 부족해요!'); return null; }
    if (st.trans < r.stone) { toast('초월석이 부족해요!'); return null; }
    if (!r.plan) { toast('같은 멤버의 여분 카드가 부족해요!'); return null; }
    coins -= r.coin;
    st.trans -= r.stone;
    spendCards(h.charId, r.plan);
    st.stage[id] = r.stage;
    if (r.stage < TRANS_MAX) delete st.level[id];            // 초월하면 +0부터 다시 (수익 보너스는 영구로 남음). 마지막 초월은 +10 그대로 완료
    save(st); afterChange();
    return r;
  }

  // ════════ 화면 ════════
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;
  var ACC = '#FF9F43';

  function ensureStyle() {                                    // 초월 3단계 반짝임
    if (document.getElementById('enh-style')) return;
    var s = document.createElement('style');
    s.id = 'enh-style';
    s.textContent =
      '@keyframes enhGlow{0%,100%{box-shadow:0 0 6px rgba(255,215,0,.55),0 0 14px rgba(255,215,0,.25)}50%{box-shadow:0 0 14px rgba(255,236,150,.95),0 0 28px rgba(255,215,0,.6)}}' +
      '@keyframes enhSheen{0%{background-position:200% 0}100%{background-position:-100% 0}}' +
      '.enh-s3{animation:enhGlow 1.8s ease-in-out infinite;}' +
      '.enh-s3::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.4) 50%,transparent 65%);background-size:250% 100%;animation:enhSheen 2.6s linear infinite;}';
    document.head.appendChild(s);
  }

  function matBar(st) {
    return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">' +
      [['🔨', '강화석', st.stone, ACC], ['🛡️', '방지권', st.protect, '#4ade80'], ['💎', '초월석', st.trans, '#60A5FA'], ['🍔', '코인', coinsNow(), '#FFD700']].map(function (m) {
        return '<div style="flex:1;min-width:70px;background:rgba(255,255,255,0.07);border:1px solid ' + m[3] + '66;border-radius:12px;padding:6px 8px;text-align:center;">' +
          '<div style="font-size:10px;color:#aaa;">' + m[0] + ' ' + m[1] + '</div><div style="font-size:13px;font-weight:900;color:' + m[3] + ';">' + fmt(m[2]) + '</div></div>';
      }).join('') + '</div>';
  }
  function stars(S) { var s = ''; for (var i = 0; i < TRANS_MAX; i++) s += i < S ? '★' : '☆'; return s; }
  function levelTag(L, S) { return (S > 0 ? '★' + S + ' ' : '') + '+' + L; }   // 초월 단계를 앞에 붙인 강화 표기

  function openEnhance() {
    ensureStyle();
    var old = document.getElementById('enhance-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'enhance-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:955;background:linear-gradient(180deg,#1a0a2e,#0a0515);overflow-y:auto;' + FONT;
    document.body.appendChild(ov);
    renderList(ov);
  }

  var trTab = 'hidden';
  function renderList(ov) {
    ov = ov || document.getElementById('enhance-overlay'); if (!ov) return;
    var st = load();
    window.__pcAfterClose = function () { if (document.getElementById('enhance-overlay')) renderList(); };
    var cards = hiddenList().map(function (h) {
      var own = isOwned(h.id), L = st.level[h.id] || 0, S = st.stage[h.id] || 0;
      var glow = h.grade === '에픽히든' ? '#FFD700' : '#C084FC';
      return '<div ' + (own ? 'data-open="' + h.id + '"' : 'data-lock="1"') + ' class="' + (own && S >= TRANS_MAX ? 'enh-s3' : '') + '" style="position:relative;border:2px solid ' + glow + ';border-radius:14px;overflow:hidden;background:#111;aspect-ratio:3/4;cursor:pointer;">' +
        '<img src="' + h.img + '" style="width:100%;height:100%;object-fit:cover;opacity:' + (own ? '1' : '0.3') + ';">' +
        '<div style="position:absolute;top:6px;right:6px;background:' + glow + ';color:#1a1a2e;font-size:9px;font-weight:900;padding:2px 6px;border-radius:8px;">' + h.grade + '</div>' +
        (own ? '<div style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.75);color:' + (S >= TRANS_MAX ? '#FFD700' : '#fff') + ';font-size:12px;font-weight:900;padding:2px 7px;border-radius:8px;">' + levelTag(L, S) + '</div>' : '') +
        '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.78);padding:5px;text-align:center;">' +
        '<div style="font-size:10px;font-weight:900;color:#fff;">' + esc(h.name) + '</div>' +
        (own ? '<div style="font-size:10px;color:#FFD700;">' + stars(S) + '</div>' : '<div style="font-size:10px;color:#FF6B9D;font-weight:900;">미획득</div>') +
        '</div></div>';
    }).join('');
    var tabBtn = function (id, label) {
      var on = trTab === id;
      return '<button data-tr="' + id + '" style="flex:1;padding:10px;border:none;border-radius:12px;font-size:14px;font-weight:900;cursor:pointer;' + FONT + 'color:#fff;background:' + (on ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,0.1)') + ';">' + label + '</button>';
    };
    var body = trTab === 'hidden'
      ? '<div style="font-size:11px;color:#aaa;line-height:1.6;margin-bottom:12px;">강화석·방지권·초월석은 🎬 팬덤 원정 · 팬미팅장에서 많이 나와요. 강화하면 그 멤버의 기획사 수익이 올라요.<br>+10강에서 초월하면 +0부터 다시 시작하지만, 쌓은 수익 보너스는 그대로 남아요.</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' + cards + '</div>'
      : (typeof window.premiumTrainingHtml === 'function' ? window.premiumTrainingHtml() : '<div style="color:#aaa;">프리미엄 카드를 불러오지 못했어요</div>');
    ov.innerHTML = '<div style="position:sticky;top:0;z-index:2;background:rgba(10,5,20,0.94);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">' +
      '<div style="color:#fff;font-size:17px;font-weight:900;">🎤 트레이닝룸</div>' +
      '<button id="enh-close" style="' + BTN + 'background:rgba(255,255,255,0.12);color:#fff;padding:7px 12px;">닫기</button></div>' +
      '<div style="padding:0 16px 40px;"><div style="display:flex;gap:8px;margin-bottom:12px;">' + tabBtn('hidden', '🌙 히든 카드') + tabBtn('premium', '💎 프리미엄 카드') + '</div>' + matBar(st) + body + '</div>';
    ov.querySelectorAll('[data-tr]').forEach(function (b) { b.onclick = function () { trTab = b.getAttribute('data-tr'); renderList(ov); }; });
    if (trTab === 'premium' && typeof window.premiumTrainingBind === 'function') window.premiumTrainingBind(ov);
    ov.querySelector('#enh-close').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-open]').forEach(function (el) { el.onclick = function () { openDetail(el.getAttribute('data-open')); }; });
    ov.querySelectorAll('[data-lock]').forEach(function (el) { el.onclick = function () { toast('재조합기에서 먼저 획득해야 해요'); }; });
  }

  function openDetail(id) {
    ensureStyle();
    var old = document.getElementById('enhance-detail'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'enhance-detail';
    ov.style.cssText = 'position:fixed;inset:0;z-index:970;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    document.body.appendChild(ov);
    var state = { protectOn: load().protect > 0 };
    drawDetail(ov, id, state);
  }

  function closeDetail(ov) { ov.remove(); renderList(); }

  function drawDetail(ov, id, state) {
    var h = hiddenById(id);
    if (!h || !isOwned(id)) { closeDetail(ov); return; }
    var st = load(), L = st.level[id] || 0, S = st.stage[id] || 0;
    var ch = (typeof CHARS !== 'undefined' && CHARS[h.charId]) || { name: '' };
    var glow = h.grade === '에픽히든' ? '#FFD700' : '#C084FC';
    var mult = incomeMult(h.charId);

    var box = '';
    var canGo = false, mode = '';
    var needProt = 0;
    if (L < MAX_LEVEL) {
      var target = L + 1, rate = rateOf(target, S), c = costOf(target, S);
      var risky = target > SAFE_UNTIL;
      needProt = c.protect;
      if (risky && st.protect < c.protect) state.protectOn = false;   // 방지권이 모자라면 자동으로 "안 씀" 상태
      var useP = risky && state.protectOn;
      canGo = coinsNow() >= c.coin && st.stone >= c.stone && (!useP || st.protect >= c.protect);
      mode = 'enhance';
      var rm = roundOf(S);
      box = '<div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:10px 12px;margin-bottom:10px;">' +
        '<div style="font-size:12px;font-weight:900;color:' + ACC + ';margin-bottom:6px;">+' + L + ' → +' + target + ' 강화</div>' +
        (S > 0 ? '<div style="font-size:11px;color:#60A5FA;margin-bottom:6px;">★' + S + ' 회차 · 성공 확률 ×' + RATE_MULT[rm] + ' · 재료 ×' + COST_MULT[rm] + '</div>' : '') +
        '<div style="display:flex;justify-content:space-between;font-size:13px;color:#fff;padding:3px 0;"><span>성공 확률</span><b style="color:#FFD700;">' + rate + '%</b></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:' + (st.stone >= c.stone ? '#fff' : '#ff8a8a') + ';"><span>🔨 강화석</span><span>' + st.stone + ' / ' + c.stone + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:' + (coinsNow() >= c.coin ? '#fff' : '#ff8a8a') + ';"><span>🍔 코인</span><span>' + fmt(coinsNow()) + ' / ' + fmt(c.coin) + '</span></div>' +
        (risky ?
          '<div id="enh-prot" style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;background:' + (state.protectOn ? 'rgba(74,222,128,0.14)' : 'rgba(255,107,107,0.14)') + ';border:1.5px solid ' + (state.protectOn ? '#4ade80' : '#ff6b6b') + ';border-radius:10px;padding:8px 10px;cursor:pointer;">' +
          '<span style="font-size:13px;color:#fff;font-weight:700;">' + (state.protectOn ? '🛡️ 방지권 ' + c.protect + '장 사용' : '⚠️ 방지권 안 씀') + ' <span style="font-size:11px;color:#aaa;">(보유 ' + st.protect + ')</span></span>' +
          '<span style="font-size:11px;color:#aaa;">눌러서 바꾸기</span></div>' +
          '<div style="font-size:11px;color:' + (state.protectOn ? '#aaa' : '#ff8a8a') + ';margin-top:6px;line-height:1.5;">' +
          (state.protectOn ? '실패하면 방지권 ' + c.protect + '장만 사라져요. 성공하면 방지권은 그대로예요.' : '실패하면 이 카드가 사라져요! 되돌릴 수 없어요. (방지권 ' + c.protect + '장 필요)') + '</div>'
          : '<div style="font-size:11px;color:#aaa;margin-top:6px;">+' + SAFE_UNTIL + '강까지는 실패해도 카드가 안 사라져요.</div>') +
        '</div>';
    } else if (S < TRANS_MAX) {
      var r = transReq(id);
      canGo = coinsNow() >= r.coin && st.trans >= r.stone && !!r.plan;
      mode = 'trans';
      var finalTrans = r.stage >= TRANS_MAX;
      box = '<div style="background:rgba(96,165,250,0.08);border-radius:12px;padding:10px 12px;margin-bottom:10px;">' +
        '<div style="font-size:12px;font-weight:900;color:#60A5FA;margin-bottom:6px;">✨ 초월 ' + r.stage + '단계 <span style="color:#888;font-weight:400;">(실패 없음)</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:' + (st.trans >= r.stone ? '#fff' : '#ff8a8a') + ';"><span>💎 초월석</span><span>' + st.trans + ' / ' + r.stone + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:' + (coinsNow() >= r.coin ? '#fff' : '#ff8a8a') + ';"><span>🍔 코인</span><span>' + fmt(coinsNow()) + ' / ' + fmt(r.coin) + '</span></div>' +
        '<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:' + (r.plan ? '#fff' : '#ff8a8a') + ';"><span>🃏 ' + esc(ch.name) + ' 여분 카드</span><span>' + r.have + ' / ' + r.need + '점</span></div>' +
        '<div style="font-size:11px;color:#888;line-height:1.5;margin-top:4px;">여분 SSR 1장 = 1점, 여분 UR 1장 = 3점 (보유: SSR ' + r.d.SSR + '장 · UR ' + r.d.UR + '장)' +
        (r.plan ? '<br>사용: SSR ' + r.plan.SSR + '장' + (r.plan.UR ? ' + UR ' + r.plan.UR + '장' : '') : '') + '</div>' +
        '<div style="font-size:11px;color:#9fc4ff;line-height:1.5;margin-top:6px;">' +
        (finalTrans ? '마지막 초월이에요. 끝나면 ★★★ 반짝이는 카드가 돼요.'
          : '초월하면 +0부터 다시 시작해요. 쌓은 수익 보너스는 그대로 남고, 다음 회차는 성공 확률 ×' + RATE_MULT[roundOf(r.stage)] + ' · 재료 ×' + COST_MULT[roundOf(r.stage)] + '예요.') + '</div></div>';
    } else {
      box = '<div style="text-align:center;font-size:14px;font-weight:900;color:#FFD700;padding:14px 0;">🌟 강화 · 초월 완료!</div>';
    }

    var label = mode === 'enhance' ? (L + 1 > SAFE_UNTIL && !state.protectOn ? '방지권 없이 도전 (깨질 수 있음)' : '⚒️ 강화하기') : (mode === 'trans' ? '✨ 초월하기' : '');
    ov.innerHTML = '<div style="width:100%;max-width:340px;max-height:94vh;overflow-y:auto;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid ' + glow + ';border-radius:20px;padding:18px 18px 16px;">' +
      '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">' +
      '<div class="' + (S >= TRANS_MAX ? 'enh-s3' : '') + '" style="position:relative;width:84px;aspect-ratio:3/4;border-radius:12px;overflow:hidden;border:2px solid ' + glow + ';flex-shrink:0;"><img src="' + h.img + '" style="width:100%;height:100%;object-fit:cover;"></div>' +
      '<div style="min-width:0;"><div style="font-size:11px;color:' + glow + ';font-weight:900;">' + h.grade + '</div>' +
      '<div style="font-size:15px;font-weight:900;color:#fff;margin:2px 0;">' + esc(h.name) + '</div>' +
      '<div style="font-size:20px;font-weight:900;color:' + (S >= TRANS_MAX ? '#FFD700' : '#fff') + ';">' + levelTag(L, S) + ' <span style="font-size:14px;color:#FFD700;">' + stars(S) + '</span></div>' +
      '<div style="font-size:11px;color:#aaa;margin-top:4px;">이 카드 수익 +' + cardBonus(L, S) + '%<br>' + esc(ch.name) + ' 기획사 수익 <b style="color:#FFD700;">×' + (Math.round(mult * 100) / 100) + '</b></div></div></div>' +
      box +
      (label ? '<button id="enh-go" style="' + BTN + 'width:100%;padding:14px;margin-bottom:8px;background:' + (canGo ? (mode === 'enhance' && L + 1 > SAFE_UNTIL && !state.protectOn ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'linear-gradient(135deg,#FF9F43,#FF6B9D)') : 'rgba(255,255,255,0.1)') + ';color:' + (canGo ? '#fff' : '#777') + ';font-size:15px;">' + (canGo ? label : '재료가 부족해요') + '</button>' : '') +
      '<button id="enh-back" style="' + BTN + 'width:100%;padding:11px;background:rgba(255,255,255,0.08);color:#aaa;font-size:13px;">닫기</button></div>';

    ov.querySelector('#enh-back').onclick = function () { closeDetail(ov); };
    var prot = ov.querySelector('#enh-prot');
    if (prot) prot.onclick = function () {
      if (!state.protectOn && st.protect < needProt) { toast('방지권이 부족해요! (' + needProt + '장 필요)'); return; }
      state.protectOn = !state.protectOn; drawDetail(ov, id, state);
    };
    var go = ov.querySelector('#enh-go');
    if (go) go.onclick = function () {
      if (!canGo) { toast('재료가 부족해요!'); return; }
      if (mode === 'enhance') {
        var willRisk = (L + 1) > SAFE_UNTIL && !state.protectOn;
        if (willRisk) confirmRisk(function () { runEnhance(ov, id, state); }); else runEnhance(ov, id, state);
      } else runTrans(ov, id, state);
    };
  }

  function confirmRisk(onYes) {
    var pop = document.createElement('div');
    pop.style.cssText = 'position:fixed;inset:0;z-index:990;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:20px;' + FONT;
    pop.innerHTML = '<div style="width:100%;max-width:300px;background:#1a1a2e;border:2px solid #ef4444;border-radius:18px;padding:22px 18px;text-align:center;">' +
      '<div style="font-size:34px;margin-bottom:6px;">⚠️</div>' +
      '<div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:8px;">방지권 없이 도전할까요?</div>' +
      '<div style="font-size:13px;color:#ff8a8a;line-height:1.6;margin-bottom:16px;">실패하면 이 카드가 사라져요.<br>되돌릴 수 없어요!</div>' +
      '<button id="risk-no" style="' + BTN + 'width:100%;padding:12px;margin-bottom:8px;background:linear-gradient(135deg,#FF9F43,#FF6B9D);color:#fff;font-size:14px;">취소</button>' +
      '<button id="risk-yes" style="' + BTN + 'width:100%;padding:11px;background:rgba(239,68,68,0.2);color:#ff8a8a;font-size:13px;">그래도 도전</button></div>';
    document.body.appendChild(pop);
    pop.querySelector('#risk-no').onclick = function () { pop.remove(); };
    pop.querySelector('#risk-yes').onclick = function () { pop.remove(); onYes(); };
  }

  function resultScreen(ov, id, state, emoji, title, color, lines, destroyed) {
    ov.innerHTML = '<div style="width:100%;max-width:320px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid ' + color + ';border-radius:20px;padding:28px 22px;text-align:center;">' +
      '<div style="font-size:52px;margin-bottom:6px;">' + emoji + '</div>' +
      '<div style="font-size:19px;font-weight:900;color:' + color + ';margin-bottom:8px;">' + title + '</div>' +
      '<div style="font-size:13px;color:#ddd;line-height:1.7;margin-bottom:16px;">' + lines + '</div>' +
      '<button id="enh-ok" style="' + BTN + 'width:100%;padding:13px;background:linear-gradient(135deg,#FF9F43,#FF6B9D);color:#fff;font-size:15px;">확인</button></div>';
    ov.querySelector('#enh-ok').onclick = function () { if (destroyed) closeDetail(ov); else drawDetail(ov, id, state); };
  }

  function runEnhance(ov, id, state) {
    var res = doEnhance(id, state.protectOn);
    if (!res) { drawDetail(ov, id, state); return; }
    ov.innerHTML = '<div style="text-align:center;color:#fff;"><div style="font-size:54px;">⚒️</div><div style="font-size:16px;font-weight:900;margin-top:10px;">강화 중...</div></div>';
    setTimeout(function () {
      var rate = rateOf(res.target, res.stage);
      if (res.out === 'success') resultScreen(ov, id, state, '✨', '강화 성공! +' + res.target, '#FFD700', '기획사 수익이 올라갔어요' + (res.target >= MAX_LEVEL ? '<br>이제 초월할 수 있어요!' : ''), false);
      else if (res.out === 'fail') resultScreen(ov, id, state, '💨', '강화 실패…', '#aaa', '카드는 그대로예요 (+' + (res.target - 1) + ')<br>성공 확률 ' + rate + '%였어요', false);
      else if (res.out === 'protected') resultScreen(ov, id, state, '🛡️', '실패! 방지권 ' + res.protectCost + '장이 대신 사라졌어요', '#4ade80', '카드는 안전해요 (+' + (res.target - 1) + ')<br>성공 확률 ' + rate + '%였어요', false);
      else resultScreen(ov, id, state, '💔', '카드가 사라졌어요…', '#ef4444', esc(hiddenById(id) ? hiddenById(id).name : '카드') + '<br>방지권 없이 실패했어요', true);
    }, 900);
  }

  function runTrans(ov, id, state) {
    var r = doTranscend(id);
    if (!r) { drawDetail(ov, id, state); return; }
    ov.innerHTML = '<div style="text-align:center;color:#fff;"><div style="font-size:54px;">✨</div><div style="font-size:16px;font-weight:900;margin-top:10px;">초월 중...</div></div>';
    setTimeout(function () {
      resultScreen(ov, id, state, '🌟', '초월 ' + r.stage + '단계 완료!', '#60A5FA',
        r.stage >= TRANS_MAX ? '모든 초월을 끝냈어요!<br>기획사 수익이 크게 올라갔어요'
          : '+0부터 다시 시작이에요<br>쌓은 수익 보너스는 그대로예요', false);
    }, 900);
  }

  window.openEnhance = openEnhance;
  window.__enhanceTest = {
    enhBonus: enhBonus, cardBonus: cardBonus, rollEnhance: rollEnhance, planSpend: planSpend, rollDrops: rollDrops,
    rateOf: rateOf, costOf: costOf,
    incomeMult: incomeMult, load: load, doEnhance: doEnhance, doTranscend: doTranscend, transReq: transReq,
    CONST: { MAX_LEVEL: MAX_LEVEL, RATE: RATE, RATE_MULT: RATE_MULT, COST_MULT: COST_MULT, COIN_COST: COIN_COST, STONE_COST: STONE_COST, PROTECT_COST: PROTECT_COST, SAFE_UNTIL: SAFE_UNTIL, TRANS_MAX: TRANS_MAX, DROP: DROP }
  };

  // ════════ 기존 화면에 연결 ════════
  // (함수가 아직 로드 안 됐으면 잠깐 기다렸다가 시도 — 로더가 파일을 순서 없이 불러오기 때문)
  function whenReady(test, fn) {
    var tries = 0;
    (function attempt() {
      var ok = false;
      try { ok = test(); } catch (e) {}
      if (ok) { fn(); return; }
      if (++tries < 200) setTimeout(attempt, 100);
    })();
  }

  // 1) 더보기 메뉴에 타일 붙이기
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var original = window.openMoreMenu;
    if (original.__enhanceWrapped) return;
    var wrapped = function () {
      var r = original.apply(this, arguments);
      var grid = document.getElementById('more-menu-grid');
      if (grid && !document.getElementById('more-enhance-tile')) {
        grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🎤', '트레이닝룸', ACC, 'openEnhance()'));
        if (grid.lastElementChild) grid.lastElementChild.id = 'more-enhance-tile';
      }
      return r;
    };
    wrapped.__enhanceWrapped = true;
    window.openMoreMenu = wrapped;
  });

  // 2) 특별탐험: "탐험하기"를 누를 때마다 스태미나 소모
  whenReady(function () { return typeof window.encounterSpecialCreature === 'function'; }, function () {
    var original = window.encounterSpecialCreature;
    if (original.__enhanceWrapped) return;
    var wrapped = function () {
      if (typeof stamina !== 'undefined') {
        if (stamina < SPECIAL_STAMINA) { toast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (특별탐험은 ' + SPECIAL_STAMINA + ' 필요)'); return; }
        stamina -= SPECIAL_STAMINA;
        if (typeof saveStamina === 'function') saveStamina();
      }
      return original.apply(this, arguments);
    };
    wrapped.__enhanceWrapped = true;
    window.encounterSpecialCreature = wrapped;
  });

  // 3) 특별탐험 화면의 "탐험하기" 버튼에 스태미나 표시
  whenReady(function () { return typeof window.renderSpecialExploreScreen === 'function'; }, function () {
    var original = window.renderSpecialExploreScreen;
    if (original.__enhanceWrapped) return;
    var wrapped = function () {
      var r = original.apply(this, arguments);
      var b = document.querySelector('#special-main-area button[onclick="encounterSpecialCreature()"]');
      if (b && b.textContent.indexOf('⚡') === -1) b.textContent = b.textContent + ' (⚡' + SPECIAL_STAMINA + ')';
      return r;
    };
    wrapped.__enhanceWrapped = true;
    window.renderSpecialExploreScreen = wrapped;
  });

  // 4) 특별탐험 촬영 성공 → 강화석 / 방지권 / 초월석 드랍
  whenReady(function () { return typeof window.resolveSpecialCapture === 'function'; }, function () {
    var original = window.resolveSpecialCapture;
    if (original.__enhanceWrapped) return;
    var wrapped = function (success) {
      var r = original.apply(this, arguments);
      if (!success) return r;
      try {
        var isVariant = (typeof specialExploreState !== 'undefined' && specialExploreState && specialExploreState.creature) ? !!specialExploreState.creature.isVariant : false;
        var d = rollDrops(isVariant);
        if (!d.stone && !d.protect && !d.trans) return r;
        var st = load();
        st.stone += d.stone; st.protect += d.protect; st.trans += d.trans;
        save(st);
        var pills = [];
        if (d.stone) pills.push(['🔨', '강화석 +1', ACC]);
        if (d.protect) pills.push(['🛡️', '방지권 +1', '#4ade80']);
        if (d.trans) pills.push(['💎', '초월석 +1', '#60A5FA']);
        if (d.trans) setTimeout(function () { try { if (window.showBigDrop) window.showBigDrop('trans'); } catch (e) {} }, 900);   // 큰 팝업 (big-drop-popup.js)
        var html = '<div style="display:flex;flex-direction:column;gap:7px;align-items:center;margin-top:8px;">' + pills.map(function (p, i) {
          return '<div style="opacity:0;animation:specialRewardPop 0.45s ease-out forwards;animation-delay:' + (1.1 + i * 0.22) + 's;display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:1.5px solid ' + p[2] + ';border-radius:999px;padding:8px 16px;font-size:13px;font-weight:900;color:#fff;box-shadow:0 4px 10px rgba(0,0,0,0.3);">' +
            '<span style="font-size:16px;">' + p[0] + '</span>' + p[1] + '</div>';
        }).join('') + '</div>';
        var area = document.getElementById('special-main-area');
        if (area) {
          var btn = area.querySelector('button[onclick="renderSpecialExploreScreen()"]');
          if (btn) btn.insertAdjacentHTML('beforebegin', html); else area.insertAdjacentHTML('beforeend', html);
        }
      } catch (e) { /* 드랍 표시에 문제가 있어도 기존 탐험은 그대로 진행 */ }
      return r;
    };
    wrapped.__enhanceWrapped = true;
    window.resolveSpecialCapture = wrapped;
  });
})();
