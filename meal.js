// ════════════════════════════════
// 🍽️ 스케줄 · 식사 (meal.js)
// 기획사 화면에 "📅 스케줄 · 식사" 버튼을 붙인다. (game.js / agency.js / drama.js / index.html은 건드리지 않음)
//
// - 게임 속 날짜(DAY)가 있고, "하루 보내기" 버튼을 눌러야 하루가 지나간다.
// - 데뷔한 아이돌마다 비주얼 · 체력 · 기분(0~100)이 있다. 처음엔 전부 50.
// - 기획사에서 일정을 직접 잡는다: 🎥 드라마 촬영 / 🎤 컴백 무대 / 😴 휴식기
//     촬영 앞(3일 전부터): 식단 관리 → 비주얼 효과 ×1.5 (기분이 깎이는 것도 ×1.5)
//     컴백 앞(3일 전부터): 체력 효과 ×1.5
//     휴식기(3일): 기분 효과 ×2
//     일정이 없으면: 일반 활동기(보통 식사)
// - 하루에 두 끼(점심/저녁). 음식 11종 중에 고른다. 코인이 든다. 아이돌마다 좋아하는 음식/싫어하는 음식이 있다.
// - 촬영 앞에 치킨·떡볶이·라면을 먹으면 가끔 "야식 들킴!" 이벤트가 터진다.
// - 일정 날이 오면 컨디션에 따라 정산금을 받는다. 드라마 촬영 날엔 촬영장 도시락이 자동으로 나온다.
// - 컨디션은 이렇게 게임에 먹힌다:
//     🎥 드라마 촬영: 비주얼 → 촬영 코인 보너스, 체력 → 촬영 시간 늘어남, 기분 → 스킬 효과 증가
//     🎤 기획사: 세 수치 평균 → 정산 수익 배율
//
// 이미지: meal-assets 폴더 (chars / foods / fx)
// 저장: localStorage 'ph_meal' (ph_로 시작해서 cloud-extra.js가 서버에 자동으로 올려줌)
// 값을 바꾸고 싶으면 아래 "설정"만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ════════ 설정 ════════
  var STORAGE_KEY = 'ph_meal';
  var ASSET = 'meal-assets/';
  var STAT_START = 50;           // 처음 수치
  var MEALS_PER_DAY = 2;         // 하루 식사 횟수 (점심/저녁)
  var DRIFT = 5;                 // 하루 지나면 50쪽으로 돌아오는 양
  var PREP_DAYS = 3;             // 촬영/컴백 며칠 전부터 준비 기간인지
  var BOOK_MIN = 3, BOOK_MAX = 7;// 촬영/컴백은 오늘로부터 며칠 뒤까지 잡을 수 있는지
  var REST_DAYS = 3;             // 휴식기 길이(일)
  var PRICE_COIN = { '무료': 0, '하': 300, '중': 2000, '상': 6000 };   // 음식 가격(코인)
  var SNEAK_CHANCE = 0.35;       // 촬영 앞에 몰래 먹는 음식을 먹었을 때 들킬 확률
  var SNEAK_V = 4, SNEAK_M = 3;  // 들켰을 때 추가로 깎이는 비주얼 / 기분
  var EVENT_PAY = { drama: 30000, comeback: 50000, rest: 0 };           // 일정 날 정산금(컨디션 '좋음' 기준)
  var QUALITY = {                                                       // 컨디션 점수 → 등급
    perfect: { min: 75, mult: 1.5, label: '완벽했어요!', emoji: '💯' },
    good:    { min: 55, mult: 1.0, label: '좋았어요',     emoji: '👍' },
    normal:  { min: 40, mult: 0.6, label: '무난했어요',   emoji: '🙂' },
    bad:     { min: 0,  mult: 0.3, label: '컨디션 난조…', emoji: '😥' }
  };
  var EVENT_TIRED = 15;          // 일정 끝나면 줄어드는 체력
  var EVENT_GLOW = 5;            // 일정 끝나면 오르는 기분
  var DRAMA_VISUAL_MAX = 0.30;   // 비주얼 100 → 드라마 촬영 코인 +30%
  var DRAMA_STAMINA_MAX = 0.30;  // 체력 100 → 촬영 시간 +30%
  var DRAMA_MOOD_MAX = 0.15;     // 기분 100 → 스킬 효과 +15%
  var DRAMA_PAY_PER_RATING = 8600; // drama.js의 시청률 1%당 코인 (drama.js 값과 맞춤)
  var DRAMA_TIRED = 8, DRAMA_GLOW = 3; // 드라마 촬영 한 판 하고 나면 체력 −8, 기분 +3
  var INCOME_MAX = 0.30;         // 세 수치 평균 100 → 기획사 수익 +30%
  var NEG_RATIO = 0.5;           // 50 아래일 때 깎이는 양은 보너스의 절반까지만

  // ════════ 데이터 ════════
  var ORDER = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];
  var CH = {
    minjun: { name: '민준', trait: '당당함', color: '#7fd1ae', like: ['sandwich', 'cake'],        dislike: ['ramen'] },
    sion:   { name: '시온', trait: '감성',   color: '#b793ff', like: ['ramen', 'chicken'],        dislike: ['salad'] },
    doyun:  { name: '도윤', trait: '당당함', color: '#ff9d4a', like: ['hansik', 'meat'],          dislike: ['tteokbokki'] },
    harin:  { name: '하린', trait: '수줍음', color: '#7fc8ff', like: ['yogurt', 'fruitcup'],      dislike: ['meat'] },
    yuna:   { name: '윤아', trait: '수줍음', color: '#ffb3d1', like: ['cake', 'tteokbokki'],      dislike: ['ramen'] },
    ara:    { name: '아라', trait: '감성',   color: '#ff7aa8', like: ['meat', 'chicken'],         dislike: ['cake'] }
  };

  // v=비주얼 s=체력 m=기분 / sneak=몰래 먹기 대상
  var FOODS = [
    { id: 'salad',      name: '닭가슴살 샐러드',    v: 8,  s: 2,  m: -3, where: 'diet',     price: '중' },
    { id: 'fruitcup',   name: '과일 컵',            v: 4,  s: 1,  m: 2,  where: 'cvs',      price: '하' },
    { id: 'yogurt',     name: '그릭요거트 볼',      v: 5,  s: 1,  m: 1,  where: 'dine',     price: '중' },
    { id: 'sandwich',   name: '삼각김밥·샌드위치',  v: 0,  s: 3,  m: 1,  where: 'cvs',      price: '하' },
    { id: 'ramen',      name: '라면',               v: -4, s: 2,  m: 5,  where: 'cook',     price: '하', sneak: true },
    { id: 'tteokbokki', name: '떡볶이',             v: -5, s: 1,  m: 8,  where: 'delivery', price: '중', sneak: true },
    { id: 'chicken',    name: '치킨',               v: -8, s: 2,  m: 10, where: 'night',    price: '상', sneak: true },
    { id: 'hansik',     name: '한식 백반상',        v: 0,  s: 8,  m: 3,  where: 'cook',     price: '중' },
    { id: 'meat',       name: '고기 구이',          v: -2, s: 10, m: 5,  where: 'dine',     price: '상' },
    { id: 'samgyetang', name: '삼계탕',             v: 0,  s: 12, m: 2,  where: 'dine',     price: '상' },
    { id: 'cake',       name: '케이크·마카롱',      v: -3, s: 0,  m: 7,  where: 'dine',     price: '중' }
  ];
  var CATERING = { id: 'lunchbox', name: '촬영장 케이터링 도시락', v: 2, s: 4, m: 0 };   // 드라마 촬영 날 자동 지급
  var FOOD_BY_ID = {};
  FOODS.forEach(function (f) { FOOD_BY_ID[f.id] = f; });

  var WHERE = {
    cvs: '🏪 편의점', diet: '🥗 식단 도시락 배달', delivery: '🛵 배달', night: '🌙 배달 야식',
    cook: '🍳 숙소 요리', dine: '🍽️ 맛집 외식'
  };
  var PHASES = {
    shoot:    { label: '🎬 촬영 앞',   desc: '식단 관리 중 · 비주얼 효과 ×1.5', color: '#ffcf4a' },
    comeback: { label: '🎤 컴백 앞',   desc: '체력 효과 ×1.5',                  color: '#ff7aa8' },
    rest:     { label: '😴 휴식기',    desc: '기분 효과 ×2',                    color: '#7fd1ae' },
    normal:   { label: '📅 일반 활동기', desc: '보통 식사',                      color: '#aab4d6' }
  };
  var TYPE_LABEL = { drama: '🎥 드라마 촬영', comeback: '🎤 컴백 무대', rest: '😴 휴식기' };
  var WEEK = ['월', '화', '수', '목', '금', '토', '일'];

  var LINES = {
    '수줍음': {
      like: ['어… 이거 제가 제일 좋아하는 건데… 고마워요.', '맛있어요… 오늘 기분이 엄청 좋아졌어요!', '헤헤, 먹을 때가 제일 행복해요.'],
      dislike: ['아… 이건 조금 힘들어요… 그래도 먹을게요.', '(조용히 접시를 밀어낸다…)', '음… 다음엔 다른 거면 좋겠어요…'],
      neutral: ['잘 먹겠습니다…!', '냠냠… 괜찮아요.', '배가 든든해졌어요.'],
      diet: ['오늘도 식단 관리… 힘내볼게요.', '가볍게 먹으니까 몸이 가벼워요.'],
      power: ['든든해요! 무대 위에서 힘이 날 것 같아요.'],
      caught: ['아, 안 돼요…! 저 그냥 한 입만…!', '들켰다…! 얼굴이 빨개져요…'],
      rest: ['쉬는 날엔 마음껏 먹어도 되죠…?']
    },
    '당당함': {
      like: ['역시 이거지. 오늘 컨디션 최고야.', '이 맛을 아는 사람이 나라니까.', '좋아, 기분 완전 올라왔어.'],
      dislike: ['이건 내 취향이 아닌데. 뭐, 먹긴 먹어.', '…다음엔 메뉴 좀 신경 써 줘.', '입맛에 안 맞지만 프로니까 먹는다.'],
      neutral: ['나쁘지 않네.', '잘 먹었다. 이제 일하자.', '깔끔하군.'],
      diet: ['식단도 실력이지. 문제없어.', '가볍게 먹는 것도 컨셉이야.'],
      power: ['든든하게 먹었으니 무대는 맡겨.'],
      caught: ['…봤어? 못 본 걸로 해.', '이건 전략적 보충이야. 진짜야.'],
      rest: ['쉴 땐 확실히 쉬어야지. 이게 정석이야.']
    },
    '감성': {
      like: ['…좋아. 오늘 밤은 이걸로 충분해.', '이 맛, 오래 기억할 것 같아.', '마음까지 따뜻해지네.'],
      dislike: ['…이건 내 노래랑은 안 어울리는 맛이야.', '(말없이 젓가락을 내려놓는다)', '오늘은 입맛이 없네…'],
      neutral: ['조용히 먹기 좋은 맛이야.', '고마워. 잘 먹을게.', '배가 따뜻해졌어.'],
      diet: ['가벼운 식사… 마음도 가벼워지는 것 같아.', '오늘은 맑게 비우는 날이야.'],
      power: ['든든하다. 오늘 무대는 깊게 울릴 것 같아.'],
      caught: ['…들켰네. 밤엔 이런 게 제일 맛있는데.', '쉿, 비밀로 해 줘.'],
      rest: ['쉬는 날의 맛은 특별해.']
    }
  };

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  function clamp(x) { return Math.max(0, Math.min(100, x)); }
  function weekday(day) { return WEEK[(day - 1) % 7]; }

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.day || s.day < 1) s.day = 1;
    if (!s.stat) s.stat = {};      // { charId: {v,s,m} }
    if (!s.eaten) s.eaten = {};    // { charId: {day, n} }
    if (!s.sched) s.sched = {};    // { charId: {type, day} }  (휴식은 day = 시작일)
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }
  function statOf(st, cid) {
    if (!st.stat[cid]) st.stat[cid] = { v: STAT_START, s: STAT_START, m: STAT_START };
    return st.stat[cid];
  }
  function mealsLeft(st, cid) {
    var e = st.eaten[cid];
    return (e && e.day === st.day) ? Math.max(0, MEALS_PER_DAY - e.n) : MEALS_PER_DAY;
  }

  function debutedIds() {        // 기획사에서 데뷔 완료한 아이돌 (agency.js의 저장값을 읽기만 함)
    var a = null, out = [];
    try { a = JSON.parse(localStorage.getItem('ph_agency') || 'null'); } catch (e) {}
    if (a) {
      var done = a.done || {}, deb = a.debut || {};
      ORDER.forEach(function (cid) { if (done[cid] || deb[cid]) out.push(cid); });
    }
    return out;
  }

  function phaseOf(st, cid, day) {
    var sc = st.sched[cid];
    if (!sc) return 'normal';
    if (sc.type === 'drama' && day < sc.day && sc.day - day <= PREP_DAYS) return 'shoot';
    if (sc.type === 'comeback' && day < sc.day && sc.day - day <= PREP_DAYS) return 'comeback';
    if (sc.type === 'rest' && day >= sc.day && day < sc.day + REST_DAYS) return 'rest';
    return 'normal';
  }

  function mealDelta(cid, food, phase) {
    var v = food.v, s = food.s, m = food.m;
    if (phase === 'shoot') { v = v * 1.5; if (m < 0) m = m * 1.5; }
    else if (phase === 'comeback') { s = s * 1.5; }
    else if (phase === 'rest') { m = m * 2; }
    var meta = CH[cid] || { like: [], dislike: [] };
    var like = meta.like.indexOf(food.id) !== -1, dislike = meta.dislike.indexOf(food.id) !== -1;
    if (like) m += 5;
    if (dislike) m -= 3;
    return { v: Math.round(v), s: Math.round(s), m: Math.round(m), like: like, dislike: dislike };
  }
  function applyDeltas(stat, d) {
    stat.v = clamp(stat.v + d.v); stat.s = clamp(stat.s + d.s); stat.m = clamp(stat.m + d.m);
  }

  // 먹이기: 코인은 화면 쪽에서 처리. 여기선 수치/횟수/들킴만 계산.
  function eat(st, cid, foodId, rng) {
    rng = rng || Math.random;
    var food = FOOD_BY_ID[foodId];
    if (!food) return { ok: false, why: 'invalid' };
    if (mealsLeft(st, cid) <= 0) return { ok: false, why: 'full' };
    var phase = phaseOf(st, cid, st.day);
    var d = mealDelta(cid, food, phase);
    var caught = false;
    if (phase === 'shoot' && food.sneak && rng() < SNEAK_CHANCE) { caught = true; d.v -= SNEAK_V; d.m -= SNEAK_M; }
    var stat = statOf(st, cid), before = { v: stat.v, s: stat.s, m: stat.m };
    applyDeltas(stat, d);
    var e = st.eaten[cid];
    if (!e || e.day !== st.day) e = st.eaten[cid] = { day: st.day, n: 0 };
    e.n += 1;
    return { ok: true, food: food, phase: phase, d: d, caught: caught, before: before, price: PRICE_COIN[food.price] || 0 };
  }

  function qualityOf(score) {
    if (score >= QUALITY.perfect.min) return 'perfect';
    if (score >= QUALITY.good.min) return 'good';
    if (score >= QUALITY.normal.min) return 'normal';
    return 'bad';
  }
  function resolveEvent(st, cid, sc) {
    var stat = statOf(st, cid), catering = null;
    if (sc.type === 'drama') {
      var cd = mealDelta(cid, CATERING, 'shoot');
      applyDeltas(stat, cd); catering = cd;
    }
    var w = sc.type === 'drama' ? { v: 0.5, m: 0.3, s: 0.2 } : { s: 0.5, m: 0.3, v: 0.2 };
    var score = stat.v * w.v + stat.s * w.s + stat.m * w.m;
    var q = qualityOf(score);
    var pay = Math.round((EVENT_PAY[sc.type] || 0) * QUALITY[q].mult / 100) * 100;
    stat.s = clamp(stat.s - EVENT_TIRED); stat.m = clamp(stat.m + EVENT_GLOW);
    return { cid: cid, type: sc.type, score: Math.round(score), quality: q, pay: pay, catering: catering };
  }

  // 하루 보내기. 지난 일정 정리 + 수치 복귀 + 일정 날 정산.
  function advanceDay(st) {
    st.day += 1;
    var events = [];
    Object.keys(st.stat).forEach(function (cid) {
      var s = st.stat[cid];
      ['v', 's', 'm'].forEach(function (k) {
        var diff = STAT_START - s[k];
        s[k] = clamp(s[k] + (diff === 0 ? 0 : (diff > 0 ? 1 : -1) * Math.min(DRIFT, Math.abs(diff))));
      });
    });
    Object.keys(st.sched).forEach(function (cid) {
      var sc = st.sched[cid];
      if (sc.type === 'rest') {
        if (st.day >= sc.day + REST_DAYS) delete st.sched[cid];
      } else if (sc.day === st.day) {
        events.push(resolveEvent(st, cid, sc));
        delete st.sched[cid];
      }
    });
    return events;
  }

  function book(st, cid, type, day) {
    if (st.sched[cid]) return false;
    if (type === 'rest') {
      if (day < st.day + 1 || day > st.day + 1) return false;       // 휴식은 내일부터만
    } else {
      var off = day - st.day;
      if (off < BOOK_MIN || off > BOOK_MAX) return false;
    }
    st.sched[cid] = { type: type, day: day };
    return true;
  }

  function bonusOf(value, max) {            // 50이면 0, 100이면 +max, 0이면 −max×NEG_RATIO
    var x = (value - 50) / 50;
    return x >= 0 ? x * max : x * max * NEG_RATIO;
  }
  function dramaBonus(st, cid) {
    var s = statOf(st, cid);
    return { visual: bonusOf(s.v, DRAMA_VISUAL_MAX), stamina: bonusOf(s.s, DRAMA_STAMINA_MAX), mood: bonusOf(s.m, DRAMA_MOOD_MAX) };
  }
  function incomeMultOf(st, cid) {
    var s = statOf(st, cid);
    return 1 + bonusOf((s.v + s.s + s.m) / 3, INCOME_MAX);
  }
  function pickLine(trait, kind, rng) {
    var pool = (LINES[trait] || LINES['수줍음'])[kind] || [];
    rng = rng || Math.random;
    return pool.length ? pool[Math.floor(rng() * pool.length)] : '';
  }
  function reactionOf(res) {                // 먹은 결과 → 연출 종류
    if (res.caught) return 'caught';
    if (res.d.like) return 'like';
    if (res.d.dislike) return 'dislike';
    if (res.phase === 'shoot' && res.d.v >= 4) return 'diet';
    if (res.phase === 'comeback' && res.d.s >= 8) return 'power';
    if (res.phase === 'rest' && res.d.m >= 5) return 'rest';
    return 'neutral';
  }

  // ════════ 게임 데이터 읽기/쓰기 ════════
  function money() { return (typeof coins !== 'undefined') ? coins : 0; }
  function spend(n) { if (n > 0 && typeof coins !== 'undefined') { coins -= n; try { saveAll(); } catch (e) {} } }
  function gain(n) { if (typeof coins !== 'undefined') { coins = Math.max(0, coins + n); try { saveAll(); } catch (e) {} } }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // ════════ 기획사 수익 배율 연결 (enhance.js가 먼저든 나중이든 곱해서 붙임) ════════
  function hookIncome() {
    try {
      var base = window.getEnhanceIncomeMult;
      var combined = function (cid) {
        var b = (typeof base === 'function') ? base(cid) : 1;
        var m = 1;
        try { m = incomeMultOf(load(), cid); } catch (e) {}
        return b * m;
      };
      Object.defineProperty(window, 'getEnhanceIncomeMult', {
        configurable: true,
        get: function () { return combined; },
        set: function (f) { base = f; }
      });
    } catch (e) {}
  }

  // ════════ 드라마 촬영 연결 (CFG는 drama.js가 열어둔 window.__dramaTest.CFG를 그대로 씀) ════════
  var dramaBase = null, dramaPending = null, lastDramaChar = null;
  function dramaCfg() { return (window.__dramaTest && window.__dramaTest.CFG) || null; }
  function restoreDrama() {
    var cfg = dramaCfg();
    if (cfg && dramaBase) { cfg.TIME = dramaBase.TIME; cfg.SK = dramaBase.SK; }
  }
  function onDramaClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var go = t.closest('[data-a="go"]'), again = t.closest('[data-r="again"]');
    if (!go && !again) return;
    var cfg = dramaCfg();
    if (!cfg) return;
    var cid = null;
    if (go) {
      var on = document.querySelector('.pc.on[data-a="char"]');
      cid = on ? on.getAttribute('data-id') : null;
    } else { cid = lastDramaChar; }
    if (!cid || !CH[cid]) return;
    lastDramaChar = cid;
    if (!dramaBase) dramaBase = { TIME: cfg.TIME, SK: cfg.SK };
    var b = dramaBonus(load(), cid);
    cfg.TIME = Math.round(dramaBase.TIME * (1 + b.stamina));
    cfg.SK = dramaBase.SK * (1 + b.mood);
    dramaPending = { cid: cid, visual: b.visual };
  }
  function onDramaShot(e) {
    restoreDrama();
    if (!dramaPending) return;
    var p = dramaPending; dramaPending = null;
    var r = (e && e.detail && e.detail.r) || 0;
    var extra = Math.round(r * DRAMA_PAY_PER_RATING * p.visual / 100) * 100;
    if (extra !== 0) {
      gain(extra);
      toast(extra > 0 ? '🍽️ 비주얼 컨디션 보너스 +' + extra.toLocaleString() + '코인'
                      : '🍽️ 비주얼 컨디션 부족 ' + extra.toLocaleString() + '코인');
    }
    var st = load(), s = statOf(st, p.cid);
    s.s = clamp(s.s - DRAMA_TIRED); s.m = clamp(s.m + DRAMA_GLOW);
    save(st);
  }

  // ════════ 화면 ════════
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;
  var STAT_META = [
    { k: 'v', name: '비주얼', color: '#ff9ec7', icon: '✨' },
    { k: 's', name: '체력',   color: '#7fd1ae', icon: '💪' },
    { k: 'm', name: '기분',   color: '#ffcf4a', icon: '😊' }
  ];
  var selected = null, busy = false;

  function injectStyle() {
    if (document.getElementById('meal-style')) return;
    var s = document.createElement('style');
    s.id = 'meal-style';
    s.textContent =
      '@keyframes mlMunch{0%,100%{transform:scale(1,1)}25%{transform:scale(1.04,.94)}50%{transform:scale(.97,1.04)}75%{transform:scale(1.04,.95)}}' +
      '@keyframes mlJump{0%,100%{transform:translateY(0)}30%{transform:translateY(-26px)}55%{transform:translateY(0)}72%{transform:translateY(-12px)}}' +
      '@keyframes mlSag{0%{transform:translateY(0) scale(1)}100%{transform:translateY(10px) scale(1,.94);filter:brightness(.8)}}' +
      '@keyframes mlShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-7px)}30%{transform:translateX(7px)}45%{transform:translateX(-6px)}60%{transform:translateX(6px)}75%{transform:translateX(-3px)}}' +
      '@keyframes mlFloat{0%{opacity:0;transform:translate(0,10px) scale(.6)}15%{opacity:1}100%{opacity:0;transform:translate(var(--dx,0),-70px) scale(1.1)}}' +
      '@keyframes mlFly{0%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-150px) scale(.25)}}' +
      '@keyframes mlDark{0%{opacity:0}20%{opacity:1}80%{opacity:1}100%{opacity:0}}' +
      '@keyframes mlPop{0%{opacity:0;transform:translate(-50%,6px) scale(.9)}12%{opacity:1;transform:translate(-50%,0) scale(1)}85%{opacity:1}100%{opacity:0}}' +
      '.ml-bar{transition:width .6s ease}';
    document.head.appendChild(s);
  }

  function dayLabel(day) { return 'DAY ' + day + ' (' + weekday(day) + ')'; }

  function calHtml(st) {
    var cells = '';
    for (var i = 0; i < 7; i++) {
      var d = st.day + i, marks = '';
      Object.keys(st.sched).forEach(function (cid) {
        var sc = st.sched[cid], nm = CH[cid] ? CH[cid].name.charAt(0) : '?';
        if (sc.type === 'rest') {
          if (d >= sc.day && d < sc.day + REST_DAYS) marks += '<div title="휴식">😴<span style="font-size:9px;">' + nm + '</span></div>';
        } else if (sc.day === d) {
          marks += '<div>' + (sc.type === 'drama' ? '🎥' : '🎤') + '<span style="font-size:9px;">' + nm + '</span></div>';
        }
      });
      cells += '<div style="flex:1;min-width:0;text-align:center;border-radius:10px;padding:6px 2px;background:' + (i === 0 ? 'rgba(255,207,74,0.22)' : 'rgba(255,255,255,0.06)') + ';border:1px solid ' + (i === 0 ? '#ffcf4a' : 'rgba(255,255,255,0.1)') + ';">' +
        '<div style="font-size:10px;color:#aaa;">' + weekday(d) + '</div>' +
        '<div style="font-size:13px;font-weight:900;color:#fff;">' + d + '</div>' +
        '<div style="min-height:32px;font-size:13px;line-height:1.15;color:#fff;">' + marks + '</div></div>';
    }
    return '<div style="display:flex;gap:4px;">' + cells + '</div>';
  }

  function statsHtml(st, cid, from) {
    var s = statOf(st, cid), b = dramaBonus(st, cid), inc = incomeMultOf(st, cid);
    var rows = STAT_META.map(function (m) {
      var shown = (from && from[m.k] !== undefined) ? from[m.k] : s[m.k];
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">' +
        '<div style="width:62px;font-size:12px;font-weight:900;color:#fff;">' + m.icon + ' ' + m.name + '</div>' +
        '<div style="flex:1;height:10px;border-radius:6px;background:rgba(255,255,255,0.12);overflow:hidden;">' +
        '<div class="ml-bar" data-final="' + s[m.k] + '" style="height:100%;width:' + shown + '%;background:' + m.color + ';border-radius:6px;"></div></div>' +
        '<div style="width:30px;text-align:right;font-size:13px;font-weight:900;color:' + m.color + ';">' + s[m.k] + '</div></div>';
    }).join('');
    function pct(x) { var v = Math.round(x * 100); return (v >= 0 ? '+' : '') + v + '%'; }
    var base = (dramaBase && dramaBase.TIME) || ((dramaCfg() && dramaCfg().TIME) || 60);
    var secs = Math.round(base * b.stamina);
    var fx = '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed rgba(255,255,255,0.15);font-size:11px;line-height:1.7;color:#cfd3ee;">' +
      '🎥 드라마: 촬영 시간 ' + (secs >= 0 ? '+' : '') + secs + '초 · 코인 ' + pct(b.visual) + ' · 스킬 ' + pct(b.mood) + '<br>' +
      '🎤 기획사 정산 수익 ×' + inc.toFixed(2) + '</div>';
    return rows + fx;
  }

  function foodsHtml(st, cid) {
    var phase = phaseOf(st, cid, st.day), left = mealsLeft(st, cid), have = money();
    var head = '<div style="display:flex;justify-content:space-between;align-items:center;margin:14px 0 8px;">' +
      '<div style="font-size:13px;font-weight:900;color:#ddd;">🍴 오늘의 식사 <span style="color:#aaa;font-weight:700;">(남은 끼니 ' + left + '/' + MEALS_PER_DAY + ')</span></div>' +
      '<div style="font-size:12px;color:#ffe08a;font-weight:900;">🍔 ' + have.toLocaleString() + '</div></div>';
    var cards = FOODS.map(function (f) {
      var d = mealDelta(cid, f, phase), price = PRICE_COIN[f.price] || 0;
      var disabled = left <= 0 || have < price;
      function chip(label, val, color) {
        var c = val > 0 ? '#7ee8a5' : val < 0 ? '#ff8a8a' : '#888';
        return '<span style="font-size:10px;font-weight:900;color:' + c + ';">' + label + (val > 0 ? '+' : '') + val + '</span>';
      }
      var mark = d.like ? '<span title="좋아해요" style="position:absolute;top:4px;right:6px;font-size:13px;">❤️</span>'
               : d.dislike ? '<span title="싫어해요" style="position:absolute;top:4px;right:6px;font-size:13px;">💧</span>' : '';
      var warn = (phase === 'shoot' && f.sneak) ? '<div style="font-size:9px;color:#ffb36b;">🚨 들킬 수 있어요</div>' : '';
      return '<button data-food="' + f.id + '" style="' + BTN + 'position:relative;text-align:center;padding:8px 4px 8px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);color:#fff;opacity:' + (disabled ? 0.45 : 1) + ';">' +
        mark + '<img src="' + ASSET + 'foods/' + f.id + '.png" alt="" style="width:58px;height:58px;object-fit:contain;display:block;margin:0 auto 2px;" onerror="this.style.display=\'none\'">' +
        '<div style="font-size:11px;font-weight:900;line-height:1.25;min-height:28px;display:flex;align-items:center;justify-content:center;">' + esc(f.name) + '</div>' +
        '<div style="display:flex;justify-content:center;gap:5px;margin-top:2px;">' + chip('✨', d.v) + chip('💪', d.s) + chip('😊', d.m) + '</div>' +
        '<div style="font-size:10px;color:#9aa0c8;margin-top:3px;">' + WHERE[f.where] + '</div>' +
        '<div style="font-size:11px;font-weight:900;color:' + (have < price ? '#ff8a8a' : '#ffe08a') + ';">' + (price === 0 ? '무료' : price.toLocaleString() + '코인') + '</div>' + warn + '</button>';
    }).join('');
    return head + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' + cards + '</div>';
  }

  function animateBars(root) {
    var bars = root.querySelectorAll('.ml-bar');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        for (var i = 0; i < bars.length; i++) bars[i].style.width = bars[i].getAttribute('data-final') + '%';
      });
    });
  }

  // 캐릭터 무대 (메인 화면과 먹기 팝업이 같이 씀). data-r 로 안쪽 요소를 찾는다.
  function stageHtml(cid, ph, h, imgH, stageId) {
    return '<div ' + (stageId ? 'id="' + stageId + '" ' : '') + 'data-r="stage" style="position:relative;height:' + h + 'px;border-radius:20px;overflow:hidden;background:linear-gradient(180deg,' + ph.color + '33,rgba(20,15,40,0.9));border:1.5px solid ' + ph.color + '88;">' +
      '<div style="position:absolute;top:10px;left:12px;z-index:3;background:' + ph.color + ';color:#2a1c00;border-radius:10px;padding:4px 10px;font-size:12px;font-weight:900;">' + ph.label + '</div>' +
      '<div style="position:absolute;top:36px;left:12px;z-index:3;font-size:11px;color:#fff;opacity:.85;">' + ph.desc + '</div>' +
      '<div style="position:absolute;left:50%;bottom:6px;transform:translateX(-50%);z-index:2;">' +
      '<img data-r="sd" src="' + ASSET + 'chars/' + cid + '.png" alt="' + esc(CH[cid].name) + '" style="height:' + imgH + 'px;display:block;" onerror="this.outerHTML=\'<div style=&quot;font-size:80px;&quot;>🙂</div>\'"></div>' +
      '<div data-r="dark" style="position:absolute;inset:0;background:rgba(0,0,0,.6);opacity:0;pointer-events:none;z-index:4;"></div>' +
      '<div data-r="fx" style="position:absolute;inset:0;pointer-events:none;z-index:5;"></div>' +
      '<div data-r="bubble" style="position:absolute;left:50%;top:70px;transform:translateX(-50%);z-index:6;max-width:86%;background:#fff;color:#2a2438;border-radius:14px;padding:8px 12px;font-size:12px;font-weight:700;line-height:1.45;opacity:0;pointer-events:none;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.35);"></div></div>';
  }

  function render() {
    var ov = document.getElementById('meal-overlay');
    if (!ov) return;
    var st = load(), ids = debutedIds();
    if (ids.length && ids.indexOf(selected) === -1) selected = ids[0];
    var head = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">' +
      '<div style="font-size:19px;font-weight:900;color:#fff;">📅 스케줄 · 식사</div>' +
      '<button id="meal-close" style="' + BTN + 'padding:8px 14px;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;">닫기</button></div>';
    var dayBar = '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:linear-gradient(135deg,rgba(255,107,157,0.18),rgba(192,132,252,0.18));border:1.5px solid #C084FC;border-radius:16px;padding:12px 14px;margin-bottom:10px;">' +
      '<div><div id="meal-day" style="font-size:17px;font-weight:900;color:#fff;">' + dayLabel(st.day) + '</div>' +
      '<div style="font-size:11px;color:#cdb8ff;margin-top:2px;">하루를 보내면 일정이 진행돼요</div></div>' +
      '<button id="meal-next" style="' + BTN + 'padding:11px 14px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#3a2600;font-size:13px;">🌙 하루 보내기</button></div>';
    var cal = '<div id="meal-cal" style="margin-bottom:14px;">' + calHtml(st) + '</div>';

    var body = '';
    if (!ids.length) {
      body = '<div style="text-align:center;color:#aaa;font-size:13px;line-height:1.7;padding:40px 10px;">아직 데뷔한 아이돌이 없어요.<br>기획사에서 먼저 데뷔시켜 주세요!</div>';
    } else {
      var chips = ids.map(function (cid) {
        var on = cid === selected, c = CH[cid];
        return '<button data-cid="' + cid + '" style="' + BTN + 'flex:0 0 auto;padding:6px 12px 6px 6px;display:flex;align-items:center;gap:6px;background:' + (on ? c.color + '33' : 'rgba(255,255,255,0.07)') + ';border:1.5px solid ' + (on ? c.color : 'rgba(255,255,255,0.12)') + ';color:#fff;font-size:12px;">' +
          '<span style="width:30px;height:30px;border-radius:50%;overflow:hidden;background:' + c.color + '55;display:inline-block;"><img src="' + ASSET + 'chars/' + cid + '.png" alt="" style="width:100%;height:100%;object-fit:cover;object-position:top;" onerror="this.style.display=\'none\'"></span>' + esc(c.name) + '</button>';
      }).join('');
      var phase = phaseOf(st, selected, st.day), ph = PHASES[phase], sc = st.sched[selected];
      var schedText = sc ? (sc.type === 'rest'
          ? TYPE_LABEL.rest + ' · DAY ' + sc.day + '~' + (sc.day + REST_DAYS - 1)
          : TYPE_LABEL[sc.type] + ' · DAY ' + sc.day + ' (' + weekday(sc.day) + ') · D-' + (sc.day - st.day))
        : '잡힌 일정이 없어요';
      var stage = '<div style="margin-top:12px;">' + stageHtml(selected, ph, 262, 236, 'meal-stage') + '</div>';
      var schedBox = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:10px 12px;">' +
        '<div style="font-size:12px;color:#fff;line-height:1.5;"><b>' + esc(CH[selected].name) + '의 일정</b><br><span style="color:#cfd3ee;">' + schedText + '</span></div>' +
        (sc ? '<button id="meal-cancel" style="' + BTN + 'padding:9px 12px;background:rgba(255,255,255,0.12);color:#fff;font-size:12px;">일정 취소</button>'
            : '<button id="meal-book" style="' + BTN + 'padding:9px 12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:12px;">일정 잡기</button>') + '</div>';
      body = '<div id="meal-chips" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;">' + chips + '</div>' + stage +
        '<div id="meal-stats" style="margin-top:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:12px;">' + statsHtml(st, selected) + '</div>' +
        schedBox + '<div id="meal-foods">' + foodsHtml(st, selected) + '</div>';
    }
    ov.innerHTML = '<div style="max-width:430px;margin:0 auto;padding:16px 14px 40px;">' + head + dayBar + cal + body + '</div>';
    bind(ov);
  }

  function refresh(from) {
    var st = load(), ids = debutedIds();
    if (!selected || ids.indexOf(selected) === -1) { render(); return; }
    var c = document.getElementById('meal-cal'); if (c) c.innerHTML = calHtml(st);
    var d = document.getElementById('meal-day'); if (d) d.textContent = dayLabel(st.day);
    var s = document.getElementById('meal-stats'); if (s) { s.innerHTML = statsHtml(st, selected, from); animateBars(s); }
    var f = document.getElementById('meal-foods'); if (f) f.innerHTML = foodsHtml(st, selected);
  }

  function bind(ov) {
    var q = function (id) { return ov.querySelector(id); };
    q('#meal-close').onclick = function () { ov.remove(); };
    q('#meal-next').onclick = onNextDay;
    ov.querySelectorAll('[data-cid]').forEach(function (b) {
      b.onclick = function () { selected = b.getAttribute('data-cid'); render(); };
    });
    var foods = q('#meal-foods');
    if (foods) foods.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-food]') : null;
      if (b) openEatConfirm(b.getAttribute('data-food'));
    };
    var bk = q('#meal-book'); if (bk) bk.onclick = openBooking;
    var cn = q('#meal-cancel'); if (cn) cn.onclick = function () {
      var st = load(); delete st.sched[selected]; save(st); render(); toast('일정을 취소했어요');
    };
  }

  // ── 먹기: 확인 팝업 → 팝업 안에서 먹는 장면 (스크롤 위치와 상관없이 캐릭터가 보임) ──
  var sceneEl = null;                       // 지금 연출이 돌고 있는 무대
  function sc$(role) { return sceneEl ? sceneEl.querySelector('[data-r="' + role + '"]') : null; }
  function fx(name, dx) {
    var layer = sc$('fx'); if (!layer) return;
    var im = document.createElement('img');
    im.src = ASSET + 'fx/' + name + '.png'; im.alt = '';
    im.style.cssText = 'position:absolute;left:' + (50 + (Math.random() * 26 - 13)) + '%;top:' + (70 + Math.random() * 40) + 'px;width:' + (34 + Math.random() * 16) + 'px;--dx:' + (dx || (Math.random() * 40 - 20)) + 'px;animation:mlFloat 1.3s ease-out forwards;';
    layer.appendChild(im);
    setTimeout(function () { if (im.parentNode) im.parentNode.removeChild(im); }, 1400);
  }
  function say(text) {
    var b = sc$('bubble'); if (!b) return;
    b.textContent = text; b.style.animation = 'none'; void b.offsetWidth;
    b.style.animation = 'mlPop 3s ease forwards';
  }
  function playSd(anim, ms) {
    var sd = sc$('sd'); if (!sd) return;
    sd.style.animation = 'none'; void sd.offsetWidth;
    sd.style.animation = anim;
    if (ms) setTimeout(function () { if (sd) sd.style.animation = ''; }, ms);
  }
  function darken() {
    var dk = sc$('dark'); if (!dk) return;
    dk.style.animation = 'none'; void dk.offsetWidth;
    dk.style.animation = 'mlDark 1.6s ease forwards';
  }
  function flyFood(foodId) {
    if (!sceneEl) return;
    var im = document.createElement('img');
    im.src = ASSET + 'foods/' + foodId + '.png'; im.alt = '';
    im.style.cssText = 'position:absolute;left:50%;bottom:10px;width:80px;height:80px;object-fit:contain;z-index:7;animation:mlFly .8s ease-in forwards;';
    sceneEl.appendChild(im);
    setTimeout(function () { if (im.parentNode) im.parentNode.removeChild(im); }, 900);
  }
  function closeEat() {
    var o = document.getElementById('meal-eat-overlay'); if (o) o.remove();
    sceneEl = null;
  }
  function deltaChip(label, val) {
    var c = val > 0 ? '#7ee8a5' : val < 0 ? '#ff8a8a' : '#aaa';
    return '<span style="font-size:12px;font-weight:900;color:' + c + ';">' + label + ' ' + (val > 0 ? '+' : '') + val + '</span>';
  }

  function openEatConfirm(foodId) {
    if (busy || !selected) return;
    var f = FOOD_BY_ID[foodId]; if (!f) return;
    var st = load(), cid = selected, c = CH[cid];
    if (mealsLeft(st, cid) <= 0) { toast('오늘 식사는 다 했어요. 하루를 보내 주세요'); return; }
    var price = PRICE_COIN[f.price] || 0;
    if (money() < price) { toast('코인이 부족해요'); return; }
    var phase = phaseOf(st, cid, st.day), ph = PHASES[phase], d = mealDelta(cid, f, phase);

    var old = document.getElementById('meal-eat-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'meal-eat-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:795;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:14px;overflow-y:auto;' + FONT;

    var note = d.like ? '<div style="font-size:12px;color:#ff9ec7;margin-top:6px;">❤️ ' + esc(c.name) + '이(가) 좋아하는 음식이에요 (기분 +5)</div>'
             : d.dislike ? '<div style="font-size:12px;color:#8fc8ff;margin-top:6px;">💧 ' + esc(c.name) + '이(가) 싫어하는 음식이에요 (기분 −3)</div>' : '';
    var warn = (phase === 'shoot' && f.sneak) ? '<div style="font-size:12px;color:#ffb36b;margin-top:6px;">🚨 식단 중이라 들킬 수 있어요 (약 ' + Math.round(SNEAK_CHANCE * 100) + '%)</div>' : '';
    var confirm = '<div style="display:flex;align-items:center;gap:12px;margin-top:12px;">' +
      '<img src="' + ASSET + 'foods/' + f.id + '.png" alt="" style="width:68px;height:68px;object-fit:contain;flex-shrink:0;" onerror="this.style.display=\'none\'">' +
      '<div style="flex:1;min-width:0;text-align:left;">' +
      '<div style="font-size:15px;font-weight:900;color:#fff;">' + esc(f.name) + ' 먹을까요?</div>' +
      '<div style="display:flex;gap:10px;margin-top:5px;">' + deltaChip('✨', d.v) + deltaChip('💪', d.s) + deltaChip('😊', d.m) + '</div>' +
      '<div style="font-size:11px;color:#9aa0c8;margin-top:4px;">' + WHERE[f.where] + ' · ' + (price === 0 ? '무료' : price.toLocaleString() + '코인') + '</div></div></div>' + note + warn +
      '<div style="display:flex;gap:8px;margin-top:14px;">' +
      '<button id="meal-eat-cancel" style="' + BTN + 'flex:1;padding:12px;background:rgba(255,255,255,0.12);color:#fff;font-size:14px;">취소</button>' +
      '<button id="meal-eat-go" style="' + BTN + 'flex:2;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:14px;">🍴 먹기</button></div>';

    ov.innerHTML = '<div style="width:100%;max-width:380px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid ' + ph.color + ';border-radius:20px;padding:14px;">' +
      stageHtml(cid, ph, 250, 224) + '<div id="meal-eat-body">' + confirm + '</div></div>';
    document.body.appendChild(ov);
    sceneEl = ov.querySelector('[data-r="stage"]');

    ov.querySelector('#meal-eat-cancel').onclick = closeEat;
    ov.querySelector('#meal-eat-go').onclick = function () {
      if (busy) return;
      var st2 = load();
      if (mealsLeft(st2, cid) <= 0 || money() < price) { toast('지금은 먹을 수 없어요'); closeEat(); return; }
      var res = eat(st2, cid, foodId);
      if (!res.ok) { closeEat(); return; }
      spend(price); save(st2);
      busy = true;
      var body = ov.querySelector('#meal-eat-body');
      body.innerHTML = '<div style="text-align:center;font-size:14px;font-weight:900;color:#ffe08a;padding:22px 0;">🍴 냠냠…</div>';
      var kind = reactionOf(res);
      flyFood(foodId);
      playSd('mlMunch .9s ease-in-out 1', 900);
      setTimeout(function () {
        say(pickLine(c.trait, kind));
        if (kind === 'like') { playSd('mlJump .8s ease-out 1', 800); fx('heart'); fx('heart'); fx('sparkle'); }
        else if (kind === 'dislike') { playSd('mlSag .6s ease-out forwards', 1600); fx('sweat'); fx('cloud'); }
        else if (kind === 'caught') { darken(); playSd('mlShake .6s linear 1', 600); fx('exclaim'); fx('sweat'); fx('sweat'); }
        else if (kind === 'diet' || kind === 'power') { fx('sparkle'); fx('sparkle'); }
        else if (kind === 'rest') { fx('heart'); fx('sparkle'); }
        else if (res.d.m >= 8) { fx('heart'); }
      }, 850);
      setTimeout(function () {                       // 반응을 충분히 본 다음에 결과 + 확인 버튼
        var after = statOf(load(), cid);
        var rows = STAT_META.map(function (m) {
          var dv = res.d[m.k], c2 = dv > 0 ? '#7ee8a5' : dv < 0 ? '#ff8a8a' : '#aaa';
          return '<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;color:#fff;"><span>' + m.icon + ' ' + m.name + '</span>' +
            '<span><span style="color:#9aa0c8;">' + res.before[m.k] + '</span> → <b>' + after[m.k] + '</b> <span style="color:' + c2 + ';font-weight:900;">(' + (dv > 0 ? '+' : '') + dv + ')</span></span></div>';
        }).join('');
        var caughtNote = res.caught ? '<div style="font-size:12px;color:#ffb36b;margin-top:6px;text-align:center;">🚨 야식을 먹다 들켰어요! 비주얼 −' + SNEAK_V + ', 기분 −' + SNEAK_M + ' 추가</div>' : '';
        body.innerHTML = '<div id="meal-eat-result" style="margin-top:12px;background:rgba(255,255,255,0.06);border-radius:14px;padding:8px 12px;">' + rows + '</div>' + caughtNote +
          '<button id="meal-eat-ok" style="' + BTN + 'width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#FFD700,#F59E0B);color:#3a2600;font-size:14px;">확인</button>';
        busy = false;
        body.querySelector('#meal-eat-ok').onclick = function () { closeEat(); refresh(res.before); };
      }, 2300);
    };
  }

  // ── 하루 보내기 ──
  function onNextDay() {
    if (busy) return;
    var st = load();
    var events = advanceDay(st);
    var total = 0;
    events.forEach(function (e) { total += e.pay; });
    save(st);
    if (total > 0) { gain(total); try { if (typeof spawnCoinFloat === 'function') spawnCoinFloat(total); } catch (e) {} }
    render();
    toast('🌙 ' + dayLabel(st.day));
    if (events.length) showEvents(events, total);
  }
  function showEvents(events, total) {
    var old = document.getElementById('meal-event'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'meal-event';
    ov.style.cssText = 'position:fixed;inset:0;z-index:800;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    var rows = events.map(function (e) {
      var c = CH[e.cid], q = QUALITY[e.quality];
      return '<div style="background:rgba(255,255,255,0.07);border-radius:14px;padding:12px;margin-bottom:8px;text-align:left;">' +
        '<div style="font-size:14px;font-weight:900;color:#fff;">' + q.emoji + ' ' + esc(c.name) + ' · ' + TYPE_LABEL[e.type] + '</div>' +
        '<div style="font-size:12px;color:#cfd3ee;margin-top:4px;line-height:1.6;">컨디션 ' + e.score + '점 · ' + q.label +
        (e.catering ? '<br>🎬 촬영장 케이터링 도시락을 먹고 촬영에 들어갔어요' : '') + '</div>' +
        '<div style="font-size:13px;font-weight:900;color:#ffe08a;margin-top:4px;">정산금 +' + e.pay.toLocaleString() + '코인</div></div>';
    }).join('');
    ov.innerHTML = '<div style="width:100%;max-width:360px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #C084FC;border-radius:20px;padding:18px;text-align:center;">' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:12px;">📅 일정 결과</div>' + rows +
      '<div style="font-size:14px;font-weight:900;color:#ffd700;margin:8px 0 14px;">합계 +' + total.toLocaleString() + '코인</div>' +
      '<button id="meal-event-ok" style="' + BTN + 'width:100%;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-size:14px;">확인</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#meal-event-ok').onclick = function () { ov.remove(); };
  }

  // ── 일정 잡기 ──
  function openBooking() {
    var st = load(), cid = selected, c = CH[cid];
    var old = document.getElementById('meal-book-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'meal-book-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:790;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    function dateButtons(type) {
      var out = '';
      for (var off = BOOK_MIN; off <= BOOK_MAX; off++) {
        var day = st.day + off;
        out += '<button data-type="' + type + '" data-day="' + day + '" style="' + BTN + 'padding:8px 10px;background:rgba(255,255,255,0.1);color:#fff;font-size:12px;">' + off + '일 뒤<br><span style="font-size:10px;color:#cfd3ee;">DAY ' + day + ' (' + weekday(day) + ')</span></button>';
      }
      return out;
    }
    var section = function (title, desc, inner) {
      return '<div style="background:rgba(255,255,255,0.06);border-radius:14px;padding:12px;margin-bottom:10px;text-align:left;">' +
        '<div style="font-size:14px;font-weight:900;color:#fff;">' + title + '</div>' +
        '<div style="font-size:11px;color:#cfd3ee;margin:3px 0 8px;line-height:1.5;">' + desc + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;">' + inner + '</div></div>';
    };
    ov.innerHTML = '<div style="width:100%;max-width:380px;max-height:90vh;overflow-y:auto;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid #C084FC;border-radius:20px;padding:16px;">' +
      '<div style="font-size:17px;font-weight:900;color:#fff;text-align:center;margin-bottom:12px;">' + esc(c.name) + ' 일정 잡기</div>' +
      section('🎥 드라마 촬영', PREP_DAYS + '일 전부터 식단 관리 모드 (비주얼 효과 ×1.5). 촬영 날 컨디션에 따라 정산금을 받아요.', dateButtons('drama')) +
      section('🎤 컴백 무대', PREP_DAYS + '일 전부터 체력 효과 ×1.5. 무대 날 컨디션에 따라 정산금을 받아요.', dateButtons('comeback')) +
      section('😴 휴식기', '내일부터 ' + REST_DAYS + '일 동안 기분 효과 ×2. 맛있는 걸 마음껏 먹일 수 있어요.',
        '<button data-type="rest" data-day="' + (st.day + 1) + '" style="' + BTN + 'padding:8px 12px;background:rgba(255,255,255,0.1);color:#fff;font-size:12px;">내일부터 ' + REST_DAYS + '일</button>') +
      '<button id="meal-book-close" style="' + BTN + 'width:100%;padding:11px;background:rgba(255,255,255,0.12);color:#fff;font-size:13px;">닫기</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#meal-book-close').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-type]').forEach(function (b) {
      b.onclick = function () {
        var s2 = load();
        if (book(s2, cid, b.getAttribute('data-type'), +b.getAttribute('data-day'))) {
          save(s2); ov.remove(); render(); toast('📅 일정을 잡았어요');
        } else { toast('이 일정은 잡을 수 없어요'); }
      };
    });
  }

  function openMeal() {
    injectStyle();
    var old = document.getElementById('meal-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'meal-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:780;background:linear-gradient(160deg,#150f26,#2a1745);overflow-y:auto;' + FONT;
    document.body.appendChild(ov);
    render();
  }

  // ════════ 기획사 화면에 버튼 붙이기 ════════
  function injectButton(ov) {
    if (!ov || ov.querySelector('#meal-open-btn')) return;
    var wrap = ov.firstElementChild;
    if (!wrap) return;
    var st = load();
    var bar = document.createElement('button');
    bar.id = 'meal-open-btn';
    bar.style.cssText = BTN + 'display:block;width:100%;padding:13px 14px;margin-bottom:16px;background:linear-gradient(135deg,rgba(255,207,74,0.2),rgba(255,107,157,0.2));border:1.5px solid #ffcf4a;color:#fff;font-size:14px;text-align:left;';
    bar.innerHTML = '📅 스케줄 · 식사 관리 <span style="float:right;font-size:12px;color:#ffe08a;">' + dayLabel(st.day) + ' ›</span>';
    bar.onclick = openMeal;
    var settle = wrap.children[1];
    if (settle) settle.insertAdjacentElement('afterend', bar); else wrap.appendChild(bar);
  }
  function watchAgency() {
    if (typeof MutationObserver === 'undefined') return;
    var watched = null;
    function attach(ov) {
      if (watched === ov) return;
      watched = ov;
      injectButton(ov);
      new MutationObserver(function () { injectButton(ov); }).observe(ov, { childList: true });
    }
    var first = document.getElementById('agency-overlay');
    if (first) attach(first);
    new MutationObserver(function () {
      var ov = document.getElementById('agency-overlay');
      if (ov) attach(ov); else watched = null;
    }).observe(document.body, { childList: true });
  }

  // ════════ 시작 ════════
  hookIncome();
  if (typeof document !== 'undefined' && document.body) {
    document.addEventListener('click', onDramaClick, true);
    window.addEventListener('ph-drama-shot', onDramaShot);
    watchAgency();
  }

  window.openMealSchedule = openMeal;
  window.__mealTest = {
    FOODS: FOODS, CH: CH, CATERING: CATERING,
    load: load, save: save, statOf: statOf, mealsLeft: mealsLeft, phaseOf: phaseOf, mealDelta: mealDelta, eat: eat,
    advanceDay: advanceDay, book: book, resolveEvent: resolveEvent, bonusOf: bonusOf, dramaBonus: dramaBonus,
    incomeMultOf: incomeMultOf, reactionOf: reactionOf, pickLine: pickLine, qualityOf: qualityOf,
    CFG: { MEALS_PER_DAY: MEALS_PER_DAY, DRIFT: DRIFT, PREP_DAYS: PREP_DAYS, REST_DAYS: REST_DAYS, BOOK_MIN: BOOK_MIN, BOOK_MAX: BOOK_MAX }
  };
})();
