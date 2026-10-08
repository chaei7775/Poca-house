// bond-gift.js
// 💞 인연 상세 화면(호감도/스토리)에 '💝 선물하기' 버튼 추가
// - 기존 선물 메뉴(showGiftMenu / giveGift)를 그대로 재사용
// - 선물 후 호감도 표시 자동 갱신
// - 호감도 조건이 안 되는 아이돌(예: 아라)은 잠금 표시
(function applyBondGift() {
  var need = ['openBondDetail', 'showGiftMenu', 'giveGift'];
  for (var i = 0; i < need.length; i++) {
    if (typeof window[need[i]] !== 'function') { setTimeout(applyBondGift, 100); return; }
  }
  if (window.__bondGiftApplied) return;
  window.__bondGiftApplied = true;

  function reqAffOf(charId) {
    try { return (CHAR_MEET[charId] && CHAR_MEET[charId].reqAff) || 0; } catch (e) { return 0; }
  }
  function gateOf(charId) {
    try { return getAffectionGateLevel(charId); } catch (e) { return 99; }
  }

  // 선물 선택창 열기 (기존 meet-overlay + showGiftMenu 재사용)
  window.openBondGift = function (charId) {
    var old = document.getElementById('meet-overlay');
    if (old) old.remove();
    var overlay = document.createElement('div');
    overlay.id = 'meet-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;justify-content:flex-end;';
    overlay.innerHTML = '<div style="padding:24px;background:rgba(20,10,30,0.98);border-radius:20px 20px 0 0;">' +
      '<button onclick="document.getElementById(\'meet-overlay\').remove()" style="width:100%;padding:12px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:14px;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">돌아가기</button></div>';
    document.body.appendChild(overlay);
    try { showGiftMenu(charId); } catch (e) { console.error('[bond-gift] showGiftMenu error:', e); }
    // (선물창을 여는 것만으로는 '처음 만나는 인연'을 깨지 않음 — 만나기/대화 버튼을 눌러야 함)
  };

  function addButton(charId) {
    var box = document.querySelector('#bond-detail-overlay .bond-affection');
    if (!box) return;
    var old = document.getElementById('bond-gift-btn');
    if (old) old.remove();
    var btn = document.createElement('button');
    btn.id = 'bond-gift-btn';
    var locked = gateOf(charId) < reqAffOf(charId);
    if (locked) {
      btn.textContent = '🔒 호감도 ' + reqAffOf(charId) + ' 이상이면 선물할 수 있어요';
      btn.disabled = true;
      btn.style.cssText = 'width:100%;margin-top:14px;padding:13px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#888;font-size:13px;font-weight:700;font-family:"Noto Sans KR",sans-serif;';
    } else {
      btn.textContent = '💝 선물하기';
      btn.style.cssText = 'width:100%;margin-top:14px;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:"Noto Sans KR",sans-serif;';
      btn.onclick = function () { window.openBondGift(charId); };
    }
    box.appendChild(btn);
  }

  // 상세 화면이 열릴 때 버튼 추가
  var origOpen = window.openBondDetail;
  window.openBondDetail = function (charId) {
    var r = origOpen.apply(this, arguments);
    try { addButton(charId); } catch (e) { console.error('[bond-gift] addButton error:', e); }
    return r;
  };

  // 선물 후 호감도 표시 갱신
  var origGive = window.giveGift;
  window.giveGift = function () {
    var r = origGive.apply(this, arguments);
    try {
      var o = document.getElementById('bond-detail-overlay');
      if (o && o.classList.contains('show') && typeof currentCharId !== 'undefined' && currentCharId) {
        window.openBondDetail(currentCharId);
      }
    } catch (e) {}
    return r;
  };

  // 인연 화면에서 아이돌 카드를 눌러 상세를 여는 것 = '처음 만나는 인연' (선물 전에 먼저 완료)
  // (giveGift 가 상세를 다시 그릴 때도 불리므로, 처음 한 번만 판정)
  var _origDetail = window.openBondDetail;
  if (typeof _origDetail === 'function' && !_origDetail.__metHooked) {
    window.openBondDetail = function () {
      var r = _origDetail.apply(this, arguments);
      try { if (typeof checkQuestProgress === 'function') checkQuestProgress('first_meet'); } catch (e) {}
      return r;
    };
    window.openBondDetail.__metHooked = true;
  }
})();
