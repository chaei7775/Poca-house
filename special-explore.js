// ════════════════════════════════
// 🌙 특별 탐험 (1단계: 수동 탐험)
// ════════════════════════════════

const SPECIAL_LOCATIONS = [
  { id:'sky_ruins',         name:'천공성 유적',   emoji:'🏛️', color:'#60A5FA', bg:'https://raw.githubusercontent.com/chaei7775/Poca-house/main/special-sky_ruins.png' },
  { id:'moonlit_corridor',  name:'달빛 회랑',     emoji:'🌙', color:'#A78BFA', bg:'https://raw.githubusercontent.com/chaei7775/Poca-house/main/special-moonlit_corridor.png' },
  { id:'workshop_basement', name:'공방 지하',     emoji:'🔮', color:'#F472B6', bg:'https://raw.githubusercontent.com/chaei7775/Poca-house/main/special-workshop_basement.png' }
];

const SPECIAL_FOODS = ['반짝열매', '달빛열매', '오색열매'];
const SPECIAL_FOOD_PRICE = 30;

const SPECIAL_CREATURES = [
  { id:'rainbow_butterfly', emoji:'🦋', name:'무지개 나비',   correctFood:'오색열매', rare:false, img:'creature-rainbow_butterfly.png' },
  { id:'silver_sparrow',    emoji:'🕊️', name:'은빛 참새',     correctFood:'반짝열매', rare:false, img:'creature-silver_sparrow.png' },
  { id:'star_fox',          emoji:'🦊', name:'별빛 여우',     correctFood:'달빛열매', rare:false, img:'creature-star_fox.png' },
  { id:'silver_salmon',     emoji:'🐟', name:'은빛 연어',     correctFood:'반짝열매', rare:false, img:'creature-silver_salmon.png' },
  { id:'moon_rabbit',       emoji:'🐇', name:'달토끼',        correctFood:'달빛열매', rare:false, img:'creature-moon_rabbit.png' },
  { id:'crystal_deer',      emoji:'🦌', name:'수정 사슴',     correctFood:'오색열매', rare:false, img:'creature-crystal_deer.png' },
  { id:'aurora_peacock',    emoji:'🦚', name:'오로라 공작',   correctFood:'반짝열매', rare:true,  img:'creature-aurora_peacock.png' },
  { id:'wish_dragon',       emoji:'🐉', name:'소원의 새끼용', correctFood:'달빛열매', rare:true,  img:'creature-wish_dragon.png' }
];

function creatureImgHtml(creature, size) {
  return '<img src="https://raw.githubusercontent.com/chaei7775/Poca-house/main/' + creature.img + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;" onerror="this.outerHTML=\'<div style=&quot;font-size:' + size + 'px;&quot;>' + creature.emoji + '</div>\'">';
}

const LOCATION_CREATURES = {
  sky_ruins:         ['rainbow_butterfly', 'silver_sparrow', 'crystal_deer'],
  moonlit_corridor:  ['moon_rabbit', 'star_fox', 'aurora_peacock'],
  workshop_basement: ['silver_salmon', 'wish_dragon']
};

const RARE_VARIANTS = {
  rainbow_butterfly: { name:'프리즘 나비',       img:'variant-prism_butterfly.png' },
  silver_sparrow:    { name:'황금 깃털 참새',     img:'variant-gold_feather_sparrow.png' },
  crystal_deer:      { name:'다이아 수정사슴',     img:'variant-diamond_deer.png' },
  moon_rabbit:       { name:'월광 달토끼',         img:'variant-moonlight_rabbit.png' },
  star_fox:          { name:'은하수 별빛 여우',    img:'variant-galaxy_fox.png' },
  aurora_peacock:    { name:'성운 공작',           img:'variant-nebula_peacock.png' },
  silver_salmon:     { name:'붉은비늘 연어',       img:'variant-red_scale_salmon.png' },
  wish_dragon:       { name:'별빛 새끼용',         img:'variant-starlight_dragon.png' }
};

const SPECIAL_JAPTEM = [
  { emoji:'🧶', name:'별빛 털' },
  { emoji:'🌟', name:'반짝이는 날개가루' },
  { emoji:'🕊️', name:'은빛 깃털' },
  { emoji:'🌼', name:'신비한 꽃가루' },
  { emoji:'🍂', name:'달빛 잎사귀' },
  { emoji:'🔷', name:'수정 조각' }
];
const SPECIAL_GEAR = [
  { name:'월광 브로치', emoji:'🌜' }, { name:'응원 리본', emoji:'🎀' }, { name:'팬클럽 배지', emoji:'🏅' },
  { name:'기념 목걸이', emoji:'📿' }, { name:'천사의 깃털 장식', emoji:'👼' }, { name:'별빛 펜던트', emoji:'🔮' }
];
const SPECIAL_GEAR_GRADES = { common:'일반', great:'고급', rare:'희귀', legend:'전설' };

let specialExploreState = null; // { locationId, charId, creature, foodChosen }

function getDexCaptured() {
  return JSON.parse(localStorage.getItem('ph_dex_captured') || '[]');
}
function addDexCaptured(creatureId) {
  const list = getDexCaptured();
  if (list.indexOf(creatureId) === -1) {
    list.push(creatureId);
    localStorage.setItem('ph_dex_captured', JSON.stringify(list));
    if (typeof saveAll === 'function') saveAll();
    return true; // 최초 등록
  }
  return false;
}

// ── 까만 빈 공간에 장소 목록 렌더 ──
function renderSpecialExploreList() {
  const el = document.getElementById('special-explore-list');
  if (!el) { setTimeout(renderSpecialExploreList, 200); return; }
  el.innerHTML = SPECIAL_LOCATIONS.map(function(loc) {
    return '<button onclick="openSpecialCardSelect(\'' + loc.id + '\')" style="width:100%;display:flex;align-items:center;gap:12px;padding:13px 14px;margin-bottom:9px;background:' + loc.color + '1f;border:1.5px solid ' + loc.color + ';border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;">' +
      '<span style="font-size:24px;">' + loc.emoji + '</span><span>' + loc.name + '</span>' +
      '<span style="margin-left:auto;color:#888;font-size:16px;">›</span></button>';
  }).join('') +
  '<button onclick="openDexOverlay()" style="width:100%;padding:7px;margin-top:4px;margin-bottom:80px;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.2);border-radius:10px;color:#ccc;font-size:12px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">📖 생물도감 (' + getDexCaptured().length + '/' + SPECIAL_CREATURES.length + ')</button>';
}
setTimeout(renderSpecialExploreList, 300);

// ── 출전카드 선택 ──
function openSpecialCardSelect(locationId) {
  const old = document.getElementById('special-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'special-overlay';
  overlay.style.cssText = 'position:fixed;top:0;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;z-index:700;background:#1a1a2e;display:flex;flex-direction:column;';

  const loc = SPECIAL_LOCATIONS.find(function(l) { return l.id === locationId; });
  const hiddenOwned = typeof ownedHiddenCards !== 'undefined' ? ownedHiddenCards : [];
  const eligibleChars = Object.keys(CHARS).filter(function(cid) {
    return hiddenOwned.some(function(hid) { return hid.indexOf('hidden_' + cid + '_') === 0; });
  });

  let bodyHtml;
  if (eligibleChars.length === 0) {
    bodyHtml =
      '<div style="text-align:center;padding:10px 0 20px;">' +
      '<div style="font-size:32px;margin-bottom:8px;">🔒</div>' +
      '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:4px;">특별 탐험 입장 조건</div>' +
      '<div style="font-size:12px;color:#aaa;margin-bottom:6px;">히든(EH) 카드를 보유해야 입장할 수 있어요</div>' +
      '<div style="font-size:12px;color:#FFD700;margin-bottom:16px;">현재 보유: ' + hiddenOwned.length + '장</div>' +
      '<button onclick="document.getElementById(\'special-overlay\').remove();if(typeof openRecombine===\'function\')openRecombine();" style="padding:12px 24px;background:linear-gradient(135deg,#C084FC,#7c3aed);border:none;border-radius:14px;color:#fff;font-size:13px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🔮 재조합기로 이동</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
      Object.keys(CHARS).map(function(cid) {
        const ch = CHARS[cid];
        return '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.1);border-radius:12px;">' +
          '<span style="font-size:20px;filter:grayscale(1) brightness(0.5);">' + ch.emoji + '</span>' +
          '<span style="font-size:12px;font-weight:700;color:#777;">' + ch.name + ' EH</span>' +
          '<span style="margin-left:auto;font-size:14px;">🔒</span></div>';
      }).join('') +
      '</div>';
  } else {
    bodyHtml =
      '<div style="font-size:13px;color:#ccc;margin-bottom:12px;">출전할 포카를 선택해주세요 (탐험 경험치를 획득해요)</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      eligibleChars.map(function(cid) {
        const ch = CHARS[cid];
        return '<button onclick="startSpecialExplore(\'' + locationId + '\',\'' + cid + '\')" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 8px;background:rgba(255,255,255,0.06);border:1.5px solid ' + ch.gradeColor + ';border-radius:14px;color:#fff;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">' +
          '<span style="font-size:28px;">' + ch.emoji + '</span><span style="font-size:13px;font-weight:900;">' + ch.name + '</span></button>';
      }).join('') +
      '</div>';
  }

  overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.1);">' +
    '<div style="color:#fff;font-size:15px;font-weight:900;">' + loc.emoji + ' ' + loc.name + '</div>' +
    '<button onclick="document.getElementById(\'special-overlay\').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;">닫기</button></div>' +
    '<div style="padding:16px;overflow-y:auto;">' + bodyHtml + '</div>';
  document.body.appendChild(overlay);
}

function startSpecialExplore(locationId, charId) {
  specialExploreState = { locationId: locationId, charId: charId, creature: null, foodChosen: null };
  renderSpecialExploreScreen();
}

function renderSpecialExploreScreen() {
  const loc = SPECIAL_LOCATIONS.find(function(l) { return l.id === specialExploreState.locationId; });
  const ch = CHARS[specialExploreState.charId];
  const overlay = document.getElementById('special-overlay');
  overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(0,0,0,0.45);position:relative;z-index:2;">' +
    '<div style="color:#fff;font-size:15px;font-weight:900;text-shadow:0 2px 6px rgba(0,0,0,0.8);">' + loc.emoji + ' ' + loc.name + '</div>' +
    '<button onclick="document.getElementById(\'special-overlay\').remove()" style="background:rgba(255,255,255,0.15);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;">나가기</button></div>' +
    '<div id="special-main-area" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;position:relative;background:linear-gradient(to bottom,rgba(0,0,0,0.25),rgba(0,0,0,0.6)),url(\'' + loc.bg + '\') center/cover;">' +
    '<div style="font-size:13px;color:#FFB3CC;margin-bottom:8px;text-shadow:0 2px 6px rgba(0,0,0,0.9);">' + ch.emoji + ' ' + ch.name + ' 출전 중</div>' +
    '<div style="font-size:13px;color:#eee;margin-bottom:20px;text-shadow:0 2px 6px rgba(0,0,0,0.9);">조용히 주변을 둘러보면, 무언가 나타날지도 몰라요...</div>' +
    '<button onclick="encounterSpecialCreature()" style="padding:14px 32px;background:linear-gradient(135deg,' + loc.color + ',#C084FC);border:none;border-radius:16px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.5);">🔍 탐험하기</button>' +
    '</div>';
}

function encounterSpecialCreature() {
  const allowedIds = LOCATION_CREATURES[specialExploreState.locationId] || SPECIAL_CREATURES.map(function(c) { return c.id; });
  const candidates = SPECIAL_CREATURES.filter(function(c) { return allowedIds.indexOf(c.id) !== -1; });
  const pool = [];
  candidates.forEach(function(c) {
    const weight = c.rare ? 1 : 6;
    for (let i = 0; i < weight; i++) pool.push(c);
  });
  const baseCreature = pool[Math.floor(Math.random() * pool.length)];

  // 5% 확률로 레어 변종 등장
  const isVariant = Math.random() < 0.05 && RARE_VARIANTS[baseCreature.id];
  const creature = isVariant ?
    Object.assign({}, baseCreature, { isVariant: true, variantName: RARE_VARIANTS[baseCreature.id].name, variantImg: RARE_VARIANTS[baseCreature.id].img }) :
    Object.assign({}, baseCreature, { isVariant: false });

  specialExploreState.creature = creature;
  specialExploreState.foodChosen = null;
  specialExploreState.feedRound = 1;
  specialExploreState.chance = null;
  renderSpecialFeedScreen();
}

function getFoodQty(food) {
  if (typeof bagItems === 'undefined') return 0;
  const item = bagItems.find(function(i) { return i.name === food && i.type === 'food'; });
  return item ? item.qty : 0;
}

function renderSpecialFeedScreen() {
  const creature = specialExploreState.creature;
  const area = document.getElementById('special-main-area');
  const alreadyCaptured = getDexCaptured().indexOf(creature.id) !== -1;
  const round = specialExploreState.feedRound || 1;
  const displayName = creature.isVariant ? creature.variantName : creature.name;
  const displayImgHtml = creature.isVariant ? variantImgHtml(creature, 100) : creatureImgHtml(creature, 100);

  area.innerHTML =
    '<div style="font-size:13px;font-weight:900;margin-bottom:6px;' + (creature.isVariant ? 'color:#FFD700;' : 'color:#FFB3CC;') + '">' +
      (creature.isVariant ? '🌈 레어 변종 발견!!' : (creature.rare ? '✨ 희귀 생물 발견!' : '생물 발견!')) +
    '</div>' +
    '<div style="margin-bottom:8px;">' + displayImgHtml + '</div>' +
    '<div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:4px;">' + displayName + '</div>' +
    '<div style="font-size:11px;color:#888;margin-bottom:18px;">' + (alreadyCaptured ? '(도감에 등록된 생물이에요)' : '(아직 도감에 없는 생물이에요!)') + (creature.isVariant ? '<br>관찰을 두 번 해야 포획할 수 있어요 (' + round + '/2)' : '') + '</div>' +
    '<div style="font-size:13px;color:#ccc;margin-bottom:12px;">어떤 먹이를 줄까요?</div>' +
    '<div style="display:flex;gap:10px;margin-bottom:10px;">' +
    SPECIAL_FOODS.map(function(food) {
      const qty = getFoodQty(food);
      const disabled = qty <= 0;
      return '<button onclick="' + (disabled ? '' : 'chooseSpecialFood(\'' + food + '\')') + '" style="padding:12px 14px;background:' + (disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)') + ';border:1.5px solid ' + (disabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)') + ';border-radius:14px;color:' + (disabled ? '#555' : '#fff') + ';font-size:13px;font-weight:700;cursor:' + (disabled ? 'default' : 'pointer') + ';font-family:\'Noto Sans KR\',sans-serif;">' + food + '<br><span style="font-size:10px;color:' + (disabled ? '#555' : '#FFD700') + ';">보유 ' + qty + '개</span></button>';
    }).join('') +
    '</div>' +
    '<button onclick="openFoodShop()" style="padding:8px 16px;background:rgba(255,215,0,0.15);border:1.5px solid #FFD700;border-radius:12px;color:#FFD700;font-size:12px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🛒 먹이 구매하기</button>';
}

function openFoodShop() {
  const old = document.getElementById('food-shop-popup');
  if (old) old.remove();
  const popup = document.createElement('div');
  popup.id = 'food-shop-popup';
  popup.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:20px;';
  popup.onclick = function(e) { if (e.target === popup) popup.remove(); };
  popup.innerHTML = '<div style="width:100%;max-width:320px;background:#fff;border-radius:18px;padding:20px;">' +
    '<div style="font-size:15px;font-weight:900;color:#222;margin-bottom:4px;">🛒 먹이 구매</div>' +
    '<div style="font-size:11px;color:#888;margin-bottom:14px;">보유 코인: 🍔 ' + (typeof coins !== 'undefined' ? coins : 0) + '</div>' +
    SPECIAL_FOODS.map(function(food) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eee;">' +
        '<div style="font-size:13px;font-weight:700;color:#333;">' + food + ' <span style="color:#aaa;font-size:11px;">(보유 ' + getFoodQty(food) + ')</span></div>' +
        '<button onclick="buySpecialFood(\'' + food + '\')" style="padding:7px 14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🍔' + SPECIAL_FOOD_PRICE + ' 구매</button>' +
        '</div>';
    }).join('') +
    '<button onclick="document.getElementById(\'food-shop-popup\').remove()" style="width:100%;margin-top:14px;padding:10px;background:#f3f3f3;border:none;border-radius:10px;color:#666;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">닫기</button>' +
    '</div>';
  document.body.appendChild(popup);
}

function buySpecialFood(food) {
  if (typeof coins === 'undefined' || coins < SPECIAL_FOOD_PRICE) {
    if (typeof showBagToast === 'function') showBagToast('코인이 부족해요!');
    return;
  }
  coins -= SPECIAL_FOOD_PRICE;
  if (typeof addToBag === 'function') addToBag('🍓', food, 'food', 1, '특별탐험 먹이');
  if (typeof saveAll === 'function') saveAll();
  if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
  openFoodShop();
  renderSpecialFeedScreen();
}

function variantImgHtml(creature, size) {
  const v = RARE_VARIANTS[creature.id];
  return '<img src="https://raw.githubusercontent.com/chaei7775/Poca-house/main/' + v.img + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;filter:drop-shadow(0 0 14px #FFD700);" onerror="this.outerHTML=\'<div style=&quot;font-size:' + size + 'px;&quot;>' + creature.emoji + '</div>\'">';
}

function chooseSpecialFood(food) {
  if (getFoodQty(food) <= 0) {
    if (typeof showBagToast === 'function') showBagToast('이 먹이가 없어요! 🛒에서 구매해주세요');
    return;
  }
  if (typeof useFromBag === 'function') useFromBag(food, 1);
  specialExploreState.foodChosen = food;
  const creature = specialExploreState.creature;
  const correct = food === creature.correctFood;
  const round = specialExploreState.feedRound || 1;

  specialExploreState.chance = (specialExploreState.chance != null ? specialExploreState.chance : 0.5) + (correct ? 0.3 : -0.2);

  const displayName = creature.isVariant ? creature.variantName : creature.name;
  const displayImgHtml = creature.isVariant ? variantImgHtml(creature, 100) : creatureImgHtml(creature, 100);
  const area = document.getElementById('special-main-area');
  area.innerHTML =
    '<div style="margin-bottom:10px;">' + displayImgHtml + '</div>' +
    '<div style="font-size:14px;color:' + (correct ? '#4ade80' : '#ff8a8a') + ';font-weight:900;margin-bottom:16px;">' + (correct ? (displayName + '이(가) 좋아하는 먹이였어요!') : (displayName + '이(가) 별로 안 좋아하는 먹이였어요...')) + '</div>' +
    '<div style="font-size:13px;color:#aaa;">관찰하는 중...</div>';

  if (creature.isVariant && round < 2) {
    setTimeout(function() {
      specialExploreState.feedRound = 2;
      renderSpecialFeedScreen();
    }, 1400);
  } else {
    const chance = Math.max(0.05, Math.min(0.95, specialExploreState.chance));
    const success = Math.random() < chance;
    setTimeout(function() { resolveSpecialCapture(success); }, 1400);
  }
}

function resolveSpecialCapture(success) {
  const creature = specialExploreState.creature;
  const area = document.getElementById('special-main-area');
  const displayName = creature.isVariant ? creature.variantName : creature.name;
  const displayImgHtml = creature.isVariant ? variantImgHtml(creature, 100) : creatureImgHtml(creature, 100);

  if (!success) {
    area.innerHTML =
      '<div style="margin-bottom:10px;opacity:0.5;">' + displayImgHtml + '<span style="font-size:30px;">💨</span></div>' +
      '<div style="font-size:15px;color:#ff8a8a;font-weight:900;margin-bottom:18px;">' + displayName + '이(가) 도망가버렸어요...</div>' +
      '<button onclick="renderSpecialExploreScreen()" style="padding:13px 28px;background:rgba(255,255,255,0.1);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">다시 둘러보기</button>';
    return;
  }

  // 보상 계산
  const expGain = (creature.isVariant ? 200 : 100) + Math.floor(Math.random() * 100);
  const charId = specialExploreState.charId;
  if (typeof addCardExp === 'function') {
    addCardExp(charId, expGain);
  } else {
    try {
      const cardExpData = JSON.parse(localStorage.getItem('ph_cardExp') || '{}');
      cardExpData[charId] = (cardExpData[charId] || 0) + expGain;
      localStorage.setItem('ph_cardExp', JSON.stringify(cardExpData));
    } catch (e) {}
  }

  let gotJaptem = false, japtemItem = null;
  if (Math.random() < 0.9) {
    gotJaptem = true;
    japtemItem = SPECIAL_JAPTEM[Math.floor(Math.random() * SPECIAL_JAPTEM.length)];
    if (typeof addToBag === 'function') addToBag(japtemItem.emoji, japtemItem.name, 'material', 1, '특별탐험 재료');
  }

  // 장착아이템: 레어변종은 100% 드랍, 일반은 5%
  const gotGear = creature.isVariant ? true : Math.random() < 0.05;
  let gearGrade = null;
  let gearItem = null;
  if (gotGear) {
    const gearRoll = Math.random();
    if (gearRoll < 0.001) gearGrade = 'legend';
    else if (gearRoll < 0.01) gearGrade = 'rare';
    else if (gearRoll < 0.05) gearGrade = 'great';
    else gearGrade = 'common';
    gearItem = SPECIAL_GEAR[Math.floor(Math.random() * SPECIAL_GEAR.length)];
    const gradeLabel = SPECIAL_GEAR_GRADES[gearGrade];
    if (typeof addToBag === 'function') addToBag(gearItem.emoji, '[' + gradeLabel + '] ' + gearItem.name, 'gear', 1, '특별탐험 장착아이템 (효과는 추후 적용 예정)');
  }

  // 등교권 / 등교권 조각 드랍 (일반: 등교권0.2%·조각5% / 변종: 등교권3%·조각15%)
  let gotTicket = false, gotTicketFragment = false;
  const ticketChance = creature.isVariant ? 0.03 : 0.002;
  const fragmentChance = creature.isVariant ? 0.15 : 0.05;
  if (Math.random() < ticketChance) {
    gotTicket = true;
    if (typeof schoolDaily !== 'undefined') {
      schoolDaily.tickets = (schoolDaily.tickets || 0) + 1;
      if (typeof saveSchoolDaily === 'function') saveSchoolDaily();
    }
  } else if (Math.random() < fragmentChance) {
    gotTicketFragment = true;
    if (typeof addToBag === 'function') addToBag('🎫', '등교권 조각', 'ticket_fragment', 1, '10개 모으면 등교권 1장으로 교환!');
    const fragCount = (function() {
      const store = JSON.parse(localStorage.getItem('ph_ticketFragments') || '0');
      const next = (typeof store === 'number' ? store : 0) + 1;
      localStorage.setItem('ph_ticketFragments', JSON.stringify(next));
      return next;
    })();
    if (fragCount >= 10) {
      localStorage.setItem('ph_ticketFragments', JSON.stringify(0));
      if (typeof schoolDaily !== 'undefined') {
        schoolDaily.tickets = (schoolDaily.tickets || 0) + 1;
        if (typeof saveSchoolDaily === 'function') saveSchoolDaily();
      }
      gotTicket = true;
      gotTicketFragment = false;
    }
  }

  const isFirstCapture = addDexCaptured(creature.id);

  const dropHtml = '<div style="font-size:12px;color:#ddd;line-height:1.8;margin-bottom:6px;">' +
    '⭐ ' + CHARS[charId].name + ' +' + expGain + ' EXP<br>' +
    (gotJaptem ? (japtemItem.emoji + ' ' + japtemItem.name + ' x1<br>') : '') +
    (gotGear ? ('✨ [' + SPECIAL_GEAR_GRADES[gearGrade] + '] ' + gearItem.name + ' 획득!<br>') : '') +
    (gotTicket ? '🎫 등교권 +1<br>' : '') +
    (gotTicketFragment ? '🎫 등교권 조각 +1<br>' : '') +
    '</div>';

  area.innerHTML =
    '<div style="font-size:13px;font-weight:900;margin-bottom:6px;' + (creature.isVariant ? 'color:#FFD700;' : 'color:#FFD700;') + '">' + (creature.isVariant ? '🌈 레어 변종 포획 성공!' : '🎉 포획 성공!') + '</div>' +
    '<div style="margin-bottom:8px;">' + displayImgHtml + '</div>' +
    '<div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:4px;">' + displayName + '</div>' +
    (isFirstCapture ? '<div style="font-size:12px;color:#FF6B9D;font-weight:900;margin-bottom:12px;">📖 도감 신규 등록!</div>' : '<div style="font-size:11px;color:#888;margin-bottom:12px;">(반복 포획)</div>') +
    dropHtml +
    '<button onclick="renderSpecialExploreScreen()" style="margin-top:10px;padding:13px 28px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">계속 탐험하기</button>';

  if (typeof saveAll === 'function') saveAll();
  if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
}

// ── 생물도감 ──
function openDexOverlay() {
  const old = document.getElementById('dex-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'dex-overlay';
  overlay.style.cssText = 'position:fixed;top:0;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:430px;z-index:980;background:#1a1a2e;display:flex;flex-direction:column;';

  const captured = getDexCaptured();
  overlay.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.1);">' +
    '<div style="color:#fff;font-size:15px;font-weight:900;">📖 생물도감 (' + captured.length + '/' + SPECIAL_CREATURES.length + ')</div>' +
    '<button onclick="document.getElementById(\'dex-overlay\').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;">닫기</button></div>' +
    '<div style="flex:1;overflow-y:auto;padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
    SPECIAL_CREATURES.map(function(c) {
      const got = captured.indexOf(c.id) !== -1;
      return '<div style="background:' + (got ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)') + ';border:1.5px solid ' + (got ? '#FFD700' : 'rgba(255,255,255,0.1)') + ';border-radius:14px;padding:14px;text-align:center;">' +
        '<div style="margin-bottom:6px;' + (got ? '' : 'filter:grayscale(1) brightness(0.3);') + '">' + creatureImgHtml(c, 50) + '</div>' +
        '<div style="font-size:12px;font-weight:900;color:' + (got ? '#fff' : '#555') + ';">' + (got ? c.name : '???') + '</div>' +
        (c.rare ? '<div style="font-size:9px;color:#FFD700;margin-top:2px;">희귀</div>' : '') +
        '</div>';
    }).join('') +
    '</div>';
  document.body.appendChild(overlay);
}
