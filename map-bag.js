// 🎒 맵(탐험) 안에서도 가방 열기 — 탐험 화면 위에 떠 있는 🎒 버튼 → 가방 목록 → 아이템 눌러서 사용
// 사용 가능한 건 기존 가방 상세창(음료 1/5/10개/가득 등)을 그대로 씀. 탐험은 계속 진행 중이라 뒤에서 그대로 있음.
(function () {
  'use strict';
  var IDS = ['beach', 'beauty', 'forest', 'housing', 'mystery', 'park', 'set', 'special', 'square', 'studio', 'fishing', 'concert', 'worldtour', 'paparazzi', 'rhythm'];
  function $(id) { return document.getElementById(id); }
  function inMap() {
    for (var i = 0; i < IDS.length; i++) { var e = $(IDS[i] + '-overlay'); if (e) { var cs = getComputedStyle(e); if (cs.display !== 'none' && cs.visibility !== 'hidden') return true; } }
    return false;
  }
  var st = document.createElement('style');
  st.textContent = '#bag-detail-overlay{z-index:9100 !important}#mapbag-btn{position:fixed;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:8000;width:46px;height:46px;border-radius:50%;border:2px solid #fff8;background:rgba(20,10,40,.82);font-size:22px;color:#fff;box-shadow:0 3px 10px #0008;display:none;align-items:center;justify-content:center;padding:0}';
  document.head.appendChild(st);
  var btn = document.createElement('button');
  btn.id = 'mapbag-btn'; btn.textContent = '🎒';
  btn.onclick = function (e) { e.stopPropagation(); openMapBag(); };
  btn.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
  btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  document.body.appendChild(btn);

  function openMapBag() {
    var old = $('mapbag-ov'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'mapbag-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.8);display:flex;align-items:flex-end;justify-content:center;';
    ov.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    ov.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    var sheet = document.createElement('div');
    sheet.style.cssText = 'width:100%;max-width:430px;max-height:72vh;background:linear-gradient(180deg,#2d1b4e,#1a1a2e);border-radius:20px 20px 0 0;padding:16px 14px calc(16px + env(safe-area-inset-bottom));overflow-y:auto;color:#fff;font-family:inherit;';
    ov.appendChild(sheet);
    document.body.appendChild(ov);
    function draw() {
      var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><b style="font-size:16px;">🎒 내 가방</b><button id="mapbag-x" style="background:none;border:none;color:#fff;font-size:22px;">✕</button></div>';
      h += '<div style="font-size:12px;color:#ffd6e8;margin-bottom:10px;">⚡ 스태미나 ' + stamina + ' / ' + STAMINA_MAX + ' · 음료를 눌러서 바로 마셔요</div>';
      h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">';
      bagItems.forEach(function (it, i) {
        var usable = it.type === 'drink';
        var vis = it.img ? '<img src="' + it.img + '" loading="lazy" style="width:36px;height:36px;object-fit:contain;" onerror="this.style.display=\'none\'">' : '<div style="font-size:26px;">' + (it.emoji || '📦') + '</div>';
        h += '<div data-i="' + i + '" style="position:relative;background:' + (usable ? 'rgba(96,165,250,.25)' : 'rgba(255,255,255,.08)') + ';border:1px solid ' + (usable ? '#60a5fa' : '#fff2') + ';border-radius:12px;padding:8px 2px;text-align:center;">' + vis +
          '<div style="font-size:10px;margin-top:2px;line-height:1.2;word-break:keep-all;">' + String(it.name).replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim().slice(0, 7) + '</div>' +
          '<div style="position:absolute;top:2px;right:4px;font-size:10px;font-weight:900;color:#ffd700;">' + (it.qty > 1 ? '×' + it.qty : '') + '</div></div>';
      });
      h += '</div>';
      if (!bagItems.length) h += '<div style="text-align:center;opacity:.6;padding:24px;">가방이 비어 있어요</div>';
      sheet.innerHTML = h;
      var x = $('mapbag-x'); if (x) x.onclick = function () { ov.remove(); };
      sheet.querySelectorAll('[data-i]').forEach(function (el) {
        el.onclick = function () {
          var it = bagItems[+el.getAttribute('data-i')];
          if (!it) return;
          if (it.type === 'drink' || it.type === 'crystal') { showBagItemDetail(+el.getAttribute('data-i')); }
          else if (typeof showBagToast === 'function') showBagToast((it.emoji || '') + ' ' + it.name + (it.desc ? ' · ' + it.desc : '') + ' (맵 밖에서 쓰는 아이템이에요)');
        };
      });
    }
    draw();
    ov._redraw = draw;
  }
  // 음료 쓰고 나면 목록 갱신
  function hook() {
    if (typeof window.renderBag !== 'function' || window.renderBag.__mb) return false;
    var o = window.renderBag;
    window.renderBag = function () { var r = o.apply(this, arguments); var m = $('mapbag-ov'); if (m && m._redraw) m._redraw(); return r; };
    window.renderBag.__mb = true; return true;
  }
  var tries = 0; var t = setInterval(function () { if (hook() || ++tries > 40) clearInterval(t); }, 500);
  setInterval(function () { btn.style.display = inMap() ? 'flex' : 'none'; if (!inMap()) { var m = $('mapbag-ov'); if (m) m.remove(); } }, 600);
})();
