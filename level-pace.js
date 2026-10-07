// ════════════════════════════════════════════════════════════
// 🪜 초반 레벨업 속도 조절 (level-pace.js)
// 문제: 퀘스트 경험치 보상이 커서 Lv.1 → Lv.5처럼 한 번에 여러 레벨이 건너뛰어졌고,
//       그러면 [Lv.2 · Lv.3 · Lv.4] 잠금이 하나씩 열리는 걸 못 봄.
// 해결: PACE_UNTIL 레벨 미만에서는 경험치를 한 번 받을 때 레벨이 최대 1칸만 오름.
//       넘친 경험치는 다음 레벨 필요량의 CARRY_RATE 비율까지만 이월하고 나머지는 사라짐
//       (이월이 너무 크면 알바 몇 번에 또 연속으로 오르기 때문).
// ✏️ 고치는 법: 아래 두 숫자만 바꾸면 됨
//    PACE_UNTIL : 이 레벨 미만일 때만 적용 (이후는 원래대로 연속 레벨업)
//    CARRY_RATE : 0 = 넘친 경험치 전부 버림, 1 = 다음 레벨 필요량만큼까지 이월
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var PACE_UNTIL = 12, CARRY_RATE = 0.5;

  if (typeof checkPlayerLevelUp !== 'function' || typeof getExpRequired !== 'function') return;

  window.checkPlayerLevelUp = function checkPlayerLevelUp() {
    var required = getExpRequired(playerLevel);
    if (playerExp < required) return;
    var paced = playerLevel < PACE_UNTIL;

    playerExp -= required;
    playerLevel++;
    if (paced) {
      var cap = Math.floor(getExpRequired(playerLevel) * CARRY_RATE);
      if (playerExp > cap) playerExp = cap;
    }
    localStorage.setItem('ph_playerLevel', playerLevel);
    localStorage.setItem('ph_playerExp', playerExp);
    showLevelUpPopup();
    if (playerLevel === 10) {
      showBagToast('🎓 레벨 10 달성! 기술학원에 입학할 수 있어요!');
      checkQuestProgress('player_level_10');
    }
    if (!paced) checkPlayerLevelUp();   // PACE_UNTIL 이상은 기존처럼 연속 레벨업
  };

  window.__levelPaceTest = { PACE_UNTIL: PACE_UNTIL, CARRY_RATE: CARRY_RATE };
})();
