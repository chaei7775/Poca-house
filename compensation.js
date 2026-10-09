// ════════════════════════════════
// 🎁 보상 지급 (compensation.js) — 한 번만 지급하고 끝 (ph_comp_* 표시가 남아 있으면 다시 안 줌)
// - 10/9 레드카펫 VIP 게이트: 스킬 장착 버튼이 없어서 입장료로 날린 소원의 조각 10개 돌려주기
// 조각 개수는 wishFragments / ph_wish 에 더하고, 가방 표시는 wish-sync.js 가 맞춰준다.
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_comp_wish10_1009', GIVE = 10;
  var t = setInterval(function () {
    try {
      if (localStorage.getItem(KEY)) { clearInterval(t); return; }
      if (typeof wishFragments === 'undefined' || typeof addToBag !== 'function') return;
      localStorage.setItem(KEY, '1');
      wishFragments = Math.max(0, Math.floor(Number(wishFragments) || 0)) + GIVE;
      localStorage.setItem('ph_wish', wishFragments);
      if (typeof saveAll === 'function') saveAll();
      if (typeof showBagToast === 'function') showBagToast('🧩 소원의 조각 ' + GIVE + '개를 돌려드렸어요! 레드카펫 입장료 보상');
      clearInterval(t);
    } catch (e) { console.error('[compensation]', e); }
  }, 1500);
})();
