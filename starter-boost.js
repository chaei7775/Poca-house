// starter-boost.js
// 초반 스태미나 부담 완화 (새 계정 전용)
//  1) 새 계정은 스태미나 100 대신 STARTER_STAMINA로 시작
//  2) 초반 퀘스트(첫 알바/뽑기/만남/등교/탐험/음료 사용)를 깰 때마다 사과주스 지급
// 기존 계정(이미 카드·알바 기록이 있는 계정)은 아무 영향 없음
(function starterBoost() {
  // ── 여기 숫자만 바꾸면 됨 ──
  var STARTER_STAMINA = 300;                 // 새 계정 시작 스태미나
  var DRINK_EMOJI = '🧃', DRINK_NAME = '사과주스';
  var REWARDS = {                            // 퀘스트 조건 → 사과주스 개수 (1개 = 스태미나 +30)
    first_alba: 2,      // 첫 알바
    first_gacha: 3,     // 첫 카드 뽑기
    first_meet: 3,      // 첫 아이돌 만남/선물
    first_school: 4,    // 첫 등교
    first_explore: 4,   // 첫 탐험
    q2_drink: 4         // 첫 음료 사용
  };
  var FLAG = 'ph_starter_v1';                // '1' = 새 계정(혜택 대상), 'no' = 해당 없음
  var GIVEN = 'ph_starter_given';            // 이미 받은 보상 기록

  function ready() {
    try {
      return typeof addToBag === 'function' && typeof saveStamina === 'function' &&
             typeof window.checkQuestProgress === 'function' && typeof window.checkStoryCondition === 'function' &&
             typeof owned !== 'undefined' && typeof albaDone !== 'undefined' &&
             typeof bagItems !== 'undefined' && typeof stamina !== 'undefined';
    } catch (e) { return false; }
  }

  function isFreshAccount() {
    try {
      return owned.length === 0 && albaDone === 0 && bagItems.length === 0 &&
             Object.keys(questProgress || {}).length === 0;
    } catch (e) { return false; }
  }

  function grant(cond) {
    try {
      var n = REWARDS[cond];
      if (!n) return;
      if (localStorage.getItem(FLAG) !== '1') return;
      var given = JSON.parse(localStorage.getItem(GIVEN) || '{}');
      if (given[cond]) return;
      if (!addToBag(DRINK_EMOJI, DRINK_NAME, 'drink', n, '스태미나 +30 회복 음료')) return; // 가방이 꽉 차면 다음 기회에
      given[cond] = 1;
      localStorage.setItem(GIVEN, JSON.stringify(given));
      setTimeout(function () {
        if (typeof showBagToast === 'function') showBagToast(DRINK_EMOJI + ' ' + DRINK_NAME + ' ' + n + '개 받았어요! 🎒 가방에서 마실 수 있어요');
      }, 700);
    } catch (e) { console.error('[starter-boost] grant error:', e); }
  }

  function init() {
    if (!ready()) { setTimeout(init, 100); return; }
    if (window.__starterBoostApplied) return;
    window.__starterBoostApplied = true;

    // 1) 처음 접속한 새 계정이면 시작 스태미나 올리기 (한 번만 판정)
    if (localStorage.getItem(FLAG) === null) {
      if (isFreshAccount()) {
        localStorage.setItem(FLAG, '1');
        if (stamina < STARTER_STAMINA) { stamina = STARTER_STAMINA; saveStamina(); }
      } else {
        localStorage.setItem(FLAG, 'no');
      }
    }

    // 2) 퀘스트 조건이 발생할 때 보상 지급 (한 조건당 한 번)
    var origCheck = window.checkQuestProgress;
    window.checkQuestProgress = function (condition) {
      var r = origCheck.apply(this, arguments);
      grant(condition);
      return r;
    };
    var origStory = window.checkStoryCondition;
    window.checkStoryCondition = function (condition) {
      var r = origStory.apply(this, arguments);
      grant(condition);
      return r;
    };

    // 3) 로그인으로 서버 데이터를 불러오는 계정은 새 계정이 아님 → 혜택 대상에서 제외
    (function hookRestore() {
      if (typeof window.restorePocaDataFromServer !== 'function') { setTimeout(hookRestore, 200); return; }
      var origRestore = window.restorePocaDataFromServer;
      window.restorePocaDataFromServer = function (data) {
        if (data) { try { localStorage.setItem(FLAG, 'no'); } catch (e) {} }
        return origRestore.apply(this, arguments);
      };
    })();
  }
  init();
})();
