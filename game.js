// ════════════════════════════════
// ⚙️ 가격 설정
// ════════════════════════════════
const CONFIG = {
  roomPrice: { pink: 15000, plant: 22000, doll: 35000 },
  alba: { burger: 17, cafeHigh: 30, cafeMid: 20, cafeLow: 10 },
  gacha: { one: 180, three: 540 },
};

// ── 저장 데이터 ──
let coins = parseInt(localStorage.getItem('ph_coins') || '0');
let owned = JSON.parse(localStorage.getItem('ph_owned') || '[]');
let albaDone = parseInt(localStorage.getItem('ph_alba') || '0');
let affection = JSON.parse(localStorage.getItem('ph_affection') || '{}');
let storyRead = JSON.parse(localStorage.getItem('ph_story') || '{}');
let inventory = JSON.parse(localStorage.getItem('ph_inventory') || '{}');
let hints = JSON.parse(localStorage.getItem('ph_hints') || '[]');
let ownedRooms = JSON.parse(localStorage.getItem('ph_ownedRooms') || '[]');
let currentRoom = localStorage.getItem('ph_currentRoom') || 'basic';
let stamina = parseInt(localStorage.getItem('ph_stamina') || '100');
const STAMINA_MAX = 100;
const STAMINA_REGEN_MS = 4 * 60 * 1000; // 4분마다 +1
let lastStaminaRegen = parseInt(localStorage.getItem('ph_lastStaminaRegen') || Date.now().toString());
let wishFragments = parseInt(localStorage.getItem('ph_wish') || '0');
let cardCounts = JSON.parse(localStorage.getItem('ph_cardCounts') || '{}');
let learnedSkills = JSON.parse(localStorage.getItem('ph_learnedSkills') || '[]');

// ════════════════════════════════
// 🎒 가방 시스템
// ════════════════════════════════
let bagSlots = parseInt(localStorage.getItem('ph_bagSlots') || '20');
let bagExpandCount = parseInt(localStorage.getItem('ph_bagExpandCount') || '0');
let bagItems = JSON.parse(localStorage.getItem('ph_bagItems') || '[]');

// 기존 저장 데이터 보정: 예전에는 카드 중복 수를 저장하지 않았기 때문에,
// 이미 보유한 카드는 최소 1장으로 계산해둔다.
function migrateCardCounts() {
  let changed = false;
  owned.forEach(cardId => {
    if (!cardCounts[cardId]) { cardCounts[cardId] = 1; changed = true; }
  });
  if (changed) localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts));
}
migrateCardCounts();

function getBagExpandCost() {
  return 500 + bagExpandCount * 200;
}

function saveBag() {
  localStorage.setItem('ph_bagSlots', bagSlots);
  localStorage.setItem('ph_bagExpandCount', bagExpandCount);
  localStorage.setItem('ph_bagItems', JSON.stringify(bagItems));
}

function addToBag(emoji, name, type, qty, desc, affExp) {
  qty = qty || 1;
  const existing = bagItems.find(i => i.name === name);
  if (existing) { existing.qty += qty; saveBag(); return true; }
  if (bagItems.length >= bagSlots) {
    showBagToast('가방이 꽉 찼어요! 🎒 슬롯을 확장해주세요');
    return false;
  }
  bagItems.push({ name, emoji, type: type || 'item', qty, desc: desc || '', affExp: affExp || 1 });
  saveBag();
  return true;
}

function useFromBag(name, qty) {
  qty = qty || 1;
  const idx = bagItems.findIndex(i => i.name === name);
  if (idx === -1) return false;
  bagItems[idx].qty -= qty;
  if (bagItems[idx].qty <= 0) bagItems.splice(idx, 1);
  saveBag();
  return true;
}

function expandBag() {
  const cost = getBagExpandCost();
  if (coins < cost) { showBagToast(`코인이 부족해요! 🍔 ${cost}코인 필요`); return; }
  coins -= cost;
  bagSlots += 3;
  bagExpandCount++;
  saveAll(); saveBag();
  renderBag();
  showBagToast(`슬롯 +3 확장 완료! (다음 확장: 🍔 ${getBagExpandCost()}코인)`);
}

function renderBag() {
  const grid = document.getElementById('bag-grid');
  const slotInfo = document.getElementById('bag-slot-info');
  const coinEl = document.getElementById('coin-bag');
  const expandBtn = document.getElementById('bag-expand-btn');
  if (!grid) return;
  if (slotInfo) slotInfo.textContent = `${bagItems.length} / ${bagSlots}칸 사용 중`;
  if (coinEl) coinEl.textContent = coins;
  if (expandBtn) expandBtn.textContent = `🎒 슬롯 확장 (+3칸) · 🍔 ${getBagExpandCost()}코인`;
  let html = '';
  for (let i = 0; i < bagSlots; i++) {
    if (i < bagItems.length) {
      const item = bagItems[i];
      const shortName = item.name.replace(/[\u{1F300}-\u{1FFFF}]/gu,'').trim().slice(0,5);
      const isEquippedCloth = item.type === 'cloth' && equippedCloth && ((typeof equippedCloth === 'object' && equippedCloth.name === item.name) || equippedCloth === item.clothId);
      const itemVisual = item.img ? `<img src="${item.img}" style="width:42px;height:54px;object-fit:contain;border-radius:6px;background:#fff;" onerror="this.style.display='none'">` : `<div class="bag-item-emoji">${item.emoji}</div>`;
      html += `<div class="bag-slot has-item" onclick="showBagItemDetail(${i})">${isEquippedCloth ? '<div style="position:absolute;top:3px;left:3px;background:#111;color:#fff;border-radius:6px;padding:1px 4px;font-size:8px;font-weight:900;">착용중</div>' : ''}${itemVisual}<div class="bag-item-qty">x${item.qty}</div><div class="bag-item-name">${shortName}</div></div>`;
    } else {
      html += `<div class="bag-slot empty"><div style="font-size:18px;opacity:0.12;">📦</div></div>`;
    }
  }
  grid.innerHTML = html;
}

function showBagItemDetail(idx) {
  const item = bagItems[idx];
  if (!item) return;
  const old = document.getElementById('bag-detail-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'bag-detail-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;';
  const isGift = item.type === 'gift';
  const isCrystal = item.type === 'crystal';
  const isDrink = item.type === 'drink';
  const isCloth = item.type === 'cloth';
  let actionBtn = '';
  if (isGift) actionBtn = `<button onclick="openGiftFromBag('${item.name}');document.getElementById('bag-detail-overlay').remove();" style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">💝 캐릭터에게 선물하기</button>`;
  if (isCrystal) actionBtn = `<button onclick="document.getElementById('bag-detail-overlay').remove();showWishCrystalUse();" style="width:100%;padding:12px;background:linear-gradient(135deg,#FFD700,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">💎 소원 빌기</button>`;
  if (isDrink) actionBtn = `<button onclick="useDrinkFromBag(${idx});document.getElementById('bag-detail-overlay').remove();" style="width:100%;padding:12px;background:linear-gradient(135deg,#60a5fa,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">🥤 사용하기</button>`;
  if (isCloth) {
    const cloth = (typeof CLOTH_ITEMS !== 'undefined') ? CLOTH_ITEMS.find(c => c.id === item.clothId || c.name === item.name || c.name === item.name.replace(/^✨\s*/, '')) : null;
    if (cloth) actionBtn = `<button onclick="document.getElementById('bag-detail-overlay').remove();openClothDetail('${cloth.id}', ${JSON.stringify(item.name)});" style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">👗 착용/정보 보기</button>`;
  }
  overlay.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:20px;padding:28px 24px;text-align:center;width:85%;max-width:300px;"><div style="font-size:52px;margin-bottom:8px;">${item.emoji}</div><div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:4px;">${item.name}</div><div style="font-size:12px;color:#aaa;margin-bottom:4px;">${item.desc}</div><div style="font-size:14px;color:#FFD700;font-weight:700;margin-bottom:20px;">보유: ${item.qty}개</div>${actionBtn}<button onclick="document.getElementById('bag-detail-overlay').remove()" style="width:100%;padding:11px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">닫기</button></div>`;
  document.body.appendChild(overlay);
}

function useDrinkFromBag(idx) {
  const item = bagItems[idx];
  if (!item) return;
  const staminaMap = { '사과주스': 10, '딸기스무디': 20, '에너지드링크': 30 };
  const up = staminaMap[item.name] || 10;
  useFromBag(item.name, 1);
  stamina = Math.min(STAMINA_MAX, stamina + up);
  saveStamina();
  saveAll();
  renderBag();
  showBagToast(`${item.emoji} ${item.name} 사용! ⚡ 스태미나 +${up}`);
}

function openGiftFromBag(itemName) {
  goTo('bond');
  showBagToast(`${itemName} 들고 인연 탭으로 이동! 💝`);
}

function showBagToast(msg) {
  const old = document.getElementById('bag-toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'bag-toast';
  el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(26,26,46,0.96);border:1.5px solid #FF6B9D;color:#fff;padding:10px 22px;border-radius:20px;font-size:13px;font-weight:700;z-index:800;white-space:nowrap;max-width:90vw;text-align:center;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}


// ── 스태미나 자연 회복 ──
function processStaminaRegen() {
  const now = Date.now();
  if (stamina >= STAMINA_MAX) {
    stamina = STAMINA_MAX;
    lastStaminaRegen = now;
    localStorage.setItem('ph_stamina', stamina);
    localStorage.setItem('ph_lastStaminaRegen', lastStaminaRegen);
    return;
  }
  const elapsed = now - lastStaminaRegen;
  const gained = Math.floor(elapsed / STAMINA_REGEN_MS);
  if (gained > 0) {
    stamina = Math.min(STAMINA_MAX, stamina + gained);
    lastStaminaRegen += gained * STAMINA_REGEN_MS;
    if (stamina >= STAMINA_MAX) lastStaminaRegen = now;
    localStorage.setItem('ph_stamina', stamina);
    localStorage.setItem('ph_lastStaminaRegen', lastStaminaRegen);
  }
}

function formatStaminaTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const sec = (total % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function updateStaminaDisplay() {
  processStaminaRegen();
  let el = document.getElementById('stamina-floating');
  if (!el && document.body) {
    el = document.createElement('div');
    el.id = 'stamina-floating';
    el.style.cssText = 'position:fixed;right:10px;bottom:104px;z-index:120;background:rgba(255,255,255,0.92);border:1.5px solid #111;color:#111;border-radius:16px;padding:6px 10px;font-size:11px;font-weight:900;box-shadow:0 2px 10px #0002;line-height:1.35;text-align:right;';
    document.body.appendChild(el);
  }
  if (!el) return;
  const next = stamina >= STAMINA_MAX ? 'FULL' : formatStaminaTime(STAMINA_REGEN_MS - ((Date.now() - lastStaminaRegen) % STAMINA_REGEN_MS));
  el.innerHTML = `⚡ ${stamina}/${STAMINA_MAX}<br><span style="font-size:10px;color:#555;">다음 +1 ${next}</span>`;
}

function saveStamina() {
  stamina = Math.min(STAMINA_MAX, Math.max(0, stamina));
  localStorage.setItem('ph_stamina', stamina);
  updateStaminaDisplay();
}

const B = "https://raw.githubusercontent.com/chaei7775/Poca-house/main/";

const ROOM_THEMES = {
  pink:  { name: '💕 핑크덕질방',   price: CONFIG.roomPrice.pink,  img: B+'room_pink.png' },
  plant: { name: '🌿 식물힐링방',   price: CONFIG.roomPrice.plant, img: B+'room_plant.png' },
  doll:  { name: '🐻 인형컬렉터룸', price: CONFIG.roomPrice.doll,  img: B+'room_doll.png' },
};

// ── 캐릭터 데이터 ──
const CHARS = {
  minjun: { id:'minjun', name:'민준', emoji:'📚', gradeColor:'#F59E0B', img:B+'Minjun UR.png',
    homeLines:["모르는 건 부끄러운 게 아니야. 알려고 하지 않는 게 부끄러운 거지.","오늘도 알바 열심히 해. 난 여기서 기다릴게.","감기 걸리면 큰일이잖아. 우산은 같이 쓰면 되지."],
    stories:[{ep:1,title:"도서관의 밤",unlockAt:0,msgs:[{who:'minjun',text:"...여기서 뭐 해? 문 닫을 시간인데."},{who:'player',text:"책 찾다가 길을 잃었어요."},{who:'minjun',text:"길을 잃은 게 아니라, 아직 찾고 있는 거야. 도와줄까?"},{who:'player',text:"...네, 부탁드려도 될까요?"},{who:'minjun',text:"(책을 집어들며) 이걸 찾고 있었지? 생각보다 잘 아네."}]},{ep:2,title:"비 오는 귀갓길",unlockAt:1,msgs:[{who:'minjun',text:"...비 맞으면서 걸어가려고?"},{who:'player',text:"우산이 없어서요."},{who:'minjun',text:"(우산 내밀며) 가져가. 나는 괜찮아."},{who:'player',text:"같이 써요."},{who:'minjun',text:"...그래. (작게) 가까이 와."}]},{ep:3,title:"별의 기록",unlockAt:2,msgs:[{who:'minjun',text:"오늘 별자리 봤어?"},{who:'player',text:"못 봤어요. 바빴거든요."},{who:'minjun',text:"이 기록… 분명 우리가 잃어버린 진실의 조각이야."},{who:'player',text:"무서운 말이에요."},{who:'minjun',text:"(눈 마주치며) 괜찮아. 내가 옆에 있잖아."}]}]
  },
  sion: { id:'sion', name:'시온', emoji:'🎸', gradeColor:'#6366F1', img:B+'Sion UR.png',
    homeLines:["무대 위에선 누구의 것도 아냐. 오직 음악만 남아.","관객이 없어도 연주는 진심이어야 하거든.","폭풍이 몰아쳐도, 나는 내 노래를 멈추지 않아."],
    stories:[{ep:1,title:"야간 리허설",unlockAt:0,msgs:[{who:'sion',text:"...뭐야. 아직도 있어?"},{who:'player',text:"연주 소리가 좋아서요."},{who:'sion',text:"관중 없는 데서 들어도 좋냐고."},{who:'player',text:"네. 진심이 느껴졌어요."},{who:'sion',text:"...(기타 줄 튕기며) 한 곡만 더 들을래?"}]},{ep:2,title:"폭풍 속 무대",unlockAt:1,msgs:[{who:'sion',text:"비 맞으면서 공연 보러 왔어?"},{who:'player',text:"시온씨 공연이니까요."},{who:'sion',text:"...바보같은 거 알아?"},{who:'player',text:"알아요."},{who:'sion',text:"(낮게) 고마워. 이 한 마디는 너한테만 해."}]},{ep:3,title:"무대 뒤 적막",unlockAt:2,msgs:[{who:'sion',text:"기대하지 마. 난 사람 실망시키는 데 특기 있어."},{who:'player',text:"그래도 괜찮아요."},{who:'sion',text:"...왜?"},{who:'player',text:"지금 이 순간만으로 충분하니까요."},{who:'sion',text:"(오래 침묵하다) ...넌 이상한 애야."}]}]
  },
  doyun: { id:'doyun', name:'도윤', emoji:'👑', gradeColor:'#374151', img:B+'Doyun UR.png',
    homeLines:["필요하면 불러. 나, 가는 편이거든.","규칙은 공정해야지. 그래야만 모두가 내 선택을 따르게 되니까.","넌, 내가 만든 가장 아름다운 예외야."],
    stories:[{ep:1,title:"학생회장의 제안",unlockAt:0,msgs:[{who:'doyun',text:"너 포카하우스 알바하지?"},{who:'player',text:"네, 맞아요."},{who:'doyun',text:"내가 규칙을 하나 정해줄게. 지각하지 마."},{who:'player',text:"...알겠어요."},{who:'doyun',text:"(작게 웃으며) 잘 따르네. 마음에 들어."}]},{ep:2,title:"가면무도회의 밤",unlockAt:1,msgs:[{who:'doyun',text:"왜 가면을 안 썼어?"},{who:'player',text:"숨기고 싶은 게 없어서요."},{who:'doyun',text:"...(가면 내리며) 그렇군. 나도 오늘만큼은 그러고 싶었어."},{who:'player',text:"예뻐요. 민얼굴이."},{who:'doyun',text:"(귀 붉혀지며) ...함부로 말하지 마."}]},{ep:3,title:"보이지 않는 실세",unlockAt:2,msgs:[{who:'doyun',text:"내가 왜 이렇게 움직이는지 알아?"},{who:'player',text:"모르겠어요."},{who:'doyun',text:"내 옆에 있는 사람을 지키기 위해서야."},{who:'player',text:"...저도요?"},{who:'doyun',text:"(눈 마주치며) 특히 너."}]}]
  },
  harin: { id:'harin', name:'하린', emoji:'🌙', gradeColor:'#7C3AED', img:B+'Harin UR.png',
    homeLines:["이 노래가 끝나면, 모든 게 사라져도 너만은 기억해줘.","이 밤이 끝나도, 내 노래는 너에게 닿을 거야.","이 노래가 너에게 닿을 수 있다면, 나는 언제든 노래할 수 있어."],
    stories:[{ep:1,title:"새벽역에서",unlockAt:0,msgs:[{who:'harin',text:"이 시간에 여기 왜 있어?"},{who:'player',text:"막차를 놓쳤어요."},{who:'harin',text:"나도. (옆에 앉으며) 같이 기다리자."},{who:'player',text:"노래 들었어요. 진짜 좋았어요."},{who:'harin',text:"...고마워. 처음으로 직접 들었네."}]},{ep:2,title:"달빛 보컬",unlockAt:1,msgs:[{who:'harin',text:"왜 항상 맨 앞에 있어?"},{who:'player',text:"목소리가 잘 들리니까요."},{who:'harin',text:"...아, 그렇구나. (낮게) 사실 너 보려고 이쪽 서게 됐어."},{who:'player',text:"...네?"},{who:'harin',text:"(웃으며) 다음 곡도 들어줘."}]},{ep:3,title:"마지막 무대",unlockAt:2,msgs:[{who:'harin',text:"오늘이 마지막 무대야."},{who:'player',text:"왜요?"},{who:'harin',text:"쉬어야 할 것 같아서. 근데 네가 있으면 계속할 수 있을 것 같아."},{who:'player',text:"계속 들을게요."},{who:'harin',text:"(손 잡으며) 고마워. 진짜로."}]}]
  },
  yuna: { id:'yuna', name:'윤아', emoji:'🌸', gradeColor:'#EC4899', img:B+'Yuna UR.png',
    homeLines:["오늘은 우리, 봄이랑 데이트하는 날이야!","오늘 너한테 제일 예쁜 꽃을 줄게. 받아줄 거지?","오늘, 나만 바라봐 줘. 그거면 충분해."],
    stories:[{ep:1,title:"꽃집 알바",unlockAt:0,msgs:[{who:'yuna',text:"어서 와! 뭐 찾아?"},{who:'player',text:"예쁜 꽃이요."},{who:'yuna',text:"(빙글 돌며) 그럼 나야! 아, 농담이고— 이건 어때?"},{who:'player',text:"예뻐요. 당신처럼."},{who:'yuna',text:"(발끈) 야! 갑자기 그런 말 하면 어떡해!"}]},{ep:2,title:"봄 축제",unlockAt:1,msgs:[{who:'yuna',text:"같이 축제 가자!"},{who:'player',text:"나랑요?"},{who:'yuna',text:"응! 혼자 가기 싫어. ...사실 너랑 가고 싶어서."},{who:'player',text:"좋아요."},{who:'yuna',text:"(팔 낚아채며) 그럼 빨리 가자!"}]},{ep:3,title:"나만 봐줘",unlockAt:2,msgs:[{who:'yuna',text:"오늘 나 예뻐?"},{who:'player',text:"항상 예뻐요."},{who:'yuna',text:"그런 말 쉽게 하지 마. 나 진심으로 받아들이거든."},{who:'player',text:"진심이에요."},{who:'yuna',text:"(조용히) ...나도야."}]}]
  },
  ara: { id:'ara', name:'아라', emoji:'🌹', gradeColor:'#9D174D', img:B+'Ara UR.png',
    homeLines:["오늘, 주인공은 나로 정해졌으니까.","비밀은 아름다울수록 오래가거든.","오늘 밤, 넌 내게서 벗어날 수 없어."],
    stories:[{ep:1,title:"무대의 여왕",unlockAt:0,msgs:[{who:'ara',text:"공연 어땠어?"},{who:'player',text:"완벽했어요."},{who:'ara',text:"당연하지. (턱 들며) 그래도 오늘 유독 잘됐어."},{who:'player',text:"왜요?"},{who:'ara',text:"...네가 있어서. 말 안 해도 느껴지거든."}]},{ep:2,title:"가면 뒤의 얼굴",unlockAt:1,msgs:[{who:'ara',text:"날 좋아해?"},{who:'player',text:"네."},{who:'ara',text:"흥. 다들 그렇게 말하지."},{who:'player',text:"저는 달라요."},{who:'ara',text:"(오래 바라보다) ...증명해 봐."}]},{ep:3,title:"치명적인 미소",unlockAt:2,msgs:[{who:'ara',text:"넌 이상해."},{who:'player',text:"왜요?"},{who:'ara',text:"내가 차갑게 굴어도 안 떠나잖아."},{who:'player',text:"떠날 이유가 없어요."},{who:'ara',text:"(낮게) ...오늘 밤은 가지 마."}]}]
  }
};

// ── 카드 데이터 ──
const CARDS = [
  {id:'minjun_ur', name:'민준 UR', grade:'UR', gradeColor:'#C084FC', img:B+'Minjun UR.png', autoCoins:20, charId:'minjun'},
  {id:'sion_ur',   name:'시온 UR', grade:'UR', gradeColor:'#6366F1', img:B+'Sion UR.png',   autoCoins:20, charId:'sion'},
  {id:'doyun_ur',  name:'도윤 UR', grade:'UR', gradeColor:'#9D6B2A', img:B+'Doyun UR.png',  autoCoins:20, charId:'doyun'},
  {id:'harin_ur',  name:'하린 UR', grade:'UR', gradeColor:'#7C3AED', img:B+'Harin UR.png',  autoCoins:20, charId:'harin'},
  {id:'yuna_ur',   name:'윤아 UR', grade:'UR', gradeColor:'#EC4899', img:B+'Yuna UR.png',   autoCoins:20, charId:'yuna'},
  {id:'ara_ur',    name:'아라 UR', grade:'UR', gradeColor:'#DC2626', img:B+'Ara UR.png',    autoCoins:20, charId:'ara'},
  {id:'minjun_ssr1', name:'민준 SSR1', grade:'SSR', gradeColor:'#F59E0B', img:B+'jun-ssr1.png', autoCoins:10, charId:'minjun'},
  {id:'minjun_ssr2', name:'민준 SSR2', grade:'SSR', gradeColor:'#F59E0B', img:B+'jun-ssr2.png', autoCoins:10, charId:'minjun'},
  {id:'sion_ssr1',   name:'시온 SSR1', grade:'SSR', gradeColor:'#6366F1', img:B+'sion-ssr1.png', autoCoins:10, charId:'sion'},
  {id:'sion_ssr2',   name:'시온 SSR2', grade:'SSR', gradeColor:'#6366F1', img:B+'sion-ssr2.png', autoCoins:10, charId:'sion'},
  {id:'doyun_ssr1',  name:'도윤 SSR1', grade:'SSR', gradeColor:'#374151', img:B+'doyun-ssr1.png', autoCoins:10, charId:'doyun'},
  {id:'doyun_ssr2',  name:'도윤 SSR2', grade:'SSR', gradeColor:'#374151', img:B+'doyun-ssr2.png', autoCoins:10, charId:'doyun'},
  {id:'harin_ssr1',  name:'하린 SSR1', grade:'SSR', gradeColor:'#7C3AED', img:B+'harin-ssr1.png', autoCoins:10, charId:'harin'},
  {id:'harin_ssr2',  name:'하린 SSR2', grade:'SSR', gradeColor:'#7C3AED', img:B+'harin-ssr2.png', autoCoins:10, charId:'harin'},
  {id:'yuna_ssr1',   name:'윤아 SSR1', grade:'SSR', gradeColor:'#EC4899', img:B+'yuna-ssr1.png', autoCoins:10, charId:'yuna'},
  {id:'yuna_ssr2',   name:'윤아 SSR2', grade:'SSR', gradeColor:'#EC4899', img:B+'yuna-ssr2.png', autoCoins:10, charId:'yuna'},
  {id:'ara_ssr1',    name:'아라 SSR1', grade:'SSR', gradeColor:'#9D174D', img:B+'ara-ssr1.png', autoCoins:10, charId:'ara'},
  {id:'ara_ssr2',    name:'아라 SSR2', grade:'SSR', gradeColor:'#9D174D', img:B+'ara-ssr2.png', autoCoins:10, charId:'ara'},
  {id:'minjun_sr1', name:'민준 SR1', grade:'SR', gradeColor:'#F59E0B', img:B+'jun-sr1.png', autoCoins:5, charId:'minjun'},
  {id:'minjun_sr2', name:'민준 SR2', grade:'SR', gradeColor:'#F59E0B', img:B+'jun-sr2.png', autoCoins:5, charId:'minjun'},
  {id:'sion_sr1',   name:'시온 SR1', grade:'SR', gradeColor:'#6366F1', img:B+'sion-sr1.png', autoCoins:5, charId:'sion'},
  {id:'sion_sr2',   name:'시온 SR2', grade:'SR', gradeColor:'#6366F1', img:B+'sion-sr2.png', autoCoins:5, charId:'sion'},
  {id:'doyun_sr1',  name:'도윤 SR1', grade:'SR', gradeColor:'#374151', img:B+'doyun-sr1.png', autoCoins:5, charId:'doyun'},
  {id:'doyun_sr2',  name:'도윤 SR2', grade:'SR', gradeColor:'#374151', img:B+'doyun-sr2.png', autoCoins:5, charId:'doyun'},
  {id:'harin_sr1',  name:'하린 SR1', grade:'SR', gradeColor:'#7C3AED', img:B+'harin-sr1.png', autoCoins:5, charId:'harin'},
  {id:'harin_sr2',  name:'하린 SR2', grade:'SR', gradeColor:'#7C3AED', img:B+'harin-sr2.png', autoCoins:5, charId:'harin'},
  {id:'yuna_sr1',   name:'윤아 SR1', grade:'SR', gradeColor:'#EC4899', img:B+'yuna-sr1.png', autoCoins:5, charId:'yuna'},
  {id:'yuna_sr2',   name:'윤아 SR2', grade:'SR', gradeColor:'#EC4899', img:B+'yuna-sr2.png', autoCoins:5, charId:'yuna'},
  {id:'ara_sr1',    name:'아라 SR1', grade:'SR', gradeColor:'#9D174D', img:B+'ara-sr1.png', autoCoins:5, charId:'ara'},
  {id:'ara_sr2',    name:'아라 SR2', grade:'SR', gradeColor:'#9D174D', img:B+'ara-sr2.png', autoCoins:5, charId:'ara'},
  {id:'minjun_r1', name:'민준 R1', grade:'R', gradeColor:'#22c55e', img:B+'jun-r1.png', autoCoins:3, charId:'minjun'},
  {id:'minjun_r2', name:'민준 R2', grade:'R', gradeColor:'#22c55e', img:B+'jun-r2.png', autoCoins:3, charId:'minjun'},
  {id:'minjun_r3', name:'민준 R3', grade:'R', gradeColor:'#22c55e', img:B+'jun-r3.png', autoCoins:3, charId:'minjun'},
  {id:'sion_r1',   name:'시온 R1', grade:'R', gradeColor:'#22c55e', img:B+'sion-r1.png', autoCoins:3, charId:'sion'},
  {id:'sion_r2',   name:'시온 R2', grade:'R', gradeColor:'#22c55e', img:B+'sion-r2.png', autoCoins:3, charId:'sion'},
  {id:'sion_r3',   name:'시온 R3', grade:'R', gradeColor:'#22c55e', img:B+'sion-r3.png', autoCoins:3, charId:'sion'},
  {id:'doyun_r1',  name:'도윤 R1', grade:'R', gradeColor:'#22c55e', img:B+'doyun-r1.png', autoCoins:3, charId:'doyun'},
  {id:'doyun_r2',  name:'도윤 R2', grade:'R', gradeColor:'#22c55e', img:B+'doyun-r2.png', autoCoins:3, charId:'doyun'},
  {id:'doyun_r3',  name:'도윤 R3', grade:'R', gradeColor:'#22c55e', img:B+'doyun-r3.png', autoCoins:3, charId:'doyun'},
  {id:'harin_r1',  name:'하린 R1', grade:'R', gradeColor:'#22c55e', img:B+'harin-r1.png', autoCoins:3, charId:'harin'},
  {id:'harin_r2',  name:'하린 R2', grade:'R', gradeColor:'#22c55e', img:B+'harin-r2.png', autoCoins:3, charId:'harin'},
  {id:'harin_r3',  name:'하린 R3', grade:'R', gradeColor:'#22c55e', img:B+'harin-r3.png', autoCoins:3, charId:'harin'},
  {id:'yuna_r1',   name:'윤아 R1', grade:'R', gradeColor:'#22c55e', img:B+'yuna-r1.png', autoCoins:3, charId:'yuna'},
  {id:'yuna_r2',   name:'윤아 R2', grade:'R', gradeColor:'#22c55e', img:B+'yuna-r2.png', autoCoins:3, charId:'yuna'},
  {id:'yuna_r3',   name:'윤아 R3', grade:'R', gradeColor:'#22c55e', img:B+'yuna-r3.png', autoCoins:3, charId:'yuna'},
  {id:'ara_r1',    name:'아라 R1', grade:'R', gradeColor:'#22c55e', img:B+'ara-r1.png', autoCoins:3, charId:'ara'},
  {id:'ara_r2',    name:'아라 R2', grade:'R', gradeColor:'#22c55e', img:B+'ara-r2.png', autoCoins:3, charId:'ara'},
  {id:'ara_r3',    name:'아라 R3', grade:'R', gradeColor:'#22c55e', img:B+'ara-r3.png', autoCoins:3, charId:'ara'},
  {id:'minjun_n',  name:'민준 N',  grade:'N', gradeColor:'#9ca3af', img:B+'jun-n.png',  autoCoins:1, charId:'minjun'},
  {id:'minjun_n1', name:'민준 N1', grade:'N', gradeColor:'#9ca3af', img:B+'jun-n1.png', autoCoins:1, charId:'minjun'},
  {id:'minjun_n2', name:'민준 N2', grade:'N', gradeColor:'#9ca3af', img:B+'jun-n2.png', autoCoins:1, charId:'minjun'},
  {id:'minjun_n3', name:'민준 N3', grade:'N', gradeColor:'#9ca3af', img:B+'jun-n3.png', autoCoins:1, charId:'minjun'},
  {id:'minjun_n4', name:'민준 N4', grade:'N', gradeColor:'#9ca3af', img:B+'jun-n4.png', autoCoins:1, charId:'minjun'},
  {id:'sion_n',    name:'시온 N',  grade:'N', gradeColor:'#9ca3af', img:B+'sion-n.png',  autoCoins:1, charId:'sion'},
  {id:'sion_n1',   name:'시온 N1', grade:'N', gradeColor:'#9ca3af', img:B+'sion-n1.png', autoCoins:1, charId:'sion'},
  {id:'sion_n2',   name:'시온 N2', grade:'N', gradeColor:'#9ca3af', img:B+'sion-n2.png', autoCoins:1, charId:'sion'},
  {id:'sion_n3',   name:'시온 N3', grade:'N', gradeColor:'#9ca3af', img:B+'sion-n3.png', autoCoins:1, charId:'sion'},
  {id:'sion_n4',   name:'시온 N4', grade:'N', gradeColor:'#9ca3af', img:B+'sion-n4.png', autoCoins:1, charId:'sion'},
  {id:'doyun_n',   name:'도윤 N',  grade:'N', gradeColor:'#9ca3af', img:B+'doyun-n.png',  autoCoins:1, charId:'doyun'},
  {id:'doyun_n1',  name:'도윤 N1', grade:'N', gradeColor:'#9ca3af', img:B+'doyun-n1.png', autoCoins:1, charId:'doyun'},
  {id:'doyun_n2',  name:'도윤 N2', grade:'N', gradeColor:'#9ca3af', img:B+'doyun-n2.png', autoCoins:1, charId:'doyun'},
  {id:'doyun_n3',  name:'도윤 N3', grade:'N', gradeColor:'#9ca3af', img:B+'doyun-n3.png', autoCoins:1, charId:'doyun'},
  {id:'doyun_n4',  name:'도윤 N4', grade:'N', gradeColor:'#9ca3af', img:B+'doyun-n4.png', autoCoins:1, charId:'doyun'},
  {id:'harin_n',   name:'하린 N',  grade:'N', gradeColor:'#9ca3af', img:B+'harin-n.png',  autoCoins:1, charId:'harin'},
  {id:'harin_n1',  name:'하린 N1', grade:'N', gradeColor:'#9ca3af', img:B+'harin-n1.png', autoCoins:1, charId:'harin'},
  {id:'harin_n2',  name:'하린 N2', grade:'N', gradeColor:'#9ca3af', img:B+'harin-n2.png', autoCoins:1, charId:'harin'},
  {id:'harin_n3',  name:'하린 N3', grade:'N', gradeColor:'#9ca3af', img:B+'harin-n3.png', autoCoins:1, charId:'harin'},
  {id:'harin_n4',  name:'하린 N4', grade:'N', gradeColor:'#9ca3af', img:B+'harin-n4.png', autoCoins:1, charId:'harin'},
  {id:'yuna_n',    name:'윤아 N',  grade:'N', gradeColor:'#9ca3af', img:B+'yuna-n.png',  autoCoins:1, charId:'yuna'},
  {id:'yuna_n1',   name:'윤아 N1', grade:'N', gradeColor:'#9ca3af', img:B+'yuna-n1.png', autoCoins:1, charId:'yuna'},
  {id:'yuna_n2',   name:'윤아 N2', grade:'N', gradeColor:'#9ca3af', img:B+'yuna-n2.png', autoCoins:1, charId:'yuna'},
  {id:'yuna_n3',   name:'윤아 N3', grade:'N', gradeColor:'#9ca3af', img:B+'yuna-n3.png', autoCoins:1, charId:'yuna'},
  {id:'yuna_n4',   name:'윤아 N4', grade:'N', gradeColor:'#9ca3af', img:B+'yuna-n4.png', autoCoins:1, charId:'yuna'},
  {id:'ara_n',     name:'아라 N',  grade:'N', gradeColor:'#9ca3af', img:B+'ara-n.png',  autoCoins:1, charId:'ara'},
  {id:'ara_n1',    name:'아라 N1', grade:'N', gradeColor:'#9ca3af', img:B+'ara-n1.png', autoCoins:1, charId:'ara'},
  {id:'ara_n2',    name:'아라 N2', grade:'N', gradeColor:'#9ca3af', img:B+'ara-n2.png', autoCoins:1, charId:'ara'},
  {id:'ara_n3',    name:'아라 N3', grade:'N', gradeColor:'#9ca3af', img:B+'ara-n3.png', autoCoins:1, charId:'ara'},
  {id:'ara_n4',    name:'아라 N4', grade:'N', gradeColor:'#9ca3af', img:B+'ara-n4.png', autoCoins:1, charId:'ara'},
];

// ── 가챠 확률 ──
function drawOne() {
  const rand = Math.random() * 100;
  let pool;
  // v0.2 밸런스: UR 1% → 0.8%
  if (rand < 0.8)     pool = CARDS.filter(c => c.grade === 'UR');
  else if (rand < 3)  pool = CARDS.filter(c => c.grade === 'SSR');
  else if (rand < 10) pool = CARDS.filter(c => c.grade === 'SR');
  else if (rand < 30) pool = CARDS.filter(c => c.grade === 'R');
  else                pool = CARDS.filter(c => c.grade === 'N');

  const card = pool[Math.floor(Math.random() * pool.length)];
  const beforeAffInfo = card.charId ? getAffectionInfo(card.charId) : null;

  // 중복 카드도 인연 경험치에 반영하기 위해 카드별 보유 수를 저장한다.
  cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;

  if (!owned.includes(card.id)) owned.push(card.id);

  saveAll();
  localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts));
  checkQuestProgress('first_gacha');
  if (owned.length >= 10) checkQuestProgress('cards_10');
  if (card.charId) checkAffectionLevelUp(card.charId, beforeAffInfo);
  return card;
}

function doDraw(count) {
  const cost = count === 1 ? CONFIG.gacha.one : CONFIG.gacha.three;
  if (coins < cost) { alert(`코인이 부족해요! 🍔 ${cost} 필요 (현재: ${coins})`); return; }
  coins -= cost; saveAll();
  const results = [];
  for (let i = 0; i < count; i++) results.push(drawOne());
  if (count === 1) {
    showGachaResult(results[0]);
  } else {
    showGachaResultMulti(results);
  }
}

function showGachaResultMulti(cards) {
  const old = document.getElementById('gacha-multi-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'gacha-multi-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(26,26,46,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;gap:14px;overflow-y:auto;';
  const cardsHtml = cards.map(card => `<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.06);border:1.5px solid ${card.gradeColor};border-radius:16px;padding:12px;width:100%;max-width:360px;"><img src="${card.img}" style="width:60px;height:80px;object-fit:cover;border-radius:8px;" onerror="this.style.display='none'"><div><div style="font-size:13px;font-weight:900;color:${card.gradeColor};">✨ ${card.grade}</div><div style="font-size:15px;font-weight:700;color:#fff;">${card.name}</div></div></div>`).join('');
  overlay.innerHTML = `<div style="font-size:22px;font-weight:900;color:#C084FC;font-family:'Nunito',sans-serif;margin-bottom:4px;">3뽑 결과! 💜</div><div style="width:100%;max-width:360px;display:flex;flex-direction:column;gap:10px;">${cardsHtml}</div><button onclick="document.getElementById('gacha-multi-overlay').remove();renderHomeIdols();renderHomeSpeech();" style="margin-top:8px;padding:14px 40px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:16px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">획득! 💜</button>`;
  document.body.appendChild(overlay);
}

function showGachaResult(card) {
  document.getElementById('gacha-res-grade').textContent = `✨ ${card.grade} ✨`;
  document.getElementById('gacha-res-grade').style.color = card.gradeColor;
  document.getElementById('gacha-res-name').textContent = card.name;
  const img = document.getElementById('gacha-res-img');
  if (card.img) { img.src = card.img; img.style.display = 'block'; } else { img.style.display = 'none'; }
  document.getElementById('gacha-overlay').classList.add('show');
}
function closeGachaResult() { document.getElementById('gacha-overlay').classList.remove('show'); renderHomeIdols(); renderHomeSpeech(); }

// ── 상점 ──
function openShop(tab) {
  closePlace();
  document.getElementById('shop-overlay').classList.add('show');
  switchShopTab(tab || 'gift');
  document.getElementById('shop-coin-display').textContent = coins;
  renderInventoryDisplay();
  renderRoomShop();
}
function closeShop() { document.getElementById('shop-overlay').classList.remove('show'); }
function closeShopOutside(e) { if (e.target === document.getElementById('shop-overlay')) closeShop(); }
function switchShopTab(tab) {
  document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.shop-section').forEach(s => s.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('section-' + tab).classList.add('active');
}
function getGiftAffExp(itemName) {
  if (itemName.includes('프리미엄')) return 5;
  if (itemName.includes('케이크') || itemName.includes('게임기')) return 2;
  return 1;
}
function buyGift(itemName, price) {
  if (coins < price) { alert(`코인이 부족해요! 🍔 ${price} 필요 (현재: ${coins})`); return; }
  coins -= price;
  if (!inventory[itemName]) inventory[itemName] = 0;
  inventory[itemName]++;
  const emoji = itemName.match(/[\u{1F300}-\u{1FFFF}]|[\u2600-\u26FF]/gu)?.[0] || '🎁';
  const cleanName = itemName.replace(/[\u{1F300}-\u{1FFFF}]|[\u2600-\u26FF]/gu,'').trim();
  const affExp = getGiftAffExp(itemName);
  addToBag(emoji, cleanName || itemName, 'gift', 1, `호감도 경험치 +${affExp} 선물 아이템`, affExp);
  saveAll();
  document.getElementById('shop-coin-display').textContent = coins;
  renderInventoryDisplay();
  spawnCoinFloat(-price);
  showShopToast(`${itemName} 구매 완료! 🎁`);
}
function buyDrink(itemName, price, staminaUp) {
  if (coins < price) { alert(`코인이 부족해요! 🍔 ${price} 필요 (현재: ${coins})`); return; }
  coins -= price;
  stamina = Math.min(STAMINA_MAX, stamina + staminaUp);
  saveStamina();
  saveAll();
  document.getElementById('shop-coin-display').textContent = coins;
  spawnCoinFloat(-price);
  showShopToast(`${itemName} 마심! ⚡ 스태미나 +${staminaUp}`);
}
function renderInventoryDisplay() {
  const el = document.getElementById('inventory-display');
  if (!el) return;
  const items = Object.entries(inventory).filter(([k, v]) => v > 0);
  if (items.length === 0) { el.textContent = '텅 비었어요...'; return; }
  el.innerHTML = items.map(([k, v]) => `${k} x${v}`).join(' &nbsp;|&nbsp; ');
}
function renderRoomShop() {
  ['pink', 'plant', 'doll'].forEach(id => {
    const theme = ROOM_THEMES[id];
    const isOwned = ownedRooms.includes(id);
    const isCurrent = currentRoom === id;
    const badgeEl = document.getElementById('badge-' + id);
    const btnsEl = document.getElementById('btns-' + id);
    const priceEl = document.getElementById('price-' + id);
    const cardEl = document.getElementById('roomcard-' + id);
    if (!cardEl) return;
    if (isCurrent) {
      cardEl.classList.add('current');
      if (badgeEl) badgeEl.innerHTML = '<div class="room-current-badge">현재 적용 중</div>';
      if (btnsEl) btnsEl.innerHTML = '<span style="font-size:12px;color:#4ade80;font-weight:700;">✓ 적용됨</span>';
      if (priceEl) priceEl.textContent = '';
    } else if (isOwned) {
      cardEl.classList.remove('current');
      if (badgeEl) badgeEl.innerHTML = '';
      if (priceEl) priceEl.textContent = '보유 중';
      if (btnsEl) btnsEl.innerHTML = `<button class="shop-btn shop-btn-apply" onclick="applyRoom('${id}')">적용</button>`;
    } else {
      cardEl.classList.remove('current');
      if (badgeEl) badgeEl.innerHTML = '';
      if (priceEl) priceEl.textContent = `🍔 ${theme.price.toLocaleString()}코인`;
      if (btnsEl) btnsEl.innerHTML = `<button class="shop-btn shop-btn-buy" onclick="buyRoom('${id}')">구매</button>`;
    }
  });
}
function buyRoom(id) {
  const theme = ROOM_THEMES[id];
  if (coins < theme.price) { alert(`코인이 부족해요! 🍔 ${theme.price.toLocaleString()} 필요`); return; }
  if (ownedRooms.includes(id)) { showShopToast('이미 보유 중이에요!'); return; }
  coins -= theme.price;
  ownedRooms.push(id);
  localStorage.setItem('ph_ownedRooms', JSON.stringify(ownedRooms));
  saveAll();
  document.getElementById('shop-coin-display').textContent = coins;
  renderRoomShop();
  showShopToast(`${theme.name} 구매 완료! 🏠`);
}
function applyRoom(id) {
  const theme = ROOM_THEMES[id];
  if (!ownedRooms.includes(id)) { alert('먼저 구매해야 해요!'); return; }
  currentRoom = id;
  localStorage.setItem('ph_currentRoom', currentRoom);
  const roomImg = document.getElementById('place-bg-img');
  if (roomImg) roomImg.src = B + theme.img.split('/').pop();
  renderRoomShop();
  showShopToast(`${theme.name} 적용됐어요! ✨`);
}
function getRoomImg() {
  if (currentRoom === 'basic' || !ROOM_THEMES[currentRoom]) return B + 'map-room.png';
  return B + ROOM_THEMES[currentRoom].img.split('/').pop();
}
function showShopToast(msg) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(26,26,46,0.95);border:1.5px solid #FF6B9D;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;z-index:600;white-space:nowrap;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

// ── 소원의 조각 ──
function checkWishFragment() {
  // v0.2 밸런스: 소원의 조각 7% → 4%
  if (Math.random() < 0.04) {
    wishFragments++;
    localStorage.setItem('ph_wish', wishFragments);
    addToBag('🧩', '소원의 조각', 'wish', 1, `100개 모으면 소원의 결정! (현재: ${wishFragments}개)`);
    checkQuestProgress('first_wish_fragment');
    showWishFragment();
    if (wishFragments >= 100) {
      wishFragments = 0;
      localStorage.setItem('ph_wish', wishFragments);
      setTimeout(() => showWishCrystalEarned(), 1500);
    }
  }
  // 소원의 결정 0.05% 별도 드랍
  if (Math.random() < 0.0005) {
    showWishCrystalEarned();
  }
}
function showWishFragment() {
  const popup = document.createElement('div');
  popup.className = 'wish-popup';
  popup.innerHTML = `<div class="wish-inner"><div style="font-size:48px;margin-bottom:12px;">🧩</div><div style="font-size:20px;font-weight:900;color:#FFD700;margin-bottom:8px;">소원의 조각 발견!</div><div style="font-size:14px;color:#aaa;margin-bottom:16px;">보유: 🧩 ${wishFragments}개 / 100개</div><button onclick="this.closest('.wish-popup').remove()" style="padding:10px 28px;background:linear-gradient(135deg,#FFD700,#F59E0B);border:none;border-radius:12px;color:#1a1a2e;font-size:14px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">확인</button></div>`;
  document.body.appendChild(popup);
  setTimeout(() => { if (popup.parentNode) popup.remove(); }, 3000);
}
function showWishCrystalEarned() {
  addToBag('💎', '소원의 결정', 'crystal', 1, '소원의 결정 — 특별한 소원을 이룰 수 있어!');
  addTimelineFeed('💎 소원의 결정 획득! 세상에서 가장 희귀한 보물!');
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;flex-direction:column;';
  popup.innerHTML = `<div style="text-align:center;"><div style="font-size:80px;margin-bottom:8px;filter:drop-shadow(0 0 30px #C084FC);">💎</div><div style="font-size:26px;font-weight:900;background:linear-gradient(135deg,#FFD700,#C084FC,#FF6B9D);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;">소원의 결정 획득!</div><div style="font-size:14px;color:#FFB3CC;margin-bottom:16px;">세상에서 가장 희귀한 보물이에요 ✨</div><div style="font-size:28px;margin-bottom:20px;">🎆🎇✨💫🌟⭐🎆🎇</div><button onclick="this.closest('div[style*=fixed]').remove();showWishCrystalUse();" style="padding:14px 36px;background:linear-gradient(135deg,#FFD700,#C084FC);border:none;border-radius:16px;color:#fff;font-size:16px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;box-shadow:0 0 30px #C084FC88;">✨ 소원 빌기</button><div style="margin-top:12px;"><button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;color:#888;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">나중에 사용하기</button></div></div>`;
  document.body.appendChild(popup);
  playFanfare();
}
function playFanfare() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.3);
    });
  } catch(e) {}
}
function showWishCrystalUse() {
  const hasCrystal = bagItems.find(i => i.name === '소원의 결정');
  if (!hasCrystal) { showBagToast('소원의 결정이 없어요!'); return; }
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;';
  popup.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:24px;padding:32px 24px;text-align:center;width:90%;max-width:320px;"><div style="font-size:48px;margin-bottom:8px;">💎</div><div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:4px;">소원의 결정 사용</div><div style="font-size:14px;color:#aaa;margin-bottom:24px;">무엇을 소원하시겠습니까?</div><div style="display:flex;flex-direction:column;gap:12px;"><button onclick="useWishCrystal('premium');this.closest('div[style*=fixed]').remove();" style="padding:16px;background:linear-gradient(135deg,#FFD700,#F59E0B);border:none;border-radius:14px;color:#1a1a2e;font-size:15px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">✨ 프리미엄 카드 선택권<br><span style="font-size:11px;font-weight:400;">원하는 프리미엄 카드 1장 획득</span></button><button onclick="useWishCrystal('confession');this.closest('div[style*=fixed]').remove();" style="padding:16px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">💝 진심의 고백<br><span style="font-size:11px;font-weight:400;">원하는 NPC 호감도 MAX</span></button></div><button onclick="this.closest('div[style*=fixed]').remove()" style="margin-top:14px;background:none;border:none;color:#888;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">취소</button></div>`;
  document.body.appendChild(popup);
}
function useWishCrystal(type) {
  if (!useFromBag('소원의 결정', 1)) return;
  if (type === 'premium') {
    addToBag('✨', '프리미엄 카드 선택권', 'premium', 1, '원하는 프리미엄 카드 1장 선택 가능');
    showBagToast('✨ 프리미엄 카드 선택권이 가방에 추가됐어요!');
  } else if (type === 'confession') {
    const popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;';
    const charBtns = Object.values(CHARS).map(ch => `<button onclick="confessChar('${ch.id}');this.closest('div[style*=fixed]').remove();" style="padding:12px;background:linear-gradient(135deg,${ch.gradeColor}44,${ch.gradeColor}22);border:1.5px solid ${ch.gradeColor};border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">${ch.emoji} ${ch.name}</button>`).join('');
    popup.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:24px;padding:28px 24px;text-align:center;width:90%;max-width:320px;"><div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:16px;">💝 누구에게 고백할까요?</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">${charBtns}</div><button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;color:#888;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">취소</button></div>`;
    document.body.appendChild(popup);
  }
}
function confessChar(charId) {
  const beforeAffInfo = getAffectionInfo(charId);
  const target = 4500 - getCharCardCount(charId);
  affectionExp[charId] = Math.max(affectionExp[charId] || 0, target);
  checkAffectionLevelUp(charId, beforeAffInfo);
  saveAll();
  const ch = CHARS[charId];
  showBagToast(`💝 ${ch.name} 인연 Lv.MAX가 됐어요!`);
}
function addTimelineFeed(msg) {
  const feeds = JSON.parse(localStorage.getItem('ph_timeline') || '[]');
  const nick = localStorage.getItem('ph_nickname') || '플레이어';
  feeds.unshift({ nick, msg, time: Date.now() });
  if (feeds.length > 50) feeds.pop();
  localStorage.setItem('ph_timeline', JSON.stringify(feeds));
}


// ── 화면 전환 ──
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const screen = document.getElementById('screen-' + id);
  if (!screen) return;
  screen.classList.add('active');
  const nav = document.getElementById('nav-' + id);
  if (nav) nav.classList.add('active');
  else if (id === 'alba-burger' || id === 'alba-cafe') { const navAlba = document.getElementById('nav-alba'); if (navAlba) navAlba.classList.add('active'); }
  updateCoinsDisplay();
  if (id === 'alba') initAlba();
  if (id === 'map' && document.getElementById('coin-map')) document.getElementById('coin-map').textContent = coins;
  if (id === 'alba-burger') initBurgerAlba();
  if (id === 'alba-cafe') initCafeAlba();
  if (id === 'collection') renderCollection();
  if (id === 'home') { renderHomeIdols(); renderHomeSpeech(); }
  if (id === 'bond') renderBondList();
  if (id === 'bag') renderBag();
  if (id === 'quest') renderQuestList();
}

// ── 알바 난이도 ──
const ALBA_DIFFICULTIES = {
  easy:   { label:'😊 쉬움', chance:0.20, mult:0.8, perfectMin:42,   perfectMax:58,   zoneLeft:42,   zoneWidth:16, desc:'보상 80%' },
  normal: { label:'🙂 보통', chance:0.60, mult:1.0, perfectMin:45.5, perfectMax:54.5, zoneLeft:45.5, zoneWidth:9,  desc:'보상 100%' },
  hard:   { label:'🔥 어려움', chance:0.20, mult:2.0, perfectMin:48,   perfectMax:52,   zoneLeft:48,   zoneWidth:4,  desc:'퍼펙트존 매우 좁음 · 보상 200%' },
};
function pickAlbaDifficulty() {
  const r = Math.random();
  if (r < 0.20) return { id:'easy', ...ALBA_DIFFICULTIES.easy };
  if (r < 0.80) return { id:'normal', ...ALBA_DIFFICULTIES.normal };
  return { id:'hard', ...ALBA_DIFFICULTIES.hard };
}
function getAlbaDifficultyInfo(diff) { return diff || { id:'normal', ...ALBA_DIFFICULTIES.normal }; }
function applyAlbaDifficultyReward(amount, diff, grade) {
  const d = getAlbaDifficultyInfo(diff);
  if (amount <= 0) return 0;
  return Math.max(1, Math.round(amount * d.mult));
}
function getGaugeZoneHtml(diff) {
  const d = getAlbaDifficultyInfo(diff);
  const greatLeft = Math.max(0, d.zoneLeft - 10);
  const greatWidth = Math.min(100, d.zoneWidth + 20);
  return `<div style="position:absolute;top:0;bottom:0;left:${greatLeft}%;width:${greatWidth}%;background:rgba(255,107,157,0.32);border-radius:4px;"></div><div style="position:absolute;top:0;bottom:0;left:${d.zoneLeft}%;width:${d.zoneWidth}%;background:rgba(255,215,0,0.78);border-radius:4px;"></div>`;
}
function getAlbaDifficultyBadge(diff) {
  const d = getAlbaDifficultyInfo(diff);
  return `<div style="text-align:center;font-size:12px;color:#FFD700;font-weight:900;margin-bottom:6px;">${d.label} · ${d.desc}</div>`;
}

// ── 버거 알바 ──
const BURGER_MENUS = [
  { name: '🍔 포카 하트버거', steps: [
    { label: '빵', emoji: '🍞', pos: { left: '72%', top: '30%' }, hint: '빵을 꺼내주세요' },
    { label: '패티', emoji: '🥩', pos: { left: '22%', top: '38%' }, hint: '패티 굽기!', gauge: true },
    { label: '치즈', emoji: '🧀', pos: { left: '70%', top: '50%' }, hint: '치즈를 올려요' },
    { label: '양상추', emoji: '🥬', pos: { left: '62%', top: '46%' }, hint: '양상추 추가' },
    { label: '토마토', emoji: '🍅', pos: { left: '65%', top: '50%' }, hint: '토마토 추가' },
    { label: '소스', emoji: '🧴', pos: { left: '42%', top: '28%' }, hint: '소스 뿌리기' },
    { label: '빵(뚜껑)', emoji: '🍞', pos: { left: '72%', top: '30%' }, hint: '뚜껑 덮기!' },
  ]},
  { name: '🥓 치즈 베이컨버거', steps: [
    { label: '빵', emoji: '🍞', pos: { left: '72%', top: '30%' }, hint: '빵을 꺼내주세요' },
    { label: '패티', emoji: '🥩', pos: { left: '22%', top: '38%' }, hint: '패티 굽기!', gauge: true },
    { label: '베이컨', emoji: '🥓', pos: { left: '42%', top: '28%' }, hint: '베이컨 추가' },
    { label: '치즈', emoji: '🧀', pos: { left: '70%', top: '50%' }, hint: '치즈 1장' },
    { label: '치즈', emoji: '🧀', pos: { left: '70%', top: '50%' }, hint: '치즈 2장!' },
    { label: '피클', emoji: '🥒', pos: { left: '62%', top: '46%' }, hint: '피클 추가' },
    { label: '소스', emoji: '🧴', pos: { left: '42%', top: '28%' }, hint: '소스 뿌리기' },
    { label: '빵(뚜껑)', emoji: '🍞', pos: { left: '72%', top: '30%' }, hint: '뚜껑 덮기!' },
  ]}
];
let burgerStep = 0, burgerMenuIdx = -1, burgerGaugePos = 0, burgerGaugeDir = 1, burgerStack = [];
let burgerGaugeAnimId = null;
let burgerGaugeLocked = false;
let burgerCompleted = false;
let burgerLastEarn = 0;
let burgerDifficulty = null;
function stopBurgerGauge() {
  if (burgerGaugeAnimId !== null) {
    cancelAnimationFrame(burgerGaugeAnimId);
    burgerGaugeAnimId = null;
  }
}
function initBurgerAlba() {
  stopBurgerGauge();
  if (document.getElementById('coin-alba-burger')) document.getElementById('coin-alba-burger').textContent = coins;
  burgerStep = 0; burgerMenuIdx = -1; burgerStack = []; burgerGaugeLocked = false; burgerCompleted = false; burgerLastEarn = 0; burgerDifficulty = null;
  renderBurgerStep();
}
function renderBurgerStep() {
  const hotspots = document.getElementById('burger-hotspots');
  const panel = document.getElementById('burger-bottom-panel');
  const nameEl = document.getElementById('burger-menu-name');
  if (burgerMenuIdx === -1) {
    if (nameEl) nameEl.textContent = '메뉴 선택';
    if (hotspots) hotspots.innerHTML = '';
    if (panel) panel.innerHTML = `<div style="color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:10px;text-align:center;">오늘의 주문을 선택하세요!</div><div style="display:flex;flex-direction:column;gap:8px;"><button onclick="selectBurgerMenu(0)" style="padding:14px;background:rgba(255,107,157,0.2);border:1.5px solid #FF6B9D;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">🍔 포카 하트버거</button><button onclick="selectBurgerMenu(1)" style="padding:14px;background:rgba(245,158,11,0.2);border:1.5px solid #F59E0B;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">🥓 치즈 베이컨버거</button></div></div>`;
    return;
  }
  const menu = BURGER_MENUS[burgerMenuIdx];
  if (nameEl) nameEl.textContent = menu.name;
  if (burgerStep >= menu.steps.length) {
    if (!burgerCompleted) {
      burgerCompleted = true;
      const baseEarn = CONFIG.alba.burger;
      const earn = applyClothCoinBonus(applyAlbaDifficultyReward(baseEarn, burgerDifficulty, 'COMPLETE'));
      burgerLastEarn = earn;
      coins += earn; albaDone++; saveAll();
      addPlayerExp(15);
      checkWishFragment();
      checkQuestProgress('first_alba');
      if (document.getElementById('coin-alba-burger')) document.getElementById('coin-alba-burger').textContent = coins;
      spawnCoinFloat(earn);
    }
    if (hotspots) hotspots.innerHTML = '';
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:32px;">🍔✨</div>${getAlbaDifficultyBadge(burgerDifficulty)}<div style="font-size:20px;font-weight:900;color:#FFD700;margin:6px 0;">+🍔 ${burgerLastEarn}</div><div style="font-size:12px;color:#aaa;margin-bottom:10px;">${menu.name} 완성!</div><div style="display:flex;gap:8px;"><button onclick="selectBurgerMenu(${burgerMenuIdx})" style="flex:1;padding:12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">다시!</button><button onclick="initBurgerAlba()" style="flex:1;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">다른 메뉴</button></div></div>`;
    return;
  }
  const step = menu.steps[burgerStep];
  const stackHtml = burgerStack.map(e => `<span style="font-size:18px;">${e}</span>`).join('');
  if (step.gauge) {
    if (hotspots) hotspots.innerHTML = `<div style="position:absolute;left:${step.pos.left};top:${step.pos.top};transform:translate(-50%,-50%);animation:pulse 1s infinite;"><div style="font-size:28px;filter:drop-shadow(0 0 8px #FF6B9D);">🔥</div></div>`;
    if (panel) panel.innerHTML = `<div style="color:#fff;">${getAlbaDifficultyBadge(burgerDifficulty)}<div style="font-size:13px;color:#FFB3CC;margin-bottom:6px;text-align:center;">${step.hint}</div><div style="display:flex;gap:6px;justify-content:center;margin-bottom:8px;">${stackHtml}</div><div style="width:100%;height:28px;background:rgba(255,255,255,0.1);border-radius:14px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;margin-bottom:8px;" onclick="tapBurgerGauge()">${getGaugeZoneHtml(burgerDifficulty)}<div id="burger-gauge-marker" style="position:absolute;top:3px;bottom:3px;width:5px;background:#fff;border-radius:3px;box-shadow:0 0 8px #fff;left:0%;"></div></div><button onclick="tapBurgerGauge()" style="width:100%;padding:10px;background:linear-gradient(135deg,#FF6B9D,#F59E0B);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">TAP! 🔥</button></div>`;
    startBurgerGauge();
  } else {
    if (hotspots) hotspots.innerHTML = `<div onclick="tapBurgerIngredient()" style="position:absolute;left:${step.pos.left};top:${step.pos.top};transform:translate(-50%,-50%);background:rgba(255,215,0,0.15);border:2px dashed rgba(255,215,0,0.7);border-radius:10px;padding:8px 12px;cursor:pointer;animation:pulse 1s infinite;display:flex;flex-direction:column;align-items:center;gap:2px;"><span style="font-size:24px;">${step.emoji}</span><span style="font-size:10px;color:#FFD700;font-weight:700;">${step.label}</span></div>`;
    if (panel) panel.innerHTML = `<div style="color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:6px;text-align:center;">${step.hint} (${burgerStep + 1}/${menu.steps.length})</div><div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;min-height:28px;">${stackHtml}</div></div>`;
  }
}
function selectBurgerMenu(idx) { stopBurgerGauge(); burgerMenuIdx = idx; burgerStep = 0; burgerStack = []; burgerGaugeLocked = false; burgerCompleted = false; burgerLastEarn = 0; burgerDifficulty = pickAlbaDifficulty(); renderBurgerStep(); }
function tapBurgerIngredient() { const step = BURGER_MENUS[burgerMenuIdx].steps[burgerStep]; burgerStack.push(step.emoji); burgerStep++; renderBurgerStep(); }
function startBurgerGauge() {
  stopBurgerGauge();
  burgerGaugePos = 0; burgerGaugeDir = 1; burgerGaugeLocked = false;
  function tick() {
    const m = document.getElementById('burger-gauge-marker');
    if (!m) { burgerGaugeAnimId = null; return; }
    // v0.2 밸런스: 속도 1.4 → 1.8
    burgerGaugePos += burgerGaugeDir * 1.8;
    if (burgerGaugePos >= 100) { burgerGaugePos = 100; burgerGaugeDir = -1; }
    if (burgerGaugePos <= 0) { burgerGaugePos = 0; burgerGaugeDir = 1; }
    m.style.left = burgerGaugePos + '%';
    burgerGaugeAnimId = requestAnimationFrame(tick);
  }
  burgerGaugeAnimId = requestAnimationFrame(tick);
}
function tapBurgerGauge() {
  if (burgerGaugeLocked) return;
  burgerGaugeLocked = true;
  stopBurgerGauge();
  const pos = burgerGaugePos;
  let earn, grade;
  const d = getAlbaDifficultyInfo(burgerDifficulty);
  if (pos >= d.perfectMin && pos <= d.perfectMax) { earn = 30; grade = 'PERFECT'; }
  else if (pos >= 35 && pos <= 65) { earn = 20; grade = 'GREAT'; }
  else if (pos >= 25 && pos <= 75) { earn = 10; grade = 'COOL'; }
  else { earn = 0; grade = 'MISS'; }
  const finalEarn = applyClothCoinBonus(applyAlbaDifficultyReward(earn, burgerDifficulty, grade));
  showResult(grade, finalEarn);
  coins += finalEarn; saveAll();
  const step = BURGER_MENUS[burgerMenuIdx].steps[burgerStep];
  burgerStack.push(step.emoji); burgerStep++; renderBurgerStep();
}

// ── 카페 알바 ──
let cafeStep = 0, cafeScores = [], cafeGaugePos = 0, cafeGaugeDir = 1;
let cafeGaugeAnimId = null;
let cafeGaugeLocked = false;
let cafeCompleted = false;
let cafeLastBonus = 0;
let cafeDifficulty = null;
function stopCafeGauge() {
  if (cafeGaugeAnimId !== null) {
    cancelAnimationFrame(cafeGaugeAnimId);
    cafeGaugeAnimId = null;
  }
  cafeGaugeRunning = false;
}
function initCafeAlba() {
  stopCafeGauge();
  if (document.getElementById('coin-alba-cafe')) document.getElementById('coin-alba-cafe').textContent = coins;
  cafeStep = 0; cafeScores = []; cafeGaugeRunning = false; cafeGaugeLocked = false; cafeCompleted = false; cafeLastBonus = 0; cafeDifficulty = pickAlbaDifficulty(); renderCafeStep();
}
function updateCafeDots() {
  [1, 2, 3, 4].forEach(i => {
    const dot = document.getElementById('cdot-' + i); if (!dot) return;
    if (i < cafeStep + 1) dot.style.background = '#FF6B9D';
    else if (i === cafeStep + 1) dot.style.background = '#C084FC';
    else dot.style.background = 'rgba(255,255,255,0.2)';
  });
}
function renderCafeStep() {
  updateCafeDots();
  const hotspots = document.getElementById('cafe-hotspots');
  const panel = document.getElementById('cafe-bottom-panel');
  const canvas = document.getElementById('latte-canvas');
  if (canvas) canvas.style.display = 'none';
  if (hotspots) hotspots.innerHTML = '';
  if (cafeStep === 0) {
    if (hotspots) hotspots.innerHTML = `<div onclick="tapMachine()" style="position:absolute;left:38%;top:42%;width:22%;height:18%;background:rgba(255,200,100,0.15);border:2px dashed rgba(255,200,100,0.6);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;animation:pulse 1s infinite;"><span style="font-size:20px;">☕</span></div>`;
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:6px;">① 에스프레소 머신을 탭하세요!</div><div id="cafe-gauge-wrap" style="display:none;margin-top:8px;">${getAlbaDifficultyBadge(cafeDifficulty)}<div style="font-size:12px;color:#aaa;margin-bottom:6px;">추출 타이밍!</div><div style="width:100%;height:28px;background:rgba(255,255,255,0.1);border-radius:14px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;" onclick="tapCafeGauge()">${getGaugeZoneHtml(cafeDifficulty)}<div id="cafe-gauge-marker" style="position:absolute;top:3px;bottom:3px;width:5px;background:#fff;border-radius:3px;box-shadow:0 0 8px #fff;left:0%;"></div></div><button onclick="tapCafeGauge()" style="margin-top:8px;width:100%;padding:10px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">TAP! ☕</button></div></div>`;
  } else if (cafeStep === 1) {
    if (hotspots) hotspots.innerHTML = `<div onclick="tapSteamer()" style="position:absolute;left:60%;top:50%;width:15%;height:20%;background:rgba(100,200,255,0.15);border:2px dashed rgba(100,200,255,0.6);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;animation:pulse 1s infinite;"><span style="font-size:20px;">🥛</span></div>`;
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:6px;">② 스팀 피쳐를 탭해서 우유를 스티밍!</div><div id="cafe-gauge-wrap" style="display:none;margin-top:8px;">${getAlbaDifficultyBadge(cafeDifficulty)}<div style="font-size:12px;color:#aaa;margin-bottom:6px;">스티밍 타이밍!</div><div style="width:100%;height:28px;background:rgba(255,255,255,0.1);border-radius:14px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;" onclick="tapCafeGauge()">${getGaugeZoneHtml(cafeDifficulty)}<div id="cafe-gauge-marker" style="position:absolute;top:3px;bottom:3px;width:5px;background:#fff;border-radius:3px;box-shadow:0 0 8px #fff;left:0%;"></div></div><button onclick="tapCafeGauge()" style="margin-top:8px;width:100%;padding:10px;background:linear-gradient(135deg,#60a5fa,#C084FC);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">TAP! 🥛</button></div></div>`;
  } else if (cafeStep === 2) {
    if (panel) panel.innerHTML = `<div style="color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:8px;text-align:center;">③ 아트 선택 후 컵 위에 그려봐!</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;"><button onclick="selectAndDrawLatte('하트','❤️')" style="padding:10px;background:rgba(255,107,157,0.2);border:1.5px solid #FF6B9D;border-radius:10px;color:#fff;font-size:16px;cursor:pointer;">❤️ 하트</button><button onclick="selectAndDrawLatte('나뭇잎','🍃')" style="padding:10px;background:rgba(100,200,100,0.2);border:1.5px solid #4ade80;border-radius:10px;color:#fff;font-size:16px;cursor:pointer;">🍃 나뭇잎</button><button onclick="selectAndDrawLatte('별','⭐')" style="padding:10px;background:rgba(255,215,0,0.2);border:1.5px solid #FFD700;border-radius:10px;color:#fff;font-size:16px;cursor:pointer;">⭐ 별</button><button onclick="selectAndDrawLatte('곰돌이','🐻')" style="padding:10px;background:rgba(192,132,252,0.2);border:1.5px solid #C084FC;border-radius:10px;color:#fff;font-size:16px;cursor:pointer;">🐻 곰돌이</button></div></div>`;
  } else if (cafeStep === 3) {
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:8px;">④ 완성! 손님에게 서빙해봐</div><div style="font-size:40px;margin-bottom:8px;">☕✨</div><button onclick="serveCafe()" style="width:100%;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">서빙! 🛎️</button></div>`;
  } else {
    const total = cafeScores.reduce((a, b) => a + b, 0);
    const baseBonus = total >= 110 ? CONFIG.alba.cafeHigh : total >= 80 ? CONFIG.alba.cafeMid : CONFIG.alba.cafeLow;
    if (!cafeCompleted) {
      cafeCompleted = true;
      cafeLastBonus = applyClothCoinBonus(applyAlbaDifficultyReward(baseBonus, cafeDifficulty, 'COMPLETE'));
      coins += cafeLastBonus; albaDone++; saveAll();
      addPlayerExp(15);
      checkWishFragment();
      checkQuestProgress('first_alba');
      if (document.getElementById('coin-alba-cafe')) document.getElementById('coin-alba-cafe').textContent = coins;
      spawnCoinFloat(cafeLastBonus);
    }
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:32px;">✨☕✨</div>${getAlbaDifficultyBadge(cafeDifficulty)}<div style="font-size:22px;font-weight:900;color:#FFD700;margin:6px 0;">+🍔 ${cafeLastBonus}</div><div style="font-size:12px;color:#aaa;margin-bottom:10px;">총점 ${total}점</div><button onclick="initCafeAlba()" style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">한 잔 더! ☕</button></div>`;
  }
  if (cafeStep <= 1) startCafeGaugeLoop();
}
let cafeGaugeRunning = false;
function startCafeGaugeLoop() {
  stopCafeGauge();
  cafeGaugePos = 0; cafeGaugeDir = 1; cafeGaugeLocked = false;
  cafeGaugeRunning = true;
  // v0.2 밸런스: 속도 1.4 → 1.8
  const speed = 1.8;
  function tick() {
    if (cafeStep > 1) { stopCafeGauge(); return; }
    cafeGaugePos += cafeGaugeDir * speed;
    if (cafeGaugePos >= 100) { cafeGaugePos = 100; cafeGaugeDir = -1; }
    if (cafeGaugePos <= 0) { cafeGaugePos = 0; cafeGaugeDir = 1; }
    const m = document.getElementById('cafe-gauge-marker');
    if (!m) { stopCafeGauge(); return; }
    m.style.left = cafeGaugePos + '%';
    cafeGaugeAnimId = requestAnimationFrame(tick);
  }
  cafeGaugeAnimId = requestAnimationFrame(tick);
}
function tapMachine() { const wrap = document.getElementById('cafe-gauge-wrap'); const h = document.getElementById('cafe-hotspots'); if (wrap) wrap.style.display = 'block'; if (h) h.innerHTML = ''; }
function tapSteamer() { const wrap = document.getElementById('cafe-gauge-wrap'); const h = document.getElementById('cafe-hotspots'); if (wrap) wrap.style.display = 'block'; if (h) h.innerHTML = ''; }
function tapCafeGauge() {
  if (cafeGaugeLocked) return;
  cafeGaugeLocked = true;
  stopCafeGauge();
  const pos = cafeGaugePos;
  let score, grade;
  const d = getAlbaDifficultyInfo(cafeDifficulty);
  if (pos >= d.perfectMin && pos <= d.perfectMax) { score = 40; grade = 'PERFECT'; }
  else if (pos >= 35 && pos <= 65) { score = 25; grade = 'GREAT'; }
  else if (pos >= 25 && pos <= 75) { score = 10; grade = 'COOL'; }
  else { score = 0; grade = 'MISS'; }
  showResult(grade, score);
  cafeScores.push(score); cafeStep++; renderCafeStep();
}
function selectAndDrawLatte(art, emoji) {
  const score = (art === '하트' || art === '곰돌이') ? 40 : 25;
  cafeScores.push(score);
  const h = document.getElementById('cafe-hotspots');
  if (h) h.innerHTML = `<div style="position:absolute;left:35%;top:65%;font-size:36px;animation:popIn 0.3s ease;">${emoji}</div>`;
  setTimeout(() => { cafeStep = 3; renderCafeStep(); }, 800);
}
function serveCafe() { cafeScores.push(20); cafeStep = 4; renderCafeStep(); }

// ── 공통 유틸 ──
function updateCoinsDisplay() {
  document.querySelectorAll('#coin-display,#coin-alba,#coin-gacha,#coin-gacha2,#coin-bag').forEach(el => { if (el) el.textContent = coins; });
}
function saveAll() {
  localStorage.setItem('ph_coins', coins);
  localStorage.setItem('ph_owned', JSON.stringify(owned));
  localStorage.setItem('ph_alba', albaDone);
  localStorage.setItem('ph_affection', JSON.stringify(affection));
  localStorage.setItem('ph_story', JSON.stringify(storyRead));
  localStorage.setItem('ph_inventory', JSON.stringify(inventory));
  localStorage.setItem('ph_hints', JSON.stringify(hints));
  localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts));
  localStorage.setItem('ph_learnedSkills', JSON.stringify(learnedSkills));
  updateCoinsDisplay();
}
function renderHomeSpeech() {
  const ownedChars = Object.keys(CHARS).filter(cid => CARDS.some(c => c.charId === cid && owned.includes(c.id)));
  const nameEl = document.getElementById('speech-name');
  const textEl = document.getElementById('speech-text');
  const charEl = document.getElementById('speech-char');
  if (ownedChars.length === 0) { nameEl.textContent = 'POCA HOUSE'; textEl.textContent = '카드를 뽑으면 아이돌이 말을 걸어올 거야! 🎴'; charEl.textContent = '💫'; return; }
  const cid = ownedChars[Math.floor(Math.random() * ownedChars.length)];
  const ch = CHARS[cid];
  const line = ch.homeLines[Math.floor(Math.random() * ch.homeLines.length)];
  nameEl.textContent = ch.name; textEl.textContent = line; charEl.textContent = ch.emoji;
  charEl.style.background = `linear-gradient(135deg,${ch.gradeColor}88,${ch.gradeColor})`;
}
function initAlba() {
  document.getElementById('coin-alba').textContent = coins;
  renderAutoIdols();
}
function showResult(grade, earn) {
  const colors = { PERFECT: '#FFD700', GREAT: '#FF6B9D', COOL: '#C084FC', MISS: '#666' };
  const popup = document.getElementById('result-popup');
  const bg = document.getElementById('result-bg');
  popup.style.borderColor = colors[grade];
  document.getElementById('result-grade-text').style.color = colors[grade];
  document.getElementById('result-grade-text').textContent = grade;
  document.getElementById('result-coins-text').textContent = earn > 0 ? `+🍔 ${earn}` : '다음엔 잘 할 수 있어!';
  document.getElementById('result-sub-text').textContent = earn > 0 ? `총 ${coins}코인` : '';
  popup.classList.add('show'); bg.classList.add('show');
  setTimeout(() => { popup.classList.remove('show'); bg.classList.remove('show'); }, 900);
}
function spawnCoinFloat(earn) {
  if (earn === 0) return;
  const el = document.createElement('div');
  el.className = 'coin-float';
  el.textContent = (earn > 0 ? '+' : '') + '🍔' + earn;
  el.style.left = (40 + Math.random() * 20) + '%';
  el.style.top = '50%';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}
function showAffectionGainFloat(charName, gain) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:50%;top:45%;transform:translate(-50%,-50%);z-index:960;background:rgba(255,255,255,0.95);border:2px solid #FF6B9D;border-radius:18px;padding:10px 18px;color:#111;font-size:16px;font-weight:900;box-shadow:0 4px 18px #0003;pointer-events:none;animation:floatUp 1.2s ease forwards;';
  el.textContent = `❤️ ${charName} +${gain}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function renderAutoIdols() {
  const section = document.getElementById('auto-idols-section');
  if (section) section.style.display = 'none';
}
function renderCollection() {
  const grid = document.getElementById('collection-grid');
  document.getElementById('collection-count').textContent = `${owned.length} / ${CARDS.length} 보유`;
  grid.innerHTML = CARDS.map(card => {
    const isOwned = owned.includes(card.id);
    return `<div class="card-item"><div style="aspect-ratio:3/4;background:#1a1a2e;position:relative;overflow:hidden;" class="${isOwned ? '' : 'card-locked'}">${isOwned && card.img ? `<img src="${card.img}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;">🎴</div>'}${!isOwned ? '<div class="card-locked-overlay">🔒</div>' : ''}</div><div class="card-item-info"><div class="card-item-name">${isOwned ? card.name : '???'}</div><div class="card-item-grade" style="color:${isOwned ? card.gradeColor : '#ccc'}">${card.grade}</div></div></div>`;
  }).join('');
}
function renderHomeIdols() {
  const chips = document.getElementById('home-idol-chips');
  const ownedCards = CARDS.filter(c => owned.includes(c.id));
  if (ownedCards.length === 0) { chips.innerHTML = '<div class="empty-idol">아직 카드가 없어요 💔<br>뽑기 해봐!</div>'; return; }
  chips.innerHTML = ownedCards.slice(0, 5).map(c => `<div class="idol-chip"><span class="grade" style="background:${c.gradeColor}">${c.grade}</span>${c.name}</div>`).join('') + (ownedCards.length > 5 ? `<div class="idol-chip">+${ownedCards.length - 5}장</div>` : '');
}

// ── 인연 ──
function renderBondList() {
  const list = document.getElementById('bond-list');
  list.innerHTML = Object.values(CHARS).map(ch => {
    const info = getAffectionInfo(ch.id);
    const aff = info.level;
    const hasCard = CARDS.some(c => c.charId === ch.id && owned.includes(c.id));
    const hearts = '❤️'.repeat(aff) + '🤍'.repeat(5 - aff);
    return `<div class="bond-card" onclick="${hasCard ? `openBondDetail('${ch.id}')` : ''}" style="${!hasCard ? 'opacity:0.4;cursor:default;' : ''}"><div class="bond-card-top"><div class="bond-char-placeholder" style="background:linear-gradient(135deg,${ch.gradeColor}88,${ch.gradeColor})">${ch.emoji}</div><div class="bond-info"><div class="bond-name">${ch.name}</div><div class="bond-heart-row"><div class="bond-hearts">${hearts}</div><div class="bond-level-text">${info.stage} Lv.${aff}</div></div><div class="bond-desc">${hasCard ? `인연 EXP ${info.totalExp}` : '카드를 뽑아야 인연을 쌓을 수 있어'}</div></div></div></div>`;
  }).join('');
}

const CHAR_MEET = {
  minjun: { reqAff: 0, dialogs: [{maxAff:1,lines:["...여기서 뭐 해?","책 읽으러 온 거면 조용히 해."]},{maxAff:3,lines:["오늘도 왔네.","읽고 싶은 책 있으면 추천해줄게."]},{maxAff:5,lines:["기다렸어.","같이 읽을까?"]}], hintChance: 0.3, hints: ["도서관 깊숙한 곳에 봉인된 방이 있다는 소문이 있어.","금지된 악보가 음악실 어딘가에 숨겨져 있다고 들었어.","별의 언어를 아는 자만이 통소원에 닿을 수 있어."] },
  sion:   { reqAff: 0, dialogs: [{maxAff:1,lines:["...뭐야.","볼 것 없어. 가."]},{maxAff:3,lines:["또 왔어?","...뭐, 방해만 안 하면 돼."]},{maxAff:5,lines:["기다렸어.","오늘은 새 곡 들려줄까?"]}], hintChance: 0.25, hints: ["음악실 피아노 뒤에 뭔가 숨겨진 것 같았어.","폭풍의 밤에만 열리는 무대가 있다는 말을 들었어.","금지된 악보... 나도 찾고 있어."] },
  doyun:  { reqAff: 1, dialogs: [{maxAff:1,lines:["볼 일 없으면 나가.","학생회실은 아무나 오는 곳이 아니야."]},{maxAff:3,lines:["...용건이 뭐야?","짧게 말해."]},{maxAff:5,lines:["왔군.","앉아. 할 말이 있어."]}], hintChance: 0.2, hints: ["학생회 금고에 봉인문서가 있어.","도서관과 학생회실 사이에 비밀 통로가 있을 수 있어.","규칙의 끝에 진실이 있어."] },
  harin:  { reqAff: 0, dialogs: [{maxAff:1,lines:["...여기 자주 와?","옥상은 내 장소야."]},{maxAff:3,lines:["오늘도 왔네.","같이 별 볼래?"]},{maxAff:5,lines:["기다렸어.","오늘 밤 특별한 게 보일 것 같아."]}], hintChance: 0.35, hints: ["옥상에서 달빛이 특정 방향을 비추는 날이 있어.","마지막 노래가 끝나면 새로운 문이 열려.","별빛 전망대는 별이 없는 밤에만 보여."] },
  yuna:   { reqAff: 0, dialogs: [{maxAff:1,lines:["어서 와! 오늘 꽃 예쁜 거 많이 들어왔어!","뭐 필요해?"]},{maxAff:3,lines:["또 왔어? 반가워!","오늘 특별히 예쁜 꽃 골라줄게~"]},{maxAff:5,lines:["기다렸어!","이 꽃 너 생각하면서 골랐어."]}], hintChance: 0.3, hints: ["숲 깊은 곳에 아무도 모르는 비밀 온실이 있어.","봄에만 피는 별꽃씨앗이 있다는 말을 들었어.","꽃의 언어를 아는 사람만이 온실에 들어갈 수 있어."] },
  ara:    { reqAff: 2, dialogs: [{maxAff:2,lines:["...감히.","이 호수는 내 장소야. 돌아가."]},{maxAff:4,lines:["...또 왔군.","비밀은 알아도 말 안 해."]},{maxAff:5,lines:["...왔군.","오늘은 특별히 얘기해줄게."]}], hintChance: 0.15, hints: ["붉은 달이 뜨는 밤, 호수 섬에 들어갈 수 있어.","장미 향기를 따라가면 비밀 정원이 보여.","나를 가진다는 건 축복이자 저주야."] }
};

let currentCharId = null;
function openBondDetail(charId) {
  currentCharId = charId;
  const ch = CHARS[charId];
  const info = getAffectionInfo(charId);
  const aff = info.level;
  document.getElementById('bond-detail-img').src = ch.img;
  document.getElementById('bond-detail-name').textContent = ch.name;
  document.getElementById('detail-hearts').innerHTML = [1,2,3,4,5].map(i => `<div class="affection-heart ${i <= aff ? 'active' : ''}">${i <= aff ? '❤️' : '🤍'}</div>`).join('');
  document.getElementById('affection-fill').style.width = (aff / 5 * 100) + '%';
  document.getElementById('affection-label').textContent = `${info.stage} Lv.${info.level} · EXP ${info.totalExp}`;
  document.getElementById('story-list').innerHTML = ch.stories.map(s => {
    const unlocked = getAffectionGateLevel(charId) >= s.unlockAt;
    const read = storyRead[charId + '_' + s.ep];
    return `<div class="story-item ${unlocked ? '' : 'locked'}" onclick="${unlocked ? `readStory('${charId}',${s.ep - 1})` : ''}"><div class="story-item-top"><div class="story-ep">EP.${s.ep}</div><div>${read ? '✅' : unlocked ? '📖' : '🔒'}</div></div><div class="story-title-text">${s.title}</div><div class="story-preview">${unlocked ? s.msgs[0].text.slice(0, 30) + '...' : '호감도 ' + s.unlockAt + ' 이상 필요'}</div></div>`;
  }).join('');
  document.getElementById('bond-detail-overlay').classList.add('show');
}
function closeBondDetail() { document.getElementById('bond-detail-overlay').classList.remove('show'); currentCharId = null; }
function readStory(charId, idx) {
  const ch = CHARS[charId];
  const story = ch.stories[idx];
  document.getElementById('story-read-title').textContent = `${ch.name} - ${story.title}`;
  document.getElementById('story-read-body').innerHTML = story.msgs.map(m => `<div class="story-msg ${m.who === 'player' ? 'player' : ''}"><div class="story-msg-name">${m.who === 'player' ? '나' : ch.name}</div><div class="story-msg-bubble">${m.text}</div></div>`).join('');
  storyRead[charId + '_' + (idx + 1)] = true;
  saveAll();
  checkQuestProgress('first_story');
  document.getElementById('story-read-overlay').classList.add('show');
}
function closeStoryRead() { document.getElementById('story-read-overlay').classList.remove('show'); if (currentCharId) openBondDetail(currentCharId); }

// ── 맵 ──
const PLACE_BUTTONS = {
  burger: ['btn-burger-alba'],
  'cafe-street': ['btn-cafe-alba', 'btn-meet-yuna'],
  school: ['btn-sub-library', 'btn-sub-music', 'btn-sub-council', 'btn-sub-rooftop', 'btn-tech-academy'],
  library: ['btn-meet-minjun'],
  music: ['btn-meet-sion'],
  council: ['btn-meet-doyun'],
  rooftop: ['btn-meet-harin'],
  forest: ['btn-explore-forest'],
  lake: ['btn-meet-ara'],
  room: ['btn-room-deco'],
  shopping: ['btn-shop-gift', 'btn-shop-room'],
  beach: ['btn-explore-beach'],
  housing: ['btn-explore-housing'],
  mystery: ['btn-explore-mystery'],
  square: ['btn-explore-square'],
  park: ['btn-explore-park'],
};
const ALL_PLACE_BTNS = ['btn-burger-alba','btn-cafe-alba','btn-meet-yuna','btn-meet-minjun','btn-meet-sion','btn-meet-doyun','btn-meet-harin','btn-meet-ara','btn-sub-library','btn-sub-music','btn-sub-council','btn-sub-rooftop','btn-tech-academy','btn-explore-forest','btn-explore-lake','btn-room-deco','btn-shop-gift','btn-shop-room','btn-explore-beach','btn-explore-housing','btn-explore-mystery','btn-explore-square','btn-explore-park'];
const PLACE_IMGS = { burger:'map-burger.png','cafe-street':'map-cafe.png',school:'map-school.png',library:'map-library.png',music:'map-music.png',council:'map-council.png',rooftop:'map-rooftop.png',forest:'map-forest.png',lake:'map-lake.png',room:'map-room.png',shopping:'map-village.png',beach:'map-beach.png',housing:'map-housing.png',mystery:'map-mystery.png',square:'map-square.png',park:'map-park.png' };
const PLACE_TITLES = { burger:'🍔 포카버거','cafe-street':'☕ 카페거리',school:'🏫 연성고등학교',library:'📚 도서관',music:'🎵 음악실',council:'🏢 학생회실',rooftop:'⭐ 옥상',forest:'🌲 동쪽숲',lake:'🏞️ 동쪽호수',room:'🏠 내 집',shopping:'🛍️ 상점거리',beach:'🏖️ 해변',housing:'🏘️ 주택가',mystery:'✨ 신비의 섬',square:'🏛️ 중앙광장',park:'🌸 꽃길공원' };

function openPlace(id) {
  ALL_PLACE_BTNS.forEach(b => { const el = document.getElementById(b); if (el) el.style.display = 'none'; });
  (PLACE_BUTTONS[id] || []).forEach(b => { const el = document.getElementById(b); if (el) el.style.display = 'block'; });
  document.getElementById('place-bg-img').src = B + (PLACE_IMGS[id] || 'map-village.png');
  if (id === 'room' && currentRoom !== 'basic' && ROOM_THEMES[currentRoom]) {
    document.getElementById('place-bg-img').src = ROOM_THEMES[currentRoom].img;
  }
  document.getElementById('place-title').textContent = PLACE_TITLES[id] || '';
  const techBtn = document.getElementById('btn-tech-academy');
  if (techBtn) {
    if (playerLevel < 10) techBtn.textContent = '🎓 기술학원 (Lv.10 필요)';
    else if (hasLearnedSkill('sewing')) techBtn.textContent = '✅ 기술학원 · 재봉 습득 완료';
    else techBtn.textContent = '🎓 기술학원 · 재봉 배우기';
  }
  const mysteryBtn = document.getElementById('btn-explore-mystery');
  if (mysteryBtn) {
    mysteryBtn.textContent = isMysteryIslandUnlocked() ? '✨ 신비의 섬 탐험' : '🔒 신비의 섬 탐험 (친절 Lv.3 필요)';
  }
  document.getElementById('place-overlay').style.display = 'flex';
}
function closePlace() { document.getElementById('place-overlay').style.display = 'none'; }
function doBurgerAlba() { closePlace(); goTo('alba-burger'); }
function doCafeAlba() { closePlace(); goTo('alba-cafe'); }
function openSubPlace(id) { openPlace(id); }
function explorePlace(id) {
  startExplore(id);
}

// ── 캐릭터 만나기 ──
function meetChar(charId) {
  const ch = CHARS[charId]; const meet = CHAR_MEET[charId];
  if (!ch || !meet) return;
  const info = getAffectionInfo(charId);
  const aff = info.level;
  if (getAffectionGateLevel(charId) < meet.reqAff) { showMeetPopup(ch, meet, null, aff); return; }
  const dialog = meet.dialogs.find(d => aff <= d.maxAff) || meet.dialogs[meet.dialogs.length - 1];
  showMeetPopup(ch, meet, dialog, aff);
}
function showMeetPopup(ch, meet, dialog, aff) {
  const overlay = document.createElement('div');
  overlay.id = 'meet-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;justify-content:flex-end;';
  const hearts = '❤️'.repeat(aff) + '🤍'.repeat(5 - aff);
  if (!dialog) {
    overlay.innerHTML = `<div style="padding:24px;background:rgba(20,10,30,0.98);border-radius:20px 20px 0 0;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;"><div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,${ch.gradeColor}88,${ch.gradeColor});display:flex;align-items:center;justify-content:center;font-size:24px;">${ch.emoji}</div><div><div style="font-size:16px;font-weight:900;color:#fff;">${ch.name}</div><div style="font-size:12px;color:#888;">호감도 ${meet.reqAff} 이상 필요</div></div></div><div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:14px;margin-bottom:16px;"><div style="font-size:14px;color:#aaa;line-height:1.6;">...접근하지 마. 아직 너를 받아들일 준비가 안 됐어.</div></div><button onclick="document.getElementById('meet-overlay').remove()" style="width:100%;padding:14px;background:rgba(255,255,255,0.1);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">돌아가기</button></div>`;
  } else {
    const line = dialog.lines[Math.floor(Math.random() * dialog.lines.length)];
  checkQuestProgress('first_meet');
    overlay.innerHTML = `<div style="padding:24px;background:rgba(20,10,30,0.98);border-radius:20px 20px 0 0;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;"><div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,${ch.gradeColor}88,${ch.gradeColor});display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${ch.emoji}</div><div style="flex:1;"><div style="font-size:16px;font-weight:900;color:#fff;">${ch.name}</div><div style="font-size:13px;">${hearts}</div></div></div><div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:14px;min-height:60px;"><div style="font-size:15px;color:#eee;line-height:1.7;">"${line}"</div></div><button onclick="showGiftMenu('${ch.id}')" style="width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">💝 호감작하기</button><button onclick="document.getElementById('meet-overlay').remove()" style="width:100%;padding:12px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:14px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">돌아가기</button></div>`;
  }
  document.body.appendChild(overlay);
}
function showGiftMenu(charId) {
  const overlay = document.getElementById('meet-overlay');
  // 가방 + 기존 인벤토리 합쳐서 선물 가능한 아이템 표시
  const bagGifts = bagItems.filter(i => i.type === 'gift');
  const invItems = Object.entries(inventory).filter(([k,v]) => v > 0);
  if (bagGifts.length === 0 && invItems.length === 0) {
    const panel = overlay.querySelector('div');
    panel.innerHTML += `<div style="color:#FF6B9D;text-align:center;margin-top:8px;font-size:13px;">인벤토리가 비어있어요! 잡화점에서 선물을 사와요 🛍️</div>`;
    return;
  }
  // 가방 아이템 우선, 기존 inventory도 표시
  const allGifts = [
    ...bagGifts.map(i => ({ name: i.name, display: `${i.emoji} ${i.name}`, cnt: i.qty, fromBag: true })),
    ...invItems.filter(([k]) => !bagGifts.find(i => i.name === k.replace(/[\u{1F300}-\u{1FFFF}]|[\u2600-\u26FF]/gu,'').trim())).map(([k,v]) => ({ name: k, display: k, cnt: v, fromBag: false }))
  ];
  const giftHtml = allGifts.map(g => `<button onclick="giveGift('${charId}','${g.name}',${g.fromBag})" style="padding:10px 14px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;text-align:left;">${g.display} <span style="color:#aaa;font-size:11px;">x${g.cnt}</span></button>`).join('');
  overlay.querySelector('div').innerHTML = `<div style="font-size:13px;color:#FFB3CC;margin-bottom:10px;font-weight:700;">💝 어떤 선물을 줄까요?</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">${giftHtml}</div><button onclick="document.getElementById('meet-overlay').remove()" style="width:100%;padding:12px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:14px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">취소</button>`;
}
function giveGift(charId, item, fromBag) {
  let affExpGain = 1;
  if (fromBag) {
    const bagItem = bagItems.find(i => i.name === item);
    if (bagItem) affExpGain = bagItem.affExp || 1;
    if (!useFromBag(item, 1)) return;
  } else {
    if (!inventory[item] || inventory[item] <= 0) return;
    inventory[item]--;
    if (inventory[item] === 0) delete inventory[item];
  }
  const oldInfo = getAffectionInfo(charId);
  affExpGain = applyClothAffectionBonus(affExpGain);
  addAffectionExp(charId, affExpGain);
  const newInfoForSave = getAffectionInfo(charId);
  affection[charId] = newInfoForSave.level;
  saveAll();
  const ch = CHARS[charId]; const meet = CHAR_MEET[charId];
  showAffectionGainFloat(ch.name, affExpGain);
  let hintText = '';
  if (Math.random() < meet.hintChance && meet.hints.length > 0) {
    const hint = meet.hints[Math.floor(Math.random() * meet.hints.length)];
    if (!hints.includes(hint)) { hints.push(hint); saveAll(); hintText = `<div style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:10px;margin-top:10px;"><div style="font-size:11px;color:#FFD700;font-weight:700;margin-bottom:4px;">💡 단서 획득!</div><div style="font-size:13px;color:#eee;">"${hint}"</div></div>`; }
  }
  const newInfo = getAffectionInfo(charId);
  const newAff = newInfo.level;
  const hearts = '❤️'.repeat(newAff) + '🤍'.repeat(5 - newAff);
  const affUp = newInfo.totalExp > oldInfo.totalExp;
  const emoji = item.match(/[\u{1F300}-\u{1FFFF}]|[\u2600-\u26FF]/gu)?.[0] || '🎁';
  document.getElementById('meet-overlay').querySelector('div').innerHTML = `<div style="text-align:center;padding:8px 0;"><div style="font-size:32px;margin-bottom:8px;">${emoji}</div><div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:6px;">${ch.name}에게 선물했어요!</div><div style="font-size:20px;margin-bottom:6px;">${hearts}</div>${affUp ? '<div style="font-size:13px;color:#FF6B9D;font-weight:700;">💞 호감도 상승!</div>' : '<div style="font-size:12px;color:#888;">이미 최대 호감도예요</div>'}${hintText}</div><button onclick="document.getElementById('meet-overlay').remove()" style="width:100%;margin-top:16px;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">확인</button>`;
}

// ── 닉네임 시스템 ──
function checkNickname() {
  const nick = localStorage.getItem('ph_nickname');
  if (!nick) {
    const popup = document.getElementById('nickname-popup');
    if (popup) popup.style.display = 'flex';
  } else {
    const topbarNick = document.getElementById('topbar-nick');
    if (topbarNick) topbarNick.textContent = nick;
    checkAttendance();
  }
}
function saveNickname() {
  const input = document.getElementById('nickname-input');
  if (!input) return;
  const val = input.value.trim();
  if (val.length < 2) { alert('닉네임은 2자 이상이에요!'); return; }
  localStorage.setItem('ph_nickname', val);
  const popup = document.getElementById('nickname-popup');
  if (popup) popup.style.display = 'none';
  const topbarNick = document.getElementById('topbar-nick');
  if (topbarNick) topbarNick.textContent = val;
  checkAttendance();
}

// ── 출석 시스템 (보상 → 가방으로) ──
const ATTEND_REWARDS = {
  1:  { emoji: '🎁', text: '코인 1000개 + 사과주스 3개', coins: 1000, items: [{ emoji:'🍎', name:'사과주스', type:'drink', qty:3, desc:'스태미나 +10 회복 음료' }] },
  7:  { emoji: '🌟', text: '소원조각 1개 + 코인 500개', coins: 500, items: [{ emoji:'🧩', name:'소원의 조각', type:'wish', qty:1, desc:'100개 모으면 소원 완성!' }] },
  14: { emoji: '🎀', text: '코인 800개 + 스태미나 회복', coins: 800, items: [] },
  21: { emoji: '🎴', text: '프리미엄 선물권 + 코인 1000개', coins: 1000, items: [{ emoji:'🎴', name:'프리미엄 선물권', type:'gift', qty:1, desc:'어떤 캐릭터에게도 선물 가능한 특별 아이템' }] },
  28: { emoji: '🖍️', text: '코인 2000개 + 소원조각 3개', coins: 2000, items: [{ emoji:'🧩', name:'소원의 조각', type:'wish', qty:3, desc:'100개 모으면 소원 완성!' }] },
};
function checkAttendance() {
  const lastAttend = localStorage.getItem('ph_last_attend');
  const today = new Date().toDateString();
  if (lastAttend === today) return;
  let days = parseInt(localStorage.getItem('ph_attend_days') || '0') + 1;
  if (days > 28) days = 1;
  localStorage.setItem('ph_attend_days', days);
  localStorage.setItem('ph_last_attend', today);
  showAttendPopup(days);
}
function showAttendPopup(day) {
  const reward = ATTEND_REWARDS[day] || { emoji: '🍔', text: '코인 200개', coins: 200, items: [] };
  const dayEl = document.getElementById('attend-day-text');
  const emojiEl = document.getElementById('attend-reward-emoji');
  const textEl = document.getElementById('attend-reward-text');
  const popup = document.getElementById('attend-popup');
  if (dayEl) dayEl.textContent = day + '일차 출석!';
  if (emojiEl) emojiEl.textContent = reward.emoji;
  if (textEl) textEl.textContent = reward.text;
  if (popup) popup.style.display = 'flex';
  window._attendDay = day;
}
function closeAttend() {
  const popup = document.getElementById('attend-popup');
  if (popup) popup.style.display = 'none';
  const day = window._attendDay;
  const reward = ATTEND_REWARDS[day] || { coins: 200, items: [] };
  coins += reward.coins;
  saveAll();
  spawnCoinFloat(reward.coins);
  // 아이템 가방으로
  if (reward.items && reward.items.length > 0) {
    reward.items.forEach(item => {
      addToBag(item.emoji, item.name, item.type, item.qty, item.desc);
    });
    showBagToast(`🎒 출석 보상 아이템이 가방에 추가됐어요!`);
  }
  if (day === 14) { stamina = STAMINA_MAX; saveStamina(); }
  if (day === 7) { wishFragments += 1; localStorage.setItem('ph_wish', wishFragments); }
  if (day === 28) { wishFragments += 3; localStorage.setItem('ph_wish', wishFragments); }
}


// ════════════════════════════════
// 🌟 플레이어 레벨 시스템
// ════════════════════════════════
let playerExp = parseInt(localStorage.getItem('ph_playerExp') || '0');
let playerLevel = parseInt(localStorage.getItem('ph_playerLevel') || '1');

function getExpRequired(level) {
  return 20 * level * level;
}

function addPlayerExp(amount) {
  playerExp += amount;
  localStorage.setItem('ph_playerExp', playerExp);
  checkPlayerLevelUp();
  updatePlayerLevelDisplay();
}

function checkPlayerLevelUp() {
  const required = getExpRequired(playerLevel);
  if (playerExp >= required) {
    playerExp -= required;
    playerLevel++;
    localStorage.setItem('ph_playerLevel', playerLevel);
    localStorage.setItem('ph_playerExp', playerExp);
    showLevelUpPopup();
    // 10레벨 달성 시 기술학원 해금
    if (playerLevel === 10) {
      showBagToast('🎓 레벨 10 달성! 기술학원에 입학할 수 있어요!');
      checkQuestProgress('player_level_10');
    }
    checkPlayerLevelUp(); // 연속 레벨업 체크
  }
}

function showLevelUpPopup() {
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;';
  popup.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFD700;border-radius:20px;padding:28px 24px;text-align:center;width:80%;max-width:280px;animation:popIn 0.4s ease;">
    <div style="font-size:48px;margin-bottom:8px;">⭐</div>
    <div style="font-size:22px;font-weight:900;color:#FFD700;margin-bottom:4px;">레벨 업!</div>
    <div style="font-size:28px;font-weight:900;color:#fff;margin-bottom:16px;">Lv.${playerLevel}</div>
    ${playerLevel === 10 ? '<div style="font-size:13px;color:#FF6B9D;margin-bottom:12px;">🎓 기술학원 입학 가능!</div>' : ''}
    <button onclick="this.closest('div[style*=fixed]').remove()" style="padding:12px 32px;background:linear-gradient(135deg,#FFD700,#F59E0B);border:none;border-radius:12px;color:#1a1a2e;font-size:15px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">확인</button>
  </div>`;
  document.body.appendChild(popup);
}

function updatePlayerLevelDisplay() {
  const required = getExpRequired(playerLevel);
  const els = document.querySelectorAll('.player-level-display');
  els.forEach(el => { el.textContent = `Lv.${playerLevel}`; });
  const expEls = document.querySelectorAll('.player-exp-display');
  expEls.forEach(el => { el.textContent = `${playerExp} / ${required} EXP`; });
  const barEls = document.querySelectorAll('.player-exp-bar');
  barEls.forEach(el => { el.style.width = `${Math.min(100, playerExp / required * 100)}%`; });
}

// ════════════════════════════════
// ❤️ 인연 경험치 시스템 v0.2
// ════════════════════════════════
// 카드 보유 수 = 기본 인연 EXP, 선물/행동 = 보너스 EXP
let affectionExp = JSON.parse(localStorage.getItem('ph_affectionExp') || '{}');
let affectionLevel = JSON.parse(localStorage.getItem('ph_affectionLevel') || '{}');
const AFFECTION_STAGES = ['친절', '우호', '신뢰', '인연'];
const AFFECTION_THRESHOLDS = [
  { exp: 0,    stage: '친절', level: 1 },
  { exp: 10,   stage: '친절', level: 2 },
  { exp: 20,   stage: '친절', level: 3 },
  { exp: 35,   stage: '친절', level: 4 },
  { exp: 50,   stage: '친절', level: 5 },
  { exp: 80,   stage: '우호', level: 1 },
  { exp: 120,  stage: '우호', level: 2 },
  { exp: 170,  stage: '우호', level: 3 },
  { exp: 230,  stage: '우호', level: 4 },
  { exp: 300,  stage: '우호', level: 5 },
  { exp: 400,  stage: '신뢰', level: 1 },
  { exp: 550,  stage: '신뢰', level: 2 },
  { exp: 750,  stage: '신뢰', level: 3 },
  { exp: 1000, stage: '신뢰', level: 4 },
  { exp: 1300, stage: '신뢰', level: 5 },
  { exp: 1700, stage: '인연', level: 1 },
  { exp: 2200, stage: '인연', level: 2 },
  { exp: 2800, stage: '인연', level: 3 },
  { exp: 3500, stage: '인연', level: 4 },
  { exp: 4500, stage: '인연', level: 5 },
];
const MYSTERY_UNLOCK_EXP = 20; // 친절 Lv.3 해금 기준

function getCharCardCount(charId) {
  return CARDS.filter(c => c.charId === charId).reduce((sum, c) => sum + (cardCounts[c.id] || 0), 0);
}
function getAffectionTotalExp(charId) {
  return getCharCardCount(charId) + (affectionExp[charId] || 0);
}
function getAffectionInfo(charId) {
  const totalExp = getAffectionTotalExp(charId);
  let info = AFFECTION_THRESHOLDS[0];
  for (const t of AFFECTION_THRESHOLDS) {
    if (totalExp >= t.exp) info = t;
    else break;
  }
  return { ...info, totalExp };
}
function getAffectionGateLevel(charId) {
  const info = getAffectionInfo(charId);
  const stageIndex = AFFECTION_STAGES.indexOf(info.stage);
  return stageIndex * 5 + info.level;
}
function isMysteryIslandUnlocked() {
  return Object.keys(CHARS).some(charId => getAffectionTotalExp(charId) >= MYSTERY_UNLOCK_EXP);
}
function addAffectionExp(charId, amount) {
  const before = getAffectionInfo(charId);
  affectionExp[charId] = (affectionExp[charId] || 0) + amount;
  localStorage.setItem('ph_affectionExp', JSON.stringify(affectionExp));
  checkAffectionLevelUp(charId, before);
}
function checkAffectionLevelUp(charId, beforeInfo) {
  const before = beforeInfo || { stage: '친절', level: 1, totalExp: 0 };
  const after = getAffectionInfo(charId);
  affectionLevel[charId] = getAffectionGateLevel(charId);
  affection[charId] = after.level;
  localStorage.setItem('ph_affectionLevel', JSON.stringify(affectionLevel));
  localStorage.setItem('ph_affection', JSON.stringify(affection));
  if (after.stage !== before.stage || after.level !== before.level) {
    const ch = CHARS[charId];
    showBagToast(`💞 ${ch.name} ${after.stage} Lv.${after.level} 달성!`);
    if (after.totalExp >= MYSTERY_UNLOCK_EXP) {
      checkQuestProgress('affection_level_2');
      checkQuestProgress('mystery_island_unlock');
    }
  }
}
function getAffectionLevel(charId) { return getAffectionInfo(charId).level; }
// ════════════════════════════════
// 🌿 탐험 미니게임
// ════════════════════════════════
const EXPLORE_MATERIALS = {
  beach:   { normal: ['반짝이는조개','달빛모래','별빛모래','맑은샘물'], rare: ['바다진주','달의눈물'] },
  park:    { normal: ['무지개꽃','장미꽃','나비가루','네잎클로버'], rare: ['나비의날개','벚꽃결정'] },
  forest:  { normal: ['별빛나무','고급원목','신비버섯','새의깃털'], rare: ['행운의잎','천사의깃털'] },
  lake:    { normal: ['맑은샘물','빛나는돌','은빛거미줄','달빛모래'], rare: ['바다진주','달의눈물'] },
  mystery: { normal: ['달빛수정','별의파편','천사의깃털','무지개수정'], rare: ['벚꽃결정','구름조각','행운의잎'] },
  square:  { normal: ['해바라기','별빛모래','빛나는돌','네잎클로버'], rare: ['구름조각','무지개수정'] },
};

let exploreTimer = null;
let exploreItems = [];
let exploreCollected = [];

function showMysteryUnlockPopup() {
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;inset:0;z-index:970;background:rgba(0,0,0,0.86);display:flex;align-items:center;justify-content:center;';
  popup.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:24px;padding:30px 24px;text-align:center;width:88%;max-width:320px;box-shadow:0 0 30px #C084FC66;">
    <div style="font-size:54px;margin-bottom:8px;">🏝️✨</div>
    <div style="font-size:22px;font-weight:900;color:#fff;margin-bottom:8px;">신비의섬 발견!</div>
    <div style="font-size:14px;color:#ddd;line-height:1.6;margin-bottom:18px;">새로운 지역이 개방되었습니다.<br>희귀 제작 재료를 찾아보세요!</div>
    <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:13px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">입장하기</button>
  </div>`;
  document.body.appendChild(popup);
}

function startExplore(placeId) {
  // 신비의 섬 잠금 체크
  if (placeId === 'mystery') {
    if (!isMysteryIslandUnlocked()) {
      showBagToast('✨ 신비의 섬은 아무 포카나 친절 Lv.3 달성 후 해금돼요!');
      return;
    }
    if (localStorage.getItem('ph_mystery_seen') !== '1') {
      localStorage.setItem('ph_mystery_seen', '1');
      showMysteryUnlockPopup();
    }
    checkQuestProgress('mystery_island_unlock');
  }
  if (stamina < 10) { showBagToast('스태미나가 부족해요! ⚡ 음료를 마셔봐요'); return; }
  const materials = EXPLORE_MATERIALS[placeId];
  if (!materials) { showBagToast('이곳은 아직 탐험 준비 중이에요!'); return; }
  stamina -= 10;
  saveStamina();
  exploreCollected = [];

  const overlay = document.createElement('div');
  overlay.id = 'explore-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;';

  const itemCount = 4 + Math.floor(Math.random() * 4);
  exploreItems = [];
  for (let i = 0; i < itemCount; i++) {
    const rareChance = Math.min(0.80, 0.30 + getEquippedStat('luck') / 100);
    const isRare = Math.random() < rareChance;
    const pool = isRare ? materials.rare : materials.normal;
    const mat = pool[Math.floor(Math.random() * pool.length)];
    // 소원조각 드랍 체크
    const wishChance = 0.02;
    const matName = Math.random() < wishChance ? null : mat;
    exploreItems.push({ name: matName, isWish: !matName, isRare, x: 10 + Math.random() * 80, y: 15 + Math.random() * 65 });
  }

  overlay.innerHTML = `<div style="width:100%;max-width:430px;height:100%;position:relative;">
    <div id="explore-timer-bar" style="position:absolute;top:10px;left:16px;right:16px;height:8px;background:rgba(255,255,255,0.2);border-radius:4px;overflow:hidden;">
      <div id="explore-timer-fill" style="height:100%;width:100%;background:linear-gradient(90deg,#FF6B9D,#C084FC);transition:width 0.1s linear;border-radius:4px;"></div>
    </div>
    <div style="position:absolute;top:24px;left:50%;transform:translateX(-50%);font-size:20px;font-weight:900;color:#fff;" id="explore-countdown">3</div>
    <div id="explore-items-area" style="position:absolute;inset:0;"></div>
    <div id="explore-collected" style="position:absolute;bottom:20px;left:16px;right:16px;background:rgba(0,0,0,0.6);border-radius:12px;padding:10px;font-size:13px;color:#fff;text-align:center;">탭해서 재료를 모아봐! ✨</div>
  </div>`;

  document.body.appendChild(overlay);

  // 아이템 배치
  const area = document.getElementById('explore-items-area');
  exploreItems.forEach((item, idx) => {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;left:${item.x}%;top:${item.y}%;transform:translate(-50%,-50%);font-size:32px;cursor:pointer;animation:pulse 1s infinite;filter:drop-shadow(0 0 8px #FFD700);`;
    el.textContent = item.isWish ? '🧩' : '✨';
    el.id = `explore-item-${idx}`;
    el.onclick = () => collectExploreItem(idx, item, el);
    area.appendChild(el);
  });

  // 타이머
  let timeLeft = 3000;
  const startTime = Date.now();
  exploreTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 3000 - elapsed);
    const pct = remaining / 3000 * 100;
    const fill = document.getElementById('explore-timer-fill');
    const countdown = document.getElementById('explore-countdown');
    if (fill) fill.style.width = pct + '%';
    if (countdown) countdown.textContent = Math.ceil(remaining / 1000);
    if (remaining <= 0) {
      clearInterval(exploreTimer);
      endExplore(placeId);
    }
  }, 100);
}

function collectExploreItem(idx, item, el) {
  if (!el.parentNode) return;
  el.style.animation = 'none';
  el.style.transform = 'translate(-50%,-50%) scale(1.5)';
  el.style.opacity = '0';
  el.style.transition = 'all 0.3s';
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 300);

  if (item.isWish) {
    wishFragments++;
    localStorage.setItem('ph_wish', wishFragments);
    addToBag('🧩', '소원의 조각', 'wish', 1, `100개 모으면 소원의 결정! (현재: ${wishFragments}개)`);
    exploreCollected.push('🧩 소원의 조각');
  } else {
    addToBag('🌿', item.name, 'material', 1, '제작 재료');
    exploreCollected.push(item.name);
    addPlayerExp(10);
  }

  const el2 = document.getElementById('explore-collected');
  if (el2) el2.textContent = `획득: ${exploreCollected.slice(-3).join(', ')}`;
  checkQuestProgress('first_explore');
}

function endExplore(placeId) {
  const overlay = document.getElementById('explore-overlay');
  if (!overlay) return;
  overlay.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:20px;padding:28px 24px;text-align:center;width:85%;max-width:300px;">
    <div style="font-size:36px;margin-bottom:8px;">🌿</div>
    <div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:8px;">탐험 완료!</div>
    <div style="font-size:13px;color:#aaa;margin-bottom:4px;">스태미나 -10 (잔여: ${stamina})</div>
    <div style="font-size:13px;color:#FFD700;margin-bottom:16px;">${exploreCollected.length > 0 ? '획득: ' + exploreCollected.join(', ') : '아무것도 못 찾았어요 😢'}</div>
    <button onclick="document.getElementById('explore-overlay').remove()" style="width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">확인</button>
  </div>`;
}


// ════════════════════════════════
// 🎓 기술학원 / 재봉 배우기 v0.2
// ════════════════════════════════
function hasLearnedSkill(skillId) { return learnedSkills.includes(skillId); }
function openTechAcademy() {
  const canEnter = playerLevel >= 10;
  const learned = hasLearnedSkill('sewing');
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;inset:0;z-index:850;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;';
  popup.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:22px;padding:26px 22px;text-align:center;width:88%;max-width:320px;">
    <div style="font-size:46px;margin-bottom:8px;">🎓</div>
    <div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:6px;">기술학원</div>
    <div style="font-size:13px;color:#aaa;line-height:1.6;margin-bottom:18px;">플레이어 Lv.10부터 재봉 기술을 배울 수 있어요.<br>현재 레벨: Lv.${playerLevel}</div>
    ${!canEnter ? `<button disabled style="width:100%;padding:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:13px;color:#888;font-size:14px;font-weight:700;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">🔒 Lv.10 필요</button>` : learned ? `<button onclick="this.closest('div[style*=fixed]').remove();openSewingWorkshop();" style="width:100%;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:13px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">🧵 재봉 작업대 열기</button><button disabled style="width:100%;padding:11px;background:rgba(74,222,128,0.12);border:1px solid #4ade80;border-radius:13px;color:#4ade80;font-size:12px;font-weight:900;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">✅ 재봉 습득 완료</button>` : `<button onclick="learnSewing();this.closest('div[style*=fixed]').remove();" style="width:100%;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:13px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">🧵 재봉 배우기</button>`}
    <button onclick="this.closest('div[style*=fixed]').remove()" style="width:100%;padding:12px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">닫기</button>
  </div>`;
  document.body.appendChild(popup);
}
function learnSewing() {
  if (playerLevel < 10) { showBagToast('🎓 Lv.10부터 재봉을 배울 수 있어요!'); return; }
  if (hasLearnedSkill('sewing')) { showBagToast('🧵 이미 재봉을 배웠어요!'); return; }
  learnedSkills.push('sewing');
  localStorage.setItem('ph_learnedSkills', JSON.stringify(learnedSkills));
  checkQuestProgress('player_level_10');
  showBagToast('🧵 재봉 기술을 배웠어요! 기술학원에서 제작할 수 있어요!');
}

// ════════════════════════════════
// 👗 의상 아이템 시스템
// ════════════════════════════════
let equippedCloth = JSON.parse(localStorage.getItem('ph_equippedCloth') || 'null');

const CLOTH_ITEMS = [
  { id:'cherry-skirt',    name:'벚꽃 미디 스커트',      img:B+'cloth-cherry-skirt.jpg',    grade:'희귀', stat:'charm',    statVal:2, desc:'매력 +2%' },
  { id:'cherry-blouse',   name:'벚꽃 시스루 블라우스',   img:B+'cloth-cherry-blouse.jpg',   grade:'희귀', stat:'affection', statVal:2, desc:'호감도 +2%' },
  { id:'crystal-jacket',  name:'수정 트위드 자켓',       img:B+'cloth-crystal-jacket.jpg',  grade:'희귀', stat:'luck',     statVal:2, desc:'행운 +2%, 희귀재료 +2%' },
  { id:'crystal-skirt',   name:'수정 트위드 스커트',     img:B+'cloth-crystal-skirt.jpg',   grade:'희귀', stat:'luck',     statVal:2, desc:'행운 +2%, 희귀재료 +2%' },
  { id:'crystal-jumper',  name:'수정 야구 점퍼',         img:B+'cloth-crystal-jumper.jpg',  grade:'희귀', stat:'luck',     statVal:2, desc:'행운 +2%, 희귀재료 +2%' },
  { id:'crystal-pants',   name:'수정 베이직 팬츠',       img:B+'cloth-crystal-pants.jpg',   grade:'희귀', stat:'luck',     statVal:2, desc:'행운 +2%, 희귀재료 +2%' },
  { id:'cloud-skirt',     name:'구름 체크 스커트',       img:B+'cloth-cloud-skirt.jpg',     grade:'희귀', stat:'coin',     statVal:2, desc:'알바 코인 +2%' },
  { id:'cloud-jacket',    name:'구름 크롭 자켓',         img:B+'cloth-cloud-jacket.jpg',    grade:'희귀', stat:'coin',     statVal:2, desc:'알바 코인 +2%' },
  { id:'cloud-shorts',    name:'구름 핫팬츠',            img:B+'cloth-cloud-shorts.jpg',    grade:'희귀', stat:'coin',     statVal:2, desc:'알바 코인 +2%' },
  { id:'cloud-dress',     name:'구름 교복 원피스',       img:B+'cloth-cloud-dress.jpg',     grade:'희귀', stat:'charm',    statVal:2, desc:'매력 +2%' },
  { id:'star-blazer',     name:'별빛 데님 블레이저',     img:B+'cloth-star-blazer.jpg',     grade:'희귀', stat:'study',    statVal:2, desc:'수업 점수 +2%' },
  { id:'star-dress',      name:'별빛 데님 멜빵 원피스',  img:B+'cloth-star-dress.jpg',      grade:'희귀', stat:'study',    statVal:2, desc:'수업 점수 +2%' },
  { id:'moon-jeans',      name:'달빛 청바지',            img:B+'cloth-moon-jeans.jpg',      grade:'희귀', stat:'charm',    statVal:2, desc:'매력 +2%' },
  { id:'moon-hoodie',     name:'달빛 후드점퍼',          img:B+'cloth-moon-hoodie.jpg',     grade:'희귀', stat:'study',    statVal:2, desc:'수업 점수 +2%' },
];

function getEquippedStats() {
  if (!equippedCloth) return {};
  let clothId = equippedCloth;
  let statValOverride = null;
  if (typeof equippedCloth === 'object') {
    clothId = equippedCloth.id;
    statValOverride = equippedCloth.statVal;
  }
  const cloth = CLOTH_ITEMS.find(c => c.id === clothId);
  if (!cloth) return {};
  return { [cloth.stat]: statValOverride || cloth.statVal };
}

function getEquippedStat(stat) {
  const stats = getEquippedStats();
  return stats[stat] || 0;
}
function applyClothCoinBonus(amount) {
  const bonus = getEquippedStat('coin');
  if (!bonus) return amount;
  return Math.max(1, Math.round(amount * (1 + bonus / 100)));
}
function applyClothAffectionBonus(amount) {
  const bonus = getEquippedStat('affection');
  if (!bonus) return amount;
  return amount * (1 + bonus / 100);
}

function findClothBagItem(clothId, itemName) {
  const cloth = CLOTH_ITEMS.find(c => c.id === clothId);
  if (!cloth) return null;
  if (itemName) return bagItems.find(i => i.type === 'cloth' && i.name === itemName) || null;
  return bagItems.find(i => i.type === 'cloth' && (i.clothId === clothId || i.name === cloth.name || i.name === `✨ ${cloth.name}`)) || null;
}

function getClothDisplayDesc(cloth, item) {
  const statVal = item?.statVal || cloth.statVal;
  if (cloth.stat === 'luck') return `행운 +${statVal}%, 희귀재료 +${statVal}%`;
  if (cloth.stat === 'coin') return `알바 코인 +${statVal}%`;
  if (cloth.stat === 'study') return `수업 점수 +${statVal}%`;
  if (cloth.stat === 'affection') return `호감도 +${statVal}%`;
  if (cloth.stat === 'charm') return `매력 +${statVal}%`;
  return `${cloth.desc.replace(/\+\d+%/g, '+' + statVal + '%')}`;
}

function equipCloth(clothId, itemName) {
  const cloth = CLOTH_ITEMS.find(c => c.id === clothId);
  if (!cloth) return;
  const item = findClothBagItem(clothId, itemName);
  if (!item) { showBagToast('보유한 의상이 아니에요!'); return; }
  equippedCloth = { id: clothId, name: item.name, statVal: item.statVal || cloth.statVal, isGreat: !!item.isGreat };
  localStorage.setItem('ph_equippedCloth', JSON.stringify(equippedCloth));
  showBagToast(`👗 ${item.name} 착용 완료! ${getClothDisplayDesc(cloth, item)}`);
  renderBag();
}

function unequipCloth() {
  equippedCloth = null;
  localStorage.setItem('ph_equippedCloth', JSON.stringify(null));
  showBagToast('옷을 벗었어요!');
  renderBag();
}

function openClothDetail(clothId, itemName) {
  const cloth = CLOTH_ITEMS.find(c => c.id === clothId);
  if (!cloth) return;
  const item = findClothBagItem(clothId, itemName);
  const isOwned = !!item;
  const equippedName = typeof equippedCloth === 'object' ? equippedCloth.name : null;
  const equippedId = typeof equippedCloth === 'object' ? equippedCloth.id : equippedCloth;
  const isEquipped = equippedName ? equippedName === itemName : equippedId === clothId;
  const displayName = item ? item.name : cloth.name;
  const displayDesc = getClothDisplayDesc(cloth, item);
  const displayGrade = item?.isGreat ? '대성공 희귀' : cloth.grade;
  const old = document.getElementById('cloth-detail-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'cloth-detail-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:800;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid ${item?.isGreat ? '#FFD700' : '#C084FC'};border-radius:20px;padding:20px;text-align:center;width:85%;max-width:300px;">
    <img src="${cloth.img}" style="width:100%;border-radius:12px;margin-bottom:12px;object-fit:contain;max-height:170px;background:#fff;" onerror="this.style.display='none'">
    <div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:4px;">${displayName}</div>
    <div style="font-size:12px;color:${item?.isGreat ? '#FFD700' : '#C084FC'};margin-bottom:4px;">${displayGrade}</div>
    <div style="font-size:13px;color:#FFD700;margin-bottom:16px;">${displayDesc}</div>
    ${isOwned ? (isEquipped ?
      `<button onclick="unequipCloth();document.getElementById('cloth-detail-overlay').remove();" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:1.5px solid #aaa;border-radius:12px;color:#aaa;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">벗기</button>` :
      `<button onclick="equipCloth('${clothId}', ${JSON.stringify(itemName)});document.getElementById('cloth-detail-overlay').remove();" style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">착용하기 👗</button>`) : ''}
    <button onclick="document.getElementById('cloth-detail-overlay').remove()" style="width:100%;padding:11px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">닫기</button>
  </div>`;
  document.body.appendChild(overlay);
}

// ════════════════════════════════
// 🧵 재봉 제작 시스템 v0.3
// ════════════════════════════════
const SEWING_RATES = { great: 0.03, success: 0.77, fail: 0.20 };
const CLOTH_RECIPES = {
  'cherry-skirt': {
    normal: ['무지개꽃','장미꽃','해바라기','네잎클로버','나비가루','맑은샘물','달빛모래'],
    rare3: ['벚꽃결정','나비의날개'], rare5: '행운의잎'
  },
  'cherry-blouse': {
    normal: ['무지개꽃','장미꽃','해바라기','네잎클로버','나비가루','새의깃털','맑은샘물'],
    rare3: ['벚꽃결정','나비의날개'], rare5: '달의눈물'
  },
  'crystal-jacket': {
    normal: ['빛나는돌','반짝이는조개','달빛모래','별빛모래','고급원목','은빛거미줄','맑은샘물'],
    rare3: ['달빛수정','무지개수정'], rare5: '별의파편'
  },
  'crystal-skirt': {
    normal: ['빛나는돌','반짝이는조개','달빛모래','별빛모래','신비버섯','은빛거미줄','맑은샘물'],
    rare3: ['달빛수정','무지개수정'], rare5: '바다진주'
  },
  'crystal-jumper': {
    normal: ['빛나는돌','반짝이는조개','달빛모래','별빛모래','별빛나무','고급원목','은빛거미줄'],
    rare3: ['달빛수정','별의파편'], rare5: '무지개수정'
  },
  'crystal-pants': {
    normal: ['빛나는돌','반짝이는조개','달빛모래','별빛모래','고급원목','신비버섯','은빛거미줄'],
    rare3: ['달빛수정','바다진주'], rare5: '무지개수정'
  },
  'cloud-skirt': {
    normal: ['별빛모래','달빛모래','맑은샘물','새의깃털','은빛거미줄','무지개꽃','네잎클로버'],
    rare3: ['구름조각','행운의잎'], rare5: '천사의깃털'
  },
  'cloud-jacket': {
    normal: ['별빛모래','달빛모래','맑은샘물','새의깃털','은빛거미줄','별빛나무','고급원목'],
    rare3: ['구름조각','천사의깃털'], rare5: '행운의잎'
  },
  'cloud-shorts': {
    normal: ['별빛모래','달빛모래','맑은샘물','새의깃털','은빛거미줄','신비버섯','네잎클로버'],
    rare3: ['구름조각','행운의잎'], rare5: '나비의날개'
  },
  'cloud-dress': {
    normal: ['별빛모래','달빛모래','맑은샘물','새의깃털','은빛거미줄','무지개꽃','장미꽃'],
    rare3: ['구름조각','천사의깃털'], rare5: '달의눈물'
  },
  'star-blazer': {
    normal: ['별빛모래','빛나는돌','반짝이는조개','달빛모래','별빛나무','고급원목','은빛거미줄'],
    rare3: ['별의파편','무지개수정'], rare5: '달빛수정'
  },
  'star-dress': {
    normal: ['별빛모래','빛나는돌','반짝이는조개','달빛모래','무지개꽃','장미꽃','은빛거미줄'],
    rare3: ['별의파편','달빛수정'], rare5: '무지개수정'
  },
  'moon-jeans': {
    normal: ['달빛모래','별빛모래','빛나는돌','맑은샘물','고급원목','신비버섯','은빛거미줄'],
    rare3: ['달의눈물','달빛수정'], rare5: '바다진주'
  },
  'moon-hoodie': {
    normal: ['달빛모래','별빛모래','빛나는돌','맑은샘물','새의깃털','은빛거미줄','네잎클로버'],
    rare3: ['달의눈물','구름조각'], rare5: '달빛수정'
  },
};

function getClothRecipeItems(clothId) {
  const recipe = CLOTH_RECIPES[clothId];
  if (!recipe) return [];
  const items = [];
  recipe.normal.forEach(name => items.push({ name, qty: 3, kind: '일반' }));
  recipe.rare3.forEach(name => items.push({ name, qty: 3, kind: '희귀' }));
  items.push({ name: recipe.rare5, qty: 5, kind: '희귀' });
  return items;
}
function getMaterialQty(name) {
  const item = bagItems.find(i => i.name === name && i.type === 'material');
  return item ? item.qty : 0;
}
function hasRecipeMaterials(clothId) {
  return getClothRecipeItems(clothId).every(req => getMaterialQty(req.name) >= req.qty);
}
function consumeRecipeMaterials(clothId) {
  const reqs = getClothRecipeItems(clothId);
  if (!reqs.every(req => getMaterialQty(req.name) >= req.qty)) return false;
  reqs.forEach(req => useFromBag(req.name, req.qty));
  return true;
}
function openSewingWorkshop() {
  if (!hasLearnedSkill('sewing')) { showBagToast('🧵 먼저 기술학원에서 재봉을 배워야 해요!'); return; }
  const old = document.getElementById('sewing-workshop-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'sewing-workshop-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:880;background:rgba(0,0,0,0.88);display:flex;flex-direction:column;overflow-y:auto;';
  const listHtml = CLOTH_ITEMS.map(cloth => {
    const ownedQty = bagItems.filter(i => i.type === 'cloth' && (i.clothId === cloth.id || i.name === cloth.name || i.name === `✨ ${cloth.name}`)).reduce((sum, i) => sum + i.qty, 0);
    const canCraft = hasRecipeMaterials(cloth.id);
    const ownedText = ownedQty ? `<span style="color:#4ade80;font-size:11px;font-weight:900;">보유 x${ownedQty}</span>` : `<span style="color:#888;font-size:11px;">미보유</span>`;
    return `<div onclick="openSewingRecipe('${cloth.id}')" style="display:flex;gap:10px;background:rgba(255,255,255,0.06);border:1.5px solid ${canCraft ? '#C084FC' : 'rgba(255,255,255,0.12)'};border-radius:14px;padding:10px;cursor:pointer;align-items:center;">
      <img src="${cloth.img}" onerror="this.style.display='none'" style="width:52px;height:68px;object-fit:contain;border-radius:10px;background:#fff;flex-shrink:0;">
      <div style="flex:1;text-align:left;min-width:0;">
        <div style="font-size:13px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cloth.name}</div>
        <div style="font-size:11px;color:#FFD700;margin-top:2px;">${cloth.desc}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:8px;">
          ${ownedText}
          <span style="font-size:11px;color:${canCraft ? '#C084FC' : '#777'};font-weight:900;">${canCraft ? '제작 가능' : '재료 부족'}</span>
        </div>
      </div>
    </div>`;
  }).join('');
  overlay.innerHTML = `<div style="padding:18px 16px 90px;max-width:430px;width:100%;margin:0 auto;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div><div style="font-size:20px;font-weight:900;color:#fff;">🧵 재봉 작업대</div><div style="font-size:12px;color:#aaa;margin-top:2px;">대성공 3% · 성공 77% · 실패 20%</div></div>
      <button onclick="document.getElementById('sewing-workshop-overlay').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#fff;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">닫기</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">${listHtml}</div>
  </div>`;
  document.body.appendChild(overlay);
}
function openSewingRecipe(clothId) {
  const cloth = CLOTH_ITEMS.find(c => c.id === clothId);
  if (!cloth) return;
  const reqs = getClothRecipeItems(clothId);
  const canCraft = hasRecipeMaterials(clothId);
  const old = document.getElementById('sewing-recipe-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'sewing-recipe-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:920;background:rgba(0,0,0,0.86);display:flex;align-items:center;justify-content:center;';
  const reqHtml = reqs.map(req => {
    const have = getMaterialQty(req.name);
    const ok = have >= req.qty;
    return `<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);font-size:12px;">
      <span style="color:${req.kind === '희귀' ? '#C084FC' : '#ddd'};">${req.kind === '희귀' ? '💎' : '🌿'} ${req.name}</span>
      <span style="color:${ok ? '#4ade80' : '#FF6B9D'};font-weight:900;">${have}/${req.qty}</span>
    </div>`;
  }).join('');
  const ownedItems = bagItems.filter(i => i.type === 'cloth' && (i.clothId === cloth.id || i.name === cloth.name || i.name === `✨ ${cloth.name}`));
  const ownedItem = ownedItems[0];
  const ownedQty = ownedItems.reduce((sum, i) => sum + i.qty, 0);
  overlay.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:22px;padding:18px;width:90%;max-width:340px;max-height:88vh;overflow-y:auto;text-align:center;">
    <img src="${cloth.img}" onerror="this.style.display='none'" style="width:100%;max-height:145px;object-fit:contain;border-radius:12px;margin-bottom:10px;background:#fff;">
    <div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:3px;">${cloth.name}</div>
    <div style="font-size:13px;color:#FFD700;margin-bottom:8px;">${cloth.desc}</div>
    <div style="font-size:11px;color:#aaa;margin-bottom:10px;">보유: ${ownedQty}개</div>
    <div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:10px;margin-bottom:12px;text-align:left;">${reqHtml}</div>
    <button ${canCraft ? '' : 'disabled'} onclick="craftCloth('${clothId}')" style="width:100%;padding:14px;background:${canCraft ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,0.08)'};border:none;border-radius:13px;color:${canCraft ? '#fff' : '#777'};font-size:15px;font-weight:900;cursor:${canCraft ? 'pointer' : 'default'};font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">${canCraft ? '🧵 제작하기' : '재료 부족'}</button>
    ${ownedItem ? `<button onclick="openClothDetail('${clothId}', ${JSON.stringify(ownedItem?.name || cloth.name)});document.getElementById('sewing-recipe-overlay').remove();" style="width:100%;padding:12px;background:rgba(255,255,255,0.1);border:1.5px solid #FF6B9D;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">👗 착용하기</button>` : ''}
    <button onclick="document.getElementById('sewing-recipe-overlay').remove()" style="width:100%;padding:11px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">닫기</button>
  </div>`;
  document.body.appendChild(overlay);
}
function addClothToBag(cloth, isGreat) {
  const itemName = isGreat ? `✨ ${cloth.name}` : cloth.name;
  const statVal = cloth.statVal + (isGreat ? 1 : 0);
  const existing = bagItems.find(i => i.type === 'cloth' && i.name === itemName);
  if (existing) {
    existing.qty += 1;
    saveBag();
    return true;
  }
  if (bagItems.length >= bagSlots) {
    showBagToast('가방이 꽉 찼어요! 🎒 슬롯을 확장해주세요');
    return false;
  }
  bagItems.push({
    name: itemName,
    emoji: isGreat ? '✨' : '👗',
    type: 'cloth',
    qty: 1,
    desc: `${isGreat ? '대성공 의상' : cloth.grade + ' 의상'} · ${getClothDisplayDesc(cloth, { statVal })}`,
    affExp: 0,
    clothId: cloth.id,
    img: cloth.img,
    stat: cloth.stat,
    statVal,
    isGreat: !!isGreat
  });
  saveBag();
  return true;
}

function craftCloth(clothId) {
  const cloth = CLOTH_ITEMS.find(c => c.id === clothId);
  if (!cloth) return;
  if (!hasLearnedSkill('sewing')) { showBagToast('🧵 재봉을 먼저 배워야 해요!'); return; }
  if (!consumeRecipeMaterials(clothId)) { showBagToast('재료가 부족해요!'); return; }
  const r = Math.random();
  let result = 'fail';
  if (r < SEWING_RATES.great) result = 'great';
  else if (r < SEWING_RATES.great + SEWING_RATES.success) result = 'success';

  if (result === 'fail') {
    showSewingResult('실패', '재료가 모두 소모됐어요 😭', '💥', '#FF6B9D', null);
  } else {
    const isGreat = result === 'great';
    addClothToBag(cloth, isGreat);
    checkQuestProgress('first_craft');
    const statText = getClothDisplayDesc(cloth, { statVal: cloth.statVal + (isGreat ? 1 : 0) });
    showSewingResult(isGreat ? '대성공!' : '성공!', `${isGreat ? '✨ ' : ''}${cloth.name} 획득!<br>${statText}`, isGreat ? '✨👗✨' : '👗✨', isGreat ? '#FFD700' : '#C084FC', cloth.img);
  }
  const recipeOverlay = document.getElementById('sewing-recipe-overlay');
  if (recipeOverlay) recipeOverlay.remove();
  const workshop = document.getElementById('sewing-workshop-overlay');
  if (workshop) {
    setTimeout(() => {
      if (document.getElementById('sewing-workshop-overlay')) openSewingWorkshop();
    }, 300);
  }
}
function showSewingResult(title, text, emoji, color, imgSrc) {
  const old = document.getElementById('sewing-result-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'sewing-result-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:950;background:rgba(0,0,0,0.86);display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid ${color};border-radius:22px;padding:28px 22px;text-align:center;width:86%;max-width:300px;">
    <div style="font-size:46px;margin-bottom:8px;filter:drop-shadow(0 0 16px ${color});">${emoji}</div>
    ${imgSrc ? `<img src="${imgSrc}" style="width:100%;max-height:150px;object-fit:contain;background:#fff;border-radius:12px;margin-bottom:10px;" onerror="this.style.display='none'">` : ''}
    <div style="font-size:22px;font-weight:900;color:${color};margin-bottom:8px;">${title}</div>
    <div style="font-size:14px;color:#fff;line-height:1.6;margin-bottom:18px;">${text}</div>
    <button onclick="document.getElementById('sewing-result-overlay').remove()" style="width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">확인</button>
  </div>`;
  document.body.appendChild(overlay);
}

// ════════════════════════════════
// 📜 퀘스트 시스템
// ════════════════════════════════
let questProgress = JSON.parse(localStorage.getItem('ph_quest') || '{}');

const QUESTS = {
  // 튜토리얼
  tut_alba: { title:'일단 살아야지', desc:'주머니를 뒤져봤지만 코인 한 닢 없다. 포카버거에서 알바를 해보자.', condition:'first_alba', rewardCoins:200, rewardExp:50, type:'tutorial' },
  tut_gacha: { title:'저 가게가 궁금해', desc:'마을을 걷다 보니 반짝이는 가게가 눈에 들어왔다. 카드 한 장 뽑아볼까?', condition:'first_gacha', rewardCoins:300, rewardExp:50, type:'tutorial' },
  tut_meet: { title:'처음 만나는 인연', desc:'카드 속 아이돌이 실제로 존재한다고? 직접 찾아가보자.', condition:'first_meet', rewardCoins:200, rewardExp:50, type:'tutorial' },
  // 메인
  main_cards: { title:'포카를 모아봐', desc:'포카 속 아이돌들이 비밀을 알고 있다. 일단 카드를 모아야 해. 10장이면 뭔가 달라질까?', condition:'cards_10', rewardCoins:500, rewardExp:100, type:'main' },
  main_affection: { title:'마음을 열어봐', desc:'아이돌들은 쉽게 마음을 열지 않는다. 진심으로 다가가야 한다.', condition:'affection_level_2', rewardCoins:500, rewardExp:150, type:'main' },
  main_story: { title:'처음 듣는 이야기', desc:'드디어 아이돌이 마음을 열기 시작했다. 뭔가 중요한 이야기를 들을 수 있을 것 같다...', condition:'first_story', rewardCoins:300, rewardExp:100, type:'main' },
  main_level: { title:'학원 문을 열어라', desc:'기술학원 앞에 서봤다. 문이 잠겨있다. 더 열심히 알바하고 탐험해야겠다.', condition:'player_level_10', rewardCoins:1000, rewardExp:300, type:'main' },
  main_mystery: { title:'전설의 섬', desc:"아이돌이 귓속말로 말해줬다. '신비의 섬에 가봐. 거기에 네가 찾는 게 있을 거야.'", condition:'mystery_island_unlock', rewardCoins:1000, rewardExp:300, type:'main' },
  main_wish: { title:'기억의 조각', desc:'신비의 섬에서 뭔가 반짝이는 걸 발견했다. 이게... 기억의 조각? 전설이 진짜였어.', condition:'first_wish_fragment', rewardCoins:2000, rewardExp:500, type:'main' },
};

function checkQuestProgress(condition) {
  Object.entries(QUESTS).forEach(([id, quest]) => {
    if (questProgress[id] === 'done') return;
    if (quest.condition === condition) {
      completeQuest(id, quest);
    }
  });
}

function completeQuest(id, quest) {
  if (questProgress[id] === 'done') return;
  questProgress[id] = 'done';
  localStorage.setItem('ph_quest', JSON.stringify(questProgress));
  coins += quest.rewardCoins;
  addPlayerExp(quest.rewardExp);
  saveAll();
  showQuestComplete(quest);
}

function showQuestComplete(quest) {
  const popup = document.createElement('div');
  popup.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:900;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FFD700;border-radius:16px;padding:16px 20px;text-align:center;width:85%;max-width:320px;animation:fadeInUp 0.4s ease;';
  popup.innerHTML = `<div style="font-size:12px;color:#FFD700;font-weight:700;margin-bottom:4px;">✅ 퀘스트 완료!</div>
    <div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:4px;">${quest.title}</div>
    <div style="font-size:13px;color:#aaa;">"${quest.desc.slice(0,40)}..."</div>
    <div style="font-size:13px;color:#FFD700;margin-top:6px;">🍔 +${quest.rewardCoins} · ⭐ +${quest.rewardExp}xp</div>`;
  document.body.appendChild(popup);
  setTimeout(() => { popup.style.opacity='0'; popup.style.transition='opacity 0.5s'; setTimeout(() => popup.remove(), 500); }, 3000);
}

function renderQuestList() {
  const el = document.getElementById('quest-list');
  if (!el) return;
  const tutQuests = Object.entries(QUESTS).filter(([,q]) => q.type === 'tutorial');
  const mainQuests = Object.entries(QUESTS).filter(([,q]) => q.type === 'main');

  let html = '<div style="font-size:13px;font-weight:700;color:#FFB3CC;margin-bottom:10px;">📋 튜토리얼</div>';
  tutQuests.forEach(([id, quest]) => {
    const done = questProgress[id] === 'done';
    html += `<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,${done?'0.3':'0.1'});border-radius:12px;padding:12px;margin-bottom:8px;opacity:${done?'0.6':'1'};">
      <div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-size:14px;font-weight:700;color:#fff;">${done?'✅ ':''}${quest.title}</div><div style="font-size:11px;color:#FFD700;">🍔${quest.rewardCoins}</div></div>
      <div style="font-size:12px;color:#aaa;margin-top:4px;">${quest.desc.slice(0,50)}...</div>
    </div>`;
  });

  html += '<div style="font-size:13px;font-weight:700;color:#FFB3CC;margin:16px 0 10px;">🌟 메인 퀘스트</div>';
  mainQuests.forEach(([id, quest]) => {
    const done = questProgress[id] === 'done';
    html += `<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,${done?'0.3':'0.1'});border-radius:12px;padding:12px;margin-bottom:8px;opacity:${done?'0.6':'1'};">
      <div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-size:14px;font-weight:700;color:#fff;">${done?'✅ ':''}${quest.title}</div><div style="font-size:11px;color:#FFD700;">🍔${quest.rewardCoins}</div></div>
      <div style="font-size:12px;color:#aaa;margin-top:4px;">${quest.desc.slice(0,50)}...</div>
    </div>`;
  });
  el.innerHTML = html;
}



function syncAllAffectionLevels() {
  Object.keys(CHARS).forEach(charId => {
    const info = getAffectionInfo(charId);
    affectionLevel[charId] = getAffectionGateLevel(charId);
    affection[charId] = info.level;
  });
  localStorage.setItem('ph_affectionLevel', JSON.stringify(affectionLevel));
  localStorage.setItem('ph_affection', JSON.stringify(affection));
  saveAll();
}

// ── 뽑기 책 애니메이션 ──
function doDrawAnimation() {
  // 그냥 탭하면 1뽑
  doDraw(1);
}

// ── 초기화 ──
syncAllAffectionLevels();
updateCoinsDisplay();
renderHomeIdols();
renderHomeSpeech();
checkNickname();
updatePlayerLevelDisplay();
updateStaminaDisplay();
setInterval(updateStaminaDisplay, 1000);
