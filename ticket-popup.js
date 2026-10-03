// ════════════════════════════════
// 🎫 등교권 획득 팝업 (별도 모듈 — special-explore.js 건드리지 않음)
// 특별탐험에서 등교권이 실제로 늘어났을 때(직접 드랍 + 조각 10개 교환 둘 다) 큰 팝업으로 보여줌.
// 필요한 이미지: ticket-school.png (저장소 루트에 같이 올리기)
// ════════════════════════════════
(function () {
  var TICKET_IMG = 'ticket-school.png';

  function currentTickets() {
    try {
      if (typeof schoolDaily !== 'undefined' && schoolDaily && typeof schoolDaily.tickets === 'number') {
        return schoolDaily.tickets;
      }
    } catch (e) {}
    return null;
  }

  function injectStyle() {
    if (document.getElementById('ticket-popup-style')) return;
    var st = document.createElement('style');
    st.id = 'ticket-popup-style';
    st.textContent =
      '@keyframes ticketPopIn { 0%{opacity:0;transform:scale(0.4) rotate(-6deg);} 55%{opacity:1;transform:scale(1.08) rotate(2deg);} 100%{opacity:1;transform:scale(1) rotate(0);} }' +
      '@keyframes ticketGlow { 0%,100%{filter:drop-shadow(0 0 14px #FFD700);} 50%{filter:drop-shadow(0 0 30px #FFF3A0);} }' +
      '@keyframes ticketFadeUp { 0%{opacity:0;transform:translateY(14px);} 100%{opacity:1;transform:translateY(0);} }' +
      '@keyframes ticketSpark { 0%{opacity:0;transform:translateY(0) scale(0.3);} 30%{opacity:1;} 100%{opacity:0;transform:translateY(-70px) scale(1);} }';
    document.head.appendChild(st);
  }

  function closeTicketPopup() {
    var old = document.getElementById('ticket-popup-overlay');
    if (old) old.remove();
  }

  function showTicketPopup() {
    injectStyle();
    closeTicketPopup();

    var overlay = document.createElement('div');
    overlay.id = 'ticket-popup-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:rgba(10,8,25,0.82);display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;padding:20px;box-sizing:border-box;font-family:\'Noto Sans KR\',sans-serif;';

    var sparks = '';
    for (var i = 0; i < 10; i++) {
      var left = 8 + Math.floor(Math.random() * 84);
      var top = 20 + Math.floor(Math.random() * 55);
      var delay = (Math.random() * 1.6).toFixed(2);
      sparks += '<span style="position:absolute;left:' + left + '%;top:' + top + '%;font-size:' + (14 + Math.floor(Math.random() * 14)) +
        'px;opacity:0;animation:ticketSpark 1.8s ease-out ' + delay + 's infinite;pointer-events:none;">✨</span>';
    }

    overlay.innerHTML =
      sparks +
      '<div style="font-size:15px;font-weight:900;color:#FFD700;margin-bottom:14px;letter-spacing:1px;animation:ticketFadeUp 0.5s ease-out 0.25s both;">🎫 등교권 획득!</div>' +
      '<img src="' + TICKET_IMG + '" alt="등교권" ' +
        'style="width:min(88vw,440px);height:auto;border-radius:18px;animation:ticketPopIn 0.6s cubic-bezier(.2,.9,.3,1.2) both, ticketGlow 2s ease-in-out 0.6s infinite;" ' +
        'onerror="this.outerHTML=\'<div style=&quot;font-size:110px;&quot;>🎫</div>\'">' +
      '<div style="font-size:12px;color:#ddd;margin-top:16px;animation:ticketFadeUp 0.5s ease-out 0.5s both;">특별탐험에서 등교권을 찾았어요!</div>' +
      '<button id="ticket-popup-close" style="margin-top:18px;padding:13px 34px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;animation:ticketFadeUp 0.5s ease-out 0.7s both;">확인</button>';

    overlay.addEventListener('click', function (e) {
      // 버튼이든 바깥 영역이든 어디를 눌러도 닫힘
      closeTicketPopup();
    });

    document.body.appendChild(overlay);

    try {
      if (window.pocaSfx && typeof window.pocaSfx.play === 'function') window.pocaSfx.play('gachaHigh');
    } catch (e) {}
  }

  window.showTicketPopup = showTicketPopup;

  // ── resolveSpecialCapture를 감싸서, 호출 전후로 등교권 개수를 비교 ──
  // (함수가 아직 로드 안 됐으면 잠깐 기다렸다가 시도 — 로더가 파일을 순서 없이 불러오기 때문)
  var tries = 0;
  (function attempt() {
    if (typeof window.resolveSpecialCapture !== 'function') {
      if (++tries < 100) setTimeout(attempt, 100);
      return;
    }
    if (window.resolveSpecialCapture.__ticketPopupWrapped) return;

    var original = window.resolveSpecialCapture;
    var wrapped = function () {
      var before = currentTickets();
      var result = original.apply(this, arguments);
      try {
        var after = currentTickets();
        if (before !== null && after !== null && after > before) {
          // 결과 화면이 그려진 뒤에 팝업이 위에 뜨도록 살짝 지연
          setTimeout(showTicketPopup, 250);
        }
      } catch (e) { /* 팝업 때문에 게임이 멈추면 안 됨 */ }
      return result;
    };
    wrapped.__ticketPopupWrapped = true;
    window.resolveSpecialCapture = wrapped;
  })();
})();
