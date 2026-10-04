// ════════════════════════════════
// 🎫 등교권 조각 표시 보정 (ticket-fragment-fix.js)
//
// 문제: 등교권 조각이 떨어지면 '가방 아이템'(+1)과 '숨은 카운터'(ph_ticketFragments)가 따로 올라가는데,
//       10개가 되면 숨은 카운터만 0으로 돌아가고 등교권이 지급될 뿐, 가방의 조각은 줄지 않아서
//       가방에 11개, 12개... 계속 쌓여 보였다 (실제 변환은 이미 되고 있었음).
// 해결: 가방의 '등교권 조각' 개수를 숨은 카운터와 항상 같게 맞춘다. (카운터가 0이면 가방에서 사라짐)
//       드랍/변환 코드(special-explore.js, broadcast-expedition.js)는 건드리지 않는다.
// ════════════════════════════════
(function () {
  'use strict';

  var ITEM_NAME = '등교권 조각';
  var COUNTER_KEY = 'ph_ticketFragments';

  function readCounter() {
    try {
      var v = JSON.parse(localStorage.getItem(COUNTER_KEY) || '0');
      return (typeof v === 'number' && v > 0) ? Math.floor(v) : 0;
    } catch (e) {
      return 0;
    }
  }

  function sync() {
    if (typeof bagItems === 'undefined' || !Array.isArray(bagItems)) return;
    var idx = -1;
    for (var i = 0; i < bagItems.length; i++) {
      if (bagItems[i].name === ITEM_NAME) { idx = i; break; }
    }
    if (idx === -1) return;                 // 가방에 없으면 새로 만들지 않는다

    var cnt = readCounter();
    var changed = false;
    if (cnt <= 0) {
      bagItems.splice(idx, 1);              // 10개 완성되어 등교권으로 바뀐 뒤 → 가방에서 제거
      changed = true;
    } else if (bagItems[idx].qty !== cnt) {
      bagItems[idx].qty = cnt;              // 남은 조각 수와 똑같이 맞춤
      changed = true;
    }
    if (changed) {
      if (typeof saveBag === 'function') saveBag();
      if (typeof renderBag === 'function' && document.getElementById('bag-grid')) renderBag();
    }
  }

  setInterval(sync, 1500);
  sync();
})();
