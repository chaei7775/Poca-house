// ════════════════════════════════
// 📱 모바일 화면 맞춤 (mobile-fit.js)
// 다양한 폰 크기(작은 폰 320px ~ 큰 폰 430px, 노치/홈바 있는 폰)에서 화면이 깨지거나 터치가 어긋나지 않게 보정한다.
//  1) 상단바: 좁은 폰에서 닉네임이 한 글자씩 세로로 꺾이던 것 → 한 줄 + 말줄임
//  2) 지도 장소 버튼: 폭에 맞춰 글자 크기를 줄이고, 화면 밖으로 삐져나가면 안으로 밀어 넣음
//  3) 터치 영역: 작은 버튼(높이/폭 40px 미만)은 눈에 안 보이게 터치 범위만 넓힘
//  4) 아이폰 홈바(세이프 에어리어) 아래로 하단 메뉴가 안 가리게 / 주소창 때문에 100vh 가 넘치던 것 → 100dvh
//  5) 버튼 더블탭 확대·지연 방지 (touch-action: manipulation)
// game.js / index.html 의 레이아웃은 건드리지 않고 덮어쓰기(CSS)만 한다.
// ════════════════════════════════
(function () {
  'use strict';
  try {   // 노치 폰에서 화면 전체를 쓰고, 아래는 세이프 에어리어로 비움
    var mv = document.querySelector('meta[name="viewport"]');
    if (mv && mv.content.indexOf('viewport-fit') < 0) mv.setAttribute('content', mv.content + ', viewport-fit=cover');
  } catch (e) {}

  var st = document.createElement('style');
  st.textContent =
    'button,[onclick],.nav-item,a{touch-action:manipulation;}' +
    'html{-webkit-text-size-adjust:100%;}' +
    '.screen{min-height:100vh;min-height:100dvh;}' +
    '.navbar{padding-bottom:env(safe-area-inset-bottom,0px);}' +
    '.screen:not(#screen-map){padding-bottom:calc(110px + env(safe-area-inset-bottom,0px));}' +
    '#screen-map{padding-bottom:calc(70px + env(safe-area-inset-bottom,0px)) !important;}' +
    '.topbar{padding-top:calc(12px + env(safe-area-inset-top,0px));}' +
    '.topbar *{white-space:nowrap;}' +
    '.topbar > div{min-width:0;}' +
    '#topbar-nick{max-width:30vw;overflow:hidden;text-overflow:ellipsis;}' +
    '#screen-map button[onclick^="openPlace"],#btn-invest-map{font-size:clamp(9px,2.9vw,12px) !important;padding:.3em .65em !important;line-height:1.25 !important;}' +
    '@media (max-width:380px){.topbar{padding-left:10px;padding-right:10px;gap:6px;}.topbar-logo{font-size:15px !important;flex-shrink:0;}.coins{padding:3px 8px !important;font-size:12px !important;}#topbar-nick{max-width:22vw;font-size:11px !important;}}' +
    '.tap-ext::after{content:"";position:absolute;left:var(--tx,-6px);right:var(--tx,-6px);top:var(--ty,-8px);bottom:var(--ty,-8px);}';
  document.head.appendChild(st);

  var timer = null;
  var lastRun = 0;
  function sched(ms) { if (timer) return; var wait = Math.max(ms || 400, 1500 - (Date.now() - lastRun)); timer = setTimeout(run, wait); }

  function fitPins() {      // 지도 장소 버튼이 화면 밖으로 나가면 안으로 밀어 넣음
    var map = document.getElementById('screen-map');
    if (!map || !map.classList.contains('active')) return;
    var vw = document.documentElement.clientWidth, lo = Math.max(0, (vw - Math.min(vw, 430)) / 2), hi = lo + Math.min(vw, 430);
    map.querySelectorAll('button[onclick^="openPlace"],#btn-invest-map').forEach(function (b) {
      b.style.marginLeft = '0px';
      var r = b.getBoundingClientRect(); if (!r.width) return;
      var dx = 0;
      if (r.left < lo + 4) dx = lo + 4 - r.left; else if (r.right > hi - 4) dx = hi - 4 - r.right;
      if (dx) b.style.marginLeft = Math.round(dx) + 'px';
    });
  }

  function tapExt() {       // 작은 버튼은 터치 범위만 넓힘 (겉모습 그대로)
    var vh = innerHeight;
    document.querySelectorAll('button,.nav-item,[onclick]').forEach(function (el) {
      if (el.classList.contains('tap-ext') || el.closest('canvas')) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > vh) return;
      var w = r.width, h = r.height;
      if (w >= 40 && h >= 40) return;
      if (w > 200 && h >= 28) return;                 // 넓은 막대 버튼은 높이가 28 이상이면 충분
      var cs = getComputedStyle(el);
      if (cs.display === 'inline') return;
      var ac = getComputedStyle(el, '::after').content; if (ac && ac !== 'none' && ac !== 'normal') return;   // 이미 ::after 를 쓰는 요소는 건드리지 않음
      if (cs.position === 'static') el.style.position = 'relative';
      el.style.setProperty('--tx', Math.max(0, Math.ceil((44 - w) / 2)) + 'px'); el.style.setProperty('--ty', Math.max(0, Math.ceil((44 - h) / 2)) + 'px');
      el.classList.add('tap-ext');
    });
  }

  function run() { timer = null; lastRun = Date.now(); try { fitPins(); tapExt(); } catch (e) {} }
  new MutationObserver(function (m) {
    for (var i = 0; i < m.length; i++) { var t = m[i].target; if (t && t.nodeType === 1 && t.closest && t.closest('#fr-view')) continue; sched(500); return; }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', function () { sched(150); });
  window.addEventListener('orientationchange', function () { sched(300); });
  setTimeout(run, 1200);
})();
