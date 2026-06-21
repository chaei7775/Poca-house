// ════════════════════════════════
// 🔮 카드 재조합기 (별도 모듈 — game.js 건드리지 않음)
// 의존: coins, owned, cardCounts, bagItems, wishFragments, CARDS, B, saveAll(), addToBag(), useFromBag(), goTo()
// ════════════════════════════════

const RC_GRADE_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];
function rcGradeIndex(g) { return RC_GRADE_ORDER.indexOf(g); }
function rcHigherGrade(g) {
  const i = rcGradeIndex(g);
  return i < RC_GRADE_ORDER.length - 1 ? RC_GRADE_ORDER[i + 1] : g;
}

const RC_TABLE = {
  'N_N':     { upgrade: 70,   same: 29.97, rareHidden: 0.03, epicHidden: 0,    coin: 1000,   stones: { normal: 1, epic: 0 } },
  'N_R':     { upgrade: 50,   same: 49.95, rareHidden: 0.05, epicHidden: 0,    coin: 1000,   stones: { normal: 1, epic: 0 } },
  'R_R':     { upgrade: 45,   same: 54.95, rareHidden: 0.05, epicHidden: 0,    coin: 5000,   stones: { normal: 2, epic: 0 } },
  'R_SR':    { upgrade: 35,   same: 64.9,  rareHidden: 0.1,  epicHidden: 0,    coin: 5000,   stones: { normal: 2, epic: 0 } },
  'SR_SR':   { upgrade: 25,   same: 74.9,  rareHidden: 0.1,  epicHidden: 0,    coin: 20000,  stones: { normal: 3, epic: 0 } },
  'SR_SSR':  { upgrade: 18,   same: 81.7,  rareHidden: 0.25, epicHidden: 0.05, coin: 20000,  stones: { normal: 3, epic: 0 } },
  'SSR_SSR': { upgrade: 8,    same: 91.7,  rareHidden: 0.25, epicHidden: 0.05, coin: 70000,  stones: { normal: 3, epic: 1 } },
  'SSR_UR':  { upgrade: 5,    same: 94.5,  rareHidden: 0.4,  epicHidden: 0.1,  coin: 70000,  stones: { normal: 3, epic: 1 } },
  'UR_UR':   { upgrade: 0,    same: 98.5,  rareHidden: 1,    epicHidden: 0.5,  coin: 200000, stones: { normal: 5, epic: 2 } },
};

function getRcTableKey(gradeA, gradeB) {
  const lo = rcGradeIndex(gradeA) <= rcGradeIndex(gradeB) ? gradeA : gradeB;
  const hi = rcGradeIndex(gradeA) <= rcGradeIndex(gradeB) ? gradeB : gradeA;
  return lo + '_' + hi;
}

const HIDDEN_CARDS = [
  { id:'hidden_ara_rare',    charId:'ara',    grade:'레어히든', name:'아라 - 흑요석 공방장', img:B+'hidden-ara-rare.jpg',
    effects:[{ label:'제작 대성공 확률', value:'+3%' }] },
  { id:'hidden_ara_epic',    charId:'ara',    grade:'에픽히든', name:'아라 - 흑요석 공방장', img:B+'hidden-ara-epic.jpg',
    effects:[{ label:'제작 대성공 확률', value:'+3%' }, { label:'제작 재료 소모', value:'-2 (최소 1개)' }] },
  { id:'hidden_yuna_rare',   charId:'yuna',   grade:'레어히든', name:'윤아 - 황혼궁의 여왕', img:B+'hidden-yuna-rare.jpg',
    effects:[{ label:'희귀재료 획득', value:'+0.7%' }] },
  { id:'hidden_yuna_epic',   charId:'yuna',   grade:'에픽히든', name:'윤아 - 황혼궁의 여왕', img:B+'hidden-yuna-epic.jpg',
    effects:[{ label:'희귀재료 획득', value:'+1%' }, { label:'NPC 호감도 획득', value:'+1' }] },
  { id:'hidden_harin_rare',  charId:'harin',  grade:'레어히든', name:'하린 - 성좌의 예언자', img:B+'hidden-harin-rare.jpg',
    effects:[{ label:'소원조각 획득', value:'+0.5%' }] },
  { id:'hidden_harin_epic',  charId:'harin',  grade:'에픽히든', name:'하린 - 성좌의 예언자', img:B+'hidden-harin-epic.jpg',
    effects:[{ label:'소원조각 획득', value:'+0.8%' }, { label:'희귀 NPC 조우율', value:'+1%' }] },
  { id:'hidden_doyun_rare',  charId:'doyun',  grade:'레어히든', name:'도윤 - 금서관의 현자', img:B+'hidden-doyun-rare.jpg',
    effects:[{ label:'시험 등급 상승', value:'+5%' }] },
  { id:'hidden_doyun_epic',  charId:'doyun',  grade:'에픽히든', name:'도윤 - 금서관의 현자', img:B+'hidden-doyun-epic.jpg',
    effects:[{ label:'시험 등급 상승', value:'+10%' }, { label:'수업 점수', value:'+5%' }] },
  { id:'hidden_sion_rare',   charId:'sion',   grade:'레어히든', name:'시온 - 재앙의 흑기사', img:B+'hidden-sion-rare.jpg',
    effects:[{ label:'스태미나 소모', value:'-5%' }] },
  { id:'hidden_sion_epic',   charId:'sion',   grade:'에픽히든', name:'시온 - 재앙의 흑기사', img:B+'hidden-sion-epic.jpg',
    effects:[{ label:'스태미나 소모', value:'-10%' }, { label:'탐험 시간', value:'+1초' }] },
  { id:'hidden_minjun_rare', charId:'minjun', grade:'레어히든', name:'민준 - 천공성 기사단장', img:B+'hidden-minjun-rare.jpg',
    effects:[{ label:'알바 코인', value:'+6%' }] },
  { id:'hidden_minjun_epic', charId:'minjun', grade:'에픽히든', name:'민준 - 천공성 기사단장', img:B+'hidden-minjun-epic.jpg',
    effects:[{ label:'알바 코인', value:'+12%' }, { label:'알바 경험치', value:'+10%' }] },
];

let rcPityCount = parseInt(localStorage.getItem('ph_rc_pity') || '0');
let ownedHiddenCards = JSON.parse(localStorage.getItem('ph_hiddenCards') || '[]');

function saveRcData() {
  localStorage.setItem('ph_rc_pity', rcPityCount);
  localStorage.setItem('ph_hiddenCards', JSON.stringify(ownedHiddenCards));
}

let rcSelectedCards = [null, null];

function openRecombine() {
  rcSelectedCards = [null, null];
  goTo('recombine');
}

function renderRecombinePage() {
  updateRcCoinDisplay();
  renderRcCardSlots();
  renderRcMaterialSlots();
  updateRcStartButton();
}

function updateRcCoinDisplay() {
  const el = document.getElementById('rc-coin-display');
  if (el) el.textContent = coins.toLocaleString();
}

function renderRcCardSlots() {
  [0, 1].forEach(function(slotIdx) {
    const wrap = document.getElementById('rc-card-slot-' + slotIdx);
    if (!wrap) return;
    const cardId = rcSelectedCards[slotIdx];
    if (!cardId) {
      wrap.innerHTML = '<div class="rc-slot-empty" onclick="openRcCardPicker(' + slotIdx + ')">카드를<br>등록해주세요</div>';
      return;
    }
    const card = CARDS.find(function(c) { return c.id === cardId; });
    if (!card) { wrap.innerHTML = '<div class="rc-slot-empty" onclick="openRcCardPicker(' + slotIdx + ')">카드를<br>등록해주세요</div>'; return; }
    wrap.innerHTML = '<div class="rc-slot-filled" onclick="openRcCardPicker(' + slotIdx + ')">' +
      '<img src="' + card.img + '" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">' +
      '<div class="rc-slot-grade-badge" style="background:' + card.gradeColor + ';">' + card.grade + '</div></div>';
  });
}

function openRcCardPicker(slotIdx) {
  const ownedCardIds = Array.from(new Set(owned || []));
  const otherSlotCardId = rcSelectedCards[1 - slotIdx];

  const old = document.getElementById('rc-card-picker-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'rc-card-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(5,0,15,0.92);display:flex;flex-direction:column;';

  const cardsHtml = ownedCardIds.map(function(id) {
    const card = CARDS.find(function(c) { return c.id === id; });
    if (!card) return '';
    const count = cardCounts[id] || 1;
    const isUsedElsewhere = otherSlotCardId === id && count < 2;
    return '<button onclick="' + (isUsedElsewhere ? '' : ('selectRcCard(' + slotIdx + ',\'' + id + '\')')) + '" ' + (isUsedElsewhere ? 'disabled' : '') + ' style="position:relative;border:2px solid ' + card.gradeColor + ';border-radius:12px;overflow:hidden;background:#111;aspect-ratio:3/4;padding:0;cursor:' + (isUsedElsewhere ? 'default' : 'pointer') + ';opacity:' + (isUsedElsewhere ? '0.35' : '1') + ';">' +
      '<img src="' + card.img + '" style="width:100%;height:100%;object-fit:cover;">' +
      '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);color:#fff;font-size:10px;font-weight:900;padding:3px;text-align:center;">' + card.name + ' ' + (count > 1 ? ('x' + count) : '') + '</div></button>';
  }).join('');

  overlay.innerHTML =
    '<div style="padding:14px 16px;background:rgba(20,10,30,0.95);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">' +
    '<div style="color:#fff;font-size:16px;font-weight:900;">카드 선택</div>' +
    '<button onclick="document.getElementById(\'rc-card-picker-overlay\').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:#fff;padding:6px 12px;cursor:pointer;">닫기</button></div>' +
    '<div style="flex:1;overflow-y:auto;padding:14px;">' +
    (ownedCardIds.length === 0 ? '<div style="color:#aaa;text-align:center;padding:40px 0;">보유한 카드가 없어요!</div>' : ('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' + cardsHtml + '</div>')) +
    '</div>';
  document.body.appendChild(overlay);
}

function selectRcCard(slotIdx, cardId) {
  rcSelectedCards[slotIdx] = cardId;
  const overlay = document.getElementById('rc-card-picker-overlay');
  if (overlay) overlay.remove();
  renderRcCardSlots();
  renderRcMaterialSlots();
  updateRcStartButton();
}

function getRcCurrentRecipe() {
  if (!rcSelectedCards[0] || !rcSelectedCards[1]) return null;
  const cardA = CARDS.find(function(c) { return c.id === rcSelectedCards[0]; });
  const cardB = CARDS.find(function(c) { return c.id === rcSelectedCards[1]; });
  if (!cardA || !cardB) return null;
  const key = getRcTableKey(cardA.grade, cardB.grade);
  const table = RC_TABLE[key];
  if (!table) return null;
  const lowerGrade = rcGradeIndex(cardA.grade) <= rcGradeIndex(cardB.grade) ? cardA.grade : cardB.grade;
  return { cardA: cardA, cardB: cardB, table: table, lowerGrade: lowerGrade, key: key };
}

function renderRcMaterialSlots() {
  const recipe = getRcCurrentRecipe();
  const slot1 = document.getElementById('rc-material-slot-1');
  const slot2 = document.getElementById('rc-material-slot-2');
  const slot3 = document.getElementById('rc-material-slot-3');

  if (!recipe) {
    if (slot1) slot1.innerHTML = '<div class="rc-mat-empty">아이템을<br>등록해주세요</div>';
    if (slot2) slot2.innerHTML = '<div class="rc-mat-empty">아이템을<br>등록해주세요</div>';
    if (slot3) slot3.innerHTML = '<div class="rc-mat-empty">아이템을<br>등록해주세요</div>';
    return;
  }

  const need = recipe.table.stones;
  const haveNormal = getMaterialQty('재조합석');
  const haveEpic = getMaterialQty('에픽 재조합석');
  const haveWish = wishFragments;

  if (slot1) slot1.innerHTML = rcMaterialSlotHtml('🔹', '재조합석', haveNormal, need.normal);
  if (slot2) {
    if (need.epic > 0) slot2.innerHTML = rcMaterialSlotHtml('💠', '에픽 재조합석', haveEpic, need.epic);
    else slot2.innerHTML = '<div class="rc-mat-empty" style="opacity:0.4;">필요 없음</div>';
  }
  if (slot3) slot3.innerHTML = rcMaterialSlotHtml('🧩', '소원의조각', haveWish, 10);
}
  const container = slot1 ? slot1.parentElement.parentElement : null;
  if (container) {
    let btnArea = document.getElementById('rc-btn-area');
    if (!btnArea) {
      btnArea = document.createElement('div');
      btnArea.id = 'rc-btn-area';
      btnArea.style.cssText = 'width:100%; padding: 0 20px; margin-top: 20px; box-sizing: border-box; text-align: center;';
      container.appendChild(btnArea);
    }
    btnArea.innerHTML = '<button id="rc-start-btn" onclick="doRecombine()" style="width:100%; max-width:400px; padding:16px; background:linear-gradient(135deg,#FF6B9D,#C084FC); border:2px solid #FFD700; border-radius:16px; color:#fff; font-size:18px; font-weight:900; cursor:pointer; box-shadow:0 0 20px rgba(192,132,252,0.6); font-family:\'Noto Sans KR\',sans-serif; transition:all 0.3s;">재조합 시작</button>';
  }

function rcMaterialSlotHtml(emoji, name, have, need) {
  const ok = have >= need;
  return '<div class="rc-mat-filled" style="border-color:' + (ok ? '#C084FC' : '#FF6B9D') + ';">' +
    '<div style="font-size:28px;">' + emoji + '</div>' +
    '<div style="font-size:11px;font-weight:900;color:#fff;margin-top:2px;">' + name + '</div>' +
    '<div style="font-size:12px;font-weight:900;color:' + (ok ? '#4ade80' : '#FF6B9D') + ';">' + have + ' / ' + need + '</div></div>';
}

function getMaterialQty(name) {
  const item = bagItems.find(function(i) { return i.name === name && (i.type === 'material' || i.type === 'rc_stone'); });
  return item ? item.qty : 0;
}

function canDoRecombine() {
  const recipe = getRcCurrentRecipe();
  if (!recipe) return false;
  const need = recipe.table.stones;
  if (getMaterialQty('재조합석') < need.normal) return false;
  if (need.epic > 0 && getMaterialQty('에픽 재조합석') < need.epic) return false;
  if (wishFragments < 10) return false;
  if (coins < recipe.table.coin) return false;
  return true;
}

function updateRcStartButton() {
  const btn = document.getElementById('rc-start-btn');
  if (!btn) return;
  const recipe = getRcCurrentRecipe();
  const ok = canDoRecombine();
  if (!recipe) {
    btn.textContent = '재조합 시작';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    return;
  }
  btn.disabled = !ok;
  btn.style.opacity = ok ? '1' : '0.5';
  btn.textContent = '재조합 시작 (🍔 ' + recipe.table.coin.toLocaleString() + ')';
}

function doRecombine() {
  const recipe = getRcCurrentRecipe();
  if (!recipe || !canDoRecombine()) {
    showBagToast('재료가 부족해요!');
    return;
  }

  const need = recipe.table.stones;
  coins -= recipe.table.coin;
  if (need.normal > 0) useFromBag('재조합석', need.normal);
  if (need.epic > 0) useFromBag('에픽 재조합석', need.epic);
  wishFragments -= 10;
  localStorage.setItem('ph_wish', wishFragments);

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

  const pityBonus = Math.floor(rcPityCount / 100) * 1;
  const table = recipe.table;
  const rareChance = table.rareHidden + pityBonus;
  const epicChance = table.epicHidden + pityBonus;

  const roll = Math.random() * 100;
  let result;
  if (roll < epicChance) {
    result = rollHiddenCard('에픽히든', recipe);
  } else if (roll < epicChance + rareChance) {
    result = rollHiddenCard('레어히든', recipe);
  } else if (roll < epicChance + rareChance + table.upgrade) {
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
}

// ── 재조합 연출 (약 4초) ──
function playRecombineAnimation(result, resultCard) {
  const old = document.getElementById('rc-anim-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'rc-anim-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:990;background:radial-gradient(circle at 50% 45%,#1a0a2e,#05020a 70%);display:flex;align-items:center;justify-content:center;overflow:hidden;';

  overlay.innerHTML =
    '<div id="rc-anim-orb" style="position:relative;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,#C084FC,#6b21a8 70%);box-shadow:0 0 40px #C084FCaa;transition:box-shadow 0.6s,background 0.6s,transform 0.6s;animation:rcOrbSpin 2s linear infinite;">' +
      '<div id="rc-anim-spark" style="position:absolute;inset:-30px;border:2px dashed rgba(255,255,255,0.4);border-radius:50%;animation:rcOrbSpin 3s linear infinite reverse;"></div>' +
    '</div>' +
    '<div id="rc-anim-text" style="position:absolute;bottom:30%;color:#fff;font-size:15px;font-weight:900;text-shadow:0 2px 8px #000;">재조합 진행중...</div>' +
    '<style>@keyframes rcOrbSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}} @keyframes rcFlashBig{0%{opacity:0;}50%{opacity:1;}100%{opacity:0;}}</style>';

  document.body.appendChild(overlay);

  const orb = document.getElementById('rc-anim-orb');
  const textEl = document.getElementById('rc-anim-text');

  // 0~1.2초: 재료 흡수 텍스트
  setTimeout(function() {
    if (textEl) textEl.textContent = '재료를 흡수하는 중...';
  }, 1200);

  // 1.2~2.2초: 가짜 긍정 신호 (수정구 잠깐 금색)
  setTimeout(function() {
    if (orb) {
      orb.style.background = 'radial-gradient(circle,#FFD700,#b45309 70%)';
      orb.style.boxShadow = '0 0 60px #FFD700cc';
    }
    if (textEl) textEl.textContent = '어...?';
  }, 2200);

  // 2.2~2.8초: 다시 보라색으로 (긴장 풀림)
  setTimeout(function() {
    const isEpic = result.type === 'hidden' && result.hidden.grade === '에픽히든';
    const isUR = result.type === 'card' && result.grade === 'UR';
    const finalColor = isEpic ? '#FFD700' : (isUR ? '#FFD700' : '#C084FC');
    if (orb) {
      orb.style.background = 'radial-gradient(circle,' + finalColor + ',#1a0a2e 70%)';
      orb.style.boxShadow = '0 0 80px ' + finalColor + 'dd';
      orb.style.transform = 'scale(1.4)';
    }
    if (textEl) textEl.textContent = '운명이 결정되고 있어요...';
  }, 2800);

  // 3.4~4초: 폭발 + 결과 공개
  setTimeout(function() {
    const isEpic = result.type === 'hidden' && result.hidden.grade === '에픽히든';
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;z-index:995;background:#fff;animation:rcFlashBig 0.5s ease forwards;pointer-events:none;';
    document.body.appendChild(flash);
    if (isEpic) {
      const feathers = document.createElement('div');
      feathers.style.cssText = 'position:fixed;inset:0;z-index:994;pointer-events:none;font-size:28px;';
      feathers.innerHTML = ['🪽','💎','✨','🪽','💎','✨'].map(function(e, i) {
        return '<span style="position:absolute;left:' + (10 + i * 15) + '%;top:-40px;animation:rcFeatherFall 1.2s ease-in forwards ' + (i * 0.1) + 's;">' + e + '</span>';
      }).join('') + '<style>@keyframes rcFeatherFall{to{transform:translateY(110vh) rotate(180deg);opacity:0.3;}}</style>';
      document.body.appendChild(feathers);
      setTimeout(function() { feathers.remove(); }, 1500);
    }
    setTimeout(function() { flash.remove(); }, 550);
    overlay.remove();
    showRecombineResult(result, resultCard);
  }, 3400);
}

function rollHiddenCard(grade, recipe) {
  const candidates = HIDDEN_CARDS.filter(function(h) { return h.grade === grade; });
  const preferred = candidates.filter(function(h) { return h.charId === recipe.cardA.charId || h.charId === recipe.cardB.charId; });
  const pool = preferred.length > 0 ? preferred : candidates;
  const hidden = pool[Math.floor(Math.random() * pool.length)];
  if (!ownedHiddenCards.includes(hidden.id)) ownedHiddenCards.push(hidden.id);
  saveRcData();
  return { type: 'hidden', hidden: hidden };
}

function showRecombineResult(result, resultCard) {
  const old = document.getElementById('rc-result-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'rc-result-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:980;background:rgba(5,0,15,0.92);display:flex;align-items:center;justify-content:center;padding:20px;';

  let html;
  if (result.type === 'hidden') {
    const h = result.hidden;
    const isEpic = h.grade === '에픽히든';
    const glowColor = isEpic ? '#FFD700' : '#C084FC';
    const effectsHtml = h.effects.map(function(e) {
      return '<div style="font-size:13px;color:#fff;margin-top:4px;">' + e.label + ' <b style="color:' + glowColor + ';">' + e.value + '</b></div>';
    }).join('');
    html = '<div style="text-align:center;width:90%;max-width:320px;">' +
      '<div style="font-size:22px;font-weight:900;color:' + glowColor + ';text-shadow:0 0 20px ' + glowColor + 'aa;margin-bottom:14px;">✨ ' + h.grade + ' 등장! ✨</div>' +
      '<div style="width:220px;aspect-ratio:3/4;margin:0 auto 14px;border-radius:16px;overflow:hidden;border:3px solid ' + glowColor + ';box-shadow:0 0 40px ' + glowColor + '88;">' +
      '<img src="' + h.img + '" style="width:100%;height:100%;object-fit:cover;"></div>' +
      '<div style="font-size:17px;font-weight:900;color:#fff;margin-bottom:6px;">' + h.name + '</div>' + effectsHtml + '</div>';
  } else {
    const card = resultCard;
    html = '<div style="text-align:center;width:90%;max-width:300px;">' +
      '<div style="font-size:18px;font-weight:900;color:' + card.gradeColor + ';margin-bottom:14px;">' + card.grade + ' 카드 획득!</div>' +
      '<div style="width:200px;aspect-ratio:3/4;margin:0 auto 14px;border-radius:14px;overflow:hidden;border:3px solid ' + card.gradeColor + ';box-shadow:0 0 30px ' + card.gradeColor + '88;">' +
      '<img src="' + card.img + '" style="width:100%;height:100%;object-fit:cover;"></div>' +
      '<div style="font-size:16px;font-weight:900;color:#fff;">' + card.name + '</div></div>';
  }

  overlay.innerHTML = '<div style="background:linear-gradient(135deg,#1a0a2e,#2d1b4e);border:2px solid #C084FC;border-radius:24px;padding:28px 20px;">' +
    html +
    '<button onclick="document.getElementById(\'rc-result-overlay\').remove();renderRecombinePage();" style="margin-top:18px;width:100%;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">확인</button></div>';
  document.body.appendChild(overlay);
}

function openHiddenCardDex() {
  const old = document.getElementById('hidden-dex-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'hidden-dex-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:950;background:linear-gradient(180deg,#1a0a2e,#0a0515);overflow-y:auto;';

  const cardsHtml = HIDDEN_CARDS.map(function(h) {
    const isOwned = ownedHiddenCards.includes(h.id);
    const glowColor = h.grade === '에픽히든' ? '#FFD700' : '#C084FC';
    return '<div style="position:relative;border:2px solid ' + glowColor + ';border-radius:14px;overflow:hidden;background:#111;aspect-ratio:3/4;">' +
      '<img src="' + h.img + '" style="width:100%;height:100%;object-fit:cover;opacity:' + (isOwned ? '1' : '0.78') + ';">' +
      '<div style="position:absolute;top:6px;right:6px;background:' + glowColor + ';color:#1a1a2e;font-size:9px;font-weight:900;padding:2px 6px;border-radius:8px;">' + h.grade + '</div>' +
      '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.75);padding:6px;text-align:center;">' +
      '<div style="font-size:11px;font-weight:900;color:#fff;">' + h.name + '</div>' +
      (!isOwned ? '<div style="font-size:10px;color:#FF6B9D;font-weight:900;margin-top:2px;">미획득</div>' : '') +
      '</div></div>';
  }).join('');

  overlay.innerHTML =
    '<div style="position:sticky;top:0;z-index:2;background:rgba(10,5,20,0.92);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;">' +
    '<div style="color:#fff;font-size:17px;font-weight:900;">📖 히든카드 도감</div>' +
    '<button onclick="document.getElementById(\'hidden-dex-overlay\').remove()" style="background:rgba(255,255,255,0.12);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;">닫기</button></div>' +
    '<div style="padding:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding-bottom:40px;">' + cardsHtml + '</div>';
  document.body.appendChild(overlay);
}

function openMoreMenu() {
  const old = document.getElementById('more-menu-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'more-menu-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = '<div style="width:100%;max-width:430px;margin:0 auto;background:#1a1a2e;border-radius:24px 24px 0 0;padding:20px 16px 36px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
    '<div style="color:#fff;font-size:16px;font-weight:900;">더보기</div>' +
    '<button onclick="document.getElementById(\'more-menu-overlay\').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:#fff;padding:6px 12px;cursor:pointer;">닫기</button></div>' +
    '<div style="display:flex;flex-direction:column;gap:10px;">' +
    '<button onclick="document.getElementById(\'more-menu-overlay\').remove();openRecombine();" style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(192,132,252,0.15);border:1.5px solid #C084FC;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;"><span style="font-size:24px;">🔮</span> 카드 재조합기</button>' +
    '<button onclick="document.getElementById(\'more-menu-overlay\').remove();openHiddenCardDex();" style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(255,215,0,0.12);border:1.5px solid #FFD700;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;"><span style="font-size:24px;">📖</span> 히든카드 도감</button>' +
    '<button onclick="document.getElementById(\'more-menu-overlay\').remove();openShop(\'gift\');" style="display:flex;align-items:center;gap:12px;padding:14px;background:rgba(255,107,157,0.12);border:1.5px solid #FF6B9D;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;"><span style="font-size:24px;">🛍️</span> 잡화점</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
}

(function hookGoToForRecombine() {
  if (typeof window.goTo !== 'function') {
    setTimeout(hookGoToForRecombine, 50);
    return;
  }
  const originalGoTo = window.goTo;
  window.goTo = function(id) {
    const result = originalGoTo.apply(this, arguments);
    if (id === 'recombine') renderRecombinePage();
    return result;
  };
})();

// ── 탐험 후킹: 재조합석류 드랍 추가 + 신비의 섬 보정 ──
// 신비의 섬: 희귀재료 45%, 스태미나 15 소모, 에픽재조합석 3% 드랍
// 그 외 일반 탐험지: 재조합석 15% 드랍 (희귀재료 확률은 기존 30% 유지)
(function hookStartExploreForRcStones() {
  if (typeof window.startExplore !== 'function') {
    setTimeout(hookStartExploreForRcStones, 50);
    return;
  }
  const originalStartExplore = window.startExplore;
  window.startExplore = function(placeId) {
    // 신비의 섬은 스태미나를 15로 보정 (원본 함수가 차감하기 전에 stamina를 5 더 채워서 보정)
    if (placeId === 'mystery' && typeof stamina !== 'undefined') {
      if (stamina < 15) {
        showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (신비의 섬은 15 필요)');
        return;
      }
      stamina -= 5; // 원본이 -10을 하니, 여기서 -5 추가해서 총 -15
      if (typeof saveStamina === 'function') saveStamina();
    }
    const result = originalStartExplore.apply(this, arguments);

    // 재조합석류 드랍 (탐험 1회당 1번 판정)
    // setTimeout으로 살짜기 늦춰서 endExplore()가 화면을 그리기 전에 exploreCollected에 반영
    if (placeId === 'mystery') {
      if (Math.random() < 0.03) {
        addToBag('💠', '에픽 재조합석', 'material', 1, 'SSR/UR 카드 재조합에 필요한 재료');
        if (typeof exploreCollected !== 'undefined') exploreCollected.push('💠 에픽 재조합석');
      }
      // 신비의 섬 희귀재료 보정: 기존 30%보다 15%p 더 높은 효과를 위해
      // 별도 보너스 판정으로 희귀재료를 추가 지급 (원본 30% + 보너스 15% ≈ 45%)
      if (typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS.mystery && Math.random() < 0.15) {
        const rarePool = EXPLORE_MATERIALS.mystery.rare;
        const bonusMat = rarePool[Math.floor(Math.random() * rarePool.length)];
        addToBag('🌿', bonusMat, 'material', 1, '제작 재료 (신비의 섬 보너스)');
        if (typeof exploreCollected !== 'undefined') exploreCollected.push(bonusMat);
      }
    } else {
      const validPlaces = ['beach', 'park', 'forest', 'lake', 'square'];
      if (validPlaces.includes(placeId) && Math.random() < 0.15) {
        addToBag('🔹', '재조합석', 'material', 1, '카드 재조합에 필요한 재료');
        if (typeof exploreCollected !== 'undefined') exploreCollected.push('🔹 재조합석');
      }
    }
  };
})();
