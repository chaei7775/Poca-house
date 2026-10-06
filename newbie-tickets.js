// ════════════════════════════════════════════════════════════
// 🎟️ 신규 유저 뽑기권 (newbie-tickets.js) — 처음엔 아이돌부터 만나게 하고, 뽑기권을 단계별로 나눠 준다
// · 새 계정(starter-boost.js 가 'ph_starter_v1'='1' 로 표시한 계정)에만 적용. 기존 계정은 아무 영향 없음.
// · 뽑기권이 있으면 코인 대신 뽑기권이 먼저 쓰인다 (1회=1장, 3회=3장).
// · 첫 뽑기는 SR 이상 아이돌 카드가 보장된다.
// ✏️ 고치는 법: 아래 GRANTS 숫자만 바꾸면 됨
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_gachaTickets', GIVEN = 'ph_ticket_given', FIRST = 'ph_firstpull_done';
  var GRANTS = {                // 조건 → 지급 장수
    start: 5,                   // 처음 접속
    first_meet: 5,              // 아이돌 첫 만남(선물/대화)
    first_alba: 5,              // 첫 알바
    first_school: 5,            // 첫 등교
    attend_3: 5,                // 출석 3일차
    attend_7: 5                 // 출석 7일차
  };

  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v === null ? d : v; } catch (e) { return d; } }
  function tickets() { return parseInt(localStorage.getItem(KEY) || '0') || 0; }
  function setTickets(n) { try { localStorage.setItem(KEY, String(Math.max(0, n))); } catch (e) {} }
  function isNew() { return localStorage.getItem('ph_starter_v1') === '1'; }

  function toast(msg) { try { if (typeof showBagToast === 'function') showBagToast(msg); } catch (e) {} }
  function grant(cond) {
    try {
      var n = GRANTS[cond]; if (!n || !isNew()) return;
      var g = J(GIVEN, {}); if (g[cond]) return;
      g[cond] = 1; localStorage.setItem(GIVEN, JSON.stringify(g));
      setTickets(tickets() + n);
      setTimeout(function () { toast('🎟️ 뽑기권 ' + n + '장을 받았어요! ✨ 뽑기에서 쓸 수 있어요'); refreshUI(); }, 900);
    } catch (e) {}
  }

  // ── 뽑기: 뽑기권 먼저 사용 + 첫 뽑기 SR 보장 ──
  function hookDraw() {
    if (typeof window.doDraw !== 'function' || typeof window.drawOne !== 'function') { setTimeout(hookDraw, 100); return; }
    if (window.doDraw.__tk) return;
    var orig = window.doDraw;
    var w = function (count) {
      var paid = false, cost = 0;
      try {
        var t = tickets();
        if (t >= count) {
          cost = count === 1 ? CONFIG.gacha.one : CONFIG.gacha.three;
          coins += cost; paid = true;              // 원래 함수가 코인을 빼 가므로 미리 채워 두면 결과적으로 0
          setTickets(t - count);
        }
        if (!localStorage.getItem(FIRST) && isNew() && owned.length === 0) {
          localStorage.setItem(FIRST, '1');
          var real = Math.random, first = true;     // 첫 번째 난수만 0.15 → SR 구간, 이후는 정상
          Math.random = function () { if (first) { first = false; Math.random = real; return 0.15; } return real(); };
        }
      } catch (e) {}
      var r = orig.apply(this, arguments);
      try { if (paid) { saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } } catch (e) {}
      setTimeout(refreshUI, 200);
      return r;
    };
    w.__tk = true; window.doDraw = w;
  }

  // ── 화면: 뽑기 버튼에 뽑기권 표시 ──
  function refreshUI() {
    try {
      var scr = document.getElementById('screen-gacha'); if (!scr) return;
      var t = tickets();
      var b1 = scr.querySelector('.gacha-btn-1'), b3 = scr.querySelector('.gacha-btn-3');
      function lab(btn, n, base) {
        if (!btn) return; var sp = btn.querySelector('span'); if (!sp) return;
        if (!sp.dataset.base) sp.dataset.base = sp.textContent;
        sp.textContent = t >= n ? '🎟️ ' + n + '장' : sp.dataset.base;
      }
      lab(b1, 1); lab(b3, 3);
      var bar = document.getElementById('ticket-bar');
      if (t > 0 && b1) {
        if (!bar) { bar = document.createElement('div'); bar.id = 'ticket-bar';
          bar.style.cssText = 'margin-top:30px;margin-bottom:-18px;padding:7px 16px;border-radius:20px;background:rgba(255,215,0,.15);border:1.5px solid #FFD700;color:#FFD700;font-size:13px;font-weight:900;';
          b1.parentNode.parentNode.insertBefore(bar, b1.parentNode); }
        bar.textContent = '🎟️ 뽑기권 ' + t + '장';
      } else if (bar) bar.remove();
    } catch (e) {}
  }
  setInterval(refreshUI, 600);

  // ── 지급 시점 감시 ──
  function hookCheck(name) {
    (function t() {
      if (typeof window[name] !== 'function') { setTimeout(t, 100); return; }
      if (window[name].__tk) return;
      var o = window[name];
      var w = function (c) { var r = o.apply(this, arguments); grant(c); return r; };
      w.__tk = true; window[name] = w;
    })();
  }
  hookCheck('checkQuestProgress'); hookCheck('checkStoryCondition');
  (function hookAttend() {
    if (typeof window.closeAttend !== 'function') { setTimeout(hookAttend, 100); return; }
    var o = window.closeAttend;
    window.closeAttend = function () { var d = window._attendDay; var r = o.apply(this, arguments); if (d === 3) grant('attend_3'); if (d === 7) grant('attend_7'); return r; };
  })();

  // ── 처음 접속 지급 (starter-boost 가 새 계정 표시를 해 둔 뒤) ──
  (function initStart() {
    if (localStorage.getItem('ph_starter_v1') === null) { setTimeout(initStart, 200); return; }
    grant('start');
  })();
  hookDraw();
  window.__ticketTest = { tickets: tickets, setTickets: setTickets, grant: grant, GRANTS: GRANTS };
})();
