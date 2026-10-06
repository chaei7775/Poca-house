// ════════════════════════════════════════════════════════════
// 🎁 퀘스트 보상 인상 (quest-boost.js)
// 튜토리얼/메인 퀘스트(game.js·quest-extra.js)와 스토리 퀘스트(pocalevel.js)의 보상을 올린다.
//  · 코인 ×COIN_MULT, 경험치 ×EXP_MULT
//  · 공연장 퀘스트(q3_*)는 이미 크게 올려서 제외
//  · 길잡이(quest-guide.js) / 연대기(story-quest.js) 보상은 각자 파일 안에서 따로 올림
// ✏️ 고치는 법: 아래 두 숫자만 바꾸면 됨
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var COIN_MULT = 5, EXP_MULT = 2;
  var SKIP = /^q3_/;
  var KEEP_COIN = { poca_level_5: 1 };   // 첫 뽑기만 해도 바로 깨지는 퀘스트(포카 Lv5)는 코인을 안 올림 (초반에 코인이 폭발하면 알바할 이유가 사라짐)
  function boost(q) {
    if (!q || q.__boosted || SKIP.test(q.condition || '')) return;
    q.__boosted = true;
    if (typeof q.rewardCoins === 'number') q.rewardCoins = Math.round(q.rewardCoins * (KEEP_COIN[q.condition] || COIN_MULT));
    if (typeof q.rewardExp === 'number') q.rewardExp = Math.round(q.rewardExp * EXP_MULT);
  }
  function run() {
    try { if (typeof QUESTS !== 'undefined') Object.keys(QUESTS).forEach(function (k) { boost(QUESTS[k]); }); } catch (e) {}
    try { if (typeof STORY_QUESTS !== 'undefined') STORY_QUESTS.forEach(boost); } catch (e) {}
  }
  run();
  var n = 0, iv = setInterval(function () { run(); if (++n > 60) clearInterval(iv); }, 500);   // 다른 파일이 늦게 등록하는 퀘스트도 잡기 (30초)
  window.__questBoostTest = { run: run, COIN_MULT: COIN_MULT, EXP_MULT: EXP_MULT };
})();
