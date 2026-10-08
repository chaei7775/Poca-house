// ════════════════════════════════════════════════════════════
// 🔒 팬덤 원정 잠금 (expedition-gate.js)
// 첫 데뷔(기획사)를 한 번 시키기 전까지 팬덤 원정(방송국 앞·팬미팅장·공연장·팬 러시 등)이 안 열린다.
// 누르면 안내만 뜨고, 칸은 흐리게 + "🔒 첫 데뷔 후" 표시.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  function debuted() { try { var d = (JSON.parse(localStorage.getItem('ph_agency') || '{}') || {}).done || {}; return Object.keys(d).some(function (k) { return d[k]; }); } catch (e) { return false; } }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }

  function wrap() {
    var f = window.openSpecialCardSelect;
    if (typeof f !== 'function') { setTimeout(wrap, 200); return; }
    if (f.__debutGate) return;
    var g = function () {
      if (!debuted()) { toast('🔒 팬덤 원정은 첫 데뷔를 시키고 나면 열려요!'); return; }
      return f.apply(this, arguments);
    };
    g.__debutGate = true;
    window.openSpecialCardSelect = g;
  }
  wrap();

  function paint() {
    var on = !debuted();
    document.querySelectorAll('button[onclick*="openSpecialCardSelect"]').forEach(function (b) {
      var tag = b.querySelector(':scope > .eg-b');
      if (on) {
        b.style.opacity = '.5'; b.style.filter = 'grayscale(.6)';
        if (!tag) { tag = document.createElement('span'); tag.className = 'eg-b'; tag.textContent = '🔒 첫 데뷔 후'; tag.style.cssText = 'margin-left:6px;font-size:10px;font-weight:900;color:#ffb3c1;white-space:nowrap;'; b.appendChild(tag); }
      } else {
        if (b.style.opacity === '0.5') { b.style.opacity = ''; b.style.filter = ''; }
        if (tag) tag.remove();
      }
    });
  }
  setInterval(paint, 1000);
})();
