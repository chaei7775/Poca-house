// ════════════════════════════════
// 🎁 첫 히든카드 특별 교환 (first-hidden.js)
// 아직 히든카드가 하나도 없는 계정은, 소원의 조각 50개로 레어히든 1장을 바로 바꿀 수 있다 (계정당 1회).
// 원래는 조각 100개 → 소원의 결정 → 레어히든이지만, 첫 장만 반값. 두 번째부터는 그대로.
//  · 조각이 50개 모이면 안내 팝업이 한 번 뜬다 / 가방에서 소원의 조각을 눌러도 교환 버튼이 있다
//  · 저장: localStorage 'ph_firstHidden' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 값을 바꾸고 싶으면 아래 NEED만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  var NEED = 50;
  var KEY = 'ph_firstHidden';
  var asked = false;

  function claimed() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function frag() { try { return Number(wishFragments) || 0; } catch (e) { return 0; } }
  function hiddenOwned() { try { return (ownedHiddenCards || []).length; } catch (e) { return 0; } }
  function ready() { return typeof HIDDEN_CARDS !== 'undefined' && typeof ownedHiddenCards !== 'undefined' && typeof addToBag === 'function'; }
  function eligible() { return ready() && !claimed() && hiddenOwned() === 0; }
  function pool() { return HIDDEN_CARDS.filter(function (h) { return typeof h.grade === 'string' && h.grade.indexOf('레어') !== -1 && ownedHiddenCards.indexOf(h.id) < 0; }); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }

  function overlay(html) {
    var p = document.createElement('div'); p.id = 'first-hidden-pop';
    p.style.cssText = 'position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;';
    p.innerHTML = '<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:24px;padding:26px 22px;text-align:center;width:88%;max-width:320px;color:#fff;font-family:\'Noto Sans KR\',sans-serif;">' + html + '</div>';
    document.body.appendChild(p); return p;
  }

  function claim() {
    if (!eligible()) return;
    if (frag() < NEED) { toast('🧩 소원의 조각이 ' + NEED + '개 필요해요 (지금 ' + frag() + '개)'); return; }
    var cand = pool();
    if (!cand.length) { toast('레어히든 카드 데이터를 찾지 못했어요'); return; }
    var pick = cand[Math.floor(Math.random() * cand.length)];
    try { if (typeof useFromBag === 'function') useFromBag('소원의 조각', NEED); } catch (e) {}
    wishFragments = Math.max(0, frag() - NEED);
    localStorage.setItem('ph_wish', wishFragments);
    ownedHiddenCards.push(pick.id);
    localStorage.setItem('ph_hiddenCards', JSON.stringify(ownedHiddenCards));
    localStorage.setItem(KEY, '1');
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    try { if (typeof renderBag === 'function') renderBag(); } catch (e) {}
    var old = document.getElementById('first-hidden-pop'); if (old) old.remove();
    var img = pick.img ? '<img src="' + pick.img + '" style="width:190px;aspect-ratio:3/4;object-fit:cover;border-radius:16px;border:3px solid #C084FC;box-shadow:0 0 30px #C084FC88;margin-bottom:12px;" onerror="this.style.display=\'none\'">' : '';
    var p = overlay(img + '<div style="font-size:20px;font-weight:900;color:#FFD700;margin-bottom:4px;">🌟 첫 히든카드 획득!</div><div style="font-size:15px;margin-bottom:14px;">' + (pick.name || pick.id) + '</div><div style="font-size:11px;color:#bbb;margin-bottom:14px;">앞으로 히든카드는 조각 100개 → 소원의 결정으로 바꿔요</div><button id="fh-ok" style="width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:inherit;">확인</button>');
    p.querySelector('#fh-ok').onclick = function () { p.remove(); };
  }

  function showOffer() {
    if (!eligible() || document.getElementById('first-hidden-pop')) return;
    var n = frag(), ok = n >= NEED;
    var p = overlay('<div style="font-size:44px;margin-bottom:6px;">🧩➜🌟</div>' +
      '<div style="font-size:18px;font-weight:900;margin-bottom:6px;">첫 히든카드 특별 교환</div>' +
      '<div style="font-size:12px;color:#ddd;line-height:1.6;margin-bottom:12px;">소원의 조각 <b style="color:#FFD700;">' + NEED + '개</b>로<br>레어히든 카드를 <b style="color:#FFD700;">딱 1번</b> 바로 바꿔드려요!<br><span style="color:#aaa;">(원래는 조각 100개 → 소원의 결정)</span></div>' +
      '<div style="font-size:13px;margin-bottom:14px;">내 조각: <b style="color:' + (ok ? '#6ee7a0' : '#ff9ec7') + ';">' + n + ' / ' + NEED + '</b></div>' +
      '<button id="fh-go" style="width:100%;padding:13px;margin-bottom:8px;border:none;border-radius:12px;font-size:15px;font-weight:900;font-family:inherit;cursor:pointer;color:#fff;background:' + (ok ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : '#555') + ';">' + (ok ? '히든카드로 바꾸기' : '아직 조각이 모자라요') + '</button>' +
      '<button id="fh-no" style="background:none;border:none;color:#888;font-size:13px;cursor:pointer;font-family:inherit;">나중에</button>');
    p.querySelector('#fh-go').onclick = function () { if (ok) claim(); else toast('조각은 드라마 촬영·탐험·퀘스트에서 모아요!'); };
    p.querySelector('#fh-no').onclick = function () { p.remove(); };
  }
  window.showFirstHiddenOffer = showOffer;

  // 가방에서 소원의 조각을 눌렀을 때 버튼 추가
  var origDetail = window.showBagItemDetail;
  if (typeof origDetail === 'function') {
    window.showBagItemDetail = function (idx) {
      origDetail.apply(this, arguments);
      try {
        var it = bagItems[idx];
        if (!it || it.name !== '소원의 조각' || !eligible()) return;
        var ov = document.getElementById('bag-detail-overlay'); if (!ov || !ov.firstElementChild) return;
        var b = document.createElement('button');
        b.textContent = '🌟 첫 히든카드 교환 (' + NEED + '개)';
        b.style.cssText = 'width:100%;padding:12px;margin-top:10px;background:linear-gradient(135deg,#60a5fa,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;';
        b.onclick = function () { ov.remove(); showOffer(); };
        ov.firstElementChild.appendChild(b);
      } catch (e) {}
    };
  }

  // 조각이 처음 NEED개에 닿으면 안내 팝업 한 번 (팝업/전체화면이 떠 있으면 기다림)
  setInterval(function () {
    if (asked || !eligible() || frag() < NEED) return;
    if (document.querySelector('#special-overlay,#explore-overlay,#gacha-multi-overlay,#fr-hire-go,[id^="gacha-single"]')) return;
    asked = true; showOffer();
  }, 4000);
})();
