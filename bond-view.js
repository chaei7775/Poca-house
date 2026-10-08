// ════════════════════════════════
// 💞 인연 상세 화면 보기 좋게 (bond-view.js)
//  - 카드 그림 위의 검은 그라데이션을 줄이고, 그림 영역을 더 크게 (예전: 높이 280px, 아래쪽 70%가 어두웠음)
//  - 뒤쪽 인연 목록이 비쳐 보이던 것을 없애려고 배경을 불투명하게
// 값은 아래 CSS 숫자만 고치면 됨 (height / 38%)
// ════════════════════════════════
(function () {
  'use strict';
  var st = document.createElement('style');
  st.id = 'bond-view-style';
  st.textContent =
    '.bond-detail-overlay{background:#0a0a14 !important;}' +
    '.bond-detail-header{height:min(125vw,520px) !important;}' +
    '.bond-detail-header img{object-position:top center !important;}' +
    '.bond-detail-header-overlay{background:linear-gradient(to top,#0a0a14 0%,rgba(10,10,20,.55) 14%,rgba(10,10,20,0) 38%) !important;}' +
    '.bond-detail-name{text-shadow:0 2px 10px #000c,0 0 4px #000a !important;}';
  document.head.appendChild(st);

  // 상세에서 목록으로 돌아올 때 목록을 다시 그림 (안 그러면 선물로 올린 호감도/하트가 목록에 예전 값으로 남아 '떨어진 것'처럼 보임)
  var _origClose = window.closeBondDetail;
  if (typeof _origClose === 'function' && !_origClose.__listHooked) {
    window.closeBondDetail = function () {
      var r = _origClose.apply(this, arguments);
      try { if (typeof renderBondList === 'function') renderBondList(); } catch (e) {}
      return r;
    };
    window.closeBondDetail.__listHooked = true;
  }
})();
