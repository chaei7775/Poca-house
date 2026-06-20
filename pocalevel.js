// ════════════════════════════════
// 📖 포카 레벨 시스템 + 스토리 퀘스트 (별도 모듈 — game.js 건드리지 않음)
// 의존: CHARS, owned, CARDS, saveAll(), showBagToast(), addPlayerExp(), goTo()
// ════════════════════════════════

// ── 포카 레벨/경험치 데이터 ──
let cardLevels = JSON.parse(localStorage.getItem('ph_cardLevels') || '{}');
let cardExpData = JSON.parse(localStorage.getItem('ph_cardExp') || '{}');

function getCardLevel(charId) { return cardLevels[charId] || 1; }
function getCardExp(charId) { return cardExpData[charId] || 0; }
function getCardExpRequired(level) { return level * 20; }

function saveCardLevelData() {
  localStorage.setItem('ph_cardLevels', JSON.stringify(cardLevels));
  localStorage.setItem('ph_cardExp', JSON.stringify(cardExpData));
}

function addCardExp(charId, amount) {
  if (!charId) return;
  let level = getCardLevel(charId);
  let exp = getCardExp(charId) + amount;
  let leveledUp = false;
  while (level < 20) {
    const required = getCardExpRequired(level);
    if (exp >= required) {
      exp -= required;
      level += 1;
      leveledUp = true;
    } else break;
  }
  cardLevels[charId] = level;
  cardExpData[charId] = exp;
  saveCardLevelData();
  if (leveledUp) {
    showCardLevelUpToast(charId, level);
    checkStoryLevelMilestone();
  }
  return leveledUp;
}

function getHighestCardLevel() {
  let max = 1;
  Object.keys(CHARS).forEach(function(cid) {
    const lv = getCardLevel(cid);
    if (lv > max) max = lv;
  });
  return max;
}

function showCardLevelUpToast(charId, level) {
  const ch = CHARS[charId];
  if (!ch) return;
  const old = document.getElementById('poca-levelup-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'poca-levelup-toast';
  el.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:1200;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFD700;color:#fff;border-radius:18px;padding:10px 18px;font-size:13px;font-weight:900;text-align:center;box-shadow:0 6px 24px #0005;pointer-events:none;line-height:1.45;max-width:88%;';
  el.innerHTML = '⭐ ' + ch.name + ' Lv.' + level + '!';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 2400);
}

// ── 홈 화면 레벨바 (말풍선 캐릭터 옆) ──
function renderPocaLevelBar() {
  const speechWrap = document.querySelector('.speech-bubble-wrap');
  if (!speechWrap) return;
  const ownedChars = Object.keys(CHARS).filter(function(cid) {
    return CARDS.some(function(c) { return c.charId === cid && owned.includes(c.id); });
  });
  let bar = document.getElementById('poca-level-bar');
  if (ownedChars.length === 0) {
    if (bar) bar.remove();
    return;
  }
  const nameEl = document.getElementById('speech-name');
  const currentName = nameEl ? nameEl.textContent : '';
  let charId = ownedChars.find(function(cid) { return CHARS[cid].name === currentName; });
  if (!charId) charId = ownedChars[0];

  const level = getCardLevel(charId);
  const exp = getCardExp(charId);
  const required = getCardExpRequired(level);
  const pct = level >= 20 ? 100 : Math.min(100, Math.round(exp / required * 100));

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'poca-level-bar';
    bar.style.cssText = 'margin-top:4px;width:52px;text-align:center;';
    speechWrap.insertBefore(bar, speechWrap.firstChild.nextSibling);
  }
  bar.innerHTML =
    '<div style="font-size:9px;font-weight:900;color:#FF6B9D;margin-bottom:2px;">Lv.' + level + '</div>' +
    '<div style="height:5px;background:#FFE4EF;border-radius:99px;overflow:hidden;">' +
    '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#FF6B9D,#C084FC);border-radius:99px;"></div></div>';
}

// ── 학교 성적표 후킹: 등교한 포카에게 경험치 지급 ──
(function hookSchoolReportForCardExp() {
  if (typeof window.finishSchoolReport !== 'function') {
    setTimeout(hookSchoolReportForCardExp, 50);
    return;
  }
  const originalFinish = window.finishSchoolReport;
  window.finishSchoolReport = function() {
    let charIdBeforeReport = null;
    try {
      const card = getSchoolSelectedCard();
      if (card) charIdBeforeReport = card.charId;
    } catch (e) {}

    const result = originalFinish.apply(this, arguments);

    if (charIdBeforeReport) {
      // 등급별 경험치는 finishSchoolReport 내부에서 별도로 계산하기 어려우므로
      // 평균 점수 기반으로 재계산
      try {
        const scores = getSchoolScores();
        const vals = [scores.korean, scores.memory, scores.pe];
        if (vals.every(function(v) { return typeof v === 'number'; })) {
          const avg = Math.round(vals.reduce(function(a, b) { return a + b; }, 0) / vals.length);
          let cardExpGain = 1;
          if (avg >= 90) cardExpGain = 5;
          else if (avg >= 80) cardExpGain = 4;
          else if (avg >= 70) cardExpGain = 3;
          addCardExp(charIdBeforeReport, cardExpGain);
        }
      } catch (e) {}
    }
    return result;
  };
})();

// ════════════════════════════════
// 📜 스토리 퀘스트
// ════════════════════════════════
const STORY_QUESTS = [
  { id:'story_01', title:'추락', desc:'정신을 차려보니, 낯선 곳에 떨어져 있었다. 날개도 기억도 없이.', condition:'story_start', rewardCoins:100, rewardExp:30 },
  { id:'story_02', title:'목소리', desc:'"포카하우스를 되돌려놓으면, 너는 다시 하늘로 돌아갈 수 있어." 어디선가 그런 목소리가 들렸다.', condition:'story_start', rewardCoins:100, rewardExp:30 },
  { id:'story_03', title:'닫힌 문', desc:'포카하우스의 문은 굳게 잠겨 있었다. 무언가 채워야 할 것 같았다.', condition:'story_start', rewardCoins:100, rewardExp:30 },
  { id:'story_04', title:'첫걸음, 알바', desc:'빈 주머니로는 아무것도 할 수 없다. 일단 일을 해보자.', condition:'first_alba', rewardCoins:200, rewardExp:50 },
  { id:'story_05', title:'반짝이는 카드', desc:'마을 어딘가에서 반짝이는 가게를 발견했다. 카드를 모으면 뭔가 달라질까?', condition:'first_gacha', rewardCoins:300, rewardExp:50 },
  { id:'story_06', title:'작은 인연', desc:'카드 속 아이돌들이 진짜 여기 살고 있었다. 직접 만나보자.', condition:'first_meet', rewardCoins:200, rewardExp:50 },
  { id:'story_07', title:'등교시키기', desc:'포카들이 학교에 다닐 수 있다는 걸 알았다. 키우면 뭔가 달라질 것 같다.', condition:'first_school', rewardCoins:300, rewardExp:80 },
  { id:'story_08', title:'첫 변화', desc:'포카 하나가 레벨 5가 됐다. 포카하우스에서 빛이 새어나온다.', condition:'poca_level_5', rewardCoins:1000, rewardExp:200 },
  { id:'story_09', title:'더 큰 꿈', desc:'한 명만으론 부족해. 더 많은 포카를 키워야겠다.', condition:'cards_10', rewardCoins:500, rewardExp:100 },
  { id:'story_10', title:'탐험의 시작', desc:'포카들이 자꾸 뭔가를 찾아달라고 한다. 같이 나가보자.', condition:'first_explore', rewardCoins:300, rewardExp:80 },
  { id:'story_11', title:'두 번째 빛', desc:'포카가 레벨 10에 도달했다. 또 다른 문이 열렸다.', condition:'poca_level_10', rewardCoins:2000, rewardExp:400 },
  { id:'story_12', title:'쌓이는 재료', desc:'탐험에서 모은 재료가 제법 쌓였다. 뭔가 만들 수 있을 것 같다.', condition:'first_craft', rewardCoins:500, rewardExp:150 },
  { id:'story_13', title:'어울리는 옷', desc:'포카에게 옷을 입혀주면 더 빛난다는 걸 알게 됐다.', condition:'first_cloth_equip', rewardCoins:500, rewardExp:150 },
  { id:'story_14', title:'세 번째 빛', desc:'포카가 레벨 15에 도달했다. 포카하우스가 조금씩 또렷해진다.', condition:'poca_level_15', rewardCoins:3000, rewardExp:600 },
  { id:'story_15', title:'거의 다 왔어', desc:'포카하우스가 거의 본래 모습을 찾아가고 있다.', condition:'mystery_island_unlock', rewardCoins:1000, rewardExp:300 },
  { id:'story_16', title:'잊혀진 기억', desc:'신비의 섬에서 작은 기억의 조각을 발견했다.', condition:'first_wish_fragment', rewardCoins:1500, rewardExp:300 },
  { id:'story_17', title:'한 걸음 더', desc:'포카가 레벨 20, 최고 레벨에 도달했다! 포카하우스의 절반쯤... 아니, 아직 머나먼 여정이 남아있다는 걸 느꼈다. 하지만 분명히, 무언가 달라지고 있었다.', condition:'poca_level_20', rewardCoins:10000, rewardExp:1000 },
  { id:'story_18', title:'약속', desc:'모든 게 돌아왔다. 그런데... 정말 떠나야 할까?', condition:'story_ending_tease', rewardCoins:5000, rewardExp:500 },
];

let storyProgress = JSON.parse(localStorage.getItem('ph_storyProgress') || '{}');

function saveStoryProgress() {
  localStorage.setItem('ph_storyProgress', JSON.stringify(storyProgress));
}

function getCurrentStoryQuest() {
  for (let i = 0; i < STORY_QUESTS.length; i++) {
    if (storyProgress[STORY_QUESTS[i].id] !== 'done') return STORY_QUESTS[i];
  }
  return STORY_QUESTS[STORY_QUESTS.length - 1];
}

function checkStoryCondition(condition) {
  STORY_QUESTS.forEach(function(q) {
    if (storyProgress[q.id] === 'done') return;
    if (q.condition === condition) {
      completeStoryQuest(q);
    }
  });
}

function completeStoryQuest(q) {
  if (storyProgress[q.id] === 'done') return;
  storyProgress[q.id] = 'done';
  saveStoryProgress();
  coins += q.rewardCoins;
  if (typeof addPlayerExp === 'function') addPlayerExp(q.rewardExp);
  if (typeof saveAll === 'function') saveAll();
  showStoryQuestToast(q);
  updateHomeBannerWithStory();
}

function checkStoryLevelMilestone() {
  const highest = getHighestCardLevel();
  if (highest >= 5) checkStoryCondition('poca_level_5');
  if (highest >= 10) checkStoryCondition('poca_level_10');
  if (highest >= 15) checkStoryCondition('poca_level_15');
  if (highest >= 20) checkStoryCondition('poca_level_20');
}

function showStoryQuestToast(q) {
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:900;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFD700;border-radius:16px;padding:16px 20px;text-align:center;width:85%;max-width:320px;animation:fadeInUp 0.4s ease;';
  popup.innerHTML = '<div style="font-size:12px;color:#FFD700;font-weight:700;margin-bottom:4px;">📖 이야기가 진행됐어요</div>' +
    '<div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:4px;">' + q.title + '</div>' +
    '<div style="font-size:13px;color:#FFD700;margin-top:6px;">🍔 +' + q.rewardCoins + ' · ⭐ +' + q.rewardExp + 'xp</div>';
  document.body.appendChild(popup);
  setTimeout(function() { popup.style.opacity = '0'; popup.style.transition = 'opacity 0.5s'; setTimeout(function() { popup.remove(); }, 500); }, 3000);
}

// ── 홈 배너 문구를 현재 스토리 퀘스트로 교체 ──
function updateHomeBannerWithStory() {
  const titleEl = document.querySelector('.home-banner-title');
  const subEl = document.querySelector('.home-banner-sub');
  if (!titleEl || !subEl) return;
  const q = getCurrentStoryQuest();
  titleEl.textContent = q.title;
  subEl.textContent = q.desc.length > 38 ? q.desc.slice(0, 38) + '...' : q.desc;
}

// ── game.js 초기 시작 시 스토리 트리거 ──
(function triggerStoryStartOnce() {
  if (localStorage.getItem('ph_story_started') !== '1') {
    localStorage.setItem('ph_story_started', '1');
    setTimeout(function() { checkStoryCondition('story_start'); }, 500);
  }
})();

// ── checkQuestProgress 후킹: 기존 조건들과 스토리 조건 동시 체크 ──
(function hookCheckQuestProgressForStory() {
  if (typeof window.checkQuestProgress !== 'function') {
    setTimeout(hookCheckQuestProgressForStory, 50);
    return;
  }
  const originalCheck = window.checkQuestProgress;
  window.checkQuestProgress = function(condition) {
    const result = originalCheck.apply(this, arguments);
    checkStoryCondition(condition);
    return result;
  };
})();

// ── 첫 등교 감지 (completeSchoolSubject 후킹) ──
(function hookSchoolForFirstTime() {
  if (typeof window.completeSchoolSubject !== 'function') {
    setTimeout(hookSchoolForFirstTime, 50);
    return;
  }
  const originalComplete = window.completeSchoolSubject;
  window.completeSchoolSubject = function() {
    const result = originalComplete.apply(this, arguments);
    checkStoryCondition('first_school');
    return result;
  };
})();

// ── 첫 의상 착용 감지 (equipCloth 후킹) ──
(function hookEquipClothForStory() {
  if (typeof window.equipCloth !== 'function') {
    setTimeout(hookEquipClothForStory, 50);
    return;
  }
  const originalEquip = window.equipCloth;
  window.equipCloth = function() {
    const result = originalEquip.apply(this, arguments);
    checkStoryCondition('first_cloth_equip');
    return result;
  };
})();

// ── renderHomeIdols 후킹: 레벨바도 같이 갱신 ──
(function hookHomeRenderForLevelBar() {
  if (typeof window.renderHomeSpeech !== 'function') {
    setTimeout(hookHomeRenderForLevelBar, 50);
    return;
  }
  const originalRenderSpeech = window.renderHomeSpeech;
  window.renderHomeSpeech = function() {
    const result = originalRenderSpeech.apply(this, arguments);
    renderPocaLevelBar();
    updateHomeBannerWithStory();
    return result;
  };
})();
