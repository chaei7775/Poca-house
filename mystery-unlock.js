// ════════════════════════════════
// ✨ 신비의 섬 해금 낮추기 (mystery-unlock.js)
// 아무 포카나 호감도 경험치 UNLOCK_EXP 이상이면 신비의 섬이 열린다.
//  - 기존: 친절 Lv.3 (경험치 20)  →  지금: 친절 Lv.2 (경험치 10)
//  - game.js 의 해금 판정만 덮어쓰고, 화면/퀘스트에 적힌 '친절 Lv.3' 문구는 '친절 Lv.2'로 바꿔 보여준다.
// 값을 바꾸고 싶으면 UNLOCK_EXP 만 고치면 된다. (친절 Lv.2 = 10, Lv.3 = 20, Lv.4 = 35)
// ════════════════════════════════
(function () {
  'use strict';
  var UNLOCK_EXP = 10;
  var OLD_TEXT = '친절 Lv.3', NEW_TEXT = '친절 Lv.2';

  function unlocked() {
    try {
      return Object.keys(CHARS).some(function (id) { return getAffectionTotalExp(id) >= UNLOCK_EXP; });
    } catch (e) { return false; }
  }

  function questPing() {
    try {
      if (typeof checkQuestProgress === 'function' && unlocked()) {
        checkQuestProgress('affection_level_2');
        checkQuestProgress('mystery_island_unlock');
      }
    } catch (e) {}
  }

  // 화면 문구 보정
  function fixNode(n) {
    if (n.nodeType === 3) {
      if (n.nodeValue.indexOf(OLD_TEXT) !== -1) n.nodeValue = n.nodeValue.split(OLD_TEXT).join(NEW_TEXT);
    } else if (n.nodeType === 1) {
      var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, null), t;
      while ((t = w.nextNode())) { if (t.nodeValue.indexOf(OLD_TEXT) !== -1) t.nodeValue = t.nodeValue.split(OLD_TEXT).join(NEW_TEXT); }
    }
  }

  function install() {
    if (typeof window.isMysteryIslandUnlocked !== 'function' || typeof window.checkAffectionLevelUp !== 'function' || typeof window.showBagToast !== 'function') {
      setTimeout(install, 80); return;
    }
    if (window.__mysteryUnlockApplied) return;
    window.__mysteryUnlockApplied = true;

    window.isMysteryIslandUnlocked = unlocked;

    var origLevelUp = window.checkAffectionLevelUp;
    window.checkAffectionLevelUp = function () {
      var r = origLevelUp.apply(this, arguments);
      questPing();
      return r;
    };

    var origToast = window.showBagToast;
    window.showBagToast = function (msg) {
      if (typeof msg === 'string') msg = msg.split(OLD_TEXT).join(NEW_TEXT);
      return origToast.call(this, msg);
    };

    try {
      new MutationObserver(function (list) {
        list.forEach(function (m) {
          if (m.type === 'characterData') fixNode(m.target);
          else m.addedNodes.forEach(fixNode);
        });
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
    fixNode(document.body);
    questPing();
  }
  install();
})();
