// ── 닉네임 시스템 ──
function checkNickname() {
  const nick = localStorage.getItem('ph_nickname');
  if (!nick) {
    document.getElementById('nickname-popup').style.display = 'flex';
  } else {
    document.getElementById('topbar-nick').textContent = nick;
    checkAttendance();
  }
}
function saveNickname() {
  const input = document.getElementById('nickname-input').value.trim();
  if (input.length < 2) { alert('닉네임은 2자 이상이에요!'); return; }
  localStorage.setItem('ph_nickname', input);
  document.getElementById('nickname-popup').style.display = 'none';
  document.getElementById('topbar-nick').textContent = input;
  checkAttendance();
}

// ── 출석 시스템 ──
const ATTEND_REWARDS = {
  1:  { emoji: '🎁', text: '코인 1000개 + 일반 뽑기권 3장
사과주스 3개', coins: 1000 },
  7:  { emoji: '🌟', text: '소원조각 1개 + 코인 500개', coins: 500 },
  14: { emoji: '🎀', text: '코인 800개 + 스태미나 회복', coins: 800 },
  21: { emoji: '🎴', text: '프리미엄 뽑기권 1장 + 코인 1000개', coins: 1000 },
  28: { emoji: '🖍️', text: '코인 2000개 + 소원조각 3개', coins: 2000 },
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
  const reward = ATTEND_REWARDS[day] || { emoji: '🍔', text: '코인 200개', coins: 200 };
  document.getElementById('attend-day-text').textContent = day + '일차 출석!';
  document.getElementById('attend-reward-emoji').textContent = reward.emoji;
  document.getElementById('attend-reward-text').textContent = reward.text;
  document.getElementById('attend-popup').style.display = 'flex';
  window._attendCoins = reward.coins;
  window._attendDay = day;
}
function closeAttend() {
  document.getElementById('attend-popup').style.display = 'none';
  const reward = ATTEND_REWARDS[window._attendDay] || { coins: 200 };
  coins += reward.coins;
  saveAll();
  spawnCoinFloat(reward.coins);
  if (window._attendDay === 14) { stamina = 100; localStorage.setItem('ph_stamina', 100); }
  if (window._attendDay === 7 || window._attendDay === 28) {
    wishFragments += (window._attendDay === 28 ? 3 : 1);
    localStorage.setItem('ph_wish', wishFragments);
  }
}

// ── 타임라인 ──
let currentCommentPostId = null;
function openComment(postId) {
  currentCommentPostId = postId;
  document.getElementById('comment-overlay').classList.add('show');
  if (window.loadComments) window.loadComments(postId);
}
function closeComment() {
  document.getElementById('comment-overlay').classList.remove('show');
  currentCommentPostId = null;
}
function closeCommentOutside(e) {
  if (e.target === document.getElementById('comment-overlay')) closeComment();
}
function sendComment() {
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text || !currentCommentPostId) return;
  if (window.sendCommentToFirebase) window.sendCommentToFirebase(currentCommentPostId, text);
  input.value = '';
}

// ════════════════════════════════
// ⚙️ 가격 설정
// ════════════════════════════════
const CONFIG = {
  roomPrice: {
    pink:  15000,
    plant: 22000,
    doll:  35000,
  },
  alba: {
    burger:   17,
    cafeHigh: 30,
    cafeMid:  20,
    cafeLow:  10,
  },
  gacha: {
    one:   180,  // 1뽑 비용
    three: 540,  // 3뽑 비용
  },
};

// ── 저장 데이터 ──
let coins = parseInt(localStorage.getItem('ph_coins') || '0');
let owned = JSON.parse(localStorage.getItem('ph_owned') || '[]');
let albaDone = parseInt(localStorage.getItem('ph_alba') || '0');
let affection = JSON.parse(localStorage.getItem('ph_affection') || '{}');
let storyRead = JSON.parse(localStorage.getItem('ph_story') || '{}');
let inventory = JSON.parse(localStorage.getItem('ph_inventory') || JSON.stringify({
  '🌸 벚꽃': 3, '🌹 장미': 2, '💐 꽃다발': 1, '🍀 클로버': 5,
  '☕ 커피': 2, '🍰 케이크': 1, '📚 책': 2, '🎵 악보': 1
}));
let hints = JSON.parse(localStorage.getItem('ph_hints') || '[]');
let ownedRooms = JSON.parse(localStorage.getItem('ph_ownedRooms') || '[]');
let currentRoom = localStorage.getItem('ph_currentRoom') || 'basic';
let stamina = parseInt(localStorage.getItem('ph_stamina') || '100');
let wishFragments = parseInt(localStorage.getItem('ph_wish') || '0');

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
    stories:[
      {ep:1,title:"도서관의 밤",unlockAt:0,msgs:[{who:'minjun',text:"...여기서 뭐 해? 문 닫을 시간인데."},{who:'player',text:"책 찾다가 길을 잃었어요."},{who:'minjun',text:"길을 잃은 게 아니라, 아직 찾고 있는 거야. 도와줄까?"},{who:'player',text:"...네, 부탁드려도 될까요?"},{who:'minjun',text:"(책을 집어들며) 이걸 찾고 있었지? 생각보다 잘 아네."}]},
      {ep:2,title:"비 오는 귀갓길",unlockAt:1,msgs:[{who:'minjun',text:"...비 맞으면서 걸어가려고?"},{who:'player',text:"우산이 없어서요."},{who:'minjun',text:"(우산 내밀며) 가져가. 나는 괜찮아."},{who:'player',text:"같이 써요."},{who:'minjun',text:"...그래. (작게) 가까이 와."}]},
      {ep:3,title:"별의 기록",unlockAt:2,msgs:[{who:'minjun',text:"오늘 별자리 봤어?"},{who:'player',text:"못 봤어요. 바빴거든요."},{who:'minjun',text:"이 기록… 분명 우리가 잃어버린 진실의 조각이야."},{who:'player',text:"무서운 말이에요."},{who:'minjun',text:"(눈 마주치며) 괜찮아. 내가 옆에 있잖아."}]}
    ]
  },
  sion: { id:'sion', name:'시온', emoji:'🎸', gradeColor:'#6366F1', img:B+'Sion UR.png',
    homeLines:["무대 위에선 누구의 것도 아냐. 오직 음악만 남아.","관객이 없어도 연주는 진심이어야 하거든.","폭풍이 몰아쳐도, 나는 내 노래를 멈추지 않아."],
    stories:[
      {ep:1,title:"야간 리허설",unlockAt:0,msgs:[{who:'sion',text:"...뭐야. 아직도 있어?"},{who:'player',text:"연주 소리가 좋아서요."},{who:'sion',text:"관중 없는 데서 들어도 좋냐고."},{who:'player',text:"네. 진심이 느껴졌어요."},{who:'sion',text:"...(기타 줄 튕기며) 한 곡만 더 들을래?"}]},
      {ep:2,title:"폭풍 속 무대",unlockAt:1,msgs:[{who:'sion',text:"비 맞으면서 공연 보러 왔어?"},{who:'player',text:"시온씨 공연이니까요."},{who:'sion',text:"...바보같은 거 알아?"},{who:'player',text:"알아요."},{who:'sion',text:"(낮게) 고마워. 이 한 마디는 너한테만 해."}]},
      {ep:3,title:"무대 뒤 적막",unlockAt:2,msgs:[{who:'sion',text:"기대하지 마. 난 사람 실망시키는 데 특기 있어."},{who:'player',text:"그래도 괜찮아요."},{who:'sion',text:"...왜?"},{who:'player',text:"지금 이 순간만으로 충분하니까요."},{who:'sion',text:"(오래 침묵하다) ...넌 이상한 애야."}]}
    ]
  },
  doyun: { id:'doyun', name:'도윤', emoji:'👑', gradeColor:'#374151', img:B+'Doyun UR.png',
    homeLines:["필요하면 불러. 나, 가는 편이거든.","규칙은 공정해야지. 그래야만 모두가 내 선택을 따르게 되니까.","넌, 내가 만든 가장 아름다운 예외야."],
    stories:[
      {ep:1,title:"학생회장의 제안",unlockAt:0,msgs:[{who:'doyun',text:"너 포카하우스 알바하지?"},{who:'player',text:"네, 맞아요."},{who:'doyun',text:"내가 규칙을 하나 정해줄게. 지각하지 마."},{who:'player',text:"...알겠어요."},{who:'doyun',text:"(작게 웃으며) 잘 따르네. 마음에 들어."}]},
      {ep:2,title:"가면무도회의 밤",unlockAt:1,msgs:[{who:'doyun',text:"왜 가면을 안 썼어?"},{who:'player',text:"숨기고 싶은 게 없어서요."},{who:'doyun',text:"...(가면 내리며) 그렇군. 나도 오늘만큼은 그러고 싶었어."},{who:'player',text:"예뻐요. 민얼굴이."},{who:'doyun',text:"(귀 붉혀지며) ...함부로 말하지 마."}]},
      {ep:3,title:"보이지 않는 실세",unlockAt:2,msgs:[{who:'doyun',text:"내가 왜 이렇게 움직이는지 알아?"},{who:'player',text:"모르겠어요."},{who:'doyun',text:"내 옆에 있는 사람을 지키기 위해서야."},{who:'player',text:"...저도요?"},{who:'doyun',text:"(눈 마주치며) 특히 너."}]}
    ]
  },
  harin: { id:'harin', name:'하린', emoji:'🌙', gradeColor:'#7C3AED', img:B+'Harin UR.png',
    homeLines:["이 노래가 끝나면, 모든 게 사라져도 너만은 기억해줘.","이 밤이 끝나도, 내 노래는 너에게 닿을 거야.","이 노래가 너에게 닿을 수 있다면, 나는 언제든 노래할 수 있어."],
    stories:[
      {ep:1,title:"새벽역에서",unlockAt:0,msgs:[{who:'harin',text:"이 시간에 여기 왜 있어?"},{who:'player',text:"막차를 놓쳤어요."},{who:'harin',text:"나도. (옆에 앉으며) 같이 기다리자."},{who:'player',text:"노래 들었어요. 진짜 좋았어요."},{who:'harin',text:"...고마워. 처음으로 직접 들었네."}]},
      {ep:2,title:"달빛 보컬",unlockAt:1,msgs:[{who:'harin',text:"왜 항상 맨 앞에 있어?"},{who:'player',text:"목소리가 잘 들리니까요."},{who:'harin',text:"...아, 그렇구나. (낮게) 사실 너 보려고 이쪽 서게 됐어."},{who:'player',text:"...네?"},{who:'harin',text:"(웃으며) 다음 곡도 들어줘."}]},
      {ep:3,title:"마지막 무대",unlockAt:2,msgs:[{who:'harin',text:"오늘이 마지막 무대야."},{who:'player',text:"왜요?"},{who:'harin',text:"쉬어야 할 것 같아서. 근데 네가 있으면 계속할 수 있을 것 같아."},{who:'player',text:"계속 들을게요."},{who:'harin',text:"(손 잡으며) 고마워. 진짜로."}]}
    ]
  },
  yuna: { id:'yuna', name:'윤아', emoji:'🌸', gradeColor:'#EC4899', img:B+'Yuna UR.png',
    homeLines:["오늘은 우리, 봄이랑 데이트하는 날이야!","오늘 너한테 제일 예쁜 꽃을 줄게. 받아줄 거지?","오늘, 나만 바라봐 줘. 그거면 충분해."],
    stories:[
      {ep:1,title:"꽃집 알바",unlockAt:0,msgs:[{who:'yuna',text:"어서 와! 뭐 찾아?"},{who:'player',text:"예쁜 꽃이요."},{who:'yuna',text:"(빙글 돌며) 그럼 나야! 아, 농담이고— 이건 어때?"},{who:'player',text:"예뻐요. 당신처럼."},{who:'yuna',text:"(발끈) 야! 갑자기 그런 말 하면 어떡해!"}]},
      {ep:2,title:"봄 축제",unlockAt:1,msgs:[{who:'yuna',text:"같이 축제 가자!"},{who:'player',text:"나랑요?"},{who:'yuna',text:"응! 혼자 가기 싫어. ...사실 너랑 가고 싶어서."},{who:'player',text:"좋아요."},{who:'yuna',text:"(팔 낚아채며) 그럼 빨리 가자!"}]},
      {ep:3,title:"나만 봐줘",unlockAt:2,msgs:[{who:'yuna',text:"오늘 나 예뻐?"},{who:'player',text:"항상 예뻐요."},{who:'yuna',text:"그런 말 쉽게 하지 마. 나 진심으로 받아들이거든."},{who:'player',text:"진심이에요."},{who:'yuna',text:"(조용히) ...나도야."}]}
    ]
  },
  ara: { id:'ara', name:'아라', emoji:'🌹', gradeColor:'#9D174D', img:B+'Ara UR.png',
    homeLines:["오늘, 주인공은 나로 정해졌으니까.","비밀은 아름다울수록 오래가거든.","오늘 밤, 넌 내게서 벗어날 수 없어."],
    stories:[
      {ep:1,title:"무대의 여왕",unlockAt:0,msgs:[{who:'ara',text:"공연 어땠어?"},{who:'player',text:"완벽했어요."},{who:'ara',text:"당연하지. (턱 들며) 그래도 오늘 유독 잘됐어."},{who:'player',text:"왜요?"},{who:'ara',text:"...네가 있어서. 말 안 해도 느껴지거든."}]},
      {ep:2,title:"가면 뒤의 얼굴",unlockAt:1,msgs:[{who:'ara',text:"날 좋아해?"},{who:'player',text:"네."},{who:'ara',text:"흥. 다들 그렇게 말하지."},{who:'player',text:"저는 달라요."},{who:'ara',text:"(오래 바라보다) ...증명해 봐."}]},
      {ep:3,title:"치명적인 미소",unlockAt:2,msgs:[{who:'ara',text:"넌 이상해."},{who:'player',text:"왜요?"},{who:'ara',text:"내가 차갑게 굴어도 안 떠나잖아."},{who:'player',text:"떠날 이유가 없어요."},{who:'ara',text:"(낮게) ...오늘 밤은 가지 마."}]}
    ]
  }
};

// ── 카드 데이터 ──
const CARDS = [
  // UR (1장씩)
  {id:'minjun_ur', name:'민준 UR', grade:'UR', gradeColor:'#C084FC', img:B+'Minjun UR.png', autoCoins:20, charId:'minjun'},
  {id:'sion_ur',   name:'시온 UR', grade:'UR', gradeColor:'#6366F1', img:B+'Sion UR.png',   autoCoins:20, charId:'sion'},
  {id:'doyun_ur',  name:'도윤 UR', grade:'UR', gradeColor:'#9D6B2A', img:B+'Doyun UR.png',  autoCoins:20, charId:'doyun'},
  {id:'harin_ur',  name:'하린 UR', grade:'UR', gradeColor:'#7C3AED', img:B+'Harin UR.png',  autoCoins:20, charId:'harin'},
  {id:'yuna_ur',   name:'윤아 UR', grade:'UR', gradeColor:'#EC4899', img:B+'Yuna UR.png',   autoCoins:20, charId:'yuna'},
  {id:'ara_ur',    name:'아라 UR', grade:'UR', gradeColor:'#DC2626', img:B+'Ara UR.png',    autoCoins:20, charId:'ara'},

  // SSR (2장씩)
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

  // SR (2장씩)
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

  // R (3장씩)
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

  // N (5장씩)
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
  if (rand < 1)       pool = CARDS.filter(c => c.grade === 'UR');   // 1%
  else if (rand < 3)  pool = CARDS.filter(c => c.grade === 'SSR');  // 2%
  else if (rand < 10) pool = CARDS.filter(c => c.grade === 'SR');   // 7%
  else if (rand < 30) pool = CARDS.filter(c => c.grade === 'R');    // 20%
  else                pool = CARDS.filter(c => c.grade === 'N');     // 70%
  const card = pool[Math.floor(Math.random() * pool.length)];
  if (!owned.includes(card.id)) {
    owned.push(card.id);
    if (card.charId) { if (!affection[card.charId]) affection[card.charId] = 0; affection[card.charId] = Math.min(5, affection[card.charId] + 1); }
  }
  saveAll();
  return card;
}

function doDraw(count) {
  const cost = count === 1 ? CONFIG.gacha.one : CONFIG.gacha.three;
  if (coins < cost) { alert(`코인이 부족해요! 🍔 ${cost} 필요 (현재: ${coins})`); return; }
  coins -= cost; saveAll();
  const results = [];
  for (let i = 0; i < count; i++) results.push(drawOne());
  showGachaResult(results[0]);
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
function buyGift(itemName, price) {
  if (coins < price) { alert(`코인이 부족해요! 🍔 ${price} 필요 (현재: ${coins})`); return; }
  coins -= price;
  if (!inventory[itemName]) inventory[itemName] = 0;
  inventory[itemName]++;
  saveAll();
  document.getElementById('shop-coin-display').textContent = coins;
  renderInventoryDisplay();
  spawnCoinFloat(-price);
  showShopToast(`${itemName} 구매 완료! 🎁`);
}
function buyDrink(itemName, price, staminaUp) {
  if (coins < price) { alert(`코인이 부족해요! 🍔 ${price} 필요 (현재: ${coins})`); return; }
  coins -= price;
  stamina = Math.min(100, stamina + staminaUp);
  localStorage.setItem('ph_stamina', stamina);
  saveAll();
  document.getElementById('shop-coin-display').textContent = coins;
  spawnCoinFloat(-price);
  showShopToast(`${itemName} 마심! ⚡ 스태미나 +${staminaUp}`);
}
function renderInventoryDisplay() {
  const el = document.getElementById('inventory-display');
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
  if (coins < theme.price) { alert(`코인이 부족해요! 🍔 ${theme.price.toLocaleString()} 필요 (현재: ${coins})`); return; }
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
  renderRoomShop();
  showShopToast(`${theme.name} 적용됐어요! ✨`);
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
  if (Math.random() < 0.008) {
    wishFragments++;
    localStorage.setItem('ph_wish', wishFragments);
    showWishFragment();
  }
}
function showWishFragment() {
  const popup = document.createElement('div');
  popup.className = 'wish-popup';
  popup.innerHTML = `<div class="wish-inner">
    <div style="font-size:48px;margin-bottom:12px;">✨</div>
    <div style="font-size:20px;font-weight:900;color:#FFD700;margin-bottom:8px;">소원의 조각 발견!</div>
    <div style="font-size:14px;color:#aaa;margin-bottom:16px;">보유: 🧩 ${wishFragments}개 / 100개</div>
    ${wishFragments >= 100 ? '<div style="font-size:13px;color:#FF6B9D;font-weight:700;margin-bottom:12px;">✨ 소원 완성 가능!</div>' : ''}
    <button onclick="this.closest('.wish-popup').remove()" style="padding:10px 28px;background:linear-gradient(135deg,#FFD700,#F59E0B);border:none;border-radius:12px;color:#1a1a2e;font-size:14px;font-weight:900;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">확인</button>
  </div>`;
  document.body.appendChild(popup);
  setTimeout(() => { if (popup.parentNode) popup.remove(); }, 3500);
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
  else if (id === 'alba-burger' || id === 'alba-cafe') document.getElementById('nav-alba').classList.add('active');
  updateCoinsDisplay();
  if (id === 'alba') initAlba();
  if (id === 'map' && document.getElementById('coin-map')) document.getElementById('coin-map').textContent = coins;
  if (id === 'alba-burger') initBurgerAlba();
  if (id === 'alba-cafe') initCafeAlba();
  if (id === 'collection') renderCollection();
  if (id === 'home') { renderHomeIdols(); renderHomeSpeech(); }
  if (id === 'bond') renderBondList();

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
function initBurgerAlba() {
  if (document.getElementById('coin-alba-burger')) document.getElementById('coin-alba-burger').textContent = coins;
  burgerStep = 0; burgerMenuIdx = -1; burgerStack = [];
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
    const earn = CONFIG.alba.burger; coins += earn; albaDone++; saveAll();
    checkWishFragment();
    if (document.getElementById('coin-alba-burger')) document.getElementById('coin-alba-burger').textContent = coins;
    spawnCoinFloat(earn);
    if (hotspots) hotspots.innerHTML = '';
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:32px;">🍔✨</div><div style="font-size:20px;font-weight:900;color:#FFD700;margin:6px 0;">+🍔 ${earn}</div><div style="font-size:12px;color:#aaa;margin-bottom:10px;">${menu.name} 완성!</div><div style="display:flex;gap:8px;"><button onclick="selectBurgerMenu(${burgerMenuIdx})" style="flex:1;padding:12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">다시!</button><button onclick="initBurgerAlba()" style="flex:1;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">다른 메뉴</button></div></div>`;
    return;
  }
  const step = menu.steps[burgerStep];
  const stackHtml = burgerStack.map(e => `<span style="font-size:18px;">${e}</span>`).join('');
  if (step.gauge) {
    if (hotspots) hotspots.innerHTML = `<div style="position:absolute;left:${step.pos.left};top:${step.pos.top};transform:translate(-50%,-50%);animation:pulse 1s infinite;"><div style="font-size:28px;filter:drop-shadow(0 0 8px #FF6B9D);">🔥</div></div>`;
    if (panel) panel.innerHTML = `<div style="color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:6px;text-align:center;">${step.hint}</div><div style="display:flex;gap:6px;justify-content:center;margin-bottom:8px;">${stackHtml}</div><div style="width:100%;height:28px;background:rgba(255,255,255,0.1);border-radius:14px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;margin-bottom:8px;" onclick="tapBurgerGauge()"><div style="position:absolute;top:0;bottom:0;left:35%;width:30%;background:rgba(255,107,157,0.4);border-radius:4px;"></div><div style="position:absolute;top:0;bottom:0;left:41%;width:18%;background:rgba(255,215,0,0.7);border-radius:4px;"></div><div id="burger-gauge-marker" style="position:absolute;top:3px;bottom:3px;width:5px;background:#fff;border-radius:3px;box-shadow:0 0 8px #fff;left:0%;"></div></div><button onclick="tapBurgerGauge()" style="width:100%;padding:10px;background:linear-gradient(135deg,#FF6B9D,#F59E0B);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">TAP! 🔥</button></div>`;
    startBurgerGauge();
  } else {
    if (hotspots) hotspots.innerHTML = `<div onclick="tapBurgerIngredient()" style="position:absolute;left:${step.pos.left};top:${step.pos.top};transform:translate(-50%,-50%);background:rgba(255,215,0,0.15);border:2px dashed rgba(255,215,0,0.7);border-radius:10px;padding:8px 12px;cursor:pointer;animation:pulse 1s infinite;display:flex;flex-direction:column;align-items:center;gap:2px;"><span style="font-size:24px;">${step.emoji}</span><span style="font-size:10px;color:#FFD700;font-weight:700;">${step.label}</span></div>`;
    if (panel) panel.innerHTML = `<div style="color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:6px;text-align:center;">${step.hint} (${burgerStep + 1}/${menu.steps.length})</div><div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;min-height:28px;">${stackHtml}</div></div>`;
  }
}
function selectBurgerMenu(idx) { burgerMenuIdx = idx; burgerStep = 0; burgerStack = []; renderBurgerStep(); }
function tapBurgerIngredient() { const step = BURGER_MENUS[burgerMenuIdx].steps[burgerStep]; burgerStack.push(step.emoji); burgerStep++; renderBurgerStep(); }
function startBurgerGauge() {
  burgerGaugePos = 0; burgerGaugeDir = 1;
  function tick() {
    const m = document.getElementById('burger-gauge-marker'); if (!m) return;
    burgerGaugePos += burgerGaugeDir * 2.0;
    if (burgerGaugePos >= 100) { burgerGaugePos = 100; burgerGaugeDir = -1; }
    if (burgerGaugePos <= 0) { burgerGaugePos = 0; burgerGaugeDir = 1; }
    m.style.left = burgerGaugePos + '%';
    if (document.getElementById('burger-gauge-marker')) requestAnimationFrame(tick);
  }
  tick();
}
function tapBurgerGauge() {
  const pos = burgerGaugePos;
  let earn;
  if (pos >= 41 && pos <= 59) { earn = 30; showResult('PERFECT', 30); }
  else if (pos >= 35 && pos <= 65) { earn = 20; showResult('GREAT', 20); }
  else if (pos >= 25 && pos <= 75) { earn = 10; showResult('COOL', 10); }
  else { earn = 0; showResult('MISS', 0); }
  coins += earn; saveAll();
  const step = BURGER_MENUS[burgerMenuIdx].steps[burgerStep];
  burgerStack.push(step.emoji); burgerStep++; renderBurgerStep();
}

// ── 카페 알바 ──
let cafeStep = 0, cafeScores = [], cafeGaugePos = 0, cafeGaugeDir = 1;
function initCafeAlba() {
  if (document.getElementById('coin-alba-cafe')) document.getElementById('coin-alba-cafe').textContent = coins;
  cafeStep = 0; cafeScores = []; renderCafeStep();
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
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:6px;">① 에스프레소 머신을 탭하세요!</div><div id="cafe-gauge-wrap" style="display:none;margin-top:8px;"><div style="font-size:12px;color:#aaa;margin-bottom:6px;">추출 타이밍!</div><div style="width:100%;height:28px;background:rgba(255,255,255,0.1);border-radius:14px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;" onclick="tapCafeGauge()"><div style="position:absolute;top:0;bottom:0;left:35%;width:30%;background:rgba(255,107,157,0.5);border-radius:4px;"></div><div style="position:absolute;top:0;bottom:0;left:41%;width:18%;background:rgba(255,215,0,0.7);border-radius:4px;"></div><div id="cafe-gauge-marker" style="position:absolute;top:3px;bottom:3px;width:5px;background:#fff;border-radius:3px;box-shadow:0 0 8px #fff;left:0%;"></div></div><button onclick="tapCafeGauge()" style="margin-top:8px;width:100%;padding:10px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">TAP! ☕</button></div></div>`;
  } else if (cafeStep === 1) {
    if (hotspots) hotspots.innerHTML = `<div onclick="tapSteamer()" style="position:absolute;left:60%;top:50%;width:15%;height:20%;background:rgba(100,200,255,0.15);border:2px dashed rgba(100,200,255,0.6);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;animation:pulse 1s infinite;"><span style="font-size:20px;">🥛</span></div>`;
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:6px;">② 스팀 피쳐를 탭해서 우유를 스티밍!</div><div id="cafe-gauge-wrap" style="display:none;margin-top:8px;"><div style="font-size:12px;color:#aaa;margin-bottom:6px;">스티밍 타이밍!</div><div style="width:100%;height:28px;background:rgba(255,255,255,0.1);border-radius:14px;position:relative;overflow:hidden;border:1.5px solid rgba(255,255,255,0.2);cursor:pointer;" onclick="tapCafeGauge()"><div style="position:absolute;top:0;bottom:0;left:35%;width:30%;background:rgba(100,200,255,0.4);border-radius:4px;"></div><div style="position:absolute;top:0;bottom:0;left:41%;width:18%;background:rgba(255,215,0,0.7);border-radius:4px;"></div><div id="cafe-gauge-marker" style="position:absolute;top:3px;bottom:3px;width:5px;background:#fff;border-radius:3px;box-shadow:0 0 8px #fff;left:0%;"></div></div><button onclick="tapCafeGauge()" style="margin-top:8px;width:100%;padding:10px;background:linear-gradient(135deg,#60a5fa,#C084FC);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">TAP! 🥛</button></div></div>`;
  } else if (cafeStep === 2) {
    if (panel) panel.innerHTML = `<div style="color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:8px;text-align:center;">③ 아트 선택 후 컵 위에 그려봐!</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;"><button onclick="selectAndDrawLatte('하트','❤️')" style="padding:10px;background:rgba(255,107,157,0.2);border:1.5px solid #FF6B9D;border-radius:10px;color:#fff;font-size:16px;cursor:pointer;">❤️ 하트</button><button onclick="selectAndDrawLatte('나뭇잎','🍃')" style="padding:10px;background:rgba(100,200,100,0.2);border:1.5px solid #4ade80;border-radius:10px;color:#fff;font-size:16px;cursor:pointer;">🍃 나뭇잎</button><button onclick="selectAndDrawLatte('별','⭐')" style="padding:10px;background:rgba(255,215,0,0.2);border:1.5px solid #FFD700;border-radius:10px;color:#fff;font-size:16px;cursor:pointer;">⭐ 별</button><button onclick="selectAndDrawLatte('곰돌이','🐻')" style="padding:10px;background:rgba(192,132,252,0.2);border:1.5px solid #C084FC;border-radius:10px;color:#fff;font-size:16px;cursor:pointer;">🐻 곰돌이</button></div></div>`;
  } else if (cafeStep === 3) {
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:13px;color:#FFB3CC;margin-bottom:8px;">④ 완성! 손님에게 서빙해봐</div><div style="font-size:40px;margin-bottom:8px;">☕✨</div><button onclick="serveCafe()" style="width:100%;padding:14px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">서빙! 🛎️</button></div>`;
  } else {
    const total = cafeScores.reduce((a, b) => a + b, 0);
    const bonus = total >= 110 ? CONFIG.alba.cafeHigh : total >= 80 ? CONFIG.alba.cafeMid : CONFIG.alba.cafeLow;
    coins += bonus; albaDone++; saveAll();
    checkWishFragment();
    if (document.getElementById('coin-alba-cafe')) document.getElementById('coin-alba-cafe').textContent = coins;
    spawnCoinFloat(bonus);
    if (panel) panel.innerHTML = `<div style="text-align:center;color:#fff;"><div style="font-size:32px;">✨☕✨</div><div style="font-size:22px;font-weight:900;color:#FFD700;margin:6px 0;">+🍔 ${bonus}</div><div style="font-size:12px;color:#aaa;margin-bottom:10px;">총점 ${total}점</div><button onclick="initCafeAlba()" style="width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">한 잔 더! ☕</button></div>`;
  }
  if (cafeStep <= 1) startCafeGaugeLoop();
}
function startCafeGaugeLoop() {
  cafeGaugePos = 0; cafeGaugeDir = 1;
  const speed = cafeStep === 1 ? 2.2 : 1.8;
  function tick() {
    if (cafeStep > 1) return;
    cafeGaugePos += cafeGaugeDir * speed;
    if (cafeGaugePos >= 100) { cafeGaugePos = 100; cafeGaugeDir = -1; }
    if (cafeGaugePos <= 0) { cafeGaugePos = 0; cafeGaugeDir = 1; }
    const m = document.getElementById('cafe-gauge-marker'); if (m) m.style.left = cafeGaugePos + '%';
    requestAnimationFrame(tick);
  }
  tick();
}
function tapMachine() { const wrap = document.getElementById('cafe-gauge-wrap'); const h = document.getElementById('cafe-hotspots'); if (wrap) wrap.style.display = 'block'; if (h) h.innerHTML = ''; }
function tapSteamer() { const wrap = document.getElementById('cafe-gauge-wrap'); const h = document.getElementById('cafe-hotspots'); if (wrap) wrap.style.display = 'block'; if (h) h.innerHTML = ''; }
function tapCafeGauge() {
  const pos = cafeGaugePos;
  const score = (pos >= 41 && pos <= 59) ? 40 : (pos >= 35 && pos <= 65) ? 25 : (pos >= 25 && pos <= 75) ? 10 : 0;
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
  document.querySelectorAll('#coin-display,#coin-alba,#coin-gacha,#coin-gacha2').forEach(el => { if (el) el.textContent = coins; });
}
function saveAll() {
  localStorage.setItem('ph_coins', coins);
  localStorage.setItem('ph_owned', JSON.stringify(owned));
  localStorage.setItem('ph_alba', albaDone);
  localStorage.setItem('ph_affection', JSON.stringify(affection));
  localStorage.setItem('ph_story', JSON.stringify(storyRead));
  localStorage.setItem('ph_inventory', JSON.stringify(inventory));
  localStorage.setItem('ph_hints', JSON.stringify(hints));
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
function renderAutoIdols() {
  const autoOwned = CARDS.filter(c => owned.includes(c.id));
  const section = document.getElementById('auto-idols-section');
  const list = document.getElementById('auto-idol-list');
  if (autoOwned.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'none'; // 자동알바 비활성화
  list.innerHTML = autoOwned.map(c => `<div class="auto-idol-row"><div><span class="auto-idol-name">${c.name}</span> <span style="font-size:11px;color:#888;">${c.grade}</span></div><div class="auto-coin">+🍔${c.autoCoins}/분</div></div>`).join('');
  
  // 자동알바 제거됨 // setInterval(() => {
    const total = autoOwned.reduce((s, c) => s + Math.floor(c.autoCoins / 2), 0);
    coins += total; saveAll(); spawnCoinFloat(total);
  }, 30000);
}

// ── 컬렉션 ──
function renderCollection() {
  const grid = document.getElementById('collection-grid');
  document.getElementById('collection-count').textContent = `${owned.length} / ${CARDS.length} 보유`;
  grid.innerHTML = CARDS.map(card => {
    const isOwned = owned.includes(card.id);
    return `<div class="card-item"><div style="aspect-ratio:3/4;background:#1a1a2e;position:relative;overflow:hidden;" class="${isOwned ? '' : 'card-locked'}">${isOwned && card.img ? `<img src="${card.img}" style="width:100%;height:100%;object-fit:cover;">` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:40px;">🎴</div>'}${!isOwned ? '<div class="card-locked-overlay">🔒</div>' : ''}</div><div class="card-item-info"><div class="card-item-name">${isOwned ? card.name : '???'}</div><div class="card-item-grade" style="color:${isOwned ? card.gradeColor : '#ccc'}">${card.grade}</div></div></div>`;
  }).join('');
}

// ── 홈 아이돌 ──
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
    const aff = affection[ch.id] || 0;
    const hasCard = CARDS.some(c => c.charId === ch.id && owned.includes(c.id));
    const hearts = '❤️'.repeat(aff) + '🤍'.repeat(5 - aff);
    return `<div class="bond-card" onclick="${hasCard ? `openBondDetail('${ch.id}')` : ''}" style="${!hasCard ? 'opacity:0.4;cursor:default;' : ''}"><div class="bond-card-top"><div class="bond-char-placeholder" style="background:linear-gradient(135deg,${ch.gradeColor}88,${ch.gradeColor})">${ch.emoji}</div><div class="bond-info"><div class="bond-name">${ch.name}</div><div class="bond-heart-row"><div class="bond-hearts">${hearts}</div><div class="bond-level-text">Lv.${aff}</div></div><div class="bond-desc">${hasCard ? '카드를 보유 중' : '카드를 뽑아야 인연을 쌓을 수 있어'}</div></div></div></div>`;
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
  const aff = affection[charId] || 0;
  document.getElementById('bond-detail-img').src = ch.img;
  document.getElementById('bond-detail-name').textContent = ch.name;
  document.getElementById('detail-hearts').innerHTML = [1,2,3,4,5].map(i => `<div class="affection-heart ${i <= aff ? 'active' : ''}">${i <= aff ? '❤️' : '🤍'}</div>`).join('');
  document.getElementById('affection-fill').style.width = (aff / 5 * 100) + '%';
  const labels = ['인연 없음','처음 만남','친해지는 중','소중한 사이','마음을 열다','운명의 인연'];
  document.getElementById('affection-label').textContent = labels[aff];
  document.getElementById('story-list').innerHTML = ch.stories.map(s => {
    const unlocked = aff >= s.unlockAt;
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
  document.getElementById('story-read-overlay').classList.add('show');
}
function closeStoryRead() { document.getElementById('story-read-overlay').classList.remove('show'); if (currentCharId) openBondDetail(currentCharId); }

// ── 맵 ──
const PLACE_BUTTONS = {
  burger: ['btn-burger-alba'],
  'cafe-street': ['btn-cafe-alba', 'btn-meet-yuna'],
  school: ['btn-sub-library', 'btn-sub-music', 'btn-sub-council', 'btn-sub-rooftop'],
  library: ['btn-meet-minjun'],
  music: ['btn-meet-sion'],
  council: ['btn-meet-doyun'],
  rooftop: ['btn-meet-harin'],
  forest: ['btn-explore-forest'],
  lake: ['btn-meet-ara'],
  room: ['btn-room-deco'],
  shopping: ['btn-shop-gift', 'btn-shop-room'],
};
const ALL_PLACE_BTNS = ['btn-burger-alba','btn-cafe-alba','btn-meet-yuna','btn-meet-minjun','btn-meet-sion','btn-meet-doyun','btn-meet-harin','btn-meet-ara','btn-sub-library','btn-sub-music','btn-sub-council','btn-sub-rooftop','btn-explore-forest','btn-explore-lake','btn-room-deco','btn-shop-gift','btn-shop-room'];
const PLACE_IMGS = { burger:'map-burger.png','cafe-street':'map-cafe.png',school:'map-school.png',library:'map-library.png',music:'map-music.png',council:'map-council.png',rooftop:'map-rooftop.png',forest:'map-forest.png',lake:'map-lake.png',room:'map-room.png',shopping:'map-village.png' };
const PLACE_TITLES = { burger:'🍔 포카버거','cafe-street':'☕ 카페거리',school:'🏫 연성고등학교',library:'📚 도서관',music:'🎵 음악실',council:'🏢 학생회실',rooftop:'⭐ 옥상',forest:'🌲 동쪽숲',lake:'🏞️ 동쪽호수',room:'🏠 내 방',shopping:'🛍️ 상점거리' };

function openPlace(id) {
  ALL_PLACE_BTNS.forEach(b => { const el = document.getElementById(b); if (el) el.style.display = 'none'; });
  (PLACE_BUTTONS[id] || []).forEach(b => { const el = document.getElementById(b); if (el) el.style.display = 'block'; });
  document.getElementById('place-bg-img').src = B + (PLACE_IMGS[id] || 'map-village.png');
  document.getElementById('place-title').textContent = PLACE_TITLES[id] || '';
  document.getElementById('place-overlay').style.display = 'flex';
}
function closePlace() { document.getElementById('place-overlay').style.display = 'none'; }
function doBurgerAlba() { closePlace(); goTo('alba-burger'); }
function doCafeAlba() { closePlace(); goTo('alba-cafe'); }
function openSubPlace(id) { openPlace(id); }
function explorePlace(id) {
  const msg = ['탐험 중... 아무것도 발견하지 못했어.','수상한 흔적이 있어. 더 조사가 필요해.','뭔가 있는 것 같은데... 연금술 도구가 필요할 것 같아.'];
  alert(msg[Math.floor(Math.random() * msg.length)]);
}

// ── 캐릭터 만나기 ──
function meetChar(charId) {
  const ch = CHARS[charId]; const meet = CHAR_MEET[charId]; if (!ch || !meet) return;
  const aff = affection[charId] || 0;
  if (aff < meet.reqAff) { showMeetPopup(ch, meet, null, aff); return; }
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
    overlay.innerHTML = `<div style="padding:24px;background:rgba(20,10,30,0.98);border-radius:20px 20px 0 0;"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;"><div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,${ch.gradeColor}88,${ch.gradeColor});display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">${ch.emoji}</div><div style="flex:1;"><div style="font-size:16px;font-weight:900;color:#fff;">${ch.name}</div><div style="font-size:13px;">${hearts}</div></div></div><div style="background:rgba(255,255,255,0.06);border-radius:12px;padding:14px;margin-bottom:14px;min-height:60px;"><div style="font-size:15px;color:#eee;line-height:1.7;">"${line}"</div></div><button onclick="showGiftMenu('${ch.id}')" style="width:100%;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;margin-bottom:8px;">💝 호감작하기</button><button onclick="document.getElementById('meet-overlay').remove()" style="width:100%;padding:12px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:14px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">돌아가기</button></div>`;
  }
  document.body.appendChild(overlay);
}
function showGiftMenu(charId) {
  const overlay = document.getElementById('meet-overlay');
  const items = Object.entries(inventory).filter(([k, v]) => v > 0);
  if (items.length === 0) {
    const panel = overlay.querySelector('div');
    panel.innerHTML += `<div style="color:#FF6B9D;text-align:center;margin-top:8px;font-size:13px;">인벤토리가 비어있어요! 잡화점에서 선물을 사와요 🛍️</div>`;
    return;
  }
  const giftHtml = items.map(([item, cnt]) => `<button onclick="giveGift('${charId}','${item}')" style="padding:10px 14px;background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,0.15);border-radius:10px;color:#fff;font-size:13px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;text-align:left;">${item} <span style="color:#aaa;font-size:11px;">x${cnt}</span></button>`).join('');
  overlay.querySelector('div').innerHTML = `<div style="font-size:13px;color:#FFB3CC;margin-bottom:10px;font-weight:700;">💝 어떤 선물을 줄까요?</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">${giftHtml}</div><button onclick="document.getElementById('meet-overlay').remove()" style="width:100%;padding:12px;background:rgba(255,255,255,0.08);border:none;border-radius:12px;color:#aaa;font-size:14px;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">취소</button>`;
}
function giveGift(charId, item) {
  if (!inventory[item] || inventory[item] <= 0) return;
  inventory[item]--;
  if (inventory[item] === 0) delete inventory[item];
  if (!affection[charId]) affection[charId] = 0;
  const oldAff = affection[charId];
  affection[charId] = Math.min(5, affection[charId] + 1);
  saveAll();
  const ch = CHARS[charId]; const meet = CHAR_MEET[charId];
  let hintText = '';
  if (Math.random() < meet.hintChance && meet.hints.length > 0) {
    const hint = meet.hints[Math.floor(Math.random() * meet.hints.length)];
    if (!hints.includes(hint)) { hints.push(hint); saveAll(); hintText = `<div style="background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:10px;margin-top:10px;"><div style="font-size:11px;color:#FFD700;font-weight:700;margin-bottom:4px;">💡 단서 획득!</div><div style="font-size:13px;color:#eee;">"${hint}"</div></div>`; }
  }
  const newAff = affection[charId];
  const hearts = '❤️'.repeat(newAff) + '🤍'.repeat(5 - newAff);
  const affUp = newAff > oldAff;
  document.getElementById('meet-overlay').querySelector('div').innerHTML = `<div style="text-align:center;padding:8px 0;"><div style="font-size:32px;margin-bottom:8px;">${item}</div><div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:6px;">${ch.name}에게 선물했어요!</div><div style="font-size:20px;margin-bottom:6px;">${hearts}</div>${affUp ? '<div style="font-size:13px;color:#FF6B9D;font-weight:700;">💞 호감도 상승!</div>' : '<div style="font-size:12px;color:#888;">이미 최대 호감도예요</div>'}${hintText}</div><button onclick="document.getElementById('meet-overlay').remove()" style="width:100%;margin-top:16px;padding:13px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;">확인</button>`;
}

// ── 초기화 ──
updateCoinsDisplay();
renderHomeIdols();
renderHomeSpeech();
checkNickname();
