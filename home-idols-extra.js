// ════════════════════════════════════════════════════════════
// 🏠 홈 '내 아이돌' 칸 보강 (home-idols-extra.js)
// 홈의 '내 아이돌'은 UR/SSR 카드(ph_owned)만 보여줘서, 히든 카드·프리미엄 카드만 가진 계정은 "아직 카드가 없어요"로 보였다.
// → UR/SSR 이 없을 때는 가진 히든·프리미엄 카드를 대신 보여준다. (UR/SSR 이 있으면 원래 모습 그대로)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function nameOf(cid) { try { return CHARS[cid].name.replace(/[^\u0000-\u007F가-힣\s]/g, '').trim(); } catch (e) { return cid; } }
  function extra() {
    var list = [];
    try {
      var ids = (typeof ownedHiddenCards !== 'undefined' && ownedHiddenCards) || jget('ph_hiddenCards', []);
      (ids || []).forEach(function (id) {
        var h = (typeof HIDDEN_CARDS !== 'undefined' ? HIDDEN_CARDS : []).filter(function (x) { return x.id === id; })[0];
        if (h) list.push({ grade: h.grade || '히든', name: h.name, color: h.grade === '에픽히든' ? '#C084FC' : '#6366F1' });
      });
    } catch (e) {}
    try {
      var pc = jget('ph_premiumCards', {});
      Object.keys(pc || {}).forEach(function (cid) { if (pc[cid] && pc[cid].lv > 0) list.push({ grade: '프리미엄', name: nameOf(cid) + ' Lv.' + pc[cid].lv, color: '#F59E0B' }); });
    } catch (e) {}
    return list;
  }
  function patch() {
    var chips = document.getElementById('home-idol-chips');
    if (!chips || !chips.querySelector('.empty-idol')) return;   // UR/SSR 이 있으면 그대로
    var list = extra(); if (!list.length) return;
    chips.innerHTML = list.slice(0, 5).map(function (c) { return '<div class="idol-chip"><span class="grade" style="background:' + c.color + '">' + c.grade + '</span>' + c.name + '</div>'; }).join('') +
      (list.length > 5 ? '<div class="idol-chip">+' + (list.length - 5) + '</div>' : '');
  }
  function hook() {
    if (typeof window.renderHomeIdols !== 'function') { setTimeout(hook, 150); return; }
    var orig = window.renderHomeIdols; if (orig.__hxWrapped) return;
    var w = function () { var r = orig.apply(this, arguments); try { patch(); } catch (e) {} return r; };
    w.__hxWrapped = true; window.renderHomeIdols = w;
    try { patch(); } catch (e) {}
  }
  hook();
})();
