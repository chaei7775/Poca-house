// ════════════════════════════════
// 🏅 시그니처 카드 (signature.js) — 육성의 최종 목표
// 아이돌 한 명마다 엔드급 조건을 모두 채우면 "시그니처 카드"를 받는다 (뽑기로 못 얻음).
//  조건: 능력치 5개 전부 90↑ · 레슨 누적 120회 · 드라마 30 · CF 30 · 음방 1위 10 · 팬카페 회원 100명 · 히든카드 초월 2단계↑
//        + 받는 순간 비주얼·체력·기분 80↑
//  효과: 그 아이돌의 드라마·CF·음방·컴백·기획사 수익 영구 +20% (레슨 보너스와 따로 곱해짐)
//  주의: 드라마/CF/음방 횟수는 이 기능이 생긴 뒤부터 센다. (이전 기록은 없음)
//  화면: 📅 스케줄·식사 화면의 "🏅 시그니처 카드" 버튼. 카드 그림: signature-<아이돌id>.jpg (없으면 임시 카드)
// 저장: localStorage 'ph_signature' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_signature';
  var NEED = { stat: 90, lessons: 120, drama: 30, cf: 30, show: 10, fans: 100, trans: 2, cond: 80 };
  var BONUS = 0.20;
  var CIDS = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];
  var NAMES = { minjun: '민준', sion: '시온', doyun: '도윤', harin: '하린', yuna: '윤아', ara: '아라' };
  var COLORS = { minjun: '#F59E0B', sion: '#818cf8', doyun: '#9ca3af', harin: '#a78bfa', yuna: '#f472b6', ara: '#fb7185' };
  var STATS = ['vocal', 'dance', 'act', 'fun', 'charm'];
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;

  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function load() {
    var s = J(KEY, null); if (!s || typeof s !== 'object') s = {};
    if (!s.n || typeof s.n !== 'object') s.n = {};
    if (!s.got || typeof s.got !== 'object') s.got = {};
    return s;
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function toast(m) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e) {} }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bump(cid, k) {
    if (CIDS.indexOf(cid) < 0) return;
    var s = load(); if (!s.n[cid]) s.n[cid] = {};
    s.n[cid][k] = (s.n[cid][k] || 0) + 1; save(s);
  }
  function has(cid) { return !!load().got[cid]; }

  // ── 횟수 세기 (이벤트로 받음) ──
  try {
    window.addEventListener('ph-drama-shot', function (e) {
      var d = (e && e.detail) || {}; if (!d.ch || !(d.pay > 0)) return;
      bump(d.ch, 'drama');
      if (has(d.ch)) pay(d.ch, d.pay, '드라마');
    });
    window.addEventListener('ph-cf-shot', function (e) {
      var d = (e && e.detail) || {}; if (!d.cid || !(d.pay > 0)) return;
      bump(d.cid, 'cf');
      if (has(d.cid)) pay(d.cid, d.pay, 'CF');
    });
  } catch (e) {}
  function pay(cid, base, label) {
    var extra = Math.round(base * BONUS / 10) * 10; if (!(extra > 0)) return;
    try { if (typeof coins !== 'undefined') { coins += extra; try { saveAll(); } catch (e) {} } } catch (e) {}
    toast('🏅 ' + NAMES[cid] + ' 시그니처 ' + label + ' 보너스 +' + extra.toLocaleString() + '코인');
  }
  // 음악방송 1위: 결과가 저장되면 한 번만 센다
  function pollShow() {
    try {
      var c = J('ph_chart', null); if (!c || !c.show || !c.show.done || !c.show.res || !c.show.res.win) return;
      var id = String(c.show.sid) + '|' + String(c.show.day) + '|' + String(c.show.res.mine);
      var s = load(); if (s.lastShow === id) return;
      s.lastShow = id; save(s);
      bump(c.show.res.cid, 'show');
    } catch (e) {}
  }
  setInterval(pollShow, 3000);

  // ── 조건 읽기 ──
  function statsOf(cid) {
    var v = {}; var g = (typeof window.getIdolTrainStat === 'function') ? window.getIdolTrainStat(cid) : null;
    STATS.forEach(function (k) { v[k] = g && g[k] != null ? Number(g[k]) : 10; });
    return v;
  }
  function lessonsOf(cid) { var t = J('ph_training', {}) || {}; return Number((t.count || {})[cid]) || 0; }
  function fansOf(cid) {
    try {
      var t = window.__fancafeTest; if (!t) return 0;
      var ic = t.loadAll().idols[cid]; return ic ? t.members(ic) : 0;
    } catch (e) { return 0; }
  }
  function transOf(cid) {
    var st = (J('ph_enhance', {}) || {}).stage || {}, best = 0;
    ['rare', 'epic'].forEach(function (g) { best = Math.max(best, Number(st['hidden_' + cid + '_' + g]) || 0); });
    return best;
  }
  function condOf(cid) {
    try { var m = window.__mealTest; if (m) { var c = m.statOf(m.load(), cid); return { v: c.v, s: c.s, m: c.m }; } } catch (e) {}
    return { v: 50, s: 50, m: 50 };
  }
  function debuted(cid) { try { return !!((J('ph_agency', {}) || {}).done || {})[cid]; } catch (e) { return false; } }
  function progress(cid) {
    var s = load(), n = s.n[cid] || {}, st = statsOf(cid), lo = Math.min.apply(null, STATS.map(function (k) { return st[k]; }));
    var rows = [
      { t: '능력치 5개 전부 ' + NEED.stat + '↑', now: lo, need: NEED.stat, ok: lo >= NEED.stat, txt: '가장 낮은 ' + lo + ' / ' + NEED.stat },
      { t: '레슨 누적', now: lessonsOf(cid), need: NEED.lessons },
      { t: '드라마 촬영', now: n.drama || 0, need: NEED.drama },
      { t: 'CF 촬영', now: n.cf || 0, need: NEED.cf },
      { t: '음악방송 1위', now: n.show || 0, need: NEED.show },
      { t: '팬카페 회원', now: fansOf(cid), need: NEED.fans },
      { t: '히든카드 초월 단계', now: transOf(cid), need: NEED.trans }
    ];
    rows.forEach(function (r) { if (r.ok == null) r.ok = r.now >= r.need; if (!r.txt) r.txt = Math.min(r.now, 99999) + ' / ' + r.need; });
    var c = condOf(cid), cond = Math.min(c.v, c.s, c.m);
    return { rows: rows, allOk: rows.every(function (r) { return r.ok; }), cond: cond, condOk: cond >= NEED.cond };
  }

  // ── 효과 (레슨 보너스 함수에 곱해 붙임) ──
  function wrap(name, fn) {
    var old = window[name];
    window[name] = function (cid, type) {
      var base = typeof old === 'function' ? Number(old.apply(this, arguments)) || 1 : 1;
      return fn(cid, type, base);
    };
  }
  function install() {
    if (typeof window.__lessonPayMult !== 'function') { setTimeout(install, 300); return; }
    if (window.__sigWrapped) return; window.__sigWrapped = 1;
    wrap('__lessonPayMult', function (cid, type, base) {
      return (has(cid) && (type === 'drama' || type === 'music' || type === 'comeback')) ? base * (1 + BONUS) : base;
    });
    wrap('__lessonIncomeMult', function (cid, type, base) { return has(cid) ? base * (1 + BONUS) : base; });
  }
  install();

  // ── 받기 ──
  function claim(cid) {
    var p = progress(cid);
    if (has(cid) || !debuted(cid)) return;
    if (!p.allOk) { toast('아직 조건이 남았어요'); return; }
    if (!p.condOk) { toast('컨디션(비주얼·체력·기분)이 ' + NEED.cond + ' 이상이어야 받을 수 있어요. 식사·휴식으로 올려요!'); return; }
    var s = load(); s.got[cid] = Date.now(); save(s);
    celebrate(cid);
  }
  function cardImg(cid, w) {
    return '<div style="position:relative;width:' + w + 'px;aspect-ratio:3/4;border-radius:14px;overflow:hidden;background:linear-gradient(160deg,' + COLORS[cid] + ',#1b1033);border:2px solid #FFD700;box-shadow:0 0 18px rgba(255,215,0,0.45);">' +
      '<img src="signature-' + cid + '.jpg" loading="lazy" decoding="async" alt="" onerror="this.style.display=\'none\'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">' +
      '<div style="position:absolute;left:0;right:0;bottom:6px;text-align:center;color:#FFE27A;font-weight:900;font-size:11px;text-shadow:0 1px 3px #000;">🏅 ' + NAMES[cid] + ' SIGNATURE</div></div>';
  }
  function celebrate(cid) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;padding:18px;' + FONT;
    ov.innerHTML = '<div style="background:#1b1033;border:2px solid #FFD700;border-radius:20px;padding:20px;text-align:center;max-width:320px;width:100%;">' +
      '<div style="font-size:18px;font-weight:900;color:#FFE27A;margin-bottom:10px;">🏅 시그니처 카드 획득!</div>' +
      '<div style="display:flex;justify-content:center;margin-bottom:12px;">' + cardImg(cid, 150) + '</div>' +
      '<div style="font-size:13px;color:#fff;line-height:1.6;margin-bottom:12px;">' + NAMES[cid] + '이(가) 최고의 아이돌로 완성됐어요!<br><b style="color:#ffe27a;">드라마·CF·음방·컴백·기획사 수익 영구 +' + Math.round(BONUS * 100) + '%</b></div>' +
      '<button style="' + BTN + 'width:100%;padding:12px;background:linear-gradient(135deg,#FFD700,#ff9f45);color:#2a1a00;font-size:14px;">확인</button></div>';
    ov.querySelector('button').onclick = function () { ov.remove(); try { open(); } catch (e) {} };
    document.body.appendChild(ov);
  }

  // ── 화면 ──
  function bar(r) {
    var pct = Math.max(0, Math.min(100, Math.round((r.now / r.need) * 100)));
    return '<div style="margin-bottom:5px;"><div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:800;color:' + (r.ok ? '#7fe3a5' : '#c9cff0') + ';"><span>' + (r.ok ? '✅ ' : '') + esc(r.t) + '</span><span>' + esc(r.txt) + '</span></div>' +
      '<div style="height:5px;border-radius:3px;background:rgba(255,255,255,0.1);overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:' + (r.ok ? '#4ade80' : '#a78bfa') + ';"></div></div></div>';
  }
  function cardBox(cid) {
    var got = has(cid), deb = debuted(cid), p = progress(cid), done = p.rows.filter(function (r) { return r.ok; }).length;
    var head = '<div style="display:flex;gap:10px;align-items:flex-start;">' + cardImg(cid, 74) + '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:14px;font-weight:900;color:' + COLORS[cid] + ';">' + NAMES[cid] + (got ? ' <span style="color:#FFE27A;">· 시그니처 보유 ✨</span>' : '') + '</div>' +
      '<div style="font-size:10.5px;color:#aab4d6;margin:2px 0 6px;">' + (got ? '수익 영구 +' + Math.round(BONUS * 100) + '% 적용 중' : (deb ? '조건 ' + done + ' / ' + p.rows.length + ' 달성' : '아직 데뷔 전이에요')) + '</div></div></div>';
    if (got || !deb) return '<div style="background:rgba(255,255,255,0.06);border-radius:14px;padding:10px;margin-bottom:10px;">' + head + '</div>';
    var cond = '<div style="font-size:10.5px;font-weight:800;color:' + (p.condOk ? '#7fe3a5' : '#ffb4b4') + ';margin:4px 0 6px;">받을 때 컨디션: 가장 낮은 값 ' + p.cond + ' / ' + NEED.cond + '</div>';
    var btn = '<button data-claim="' + cid + '" style="' + BTN + 'width:100%;padding:10px;font-size:13px;background:' + (p.allOk ? 'linear-gradient(135deg,#FFD700,#ff9f45)' : 'rgba(255,255,255,0.1)') + ';color:' + (p.allOk ? '#2a1a00' : '#8f98c2') + ';">' + (p.allOk ? '🏅 시그니처 카드 받기' : '조건을 채워요') + '</button>';
    return '<div style="background:rgba(255,255,255,0.06);border-radius:14px;padding:10px;margin-bottom:10px;">' + head +
      '<div style="margin-top:6px;">' + p.rows.map(bar).join('') + '</div>' + cond + btn + '</div>';
  }
  function open() {
    var old = document.getElementById('sig-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'sig-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:850;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    ov.innerHTML = '<div style="background:#1a1233;border:1.5px solid #FFD700;border-radius:18px;width:100%;max-width:400px;max-height:88vh;display:flex;flex-direction:column;">' +
      '<div style="padding:14px 16px 8px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;color:#FFE27A;">🏅 시그니처 카드</div>' +
      '<button id="sig-x" style="' + BTN + 'margin-left:auto;background:rgba(255,255,255,0.1);color:#fff;padding:6px 12px;font-size:12px;">닫기</button></div>' +
      '<div style="padding:0 16px 8px;font-size:11px;line-height:1.55;color:#aab4d6;">육성의 끝! 조건을 전부 채우면 아이돌의 시그니처 카드를 받아요. 뽑기로는 못 얻어요. 드라마·CF·음방 횟수는 이 기능이 생긴 뒤부터 세요.</div>' +
      '<div id="sig-list" style="overflow-y:auto;padding:4px 16px 16px;">' + CIDS.map(cardBox).join('') + '</div></div>';
    document.body.appendChild(ov);
    ov.querySelector('#sig-x').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-claim]').forEach(function (b) { b.onclick = function () { claim(b.getAttribute('data-claim')); }; });
  }

  // ── 스케줄·식사 화면에 버튼 ──
  function inject(ov) {
    if (!ov || ov.querySelector('#sig-btn')) return;
    var anchor = ov.querySelector('#idol-board-btn') || ov.querySelector('#meal-cal'); if (!anchor) return;
    var b = document.createElement('button');
    b.id = 'sig-btn';
    b.style.cssText = BTN + 'width:100%;margin:-4px 0 12px;padding:10px;background:rgba(255,215,0,0.12);border:1.5px solid rgba(255,215,0,0.5);color:#fff;font-size:13px;';
    var n = Object.keys(load().got).length;
    b.innerHTML = '🏅 시그니처 카드 <span style="color:#FFE27A;">· ' + n + ' / 6</span>';
    b.onclick = open;
    anchor.insertAdjacentElement('afterend', b);
  }
  function watch() {
    if (typeof MutationObserver === 'undefined' || !document.body) return;
    var watched = null;
    function attach(ov) {
      if (watched === ov) return; watched = ov; inject(ov);
      new MutationObserver(function () { inject(ov); }).observe(ov, { childList: true });
    }
    var first = document.getElementById('meal-overlay'); if (first) attach(first);
    new MutationObserver(function () { var ov = document.getElementById('meal-overlay'); if (ov) attach(ov); }).observe(document.body, { childList: true });
  }
  function boot() { watch(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.__sigTest = { NEED: NEED, BONUS: BONUS, progress: progress, claim: claim, open: open, has: has, load: load, save: save, bump: bump, pollShow: pollShow, celebrate: celebrate };
})();
