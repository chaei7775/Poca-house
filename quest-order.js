// ════════════════════════════════════════════════════════════
// 🧭 퀘스트 순서 지키기 (quest-order.js)
//  카드를 막 뽑거나 하다가 "앞 단계를 아직 안 깼는데 뒤 퀘스트가 먼저 뜨는" 일을 막는다.
//  · 스토리 퀘스트: 목록 순서대로만 완료. 먼저 달성한 조건은 기억해 뒀다가 차례가 오면 하나씩 완료
//  · 메인 퀘스트: 포카를 모아봐 ← 처음 만나는 인연 ← … (아래 PREREQ) 순서대로만 완료
//  게임 기존 파일은 안 건드리고 함수를 감싸기만 한다.
// ✏️ 고치는 법: 아래 PREREQ 만 바꾸면 됨 (퀘스트 id : 먼저 깨야 하는 퀘스트 id)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var PREREQ = { main_cards: 'tut_meet', main_affection: 'main_cards', main_story: 'main_affection' };
  var KEY = 'ph_condseen';
  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v || d; } catch (e) { return d; } }
  var seen = J(KEY, {});
  function mark(c) { if (!c || seen[c]) return; seen[c] = 1; try { localStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {} }
  function done(id) { try { return questProgress[id] === 'done'; } catch (e) { return false; } }

  // ── 조건이 한 번이라도 발생했는지 기억 (퀘스트 완료는 아래 completeQuest/completeStoryQuest 후킹에서 막음) ──
  function hookCheck() {
    if (typeof window.checkQuestProgress !== 'function') { setTimeout(hookCheck, 100); return; }
    var o = window.checkQuestProgress; if (o.__qo) return;
    var w = function (c) { mark(c); return o.apply(this, arguments); };
    w.__qo = true; window.checkQuestProgress = w;
  }
  function hookStoryCheck() {
    if (typeof window.checkStoryCondition !== 'function') { setTimeout(hookStoryCheck, 100); return; }
    var o = window.checkStoryCondition; if (o.__qo) return;
    var w = function (c) { mark(c); return o.apply(this, arguments); };
    w.__qo = true; window.checkStoryCondition = w;
  }

  // ── 메인/튜토리얼 퀘스트: 앞 퀘스트를 안 깼으면 완료시키지 않음 ──
  function hookComplete() {
    if (typeof window.completeQuest !== 'function') { setTimeout(hookComplete, 100); return; }
    var o = window.completeQuest; if (o.__qo) return;
    var w = function (id, q) { var p = PREREQ[id]; if (p && !done(p)) return; return o.apply(this, arguments); };
    w.__qo = true; window.completeQuest = w;
  }
  // ── 스토리 퀘스트: 목록에서 앞쪽이 안 끝났으면 완료시키지 않음 ──
  function storyFirstUndone() {
    for (var i = 0; i < STORY_QUESTS.length; i++) if (storyProgress[STORY_QUESTS[i].id] !== 'done') return STORY_QUESTS[i];
    return null;
  }
  function hookStory() {
    if (typeof window.completeStoryQuest !== 'function' || typeof STORY_QUESTS === 'undefined') { setTimeout(hookStory, 100); return; }
    var o = window.completeStoryQuest; if (o.__qo) return;
    var w = function (q) {
      var f = storyFirstUndone();
      if (f && q && f.id !== q.id && storyProgress[q.id] !== 'done') { mark(q.condition); return; }
      return o.apply(this, arguments);
    };
    w.__qo = true; window.completeStoryQuest = w;
  }

  // ── 차례가 왔는데 이미 달성해 둔 조건이면 하나씩 완료 (한꺼번에 뜨지 않게 1.5초에 하나) ──
  function satisfied(cond) {
    if (cond === 'cards_10') { try { return owned.length >= 10; } catch (e) {} }
    return !!seen[cond];
  }
  function tick() {
    try {
      var f = (typeof STORY_QUESTS !== 'undefined') ? storyFirstUndone() : null;
      if (f && f.condition !== 'story_start' && satisfied(f.condition)) { window.completeStoryQuest(f); return; }
      for (var id in PREREQ) {
        if (done(id) || !done(PREREQ[id]) || !QUESTS[id]) continue;
        if (satisfied(QUESTS[id].condition)) { window.completeQuest(id, QUESTS[id]); return; }
      }
    } catch (e) {}
  }
  hookCheck(); hookStoryCheck(); hookComplete(); hookStory();
  setInterval(tick, 1500);
  window.__questOrderTest = { seen: function () { return seen; }, tick: tick, PREREQ: PREREQ };
})();
