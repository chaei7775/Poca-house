// ⚡ 스태미나 표시를 오른쪽 아래 떠 있는 박스 대신, 각 화면 위쪽 바(코인 옆)로 옮김 (뽑기·맵 등에서 버튼을 가리던 문제)
//  · 홈은 대표 카드 왼쪽 아래 칩(home-main.js)이 있어서 여기서는 안 넣음
//  · 떠 있던 박스(#stamina-floating)는 숨김. 되돌리려면 loader.js 에서 'stamina-topbar.js' 한 줄만 지우면 됨.
(function () {
  'use strict';
  var st = document.createElement('style');
  st.textContent = '#stamina-floating{display:none !important;}' +
    '.tb-stam{display:inline-flex;align-items:center;margin-right:8px;padding:4px 9px;border-radius:12px;background:rgba(0,0,0,.28);color:#fff;font-size:11px;font-weight:900;white-space:nowrap;font-family:"Noto Sans KR",sans-serif;}';
  document.head.appendChild(st);
  function txt() {
    var cur = null, max = 3000;
    try { if (typeof stamina === 'number') cur = Math.floor(stamina); } catch (e) {}
    try { if (typeof STAMINA_MAX === 'number') max = STAMINA_MAX; } catch (e) {}
    if (cur == null) { var v = parseFloat(localStorage.getItem('ph_stamina')); cur = isNaN(v) ? 0 : Math.floor(v); }
    return '⚡ ' + cur + '/' + max;
  }
  function tick() {
    var scr = document.querySelector('.screen.active'); if (!scr || scr.id === 'screen-home') return;
    var chip = scr.querySelector('.tb-stam');
    if (!chip) {
      var coins = scr.querySelector('.coins'); if (!coins) return;   // 화면 맨 위 코인 표시 바로 왼쪽에 붙임
      chip = document.createElement('span'); chip.className = 'tb-stam';
      var wrap = document.createElement('span'); wrap.style.cssText = 'display:inline-flex;align-items:center;';   // 코인과 한 덩어리로 묶어서 레이아웃이 안 깨지게
      coins.parentNode.insertBefore(wrap, coins); wrap.appendChild(chip); wrap.appendChild(coins);
    }
    var t = txt(); if (chip.textContent !== t) chip.textContent = t;
  }
  setInterval(function () { try { tick(); } catch (e) {} }, 800);
})();
