// ════════════════════════════════
// 🔮 카드 재조합기 천장 패치
// recombine.js는 건드리지 않고, doRecombine / updateRcStartButton만 덮어써서 천장을 넣는다.
//  - 실패(히든 미등장) 1번당 레어히든 확률 +RC_PITY_STEP %
//  - 연속 RC_PITY_HARD 번째 시도에서는 레어히든 확정 (에픽이 먼저 뜨면 에픽)
//  - 재조합 화면에 천장 카운터와 현재 히든 확률 표시
// 값을 바꾸고 싶으면 아래 두 줄만 수정하면 됨.
// ════════════════════════════════

const RC_PITY_STEP = 0.5;   // 실패 1번당 늘어나는 레어히든 확률(%p)
const RC_PITY_HARD = 30;    // 이 번째 시도에서 레어히든 확정

function rcPityBonus(pityCount) {
  return Math.min(pityCount, RC_PITY_HARD - 1) * RC_PITY_STEP;
}

// 결과 판정만 따로 뺀 순수 함수: 'epic' | 'rare' | 'upgrade' | 'same'
function rcRollOutcome(table, pityCount, rand) {
  rand = rand || Math.random;
  const epicChance = table.epicHidden;
  const rareChance = table.rareHidden + rcPityBonus(pityCount);
  const roll = rand() * 100;
  if (roll < epicChance) return 'epic';
  if (pityCount >= RC_PITY_HARD - 1 || roll < epicChance + rareChance) return 'rare';
  if (roll < epicChance + rareChance + table.upgrade) return 'upgrade';
  return 'same';
}

function rcUpdatePityInfo() {
  const btn = document.getElementById('rc-start-btn');
  if (!btn || !btn.parentNode) return;
  let el = document.getElementById('rc-pity-info');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rc-pity-info';
    // 버튼이 margin-top:auto로 맨 아래에 붙어 있어서, 안내 문구가 버튼 바로 위에 오도록 auto를 문구 쪽으로 옮김
    el.style.cssText = 'text-align:center;font-size:12px;font-weight:700;color:#C084FC;margin:auto 0 8px;line-height:1.5;';
    btn.style.marginTop = '0';
    btn.parentNode.insertBefore(el, btn);
  }
  const n = rcPityCount;
  const left = Math.max(1, RC_PITY_HARD - n);
  let html = '🍀 히든 천장 ' + n + ' / ' + RC_PITY_HARD +
    ' <span style="color:#aaa;font-weight:400;">(' + left + '번 안에 레어히든 확정)</span>';
  const recipe = getRcCurrentRecipe();
  if (recipe) {
    const chance = recipe.table.rareHidden + recipe.table.epicHidden + rcPityBonus(n);
    html += '<br><span style="color:#FFD700;">현재 히든 확률 ' + chance.toFixed(2) + '%</span>';
  }
  el.innerHTML = html;
}

(function applyRecombinePatch() {
  if (typeof window.doRecombine !== 'function' || typeof window.updateRcStartButton !== 'function') {
    setTimeout(applyRecombinePatch, 50);
    return;
  }
  if (window.__rcPatchApplied) return;
  window.__rcPatchApplied = true;

  // 재조합 실행: 원본과 같고, 결과 판정 부분만 천장 버전으로 교체
  window.doRecombine = function() {
    const recipe = getRcCurrentRecipe();
    if (!recipe || !canDoRecombine()) {
      showBagToast('재료가 부족해요!');
      return;
    }

    const need = recipe.table.stones;
    coins -= recipe.table.coin;
    if (need.normal > 0) useFromBag('재조합석', need.normal);
    if (need.epic > 0) useFromBag('에픽 재조합석', need.epic);
    if (rcNeedsWish(recipe)) {
      wishFragments -= 10;
      localStorage.setItem('ph_wish', wishFragments);
    }

    [rcSelectedCards[0], rcSelectedCards[1]].forEach(function(cardId) {
      if (cardCounts[cardId] && cardCounts[cardId] > 0) {
        cardCounts[cardId] -= 1;
        if (cardCounts[cardId] <= 0) {
          delete cardCounts[cardId];
          owned = owned.filter(function(id) { return id !== cardId; });
        }
      }
    });
    localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts));
    localStorage.setItem('ph_owned', JSON.stringify(owned));

    const outcome = rcRollOutcome(recipe.table, rcPityCount);
    let result;
    if (outcome === 'epic') {
      result = rollHiddenCard('에픽히든', recipe);
    } else if (outcome === 'rare') {
      result = rollHiddenCard('레어히든', recipe);
    } else if (outcome === 'upgrade') {
      result = { type: 'card', grade: rcHigherGrade(recipe.lowerGrade) };
    } else {
      result = { type: 'card', grade: recipe.lowerGrade };
    }

    if (result.type === 'hidden') {
      rcPityCount = 0;
    } else {
      rcPityCount += 1;
    }
    saveRcData();

    let resultCard = null;
    if (result.type === 'card') {
      const pool = CARDS.filter(function(c) { return c.grade === result.grade; });
      resultCard = pool[Math.floor(Math.random() * pool.length)];
      cardCounts[resultCard.id] = (cardCounts[resultCard.id] || 0) + 1;
      if (!owned.includes(resultCard.id)) owned.push(resultCard.id);
      localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts));
      localStorage.setItem('ph_owned', JSON.stringify(owned));
    }

    saveAll();
    rcSelectedCards = [null, null];
    playRecombineAnimation(result, resultCard);
  };

  // 재조합 화면이 갱신될 때마다 천장 카운터도 같이 갱신
  const originalUpdateRcStartButton = window.updateRcStartButton;
  window.updateRcStartButton = function() {
    const r = originalUpdateRcStartButton.apply(this, arguments);
    try { rcUpdatePityInfo(); } catch (e) {}
    return r;
  };
})();
