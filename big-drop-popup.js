// ════════════════════════════════
// 🎫💎 큰 획득 팝업 (big-drop-popup.js)
//  · 등교권 / 초월석을 얻으면 화면 가운데에 큰 팝업 (이미지 + 반짝이 + 효과음). 아무 데나 누르면 닫힘.
//  · 호출: window.showBigDrop('ticket') / window.showBigDrop('trans')  — 둘 다 한꺼번에 얻으면 차례로 하나씩 뜸
//  · 연결된 곳: 🎬 팬덤 원정(broadcast-expedition.js), 특별탐험의 초월석(enhance.js).
//    (특별탐험 등교권은 기존 ticket-popup.js 가 그대로 담당)
//  · 이미지: 등교권 = ticket-school.png (이미 올려둔 것)  /  초월석 = transcend-stone.webp (없으면 큰 💎 로 표시)
//  · 등록: loader.js NEW_CONTENT_FILES 맨 끝에 'big-drop-popup.js' 한 줄 추가
// ════════════════════════════════
(function () {
  'use strict';

  var KINDS = {
    ticket: { title: '🎫 등교권 획득!', img: 'ticket-school.png', emoji: '🎫', sub: '등교권을 찾았어요! 등교할 때 쓸 수 있어요', glow: '#FFD700', glow2: '#FFF3A0', sfx: 'gachaHigh' },
    trans:  { title: '💎 초월석 획득!', img: 'transcend-stone.webp', emoji: '💎', sub: '+10강 히든카드를 초월시킬 때 쓰는 귀한 재료예요', glow: '#60A5FA', glow2: '#BFDBFE', sfx: 'gachaHigh' }
  };
  var queue = [], showing = false;

  function injectStyle() {
    if (document.getElementById('bdp-style')) return;
    var st = document.createElement('style');
    st.id = 'bdp-style';
    st.textContent =
      '@keyframes bdpIn { 0%{opacity:0;transform:scale(0.4) rotate(-6deg);} 55%{opacity:1;transform:scale(1.08) rotate(2deg);} 100%{opacity:1;transform:scale(1) rotate(0);} }' +
      '@keyframes bdpFade { 0%{opacity:0;transform:translateY(14px);} 100%{opacity:1;transform:translateY(0);} }' +
      '@keyframes bdpSpark { 0%{opacity:0;transform:translateY(0) scale(0.3);} 30%{opacity:1;} 100%{opacity:0;transform:translateY(-70px) scale(1);} }' +
      '@keyframes bdpGlowG { 0%,100%{filter:drop-shadow(0 0 14px #FFD700);} 50%{filter:drop-shadow(0 0 30px #FFF3A0);} }' +
      '@keyframes bdpGlowB { 0%,100%{filter:drop-shadow(0 0 14px #60A5FA);} 50%{filter:drop-shadow(0 0 32px #BFDBFE);} }';
    document.head.appendChild(st);
  }
  function close() {
    var old = document.getElementById('bdp-overlay');
    if (old) old.remove();
    showing = false;
    if (queue.length) setTimeout(next, 150);
  }
  function next() {
    if (showing || !queue.length) return;
    var k = KINDS[queue.shift()];
    if (!k) { next(); return; }
    showing = true;
    injectStyle();
    var ov = document.createElement('div');
    ov.id = 'bdp-overlay';
    ov.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(10,8,25,0.84);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:'Noto Sans KR',sans-serif;";
    var sparks = '';
    for (var i = 0; i < 10; i++) {
      sparks += '<span style="position:absolute;left:' + (8 + Math.floor(Math.random() * 84)) + '%;top:' + (20 + Math.floor(Math.random() * 55)) + '%;font-size:' + (14 + Math.floor(Math.random() * 14)) +
        'px;opacity:0;animation:bdpSpark 1.8s ease-out ' + (Math.random() * 1.6).toFixed(2) + 's infinite;pointer-events:none;">✨</span>';
    }
    var glow = k.glow === '#FFD700' ? 'bdpGlowG' : 'bdpGlowB';
    ov.innerHTML = sparks +
      '<div style="font-size:16px;font-weight:900;color:' + k.glow + ';margin-bottom:14px;letter-spacing:1px;animation:bdpFade 0.5s ease-out 0.25s both;">' + k.title + '</div>' +
      '<img src="' + k.img + '" alt="" style="width:min(80vw,400px);height:auto;max-height:55vh;object-fit:contain;border-radius:18px;animation:bdpIn 0.6s cubic-bezier(.2,.9,.3,1.2) both, ' + glow + ' 2s ease-in-out 0.6s infinite;" ' +
        'onerror="this.outerHTML=\'<div style=&quot;font-size:150px;line-height:1;animation:bdpIn 0.6s cubic-bezier(.2,.9,.3,1.2) both, ' + glow + ' 2s ease-in-out 0.6s infinite;&quot;>' + k.emoji + '</div>\'">' +
      '<div style="font-size:12px;color:#ddd;margin-top:16px;text-align:center;animation:bdpFade 0.5s ease-out 0.5s both;">' + k.sub + '</div>' +
      '<button style="margin-top:18px;padding:13px 34px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;animation:bdpFade 0.5s ease-out 0.7s both;">확인</button>';
    ov.addEventListener('click', close);          // 버튼이든 바깥이든 어디를 눌러도 닫힘
    document.body.appendChild(ov);
    try { if (window.pocaSfx && window.pocaSfx.play) window.pocaSfx.play(k.sfx); } catch (e) {}
  }
  window.showBigDrop = function (kind) {
    if (!KINDS[kind]) return;
    queue.push(kind);
    next();
  };
})();
