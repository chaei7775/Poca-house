// ════════════════════════════════
// 길잡이 강조 끄기 — quest-guide.js 의 노란 테두리 깜빡임도, 손가락 👆도 모두 보이지 않게 함
// (quest-guide.js 의 "다음 할 일" 카드는 그대로 남음. loader.js 의 'guide-finger.js' 줄은 그대로 두면 됨)
// ════════════════════════════════
(function () {
  var st = document.createElement('style');
  st.textContent =
    'html body .qg-pulse{animation:none !important;outline:none !important;box-shadow:none !important;}' +
    '#qg-finger{display:none !important;}';
  document.head.appendChild(st);
})();
