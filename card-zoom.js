// ════════════════════════════════
// 🔍 카드 크게 보기 (card-zoom.js)
// 내 컬렉션 · 히든카드 도감 · 한정 도감 등에서 카드 그림을 누르면 화면 가득 크게 보여준다.
// 아무 곳이나 누르면 닫힘. (잠긴 칸/아주 작은 그림은 제외)
// 어느 화면에서 켤지는 아래 AREAS 만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';
  var AREAS = '#collection-grid, #hidden-dex-overlay, #lim-dex, #dex-overlay';

  function lockedLike(img) {
    try {
      if (img.closest('.card-locked')) return true;
      var cs = getComputedStyle(img);
      if (cs.display === 'none' || cs.visibility === 'hidden') return true;
      if (/brightness\(0|grayscale\(1/.test(cs.filter || '') && !/brightness\(0?\.[6-9]/.test(cs.filter)) return true;
      var p = img.parentElement, o = 1;
      while (p && p !== document.body) { o *= parseFloat(getComputedStyle(p).opacity || 1); p = p.parentElement; }
      if (o < 0.5) return true;
    } catch (e) {}
    return false;
  }

  function show(src) {
    var old = document.getElementById('card-zoom'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'card-zoom';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99995;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;animation:czIn .18s ease-out;';
    ov.innerHTML = '<style>@keyframes czIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}</style>' +
      '<img src="' + src.replace(/"/g, '&quot;') + '" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:14px;box-shadow:0 0 30px rgba(255,215,0,.25);">' +
      '<div style="position:absolute;top:12px;right:14px;color:#fff;font-size:22px;font-weight:900;opacity:.8;">✕</div>' +
      '<div style="position:absolute;bottom:14px;left:0;right:0;text-align:center;color:#aaa;font-size:11px;">아무 곳이나 누르면 닫혀요</div>';
    ov.onclick = function () { ov.remove(); };
    document.body.appendChild(ov);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    if (t.closest('#card-zoom')) return;
    if (!t.closest(AREAS)) return;
    var w = t.getBoundingClientRect().width;
    if (w < 60 || !t.src || lockedLike(t)) return;
    e.stopPropagation(); e.preventDefault();
    show(t.currentSrc || t.src);
  }, true);
})();
