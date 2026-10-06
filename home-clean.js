// ════════════════════════════════════════════════════════════
// 🏠 홈 화면 정리 (home-clean.js) — 첫 화면에서 한눈에 보이게
//  · 배너를 낮춤 (240px → 150px)
//  · 길잡이 카드 + 일일퀘스트 카드를 한 덩어리로 붙임 (위: 다음 할 일, 아래: 일일퀘스트 한 줄)
//  · 큰 버튼은 알바하기 / 스케줄 가기만 (카드 뽑기는 아래 탭의 ✨ 뽑기에 있어서 중복이던 버튼을 숨김)
//  · 아래 탭을 두 줄 → 한 줄로
// ✏️ 되돌리려면 loader.js 에서 'home-clean.js' 한 줄만 지우면 됨.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var css =
    // 배너
    '#screen-home .home-banner{height:150px !important;}' +
    '#screen-home .home-speech{padding:8px 16px 0 !important;}' +
    // 큰 버튼: 카드 뽑기는 숨김 (탭에 있음)
    '#screen-home .home-actions .btn-gacha{display:none !important;}' +
    '#screen-home .home-actions{padding:10px 16px !important;gap:8px !important;}' +
    '#screen-home .home-actions .btn-main{padding:13px !important;}' +
    // 길잡이 + 일일퀘스트 = 한 카드
    '#qg-home-card.qg-merged{margin-bottom:0 !important;border-bottom-left-radius:0 !important;border-bottom-right-radius:0 !important;}' +
    '#dq-home-card.dq-merged{margin-top:0 !important;margin-bottom:8px !important;border-top:1px dashed #cfcfcf !important;border-top-left-radius:0 !important;border-top-right-radius:0 !important;padding:7px 12px !important;}' +
    '#dq-home-card.dq-merged .dq-sub{display:none;}' +
    '#dq-home-card.dq-merged .dq-btn{padding:5px 10px !important;font-size:11px !important;}' +
    // 아래 탭: 한 줄
    '.navbar{flex-direction:row !important;height:60px !important;}' +
    '.navbar .navbar-row{display:contents !important;}' +
    '.navbar .nav-item{padding:7px 0 6px !important;}';
  var st = document.createElement('style'); st.id = 'home-clean-style'; st.textContent = css; document.head.appendChild(st);

  // 두 카드가 항상 [길잡이] 바로 뒤에 [일일퀘스트] 순서가 되게 맞춤
  function tidy() {
    try {
      var home = document.getElementById('screen-home'); if (!home) return;
      var g = document.getElementById('qg-home-card'), d = document.getElementById('dq-home-card');
      if (g) g.classList.toggle('qg-merged', !!d);
      if (d) d.classList.toggle('dq-merged', !!g);
      if (g && d && g.nextSibling !== d && g.parentNode === home && d.parentNode === home) home.insertBefore(d, g.nextSibling);
    } catch (e) {}
  }
  setInterval(tidy, 700);
  tidy();
})();
