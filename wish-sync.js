// ════════════════════════════════
// 🧩 소원의 조각 정리 (wish-sync.js) — game.js 는 건드리지 않음
// 문제: 조각 개수(wishFragments)와 가방 표시 개수가 따로 놀아서, 100개가 넘어도 결정이 안 되거나 가방엔 225개처럼 남아 있었음
//  (팬클럽 의뢰·출석 보상·소원 걸기 등이 한쪽만 바꾸던 경로가 있었음)
// 고침: 1.5초마다 ① 100개 넘으면 결정으로 바꿔주고 ② 가방 표시를 실제 개수에 맞춤
// 등록: loader.js NEW_CONTENT_FILES 에 'wish-sync.js' 한 줄
// ════════════════════════════════
(function () {
  'use strict';
  var busy = false;
  function fix() {
    if (busy) return;
    try {
      if (typeof wishFragments === 'undefined' || typeof bagItems === 'undefined' || typeof addToBag !== 'function') return;
      if (document.getElementById('explore-overlay')) return;       // 탐험 중엔 건드리지 않음
      busy = true;
      var changed = false, crystals = 0;
      wishFragments = Math.max(0, Math.floor(Number(wishFragments) || 0));
      while (wishFragments >= 100) {
        wishFragments -= 100; crystals++;
        addToBag('💎', '소원의 결정', 'crystal', 1, '소원의 결정 — 특별한 소원을 이룰 수 있어!');
        changed = true;
      }
      var frag = bagItems.find(function (i) { return i && i.name === '소원의 조각'; });
      if (wishFragments <= 0) {
        if (frag) { var i = bagItems.indexOf(frag); bagItems.splice(i, 1); changed = true; }
      } else if (!frag) {
        addToBag('🧩', '소원의 조각', 'wish', wishFragments, '100개 모으면 소원의 결정! (현재: ' + wishFragments + '개)'); changed = true;
      } else if (frag.qty !== wishFragments) {
        frag.qty = wishFragments; frag.desc = '100개 모으면 소원의 결정! (현재: ' + wishFragments + '개)'; changed = true;
      }
      if (changed) {
        try { localStorage.setItem('ph_wish', wishFragments); } catch (e) {}
        try { if (typeof saveBag === 'function') saveBag(); } catch (e) {}
        try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
        if (crystals) { try { if (typeof showBagToast === 'function') showBagToast('💎 소원의 조각 ' + (crystals * 100) + '개가 소원의 결정 ' + crystals + '개가 됐어요!'); } catch (e) {} }
        try { var sc = document.getElementById('screen-bag'); if (sc && sc.classList.contains('active') && typeof renderBag === 'function') renderBag(); } catch (e) {}
      }
    } catch (e) {} finally { busy = false; }
  }
  setInterval(fix, 1500);
  setTimeout(fix, 800);
})();
