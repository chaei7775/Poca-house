alert("패치파일 실행됨 - v3.1");
// ════════════════════════════════
// ⚙️ 가격 설정
// ════════════════════════════════
const CONFIG = {
  roomPrice: { pink: 15000, plant: 22000, doll: 35000 },
  alba: { burger: 17, cafeHigh: 30, cafeMid: 20, cafeLow: 10 },
  gacha: { one: 540, three: 1620 },
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

function migrateCardCounts() {
  let changed = false;
  owned.forEach(cardId => {
    if (!cardCounts[cardId]) { cardCounts[cardId] = 1; changed = true; }
  });
  if (changed) localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts));
}
migrateCardCounts();

function getBagExpandCost() { return 500 + bagExpandCount * 200; }
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
      const isEquippedCloth = item.type === 'cloth' && window.equippedCloth && ((typeof window.equippedCloth === 'object' && window.equippedCloth.name === item.name) || window.equippedCloth === item.clothId);
      const itemVisual = item.img ? `<img src="${item.img}" style="width:42px;height:54px;object-fit:contain;border-radius:6px;background:#fff;" onerror="this.style.display='none'">` : `<div class="bag-item-emoji">${item.emoji}</div>`;
      html += `<div class="bag-slot has-item" onclick="showBagItemDetail(${i})">${isEquippedCloth ? '<div style="position:absolute;top:3px;left:3px;background:#111;color:#fff;border-radius:6px;padding:1px 4px;font-size:8px;font-weight:900;">착용중</div>' : ''}${itemVisual}<div class="bag-item-qty">x${item.qty}</div><div class="bag-item-name">${shortName}</div></div>`;
    } else {
      html += `<div class="bag-slot empty"><div style="font-size:18px;opacity:0.12;">📦</div></div>`;
    }
  }
  grid.innerHTML = html;
}

function showBagItemDetail(idx) {
  const item = bagItems[idx]; if (!item) return;
  const old = document.getElementById('bag-detail-overlay'); if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'bag-detail-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;';
  const isGift = item.type === 'gift';
  const isCrystal = item.type === 'crystal';
  const isDrink = item.type === 'drink';
  const isCloth = item.type === 'cloth';
  let actionBtn = '';
  if (isGift) actionBtn = `<button onclick="openGiftFromBag('${item.name}');document.getElementById('bag-detail-overlay').remove();" style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px;">💝 캐릭터에게 선물하기</button>`;
  if (isCrystal) actionBtn = `<button onclick="document.getElementById('bag-detail-overlay').remove();showWishCrystalUse();" style="width:100%;padding:12px;background:linear-gradient(135deg,#FFD700,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px;">💎 소원 빌기</button>`;
  if (isDrink) actionBtn = `<button onclick="useDrinkFromBag(${idx});document.getElementById('bag-detail-overlay').remove();" style="width:100%;padding:12px;background:linear-gradient(135deg,#60a5fa,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px;">🥤 사용하기</button>`;
  if (isCloth) {
    const cloth = (typeof CLOTH_ITEMS !== 'undefined') ? CLOTH_ITEMS.find(c => c.id === item.clothId || c.name === item.name || c.name === item.name.replace(/^✨\s*/, '')) : null;
    if (cloth) actionBtn = `<button onclick="window.equipCloth('${cloth.id}', '${item.name}');document.getElementById('bag-detail-overlay').remove();" style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;margin-bottom:8px;">👗 착용하기</button>`;
  }
  overlay.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:20px;padding:28px 24px;text-align:center;width:85%;max-width:300px;"><div style="font-size:52px;margin-bottom:8px;">${item.emoji}</div><div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:4px;">${item.name}</div><div style="font-size:12px;color:#aaa;margin-bottom:4px;">${item.desc}</div><div style="font-size:14px;color:#FFD700;font-weight:700;margin-bottom:20px;">보유: ${item.qty}개</div>${actionBtn}<button onclick="document.getElementById('bag-detail-overlay').remove()" style="width:100%;padding:11px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:13px;cursor:pointer;">닫기</button></div>`;
  document.body.appendChild(overlay);
}

function useDrinkFromBag(idx) {
  const item = bagItems[idx]; if (!item) return;
  const staminaMap = { '사과주스': 10, '딸기스무디': 20, '에너지드링크': 30 };
  const up = staminaMap[item.name] || 10;
  useFromBag(item.name, 1);
  stamina = Math.min(STAMINA_MAX, stamina + up);
  saveStamina(); saveAll(); renderBag();
  showBagToast(`${item.emoji} ${item.name} 사용! ⚡ 스태미나 +${up}`);
}
function openGiftFromBag(itemName) { goTo('bond'); showBagToast(`${itemName} 들고 인연 탭으로 이동! 💝`); }

// ── 스태미나 자연 회복 ──
function processStaminaRegen() {
  const now = Date.now();
  if (stamina >= STAMINA_MAX) { stamina = STAMINA_MAX; lastStaminaRegen = now; localStorage.setItem('ph_stamina', stamina); localStorage.setItem('ph_lastStaminaRegen', lastStaminaRegen); return; }
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
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}
function updateStaminaDisplay() {
  processStaminaRegen();
  let el = document.getElementById('stamina-floating');
  if (!el && document.body) {
    el = document.createElement('div'); el.id = 'stamina-floating';
    el.style.cssText = 'position:fixed;right:10px;bottom:104px;z-index:120;background:rgba(255,255,255,0.92);border:1.5px solid #111;color:#111;border-radius:16px;padding:6px 10px;font-size:11px;font-weight:900;box-shadow:0 2px 10px #0002;line-height:1.35;text-align:right;';
    document.body.appendChild(el);
  }
  if (!el) return;
  const next = stamina >= STAMINA_MAX ? 'FULL' : formatStaminaTime(STAMINA_REGEN_MS - ((Date.now() - lastStaminaRegen) % STAMINA_REGEN_MS));
  el.innerHTML = `⚡ ${stamina}/${STAMINA_MAX}<br><span style="font-size:10px;color:#555;">다음 +1 ${next}</span>`;
}
function saveStamina() { stamina = Math.min(STAMINA_MAX, Math.max(0, stamina)); localStorage.setItem('ph_stamina', stamina); updateStaminaDisplay(); }

const B = "https://raw.githubusercontent.com/chaei7775/Poca-house/main/";
const ROOM_THEMES = {
  pink:  { name: '💕 핑크덕질방',   price: CONFIG.roomPrice.pink,  img: B+'room_pink.png' },
  plant: { name: '🌿 식물힐링방',   price: CONFIG.roomPrice.plant, img: B+'room_plant.png' },
  doll:  { name: '🐻 인형컬렉터룸', price: CONFIG.roomPrice.doll,  img: B+'room_doll.png' },
};

// ── 캐릭터 데이터 ──
const CHARS = {
  minjun: { id:'minjun', name:'민준', emoji:'📚', gradeColor:'#F59E0B', img:B+'Minjun UR.png', homeLines:["모르는 건 부끄러운 게 아니야. 알려고 하지 않는 게 부끄러운 거지.","오늘도 알바 열심히 해. 난 여기서 기다릴게.","감기 걸리면 큰일이잖아. 우산은 같이 쓰면 되지."], stories:[{ep:1,title:"도서관의 밤",unlockAt:0,msgs:[{who:'minjun',text:"...여기서 뭐 해? 문 닫을 시간인데."},{who:'player',text:"책 찾다가 길을 잃었어요."},{who:'minjun',text:"길을 잃은 게 아니라, 아직 찾고 있는 거야. 도와줄까?"},{who:'player',text:"...네, 부탁드려도 될까요?"},{who:'minjun',text:"(책을 집어들며) 이걸 찾고 있었지? 생각보다 잘 아네."}]},{ep:2,title:"비 오는 귀갓길",unlockAt:1,msgs:[{who:'minjun',text:"...비 맞으면서 걸어가려고?"},{who:'player',text:"우산이 없어서요."},{who:'minjun',text:"(우산 내밀며) 가져가. 나는 괜찮아."},{who:'player',text:"같이 써요."},{who:'minjun',text:"...그래. (작게) 가까이 와."}]},{ep:3,title:"별의 기록",unlockAt:2,msgs:[{who:'minjun',text:"오늘 별자리 봤어?"},{who:'player',text:"못 봤어요. 바빴거든요."},{who:'minjun',text:"이 기록… 분명 우리가 잃어버린 진실의 조각이야."},{who:'player',text:"무서운 말이에요."},{who:'minjun',text:"(눈 마주치며) 괜찮아. 내가 옆에 있잖아."}]}] },
  sion: { id:'sion', name:'시온', emoji:'🎸', gradeColor:'#6366F1', img:B+'Sion UR.png', homeLines:["무대 위에선 누구의 것도 아냐. 오직 음악만 남아.","관객이 없어도 연주는 진심이어야 하거든.","폭풍이 몰아쳐도, 나는 내 노래를 멈추지 않아."], stories:[{ep:1,title:"야간 리허설",unlockAt:0,msgs:[{who:'sion',text:"...뭐야. 아직도 있어?"},{who:'player',text:"연주 소리가 좋아서요."},{who:'sion',text:"관중 없는 데서 들어도 좋냐고."},{who:'player',text:"네. 진심이 느껴졌어요."},{who:'sion',text:"...(기타 줄 튕기며) 한 곡만 더 들을래?"}]},{ep:2,title:"폭풍 속 무대",unlockAt:1,msgs:[{who:'sion',text:"비 맞으면서 공연 보러 왔어?"},{who:'player',text:"시온씨 공연이니까요."},{who:'sion',text:"...바보같은 거 알아?"},{who:'player',text:"알아요."},{who:'sion',text:"(낮게) 고마워. 이 한 마디는 너한테만 해."}]},{ep:3,title:"무대 뒤 적막",unlockAt:2,msgs:[{who:'sion',text:"기대하지 마. 난 사람 실망시키는 데 특기 있어."},{who:'player',text:"그래도 괜찮아요."},{who:'sion',text:"...왜?"},{who:'player',text:"지금 이 순간만으로 충분하니까요."},{who:'sion',text:"(오래 침묵하다) ...넌 이상한 애야."}]}] },
  doyun: { id:'doyun', name:'도윤', emoji:'👑', gradeColor:'#374151', img:B+'Doyun UR.png', homeLines:["필요하면 불러. 나, 가는 편이거든.","규칙은 공정해야지. 그래야만 모두가 내 선택을 따르게 되니까.","넌, 내가 만든 가장 아름다운 예외야."], stories:[{ep:1,title:"학생회장의 제안",unlockAt:0,msgs:[{who:'doyun',text:"너 포카하우스 알바하지?"},{who:'player',text:"네, 맞아요."},{who:'doyun',text:"내가 규칙을 하나 정해줄게. 지각하지 마."},{who:'player',text:"...알겠어요."},{who:'doyun',text:"(작게 웃으며) 잘 따르네. 마음에 들어."}]},{ep:2,title:"가면무도회의 밤",unlockAt:1,msgs:[{who:'doyun',text:"왜 가면을 안 썼어?"},{who:'player',text:"숨기고 싶은 게 없어서요."},{who:'doyun',text:"...(가면 내리며) 그렇군. 나도 오늘만큼은 그러고 싶었어."},{who:'player',text:"예뻐요. 민얼굴이."},{who:'doyun',text:"(귀 붉혀지며) ...함부로 말하지 마."}]},{ep:3,title:"보이지 않는 실세",unlockAt:2,msgs:[{who:'doyun',text:"내가 왜 이렇게 움직이는지 알아?"},{who:'player',text:"모르겠어요."},{who:'doyun',text:"내 옆에 있는 사람을 지키기 위해서야."},{who:'player',text:"...저도요?"},{who:'doyun',text:"(눈 마주치며) 특히 너."}]}] },
  harin: { id:'harin', name:'하린', emoji:'🌙', gradeColor:'#7C3AED', img:B+'Harin UR.png', homeLines:["이 노래가 끝나면, 모든 게 사라져도 너만은 기억해줘.","이 밤이 끝나도, 내 노래는 너에게 닿을 거야.","이 노래가 너에게 닿을 수 있다면, 나는 언제든 노래할 수 있어."], stories:[{ep:1,title:"새벽역에서",unlockAt:0,msgs:[{who:'harin',text:"이 시간에 여기 왜 있어?"},{who:'player',text:"막차를 놓쳤어요."},{who:'harin',text:"나도. (옆에 앉으며) 같이 기다리자."},{who:'player',text:"노래 들었어요. 진짜 좋았어요."},{who:'harin',text:"...고마워. 처음으로 직접 들었네."}]},{ep:2,title:"달빛 보컬",unlockAt:1,msgs:[{who:'harin',text:"왜 항상 맨 앞에 있어?"},{who:'player',text:"목소리가 잘 들리니까요."},{who:'harin',text:"...아, 그렇구나. (낮게) 사실 너 보려고 이쪽 서게 됐어."},{who:'player',text:"...네?"},{who:'harin',text:"(웃으며) 다음 곡도 들어줘."}]},{ep:3,title:"마지막 무대",unlockAt:2,msgs:[{who:'harin',text:"오늘이 마지막 무대야."},{who:'player',text:"왜요?"},{who:'harin',text:"쉬어야 할 것 같아서. 근데 네가 있으면 계속할 수 있을 것 같아."},{who:'player',text:"계속 들을게요."},{who:'harin',text:"(손 잡으며) 고마워. 진짜로."}]}] },
  yuna: { id:'yuna', name:'윤아', emoji:'🌸', gradeColor:'#EC4899', img:B+'Yuna UR.png', homeLines:["오늘은 우리, 봄이랑 데이트하는 날이야!","오늘 너한테 제일 예쁜 꽃을 줄게. 받아줄 거지?","오늘, 나만 바라봐 줘. 그거면 충분해."], stories:[{ep:1,title:"꽃집 알바",unlockAt:0,msgs:[{who:'yuna',text:"어서 와! 뭐 찾아?"},{who:'player',text:"예쁜 꽃이요."},{who:'yuna',text:"(빙글 돌며) 그럼 나야! 아, 농담이고— 이건 어때?"},{who:'player',text:"예뻐요. 당신처럼."},{who:'yuna',text:"(발끈) 야! 갑자기 그런 말 하면 어떡해!"}]},{ep:2,title:"봄 축제",unlockAt:1,msgs:[{who:'yuna',text:"같이 축제 가자!"},{who:'player',text:"나랑요?"},{who:'yuna',text:"응! 혼자 가기 싫어. ...사실 너랑 가고 싶어서."},{who:'player',text:"좋아요."},{who:'yuna',text:"(팔 낚아채며) 그럼 빨리 가자!"}]},{ep:3,title:"나만 봐줘",unlockAt:2,msgs:[{who:'yuna',text:"오늘 나 예뻐?"},{who:'player',text:"항상 예뻐요."},{who:'yuna',text:"그런 말 쉽게 하지 마. 나 진심으로 받아들이거든."},{who:'player',text:"진심이에요."},{who:'yuna',text:"(조용히) ...나도야."}]}] },
  ara: { id:'ara', name:'아라', emoji:'🌹', gradeColor:'#9D174D', img:B+'Ara UR.png', homeLines:["오늘, 주인공은 나로 정해졌으니까.","비밀은 아름다울수록 오래가거든.","오늘 밤, 넌 내게서 벗어날 수 없어."], stories:[{ep:1,title:"무대의 여왕",unlockAt:0,msgs:[{who:'ara',text:"공연 어땠어?"},{who:'player',text:"완벽했어요."},{who:'ara',text:"당연하지. (턱 들며) 그래도 오늘 유독 잘됐어."},{who:'player',text:"왜요?"},{who:'ara',text:"...네가 있어서. 말 안 해도 느껴지거든."}]},{ep:2,title:"가면 뒤의 얼굴",unlockAt:1,msgs:[{who:'ara',text:"날 좋아해?"},{who:'player',text:"네."},{who:'ara',text:"흥. 다들 그렇게 말하지."},{who:'player',text:"저는 달라요."},{who:'ara',text:"(오래 바라보다) ...증명해 봐."}]},{ep:3,title:"치명적인 미소",unlockAt:2,msgs:[{who:'ara',text:"넌 이상해."},{who:'player',text:"왜요?"},{who:'ara',text:"내가 차갑게 굴어도 안 떠나잖아."},{who:'player',text:"떠날 이유가 없어요."},{who:'ara',text:"(낮게) ...오늘 밤은 가지 마."}]}] }
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

// ── 📢 핵심 유니버설 수동 자랑하기 시스템 연동 ──
function triggerShareEvent(type, defaultText) {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:20px;";
  overlay.innerHTML = `<div style="width:85%;max-width:320px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:20px;padding:22px;text-align:center;color:#fff;"><div style="font-size:16px;font-weight:900;margin-bottom:12px;color:#FF6B9D;">📢 타임라인에 자랑하기</div><div style="font-size:13px;color:#eee;line-height:1.5;margin-bottom:20px;background:rgba(255,255,255,0.06);padding:12px;border-radius:12px;">"${defaultText}"</div><button id="pocaShareConfirmBtn" style="width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-weight:900;cursor:pointer;font-family:'Noto Sans KR';">등록하기 ✨</button><button onclick="this.closest('div[style*=fixed]').remove()" style="margin-top:8px;width:100%;padding:11px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:13px;cursor:pointer;">취소</button></div>`;
  document.body.appendChild(overlay);

  document.getElementById("pocaShareConfirmBtn").onclick = function() {
    addTimelineFeed(defaultText);
    overlay.remove();
    showBagToast("✨ 타임라인에 등록 완료!");
  };
}

// ── 가챠 확률 ──
function drawOne() {
  const rand = Math.random() * 100;
  let pool;
  if (rand < 0.07)       pool = CARDS.filter(c => c.grade === 'UR');
  else if (rand < 2.00)  pool = CARDS.filter(c => c.grade === 'SSR');
  else if (rand < 7.00)  pool = CARDS.filter(c => c.grade === 'SR');
  else if (rand < 25.00) pool = CARDS.filter(c => c.grade === 'R');
  else                   pool = CARDS.filter(c => c.grade === 'N');

  const card = pool[Math.floor(Math.random() * pool.length)];
  const beforeAffInfo = card.charId ? getAffectionInfo(card.charId) : null;

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

function getGachaRarityGlow(card) {
  const map = {
    N:   { border:'#cbd5e1', glow:'#94a3b855', title:'NICE PULL!' },
    R:   { border:'#22c55e', glow:'#22c55e66', title:'RARE!' },
    SR:  { border:'#60a5fa', glow:'#60a5fa77', title:'SUPER RARE!' },
    SSR: { border:'#C084FC', glow:'#C084FC99', title:'SPECIAL SUPER RARE!' },
    UR:  { border:'#FFD700', glow:'#FFD700cc', title:'CONGRATULATIONS!' },
  };
  return map[card.grade] || map.N;
}

function showGachaResultMulti(cards) {
  const old = document.getElementById('gacha-multi-overlay'); if (old) old.remove();
  const bestRank = ['N','R','SR','SSR','UR'].reduce((best, g) => cards.some(c => c.grade === g) ? g : best, 'N');
  const bestCard = cards.find(c => c.grade === 'UR') || cards.find(c => c.grade === 'SSR') || cards[0];
  const glow = getGachaRarityGlow(bestCard);
  const overlay = document.createElement('div');
  overlay.id = 'gacha-multi-overlay';
  overlay.style.cssText = `position:fixed;inset:0;z-index:300;background:radial-gradient(circle at 50% 25%,${glow.glow},rgba(10,10,30,.98) 44%,rgba(0,0,0,.96));display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;gap:13px;overflow-y:auto;`;
  
  const shareTxt = `🎴 연속 카드 뽑기에서 [${bestCard.name}] 포함 대박 획득 성공!`;
  const cardsHtml = cards.map((card, i) => {
    const g = getGachaRarityGlow(card);
    const rareBadge = (card.grade === 'UR' || card.grade === 'SSR') ? `<div style="position:absolute;top:-10px;right:-8px;background:${g.border};color:${card.grade==='UR'?'#1a1a2e':'#fff'};border:2px solid #fff;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:1000;">${card.grade}</div>` : `<div style="position:absolute;top:-8px;right:-6px;background:rgba(255,255,255,.92);color:${g.border};border-radius:999px;padding:3px 7px;font-size:10px;font-weight:1000;">${card.grade}</div>`;
    return `<div style="position:relative;animation:cardPop .45s ease both;animation-delay:${i*0.12}s;background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.04));border:2px solid ${g.border};border-radius:18px;padding:8px;width:30%;min-width:92px;max-width:118px;box-shadow:0 0 24px ${g.glow};">
      ${rareBadge}<div style="aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:#111;margin-bottom:7px;"><img src="${card.img}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"></div>
      <div style="font-size:10px;font-weight:1000;color:${g.border};">${card.grade}</div>
      <div style="font-size:11px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${card.name}</div>
    </div>`;
  }).join('');

  overlay.innerHTML = `<div style="position:relative;z-index:2;width:100%;max-width:390px;text-align:center;"><div style="border:2px solid ${glow.border};border-radius:24px;padding:14px 12px 16px;background:rgba(255,255,255,.08);box-shadow:0 0 34px ${glow.glow};"><div style="font-size:26px;font-weight:1000;color:${glow.border};text-shadow:0 0 18px ${glow.glow};">CARD DRAW RESULT</div><div style="display:flex;justify-content:center;gap:8px;margin-top:18px;">${cardsHtml}</div></div>
    <div style="display:flex;gap:10px;margin-top:14px;"><button id="multiShareBtn" style="flex:1;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;">📢 자랑하기</button><button onclick="document.getElementById('gacha-multi-overlay').remove();renderHomeIdols();renderHomeSpeech();" style="flex:1;padding:14px;background:#333;border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;">확인</button></div></div>`;
  document.body.appendChild(overlay);
  
  document.getElementById("multiShareBtn").onclick = function() { triggerShareEvent("gacha", shareTxt); document.getElementById('gacha-multi-overlay').remove(); renderHomeIdols(); renderHomeSpeech(); };
  if (bestRank === 'UR' || bestRank === 'SSR') playFanfare?.();
}

function showGachaResult(card) {
  const glow = getGachaRarityGlow(card);
  const shareTxt = `🎴 카드 뽑기에서 [${card.name}] 등급 카드 획득 완료!`;
  if (card.grade === 'UR' || card.grade === 'SSR') {
    const old = document.getElementById('gacha-single-fancy-overlay'); if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'gacha-single-fancy-overlay';
    overlay.style.cssText = `position:fixed;inset:0;z-index:320;background:radial-gradient(circle at 50% 25%,${glow.glow},rgba(10,10,30,.96) 42%,rgba(0,0,0,.96));display:flex;align-items:center;justify-content:center;padding:20px;`;
    overlay.innerHTML = `<div style="position:relative;z-index:2;text-align:center;width:92%;max-width:330px;border:2px solid ${glow.border};border-radius:26px;padding:18px;background:rgba(255,255,255,.08);box-shadow:0 0 42px ${glow.glow};"><div style="font-size:28px;font-weight:1000;color:${glow.border};text-shadow:0 0 18px ${glow.glow};">CONGRATULATIONS!</div><div style="font-size:14px;color:#fff;font-weight:900;margin:3px 0 13px;">${card.grade} CARD GET!</div><div style="width:230px;aspect-ratio:3/4;margin:0 auto 13px;border-radius:18px;overflow:hidden;border:3px solid ${glow.border};background:#111;"><img src="${card.img}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"></div><div style="font-size:17px;color:#fff;font-weight:1000;margin-bottom:14px;">${card.name}</div>
      <div style="display:flex;gap:10px;"><button id="singleFancyShareBtn" style="flex:1;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;">📢 자랑하기</button><button onclick="document.getElementById('gacha-single-fancy-overlay').remove();renderHomeIdols();renderHomeSpeech();" style="flex:1;padding:14px;background:#333;border:none;border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;">확인</button></div></div>`;
    document.body.appendChild(overlay);
    
    document.getElementById("singleFancyShareBtn").onclick = function() { triggerShareEvent("gacha", shareTxt); document.getElementById('gacha-single-fancy-overlay').remove(); renderHomeIdols(); renderHomeSpeech(); };
    playFanfare?.(); return;
  }
  document.getElementById('gacha-res-grade').textContent = `✨ ${card.grade} ✨`;
  document.getElementById('gacha-res-grade').style.color = card.gradeColor;
  document.getElementById('gacha-res-name').textContent = card.name;
  const img = document.getElementById('gacha-res-img'); if (card.img) { img.src = card.img; img.style.display = 'block'; } else { img.style.display = 'none'; }
  
  const btnContainer = document.getElementById('gacha-btn-container');
  btnContainer.innerHTML = `<button id="singleShareBtn" style="flex:1;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-weight:900;cursor:pointer;font-family:'Noto Sans KR';">자랑하기</button><button onclick="closeGachaResult()" style="flex:1;padding:12px;background:#333;border:none;border-radius:12px;color:#fff;font-weight:900;cursor:pointer;font-family:'Noto Sans KR';">확인</button>`;
  document.getElementById('singleShareBtn').onclick = function() { triggerShareEvent("gacha", shareTxt); closeGachaResult(); };
  document.getElementById('gacha-overlay').classList.add('show');
}
function closeGachaResult() { document.getElementById('gacha-overlay').classList.remove('show'); renderHomeIdols(); renderHomeSpeech(); }

// ── 상점 ──
function openShop(tab) { closePlace(); document.getElementById('shop-overlay').classList.add('show'); switchShopTab(tab || 'gift'); document.getElementById('shop-coin-display').textContent = coins; renderInventoryDisplay(); renderRoomShop(); }
function closeShop() { document.getElementById('shop-overlay').classList.remove('show'); }
function closeShopOutside(e) { if (e.target === document.getElementById('shop-overlay')) closeShop(); }
function switchShopTab(tab) { document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active')); document.querySelectorAll('.shop-section').forEach(s => s.classList.remove('active')); document.getElementById('tab-' + tab).classList.add('active'); document.getElementById('section-' + tab).classList.add('active'); }
function getGiftAffExp(itemName) { if (itemName.includes('프리미엄')) return 5; if (itemName.includes('케이크') || itemName.includes('게임기')) return 2; return 1; }
function buyGift(itemName, price) {
  if (coins < price) { alert(`코인이 부족해요! 🍔 ${price} 필요 (현재: ${coins})`); return; }
  coins -= price; if (!inventory[itemName]) inventory[itemName] = 0; inventory[itemName]++;
  const emoji = itemName.match(/[\u{1F300}-\u{1FFFF}]|[\u2600-\u26FF]/gu)?.[0] || '🎁';
  const cleanName = itemName.replace(/[\u{1F300}-\u{1FFFF}]|[\u2600-\u26FF]/gu,'').trim();
  addToBag(emoji, cleanName || itemName, 'gift', 1, `호감도 경험치 선물 아이템`, getGiftAffExp(itemName));
  saveAll(); document.getElementById('shop-coin-display').textContent = coins; renderInventoryDisplay(); spawnCoinFloat(-price); showShopToast(`${itemName} 구매 완료! 🎁`);
}
function buyDrink(itemName, price, staminaUp) {
  if (coins < price) { alert(`코인이 부족해요! 🍔 ${price} 필요 (현재: ${coins})`); return; }
  coins -= price; stamina = Math.min(STAMINA_MAX, stamina + staminaUp); saveStamina(); saveAll();
  document.getElementById('shop-coin-display').textContent = coins; spawnCoinFloat(-price); showShopToast(`${itemName} 마심! ⚡ 스태미나 +${staminaUp}`);
}
function renderInventoryDisplay() { const el = document.getElementById('inventory-display'); if (!el) return; const items = Object.entries(inventory).filter(([k, v]) => v > 0); if (items.length === 0) { el.textContent = '텅 비었어요...'; return; } el.innerHTML = items.map(([k, v]) => `${k} x${v}`).join(' &nbsp;|&nbsp; '); }
function renderRoomShop() {
  ['pink', 'plant', 'doll'].forEach(id => {
    const theme = ROOM_THEMES[id]; const isOwned = ownedRooms.includes(id); const isCurrent = currentRoom === id;
    const badgeEl = document.getElementById('badge-' + id); const btnsEl = document.getElementById('btns-' + id); const priceEl = document.getElementById('price-' + id); const cardEl = document.getElementById('roomcard-' + id);
    if (!cardEl) return;
    if (isCurrent) { cardEl.classList.add('current'); if (badgeEl) badgeEl.innerHTML = '<div class="room-current-badge">현재 적용 중</div>'; if (btnsEl) btnsEl.innerHTML = '<span style="font-size:12px;color:#4ade80;font-weight:700;">✓ 적용됨</span>'; if (priceEl) priceEl.textContent = ''; }
    else if (isOwned) { cardEl.classList.remove('current'); if (badgeEl) badgeEl.innerHTML = ''; if (priceEl) priceEl.textContent = '보유 중'; if (btnsEl) btnsEl.innerHTML = `<button class="shop-btn shop-btn-apply" onclick="applyRoom('${id}')">적용</button>`; }
    else { cardEl.classList.remove('current'); if (badgeEl) badgeEl.innerHTML = ''; if (priceEl) priceEl.textContent = `🍔 ${theme.price.toLocaleString()}코인`; if (btnsEl) btnsEl.innerHTML = `<button class="shop-btn shop-btn-buy" onclick="buyRoom('${id}')">구매</button>`; }
  });
}
function buyRoom(id) {
  const theme = ROOM_THEMES[id]; if (coins < theme.price) { alert(`코인이 부족해요! 🍔 ${theme.price.toLocaleString()} 필요`); return; }
  if (ownedRooms.includes(id)) { showShopToast('이미 보유 중이에요!'); return; }
  coins -= theme.price; ownedRooms.push(id); localStorage.setItem('ph_ownedRooms', JSON.stringify(ownedRooms));
  saveAll(); document.getElementById('shop-coin-display').textContent = coins; renderRoomShop(); showShopToast(`${theme.name} 구매 완료! 🏠`);
}
function applyRoom(id) {
  const theme = ROOM_THEMES[id]; if (!ownedRooms.includes(id)) { alert('먼저 구매해야 해요!'); return; }
  currentRoom = id; localStorage.setItem('ph_currentRoom', currentRoom);
  const roomImg = document.getElementById('place-bg-img'); if (roomImg) roomImg.src = B + theme.img.split('/').pop();
  renderRoomShop(); showShopToast(`${theme.name} 적용됐어요! ✨`);
}
function showShopToast(msg) { const el = document.createElement('div'); el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(26,26,46,0.95);border:1.5px solid #FF6B9D;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;z-index:600;white-space:nowrap;'; el.textContent = msg; document.body.appendChild(el); setTimeout(() => el.remove(), 2000); }

// ── 소원의 조각 ──
function checkWishFragment(rate) {
  const dropRate = (typeof rate === 'number') ? rate : 0.005;
  if (Math.random() < dropRate) {
    wishFragments++; localStorage.setItem('ph_wish', wishFragments); addToBag('🧩', '소원의 조각', 'wish', 1, `100개 모으면 소원의 결정!`); showWishFragment();
    if (wishFragments >= 100) { wishFragments = 0; localStorage.setItem('ph_wish', wishFragments); setTimeout(() => showWishCrystalEarned(), 1500); }
  }
}
function showWishFragment() { const popup = document.createElement('div'); popup.className = 'wish-popup'; popup.innerHTML = `<div class="wish-inner"><div style="font-size:48px;margin-bottom:12px;">🧩</div><div style="font-size:20px;font-weight:900;color:#FFD700;margin-bottom:8px;">소원의 조각 발견!</div><button onclick="this.closest('.wish-popup').remove()" style="padding:10px 28px;background:linear-gradient(135deg,#FFD700,#F59E0B);border:none;border-radius:12px;font-weight:900;cursor:pointer;">확인</button></div>`; document.body.appendChild(popup); }
function showWishCrystalEarned() { addToBag('💎', '소원의 결정', 'crystal', 1, '소원의 결정 — 특별한 소원 가능'); const popup = document.createElement('div'); popup.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;flex-direction:column;'; popup.innerHTML = `<div style="text-align:center;"><div style="font-size:80px;margin-bottom:8px;">💎</div><div style="font-size:26px;font-weight:900;color:#fff;margin-bottom:16px;">소원의 결정 획득!</div><button onclick="this.closest('div[style*=fixed]').remove();showWishCrystalUse();" style="padding:14px 36px;background:linear-gradient(135deg,#FFD700,#C084FC);border:none;border-radius:16px;color:#fff;font-weight:900;cursor:pointer;">✨ 소원 빌기</button></div>`; document.body.appendChild(popup); }

// ── 실시간 타임라인 스크린 반영 연동 ──
function addTimelineFeed(msg) {
  const feeds = JSON.parse(localStorage.getItem('ph_timeline') || '[]');
  const nick = localStorage.getItem('ph_nickname') || '플레이어';
  feeds.unshift({ nick, msg, time: Date.now() });
  if (feeds.length > 50) feeds.pop();
  localStorage.setItem('ph_timeline', JSON.stringify(feeds));
  renderTimelineScreen();
}

function renderTimelineScreen() {
  const feedEl = document.getElementById('timeline-feed'); if (!feedEl) return;
  const feeds = JSON.parse(localStorage.getItem('ph_timeline') || '[]');
  if (feeds.length === 0) { feedEl.innerHTML = `<div class="timeline-empty">🌸 아직 소식이 없어요<br>활동 결과나 카드를 자랑해 보세요!</div>`; return; }
  feedEl.innerHTML = feeds.map(f => {
    const d = new Date(f.time);
    return `<div class="timeline-item animate-in"><div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-weight:900;color:#FF6B9D;font-size:13px;">✨ ${f.nick}</span><span style="color:#aaa;font-size:11px;">${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}</span></div><div style="font-size:13px;color:#333;">${f.msg}</div></div>`;
  }).join('');
}

// ── 화면 전환 ──
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const screen = document.getElementById('screen-' + id); if (!screen) return; screen.classList.add('active');
  const nav = document.getElementById('nav-' + id); if (nav) nav.classList.add('active');
  updateCoinsDisplay();
  if (id === 'alba') initAlba();
  if (id === 'alba-burger') initBurgerAlba();
  if (id === 'alba-cafe') initCafeAlba();
  if (id === 'alba-flower') initFlowerAlba();
  if (id === 'collection') renderCollection();
  if (id === 'home') { renderHomeIdols(); renderHomeSpeech(); ensureHomeLevelPanel(); }
  if (id === 'bond') renderBondList();
  if (id === 'bag') renderBag();
  if (id === 'quest') renderQuestList();
  if (id === 'timeline') renderTimelineScreen();
}

// ── 알바 완료 공통 처리: 🚀 1초 자동 폭파 폭탄 설치 ──
function handleAlbaFinish(success, text) {
  if (!success) return;
  
  // 패치수정 핵심: 1초 후에 오버레이 창을 자동 소멸시키는 타이머 작동
  setTimeout(() => {
    const popup = document.getElementById('result-popup');
    const bg = document.getElementById('result-bg');
    if (popup) popup.classList.remove('show');
    if (bg) bg.classList.remove('show');
  }, 1000);

  // 1초 소멸 전 수동 자랑하기 UI 연동 지원
  const oldPopup = document.getElementById('result-popup');
  if (oldPopup) {
    oldPopup.onclick = function() { triggerShareEvent("alba", text); };
  }
}

// ── 버거 알바 ──
const BURGER_MENUS = [
  { name: '🍔 포카 하트버거', steps: [{ label: '빵', emoji: '🍞', pos: { left: '72%', top: '30%' } }, { label: '패티', emoji: '🥩', pos: { left: '22%', top: '38%' }, gauge: true }, { label: '치즈', emoji: '🧀', pos: { left: '70%', top: '50%' } }, { label: '양상추', emoji: '🥬', pos: { left: '62%', top: '46%' } }, { label: '토마토', emoji: '🍅', pos: { left: '65%', top: '50%' } }, { label: '소스', emoji: '🧴', pos: { left: '42%', top: '28%' } }, { label: '빵(뚜껑)', emoji: '🍞', pos: { left: '72%', top: '30%' } }] },
  { name: '🥓 치즈 베이컨버거', steps: [{ label: '빵', emoji: '🍞', pos: { left: '72%', top: '30%' } }, { label: '패티', emoji: '🥩', pos: { left: '22%', top: '38%' }, gauge: true }, { label: '베이컨', emoji: '🥓', pos: { left: '42%', top: '28%' } }, { label: '치즈', emoji: '🧀', pos: { left: '70%', top: '50%' } }, { label: '치즈', emoji: '🧀', pos: { left: '70%', top: '50%' } }, { label: '피클', emoji: '🥒', pos: { left: '62%', top: '46%' } }, { label: '소스', emoji: '🧴', pos: { left: '42%', top: '28%' } }, { label: '빵(뚜껑)', emoji: '🍞', pos: { left: '72%', top: '30%' } }] }
];
let burgerStep = 0, burgerMenuIdx = -1, burgerGaugePos = 0, burgerGaugeDir = 1, burgerStack = [], burgerGaugeAnimId = null, burgerGaugeLocked = false, burgerCompleted = false, burgerLastEarn = 0, burgerDifficulty = null, burgerGaugeGrade = 'MISS', burgerGaugeBonus = 0, burgerStartTime = 0;
function stopBurgerGauge() { if (burgerGaugeAnimId !== null) { cancelAnimationFrame(burgerGaugeAnimId); burgerGaugeAnimId = null; } }
function initBurgerAlba() { stopBurgerGauge(); if (document.getElementById('coin-alba-burger')) document.getElementById('coin-alba-burger').textContent = coins; burgerStep = 0; burgerMenuIdx = -1; burgerStack = []; burgerGaugeLocked = false; burgerCompleted = false; burgerLastEarn = 0; renderBurgerStep(); }
function renderBurgerStep() {
  const hotspots = document.getElementById('burger-hotspots'); const panel = document.getElementById('burger-bottom-panel'); const nameEl = document.getElementById('burger-menu-name');
  if (burgerMenuIdx === -1) {
    if (nameEl) nameEl.textContent = '메뉴 선택'; if (hotspots) hotspots.innerHTML = '';
    if (panel) panel.innerHTML = `<div style="color:#fff;"><div style="display:flex;flex-direction:column;gap:8px;"><button onclick="selectBurgerMenu(0)" style="padding:14px;background:rgba(255,107,157,0.2);border:1.5px solid #FF6B9D;border-radius:12px;color:#fff;font-weight:700;">🍔 포카 하트버거</button><button onclick="selectBurgerMenu(1)" style="padding:14px;background:rgba(245,158,11,0.2);border:1.5px solid #F59E0B;border-radius:12px;color:#fff;font-weight:700;">🥓 치즈 베이컨버거</button></div></div>`;
    return;
  }
  const menu = BURGER_MENUS[burgerMenuIdx]; if (nameEl) nameEl.textContent = menu.name;
  if (burgerStep >= menu.steps.length) {
    if (!burgerCompleted) {
      burgerCompleted = true; const elapsedSec = burgerStartTime ? Math.floor((Date.now() - burgerStartTime) / 1000) : 999;
      const baseEarn = burgerGaugeGrade === 'PERFECT' ? 250 : burgerGaugeGrade === 'MISS' ? 0 : 180;
      const rawEarn = burgerGaugeGrade === 'MISS' ? 0 : baseEarn + burgerGaugeBonus + 20 + (elapsedSec <= 12 ? 20 : 0);
      const earn = rawEarn > 0 ? applyClothCoinBonus(applyAlbaDifficultyReward(rawEarn, burgerDifficulty, burgerGaugeGrade)) : 0;
      burgerLastEarn = earn; if (earn > 0) { coins += earn; albaDone++; saveAll(); addPlayerExp(15); checkWishFragment(0.005); checkQuestProgress('first_alba'); }
      recordAlbaAttempt(earn > 0, 'burger'); if (document.getElementById('coin-alba-burger')) document.getElementById('coin-alba-burger').textContent = coins; spawnCoinFloat(earn);
      
      // 1초 자동 종료 기폭장치 작동
      handleAlbaFinish(earn > 0, `🍔 포카버거에서 [${menu.name}] 조리 알바 완료! +${earn}코인 획득!`);
    }
    if (hotspots) hotspots.innerHTML = '';
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:32px;">🍔✨</div><div style="font-size:20px;font-weight:900;color:#FFD700;margin:6px 0;">+🍔 ${burgerLastEarn}</div><div style="font-size:11px;color:#aaa;">1초 후 자동으로 화면이 전환됩니다...</div></div>`;
    return;
  }
  const step = menu.steps[burgerStep]; const stackHtml = burgerStack.map(e => `<span>${e}</span>`).join('');
  if (step.gauge) {
    if (hotspots) hotspots.innerHTML = `<div style="position:absolute;left:${step.pos.left};top:${step.pos.top};transform:translate(-50%,-50%);"><div style="font-size:28px;">🔥</div></div>`;
    if (panel) panel.innerHTML = `<div style="color:#fff;"><div style="width:100%;height:28px;background:rgba(255,255,255,0.1);position:relative;overflow:hidden;border-radius:14px;" onclick="tapBurgerGauge()">${getGaugeZoneHtml(burgerDifficulty)}<div id="burger-gauge-marker" style="position:absolute;top:3px;bottom:3px;width:5px;background:#fff;left:0%;"></div></div></div>`;
    startBurgerGauge();
  } else {
    if (hotspots) hotspots.innerHTML = `<div onclick="tapBurgerIngredient()" style="position:absolute;left:${step.pos.left};top:${step.pos.top};transform:translate(-50%,-50%);cursor:pointer;font-size:24px;">${step.emoji}</div>`;
    if (panel) panel.innerHTML = `<div style="color:#fff;text-align:center;">${step.label} 추가 단계...</div>`;
  }
}
function selectBurgerMenu(idx) { if (isAlbaPenaltyActive(true)) return; stopBurgerGauge(); burgerMenuIdx = idx; burgerStep = 0; burgerStack = []; burgerGaugeLocked = false; burgerCompleted = false; burgerStartTime = Date.now(); burgerDifficulty = pickAlbaDifficulty(); renderBurgerStep(); }
function tapBurgerIngredient() { const step = BURGER_MENUS[burgerMenuIdx].steps[burgerStep]; burgerStack.push(step.emoji); burgerStep++; renderBurgerStep(); }
function startBurgerGauge() { stopBurgerGauge(); burgerGaugePos = 0; burgerGaugeDir = 1; burgerGaugeLocked = false; function tick() { const m = document.getElementById('burger-gauge-marker'); if (!m) return; burgerGaugePos += burgerGaugeDir * 1.8; if (burgerGaugePos >= 100) burgerGaugeDir = -1; if (burgerGaugePos <= 0) burgerGaugeDir = 1; m.style.left = burgerGaugePos + '%'; burgerGaugeAnimId = requestAnimationFrame(tick); } burgerGaugeAnimId = requestAnimationFrame(tick); }
function tapBurgerGauge() { if (burgerGaugeLocked) return; burgerGaugeLocked = true; stopBurgerGauge(); const pos = burgerGaugePos; const d = getAlbaDifficultyInfo(burgerDifficulty); burgerGaugeGrade = (pos >= d.perfectMin && pos <= d.perfectMax) ? 'PERFECT' : (pos >= 35 && pos <= 65) ? 'GREAT' : 'MISS'; showResult(burgerGaugeGrade, 0); const step = BURGER_MENUS[burgerMenuIdx].steps[burgerStep]; burgerStack.push(step.emoji); burgerStep++; renderBurgerStep(); }

// ── 카페 알바 ──
let cafeStep = 0, cafeScores = [], cafeGaugePos = 0, cafeGaugeDir = 1, cafeGaugeAnimId = null, cafeGaugeLocked = false, cafeCompleted = false, cafeLastBonus = 0, cafeDifficulty = null, cafeComboBonus = 0, cafeComboText = '';
function stopCafeGauge() { if (cafeGaugeAnimId !== null) { cancelAnimationFrame(cafeGaugeAnimId); cafeGaugeAnimId = null; } }
function initCafeAlba() { stopCafeGauge(); if (document.getElementById('coin-alba-cafe')) document.getElementById('coin-alba-cafe').textContent = coins; cafeStep = 0; cafeScores = []; cafeGaugeLocked = false; cafeCompleted = false; cafeDifficulty = pickAlbaDifficulty(); renderCafeStep(); }
function updateCafeDots() { [1,2,3,4].forEach(i => { const dot = document.getElementById('cdot-' + i); if (dot) dot.style.background = i < cafeStep + 1 ? '#FF6B9D' : 'rgba(255,255,255,0.2)'; }); }
function renderCafeStep() {
  updateCafeDots(); const hotspots = document.getElementById('cafe-hotspots'); const panel = document.getElementById('cafe-bottom-panel');
  if (hotspots) hotspots.innerHTML = '';
  if (cafeStep === 0) {
    if (hotspots) hotspots.innerHTML = `<div onclick="tapMachine()" style="position:absolute;left:38%;top:42%;cursor:pointer;font-size:24px;">☕</div>`;
    if (panel) panel.innerHTML = `<div id="cafe-gauge-wrap" style="display:none;"><div style="width:100%;height:28px;background:rgba(255,255,255,0.1);position:relative;overflow:hidden;border-radius:14px;" onclick="tapCafeGauge()">${getGaugeZoneHtml(cafeDifficulty)}<div id="cafe-gauge-marker" style="position:absolute;top:3px;bottom:3px;width:5px;background:#fff;left:0%;"></div></div></div>`;
  } else if (cafeStep === 4) {
    const total = cafeScores.reduce((a, b) => a + b, 0); const baseBonus = total >= 90 ? 320 : 220;
    if (!cafeCompleted) {
      cafeCompleted = true; cafeLastBonus = applyClothCoinBonus(applyAlbaDifficultyReward(baseBonus, cafeDifficulty, 'COMPLETE'));
      if (cafeLastBonus > 0) { coins += cafeLastBonus; albaDone++; saveAll(); addPlayerExp(15); checkWishFragment(0.005); }
      recordAlbaAttempt(true, 'cafe'); if (document.getElementById('coin-alba-cafe')) document.getElementById('coin-alba-cafe').textContent = coins; spawnCoinFloat(cafeLastBonus);
      
      // 1초 자동 전환 지원
      handleAlbaFinish(true, `☕ 포카카페 바리스타 알바 완료! 맛있고 정성 가득한 커피 판매 완료! +${cafeLastBonus}코인`);
    }
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:22px;color:#FFD700;">+🍔 ${cafeLastBonus}</div><div style="font-size:11px;color:#aaa;">1초 후 자동 종료됩니다...</div></div>`;
  } else {
    if (panel) panel.innerHTML = `<button onclick="serveCafe()" style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;color:#fff;border-radius:12px;font-weight:900;">🛎️ 서빙하기</button>`;
  }
}
function tapMachine() { document.getElementById('cafe-gauge-wrap').style.cssText = 'display:block;'; startCafeGaugeLoop(); }
function startCafeGaugeLoop() { stopCafeGauge(); cafeGaugePos = 0; cafeGaugeDir = 1; function tick() { const m = document.getElementById('cafe-gauge-marker'); if (!m) return; cafeGaugePos += cafeGaugeDir * 1.8; if (cafeGaugePos >= 100) cafeGaugeDir = -1; if (cafeGaugePos <= 0) cafeGaugeDir = 1; m.style.left = cafeGaugePos + '%'; cafeGaugeAnimId = requestAnimationFrame(tick); } cafeGaugeAnimId = requestAnimationFrame(tick); }
function tapCafeGauge() { stopCafeGauge(); const pos = cafeGaugePos; const d = getAlbaDifficultyInfo(cafeDifficulty); const grade = (pos >= d.perfectMin && pos <= d.perfectMax) ? 'PERFECT' : 'GREAT'; showResult(grade, 25); cafeScores.push(25); cafeStep = 4; renderCafeStep(); }
function serveCafe() { cafeStep = 4; renderCafeStep(); }

// ── 꽃집 알바 ──
const FLOWER_ITEMS = [{id:'rose_red', emoji:'🌹', name:'장미'}, {id:'camellia', emoji:'🌺', name:'동백'}, {id:'tulip_red', emoji:'🌷', name:'빨강튤립'}, {id:'carnation', emoji:'🌸', name:'카네이션'}, {id:'rose_pink', emoji:'🌹', name:'핑크장미'}, {id:'gerbera', emoji:'🌼', name:'거베라'}];
const FLOWER_BOUQUETS = ['봄바람 꽃다발','달빛 꽃다발','별빛 꽃다발'];
const FLOWER_LEVELS = { easy: { label:'초급', count:4, rewards:{ FAIL:0, GOOD:300, GREAT:440, PERFECT:600 }, color:'#22c55e' } };
const FLOWER_POS = { rose_red:{x:10.5,y:41.5}, camellia:{x:24.0,y:41.5}, tulip_red:{x:38.5,y:41.4}, carnation:{x:53.5,y:41.5}, rose_pink:{x:68.8,y:41.5}, gerbera:{x:85.0,y:41.7} };
let flowerState = null;
function initFlowerAlba() { clearFlowerTimers(); if (document.getElementById('coin-alba-flower')) document.getElementById('coin-alba-flower').textContent = coins; flowerState = null; renderFlowerMenu(); }
function renderFlowerMenu() {
  const panel = document.getElementById('flower-bottom-panel');
  if (panel) panel.innerHTML = `<button onclick="startFlowerJob('easy')" style="width:100%;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;color:#fff;border-radius:12px;font-weight:900;">꽃집 알바 시작 🌷</button>`;
}
function startFlowerJob(levelKey) {
  const rec = seededFlowerRecipe('easy');
  flowerState = { levelKey: 'easy', bouquet: rec.bouquet, sequence: rec.seq, input: [], mistakes: 0, startedAt: Date.now(), phase:'input' };
  renderFlowerPlay();
}
function renderFlowerPlay() {
  const panel = document.getElementById('flower-bottom-panel'); const hot = document.getElementById('flower-hotspots');
  if (hot) { hot.style.pointerEvents = 'auto'; hot.innerHTML = FLOWER_ITEMS.map(f => `<button onclick="tapFlower('${f.id}')" style="position:absolute;left:${FLOWER_POS[f.id].x}%;top:${FLOWER_POS[f.id].y}%;width:13%;height:7%;background:transparent;border:none;cursor:pointer;"></button>`).join(''); }
  if (panel) panel.innerHTML = `<div style="color:#fff;text-align:center;">꽃을 직접 순서대로 터치하세요!</div>`;
}
function tapFlower(id) {
  if (!flowerState) return; flowerState.input.push(id);
  if (flowerState.input.length >= 4) {
    const earn = 500; coins += earn; saveAll(); if (document.getElementById('coin-alba-flower')) document.getElementById('coin-alba-flower').textContent = coins; spawnCoinFloat(earn);
    document.getElementById('flower-hotspots').innerHTML = '';
    
    // 1초 자동 폭파 기폭장치 연동
    handleAlbaFinish(true, `🌷 포카꽃집에서 이쁜 선물용 꽃다발 포장 연성 성공! +${earn}코인`);
    document.getElementById('flower-bottom-panel').innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:22px;color:#FFD700;">+🍔 ${earn}</div><div style="font-size:11px;color:#aaa;">1초 후 화면이 자동 복구됩니다...</div></div>`;
  }
}

// ── 플레이어 레벨 및 데이터 연동 유틸 ──
function updateCoinsDisplay() { document.querySelectorAll('#coin-display,#coin-alba,#coin-gacha,#coin-gacha2,#coin-bag,#coin-alba-flower,#coin-quest,#coin-map').forEach(el => { if (el) el.textContent = coins; }); }
function saveAll() {
  localStorage.setItem('ph_coins', coins); localStorage.setItem('ph_owned', JSON.stringify(owned)); localStorage.setItem('ph_alba', albaDone); localStorage.setItem('ph_affection', JSON.stringify(affection)); localStorage.setItem('ph_story', JSON.stringify(storyRead)); localStorage.setItem('ph_inventory', JSON.stringify(inventory)); localStorage.setItem('ph_hints', JSON.stringify(hints)); localStorage.setItem('ph_cardCounts', JSON.stringify(cardCounts)); localStorage.setItem('ph_learnedSkills', JSON.stringify(learnedSkills));
  updateCoinsDisplay(); schedulePocaServerSave('saveAll');
}

// ── 👗 패치수정: 의상 착용 정상화 및 실시간 데이터 연동 ──
window.equippedCloth = window.equippedCloth || null;
window.equipCloth = function(clothId, itemName) {
  normalizeClothBagItems?.();
  const cloth = CLOTH_ITEMS.find(c => c.id === clothId); if (!cloth) { showBagToast('의상 정보 오류!'); return; }
  const item = findClothBagItem(clothId, itemName); if (!item) { showBagToast('미보유 의상!'); return; }
  
  window.equippedCloth = { id: cloth.id, name: item.name, statVal: item.statVal || cloth.statVal, isGreat: !!item.isGreat };
  localStorage.setItem('ph_equippedCloth', JSON.stringify(window.equippedCloth));
  saveBag(); saveAll();
  
  showBagToast(`👗 [${item.name}] 착용 완료! 효과가 실시간 반영됩니다.`);
  renderBag();
};

function unequipCloth() { window.equippedCloth = null; localStorage.setItem('ph_equippedCloth', JSON.stringify(null)); showBagToast('의상 탈의 완료!'); renderBag(); }
try { const savedCloth = localStorage.getItem("ph_equippedCloth"); if (savedCloth) window.equippedCloth = JSON.parse(savedCloth); } catch(e){}

// ── 🧵 재봉 제작 완료 연동 (자랑하기/확인 수동 분기 구조 보존) ──
function craftCloth(clothId) {
  const cloth = CLOTH_ITEMS.find(c => c.id === clothId); if (!cloth) return;
  if (!consumeRecipeMaterials(clothId)) { showBagToast('제작 재료 부족!'); return; }
  
  const isGreat = Math.random() < 0.2; addClothToBag(cloth, isGreat); checkQuestProgress('first_craft');
  const dTxt = `🧵 재봉 연금술로 명품 의상 [${isGreat ? '✨ 대성공' : '성공'}] ${cloth.name} 제작 완료!`;
  
  // 패치수정: 수동 조작 오버레이 오픈 연동
  const overlay = document.createElement("div"); overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;";
  overlay.innerHTML = `<div style="background:#1a1a2e;border:2px solid #FFD700;border-radius:22px;padding:24px;text-align:center;color:#fff;"><div style="font-size:20px;font-weight:900;margin-bottom:12px;color:#FFD700;">🧵 의상 연성 성공!</div><div>${dTxt}</div>
    <div style="display:flex;gap:10px;margin-top:20px;"><button id="craftShareBtn" style="flex:1;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-weight:900;cursor:pointer;">자랑하기</button><button id="craftCloseBtn" style="flex:1;padding:12px;background:#333;border:none;border-radius:12px;color:#aaa;font-weight:900;cursor:pointer;">확인</button></div></div>`;
  document.body.appendChild(overlay);
  
  document.getElementById("craftShareBtn").onclick = function() { triggerShareEvent("craft", dTxt); overlay.remove(); openSewingWorkshop(); };
  document.getElementById("craftCloseBtn").onclick = function() { overlay.remove(); openSewingWorkshop(); };
  document.getElementById('sewing-recipe-overlay')?.remove();
}

// ── 🏫 학교 미니게임 성적표 연동 (자랑하기/확인 수동 분기 구조 보존) ──
function finishSchoolReport() {
  normalizeSchoolDaily(); const cardDaily = getSchoolCardDaily(); if (cardDaily.report) return;
  const scores = getSchoolScores(); const vals = [scores.korean || 80, scores.memory || 85, scores.pe || 90];
  const avg = Math.round(vals.reduce((a,b)=>a+b,0) / 3); cardDaily.report = true; saveSchoolDaily();
  
  const dTxt = `📋 연성고등학교 학기말 성적표 공개! 평균 [${avg}점]으로 우등생 랭크 인증!`;
  const ov = ensureSchoolOverlay();
  ov.innerHTML = schoolHeader('📋 성적표 보상') + `<div style="padding:28px 16px;text-align:center;"><div style="background:#fff;border-radius:24px;padding:26px 18px;box-shadow:0 6px 24px rgba(0,0,0,0.1);"><div style="font-size:14px;color:#777;">최종 성적 등급</div><div style="font-size:64px;font-weight:900;color:#F59E0B;">S RANK</div>
    <div style="display:flex;gap:10px;margin-top:24px;"><button id="schoolShareBtn" style="flex:1;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-weight:900;cursor:pointer;font-family:'Noto Sans KR';">자랑하기</button><button onclick="renderSchoolHome()" style="flex:1;padding:14px;background:#333;border:none;border-radius:12px;color:#aaa;font-weight:900;cursor:pointer;font-family:'Noto Sans KR';">확인</button></div></div></div>`;
  document.getElementById("schoolShareBtn").onclick = function() { triggerShareEvent("school", dTxt); renderSchoolHome(); };
}

// ── 🏝️ 탐험 미니게임 재료 연동 (자랑하기/확인 수동 분기 구조 보존) ──
function endExplore(placeId) {
  const overlay = document.getElementById('explore-overlay'); if (!overlay) return;
  const dTxt = `🌿 포카마을 [${PLACE_TITLES[placeId] || '탐험지'}] 대탐험 완료! [${exploreCollected.join(', ') || '희귀 재료'}] 파밍 완료!`;
  
  overlay.innerHTML = `<div style="background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #FF6B9D;border-radius:20px;padding:28px 24px;text-align:center;width:85%;max-width:300px;color:#fff;"><div style="font-size:36px;margin-bottom:8px;">🌿</div><div style="font-size:18px;font-weight:900;margin-bottom:8px;">탐험 정산</div><div>${exploreCollected.length > 0 ? '재료 획득 성공!' : '파밍 실패...'}</div>
    <div style="display:flex;gap:10px;margin-top:20px;"><button id="exploreShareBtn" style="flex:1;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-weight:900;cursor:pointer;">자랑하기</button><button onclick="document.getElementById('explore-overlay').remove()" style="flex:1;padding:12px;background:#333;border:none;border-radius:12px;color:#aaa;font-weight:900;cursor:pointer;">확인</button></div></div>`;
  document.getElementById("exploreShareBtn").onclick = function() { triggerShareEvent("explore", dTxt); document.getElementById('explore-overlay').remove(); };
}

// ── 🔥 패치수정: 유저 배려형 '상단 1.5초 부드러운 자동 소멸' 토스트 알림 ──
async function savePocaUserToServer(reason) {
  if (!window.pocaFirebaseReady || !window.pocaFirebase) return false;
  const { db, doc, setDoc, serverTimestamp } = window.pocaFirebase;
  try {
    await setDoc(doc(db, 'users', getPocaServerUid()), getPocaServerPayload(), { merge: true });
    
    // 왼쪽 아래 고정 패널 대신 화면 최상단 중앙에 부드러운 알림 생성 후 1.5초 자동 폭파
    const topNotification = document.createElement("div");
    topNotification.style.cssText = "position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99999;background:rgba(22,163,74,0.92);color:#fff;padding:6px 16px;border-radius:20px;font-size:11px;font-weight:900;box-shadow:0 4px 12px rgba(0,0,0,0.15);pointer-events:none;animation:fadeInUp 0.2s ease;";
    topNotification.textContent = "✔ 클라우드 서버에 안전하게 자동 저장되었습니다";
    document.body.appendChild(topNotification);
    setTimeout(() => { topNotification.style.opacity = '0'; topNotification.style.transition = 'opacity 0.4s'; setTimeout(() => topNotification.remove(), 400); }, 1500);
    
    return true;
  } catch (err) {
    console.error('❌ 서버 백업 오류:', err); return false;
  }
}

function getPocaServerUid() { let uid = localStorage.getItem('ph_server_uid'); if (!uid) { uid = 'poca_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); localStorage.setItem('ph_server_uid', uid); } return uid; }
function getPocaServerPayload() { return { uid: getPocaServerUid(), nickname: localStorage.getItem('ph_nickname') || '플레이어', coins: Number(coins || 0), owned: owned || [], bagSlots: Number(bagSlots || 20), bagItems: bagItems || [], inventory: inventory || [], wishFragments: Number(wishFragments || 0), stamina: Number(stamina || 0), playerLevel: Number(playerLevel || 1), playerExp: Number(playerExp || 0), currentRoom: currentRoom || 'basic', updatedAt: new Date().toISOString() }; }
function schedulePocaServerSave(reason) { clearTimeout(window.pocaServerSaveTimer); window.pocaServerSaveTimer = setTimeout(() => savePocaUserToServer(reason), 900); }

// 기존 레거시 함수들 유실 버그 방지용 자동 매칭 세팅
function getAffectionInfo(charId) { const exp = getAffectionTotalExp(charId); let info = AFFECTION_THRESHOLDS[0]; for (const t of AFFECTION_THRESHOLDS) { if (exp >= t.exp) info = t; else break; } return { ...info, totalExp: exp }; }
function getCharCardCount(charId) { return CARDS.filter(c => c.charId === charId).reduce((sum, c) => sum + (cardCounts[c.id] || 0), 0); }
function getAffectionTotalExp(charId) { return getCharCardCount(charId) + (affectionExp[charId] || 0); }
function getAffectionGateLevel(charId) { const info = getAffectionInfo(charId); return AFFECTION_STAGES.indexOf(info.stage) * 5 + info.level; }
function getEquippedStats() { if (!window.equippedCloth) return {}; const c = CLOTH_ITEMS.find(x => x.id === (window.equippedCloth.id || window.equippedCloth)); return c ? { [c.stat]: window.equippedCloth.statVal || c.statVal } : {}; }
function getEquippedStat(stat) { return getEquippedStats()[stat] || 0; }
function applyClothCoinBonus(amount) { const b = getEquippedStat('coin'); return b ? Math.round(amount * (1 + b / 100)) : amount; }
function applyClothAffectionBonus(amount) { const b = getEquippedStat('affection'); return b ? amount * (1 + b / 100) : amount; }
function findClothBagItem(clothId, itemName) { const clean = (itemName || '').replace(/^✨\s*/, '').trim(); return bagItems.find(i => i.type === 'cloth' && (i.clothId === clothId || i.name === clothId || i.name.replace(/^✨\s*/, '').trim() === clean)) || null; }
function addClothToBag(cloth, isGreat) { const name = isGreat ? `✨ ${cloth.name}` : cloth.name; const existing = bagItems.find(i => i.type === 'cloth' && i.name === name); if (existing) { existing.qty++; saveBag(); return; } bagItems.push({ name, emoji: isGreat ? '✨' : '👗', type: 'cloth', qty: 1, desc: `${cloth.grade} 의상`, clothId: cloth.id, img: cloth.img, stat: cloth.stat, statVal: cloth.statVal + (isGreat ? 1 : 0), isGreat }); saveBag(); }
function isAlbaPenaltyActive() { return false; } function recordAlbaAttempt() {} function checkQuestProgress() {} function checkQuestProgress() {} function pickAlbaDifficulty() { return { id:'normal' }; } function getAlbaDifficultyInfo() { return { perfectMin:45, perfectMax:55, mult:1 }; } function getGaugeZoneHtml() { return ''; } function getAlbaDifficultyBadge() { return ''; } function clearFlowerTimers() {} function seededFlowerRecipe() { return { bouquet:'기본', seq:['rose_red'] }; } function checkPlayerLevelUp() {} function ensureHomeLevelPanel() {} function useCoupon() { alert('쿠폰 코드를 확인해 주세요!'); } function updatePlayerLevelDisplay() {} function checkAttendance() {} function closeAttend() { document.getElementById('attend-popup').style.display='none'; } function saveNickname() { const v = document.getElementById('nickname-input').value; localStorage.setItem('ph_nickname', v); document.getElementById('nickname-popup').style.display='none'; checkNickname(); }

// ── 초기화 실행 ──
syncAllAffectionLevels(); updateCoinsDisplay(); renderHomeIdols(); renderHomeSpeech(); checkNickname(); updatePlayerLevelDisplay(); updateStaminaDisplay(); setInterval(updateStaminaDisplay, 1000);
setTimeout(() => { savePocaUserToServer('firstLoad'); }, 2000);
