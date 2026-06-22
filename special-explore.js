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
  { name:'월광 리본',       emoji:'🎀', effect:'flee',    value:10 },
  { name:'프리즘 브로치',   emoji:'🌈', effect:'chance',  value:15 },
  { name:'천공 깃털 배지',  emoji:'🪽', effect:'variant', value:20 },
  { name:'은하수 브로치',   emoji:'🌌', effect:'variant', value:35 },
  { name:'수정 왕관 배지',  emoji:'💎', effect:'retry',   value:1 },
  { name:'불꽃 펜던트',     emoji:'🔥', effect:'chance',  value:30 },
  { name:'성운 펜던트',     emoji:'🌠', effect:'flee',    value:25 },
  { name:'용의 심장 브로치', emoji:'❤️', effect:'variant', value:50 }
];
const CAPTURE_TOOL_NAME = '포획망';
const CAPTURE_TOOL_PRICE = 50;
const SPECIAL_GEAR_GRADES = { common:'일반', great:'고급', rare:'희귀', legend:'전설' };

let specialExploreState = null; // { locationId, charId, creature, foodChosen }

function getEquippedGear() {
  const name = localStorage.getItem('ph_equippedGear');
  if (!name) return null;
  return SPECIAL_GEAR.find(function(g) { return g.name === name; }) || null;
}
function getGearBonus(effectType) {
  const gear = getEquippedGear();
  if (!gear || gear.effect !== effectType) return 0;
  return gear.value;
}
function hasRetryGear() {
  return getGearBonus('retry') > 0;
}

function openGearEquipScreen() {
  const old = document.getElementById('gear-equip-popup');
  if (old) old.remove();
  const popup = document.createElement('div');
  popup.id = 'gear-equip-popup';
  popup.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:20px;';
  popup.onclick = function(e) { if (e.target === popup) popup.remove(); };

  const owned = (typeof bagItems !== 'undefined' ? bagItems : []).filter(function(i) { return i.type === 'gear'; });
  const equipped = getEquippedGear();

  let listHtml;
  if (owned.length === 0) {
    listHtml = '<div style="font-size:12px;color:#888;text-align:center;padding:20px 0;">아직 보유한 장비가 없어요.<br>레어 변종을 포획하면 장비를 얻을 수 있어요!</div>';
  } else {
    listHtml = owned.map(function(item) {
      const gear = SPECIAL_GEAR.find(function(g) { return item.name.indexOf(g.name) !== -1; });
      if (!gear) return '';
      const isEquipped = equipped && equipped.name === gear.name;
      const effectText = gear.effect === 'flee' ? '도망확률 -' + gear.value + '%' :
        gear.effect === 'chance' ? '포획확률 +' + gear.value + '%' :
        gear.effect === 'variant' ? '변종 출현 +' + gear.value + '%' :
        '포획 실패시 재도전 ' + gear.value + '회';
      return '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.06);border:1.5px solid ' + (isEquipped ? '#FFD700' : 'rgba(255,255,255,0.15)') + ';border-radius:14px;padding:12px 14px;margin-bottom:8px;">' +
        '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:22px;">' + gear.emoji + '</span>' +
        '<div><div style="font-size:13px;font-weight:900;color:#fff;">' + item.name + '</div>' +
        '<div style="font-size:11px;color:#FFD700;margin-top:2px;">' + effectText + '</div></div></div>' +
        '<button onclick="equipSpecialGear(\'' + gear.name + '\')" style="flex-shrink:0;padding:7px 12px;background:' + (isEquipped ? '#FFD700' : '#C084FC') + ';border:none;border-radius:10px;color:' + (isEquipped ? '#1a1a2e' : '#fff') + ';font-size:11px;font-weight:900;cursor:pointer;">' + (isEquipped ? '장착중' : '장착') + '</button>' +
        '</div>';
    }).join('');
  }

  popup.innerHTML = '<div style="width:100%;max-width:360px;max-height:80vh;overflow-y:auto;background:#1a1a2e;border-radius:18px;padding:18px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
    '<div style="font-size:15px;font-weight:900;color:#fff;">🎽 장비 장착</div>' +
    '<button onclick="document.getElementById(\'gear-equip-popup\').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:#fff;padding:6px 12px;cursor:pointer;">닫기</button></div>' +
    (equipped ? '<button onclick="equipSpecialGear(null)" style="width:100%;padding:9px;margin-bottom:10px;background:rgba(255,255,255,0.08);border:none;border-radius:10px;color:#aaa;font-size:12px;cursor:pointer;">장비 해제</button>' : '') +
    listHtml +
    '</div>';
  document.body.appendChild(popup);
}

function equipSpecialGear(gearName) {
  if (gearName) localStorage.setItem('ph_equippedGear', gearName);
  else localStorage.removeItem('ph_equippedGear');
  openGearEquipScreen();
}
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
      '</div>' +
      '<button onclick="openGearEquipScreen()" style="width:100%;margin-top:14px;padding:10px;background:rgba(255,215,0,0.12);border:1.5px solid #FFD700;border-radius:12px;color:#FFD700;font-size:12px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🎽 장비 장착 (' + (getEquippedGear() ? getEquippedGear().emoji + ' ' + getEquippedGear().name : '없음') + ')</button>';
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

  // 5% 확률로 레어 변종 등장 (+장비 보너스)
  const variantChance = 0.05 + (getGearBonus('variant') / 100);
  const isVariant = Math.random() < variantChance && RARE_VARIANTS[baseCreature.id];
  const creature = isVariant ?
    Object.assign({}, baseCreature, { isVariant: true, variantName: RARE_VARIANTS[baseCreature.id].name, variantImg: RARE_VARIANTS[baseCreature.id].img }) :
    Object.assign({}, baseCreature, { isVariant: false });

  specialExploreState.creature = creature;
  specialExploreState.foodChosen = null;
  specialExploreState.feedRound = 1;
  specialExploreState.chance = null;
  specialExploreState.retryUsed = false;
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
    '<div style="font-size:11px;color:#888;margin-bottom:18px;">' + (alreadyCaptured ? '(도감에 등록된 생물이에요)' : '(아직 도감에 없는 생물이에요!)') + (creature.isVariant ? '<br>먹이를 준 다음 포획망으로 마무리하세요!' : '') + '</div>' +
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

  specialExploreState.chance = 0.5 + (correct ? 0.3 : -0.2);

  const displayName = creature.isVariant ? creature.variantName : creature.name;
  const displayImgHtml = creature.isVariant ? variantImgHtml(creature, 100) : creatureImgHtml(creature, 100);
  const area = document.getElementById('special-main-area');
  area.innerHTML =
    '<div style="margin-bottom:10px;">' + displayImgHtml + '</div>' +
    '<div style="font-size:14px;color:' + (correct ? '#4ade80' : '#ff8a8a') + ';font-weight:900;margin-bottom:16px;">' + (correct ? (displayName + '이(가) 좋아하는 먹이였어요!') : (displayName + '이(가) 별로 안 좋아하는 먹이였어요...')) + '</div>' +
    '<div style="font-size:13px;color:#aaa;">관찰하는 중...</div>';

  setTimeout(function() {
    if (creature.isVariant) {
      renderCaptureToolScreen();
    } else {
      finalizeSpecialCapture();
    }
  }, 1400);
}

function getCaptureToolQty() {
  if (typeof bagItems === 'undefined') return 0;
  const item = bagItems.find(function(i) { return i.name === CAPTURE_TOOL_NAME && i.type === 'tool'; });
  return item ? item.qty : 0;
}

function renderCaptureToolScreen() {
  const creature = specialExploreState.creature;
  const area = document.getElementById('special-main-area');
  const qty = getCaptureToolQty();
  area.innerHTML =
    '<div style="font-size:13px;font-weight:900;color:#FFD700;margin-bottom:6px;">🥅 이제 포획도구로 마무리하세요!</div>' +
    '<div style="margin-bottom:8px;">' + variantImgHtml(creature, 100) + '</div>' +
    '<div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:18px;">' + creature.variantName + '</div>' +
    '<button onclick="' + (qty > 0 ? 'useCaptureTool()' : '') + '" style="padding:13px 28px;margin-bottom:10px;background:' + (qty > 0 ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,0.08)') + ';border:none;border-radius:14px;color:' + (qty > 0 ? '#fff' : '#666') + ';font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🥅 포획망 사용하기 (보유 ' + qty + '개)</button><br>' +
    '<button onclick="openToolShop()" style="padding:8px 16px;background:rgba(255,215,0,0.15);border:1.5px solid #FFD700;border-radius:12px;color:#FFD700;font-size:12px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">🛒 포획망 구매하기</button>';
}

function openToolShop() {
  const old = document.getElementById('tool-shop-popup');
  if (old) old.remove();
  const popup = document.createElement('div');
  popup.id = 'tool-shop-popup';
  popup.style.cssText = 'position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:20px;';
  popup.onclick = function(e) { if (e.target === popup) popup.remove(); };
  popup.innerHTML = '<div style="width:100%;max-width:300px;background:#fff;border-radius:18px;padding:20px;text-align:center;">' +
    '<div style="font-size:30px;margin-bottom:6px;">🥅</div>' +
    '<div style="font-size:14px;font-weight:900;color:#222;margin-bottom:4px;">포획망</div>' +
    '<div style="font-size:11px;color:#888;margin-bottom:4px;">보유: ' + getCaptureToolQty() + '개</div>' +
    '<div style="font-size:11px;color:#888;margin-bottom:14px;">보유 코인: 🍔 ' + (typeof coins !== 'undefined' ? coins : 0) + '</div>' +
    '<button onclick="buyCaptureTool()" style="width:100%;padding:11px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;margin-bottom:8px;">🍔' + CAPTURE_TOOL_PRICE + ' 구매</button>' +
    '<button onclick="document.getElementById(\'tool-shop-popup\').remove()" style="width:100%;padding:9px;background:#f3f3f3;border:none;border-radius:10px;color:#666;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">닫기</button>' +
    '</div>';
  document.body.appendChild(popup);
}

function buyCaptureTool() {
  if (typeof coins === 'undefined' || coins < CAPTURE_TOOL_PRICE) {
    if (typeof showBagToast === 'function') showBagToast('코인이 부족해요!');
    return;
  }
  coins -= CAPTURE_TOOL_PRICE;
  if (typeof addToBag === 'function') addToBag('🥅', CAPTURE_TOOL_NAME, 'tool', 1, '레어 변종 포획 마무리용');
  if (typeof saveAll === 'function') saveAll();
  if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
  openToolShop();
  renderCaptureToolScreen();
}

function useCaptureTool() {
  if (getCaptureToolQty() <= 0) return;
  if (typeof useFromBag === 'function') useFromBag(CAPTURE_TOOL_NAME, 1);
  specialExploreState.chance = (specialExploreState.chance || 0.5) + 0.25;
  const creature = specialExploreState.creature;
  const area = document.getElementById('special-main-area');
  area.innerHTML =
    '<div style="margin-bottom:10px;">' + variantImgHtml(creature, 100) + '</div>' +
    '<div style="font-size:13px;color:#aaa;">포획망을 던졌어요...</div>';
  setTimeout(function() { finalizeSpecialCapture(); }, 1400);
}

function retrySpecialCapture() {
  specialExploreState.retryUsed = true;
  finalizeSpecialCapture();
}

function finalizeSpecialCapture() {
  let chance = specialExploreState.chance != null ? specialExploreState.chance : 0.5;
  chance += getGearBonus('flee') / 100;
  chance += getGearBonus('chance') / 100;
  chance = Math.max(0.05, Math.min(0.97, chance));
  const success = Math.random() < chance;
  resolveSpecialCapture(success);
}

function resolveSpecialCapture(success) {
  const creature = specialExploreState.creature;
  const area = document.getElementById('special-main-area');
  const displayName = creature.isVariant ? creature.variantName : creature.name;
  const displayImgHtml = creature.isVariant ? variantImgHtml(creature, 100) : creatureImgHtml(creature, 100);

  if (!success) {
    const canRetry = hasRetryGear() && !specialExploreState.retryUsed;
    area.innerHTML =
      '<div style="margin-bottom:10px;opacity:0.5;">' + displayImgHtml + '<span style="font-size:30px;">💨</span></div>' +
      '<div style="font-size:15px;color:#ff8a8a;font-weight:900;margin-bottom:18px;">' + displayName + '이(가) 도망가려고 해요!' + (canRetry ? '' : '') + '</div>' +
      (canRetry ?
        '<div style="font-size:11px;color:#FFD700;margin-bottom:10px;">💎 수정 왕관 배지 효과로 한번 더 도전할 수 있어요!</div>' +
        '<button onclick="retrySpecialCapture()" style="padding:13px 28px;margin-bottom:8px;background:linear-gradient(135deg,#FFD700,#F59E0B);border:none;border-radius:14px;color:#1a1a2e;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">다시 도전하기</button><br>'
        : '') +
      '<button onclick="renderSpecialExploreScreen()" style="padding:13px 28px;background:rgba(255,255,255,0.1);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">' + (canRetry ? '포기하고 다시 둘러보기' : '다시 둘러보기') + '</button>';
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

  const rewardItems = [];
  rewardItems.push({ icon:'⭐', text: CHARS[charId].name + ' +' + expGain + ' EXP', color:'#FFD700' });
  if (gotJaptem) rewardItems.push({ icon: japtemItem.emoji, text: japtemItem.name + ' x1', color:'#fff' });
  if (gotGear) rewardItems.push({ icon:'✨', text: '[' + SPECIAL_GEAR_GRADES[gearGrade] + '] ' + gearItem.name, color:'#C084FC' });
  if (gotTicket) rewardItems.push({ icon:'🎫', text: '등교권 +1', color:'#60A5FA' });
  if (gotTicketFragment) rewardItems.push({ icon:'🎫', text: '등교권 조각 +1', color:'#60A5FA' });

  if (!document.getElementById('special-reward-style')) {
    const st = document.createElement('style');
    st.id = 'special-reward-style';
    st.textContent = '@keyframes specialRewardPop { 0%{opacity:0;transform:translateY(14px) scale(0.7);} 60%{opacity:1;transform:translateY(-3px) scale(1.05);} 100%{opacity:1;transform:translateY(0) scale(1);} }';
    document.head.appendChild(st);
  }

  const dropHtml = '<div style="display:flex;flex-direction:column;gap:7px;align-items:center;margin-bottom:6px;">' +
    rewardItems.map(function(r, idx) {
      return '<div style="opacity:0;animation:specialRewardPop 0.45s ease-out forwards;animation-delay:' + (idx * 0.22) + 's;display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,0.1);border:1.5px solid ' + r.color + ';border-radius:999px;padding:8px 16px;font-size:13px;font-weight:900;color:#fff;box-shadow:0 4px 10px rgba(0,0,0,0.3);">' +
        '<span style="font-size:16px;">' + r.icon + '</span>' + r.text +
        '</div>';
    }).join('') +
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
