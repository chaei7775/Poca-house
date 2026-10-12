// ════════════════════════════════
// 🎯 홈 목표 카드 (home-goal.js) — 홈에 "지금 할 일" 하나 + 월드스타까지 바
// 길잡이 카드가 끝난 뒤(또는 길잡이가 없을 때)만 보여요. 길잡이가 있으면 그게 목표라서 겹치지 않음.
// 우선순위: 받을 보상 → 이번 주 테마 → 월드스타 → 일일 알바 → 다 했음
// ════════════════════════════════
(function () {
  'use strict';
  var ID = 'hg-home-card', ACC = '#fbbf24';
  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function guideActive() { try { return !!(window.__guideTest && window.__guideTest.currentIndex() >= 0); } catch (e) { return false; } }

  // 월드스타: 가장 앞선 멤버 기준
  function star() {
    try {
      var all = window.__worldstar && window.__worldstar.all(); if (!all || !all.length) return null;
      var best = all.slice().sort(function (a, b) { return b.score - a.score; })[0];
      var done = all.filter(function (s) { return s.world; }).length;
      return { best: best, pct: Math.round(best.score * 100), declared: done, ready: all.some(function (s) { return s.ready; }), allWorld: done === all.length };
    } catch (e) { return null; }
  }
  function nextStep(s) {   // 가장 앞선 멤버가 아직 못 한 단계
    try { return s.best.steps.filter(function (x) { return !x.done; })[0] || null; } catch (e) { return null; }
  }

  function pick() {
    var st = star(), c = window.__career;
    try { if (c && c.claimable() > 0) return { icon: '🏆', title: '받을 보상이 ' + c.claimable() + '개 있어요', sub: '커리어에서 시상식·특기·주간 상자를 받아요', go: 'openCareer' }; } catch (e) {}
    try {
      if (c) { var th = c.theme(), n = Math.min(5, c.weekCount()); if (n < 5) return { icon: '📅', title: '이번 주 테마 · ' + th.name, sub: th.tip + ' (' + n + ' / 5) · 보상 ×1.5', go: 'openCareer' }; }
    } catch (e) {}
    if (st && !st.allWorld) {
      if (st.ready) return { icon: '🌟', title: '월드스타 선언할 수 있어요!', sub: '월드스타 화면에서 선언해요', go: 'openWorldStar' };
      var ns = nextStep(st);
      if (ns) return { icon: ns.icon || '🌟', title: '월드스타까지: ' + ns.name, sub: ns.text, go: ns.fn || 'openWorldStar' };
    }
    try {
      var d = J('ph_daily', {}), q = window.__dailyQuest; if (q && typeof albaDone !== 'undefined' && albaDone - ((d.albaBase) || 0) < 2) return { icon: '🍔', title: '오늘 알바 2판', sub: '강화석과 재료를 받을 수 있어요', go: 'alba' };
    } catch (e) {}
    return { icon: '🎉', title: '오늘 목표를 다 했어요!', sub: '스테이지에서 더 도전해 봐요', go: null };
  }

  function html() {
    var g = pick(), st = star();
    var bar = '';
    if (st) bar = '<div style="margin-top:9px;"><div style="display:flex;justify-content:space-between;font-size:10.5px;color:#d9ccff;margin-bottom:3px;"><span>🌏 월드스타까지</span><span>' + (st.allWorld ? '전원 월드스타!' : st.pct + '%') + '</span></div>' +
      '<div style="height:7px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;"><div style="width:' + (st.allWorld ? 100 : st.pct) + '%;height:100%;background:linear-gradient(90deg,#a78bfa,' + ACC + ');"></div></div></div>';
    return '<div style="display:flex;align-items:center;gap:10px;"><div style="font-size:30px;line-height:1;">' + g.icon + '</div>' +
      '<div style="flex:1;min-width:0;"><div style="font-size:10.5px;color:' + ACC + ';font-weight:900;">🎯 지금 할 일</div>' +
      '<div style="font-size:14px;font-weight:900;color:#fff;line-height:1.3;">' + esc(g.title) + '</div>' +
      '<div style="font-size:11px;color:#d9ccff;line-height:1.4;">' + esc(g.sub) + '</div></div>' +
      (g.go ? '<button data-hg="' + g.go + '" style="border:none;border-radius:12px;padding:9px 14px;font-weight:900;font-size:12.5px;font-family:inherit;background:linear-gradient(135deg,#ffd45e,#ff9d3d);color:#4a2a00;">가기</button>' : '') + '</div>' + bar;
  }

  function go(fn) {
    try {
      if (fn === 'alba') { goTo('alba'); return; }
      if (fn === 'bond') { goTo('bond'); return; }
      if (typeof window[fn] === 'function') window[fn]();
    } catch (e) {}
  }

  var last = '';
  function render() {
    var home = document.getElementById('screen-home'); if (!home) return;
    var old = document.getElementById(ID);
    if (guideActive()) { if (old) old.remove(); return; }
    if (!old) {
      old = document.createElement('div'); old.id = ID;
      old.style.cssText = 'margin:8px 12px;padding:12px 14px;border-radius:16px;background:linear-gradient(135deg,rgba(124,58,237,.35),rgba(30,20,60,.85));border:1.5px solid rgba(251,191,36,.45);box-shadow:0 4px 14px rgba(0,0,0,.25);font-family:\'Noto Sans KR\',sans-serif;';
      var dq = document.getElementById('dq-home-card'), actions = home.querySelector('.home-actions');
      if (dq && dq.parentNode === home) home.insertBefore(old, dq); else if (actions) home.insertBefore(old, actions); else home.appendChild(old);
    }
    var h = html(); if (h === last && old.innerHTML) return; last = h; old.innerHTML = h;
    var b = old.querySelector('[data-hg]'); if (b) b.onclick = function () { go(b.getAttribute('data-hg')); };
  }
  setInterval(function () { try { render(); } catch (e) {} }, 1500);
  setTimeout(render, 1200);
  window.__homeGoal = { pick: pick, render: render };
})();
