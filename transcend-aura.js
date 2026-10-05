// ════════════════════════════════
// ✨ 초월 오라 (transcend-aura.js)
// - 히든카드를 초월 1단계 이상 찍은 멤버는 팬덤 원정 맵에서도 티가 나게 한다
//   · 발밑에 마법진(돌아가는 이중 고리) + 얼굴 테두리 발광 + 머리 위 ★ 표시
//   · 1단계 파랑 ★ / 2단계 보라 ★★ / 3단계 금색 ★★★ (+ 반짝임)
// - 카드 목록/상세의 테두리·바닥 고리는 enhance.js 쪽에서 처리
// - 멤버의 초월 단계 = 그 멤버가 가진 히든카드 중 가장 높은 초월 단계
// - 로더(loader.js)에 'transcend-aura.js' 한 줄 추가하면 적용됨
// ════════════════════════════════
(function () {
  'use strict';

  var COLORS = { 1: '#60A5FA', 2: '#C084FC', 3: '#FFD700' };

  function readStages() {
    try {
      var s = JSON.parse(localStorage.getItem('ph_enhance') || 'null');
      return (s && s.stage && typeof s.stage === 'object') ? s.stage : {};
    } catch (e) { return {}; }
  }

  // 멤버의 초월 단계 (0~3)
  function stageOfChar(charId) {
    var best = 0;
    try {
      if (typeof HIDDEN_CARDS === 'undefined' || typeof ownedHiddenCards === 'undefined') return 0;
      var st = readStages();
      HIDDEN_CARDS.forEach(function (h) {
        if (h.charId !== charId || ownedHiddenCards.indexOf(h.id) === -1) return;
        var n = Math.floor(Number(st[h.id]) || 0);
        if (n > best) best = n;
      });
    } catch (e) {}
    return Math.max(0, Math.min(3, best));
  }
  window.getTranscendStage = stageOfChar;

  function ensureStyle() {
    if (document.getElementById('tr-aura-style')) return;
    var s = document.createElement('style');
    s.id = 'tr-aura-style';
    s.textContent =
      '@keyframes trSpin{to{transform:rotate(360deg)}}' +
      '@keyframes trSpinRev{to{transform:rotate(-360deg)}}' +
      '@keyframes trGlow{0%,100%{opacity:.7}50%{opacity:1}}' +
      '@keyframes trFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-4px)}}' +
      '@keyframes trTwinkle{0%,100%{filter:brightness(1)}50%{filter:brightness(1.6)}}' +
      '#bc-player.tr-aura .bc-face{border-color:var(--tr-c)!important;box-shadow:0 0 12px 3px var(--tr-c),0 3px 10px rgba(0,0,0,.55)!important;}' +
      '#bc-player .tr-circle{position:absolute;left:50%;top:44px;width:104px;height:104px;transform:translate(-50%,-50%) scaleY(.4);z-index:-1;pointer-events:none;}' +
      '#bc-player .tr-ring1{position:absolute;inset:0;border-radius:50%;border:2.5px dashed var(--tr-c);box-shadow:0 0 12px var(--tr-c),inset 0 0 12px var(--tr-c);animation:trSpin 6s linear infinite,trGlow 2s ease-in-out infinite;}' +
      '#bc-player .tr-ring2{position:absolute;inset:16px;border-radius:50%;border:2px solid var(--tr-c);animation:trSpinRev 4s linear infinite;}' +
      '#bc-player .tr-ring2::before{content:"";position:absolute;inset:7px;border:1.5px dotted var(--tr-c);transform:rotate(45deg);}' +
      '#bc-player .tr-ring2::after{content:"";position:absolute;inset:7px;border:1.5px dotted var(--tr-c);}' +
      '#bc-player .tr-mark{position:absolute;left:50%;top:-30px;transform:translateX(-50%);white-space:nowrap;font-size:13px;font-weight:900;line-height:1;letter-spacing:1px;color:var(--tr-c);background:rgba(15,10,30,.78);border:1.5px solid var(--tr-c);border-radius:999px;padding:3px 7px;text-shadow:0 0 6px var(--tr-c);box-shadow:0 0 8px var(--tr-c);animation:trFloat 1.6s ease-in-out infinite;pointer-events:none;}' +
      '#bc-player.tr-s3 .tr-mark{animation:trFloat 1.6s ease-in-out infinite,trTwinkle 1.2s ease-in-out infinite;}' +
      '#bc-player.tr-s3 .tr-ring1{animation:trSpin 4s linear infinite,trGlow 1.2s ease-in-out infinite;}';
    document.head.appendChild(s);
  }

  function decorate(p) {
    var cid;
    try { cid = specialExploreState && specialExploreState.charId; } catch (e) { cid = null; }
    if (!cid) return;
    var n = stageOfChar(cid);
    var tag = cid + ':' + n;
    if (p.getAttribute('data-tr') === tag) return;
    p.setAttribute('data-tr', tag);
    Array.prototype.slice.call(p.querySelectorAll('.tr-circle,.tr-mark')).forEach(function (e) { e.remove(); });
    p.classList.remove('tr-aura', 'tr-s1', 'tr-s2', 'tr-s3');
    if (n <= 0) return;
    ensureStyle();
    p.style.setProperty('--tr-c', COLORS[n]);
    p.classList.add('tr-aura', 'tr-s' + n);
    var circle = document.createElement('div');
    circle.className = 'tr-circle';
    circle.innerHTML = '<div class="tr-ring1"></div><div class="tr-ring2"></div>';
    p.insertBefore(circle, p.firstChild);
    var mark = document.createElement('div');
    mark.className = 'tr-mark';
    mark.textContent = new Array(n + 1).join('★');
    p.appendChild(mark);
  }

  function check() {
    var p = document.getElementById('bc-player');
    if (p) decorate(p);
  }

  function start() {
    check();
    try {
      new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
    } catch (e) {
      setInterval(check, 500);
    }
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
