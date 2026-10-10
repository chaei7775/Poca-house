// ════════════════════════════════
// 🎬 방송국 앞 원정 (broadcast-expedition.js)
//
// 특별탐험 장소 목록에 '방송국 앞'을 하나 더 넣는다.
// 이 장소만 생물/먹이 대신 새 방식으로 진행하고, 천공성 유적·달빛 회랑·공방 지하는 그대로다.
//
// 방식
//  - 지도 아무 데나 누르면 캐릭터(얼굴 + 얼굴에 붙은 카드)가 그쪽으로 걸어간다.
//  - 지도 곳곳에 ❗가 떠 있고, 걸어가서 닿으면 이벤트가 시작된다 (뭐가 나올지는 닿아봐야 안다).
//      📸 셔터 찬스(타이밍 게이지) / 💌 팬레터(3번 탭) / 🎁 굿즈 상자(3개 중 고르기)
//  - 이벤트가 끝날 때마다 가끔 특별 이벤트가 뜬다 (제한시간 있음, 놓치면 사라짐)
//      🌟 황금 셔터(레어 목격정보) / 🔥 레전드 순간(5초 연타)
//  - 이벤트 1번 = 스태미나 30 (맵에서 걷는 건 공짜)
//  - 보상: 코인 / 카드 경험치 / 특별탐험 재료 / 촬영 소품 / 🖼️ 프리미엄 조각
//    프리미엄 조각은 가방에 쌓인다 (100개 = 프리미엄 카드 1장, 교환은 다음 단계에서 만든다)
//
// ▶ 공연장(3번째 맵): 우등생별 1개로 입장 → 이벤트 20번 → 앵콜 스테이지 → 시크릿 포토랩(photolab.js)
//    필름(🎞️)은 여기서 파밍. 현상 효과(photolab.js의 getEngraveBonus)는 아래 engB() 로 전부 연결돼 있음.
//
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 된다. game.js / special-explore.js는 건드리지 않는다.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var LOC_ID = 'broadcast_front';
  var BG_URL = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/special-broadcast_front.webp';
  var IMG_W = 941, IMG_H = 1672;      // 배경 이미지 크기 (불러오면 실제 크기로 갱신)
  var STAMINA_COST = 30;              // 이벤트 1번당 스태미나
  var ENCORE_N = 20;                  // 공연장: 이벤트 몇 번 하면 앵콜 스테이지(포토랩)가 열리는지
  var RUN_KEY = 'ph_concertRun';      // 공연장 진행 저장 (중간에 나가도 별 안 날리고 이어서 함)
  var FILM_NAME = '필름', FILM_EMOJI = '🎞️';
  var DEV_NAME = '현상액', DEV_EMOJI = '🧪';   // 포토랩 옵션 강화 재료 (공연장에서만 나옴)
  var SPEED = 200;                    // 걷는 속도 (px/초)
  var HIT_R = 36;                     // 이 거리 안으로 들어가면 이벤트 시작 (px)
  var NORMAL_MAX = 2;                 // 지도에 동시에 떠 있는 ❗ 수
  var RARE_CHANCE = 0.08;             // 이벤트 끝날 때 황금 셔터가 뜰 확률
  var LEGEND_CHANCE = 0.02;           // 이벤트 끝날 때 레전드 순간이 뜰 확률
  var RARE_TTL = 30, LEGEND_TTL = 25; // 특별 이벤트 제한시간 (초)
  var LEGEND_NEED = 22, LEGEND_SEC = 5; // 레전드: 5초 안에 22번 탭
  // ❤️ HP (원정에 들어갈 때마다 가득 참 · 이벤트를 할 때마다 치여서 깎임 · 0이 되면 이번 원정에서 얻은 보상을 다 잃고 쫓겨남)
  var MAX_HP = 100;
  var HP_DMG = { shutter: 10, letter: 8, goods: 8, golden: 14, legend: 22 };   // 이벤트 1번 할 때 깎이는 HP (미니게임으로 했을 때)
  var HP_SKILL_MULT = { ok: 0.5, love: 0.3 };                                  // 💖 스킬로 처리하면 덜 깎임 (만족 / 대만족)
  var POTIONS = [                                                              // 상점에서 코인으로 산다 (더보기 > 💖 팬 스킬 상점)
    { id: 'hp_s', emoji: '🧪', name: '작은 회복약', heal: 40,  price: 2000, desc: '원정 중 HP +40 · 맵 오른쪽 위 버튼으로 써요' },
    { id: 'hp_l', emoji: '💊', name: '큰 회복약',   heal: 100, price: 6000, desc: '원정 중 HP 전부 회복 · 맵 오른쪽 위 버튼으로 써요' },
    { id: 'fat_d', emoji: '🥤', name: '피로회복 드링크', heal: 0, kind: 'fatigue', price: 1500, desc: '콘서트 무대 중 피로도 -60 · 무대 오른쪽 아래 버튼으로 써요' }
  ];
  var WEIGHTS = { shutter: 45, letter: 25, goods: 30 };   // 일반 이벤트가 나올 비율
  var HIDE_OLD_SPECIAL = true;        // true: 기존 특별 탐험(배너·3곳·도감 버튼)을 맵 화면에서 숨김. 되돌리려면 false
  // 등교권/등교권 조각 드랍 확률 (기존 특별탐험: 일반 0.2%/5%, 변종 3%/15% 를 이벤트 등급에 맞춰 옮김)
  var TICKET = {
    shutter: [0.002, 0.05], letter: [0.002, 0.05], goods: [0.002, 0.05],
    golden: [0.03, 0.15], legend: [0.05, 0.25]
  };
  // 특별 NPC (이미지 npc-xxx.png 를 repo 맨 위 폴더에 올리면 자동 적용, 없으면 이모지로 표시)
  // weak = 좋아하는 촬영도구(net 카메라 / spray 무드조명 / scent 분위기 향수)
  var NPCS = [
    { id: 'paparazzi', name: '열혈 파파라치', emoji: '🕶️', img: 'npc-paparazzi.png', weak: 'scent' },
    { id: 'pd',        name: '깐깐한 PD',     emoji: '🎙️', img: 'npc-pd.png',        weak: 'net' },
    { id: 'star',      name: '월드스타 게스트', emoji: '🌟', img: 'npc-star.png',      weak: 'spray' }
  ];
  var NPC_GAUGE = 120;          // NPC 경계 게이지
  var NPC_HIT_RIGHT = 40;       // 좋아하는 도구를 썼을 때 깎이는 양
  var NPC_HIT_WRONG = 20;       // 다른 도구를 썼을 때 깎이는 양
  var NPC_FLEE = 0.12;          // 도구 한 번 쓸 때 NPC가 떠날 기본 확률 (소품 '도망확률 감소' 적용)
  var NPC_CATCH = 0.50;         // 게이지를 다 깎은 뒤 촬영 성공 기본 확률 (소품 '촬영확률 증가' 적용)
  // 히든 강화 재료(enhance.js): 기존엔 특별탐험 촬영 성공에서만 나왔으므로 팬덤 원정으로 옮김 (확률은 기존 표 그대로)
  var ENH_KEY = 'ph_enhance';
  var ENH_DROP = {
    normal:  { stone: 0.035, protect: 0.015, trans: 0 },       // 셔터 / 팬레터 / 굿즈
    variant: { stone: 0.20,  protect: 0.10,  trans: 0.07 }     // 🌟 황금 셔터 / 특별 NPC
  };
  var PIECE_NAME = '프리미엄 조각', OLD_PIECE_NAME = '화보 조각', PIECE_EMOJI = '🖼️', PIECE_GOAL = 100;
  var IMG_BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var BUST = '?v=' + Date.now();   // 이미지를 올리기 전에 한 번 404가 났어도 옛 결과가 캐시에서 안 나오게
  var FACE_FILES = {      // 걸어다니는 얼굴 이미지 (repo 맨 위 폴더에 올리면 자동 적용)
    minjun: 'face-minjun.png', sion: 'face-sion.png', doyun: 'face-doyun.png',
    harin: 'face-harin.png', yuna: 'face-yuna.png', ara: 'face-ara.png',
    seyeon: 'face-seyeon.png'     // 🎟️ 세연(체험용 히든카드)
  };
  var FACE_POS = '50% 14%', FACE_ZOOM = '250%';           // 얼굴 동그라미에 카드 이미지를 어떻게 잘라 보여줄지

  // 지도 위 위치 (이미지 가로/세로를 0~1로 본 값)
  var START = { x: 0.51, y: 0.80 };
  var NORMAL_SPOTS = [
    { x: 0.84, y: 0.61 },  // 포토존 앞
    { x: 0.77, y: 0.42 },  // 카페 테라스
    { x: 0.32, y: 0.43 },  // 분수 왼쪽
    { x: 0.21, y: 0.62 },  // 굿즈 천막 앞
    { x: 0.24, y: 0.47 },  // 정원 파고라 앞
    { x: 0.29, y: 0.32 },  // 방송차 앞
    { x: 0.50, y: 0.59 },  // 광장 별 타일
    { x: 0.28, y: 0.74 },  // 벚나무 키오스크
    { x: 0.51, y: 0.26 }   // 정문 보라 카펫
  ];
  var RARE_SPOTS = [
    { x: 0.24, y: 0.27, label: '방송차 앞' },
    { x: 0.78, y: 0.40, label: '카페 테라스' },
    { x: 0.84, y: 0.61, label: '포토존' }
  ];
  var LEGEND_SPOT = { x: 0.51, y: 0.235, label: '정문 앞' };
  var BOUNDS = { x0: 0.06, x1: 0.94, y0: 0.21, y1: 0.85 };

  // ── 맵 목록: 맵을 늘리고 싶으면 여기에 한 칸 추가 ──
  //  pieces: 프리미엄 조각이 나오는 맵인지 / enh: 히든 강화 재료(강화석·방지권·초월석) 드랍표
  var MAPS = {
    broadcast_front: {
      id: 'broadcast_front', name: '방송국 앞', emoji: '🎬', color: '#A78BFA',
      bg: 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/special-broadcast_front.webp',
      desc: '이벤트 100번마다 프리미엄 조각 상자 뽑기', pieces: true, coinMult: 40,
      start: START, normal: NORMAL_SPOTS, rare: RARE_SPOTS, legend: LEGEND_SPOT, bounds: BOUNDS,
      enh: { normal: { stone: 0.005, protect: 0.003, trans: 0 }, variant: { stone: 0.03, protect: 0.015, trans: 0.005 }, npcStone: 1 },
      film: { normal: 0.015, golden: 0.10, npc: 1 }       // 임시 낮은 확률
    },
    fanmeeting: {
      id: 'fanmeeting', name: '팬미팅장', emoji: '💜', color: '#F472B6',
      bg: 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/special-fanmeeting.webp',
      desc: '강화석·방지권·초월석 파밍', pieces: false, coinMult: 80,
      start: { x: 0.51, y: 0.82 },
      normal: [
        { x: 0.16, y: 0.38 },  // 굿즈 부스 앞
        { x: 0.85, y: 0.42 },  // 포토존 앞
        { x: 0.32, y: 0.43 },  // 분수 왼쪽
        { x: 0.72, y: 0.46 },  // 분수 오른쪽
        { x: 0.21, y: 0.57 },  // 푸드트럭 테이블 (왼쪽)
        { x: 0.83, y: 0.60 },  // 푸드트럭 테이블 (오른쪽)
        { x: 0.26, y: 0.63 },  // 하트 정원
        { x: 0.83, y: 0.71 },  // 날개 하트 조형물
        { x: 0.51, y: 0.60 },  // 광장 별 타일
        { x: 0.51, y: 0.20 }   // 객석 가운데 통로
      ],
      rare: [
        { x: 0.51, y: 0.26, label: '무대 앞' },
        { x: 0.16, y: 0.37, label: '굿즈 부스' },
        { x: 0.85, y: 0.42, label: '포토존' }
      ],
      legend: { x: 0.51, y: 0.29, label: '무대 계단 앞' },
      bounds: { x0: 0.06, x1: 0.94, y0: 0.19, y1: 0.86 },
      enh: { normal: { stone: 0.018, protect: 0.022, trans: 0.003 }, variant: { stone: 0.07, protect: 0.08, trans: 0.03 }, npcStone: 2 },
      film: { normal: 0.015, golden: 0.10, npc: 1 }       // 임시 낮은 확률 (공연장 열리면 지워도 됨)
    },
    concert: {
      id: 'concert', name: '공연장', emoji: '🎤', color: '#F43F5E',
      bg: 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/special-concert.webp',
      desc: '🌟우등생별 1개 · 필름 파밍 · 시크릿 포토랩', pieces: false, coinMult: 100,
      starCost: 1, encore: true,
      start: { x: 0.50, y: 0.85 },
      normal: [
        { x: 0.20, y: 0.31 },  // VIP 앞
        { x: 0.80, y: 0.36 },  // 굿즈 매장
        { x: 0.18, y: 0.46 },  // 백스테이지
        { x: 0.50, y: 0.36 },  // 계단
        { x: 0.30, y: 0.55 },  // 분수 왼쪽
        { x: 0.70, y: 0.55 },  // 분수 오른쪽
        { x: 0.84, y: 0.52 },  // 푸드
        { x: 0.22, y: 0.70 },  // 미디어 월
        { x: 0.50, y: 0.66 },  // 분수 남쪽
        { x: 0.50, y: 0.77 }   // 카펫 아치
      ],
      rare: [
        { x: 0.18, y: 0.45, label: '백스테이지' },
        { x: 0.20, y: 0.30, label: 'VIP 앞' },
        { x: 0.22, y: 0.69, label: '미디어 월' }
      ],
      legend: { x: 0.50, y: 0.24, label: '무대 앞' },
      bounds: { x0: 0.06, x1: 0.94, y0: 0.20, y1: 0.88 },
      enh: { normal: { stone: 0.01, protect: 0.005, trans: 0 }, variant: { stone: 0.05, protect: 0.03, trans: 0.01 }, npcStone: 1 },
      film: { normal: 0.07, golden: 0.50, npc: 3 },
      dev: { normal: 0.05, golden: 0.30, npc: 1 }        // 🧪 현상액 드랍 (포토랩 옵션 강화용) — 숫자만 고치면 확률이 바뀜
    }
  };
  var MAP_ORDER = ['broadcast_front', 'fanmeeting', 'concert'];
  var curLoc = 'broadcast_front';
  var SKILL_ONLY = { broadcast_front: 1, fanmeeting: 1 };   // 이 맵들의 레어/특별 이벤트는 미니게임 없이 스킬 2개로만 처리
  var MAP = MAPS.broadcast_front;     // 지금 들어가 있는 맵 (원정 시작할 때 바뀜)

  // 평균 조각 계산용 (실제 플레이어가 이 정도 비율로 성공한다고 가정)
  var GRADE_DIST = {
    shutter: { PERFECT: 0.28, GREAT: 0.37, GOOD: 0.10, MISS: 0.25 },
    golden:  { PERFECT: 0.15, GREAT: 0.32, GOOD: 0.13, MISS: 0.40 },
    legend:  { SUCCESS: 0.60, PARTIAL: 0.25, FAIL: 0.15 }
  };

  var S = null;   // 지금 진행 중인 원정 상태
  var NPC_READY = {};   // 미리 불러온 NPC 이미지 (불러오기 끝난 것만 true)
  function preloadNpcs() {
    NPCS.forEach(function (n) {
      if (NPC_READY[n.id] !== undefined) return;
      NPC_READY[n.id] = false;
      var im = new Image();
      im.onload = function () { NPC_READY[n.id] = true; };
      im.src = IMG_BASE + n.img + BUST;
    });
  }

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function toast(msg) { if (typeof showBagToast === 'function') showBagToast(msg); }

  // ── 현상 효과(photolab.js) 읽기: 없으면 전부 0 ──
  function engAll() {
    try { return (S && typeof window.getEngraveBonus === 'function') ? (window.getEngraveBonus(S.charId) || {}) : {}; } catch (e) { return {}; }
  }
  function engB(key) { var v = Number(engAll()[key]); return isFinite(v) ? v : 0; }
  function staminaCost() { return Math.max(10, Math.round(STAMINA_COST * (1 + engB('stamina')))); }

  // 공연장 진행 저장
  function readRun() { try { var r = JSON.parse(localStorage.getItem(RUN_KEY) || 'null'); return (r && typeof r.done === 'number') ? r : null; } catch (e) { return null; } }
  function writeRun(r) { try { if (r) localStorage.setItem(RUN_KEY, JSON.stringify(r)); else localStorage.removeItem(RUN_KEY); } catch (e) {} }

  // ════════ 순수 로직 (보상 표) ════════
  function pickNormal(rnd) {
    rnd = rnd || Math.random;
    var total = WEIGHTS.shutter + WEIGHTS.letter + WEIGHTS.goods;
    var r = rnd() * total;
    if (r < WEIGHTS.shutter) return 'shutter';
    if (r < WEIGHTS.shutter + WEIGHTS.letter) return 'letter';
    return 'goods';
  }

  function rewardFor(type, grade, rnd) {
    rnd = rnd || Math.random;
    var r = { coins: 0, exp: 0, pieces: 0, mats: 0, gear: 0 };
    var jitter = 0.8 + rnd() * 0.4;
    var mult = { PERFECT: 2, GREAT: 1.5, GOOD: 1, MISS: 0 }[grade] || 0;
    if (type === 'shutter') {
      r.coins = Math.round(40 * mult * jitter);
      r.exp = { PERFECT: 90, GREAT: 60, GOOD: 40, MISS: 0 }[grade] || 0;
      var pc = { PERFECT: 0.45, GREAT: 0.30, GOOD: 0.12, MISS: 0 }[grade] || 0;
      if (rnd() < pc) r.pieces = 1;
      r.mats = (mult > 0 && rnd() < 0.5) ? 1 : 0;
      r.gear = mult > 0 ? 0.02 : 0;
    } else if (type === 'golden') {
      r.coins = Math.round(120 * mult * jitter);
      r.exp = { PERFECT: 180, GREAT: 120, GOOD: 80, MISS: 0 }[grade] || 0;
      r.pieces = grade === 'PERFECT' ? 2 : grade === 'GREAT' ? 1 : (grade === 'GOOD' && rnd() < 0.5) ? 1 : 0;
      r.mats = mult > 0 ? 1 : 0;
      r.gear = mult > 0 ? 0.10 : 0;
    } else if (type === 'letter') {
      r.coins = Math.round(30 + rnd() * 50);
      r.exp = 30;
      r.mats = rnd() < 0.6 ? 1 : 0;
      r.gear = 0.02;
    } else if (type === 'goods') {
      r.coins = Math.round(20 + rnd() * 40);
      r.exp = 30;
      r.mats = rnd() < 0.6 ? 1 : 0;
      r.gear = 0.03;
      if (rnd() < 0.06) r.pieces = 1;
    } else if (type === 'legend') {
      if (grade === 'SUCCESS')      { r.coins = 300; r.exp = 300; r.pieces = 5; r.mats = 2; r.gear = 1; r.gearMin = 'great'; }
      else if (grade === 'PARTIAL') { r.coins = 120; r.exp = 150; r.pieces = 2; r.mats = 1; r.gear = 0.08; }
      else                          { r.coins = 30;  r.exp = 30; }
    }
    return r;
  }

  function pickGrade(table, rnd) {
    var r = rnd(), acc = 0, last = null;
    for (var k in table) { last = k; acc += table[k]; if (r < acc) return k; }
    return last;
  }

  // 이벤트 n번 했을 때 프리미엄 조각 평균 (특별 이벤트가 뜨면 항상 잡는다고 가정)
  function simulate(n, rnd) {
    rnd = rnd || Math.random;
    var total = 0, special = null;
    for (var i = 0; i < n; i++) {
      var type = special || pickNormal(rnd);
      special = null;
      var grade = (type === 'letter' || type === 'goods') ? 'OPEN' : pickGrade(GRADE_DIST[type], rnd);
      total += rewardFor(type, grade, rnd).pieces;
      var r = rnd();
      if (r < LEGEND_CHANCE) special = 'legend';
      else if (r < LEGEND_CHANCE + RARE_CHANCE) special = 'golden';
    }
    return total / n;
  }

  // ════════ 스타일 ════════
  function injectStyle() {
    if ($('bc-style')) return;
    var st = document.createElement('style');
    st.id = 'bc-style';
    st.textContent =
      '@keyframes bcPulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.18)}}' +
      '@keyframes bcBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
      '@keyframes bcRipple{0%{opacity:.9;transform:translate(-50%,-50%) scale(.3)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.5)}}' +
      '@keyframes bcShake{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg) scale(1.1)}75%{transform:rotate(10deg) scale(1.1)}}' +
      '@keyframes bcPop{0%{opacity:0;transform:translateY(12px) scale(.7)}60%{opacity:1;transform:translateY(-2px) scale(1.05)}100%{opacity:1;transform:translateY(0) scale(1)}}' +
      '@keyframes bcFlash{0%{opacity:.85}100%{opacity:0}}' +
      '.bc-moving .bc-face{animation:bcBob .35s ease-in-out infinite}';
    document.head.appendChild(st);
  }

  // ════════ 화면 ════════
  function layout() {
    var view = $('bc-view'), world = $('bc-world');
    if (!view || !world) return;
    var cw = view.clientWidth, ch = view.clientHeight;
    if (!cw || !ch) return;
    var scale = Math.max(cw / IMG_W, ch / IMG_H);
    // 폴드처럼 화면이 세로로 짧고 넓으면 꽉 채우기(cover)가 지도를 위아래로 많이 잘라서 못 가는 곳이 생긴다 → 지도 전체가 보이게 세로에 맞춘다
    if (IMG_H * scale > ch * 1.12) scale = ch / IMG_H;
    var w = IMG_W * scale, h = IMG_H * scale;
    world.style.width = w + 'px';
    world.style.height = h + 'px';
    world.style.left = ((cw - w) / 2) + 'px';
    world.style.top = ((ch - h) / 2) + 'px';
  }

  function worldSize() {
    var w = $('bc-world');
    return { w: (w && w.offsetWidth) || 1, h: (w && w.offsetHeight) || 1 };
  }

  function pxDist(ax, ay, bx, by) {
    var ws = worldSize();
    var dx = (ax - bx) * ws.w, dy = (ay - by) * ws.h;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function buildPlayer(ch) {
    var url = 'url("' + encodeURI(ch.img || '') + '")';
    var wrap = document.createElement('div');
    wrap.id = 'bc-player';
    wrap.style.cssText = 'position:absolute;transform:translate(-50%,-50%);z-index:20;pointer-events:none;';
    var face = document.createElement('div');
    face.className = 'bc-face';
    var cropCss = 'background-color:#222;background-image:' + url + ';background-repeat:no-repeat;background-size:' + FACE_ZOOM + ' auto;background-position:' + FACE_POS + ';';
    face.style.cssText = 'width:50px;height:50px;border-radius:50%;border:3px solid ' + (ch.gradeColor || '#fff') + ';overflow:hidden;box-shadow:0 3px 10px rgba(0,0,0,.55);' + cropCss;
    var faceFile = FACE_FILES[ch.id || ''];
    if (faceFile) {
      // 얼굴 전용 이미지가 있으면 그걸 쓰고, 파일이 없으면 카드 이미지 크롭 그대로 보여줌
      var fi = new Image();
      fi.onload = function () {
        face.style.backgroundImage = 'url("' + encodeURI(IMG_BASE + faceFile + BUST) + '")';
        face.style.backgroundSize = '112% auto';
        face.style.backgroundPosition = 'center';
        face.style.backgroundColor = '#fff';
      };
      fi.src = IMG_BASE + faceFile + BUST;
    }
    var card = document.createElement('div');
    card.style.cssText = 'position:absolute;right:-22px;top:-32px;width:28px;height:40px;border-radius:5px;border:2px solid #fff;' +
      'background-image:' + url + ';background-size:cover;background-position:center;transform:rotate(12deg);box-shadow:0 2px 8px rgba(0,0,0,.6);';
    wrap.appendChild(face);
    wrap.appendChild(card);
    return wrap;
  }

  function placePlayer() {
    var p = $('bc-player');
    if (!p || !S) return;
    p.style.left = (S.px * 100) + '%';
    p.style.top = (S.py * 100) + '%';
    p.classList.toggle('bc-moving', !!S.moving);
  }

  // ════════ ❤️ HP / 회복약 ════════
  function potionById(id) { return POTIONS.filter(function (p) { return p.id === id; })[0] || null; }
  function potionQty(id) {
    var po = potionById(id);
    try { var it = bagItems.find(function (i) { return po && i.name === po.name; }); return it ? Math.max(0, Math.floor(Number(it.qty) || 0)) : 0; } catch (e) { return 0; }
  }
  function bagSnapshot() {
    var m = { coins: (typeof coins !== 'undefined') ? coins : 0, items: {} };
    try { bagItems.forEach(function (i) { m.items[i.name] = (m.items[i.name] || 0) + (Number(i.qty) || 0); }); } catch (e) {}
    return m;
  }
  function buildHpUi(view) {
    var box = document.createElement('div');
    box.id = 'bc-hpbox';
    box.style.cssText = 'position:absolute;top:6px;right:8px;z-index:36;display:flex;flex-direction:column;align-items:flex-end;gap:5px;font-family:\'Noto Sans KR\',sans-serif;';
    var bar = '<div style="width:130px;height:18px;border-radius:9px;background:rgba(0,0,0,.65);border:1.5px solid #f87171;position:relative;overflow:hidden;">' +
      '<div id="bc-hpfill" style="height:100%;width:100%;background:linear-gradient(90deg,#ef4444,#f97316);transition:width .3s;"></div>' +
      '<div id="bc-hptxt" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 3px #000;"></div></div>';
    var btns = POTIONS.filter(function (po) { return po.kind !== 'fatigue'; }).map(function (po) {
      return '<div class="bc-potion" data-p="' + po.id + '" style="display:flex;align-items:center;gap:5px;background:rgba(26,26,46,.9);border:1.5px solid #4ade80;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:900;color:#fff;cursor:pointer;user-select:none;-webkit-user-select:none;">' +
        po.emoji + '<span class="bc-pq"></span></div>';
    }).join('');
    box.innerHTML = bar + btns;
    box.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    Array.prototype.forEach.call(box.querySelectorAll('.bc-potion'), function (b) {
      b.onpointerdown = function (e) { e.stopPropagation(); e.preventDefault(); usePotion(b.getAttribute('data-p')); };
    });
    buildAutoUi(box);
    view.appendChild(box);
  }
  function hpRefresh() {
    if (!S) return;
    var f = $('bc-hpfill'), t = $('bc-hptxt');
    var pct = Math.max(0, Math.min(100, Math.round(S.hp / S.maxhp * 100)));
    if (f) { f.style.width = pct + '%'; f.style.background = pct <= 25 ? 'linear-gradient(90deg,#dc2626,#ef4444)' : 'linear-gradient(90deg,#ef4444,#f97316)'; }
    if (t) t.textContent = '❤️ ' + Math.max(0, Math.ceil(S.hp)) + '/' + S.maxhp;
    Array.prototype.forEach.call(document.querySelectorAll('.bc-potion'), function (b) {
      var q = potionQty(b.getAttribute('data-p'));
      var sp = b.querySelector('.bc-pq'); if (sp) sp.textContent = 'x' + q;
      b.style.opacity = q > 0 ? '1' : '.5';
    });
    try { autoUiRefresh(); } catch (e) {}   // 처음 입장할 때 자동 회복 글씨·퍼센트가 비어 있던 것 (칸이 화면에 붙기 전에 한 번만 채워서 그랬음)
  }
  function usePotion(id, auto) {
    var po = potionById(id);
    if (!S || !po) return false;
    if (S.fainted) return false;
    if (potionQty(id) <= 0) { if (!auto) toast(po.emoji + ' ' + po.name + '이(가) 없어요! 더보기 > 💖 팬 스킬 상점에서 살 수 있어요'); return false; }
    if (S.hp >= S.maxhp) { if (!auto) toast('HP가 이미 가득 차 있어요!'); return false; }
    try { if (typeof useFromBag === 'function') useFromBag(po.name, 1); } catch (e) {}
    S.hp = Math.min(S.maxhp, S.hp + po.heal);
    if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
    hpRefresh();
    banner('💚 ' + (auto ? '자동 ' : '') + po.name + '! HP ' + Math.ceil(S.hp) + '/' + S.maxhp);
    try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play('pick'); } catch (e) {}
    return true;
  }

  // 🔄 자동 회복: 켜 두면 HP가 정한 % 이하로 내려갈 때 회복약을 알아서 마신다 (작은 약부터, 없으면 큰 약)
  //   저장해 두기 때문에 다음 원정에도 그대로. 약이 하나도 없으면 안내만 하고 쓰지 않는다.
  var AUTO_KEY = 'poca_bc_autopotion';
  var AUTO_STEP = 5;                 // 바를 5% 단위로 조절
  function readAuto() {
    try {
      var a = JSON.parse(localStorage.getItem(AUTO_KEY) || 'null');
      if (a && typeof a.pct === 'number') return { on: !!a.on, pct: Math.max(0, Math.min(100, Math.round(a.pct))) };
    } catch (e) {}
    return { on: false, pct: 30 };
  }
  function writeAuto(a) { try { localStorage.setItem(AUTO_KEY, JSON.stringify(a)); } catch (e) {} }
  function autoPotion() {
    if (!S || S.fainted) return;
    var a = readAuto();
    if (!a.on) return;
    for (var n = 0; n < 6; n++) {
      if (S.hp / S.maxhp * 100 > a.pct || S.hp >= S.maxhp) return;
      var order = ['hp_s', 'hp_l'], used = false;
      for (var i = 0; i < order.length && !used; i++) used = usePotion(order[i], true);
      if (!used) {
        if (!S.autoWarned) { S.autoWarned = true; toast('🔄 자동 회복: 회복약이 없어요! 더보기 > 💖 팬 스킬 상점에서 살 수 있어요'); }
        return;
      }
    }
  }
  function autoUiRefresh() {
    var a = readAuto(), t = $('bc-autotog'), f = $('bc-autofill'), l = $('bc-autolbl');
    if (t) { t.textContent = a.on ? '🔄 자동 회복 ON' : '🔄 자동 회복 OFF'; t.style.borderColor = a.on ? '#4ade80' : '#888'; t.style.color = a.on ? '#4ade80' : '#bbb'; }
    if (f) f.style.width = a.pct + '%';
    if (l) l.textContent = 'HP ' + a.pct + '% 이하';
    var bar = $('bc-autobar'); if (bar) bar.style.opacity = a.on ? '1' : '.55';
  }
  function buildAutoUi(box) {
    // 자동 회복 조절: 드래그 바는 손가락이 스치기만 해도 %가 바뀌어서, [-] [+] 버튼으로만 바꾸게 함 (10% 단위, 눌러야만 바뀜)
    var wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:4px;';
    var BTN_S = 'width:34px;height:30px;border-radius:10px;background:rgba(26,26,46,.92);border:1.5px solid #4ade80;color:#fff;font-size:18px;font-weight:900;line-height:1;cursor:pointer;font-family:inherit;padding:0;';
    wrap.innerHTML =
      '<div id="bc-autotog" style="background:rgba(26,26,46,.92);border:1.5px solid #888;border-radius:999px;padding:4px 11px;font-size:12px;font-weight:900;color:#bbb;cursor:pointer;"></div>' +
      '<div id="bc-autobar" style="display:flex;align-items:center;gap:5px;">' +
        '<button id="bc-auto-minus" style="' + BTN_S + '">−</button>' +
        '<div id="bc-autolbl" style="min-width:74px;text-align:center;font-size:11px;font-weight:900;color:#fff;background:rgba(26,26,46,.92);border-radius:8px;padding:6px 4px;"></div>' +
        '<button id="bc-auto-plus" style="' + BTN_S + '">+</button></div>';
    box.appendChild(wrap);
    var tog = wrap.querySelector('#bc-autotog');
    function stop(e) { e.stopPropagation(); }
    ['pointerdown', 'pointerup', 'pointermove', 'touchstart', 'touchend', 'mousedown'].forEach(function (ev) { wrap.addEventListener(ev, stop); });
    tog.onclick = function (e) {
      e.stopPropagation();
      var a = readAuto(); a.on = !a.on; writeAuto(a); autoUiRefresh();
      if (a.on) { if (S) S.autoWarned = false; autoPotion(); }
    };
    function step(d) {
      var a = readAuto(); a.pct = Math.max(0, Math.min(100, Math.round((a.pct + d) / 10) * 10)); writeAuto(a); autoUiRefresh();
      if (S) { S.autoWarned = false; autoPotion(); }
    }
    wrap.querySelector('#bc-auto-minus').onclick = function (e) { e.stopPropagation(); step(-10); };
    wrap.querySelector('#bc-auto-plus').onclick = function (e) { e.stopPropagation(); step(10); };
    autoUiRefresh();
  }
  function hurt(type, viaSkill, love) {
    var base = HP_DMG[type] || 8;
    var m = viaSkill ? (love ? HP_SKILL_MULT.love : HP_SKILL_MULT.ok) : 1;
    var dmg = Math.max(1, Math.round(base * m));
    S.hp = Math.max(0, S.hp - dmg);
    hpRefresh();
    autoPotion();            // 🔄 자동 회복이 켜져 있으면 여기서 약을 마신다 (HP 0이 돼도 쓰러지기 전에 막을 수 있음)
    return dmg;
  }
  // 쓰러지면 이번 원정에서 얻은 코인 · 아이템 · 등교권을 전부 잃고 맵에서 쫓겨난다 (카드 EXP는 되돌릴 수 없어 그대로)
  function faint() {
    if (!S || S.fainted) return;
    S.fainted = true; S.paused = true; S.moving = false;
    var lost = [];
    var lc = Math.min(S.lootCoins || 0, (typeof coins !== 'undefined') ? coins : 0);
    if (lc > 0) { coins -= lc; lost.push('🍔 ' + lc.toLocaleString() + ' 코인'); }
    try {
      var snap = S.snap ? S.snap.items : {};
      bagItems.slice().forEach(function (i) {
        if (POTIONS.some(function (po) { return po.name === i.name; })) return;       // 회복약은 안 사라짐
        var gained = (Number(i.qty) || 0) - (snap[i.name] || 0);
        if (gained > 0) {
          if (typeof useFromBag === 'function') useFromBag(i.name, gained);
          lost.push((i.emoji || i.icon || '📦') + ' ' + i.name + ' x' + gained);
        }
      });
    } catch (e) {}
    if (S.lootTickets > 0 && typeof schoolDaily !== 'undefined') {
      schoolDaily.tickets = Math.max(0, (schoolDaily.tickets || 0) - S.lootTickets);
      if (typeof saveSchoolDaily === 'function') saveSchoolDaily();
      lost.push('🎫 등교권 x' + S.lootTickets);
    }
    if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
    if (typeof updateCoinsDisplay === 'function') { try { updateCoinsDisplay(); } catch (e) {} }
    hud();
    var chips = lost.map(function (t) {
      return '<div style="display:inline-block;background:rgba(255,255,255,.1);border:1.5px solid #f87171;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:900;margin:3px;">' + t + '</div>';
    }).join('');
    panel('<div style="font-size:21px;font-weight:900;margin-bottom:6px;">😵 팬들한테 치여서 쓰러졌어요!</div>' +
      '<div style="font-size:12px;color:#ddd;margin-bottom:8px;">이번 원정에서 얻은 보상을 전부 놓쳤어요</div>' +
      '<div style="margin-bottom:12px;">' + (chips || '<div style="font-size:12px;color:#aaa;">잃은 보상은 없어요</div>') + '</div>' +
      '<button id="bc-faint-out" style="' + BTN + '">맵에서 나가기</button>');
    $('bc-faint-out').onclick = function () { var o = $('special-overlay'); if (o) o.remove(); };
  }

  function hud() {
    hpRefresh();
    var el = $('bc-stam');
    var ef = $('bc-eff');
    if (ef && S) {
      var gearLine = '';
      try {
        var gq = (typeof getEquippedGearFor === 'function') ? getEquippedGearFor(S.charId) : null;
        if (gq) gearLine = gq.emoji + ' ' + gq.baseName + (gq.value ? ' +' + gq.value + (gq.effect === 'retry' ? '회' : '%') : '');
      } catch (e) {}
      var pb = (typeof window.getPremiumBonus === 'function') ? (window.getEquippedPremiumBonus ? window.getEquippedPremiumBonus() : null) : null;
      if (MAP.encore) {
        var hasEng = Object.keys(engAll()).some(function (k) { return k !== 'cheer' && Number(engAll()[k]); });
        ef.style.display = 'block';
        ef.textContent = '🎤 ' + Math.min(S.done || 0, ENCORE_N) + '/' + ENCORE_N + (hasEng ? ' · ✨현상 효과' : '');
      } else if (pb && MAP.pieces) {
        ef.style.display = 'block';
        ef.innerHTML = '💎 Lv.' + pb.lv + ' · 📸 +' + (pb.skill * 100).toFixed(1).replace('.0', '') + '%p · 🎬 ' + Math.round(pb.extra * 100) + '%' + (window.getPremiumEquipLines ? window.getPremiumEquipLines().map(function (t) { return '<br>' + t; }).join('') : '') + (gearLine ? '<br>' + gearLine : '');
      } else if (gearLine) {
        ef.style.display = 'block';
        ef.innerHTML = gearLine;
      } else ef.style.display = 'none';
    }
    if (el && typeof stamina !== 'undefined') el.textContent = '⚡ ' + stamina + '/' + (typeof STAMINA_MAX !== 'undefined' ? STAMINA_MAX : '') + ' · 이벤트 ⚡' + staminaCost() + (MAP.pieces ? ' · 🎁 ' + boxLoad().n + '/' + BOX_NEED : '');
  }

  var bannerTimer = null;
  function banner(text) {
    var b = $('bc-banner');
    if (!b) return;
    b.textContent = text;
    b.style.display = 'block';
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { var bb = $('bc-banner'); if (bb) bb.style.display = 'none'; }, 4800);
  }

  function panel(html) {
    var p = $('bc-panel');
    if (!p) {
      p = document.createElement('div');
      p.id = 'bc-panel';
      p.style.cssText = 'position:absolute;left:10px;right:10px;bottom:14px;z-index:40;background:linear-gradient(135deg,rgba(26,26,46,.97),rgba(45,27,78,.97));' +
        'border:2px solid #C084FC;border-radius:20px;padding:16px 14px;text-align:center;color:#fff;box-shadow:0 8px 30px rgba(0,0,0,.65);font-family:\'Noto Sans KR\',sans-serif;max-height:62%;overflow-y:auto;-webkit-overflow-scrolling:touch;';
      $('bc-view').appendChild(p);
    }
    p.innerHTML = html;
    return p;
  }
  function closePanel() { var p = $('bc-panel'); if (p) p.remove(); }

  var BTN = 'width:100%;padding:13px;border:none;border-radius:13px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;background:linear-gradient(135deg,#FF6B9D,#C084FC);';

  function flash() {
    var v = $('bc-view');
    if (!v) return;
    var f = document.createElement('div');
    f.style.cssText = 'position:absolute;inset:0;background:#fff;z-index:35;pointer-events:none;animation:bcFlash .35s ease-out forwards;';
    v.appendChild(f);
    setTimeout(function () { f.remove(); }, 380);
  }

  // ════════ 이벤트(마커) ════════
  function markerFor(ev) {
    var el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:' + (ev.x * 100) + '%;top:' + (ev.y * 100) + '%;transform:translate(-50%,-50%);z-index:10;pointer-events:none;animation:bcPulse 1s ease-in-out infinite;text-align:center;';
    if (ev.kind === 'normal') {
      el.innerHTML = '<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid #FF6B9D;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px #FF6B9D;">❗</div>';
    } else {
      var legend = ev.type === 'legend';
      if (!legend) {   // 🌟 황금 셔터(레어 팬): 별 모양 대신 레어팬 얼굴 (rarefan-1~4.png, 없으면 🌟)
        ev.face = ev.face || (1 + Math.floor(Math.random() * 4));
        el.innerHTML = '<div style="width:58px;height:58px;display:flex;align-items:center;justify-content:center;"><img src="' + IMG_BASE + 'rarefan-' + ev.face + '.png" alt="" draggable="false" style="width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 0 10px #FFD700);" onerror="this.outerHTML=\'<span style=&quot;font-size:34px;&quot;>🌟</span>\'"></div>' +
          '<div class="bc-ttl" style="margin-top:2px;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 4px #000;"></div>';
        $('bc-layer').appendChild(el); ev.el = el; return el;
      }
      el.innerHTML = '<div style="width:48px;height:48px;border-radius:50%;background:' + (legend ? 'linear-gradient(135deg,#ff5a36,#ffb703)' : 'linear-gradient(135deg,#FFD700,#FF9F43)') +
        ';border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 0 20px #FFD700;">' + (legend ? ((ev.npc && !NPC_READY[ev.npc.id] && ev.npc.emoji) || (ev.npc ? '' : '🔥')) : '🌟') + '</div>' +
        '<div class="bc-ttl" style="margin-top:2px;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 4px #000;"></div>';
    }
    $('bc-layer').appendChild(el);
    ev.el = el;
    if (ev.type === 'legend' && ev.npc) {
      var mk = el.firstChild, pi = new Image();
      var showPhoto = function () {
        if (!mk) return;
        mk.textContent = '';
        mk.style.backgroundImage = 'url("' + IMG_BASE + ev.npc.img + BUST + '")';
        mk.style.backgroundSize = 'cover';
        mk.style.backgroundPosition = '50% 20%';
        mk.style.borderColor = '#ff3b30';
      };
      if (NPC_READY[ev.npc.id]) showPhoto(); else { pi.onload = showPhoto; pi.src = IMG_BASE + ev.npc.img + BUST; }
    }
  }

  function removeEvent(ev) {
    if (ev.el && ev.el.parentNode) ev.el.parentNode.removeChild(ev.el);
    var i = S.events.indexOf(ev);
    if (i !== -1) S.events.splice(i, 1);
  }

  function spawnNormal() {
    var used = S.events.map(function (e) { return e.spot; });
    var cand = MAP.normal.filter(function (s) { return used.indexOf(s) === -1; });
    var far = cand.filter(function (s) { return pxDist(s.x, s.y, S.px, S.py) > 90; });
    if (far.length) cand = far;
    cand.sort(function (a, b) { return pxDist(a.x, a.y, S.px, S.py) - pxDist(b.x, b.y, S.px, S.py); });
    var spot = cand[Math.floor(Math.random() * Math.min(4, cand.length))];
    if (!spot) return;
    var ev = { kind: 'normal', type: pickNormal(), x: spot.x, y: spot.y, spot: spot, skip: false };
    S.events.push(ev);
    markerFor(ev);
  }

  function fillNormals() {
    var n = S.events.filter(function (e) { return e.kind === 'normal'; }).length;
    var guard = 0;
    while (n < NORMAL_MAX && guard++ < 6) { spawnNormal(); n++; }
  }

  function hasSpecial() { return S.events.some(function (e) { return e.kind === 'special'; }); }

  function spawnSpecial(type) {
    var legend = type === 'legend';
    var spot = legend ? MAP.legend : MAP.rare[Math.floor(Math.random() * MAP.rare.length)];
    var ttl = legend ? LEGEND_TTL : RARE_TTL;
    var ev = { kind: 'special', type: legend ? 'legend' : 'golden', x: spot.x, y: spot.y, spot: spot, ttl: ttl, skip: false };
    if (legend) ev.npc = NPCS[Math.floor(Math.random() * NPCS.length)];
    S.events.push(ev);
    markerFor(ev);
    var name = (typeof CHARS !== 'undefined' && CHARS[S.charId]) ? CHARS[S.charId].name : '아이돌';
    banner(legend ? ('🚨 특별 NPC 출현! ' + ev.npc.emoji + ' ' + ev.npc.name + '이(가) ' + spot.label + '에 나타났어요! (' + ttl + '초)')
                  : ('🚨 레어 목격정보! ' + spot.label + '에서 ' + name + ' 포착! (' + ttl + '초)'));
  }

  function afterEvent() {
    fillNormals();
    if (!hasSpecial()) {
      var r = Math.random();
      var npcChance = LEGEND_CHANCE * (1 + gearVal(S.charId, 'variant') / 100) + (typeof window.__hfxNpcBonus === 'function' ? window.__hfxNpcBonus() : 0);   // 소품 '변종 출현' = NPC 출현 확률 증가
      if (r < npcChance) spawnSpecial('legend');
      else if (r < npcChance + RARE_CHANCE) spawnSpecial('golden');
    }
  }

  // ════════ 보상 지급 ════════
  function giveCardExp(charId, amt) {
    if (amt <= 0) return;
    if (typeof addCardExp === 'function') { addCardExp(charId, amt); return; }
    try {
      var d = JSON.parse(localStorage.getItem('ph_cardExp') || '{}');
      d[charId] = (d[charId] || 0) + amt;
      localStorage.setItem('ph_cardExp', JSON.stringify(d));
    } catch (e) {}
  }

  function pieceCount() {
    if (typeof bagItems === 'undefined') return 0;
    var it = bagItems.find(function (i) { return i.name === PIECE_NAME; });
    return it ? it.qty : 0;
  }

  function dropGear(minGrade) {
    if (typeof SPECIAL_GEAR === 'undefined' || typeof SPECIAL_GEAR_GRADES === 'undefined') return null;
    var roll = Math.random();
    var grade = roll < 0.001 ? 'legend' : roll < 0.01 ? 'rare' : roll < 0.05 ? 'great' : 'common';
    if (minGrade === 'great' && grade === 'common') grade = 'great';   // 특별 NPC 성공: 고급 이상 확정
    var g = SPECIAL_GEAR[Math.floor(Math.random() * SPECIAL_GEAR.length)];
    var label = SPECIAL_GEAR_GRADES[grade];
    var eff = gearEffectText(g.effect, gearScaledValue(g, grade));
    if (!addToBag(g.emoji, '[' + label + '] ' + g.name, 'gear', 1, '팬덤 원정 소품 · ' + eff)) return null;
    return { icon: g.emoji, text: '[' + label + '] ' + g.name + ' (' + eff + ')', color: '#C084FC' };
  }

  function gearOf(charId) {
    try { return (typeof getEquippedGearFor === 'function') ? getEquippedGearFor(charId) : null; } catch (e) { return null; }
  }
  function gearVal(charId, effect) {
    var g = gearOf(charId);
    return (g && g.effect === effect) ? g.value : 0;
  }
  function toolQty(tool) {
    if (typeof bagItems === 'undefined') return 0;
    var it = bagItems.find(function (i) { return i.name === tool.name && i.type === 'tool'; });
    return it ? it.qty : 0;
  }

  function enhDrop(type, success) {
    if (!success) return [];
    var rare = (type === 'golden' || type === 'legend');
    var t = rare ? MAP.enh.variant : MAP.enh.normal;
    var d = { stone: Math.random() < t.stone * Math.max(0, 1 + engB('stone')) ? 1 : 0, protect: Math.random() < t.protect * Math.max(0, 1 + engB('protect')) ? 1 : 0, trans: Math.random() < t.trans ? 1 : 0 };
    if (type === 'legend') d.stone = Math.max(d.stone, MAP.enh.npcStone || 1);          // 특별 NPC 성공: 강화석 확정
    if (!d.stone && !d.protect && !d.trans) return [];
    // 강화 재료는 가방 아이템으로 들어간다 (enhance.js 와 같은 이름/종류). 가방이 가득 차면 ph_enhance 에 임시 보관 → 다음에 가방으로 옮겨짐
    var MATS = { stone: ['🔨', '강화석', '히든카드 강화 재료 · 더보기 > 트레이닝룸에서 사용해요'], protect: ['🛡️', '방지권', '히든카드 강화 실패 방지 · 더보기 > 트레이닝룸에서 사용해요'], trans: ['💎', '초월석', '히든카드 초월 재료 · 더보기 > 트레이닝룸에서 사용해요'] };
    var st = null, overflow = false;
    try { st = JSON.parse(localStorage.getItem(ENH_KEY) || 'null'); } catch (e) {}
    if (!st || typeof st !== 'object') st = {};
    ['stone', 'protect', 'trans'].forEach(function (k) {
      if (!d[k]) return;
      var ok = false;
      try { ok = typeof addToBag === 'function' && !!addToBag(MATS[k][0], MATS[k][1], 'enhance', d[k], MATS[k][2]); } catch (e) {}
      if (!ok) { st[k] = Math.max(0, Math.floor(Number(st[k]) || 0)) + d[k]; overflow = true; }
    });
    if (overflow) {
      if (!st.level || typeof st.level !== 'object') st.level = {};
      if (!st.stage || typeof st.stage !== 'object') st.stage = {};
      try { localStorage.setItem(ENH_KEY, JSON.stringify(st)); } catch (e) {}
      toast('가방이 가득 차서 강화 재료가 임시 보관돼요! 가방을 비워주세요');
    }
    if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
    var out = [];
    if (d.stone) out.push({ icon: '🔨', text: '강화석 +' + d.stone, color: '#FFD700' });
    if (d.protect) out.push({ icon: '🛡️', text: '방지권 +1', color: '#4ade80' });
    if (d.trans) out.push({ icon: '💎', text: '초월석 +1', color: '#60A5FA' });
    return out;
  }

  function addTicket() {
    if (typeof schoolDaily === 'undefined') return;
    schoolDaily.tickets = (schoolDaily.tickets || 0) + 1;
    if (S) S.lootTickets = (S.lootTickets || 0) + 1;
    if (typeof saveSchoolDaily === 'function') saveSchoolDaily();
  }

  // 기존 특별탐험과 같은 방식: 등교권 직접 드랍, 아니면 조각(10개 = 등교권 1장)
  function ticketDrop(type) {
    var t = TICKET[type];
    if (!t) return null;
    var tm = Math.max(0, 1 + engB('ticket'));
    if (Math.random() < t[0] * tm) { addTicket(); return { icon: '🎫', text: '등교권 +1', color: '#60A5FA' }; }
    if (Math.random() < t[1] * tm) {
      if (typeof addToBag === 'function') addToBag('🎫', '등교권 조각', 'ticket_fragment', 1, '10개 모으면 등교권 1장으로 교환!');
      var cnt = 0;
      try { var st = JSON.parse(localStorage.getItem('ph_ticketFragments') || '0'); cnt = (typeof st === 'number' ? st : 0) + 1; } catch (e) { cnt = 1; }
      if (cnt >= 10) {
        cnt = 0; addTicket();
        try { localStorage.setItem('ph_ticketFragments', JSON.stringify(0)); } catch (e) {}
        return { icon: '🎫', text: '등교권 +1 (조각 10개 완성!)', color: '#60A5FA' };
      }
      try { localStorage.setItem('ph_ticketFragments', JSON.stringify(cnt)); } catch (e) {}
      return { icon: '🎫', text: '등교권 조각 +1', color: '#60A5FA' };
    }
    return null;
  }

  // 🎞️ 필름: 시크릿 포토랩 현상 재료 (맵의 film 표대로)
  function filmDrop(type, success) {
    if (!success || !MAP.film) return [];
    var n = 0, m = Math.max(0, 1 + engB('film'));
    if (type === 'legend') n = MAP.film.npc || 0;
    else if (Math.random() < (type === 'golden' ? MAP.film.golden : MAP.film.normal) * m) n = 1;
    if (n <= 0) return [];
    if (typeof addToBag !== 'function' || !addToBag(FILM_EMOJI, FILM_NAME, 'film', n, '시크릿 포토랩 현상 재료 · 공연장 앵콜 스테이지에서 사용')) {
      toast('가방이 가득 차서 필름을 못 받았어요! 가방을 비워주세요');
      return [];
    }
    return [{ icon: FILM_EMOJI, text: FILM_NAME + ' +' + n, color: '#fb7185' }];
  }

  // 🧪 현상액: 포토랩 옵션 강화 재료 (맵의 dev 표대로 · 공연장에서만)
  function devDrop(type, success) {
    if (!success || !MAP.dev) return [];
    var n = 0, m = Math.max(0, 1 + engB('film'));
    if (type === 'legend') n = MAP.dev.npc || 0;
    else if (Math.random() < (type === 'golden' ? MAP.dev.golden : MAP.dev.normal) * m) n = 1;
    if (n <= 0) return [];
    if (typeof addToBag !== 'function' || !addToBag(DEV_EMOJI, DEV_NAME, 'film', n, '포토랩 옵션 강화 재료 · 공연장에서 얻어요')) {
      toast('가방이 가득 차서 현상액을 못 받았어요! 가방을 비워주세요');
      return [];
    }
    return [{ icon: DEV_EMOJI, text: DEV_NAME + ' +' + n, color: '#34d399' }];
  }

  // 📚 스킬북: 팬덤 원정 이벤트 성공 시 가끔 (드라마 촬영 스킬 숙련도 아이템 — skillbook.js 와 같은 이름). 종류는 무작위
  var BOOKS = [
    { cat: '감정', name: '감정 스킬북', emoji: '📕' },
    { cat: '액션', name: '액션 스킬북', emoji: '📙' },
    { cat: '애드리브', name: '애드리브 스킬북', emoji: '📗' },
    { cat: '보조', name: '보조 스킬북', emoji: '📘' }
  ];
  var BOOK_RATE = { normal: 0.02, golden: 0.06, npc: 0.3 };    // 일반 / 황금 / 특별 NPC 성공 시 나올 확률 (0.02 = 2%)
  function bookDrop(type, success) {
    if (!success) return [];
    var p = type === 'legend' ? BOOK_RATE.npc : (type === 'golden' ? BOOK_RATE.golden : BOOK_RATE.normal);
    if (Math.random() >= p) return [];
    var bk = BOOKS[Math.floor(Math.random() * BOOKS.length)];
    if (typeof addToBag !== 'function' || !addToBag(bk.emoji, bk.name, 'skillbook', 1, '드라마 촬영 ' + bk.cat + ' 스킬 숙련도 +5 · 🎥 드라마 촬영 > 준비 화면 > 스킬 세팅에서 사용해요')) {
      toast('가방이 가득 차서 스킬북을 못 받았어요! 가방을 비워주세요');
      return [];
    }
    return [{ icon: bk.emoji, text: bk.name + ' +1', color: '#60a5fa' }];
  }


  // ════════ 🎁 조각 상자 (뽑기) ════════
  //  방송국 앞에서 이벤트를 BOX_NEED 번 하면 상자가 열리고, 프리미엄 조각이 랜덤 개수로 나온다.
  //  평균 약 25개 (스태미나 3,000 = 이벤트 100번 기준). 확률/개수는 아래 BOX_TIERS 만 고치면 됨.
  var BOX_KEY = 'ph_pieceBox', BOX_NEED = 100;
    var BOX_TIERS = [   // w: 확률(%), min~max: 조각 개수
    { name: '아쉬운 상자', w: 5,  min: 5,   max: 10,  color: '#9ca3af' },
    { name: '일반 상자',   w: 60, min: 12,  max: 25,  color: '#7dd3fc' },
    { name: '레어 상자',   w: 25, min: 29,  max: 40,  color: '#c084fc' },
    { name: '에픽 상자',   w: 8,  min: 41,  max: 60,  color: '#fbbf24' },
    { name: '🌟 대박 상자', w: 2,  min: 100, max: 100, color: '#ff6b9d' }
  ];
  function boxLoad() { try { var o = JSON.parse(localStorage.getItem(BOX_KEY) || 'null'); if (o && isFinite(o.n)) return { n: o.n | 0, bonus: o.bonus | 0 }; } catch (e) {} return { n: 0, bonus: 0 }; }
  function boxSave(o) { try { localStorage.setItem(BOX_KEY, JSON.stringify(o)); } catch (e) {} }
  function boxAdd(bonus) { var o = boxLoad(); o.n += 1; o.bonus += (bonus | 0); boxSave(o); }
  function boxRoll() {
    var r = Math.random() * 100, acc = 0, t = BOX_TIERS[1];
    for (var i = 0; i < BOX_TIERS.length; i++) { acc += BOX_TIERS[i].w; if (r < acc) { t = BOX_TIERS[i]; break; } }
    return { tier: t, n: t.min + Math.floor(Math.random() * (t.max - t.min + 1)) };
  }
  var boxSnooze = 0;
  function pieceIcon(sz) { try { if (typeof window.matIcon === 'function') return window.matIcon(PIECE_NAME, sz, PIECE_EMOJI); } catch (e) {} return PIECE_EMOJI; }
  window.__bcBoxOpen = function () { boxOpen(); };   // 테스트용
  window.__bcBoxCount = function (n) { var o = boxLoad(); o.n += (n | 0); boxSave(o); try { hud(); } catch (e) {} return true; };   // 팬 스킬로 응대해도 상자 진행 +1
  window.__bcBoxBonus = function (n) { var o = boxLoad(); o.bonus += (n | 0); boxSave(o); return true; };   // 팬 스킬 등: 조각을 바로 주지 않고 뽑기 상자에 덤으로 쌓기
  var RAW = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  function boxOpen() {
    if ($('bc-box-ov')) return;
    // 뽑기 기계 그림 기준 좌표 (그림 크기 1086 x 1448)
    var IW = 1086, IH = 1448, WIN = { x: 215, y: 365, w: 649, h: 618 }, CHUTE = { x: 148, y: 1186, w: 324, h: 178 }, BTN = { x: 868, y: 1175, r: 62 };
    var W = Math.floor(Math.min(window.innerWidth - 16, (window.innerHeight - 90) * IW / IH, 440)), s = W / IW, H = Math.round(IH * s);
    var ww = Math.round(WIN.w * s), wh = Math.round(WIN.h * s);
    var cw = Math.round(W * 0.17), spH = Math.round(cw * 464 / 360), bs = Math.round(W * 0.125);
    var ov = document.createElement('div'); ov.id = 'bc-box-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99998;background:radial-gradient(circle at 50% 30%,#3b1a5c,#120a24 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:"Noto Sans KR",sans-serif;color:#fff;overflow:hidden;';
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (t) { ov.addEventListener(t, function (e) { e.stopPropagation(); }); });
    ov.innerHTML = '<style>' +
      '@keyframes cmBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.06)}}' +
      '@keyframes cmShake{0%,100%{transform:translate(-50%,-50%) rotate(0)}20%{transform:translate(-56%,-50%) rotate(-10deg)}40%{transform:translate(-44%,-50%) rotate(10deg)}60%{transform:translate(-55%,-50%) rotate(-8deg)}80%{transform:translate(-45%,-50%) rotate(8deg)}}' +
      '@keyframes cmPop{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}' +
      '</style>' +
      '<div id="cm" style="position:relative;width:' + W + 'px;height:' + H + 'px;">' +
        '<div id="cm-win" style="position:absolute;left:' + Math.round(WIN.x * s) + 'px;top:' + Math.round(WIN.y * s) + 'px;width:' + ww + 'px;height:' + wh + 'px;overflow:hidden;background:linear-gradient(180deg,#6b3a9c,#2f1650);">' +
          '<div id="cm-pile"></div>' +
          '<div id="cm-claw" style="position:absolute;top:0;left:' + Math.round(ww / 2 - cw / 2) + 'px;width:' + cw + 'px;z-index:2;">' +
            '<div id="cm-line" style="width:' + Math.round(cw * 0.16) + 'px;height:10px;margin:0 auto;background:linear-gradient(90deg,#c9b3f7,#9d7be0,#c9b3f7);"></div>' +
            '<div style="position:relative;width:' + cw + 'px;height:' + spH + 'px;">' +
              '<div id="cm-hold" style="position:absolute;left:0;top:0;width:' + cw + 'px;height:' + spH + 'px;z-index:1;"></div>' +
              '<img id="cm-open" src="' + RAW + 'claw-hook.png" alt="" style="display:block;width:' + cw + 'px;height:' + spH + 'px;position:relative;z-index:2;">' +
              '<img id="cm-closed" src="' + RAW + 'claw-hook-closed.png" alt="" style="display:none;width:' + cw + 'px;height:' + spH + 'px;position:relative;z-index:2;">' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<img src="' + RAW + 'claw-machine.png" alt="" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;">' +
        '<div id="cm-chute" style="position:absolute;left:' + Math.round((CHUTE.x + CHUTE.w / 2) * s) + 'px;top:' + Math.round((CHUTE.y + CHUTE.h * 0.62) * s) + 'px;width:0;height:0;z-index:4;"></div>' +
        '<div id="cm-hit" style="position:absolute;left:' + Math.round((BTN.x - BTN.r) * s) + 'px;top:' + Math.round((BTN.y - BTN.r) * s) + 'px;width:' + Math.round(BTN.r * 2 * s) + 'px;height:' + Math.round(BTN.r * 2 * s) + 'px;border-radius:50%;z-index:5;cursor:pointer;animation:cmBlink 1.1s ease-in-out infinite;box-shadow:0 0 0 3px #fff8,0 0 14px 4px #ffe08a;"></div>' +
        '<div id="cm-fx" style="position:absolute;inset:0;pointer-events:none;z-index:6;"></div>' +
        '<div id="cm-res" style="position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,5,25,.84);z-index:7;"></div>' +
      '</div>' +
      '<div id="cm-msg" style="margin-top:8px;font-size:12px;color:#e9d5ff;text-align:center;">버튼을 눌러서 뽑아봐요!</div>' +
      '<button id="cm-btn" style="margin-top:6px;padding:11px 36px;border:none;border-radius:22px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:15px;font-weight:900;font-family:inherit;animation:cmBlink 1.1s ease-in-out infinite;">🕹️ 뽑기 시작!</button>';
    document.body.appendChild(ov);
    var cm = $('cm'), claw = $('cm-claw'), line = $('cm-line'), hold = $('cm-hold'), pile = $('cm-pile'), btn = $('cm-btn'), msg = $('cm-msg');
    var openI = $('cm-open'), closedI = $('cm-closed');
    var BOXN = 6, hues = [0, 45, 200, 280, 330, 130], boxes = [], xs = [];
    var gap = (ww - bs - 10) / (BOXN - 1);
    for (var i = 0; i < BOXN; i++) {
      var bl = 5 + i * gap, bb = (i % 2 ? bs * 0.28 : 0) - bs * 0.08;
      var b = document.createElement('img');
      b.src = RAW + 'box-piece-gacha.png'; b.alt = '';
      b.style.cssText = 'position:absolute;left:' + bl + 'px;bottom:' + bb + 'px;width:' + bs + 'px;height:' + bs + 'px;object-fit:contain;filter:hue-rotate(' + hues[i] + 'deg);z-index:' + (i % 2 ? 0 : 1) + ';';
      pile.appendChild(b); boxes.push(b); xs.push(bl + bs / 2);
    }
    var minX = cw / 2 + 4, maxX = ww - cw / 2 - 4;
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function moveX(cx, ms) { cx = Math.max(minX, Math.min(maxX, cx)); claw.style.transition = 'left ' + ms + 'ms ease-in-out'; claw.style.left = (cx - cw / 2) + 'px'; return wait(ms + 40); }
    function lineTo(h, ms) { line.style.transition = 'height ' + ms + 'ms ease-in-out'; line.style.height = h + 'px'; return wait(ms + 40); }
    function setClosed(c) { openI.style.display = c ? 'none' : 'block'; closedI.style.display = c ? 'block' : 'none'; }
    function burst(cx, cy, color) {
      var fx = $('cm-fx'), em = ['piece', 'sparkle', 'heart', 'star', 'gift', 'sparkle'];
      for (var k = 0; k < 28; k++) {
        var p = document.createElement('div'), a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 130, kind = em[k % em.length], sz = Math.round(18 + Math.random() * 14);
        if (kind === 'piece') p.innerHTML = pieceIcon(sz + 6);
        else p.innerHTML = '<img src="' + RAW + 'em-' + kind + '.png" alt="" style="width:' + sz + 'px;height:' + sz + 'px;display:block;">';
        p.style.cssText = 'position:absolute;left:' + cx + 'px;top:' + cy + 'px;line-height:0;transition:transform .9s cubic-bezier(.1,.7,.3,1),opacity .9s ease-in;transform:translate(-50%,-50%);opacity:1;';
        fx.appendChild(p);
        (function (p, a, d) { setTimeout(function () { p.style.transform = 'translate(' + (Math.cos(a) * d) + 'px,' + (Math.sin(a) * d - 40) + 'px) scale(.6) rotate(' + (a * 90) + 'deg)'; p.style.opacity = '0'; }, 30); })(p, a, d);
      }
      var fl = document.createElement('div');
      fl.style.cssText = 'position:absolute;left:' + (cx - 90) + 'px;top:' + (cy - 90) + 'px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,' + color + ',transparent 70%);opacity:.9;transition:transform .7s,opacity .7s;transform:scale(.3);';
      fx.appendChild(fl); setTimeout(function () { fl.style.transform = 'scale(2.4)'; fl.style.opacity = '0'; }, 30);
      setTimeout(function () { fx.innerHTML = ''; }, 1200);
    }
    var running = false, h0 = 10;
    line.style.height = h0 + 'px';
    function start() {
      if (running) return; running = true;
      btn.style.animation = 'none'; btn.disabled = true; btn.style.opacity = '.5'; btn.textContent = '뽑는 중…';
      $('cm-hit').style.animation = 'none'; $('cm-hit').style.boxShadow = 'none';
      var target = Math.floor(Math.random() * BOXN);
      var mid = [ww * 0.2, ww * 0.8, ww * 0.4, ww * 0.65];
      msg.textContent = '갈고리가 움직여요…';
      (async function () {
        for (var m = 0; m < mid.length; m++) await moveX(mid[m], 480);
        await moveX(xs[target], 520);
        msg.textContent = '내려간다!';
        var h1 = Math.max(h0 + 20, wh - bs * 1.1 - spH * 0.85);
        await lineTo(h1, 800);
        setClosed(true); await wait(450);
        var bx = boxes[target], pr = bx.getBoundingClientRect(), gr = claw.getBoundingClientRect();
        hold.appendChild(bx);
        bx.style.cssText = 'position:absolute;left:' + ((cw - bs) / 2) + 'px;top:' + (spH * 0.7) + 'px;width:' + bs + 'px;height:' + bs + 'px;object-fit:contain;filter:hue-rotate(' + hues[target] + 'deg);';
        msg.textContent = '잡았다!';
        await lineTo(h0, 800);
        await moveX(minX, 800);
        setClosed(false); await wait(150);
        // 상자 떨어뜨림 → 꺼내는 곳에 나타남
        var fall = bx.getBoundingClientRect(), wr = $('cm-win').getBoundingClientRect();
        $('cm-win').appendChild(bx);
        bx.style.cssText = 'position:absolute;left:' + (fall.left - wr.left) + 'px;top:' + (fall.top - wr.top) + 'px;width:' + bs + 'px;height:' + bs + 'px;object-fit:contain;filter:hue-rotate(' + hues[target] + 'deg);transition:top .5s cubic-bezier(.5,0,1,.6),opacity .3s .3s;z-index:3;';
        await wait(30);
        bx.style.top = (wh + 4) + 'px'; bx.style.opacity = '0'; await wait(620);
        bx.remove();
        var ch = $('cm-chute'), cb = document.createElement('img');
        cb.src = RAW + 'box-piece-gacha.png'; cb.alt = '';
        var cbs = Math.round(bs * 1.35);
        cb.style.cssText = 'position:absolute;left:0;top:0;width:' + cbs + 'px;height:' + cbs + 'px;object-fit:contain;transform:translate(-50%,-50%) scale(.2);transition:transform .35s cubic-bezier(.2,1.6,.4,1);filter:hue-rotate(' + hues[target] + 'deg);';
        ch.appendChild(cb); await wait(30); cb.style.transform = 'translate(-50%,-50%) scale(1)'; await wait(450);
        msg.textContent = '두근두근…';
        cb.style.transition = 'none'; cb.style.animation = 'cmShake .6s ease-in-out 2'; await wait(1250);
        // 결과 결정 + 가방에 넣기
        var st = boxLoad(), rr = boxRoll(), total = rr.n + st.bonus, ok = false;
        try { ok = !!addToBag(PIECE_EMOJI, PIECE_NAME, 'piece', total, '프리미엄 카드 조각 · ' + PIECE_GOAL + '개를 모으면 더보기 > 프리미엄 카드에서 교환'); } catch (e) {}
        var res = $('cm-res');
        if (!ok) {
          cb.remove();
          res.style.display = 'flex';
          res.innerHTML = '<div style="text-align:center;padding:20px;"><div style="font-size:15px;font-weight:900;color:#ff9a9a;">가방이 꽉 차서 못 열었어요</div><div style="font-size:12px;margin-top:6px;color:#ddd;">슬롯을 비우면 다시 뽑을 수 있어요</div><button id="cm-close" style="margin-top:14px;padding:12px 26px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:14px;font-weight:900;font-family:inherit;">닫기</button></div>';
          $('cm-close').onclick = function () { boxSnooze = Date.now() + 60000; ov.remove(); };
          return;
        }
        boxSave({ n: Math.max(0, st.n - BOX_NEED), bonus: 0 });
        if (typeof saveAll === 'function') saveAll();
        try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play('rarePick'); } catch (e) {}
        var cr = cb.getBoundingClientRect(), mr = cm.getBoundingClientRect();
        cb.style.animation = 'none'; cb.style.transition = 'transform .25s,opacity .25s'; cb.style.transform = 'translate(-50%,-50%) scale(2)'; cb.style.opacity = '0';
        burst(cr.left - mr.left + cr.width / 2, cr.top - mr.top + cr.height / 2, rr.tier.color);
        await wait(800);
        var have = pieceCount();
        res.style.display = 'flex';
        res.innerHTML = '<div style="text-align:center;padding:20px;animation:cmPop .5s ease-out;">' +
          '<div style="font-size:16px;font-weight:900;color:' + rr.tier.color + ';">' + rr.tier.name + '!</div>' +
          '<div style="font-size:34px;font-weight:900;color:#7dd3fc;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px;">' + pieceIcon(46) + '+' + total + '</div>' +
          '<div style="font-size:13px;margin-top:4px;color:#eee;">프리미엄 조각</div>' +
          '<div style="font-size:12px;margin-top:6px;color:#ddd;">' + (st.bonus ? '(상자 ' + rr.n + ' + 카드 효과 ' + st.bonus + ') · ' : '') + '모은 조각 ' + have + '/' + PIECE_GOAL + '</div>' +
          '<button id="cm-ok" style="margin-top:16px;padding:12px 34px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:15px;font-weight:900;font-family:inherit;">확인</button></div>';
        $('cm-ok').onclick = function () { ov.remove(); hud(); };
      })();
    }
    btn.onclick = start;
    $('cm-hit').onclick = start;
  }
  setInterval(function () {
    try { if (MAP && MAP.pieces && $('bc-layer') && !$('bc-panel') && Date.now() > boxSnooze && boxLoad().n >= BOX_NEED) boxOpen(); } catch (e) {}
  }, 1500);

  function grant(r) {
    var lines = [];
    if (r.coins > 0) {
      r.coins = Math.max(1, Math.round(r.coins * (MAP.coinMult || 1) * Math.max(0.1, 1 + engB('coin'))));   // 맵별 코인 배율 × 현상 효과
      coins += r.coins;
      if (S) S.lootCoins = (S.lootCoins || 0) + r.coins;
      lines.push({ icon: '🍔', text: '+' + r.coins + ' 코인', color: '#FFD700' });
    }
    if (r.exp > 0) {
      r.exp = Math.max(1, Math.round(r.exp * Math.max(0.1, 1 + engB('exp'))));
      giveCardExp(S.charId, r.exp);
      var nm = (typeof CHARS !== 'undefined' && CHARS[S.charId]) ? CHARS[S.charId].name : '';
      lines.push({ icon: '⭐', text: nm + ' +' + r.exp + ' EXP', color: '#FFD700' });
    }
    if (r.pieces > 0) {
      if (addToBag(PIECE_EMOJI, PIECE_NAME, 'piece', r.pieces, '프리미엄 카드 조각 · ' + PIECE_GOAL + '개를 모으면 더보기 > 프리미엄 카드에서 교환')) {
        var have = pieceCount();
        lines.push({ icon: PIECE_EMOJI, text: PIECE_NAME + ' +' + r.pieces + ' (' + have + '/' + PIECE_GOAL + ')', color: '#7dd3fc' });
        if (have >= PIECE_GOAL) toast('🖼️ 프리미엄 조각 ' + PIECE_GOAL + '개 달성! 더보기 > 프리미엄 카드에서 교환해요');
      }
    }
    for (var i = 0; i < r.mats; i++) {
      if (typeof SPECIAL_JAPTEM === 'undefined') break;
      var m = SPECIAL_JAPTEM[Math.floor(Math.random() * SPECIAL_JAPTEM.length)];
      if (addToBag(m.emoji, m.name, 'material', 1, '특별탐험 재료')) lines.push({ icon: m.emoji, text: m.name + ' x1', color: '#fff' });
    }
    if (r.gear > 0 && Math.random() < r.gear) {
      var g = dropGear(r.gearMin);
      if (g) lines.push(g);
    }
    var tix = r.ticketOf ? ticketDrop(r.ticketOf) : null;
    if (tix) lines.push(tix);
    if (typeof saveAll === 'function') saveAll();
    if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
    hud();
    return lines;
  }

  function finish(ev, type, grade, love) {
    var r = rewardFor(type, grade);
    if (S && S.bonus > 1) { r.coins = Math.round(r.coins * S.bonus); r.exp = Math.round(r.exp * S.bonus); }   // 🏅 스킬 숙련도 보너스 (fan-skills.js)
    if (S) S.bonus = 1;
    // 💖 팬 스킬 대만족 (fan-skills.js): 팬레터·굿즈는 보상이 업그레이드돼서 나온다
    if (love && (type === 'letter' || type === 'goods')) {
      r.coins *= 2; r.exp *= 2; r.mats += 1; r.gear = Math.min(1, r.gear * 2);
      if (Math.random() < 0.25) r.pieces = Math.max(r.pieces, 1);
    }
    var success = grade !== 'MISS' && grade !== 'FAIL';
    if (success) r.ticketOf = type;
    // 프리미엄 카드 효과 (premium-cards.js): 이 캐릭터의 카드를 갖고 있을 때만 적용
    r.pieces = 0;                      // 조각은 이벤트마다 안 나오고 '조각 상자'에서 한 번에 나온다 (아래 boxAdd)
    var pb = (MAP.pieces && typeof window.getPremiumBonus === 'function') ? (window.getEquippedPremiumBonus ? window.getEquippedPremiumBonus() : null) : null;
    var notes = [];
    if (pb && success) {
      if (r.pieces === 0 && Math.random() < pb.skill) { r.pieces = 1; notes.push({ icon: '📸', text: pb.skillName + ' 발동!', color: '#FFD700' }); }
      if (r.pieces > 0 && Math.random() < pb.extra) { r.pieces += 1; notes.push({ icon: '🎬', text: pb.effectName + ' 발동! 조각 +1', color: '#7dd3fc' }); }
    }
    if (MAP.pieces && success && r.pieces > 0 && Math.random() < engB('pieceExtra')) { r.pieces += 1; notes.push({ icon: '✨', text: '현상 효과! 조각 +1', color: '#7dd3fc' }); }
    if (MAP.pieces) boxAdd(r.pieces);   // 이벤트 1번 = 상자 진행 +1 (프리미엄 카드 효과로 나온 조각은 상자에 덤으로 쌓임)
    r.pieces = 0;
    var lines = grant(r).concat(notes).concat(enhDrop(type, success)).concat(filmDrop(type, success)).concat(devDrop(type, success)).concat(bookDrop(type, success));
    var heads = {
      PERFECT: '✨ PERFECT!', GREAT: '👍 GREAT!', GOOD: '😊 GOOD', MISS: '💦 MISS…',
      OPEN: type === 'letter' ? '💌 팬레터 도착!' : '🎁 굿즈 획득!',
      SUCCESS: '🎉 특별 NPC 촬영 성공!', PARTIAL: '😮 아깝다!', FAIL: '💨 놓쳤어요…'
    };
    var head = (love ? '😍 대만족! ' : '') + (type === 'golden' ? '🌟 ' : type === 'shutter' ? '📸 ' : '') + (heads[grade] || '');
    var dmg = S ? hurt(type, typeof love === 'boolean', !!love) : 0;
    if (S && dmg > 0) lines.push({ icon: '💔', text: 'HP -' + dmg + ' (' + Math.ceil(S.hp) + '/' + S.maxhp + ')', color: '#f87171' });
    var chips = lines.map(function (l, i) {
      return '<div style="opacity:0;animation:bcPop .45s ease-out forwards;animation-delay:' + (i * 0.18) + 's;display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.1);border:1.5px solid ' + l.color +
        ';border-radius:999px;padding:7px 14px;font-size:13px;font-weight:900;margin:3px;"><span style="font-size:16px;">' + (window.rewardIcon ? window.rewardIcon(l.icon, l.text, 22) : l.icon) + '</span>' + l.text + '</div>';
    }).join('');
    // 🔊 아이템 얻을 때 효과음 — 칩이 뜨는 타이밍(0.18초 간격)에 맞춰 하나씩 (sfx.js 가 있을 때만)
    lines.slice(0, 7).forEach(function (l, i) {
      if (l.icon === '💔') return;
      var nm = l.icon === '🍔' ? 'coin' : (l.icon === '⭐' || l.icon === '📸' || l.icon === '🎬' || l.icon === '✨') ? 'pick' : 'rarePick';
      setTimeout(function () { try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play(nm); } catch (e) {} }, 80 + i * 180);
    });
    panel('<div style="font-size:19px;font-weight:900;margin-bottom:8px;">' + head + '</div>' +
      '<div style="margin-bottom:10px;">' + (chips || '<div style="font-size:12px;color:#aaa;">얻은 게 없어요</div>') + '</div>' +
      '<button id="bc-next" style="' + BTN + '">계속하기</button>');
    $('bc-next').onclick = function () { closeEvent(ev); };
    if (S && S.hp <= 0) {                                       // HP 0: 보상을 확인하고 나면 쓰러진다
      $('bc-next').textContent = '😵 …앗, 쓰러진다!';
      $('bc-next').style.background = 'linear-gradient(135deg,#7f1d1d,#dc2626)';
      $('bc-next').onclick = function () { removeEvent(ev); faint(); };
    }
    // 🎫💎 등교권 / 초월석을 얻었으면 큰 팝업 (big-drop-popup.js) — 결과창 위에 뜸
    try {
      var gotTicket = lines.some(function (l) { return /^등교권 \+/.test(l.text) && !/조각 \+/.test(l.text); });
      var gotTrans = lines.some(function (l) { return /^초월석 \+/.test(l.text); });
      if ((gotTicket || gotTrans) && window.showBigDrop) setTimeout(function () {
        if (gotTicket) window.showBigDrop('ticket');
        if (gotTrans) window.showBigDrop('trans');
      }, 500);
    } catch (e) {}
  }

  function closeEvent(ev) {
    if (!S) return;
    closePanel();
    removeEvent(ev);
    S.current = null;
    S.paused = false;
    if (MAP.encore) {
      S.done = (S.done || 0) + 1;
      writeRun({ done: S.done });
      hud();
      if (S.done >= ENCORE_N) { openEncore(); return; }
    }
    afterEvent();
  }

  // 🎤 앵콜 스테이지: 이벤트를 다 채우면 시크릿 포토랩으로
  function openEncore() {
    if (!S) return;
    S.paused = true; S.moving = false; S.tx = S.px; S.ty = S.py;
    S.events.slice().forEach(removeEvent);
    var layer = $('bc-layer');
    if (layer) Array.prototype.slice.call(layer.children).forEach(function (c) { if (c.id !== 'bc-player') c.remove(); });
    var films = 0;
    if (typeof bagItems !== 'undefined') { var fi = bagItems.find(function (i) { return i.name === FILM_NAME; }); films = fi ? fi.qty : 0; }
    panel('<div style="font-size:21px;font-weight:900;margin-bottom:4px;">🎤 앵콜 스테이지 오픈!</div>' +
      '<div style="font-size:12px;color:#ddd;margin-bottom:12px;">공연 끝! 무대 뒤 시크릿 포토랩이 열렸어요<br>보유 필름 ' + FILM_EMOJI + ' ' + films + '개</div>' +
      '<button id="bc-lab" style="' + BTN + 'margin-bottom:8px;background:linear-gradient(135deg,#be123c,#f43f5e);">📷 시크릿 포토랩 입장</button>' +
      '<button id="bc-leave" style="' + BTN + 'background:rgba(255,255,255,.14);">공연장 나가기</button>');
    $('bc-lab').onclick = function () {
      if (typeof window.openPhotoLab !== 'function') { toast('시크릿 포토랩이 아직 설치되지 않았어요'); return; }
      window.openPhotoLab({ charId: S && S.charId, onClose: function () { if (S && $('bc-view')) openEncore(); } });
    };
    $('bc-leave').onclick = function () {
      writeRun(null);
      var o = $('special-overlay'); if (o) o.remove();
    };
  }

  // ════════ 미니게임 ════════
  function band(c, half, color) {
    return '<div style="position:absolute;top:0;bottom:0;left:' + (c - half) + '%;width:' + (half * 2) + '%;background:' + color + ';"></div>';
  }

  function gaugeGame(ev, golden) {
    var c = 30 + Math.random() * 40;
    var Z = golden ? { p: 3, g: 7, o: 10 } : { p: 5, g: 11, o: 14 };
    var zm = Math.max(0.3, 1 + engB('zone'));        // 현상 효과: 노란 칸 넓이
    Z.p *= zm; Z.g *= zm; Z.o *= zm;
    var spd = golden ? 150 : 105;
    var pos = 0, dir = 1, raf = 0, last = 0, locked = false;
    panel('<div style="font-size:17px;font-weight:900;margin-bottom:3px;">' + (golden ? '🌟 황금 셔터!' : '📸 셔터 찬스!') + '</div>' +
      '<div style="font-size:12px;color:#ddd;margin-bottom:10px;">' + (golden ? '칸이 아주 좁아요! ' : '') + '노란 칸에 맞춰 찰칵!</div>' +
      '<div id="bc-gauge" style="position:relative;height:30px;border-radius:15px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.25);overflow:hidden;margin-bottom:12px;">' +
      band(c, Z.o, 'rgba(244,114,182,.35)') + band(c, Z.g, 'rgba(251,191,36,.5)') + band(c, Z.p, 'rgba(255,215,0,.98)') +
      '<div id="bc-mark" style="position:absolute;top:3px;bottom:3px;width:5px;margin-left:-2px;background:#fff;border-radius:3px;box-shadow:0 0 8px #fff;left:0%;"></div></div>' +
      '<button id="bc-shot" style="' + BTN + '">📸 찰칵!</button>');

    function loop(ts) {
      var m = $('bc-mark');
      if (!m || locked) return;
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
      last = ts;
      pos += dir * spd * dt;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      m.style.left = pos + '%';
      raf = requestAnimationFrame(loop);
    }
    function shoot() {
      if (locked) return;
      locked = true;
      cancelAnimationFrame(raf);
      var d = Math.abs(pos - c);
      var grade = d <= Z.p ? 'PERFECT' : d <= Z.g ? 'GREAT' : d <= Z.o ? 'GOOD' : 'MISS';
      flash();
      setTimeout(function () { if ($('bc-panel')) finish(ev, golden ? 'golden' : 'shutter', grade); }, 380);
    }
    $('bc-shot').onpointerdown = shoot;
    $('bc-gauge').onpointerdown = shoot;
    raf = requestAnimationFrame(loop);
  }

  function letterGame(ev) {
    var taps = 0, need = 3;
    panel('<div style="font-size:17px;font-weight:900;margin-bottom:3px;">💌 팬레터 꾸러미</div>' +
      '<div id="bc-letter-n" style="font-size:12px;color:#ddd;margin-bottom:6px;">탭해서 열어봐요! 0/' + need + '</div>' +
      '<div id="bc-letter" style="font-size:66px;line-height:1.2;cursor:pointer;margin-bottom:6px;user-select:none;">💌</div>');
    $('bc-letter').onpointerdown = function () {
      taps++;
      var el = $('bc-letter');
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = 'bcShake .25s';
      var n = $('bc-letter-n');
      if (n) n.textContent = '탭해서 열어봐요! ' + Math.min(taps, need) + '/' + need;
      if (taps >= need) finish(ev, 'letter', 'OPEN');
    };
  }

  function goodsGame(ev) {
    var boxes = '';
    for (var i = 0; i < 3; i++) {
      boxes += '<button class="bc-box" style="flex:1;padding:14px 0;font-size:40px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.3);border-radius:16px;cursor:pointer;">🎁</button>';
    }
    panel('<div style="font-size:17px;font-weight:900;margin-bottom:3px;">🎁 굿즈 부스</div>' +
      '<div style="font-size:12px;color:#ddd;margin-bottom:10px;">상자 하나를 골라요!</div>' +
      '<div style="display:flex;gap:10px;">' + boxes + '</div>');
    var done = false;
    Array.prototype.forEach.call(document.querySelectorAll('.bc-box'), function (b) {
      b.onpointerdown = function () { if (done) return; done = true; finish(ev, 'goods', 'OPEN'); };
    });
  }

  function npcImgHtml(npc, size) {
    var id = 'bc-npcimg-' + npc.id;
    if (NPC_READY[npc.id]) {
      return '<div id="' + id + '"><img src="' + IMG_BASE + npc.img + BUST + '" style="height:' + size + 'px;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6));"></div>';
    }
    var h = '<div id="' + id + '" style="font-size:' + Math.round(size * 0.8) + 'px;line-height:1;">' + npc.emoji + '</div>';
    setTimeout(function () {
      var im = new Image();
      im.onload = function () {
        var el = $(id);
        if (el) el.innerHTML = '<img src="' + IMG_BASE + npc.img + BUST + '" style="height:' + size + 'px;max-width:100%;object-fit:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.6));">';
      };
      im.src = IMG_BASE + npc.img + BUST;
    }, 0);
    return h;
  }

  function npcGame(ev) {
    var npc = ev.npc || NPCS[0];
    var cid = S.charId;
    var gauge = NPC_GAUGE;
    var fleeP = Math.max(0.01, NPC_FLEE * (1 - gearVal(cid, 'flee') / 100));
    var catchP = Math.min(0.95, NPC_CATCH + gearVal(cid, 'chance') / 100);
    var retries = gearVal(cid, 'retry');
    var ended = false, msg = '좋아하는 도구를 쓰면 경계심이 더 많이 풀려요!';
    var tools = (typeof CAPTURE_TOOLS !== 'undefined') ? CAPTURE_TOOLS : [];
    var weakTool = tools.find(function (t) { return t.id === npc.weak; });

    function draw() {
      if (ended) return;
      var pct = Math.max(0, Math.round(gauge / NPC_GAUGE * 100));
      var body;
      if (gauge > 0) {
        body = tools.map(function (t) {
          var q = toolQty(t);
          var right = t.id === npc.weak;
          var label = q > 0 ? (t.emoji + ' ' + t.name + ' <span style="font-size:10px;opacity:.8;">x' + q + '</span>')
                            : (t.emoji + ' ' + t.name + ' <span style="font-size:10px;opacity:.8;">구매 ' + t.price + '🍔</span>');
          return '<button class="bc-tool" data-id="' + t.id + '" style="flex:1;padding:10px 4px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;color:#fff;font-family:\'Noto Sans KR\',sans-serif;' +
            'background:' + (right ? 'rgba(255,215,0,.18)' : 'rgba(255,255,255,.08)') + ';border:1.5px solid ' + (right ? '#FFD700' : 'rgba(255,255,255,.3)') + ';">' + label + '</button>';
        }).join('');
        body = '<div style="display:flex;gap:6px;">' + body + '</div>';
      } else {
        body = '<div style="font-size:12px;color:#FFE27A;margin-bottom:8px;">경계심이 다 풀렸어요! 지금이 기회!' + (retries > 0 ? ' (재도전 ' + retries + '회)' : '') + '</div>' +
          '<button id="bc-catch" style="' + BTN + 'background:linear-gradient(135deg,#ff5a36,#ffb703);">📸 촬영하기! (성공 ' + Math.round(catchP * 100) + '%)</button>';
      }
      panel('<div style="font-size:15px;font-weight:900;margin-bottom:2px;">🚨 ' + npc.name + '</div>' +
        '<div style="height:96px;display:flex;align-items:center;justify-content:center;margin:2px 0 6px;">' + npcImgHtml(npc, 90) + '</div>' +
        '<div style="height:16px;border-radius:8px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.25);overflow:hidden;margin-bottom:4px;">' +
        '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#ff5a36,#ffb703);transition:width .3s;"></div></div>' +
        '<div style="font-size:10px;color:#ddd;margin-bottom:8px;">경계심 ' + pct + '% · 도구 쓸 때마다 ' + Math.round(fleeP * 100) + '% 확률로 떠나요' +
        (weakTool ? ' · 💡 ' + weakTool.name + ' 좋아함' : '') + '</div>' +
        '<div style="font-size:12px;color:#fff;margin-bottom:8px;min-height:16px;">' + msg + '</div>' + body);
      Array.prototype.forEach.call(document.querySelectorAll('.bc-tool'), function (b) { b.onpointerdown = function () { useTool(b.getAttribute('data-id')); }; });
      var cb = $('bc-catch');
      if (cb) cb.onpointerdown = tryCatch;
    }

    function leave(text) {
      ended = true;
      msg = text;
      finish(ev, 'legend', 'FAIL');
    }

    function useTool(id) {
      if (ended) return;
      var t = tools.find(function (x) { return x.id === id; });
      if (!t) return;
      if (toolQty(t) <= 0) {
        if (typeof coins === 'undefined' || coins < t.price) { msg = '코인이 부족해요! 🍔 ' + t.price + ' 필요'; draw(); return; }
        coins -= t.price;
        if (typeof addToBag === 'function') addToBag(t.emoji, t.name, 'tool', 1, '특별 NPC · 레어 변종 촬영 마무리용');
        if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay();
      }
      if (typeof useFromBag === 'function') useFromBag(t.name, 1);
      if (typeof saveAll === 'function') saveAll();
      var right = id === npc.weak;
      gauge -= (right ? NPC_HIT_RIGHT : NPC_HIT_WRONG) * Math.max(0.3, 1 + engB('npc'));
      if (Math.random() < fleeP) { leave('💨 ' + npc.name + '이(가) 떠나버렸어요…'); return; }
      msg = right ? ('👍 ' + t.name + '을(를) 아주 좋아해요!') : ('🙂 ' + t.name + ' 효과가 조금 있었어요');
      draw();
    }

    function tryCatch() {
      if (ended) return;
      if (Math.random() < catchP) { ended = true; flash(); setTimeout(function () { finish(ev, 'legend', 'SUCCESS'); }, 380); return; }
      if (retries > 0) { retries--; msg = '💦 아깝다! 소품 효과로 한 번 더!'; draw(); return; }
      leave('💨 놓쳤어요… ' + npc.name + '이(가) 떠났어요');
    }

    draw();
  }

  function openEvent(ev) {
    S.paused = true;
    S.moving = false;
    S.tx = S.px; S.ty = S.py;
    placePlayer();
    S.current = ev;
    if (ev.type === 'shutter') gaugeGame(ev, false);
    else if (ev.type === 'golden') gaugeGame(ev, true);
    else if (ev.type === 'letter') letterGame(ev);
    else if (ev.type === 'goods') goodsGame(ev);
    else npcGame(ev);
  }

  function tryStart(ev) {
    var cost = staminaCost();
    if (typeof stamina === 'undefined' || stamina < cost) {
      ev.skip = true;
      toast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (이벤트 1번 ' + cost + ')');
      return;
    }
    stamina -= cost;
    if (typeof saveStamina === 'function') saveStamina();
    hud();
    openEvent(ev);
  }

  // ════════ 메인 루프 ════════
  function tick(ts) {
    var me = S;
    if (!me || !$('bc-view')) return;
    var dt = me.last ? Math.min(0.05, (ts - me.last) / 1000) : 0;
    me.last = ts;
    if (!me.paused && !$('bc-box-ov')) {   // 조각 상자 뽑는 동안은 시간·이동·이벤트 다 멈춤 (특별 이벤트 제한시간이 줄어들지 않게)
      // 걷기
      var ws = worldSize();
      var dx = (me.tx - me.px) * ws.w, dy = (me.ty - me.py) * ws.h;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < 2) { me.moving = false; }
      else {
        var step = SPEED * dt;
        if (step >= d) { me.px = me.tx; me.py = me.ty; me.moving = false; }
        else { me.px += dx / d * step / ws.w; me.py += dy / d * step / ws.h; me.moving = true; }
      }
      placePlayer();

      // 이벤트 닿았는지 / 제한시간
      for (var i = me.events.length - 1; i >= 0; i--) {
        var ev = me.events[i];
        if (ev.kind === 'special') {
          ev.ttl -= dt;
          var lab = ev.el && ev.el.querySelector('.bc-ttl');
          if (lab) lab.textContent = Math.max(0, Math.ceil(ev.ttl)) + '초';
          if (ev.ttl <= 0) {
            removeEvent(ev);
            banner('⌛ 특별 이벤트를 놓쳤어요…');
            fillNormals();
            continue;
          }
        }
        var dist = pxDist(ev.x, ev.y, me.px, me.py);
        if (dist < HIT_R + (ev.kind === 'special' ? 10 : 0)) {
          if (!ev.skip && !ev.fsBusy) {   // 스킬로 응대 중인 이벤트는 닿아도 미니게임이 안 열림
            if (ev.kind === 'special' && SKILL_ONLY[curLoc]) { ev.skip = true; toast('✨ 이 이벤트는 스킬로만 응대할 수 있어요! 머리 위에 뜬 스킬을 순서대로 써요 (스킬은 더보기 → 💖 팬 스킬 상점에서 살 수 있어요)'); }
            else { tryStart(ev); break; }
          }
        } else if (dist > HIT_R * 2) {
          ev.skip = false;
        }
      }
      me.hudT = (me.hudT || 0) + dt;
      if (me.hudT > 0.5) { me.hudT = 0; hud(); }
    }
    me.raf = requestAnimationFrame(tick);
  }

  function onMapTap(e) {
    if (!S || S.paused) return;
    var w = $('bc-world');
    if (!w) return;
    var rc = w.getBoundingClientRect();
    var nx = (e.clientX - rc.left) / rc.width, ny = (e.clientY - rc.top) / rc.height;
    S.tx = clamp(nx, MAP.bounds.x0, MAP.bounds.x1);
    S.ty = clamp(ny, MAP.bounds.y0, MAP.bounds.y1);
    var rip = document.createElement('div');
    rip.style.cssText = 'position:absolute;left:' + (S.tx * 100) + '%;top:' + (S.ty * 100) + '%;width:34px;height:34px;border-radius:50%;border:3px solid #fff;z-index:5;pointer-events:none;animation:bcRipple .5s ease-out forwards;';
    $('bc-layer').appendChild(rip);
    setTimeout(function () { rip.remove(); }, 520);
  }

  function startBroadcast(charId, locId) {
    MAP = MAPS[locId] || MAPS.broadcast_front;
    curLoc = MAPS[locId] ? locId : 'broadcast_front';
    var overlay = $('special-overlay');
    if (!overlay) return;
    var ch = (typeof CHARS !== 'undefined' && CHARS[charId]) ? CHARS[charId] : { name: '', img: '', gradeColor: '#fff', emoji: '🎬' };
    if (charId === 'seyeon_trial') ch = { id: 'seyeon', name: '세연', img: IMG_BASE + 'hidden-seyeon-trial.jpg' + BUST, gradeColor: '#F59E0B', emoji: '🌟' };
    try { specialExploreState = { locationId: MAP.id, charId: charId, creature: null, foodChosen: null }; } catch (e) {}
    if (S && S.raf) cancelAnimationFrame(S.raf);
    injectStyle();
    preloadNpcs();

    overlay.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;background:rgba(0,0,0,.6);position:relative;z-index:50;">' +
      '<div style="color:#fff;font-size:15px;font-weight:900;white-space:nowrap;">' + MAP.emoji + ' ' + MAP.name + '</div>' +
      '<div id="bc-stam" style="color:#FFE27A;font-size:11px;font-weight:900;text-align:center;flex:1;"></div>' +
      '<button onclick="document.getElementById(\'special-overlay\').remove()" style="background:rgba(255,255,255,.15);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;white-space:nowrap;">나가기</button></div>' +
      '<div id="bc-view" style="position:relative;flex:1;min-height:0;overflow:hidden;background:#0d0820;touch-action:manipulation;user-select:none;-webkit-user-select:none;">' +
      '<div id="bc-world" style="position:absolute;">' +
      '<img id="bc-img" src="' + MAP.bg + '" draggable="false" style="width:100%;height:100%;display:block;pointer-events:none;">' +
      '<div id="bc-layer" style="position:absolute;inset:0;"></div></div>' +
      '<div id="bc-eff" style="display:none;position:absolute;top:6px;left:8px;z-index:31;background:rgba(0,0,0,.6);border:1px solid #FFD700;border-radius:10px;padding:3px 8px;font-size:10px;font-weight:900;color:#FFE27A;pointer-events:none;"></div>' +
      '<div id="bc-banner" style="display:none;position:absolute;top:34px;left:10px;right:10px;z-index:30;background:rgba(26,26,46,.92);border:1.5px solid #FFD700;border-radius:14px;padding:9px 12px;color:#fff;font-size:12px;font-weight:900;text-align:center;pointer-events:none;"></div>' +
      '</div>';

    var view = $('bc-view');
    var img = $('bc-img');
    img.onload = function () { if (img.naturalWidth) { IMG_W = img.naturalWidth; IMG_H = img.naturalHeight; } layout(); };
    img.onerror = function () {
      img.style.display = 'none';
      var w = $('bc-world');
      if (w) w.style.background = 'linear-gradient(180deg,#3b2a6b 0%,#6d5bb5 45%,#c4b5fd 100%)';
    };
    layout();
    window.addEventListener('resize', layout);
    view.addEventListener('pointerdown', onMapTap);

    S = { charId: charId, px: MAP.start.x, py: MAP.start.y, tx: MAP.start.x, ty: MAP.start.y, moving: false, events: [], paused: false, current: null, last: 0, raf: 0, hudT: 0, done: 0,
      hp: MAX_HP, maxhp: MAX_HP, lootCoins: 0, lootTickets: 0, snap: bagSnapshot() };
    buildHpUi(view);
    if (MAP.encore) { var rr = readRun(); S.done = rr ? rr.done : 0; }
    $('bc-layer').appendChild(buildPlayer(ch));
    placePlayer();
    hud();
    fillNormals();
    var bn = engAll().cheer;
    banner(bn ? String(bn) : (MAP.encore ? ('🎤 이벤트 ' + ENCORE_N + '번을 채우면 앵콜 스테이지가 열려요! (1번에 ⚡' + staminaCost() + ')') : ('팬을 찾아 걸어가 보세요! 응대 1번에 ⚡' + staminaCost())));
    S.raf = requestAnimationFrame(tick);
    if (MAP.encore && S.done >= ENCORE_N) openEncore();
  }

  // ════════ 설치 ════════
  function install() {
    if (typeof window.startSpecialExplore !== 'function' || typeof SPECIAL_LOCATIONS === 'undefined' || typeof window.renderSpecialExploreList !== 'function') {
      setTimeout(install, 50);
      return;
    }
    if (window.__bcInstalled) return;
    window.__bcInstalled = true;
    MAP_ORDER.forEach(function (mid) {
      var m = MAPS[mid];
      if (!SPECIAL_LOCATIONS.some(function (l) { return l.id === mid; })) {
        SPECIAL_LOCATIONS.push({ id: mid, name: m.name, emoji: m.emoji, color: m.color, bg: m.bg });
      }
    });
    var orig = window.startSpecialExplore;
    window.startSpecialExplore = function (locationId, charId) {
      if (MAPS[locationId]) {
        var m = MAPS[locationId];
        if (m.starCost) {
          var run = readRun();
          if (run) toast('🎤 진행 중이던 공연을 이어서 해요 (' + Math.min(run.done, ENCORE_N) + '/' + ENCORE_N + ')');
          else {
            var have = (typeof honorStars !== 'undefined') ? honorStars : 0;
            if (have < m.starCost) { toast('🌟 우등생별이 부족해요! (' + have + '/' + m.starCost + ') · 등교시키기로 모아요'); return; }
            honorStars -= m.starCost;
            if (typeof saveSchool === 'function') saveSchool();
            if (typeof saveAll === 'function') saveAll();
            writeRun({ done: 0 });
            toast('🌟 우등생별 ' + m.starCost + '개로 공연장 입장!');
          }
        }
        startBroadcast(charId, locationId);
        return;
      }
      return orig.apply(this, arguments);
    };

    // 맵 화면: 특별 탐험 목록에서 방송국 앞을 빼고, 그 아래에 '팬덤 원정' 칸을 따로 만든다
    var origRender = window.renderSpecialExploreList;
    window.renderSpecialExploreList = function () {
      var r = origRender.apply(this, arguments);
      try { decorateList(); } catch (e) {}
      return r;
    };
    window.renderSpecialExploreList();

    // special-explore.js가 로드 직후 원래 함수로 목록을 다시 그려서 꾸민 게 지워지므로,
    // 목록이 바뀔 때마다(다시 그려질 때마다) 팬덤 원정 칸을 다시 붙인다
    (function watchList() {
      var host = $('special-explore-list');
      if (!host) { setTimeout(watchList, 200); return; }
      try {
        new MutationObserver(function () { try { decorateList(); } catch (e) {} }).observe(host, { childList: true });
      } catch (e) {}
      try { decorateList(); } catch (e) {}
    })();
  }

  function decorateList() {
    var el = $('special-explore-list');
    if (!el || el.querySelector('#bc-fandom-section')) return;
    // 기존 목록 안의 버튼 정리 (카드 선택 화면은 SPECIAL_LOCATIONS에 남겨둬서 그대로 동작)
    Array.prototype.forEach.call(el.querySelectorAll('button'), function (b) {
      var oc = b.getAttribute('onclick') || '';
      if (MAP_ORDER.some(function (mid) { return oc.indexOf("'" + mid + "'") !== -1; })) { b.remove(); return; }
      if (HIDE_OLD_SPECIAL) b.remove();   // 기존 3곳 + 도감 버튼 숨김 (데이터·코드는 그대로 남음)
    });
    if (HIDE_OLD_SPECIAL) {
      var oldImg = document.querySelector('#screen-map img[src*="special-explore-main-bg"]');
      if (oldImg && oldImg.parentElement) oldImg.parentElement.style.display = 'none';
    }
    var sec = document.createElement('div');
    sec.id = 'bc-fandom-section';
    sec.style.cssText = 'margin:18px 0 10px;';
    var have = pieceCount();
    sec.innerHTML =
      '<div id="bc-banner-box" style="position:relative;border-radius:18px;overflow:hidden;margin-bottom:12px;height:130px;' +
        'background-color:#2a1d4e;background-image:url(\'' + MAPS.broadcast_front.bg + '\');background-size:100% auto;background-position:50% 26%;">' +
        '<div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(20,10,40,.05) 20%,rgba(20,10,40,.88) 100%);"></div>' +
        '<div style="position:absolute;bottom:10px;left:14px;right:14px;display:flex;align-items:flex-end;justify-content:space-between;gap:8px;">' +
          '<div><div style="font-size:14px;font-weight:900;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.8);">🎬 팬덤 원정</div>' +
          '<div style="font-size:10px;color:#e4d7ff;text-shadow:0 1px 4px rgba(0,0,0,.8);">현장을 돌아다니며 프리미엄 조각을 모아요</div></div>' +
          '<div id="bc-piece-badge" style="font-size:11px;font-weight:900;color:#7dd3fc; background:rgba(0,0,0,.55);border-radius:10px;padding:4px 9px;white-space:nowrap;">' + PIECE_EMOJI + ' ' + have + '/' + PIECE_GOAL + '</div>' +
        '</div></div>' +
      MAP_ORDER.map(function (mid) {
        var m = MAPS[mid];
        return '<button onclick="openSpecialCardSelect(\'' + mid + '\')" style="width:100%;display:flex;align-items:center;gap:12px;padding:13px 14px;margin-bottom:9px;background:' + m.color + '1f;border:1.5px solid ' + m.color + ';border-radius:14px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;">' +
          '<span style="font-size:24px;">' + m.emoji + '</span><span>' + m.name + '<br><span style="font-size:10px;font-weight:400;color:#cbbcf5;">' + m.desc + '</span></span><span style="margin-left:auto;color:#888;font-size:16px;">›</span></button>';
      }).join('');
    
        var pad = document.createElement('div');
    pad.style.cssText = 'height:150px;';
    sec.appendChild(pad);
    // 도감 버튼(맨 마지막 칸) 앞에 끼워 넣기
    var last = el.lastElementChild;
    if (last) el.insertBefore(sec, last); else el.appendChild(sec);
    // 전용 배너 이미지(fandom-banner.png)를 repo에 올리면 자동으로 그걸 쓴다
    var im = new Image();
    im.onload = function () {
      var box = $('bc-banner-box');
      if (box) { box.style.backgroundImage = 'url("' + IMG_BASE + 'fandom-banner.png' + BUST + '")'; box.style.backgroundSize = 'cover'; box.style.backgroundPosition = 'center'; }
    };
    im.src = IMG_BASE + 'fandom-banner.png' + BUST;
  }

  // 이름이 바뀐 아이템: 이미 가방에 있는 '화보 조각'을 '프리미엄 조각'으로 합쳐 옮김 (가방은 이름으로 찾기 때문)
  function migratePieceName() {
    if (typeof bagItems === 'undefined' || !Array.isArray(bagItems)) { setTimeout(migratePieceName, 300); return; }
    var oi = bagItems.findIndex(function (i) { return i.name === OLD_PIECE_NAME; });
    if (oi === -1) return;
    var old = bagItems[oi];
    var ni = bagItems.find(function (i) { return i.name === PIECE_NAME; });
    if (ni) { ni.qty += old.qty; bagItems.splice(oi, 1); }
    else { old.name = PIECE_NAME; old.emoji = PIECE_EMOJI; old.desc = '프리미엄 카드 조각 · ' + PIECE_GOAL + '개를 모으면 프리미엄 카드 1장'; }
    if (typeof saveBag === 'function') saveBag();
    if (typeof saveAll === 'function') saveAll();
  }
  migratePieceName();

  // 팬덤 원정 칸의 프리미엄 조각 숫자를 계속 최신으로 맞춤
  setInterval(function () {
    var b = document.getElementById('bc-piece-badge');
    if (b) b.textContent = PIECE_EMOJI + ' ' + pieceCount() + '/' + PIECE_GOAL;
  }, 700);
  
  // 💖 팬 스킬(fan-skills.js)이 맵 이벤트를 직접 처리할 때 쓰는 문
  //  스킬을 쓰면 미니게임 없이 바로 결과가 나온다 (스태미나는 똑같이 든다)
  //  love=true(대만족): 셔터/황금 → PERFECT · 팬레터/굿즈 → 보상 업그레이드 · 특별 NPC → 촬영 성공
  //  love=false(만족) : 셔터/황금 → GREAT   · 팬레터/굿즈 → 기본 보상      · 특별 NPC → 아깝다(PARTIAL)
  window.__bcHook = {
    potions: {
      list: function () { return POTIONS; },
      qty: potionQty,
      buy: function (id, n) {                                  // 상점 구매 (맵 밖에서도 가능). n = 한 번에 살 개수
        var po = potionById(id);
        n = Math.max(1, Math.floor(Number(n) || 1));
        if (!po) return { ok: false, why: 'none' };
        if (typeof coins === 'undefined' || coins < po.price * n) return { ok: false, why: 'coins' };
        var added = false;
        try { added = !!addToBag(po.emoji, po.name, 'potion', n, po.desc); } catch (e) {}
        if (!added) return { ok: false, why: 'bag' };
        coins -= po.price * n;
        if (typeof saveAll === 'function') { try { saveAll(); } catch (e) {} }
        if (typeof updateCoinsDisplay === 'function') { try { updateCoinsDisplay(); } catch (e) {} }
        hpRefresh();
        return { ok: true };
      }
    },
    events: function () { return S ? S.events : []; },
    fail: function (ev) {                                       // 스킬 순서가 틀려서 실패: 이벤트만 사라지고 스태미나는 안 듦
      if (!S || S.events.indexOf(ev) === -1) return false;
      removeEvent(ev);
      banner('😤 순서가 틀려서 실패했어요…');
      afterEvent();
      return true;
    },
    canResolve: function (ev) {
      if (!S || S.paused || S.events.indexOf(ev) === -1) return false;
      var cost = staminaCost();
      if (typeof stamina === 'undefined' || stamina < cost) { toast('스태미나가 부족해요! ⚡ 음료를 마셔봐요 (이벤트 1번 ' + cost + ')'); return false; }
      return true;
    },
    resolve: function (ev, love, bonus) {
      if (!S || S.paused || S.events.indexOf(ev) === -1) return false;
      S.bonus = bonus > 1 ? bonus : 1;
      var cost = staminaCost();
      if (typeof stamina === 'undefined' || stamina < cost) return false;
      stamina -= cost;
      if (typeof saveStamina === 'function') saveStamina();
      S.paused = true; S.moving = false; S.tx = S.px; S.ty = S.py;
      placePlayer();
      S.current = ev;
      hud();
      var t = ev.type;
      if (t === 'letter' || t === 'goods') finish(ev, t, 'OPEN', !!love);
      else if (t === 'shutter' || t === 'golden') finish(ev, t, love ? 'PERFECT' : 'GREAT', !!love);
      else finish(ev, 'legend', love ? 'SUCCESS' : 'PARTIAL', !!love);
      return true;
    }
  };

  window.__bcTest = { rewardFor: rewardFor, pickNormal: pickNormal, simulate: simulate,
    spawnNpc: function () { if (S) spawnSpecial('legend'); } };   // 테스트용: 원정 화면에서 콘솔에 __bcTest.spawnNpc() 입력하면 특별 NPC가 바로 나옴
  install();
})();
