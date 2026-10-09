// ════════════════════════════════
// 🎓 아이돌 능력치 · 레슨 (lesson.js)  ── 1단계: 시온만
// 📅 스케줄 · 식사(meal.js) 화면의 능력치 카드 아래에 "🎓 능력치 / 오늘의 레슨" 칸을 붙인다.
//
// - 영구 능력치 5개: 🎤 보컬 · 💃 댄스 · 🎭 연기 · 🎪 예능 · ✨ 매력 (0~100, 처음 10)
//   (비주얼·체력·기분은 meal.js 의 "컨디션"이라 매일 50쪽으로 돌아오지만, 능력치는 한 번 올리면 안 떨어진다)
// - 레슨: 하루(게임 속 DAY)에 아이돌 1명당 1번. 코인이 들고, 체력/기분이 깎인다.
//     기분이 좋으면 효과 UP, 체력이 모자라면 효과 DOWN / 너무 지치면 레슨 불가
//     능력치가 높을수록 오르는 폭은 줄어든다 (천천히 키우는 맛)
// - 1단계에서는 능력치가 아직 드라마/CF/기획사 보상에 연결되지 않는다. (2단계에서 연결)
// - 지금은 시온만 열려 있다. 나머지 5명은 ENABLED 에 id 만 넣으면 열린다.
//
// 저장: localStorage 'ph_training' (ph_ 로 시작해서 cloud-extra.js 가 서버에 자동으로 올려줌)
// 컨디션/날짜/식사는 meal.js 의 저장값(ph_meal)을 window.__mealTest 로 읽고 쓴다.
// ════════════════════════════════
(function () {
  'use strict';

  // ════════ 설정 ════════
  var STORAGE_KEY = 'ph_training';
  var ENABLED = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];          // 레슨이 열린 아이돌
  var STAT_START = 10;
  var STAT_MAX = 100;
  var LESSON_COST = 1000;          // 코인 (신입 할인가: 아이돌마다 첫 FREE_LESSONS번)
  var FREE_LESSONS = 5;            // 이 횟수까지는 LESSON_COST 그대로 (초반 퀘스트·뉴비 보호)
  var COST_COEF = 5000;            // 그 뒤로는 비용 = COST_COEF × (그 능력치 현재값)² (신입 코치 기준)  → 10:50만 / 30:450만 / 50:1250만 / 100:5000만
  var LESSON_TIRED = 10;           // 체력 −
  var LESSON_MOOD = 3;             // 기분 −
  var MIN_STAMINA = 15;            // 이보다 체력이 낮으면 레슨 불가
  var BASE_GAIN = 3;               // 기본 상승 (+0~2 랜덤)
  var MOOD_HIGH = 70, MOOD_LOW = 30, STAMINA_LOW = 35;
  var MOOD_HIGH_MULT = 1.3, MOOD_LOW_MULT = 0.7, STAMINA_LOW_MULT = 0.6;
  var SLOW_DIV = 150;              // 능력치가 높을수록 상승폭 ×(1 − 능력치/150)

  // ════════ 데이터 ════════
  var STATS = [
    { k: 'vocal',  name: '보컬', icon: '🎤', color: '#b793ff', lesson: '보컬 레슨' },
    { k: 'dance',  name: '댄스', icon: '💃', color: '#ff7aa8', lesson: '댄스 레슨' },
    { k: 'act',    name: '연기', icon: '🎭', color: '#ffcf4a', lesson: '연기 레슨' },
    { k: 'fun',    name: '예능', icon: '🎪', color: '#7fd1ae', lesson: '예능 수업' },
    { k: 'charm',  name: '매력', icon: '✨', color: '#7fc8ff', lesson: '카메라 워킹' }
  ];
  var STAT_BY_K = {};
  STATS.forEach(function (s) { STAT_BY_K[s.k] = s; });

  var APT = {                       // 아이돌별 적성 (없으면 ×1)
    minjun: { dance: 1.2, fun: 1.3, act: 0.9, vocal: 0.9 },
    sion: { vocal: 1.3, fun: 0.8, charm: 1.1 },
    doyun: { dance: 1.3, vocal: 1.1, charm: 0.9, fun: 0.9 },
    harin: { vocal: 1.2, act: 1.1, fun: 0.8, dance: 0.9 },
    yuna: { charm: 1.3, fun: 1.1, dance: 0.9, act: 0.9 },
    ara: { act: 1.3, vocal: 1.1, charm: 1.1, dance: 0.8 }
  };
  var GRADES = [                    // 한 능력치 기준 등급
    { min: 80, label: '에이스' },
    { min: 60, label: '실력파' },
    { min: 40, label: '유망주' },
    { min: 20, label: '연습생' },
    { min: 0,  label: '입문' }
  ];

  var LINES = {
    sion: {
      vocal: ['…목소리가 공기에 녹는 느낌이야. 오늘은 숨을 더 깊게 써봤어.', '높은 음에서 떨림이 줄었어. 조금씩 내 소리가 보여.', '녹음실이 조용해질 때까지 같은 구절을 불러봤어.'],
      dance: ['몸으로 감정을 그리는 건 아직 어려워. 그래도 박자가 손에 잡혔어.', '거울 속의 내가 조금 덜 어색해졌어.', '선을 길게 쓰는 법을 배웠어.'],
      act:   ['대본 속 사람이 되어보는 건 신기해. 눈빛이 달라졌대.', '울지 않고 우는 장면… 어려웠지만 알 것 같아.', '말없이 서 있는 연습을 했어.'],
      fun:   ['…웃기는 건 어려워. 그래도 오늘은 한 번 웃겼어.', '즉흥 대답이 조금 빨라졌어.', '선배가 리액션은 나쁘지 않대.'],
      charm: ['카메라 앞에서 시선 두는 법을 배웠어.', '미소의 각도를 거울 앞에서 찾았어.', '무대 밖에서도 눈길이 가는 사람… 되고 싶어.']
    }
  };
  LINES.minjun = {
    vocal: ['목소리로 승부 보는 건 자신 있어. 오늘도 시원하게 질렀지!', '고음? 간단하지. 한 번 더 해볼까?', '내 노래가 공연장 끝까지 닿는 상상을 했어.'],
    dance: ['동선은 내가 먼저 잡아. 거울 앞에서 한 시간 더 했어.', '스텝이 점점 내 것이 되고 있어. 이제 눈 감고도 해.', '파워풀하게! 바닥이 울릴 정도로 밟았어.'],
    act:   ['카메라 앞에서도 당당하게. 대사가 입에 착 붙었어.', '감정 잡는 건 어렵지만, 눈빛은 자신 있어.', '연기도 결국 무대야. 장면을 장악해봤어.'],
    fun:   ['예능은 내 체질이지! 분위기 띄우는 건 맡겨둬.', '애드리브가 술술 나왔어. 스태프들이 다 웃더라.', '리액션 하나로도 화면을 차지할 수 있다는 걸 배웠어.'],
    charm: ['카메라가 나를 좋아하는 것 같아. 아니, 내가 카메라를 좋아하는 건가?', '시선 처리, 오늘은 완벽했지?', '자신감이 곧 매력이래. 그럼 나는 이미 반은 왔네.']
  };
  LINES.doyun = {
    vocal: ['호흡이 짧아서 혼났어. 내일은 꼭 한 마디 더 늘릴 거야.', '음정이 흔들렸는데 다시 잡았어. 끝까지 해냈다.', '목이 쉴 때까지 해봤어. 후회 없어.'],
    dance: ['박자 하나 놓치는 것도 용납 못 해. 백 번 해서 맞췄어.', '땀이 바닥에 뚝뚝 떨어졌지만 기분은 최고야.', '동작이 칼 같아졌대. 더 날카롭게 갈 거야.'],
    act:   ['대본을 외우고 또 외웠어. 몸이 먼저 기억하더라.', '감정 연기는 아직 어색해. 그래도 피하진 않을 거야.', '한 장면을 열 번 넘게 다시 찍었어. 이번엔 진짜였어.'],
    fun:   ['웃기는 건 약한데… 그래도 도전은 해봐야지!', '말이 꼬였지만 끝까지 밀어붙였어. 반응이 괜찮았어.', '예능도 승부야. 지지 않을 거야.'],
    charm: ['카메라 앵글이 이렇게 중요한 줄 몰랐어. 연구했지.', '표정 근육 운동까지 했어. 노력은 배신 안 해.', '눈빛 하나로 끌어당기는 법을 조금 알 것 같아.']
  };
  LINES.harin = {
    vocal: ['……앗, 목소리가 조금 커졌죠? 저도 놀랐어요.', '노래할 땐 떨리지 않아요. 이상하죠?', '선생님이 조금 더 자신 있게 불러보래요. 해볼게요.'],
    dance: ['아직 어색하지만… 어제보다는 나아졌죠?', '동작이 크면 부끄러운데, 오늘은 끝까지 해냈어요.', '음악이 시작되면 이상하게 용기가 나요.'],
    act:   ['다른 사람이 되어보는 건… 생각보다 편해요.', '눈물이 진짜로 났어요. 저도 깜짝 놀랐어요.', '대사 한 줄에도 마음을 담으라고 하셨어요.'],
    fun:   ['예능은… 아직 너무 무서워요. 그래도 한 마디는 했어요!', '웃음소리가 들렸을 때 조금 뿌듯했어요.', '말하는 게 어렵지만, 조금씩 늘고 있는 것 같아요.'],
    charm: ['카메라를 똑바로 보는 건 아직 부끄러워요.', '웃어보래서 웃었는데… 괜찮았나요?', '거울 속 제 모습이 조금 낯설지만 좋아요.']
  };
  LINES.yuna = {
    vocal: ['목소리가 맑다고 해주셔서 하루 종일 기분이 좋았어요.', '높은 음에서 살짝 흔들렸지만, 웃으면서 끝냈어요!', '노래하다 보면 시간 가는 줄 몰라요.'],
    dance: ['스텝이 꼬여서 웃음이 터졌어요. 그래도 재밌었어요!', '손끝까지 신경 쓰라고 하셨어요. 예쁘게 해볼게요.', '오늘은 한 번도 안 틀렸어요! 칭찬받았어요.'],
    act:   ['대본 속 아이가 저랑 닮은 것 같아서 마음이 갔어요.', '감정이 올라오니까 눈물이 핑 돌더라고요.', '연기하는 건 상상하는 거랑 비슷해서 좋아요.'],
    fun:   ['사람들이 웃어주면 저도 행복해져요!', '엉뚱한 대답을 했는데 다들 빵 터졌어요.', '예능은 긴장되지만 설레요.'],
    charm: ['포즈 연습을 했어요. 쑥스럽지만 사진 속 제가 마음에 들어요.', '웃는 법도 연습이 필요하더라고요.', '카메라 앞에서 제일 예쁜 저를 찾는 중이에요.']
  };
  LINES.ara = {
    vocal: ['…목소리에 마음을 얹는 거래. 조금 알 것 같아.', '노래 속 쓸쓸함이 나랑 닮았어. 그래서 오래 불렀어.', '숨을 아껴 쓰는 법을 배웠어. 여운이 길어졌대.'],
    dance: ['몸이 이야기하는 방법을 배우는 중이야.', '느리게 움직여도 아름다울 수 있다는 걸 알았어.', '음악이 멈춘 뒤의 정적까지 춤이래. 어려워.'],
    act:   ['다른 사람의 슬픔을 내 안에 들여놓는 일이었어. 무거웠지만 좋았어.', '대사 사이의 침묵이 가장 많은 말을 하더라.', '연기가 끝나고도 한참 그 사람으로 있었어.'],
    fun:   ['웃기는 건 어렵네. 그래도 웃는 사람들 얼굴은 좋더라.', '엉뚱한 말을 했는데 의외로 반응이 좋았어.', '예능은 낯선 풍경 같아. 천천히 익숙해지는 중이야.'],
    charm: ['시선이 닿는 곳마다 분위기가 달라진다는 걸 배웠어.', '조명 아래서 나를 마주 보는 일이 조금 덜 낯설어.', '말없이도 전해지는 게 있다고 하더라.']
  };
  var BIG_LINES = {
    sion: '…지금, 소리가 하늘에 닿은 것 같았어!', minjun: '봤지? 이게 내 진짜 실력이야!', doyun: '이거야! 이 느낌 절대 안 잊어!',
    harin: '앗… 방금 저 대단했던 것 같아요!', yuna: '와아! 저 방금 번개 맞은 것 같아요!', ara: '…알겠어. 지금, 뭔가 열렸어.'
  };
  // 🎓 스승·코치: 레슨 전에 고른다. 비쌀수록 많이 오르고 대성공 확률이 높다
  var BIG_BASE = 0.10, BIG_MOOD = 0.08;     // 대성공(상승 ×2) 기본 확률 / 기분 좋을 때 추가
  var TIERS = [
    { name: '신입', icon: '🧑‍🏫', cost: 1, gain: 1.0, big: 0 },
    { name: '베테랑', icon: '👩‍🏫', cost: 3, gain: 1.4, big: 0.10 },
    { name: '전설의', icon: '🧙', cost: 8, gain: 2.0, big: 0.20 }
  ];
  var COACH_SUBJ = { vocal: '보컬 코치', dance: '댄스 코치', act: '연기 코치', fun: '예능 코치', charm: '워킹 코치' };
  var COACH_LINES = [
    ['기본기부터 차근차근 가자.', '좋아, 한 번 더!', '포기하지 말고 끝까지.'],
    ['여기서 한 단계 더 올라가자. 따라와.', '포인트만 짚어줄게. 바로 달라질 거야.', '프로는 디테일이야.'],
    ['…좋은 재목이군. 내 모든 걸 가르쳐주마.', '한 번 보면 알지. 너는 더 갈 수 있어.', '이 정도 열정이라면 무대가 너를 기다린다.']
  ];
  function coachImg(t, k, px) {   // 코치 초상화 (없으면 이모지). 선택창엔 3장만, 결과창엔 1장만 불러서 가볍게
    var emo = '<span style="font-size:' + Math.round(px * 0.7) + 'px;">' + TIERS[t].icon + '</span>';
    return '<span style="display:inline-flex;align-items:center;justify-content:center;width:' + px + 'px;height:' + px + 'px;">' + emo +
      '<img src="meal-assets/coach/' + k + '-' + t + '.png" loading="lazy" decoding="async" alt="" draggable="false" style="position:absolute;width:' + px + 'px;height:' + px + 'px;object-fit:contain;" onerror="this.style.display=\'none\'" onload="var p=this.previousSibling;if(p)p.style.visibility=\'hidden\'"></span>';
  }
  function coachName(t, k) { return TIERS[t].name + ' ' + COACH_SUBJ[k]; }
  var TIRED_LINE = '…오늘은 몸이 말을 안 들어. 그래도 끝까지 해봤어.';
  var GLOW_LINE = '기분이 좋아서 그런지 오늘은 술술 들어왔어!';

  // ════════ 순수 로직 ════════
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.stat) s.stat = {};     // { cid: {vocal,dance,act,fun,charm} }
    if (!s.last) s.last = {};     // { cid: 마지막으로 레슨한 DAY }
    if (!s.count) s.count = {};   // { cid: 누적 레슨 횟수 }
    return s;
  }
  function save(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }

  function statOf(st, cid) {
    var o = st.stat[cid];
    if (!o) o = st.stat[cid] = {};
    STATS.forEach(function (m) { if (typeof o[m.k] !== 'number') o[m.k] = STAT_START; });
    return o;
  }
  function gradeOf(v) {
    for (var i = 0; i < GRADES.length; i++) if (v >= GRADES[i].min) return GRADES[i].label;
    return GRADES[GRADES.length - 1].label;
  }
  function totalOf(st, cid) {
    var o = statOf(st, cid), t = 0;
    STATS.forEach(function (m) { t += o[m.k]; });
    return t;
  }
  function doneToday(st, cid, day) { return st.last[cid] === day; }

  // 레슨 한 번의 상승량 계산 (랜덤은 rng 로 받아서 테스트 가능)
  function gainFor(cid, k, cur, cond, rng, tier) {
    tier = tier | 0; var T = TIERS[tier] || TIERS[0];
    rng = rng || Math.random;
    var g = BASE_GAIN + Math.floor(rng() * 3);                 // 3~5
    var apt = (APT[cid] && APT[cid][k]) || 1;
    var note = '';
    var mult = apt;
    if (cond.m >= MOOD_HIGH) { mult *= MOOD_HIGH_MULT; note = 'glow'; }
    else if (cond.m < MOOD_LOW) { mult *= MOOD_LOW_MULT; }
    if (cond.s < STAMINA_LOW) { mult *= STAMINA_LOW_MULT; note = 'tired'; }
    var slow = Math.max(0.15, 1 - cur / SLOW_DIV);
    var gain = Math.max(1, Math.round(g * mult * slow * T.gain));
    var big = false;
    if (cond.s >= STAMINA_LOW) {
      var chance = BIG_BASE + T.big + (cond.m >= MOOD_HIGH ? BIG_MOOD : 0);
      if (rng() < chance) { big = true; gain = gain * 2; note = 'big'; }
    }
    return { gain: gain, note: note, big: big };
  }

  // 레슨 가능 여부
  function costOf(st, cid, k, tier) {
    var mul = (TIERS[tier | 0] || TIERS[0]).cost;
    if ((st.count[cid] || 0) < FREE_LESSONS) return LESSON_COST * mul;
    var cur = statOf(st, cid)[k] || STAT_START;
    return Math.round(COST_COEF * cur * cur * mul / 100) * 100;
  }
  function manTxt(n) { return n >= 10000 ? (Math.round(n / 1000) / 10).toString().replace(/\.0$/, '') + '만' : n.toLocaleString(); }
  function canLesson(st, cid, k, day, cond, haveCoins, tier) {
    if (ENABLED.indexOf(cid) === -1) return { ok: false, why: 'locked' };
    if (!STAT_BY_K[k]) return { ok: false, why: 'invalid' };
    if (doneToday(st, cid, day)) return { ok: false, why: 'done' };
    if (cond.s < MIN_STAMINA) return { ok: false, why: 'tired' };
    if (haveCoins < costOf(st, cid, k, tier)) return { ok: false, why: 'coin' };
    return { ok: true };
  }

  // 레슨 실행: 능력치/횟수/날짜를 바꾸고 결과를 돌려준다. (컨디션 깎기·코인은 호출하는 쪽에서 함)
  function doLesson(st, cid, k, day, cond, rng, tier) {
    tier = tier | 0;
    rng = rng || Math.random;
    var o = statOf(st, cid);
    var before = o[k];
    var r = gainFor(cid, k, before, cond, rng, tier);
    o[k] = clamp(before + r.gain, 0, STAT_MAX);
    st.last[cid] = day;
    st.count[cid] = (st.count[cid] || 0) + 1;
    var pool = (LINES[cid] && LINES[cid][k]) || [];
    var line = r.big ? (BIG_LINES[cid] || '대성공!') : r.note === 'tired' ? TIRED_LINE : (r.note === 'glow' ? GLOW_LINE : (pool.length ? pool[Math.floor(rng() * pool.length)] : ''));
    return {
      k: k, before: before, after: o[k], gain: o[k] - before, note: r.note, line: line, big: r.big, tier: tier,
      coachLine: COACH_LINES[tier][Math.floor(rng() * COACH_LINES[tier].length)],
      gradeUp: gradeOf(o[k]) !== gradeOf(before) ? gradeOf(o[k]) : ''
    };
  }

  // ════════ 🎓 능력치 효과 (드라마·CF·음방·기획사 수익에 연결) ════════
  //  f(k) = ((능력치 − 10) / 90) ^ 0.6  → 처음 0, 100이면 1
  var FX = {
    actDrama: 1.00,     // 연기 100 → 드라마 촬영·일정 정산 +100% (대신 레슨비가 크게 듦)
    charmCf: 1.00,      // 매력 100 → CF 보상 +100%
    stageVD: 0.30,      // 보컬 100 → 음방·컴백 정산 +30%, 댄스 100 → 또 +30%
    incomeFun: 0.15,    // 예능 100 → 기획사 수익 +15%
    incomeCharm: 0.15   // 매력 100 → 기획사 수익 +15%
  };
  function fOf(cid, k) {
    var v = STAT_START_VAL; try { if (typeof window.getIdolTrainStat === 'function') v = Number(window.getIdolTrainStat(cid, k)); } catch (e) {}
    if (!(v >= 0)) v = STAT_START_VAL;
    var f = Math.max(0, Math.min(1, (v - STAT_START_VAL) / (STAT_MAX - STAT_START_VAL)));
    return Math.pow(f, 0.6);   // 초반에 올린 만큼 바로 체감되게 (능력치 30 → 효과 약 38%)
  }
  var STAT_START_VAL = STAT_START;
  function payMult(cid, type) {
    if (type === 'drama') return 1 + FX.actDrama * fOf(cid, 'act');
    if (type === 'music' || type === 'comeback') return 1 + FX.stageVD * (fOf(cid, 'vocal') + fOf(cid, 'dance'));
    return 1;
  }
  function incomeMult(cid) { return 1 + FX.incomeFun * fOf(cid, 'fun') + FX.incomeCharm * fOf(cid, 'charm'); }
  window.__lessonPayMult = payMult;
  window.__lessonIncomeMult = incomeMult;
  function pctTxt(x) { return '+' + Math.round(x * 100) + '%'; }
  function fxLine(cid) {
    var st = [
      ['🎭 연기', pctTxt(FX.actDrama * fOf(cid, 'act')) + ' 드라마'],
      ['✨ 매력', pctTxt(FX.charmCf * fOf(cid, 'charm')) + ' CF'],
      ['🎤💃 보컬·댄스', pctTxt(FX.stageVD * (fOf(cid, 'vocal') + fOf(cid, 'dance'))) + ' 음방·컴백'],
      ['🎪 예능·매력', pctTxt(FX.incomeFun * fOf(cid, 'fun') + FX.incomeCharm * fOf(cid, 'charm')) + ' 기획사 수익']
    ];
    return '<div style="margin-top:8px;font-size:10.5px;line-height:1.6;color:#b9c2ff;">📈 지금 효과: ' + st.map(function (r) { return r[0] + ' ' + r[1]; }).join(' · ') + '</div>';
  }
  // 드라마·CF 촬영이 끝나면 능력치만큼 코인을 더 준다
  function bonusToast(label, extra) { if (extra > 0) { try { gainCoins(extra); } catch (e) {} try { if (typeof showBagToast === 'function') showBagToast('🎓 ' + label + ' +' + extra.toLocaleString() + '코인'); } catch (e) {} } }
  function gainCoins(n) { if (typeof coins !== 'undefined') { coins += n; try { saveAll(); } catch (e) {} } }
  try {
    window.addEventListener('ph-drama-shot', function (e) {
      var d = (e && e.detail) || {}; if (!d.ch || !(d.pay > 0)) return;
      bonusToast('연기력 보너스', Math.round(d.pay * FX.actDrama * fOf(d.ch, 'act') / 10) * 10);
    });
    window.addEventListener('ph-cf-shot', function (e) {
      var d = (e && e.detail) || {}; if (!d.cid || !(d.pay > 0)) return;
      bonusToast('매력 보너스', Math.round(d.pay * FX.charmCf * fOf(d.cid, 'charm') / 10) * 10);
    });
  } catch (e) {}

  // ════════ meal.js / 게임 연결 ════════
  function M() { return window.__mealTest || null; }
  function money() { return (typeof coins !== 'undefined') ? coins : 0; }
  function spend(n) { if (n > 0 && typeof coins !== 'undefined') { coins -= n; try { saveAll(); } catch (e) {} } }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function snd(n) { try { if (window.pocaSfx) window.pocaSfx.play(n); } catch (e) {} }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;
  var lastCid = null;

  // ════════ 화면 ════════
  function currentCid(ov) {
    var m = M(); if (!m) return null;
    var img = ov.querySelector('#meal-stage [data-r="sd"]');
    if (img && img.alt) {
      for (var id in m.CH) if (Object.prototype.hasOwnProperty.call(m.CH, id) && m.CH[id].name === img.alt) return id;
    }
    if (lastCid && m.CH[lastCid]) return lastCid;
    var first = ov.querySelector('#meal-chips [data-cid]');
    return first ? first.getAttribute('data-cid') : null;
  }

  function barsHtml(st, cid, from) {
    var o = statOf(st, cid);
    return STATS.map(function (m) {
      var shown = (from && from[m.k] !== undefined) ? from[m.k] : o[m.k];
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;">' +
        '<div style="width:62px;font-size:12px;font-weight:900;color:#fff;">' + m.icon + ' ' + m.name + '</div>' +
        '<div style="flex:1;height:10px;border-radius:6px;background:rgba(255,255,255,0.12);overflow:hidden;">' +
        '<div class="ls-bar" data-final="' + o[m.k] + '" style="height:100%;width:' + shown + '%;background:' + m.color + ';border-radius:6px;transition:width .9s ease-out;"></div></div>' +
        '<div style="width:56px;text-align:right;font-size:12px;font-weight:900;color:' + m.color + ';">' + o[m.k] + ' <span style="font-size:10px;opacity:.8;">' + gradeOf(o[m.k]) + '</span></div></div>';
    }).join('');
  }

  function boxHtml(cid, from) {
    var m = M(), st = load(), name = m.CH[cid].name;
    var head = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
      '<div style="font-size:14px;font-weight:900;color:#fff;">🎓 ' + esc(name) + '의 능력치</div>';
    if (ENABLED.indexOf(cid) === -1) {
      return head + '</div><div style="font-size:12px;color:#cfd3ee;line-height:1.6;">🔒 ' + esc(name) + '의 레슨은 곧 열려요.<br>먼저 시온으로 시작해요!</div>';
    }
    var ms = m.load(), cond = m.statOf(ms, cid), day = ms.day, have = money();
    head += '<div style="font-size:11px;font-weight:900;color:#ffe08a;">합계 ' + totalOf(st, cid) + ' / ' + (STATS.length * STAT_MAX) + '</div></div>';
    var done = doneToday(st, cid, day);
    var warn = '';
    if (!done) {
      if (cond.s < MIN_STAMINA) warn = '😵 체력이 너무 낮아서 레슨을 못 해요. 식사로 체력을 채워주세요';
      else if (cond.s < STAMINA_LOW) warn = '😥 체력이 낮아서 효과가 줄어요';
      else if (cond.m >= MOOD_HIGH) warn = '😊 기분이 좋아서 효과가 올라요';
      else if (cond.m < MOOD_LOW) warn = '😔 기분이 안 좋아서 효과가 줄어요';
    }
    var lessons = STATS.map(function (s) {
      var c = canLesson(st, cid, s.k, day, cond, have);
      var apt = (APT[cid] && APT[cid][s.k]) || 1;
      var tag = apt > 1 ? '<span style="color:#7ee8a5;">잘해요</span>' : (apt < 1 ? '<span style="color:#ffb36b;">서툴러요</span>' : '');
      return '<button data-lesson="' + s.k + '" style="' + BTN + 'padding:9px 4px;background:rgba(255,255,255,0.08);border:1px solid ' + s.color + '66;color:#fff;font-size:11px;opacity:' + (c.ok ? 1 : 0.45) + ';">' +
        '<div style="font-size:20px;">' + s.icon + '</div><div>' + s.lesson + '</div>' +
        '<div style="font-size:10px;font-weight:700;min-height:13px;">' + tag + '</div>' +
        '<div style="font-size:10px;font-weight:900;color:' + (have < costOf(st, cid, s.k) ? '#ff8a8a' : '#ffe08a') + ';">🪙' + manTxt(costOf(st, cid, s.k)) + '</div></button>';
    }).join('');
    var ctrl = done
      ? '<div style="text-align:center;font-size:12px;font-weight:900;color:#7ee8a5;background:rgba(126,232,165,.1);border:1px solid rgba(126,232,165,.35);border-radius:10px;padding:9px;">✅ 오늘 레슨 완료! 🌙 하루를 보내면 다시 할 수 있어요</div>'
      : '<div style="font-size:12px;font-weight:900;color:#ddd;margin-bottom:6px;display:flex;justify-content:space-between;"><span>📚 오늘의 레슨 <span style="color:#aaa;font-weight:700;">(하루 1번)</span></span>' +
        '<span style="color:#ffe08a;">체력 −' + LESSON_TIRED + '</span></div>' +
        ((st.count[cid] || 0) < FREE_LESSONS ? '<div style="font-size:11px;color:#7ee8a5;margin-bottom:6px;">🎀 신입 할인! 앞으로 ' + (FREE_LESSONS - (st.count[cid] || 0)) + '번은 1,000코인 · 그 뒤엔 능력치가 높을수록 비싸져요</div>' : '') +
        (warn ? '<div style="font-size:11px;color:#ffcf9a;margin-bottom:6px;">' + warn + '</div>' : '') +
        '<div id="ls-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">' + lessons + '</div>';
    return head + barsHtml(st, cid, from) + fxLine(cid) + '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed rgba(255,255,255,0.15);">' + ctrl + '</div>';
  }

  function animateBars(root) {
    var bars = root.querySelectorAll('.ls-bar');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        for (var i = 0; i < bars.length; i++) bars[i].style.width = bars[i].getAttribute('data-final') + '%';
      });
    });
  }

  function drawBox(ov, from) {
    var box = ov.querySelector('#lesson-box');
    if (!box || !M()) return;
    var cid = currentCid(ov);
    if (!cid || !M().CH[cid]) { box.innerHTML = ''; return; }
    box.setAttribute('data-cid', cid);
    box.innerHTML = boxHtml(cid, from);
    animateBars(box);
    var grid = box.querySelector('#ls-grid');
    if (grid) grid.onclick = function (e) {
      var b = e.target.closest ? e.target.closest('[data-lesson]') : null;
      if (b) openCoachPick(cid, b.getAttribute('data-lesson'));
    };
  }

  function inject(ov) {
    if (!ov || !M() || ov.querySelector('#lesson-box')) return;
    var anchor = ov.querySelector('#meal-stats');
    if (!anchor) return;
    var box = document.createElement('div');
    box.id = 'lesson-box';
    box.style.cssText = 'margin-top:12px;background:rgba(183,147,255,0.10);border:1px solid rgba(183,147,255,0.35);border-radius:14px;padding:12px;' + FONT;
    anchor.insertAdjacentElement('afterend', box);
    drawBox(ov);
  }

  // ── 스승·코치 고르기 ──
  function openCoachPick(cid, k) {
    var m = M(); if (!m) return;
    var ms = m.load(), cond = m.statOf(ms, cid), st = load(), have = money(), S = STAT_BY_K[k];
    var first = canLesson(st, cid, k, ms.day, cond, 0, 0);
    if (!first.ok && first.why !== 'coin') { startLesson(cid, k, 0); return; }   // 오늘 이미 했거나 체력이 부족하면 기존 안내를 그대로 보여줌
    var old = document.getElementById('lesson-coach'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'lesson-coach';
    ov.style.cssText = 'position:fixed;inset:0;z-index:830;background:rgba(0,0,0,0.78);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    var bigNow = BIG_BASE + (cond.m >= MOOD_HIGH ? BIG_MOOD : 0);
    var rows = TIERS.map(function (T, i) {
      var cost = costOf(st, cid, k, i), ok = have >= cost;
      var bg = cond.s >= STAMINA_LOW ? Math.round((bigNow + T.big) * 100) + '%' : '체력 낮아서 불가';
      return '<button data-tier="' + i + '" style="' + BTN + 'width:100%;display:flex;align-items:center;gap:10px;text-align:left;padding:11px 12px;margin-bottom:8px;background:rgba(255,255,255,0.08);border:1.5px solid ' + (ok ? S.color : '#ffffff22') + ';color:#fff;opacity:' + (ok ? 1 : 0.5) + ';">' +
        '<span style="position:relative;display:inline-block;width:54px;height:54px;flex:none;">' + coachImg(i, k, 54) + '</span><span style="flex:1;"><span style="font-size:13px;">' + esc(coachName(i, k)) + '</span><br>' +
        '<span style="font-size:11px;color:#c9d0f5;font-weight:700;">성장 ×' + T.gain + ' · 🌟대성공 ' + bg + '</span></span>' +
        '<span style="font-size:12px;color:' + (ok ? '#ffe08a' : '#ff8a8a') + ';">🪙' + manTxt(cost) + '</span></button>';
    }).join('');
    ov.innerHTML = '<div style="width:100%;max-width:340px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid ' + S.color + ';border-radius:20px;padding:16px;">' +
      '<div style="text-align:center;font-size:14px;font-weight:900;color:#fff;margin-bottom:2px;">' + S.icon + ' ' + S.lesson + ' · 누구에게 배울까요?</div>' +
      '<div style="text-align:center;font-size:11px;color:#aab4d6;margin-bottom:10px;">비싼 코치일수록 많이 오르고, 🌟대성공(상승 ×2)이 잘 터져요</div>' + rows +
      '<button id="lc-x" style="' + BTN + 'width:100%;padding:10px;background:rgba(255,255,255,0.1);color:#ccc;font-size:12px;">닫기</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#lc-x').onclick = function () { ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-tier]'), function (b) {
      b.onclick = function () { var t = Number(b.getAttribute('data-tier')); ov.remove(); startLesson(cid, k, t); };
    });
  }

  function startLesson(cid, k, tier) {
    tier = tier | 0;
    var m = M(); if (!m) return;
    var ms = m.load(), cond = m.statOf(ms, cid), st = load();
    var c = canLesson(st, cid, k, ms.day, cond, money(), tier);
    if (!c.ok) {
      toast(c.why === 'done' ? '오늘 레슨은 이미 했어요' : c.why === 'tired' ? '😵 체력이 너무 낮아요. 식사로 채워주세요' : c.why === 'coin' ? '코인이 모자라요' : '아직 열리지 않았어요');
      return;
    }
    spend(costOf(st, cid, k, tier));
    var res = doLesson(st, cid, k, ms.day, cond, undefined, tier);
    save(st);
    cond.s = clamp(cond.s - LESSON_TIRED, 0, 100);
    cond.m = clamp(cond.m - LESSON_MOOD, 0, 100);
    m.save(ms);
    snd(res.big ? 'reward' : 'stamp');
    showResult(cid, res);
    var ov = document.getElementById('meal-overlay');
    if (ov) {
      var from = {}; from[k] = res.before;
      try { if (window.__mealRefresh) window.__mealRefresh(); } catch (e) {}
      drawBox(ov, from);
    }
  }

  function showResult(cid, res) {
    var old = document.getElementById('lesson-result'); if (old) old.remove();
    var m = M(), name = m.CH[cid].name, s = STAT_BY_K[res.k];
    var ov = document.createElement('div');
    ov.id = 'lesson-result';
    ov.style.cssText = 'position:fixed;inset:0;z-index:820;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    if (!document.getElementById('ls-fx-style')) {
      var sty = document.createElement('style'); sty.id = 'ls-fx-style';
      sty.textContent = '@keyframes lsPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}@keyframes lsGlow{0%,100%{box-shadow:0 0 18px rgba(255,215,0,.45)}50%{box-shadow:0 0 38px rgba(255,215,0,.95)}}@keyframes lsSpark{0%{transform:translateY(0);opacity:1}100%{transform:translateY(-34px);opacity:0}}';
      document.head.appendChild(sty);
    }
    var T = TIERS[res.tier | 0] || TIERS[0];
    var bigBanner = res.big ? '<div style="font-size:20px;font-weight:900;color:#ffd700;text-shadow:0 0 12px rgba(255,215,0,.8);margin-bottom:4px;">🌟 대성공! 🌟</div>' +
      '<div style="font-size:11px;font-weight:900;color:#ffe9a8;margin-bottom:4px;">오늘은 감이 왔어요 · 상승 ×2</div>' : '';
    var sparks = res.big ? '<div style="position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:20px;">' + [12, 28, 46, 64, 80].map(function (x, i) { return '<span style="position:absolute;left:' + x + '%;top:' + (30 + (i % 3) * 18) + '%;font-size:18px;animation:lsSpark 1.4s ease-out ' + (i * 0.18) + 's infinite;">✨</span>'; }).join('') + '</div>' : '';
    ov.innerHTML = '<div style="position:relative;width:100%;max-width:340px;background:linear-gradient(160deg,#1b1330,#2a1745);border:1.5px solid ' + (res.big ? '#ffd700' : s.color) + ';border-radius:20px;padding:18px;text-align:center;animation:' + (res.big ? 'lsPop .45s ease-out,lsGlow 1.6s ease-in-out infinite' : 'lsPop .3s ease-out') + ';">' + sparks + bigBanner +
      '<div style="font-size:13px;font-weight:900;color:#cfd3ee;">' + esc(name) + ' · ' + s.lesson + '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;justify-content:center;margin-top:6px;text-align:left;"><span style="position:relative;display:inline-block;width:56px;height:56px;flex:none;">' + coachImg(res.tier | 0, res.k, 56) + '</span><span style="font-size:11px;color:#c9d0f5;line-height:1.45;"><b>' + esc(coachName(res.tier | 0, res.k)) + '</b><br>“' + esc(res.coachLine || '') + '”</span></div>' +
      '<div style="font-size:44px;margin:8px 0 2px;">' + s.icon + '</div>' +
      '<div style="font-size:22px;font-weight:900;color:' + s.color + ';">' + s.name + ' +' + res.gain + '</div>' +
      '<div style="font-size:12px;color:#aab4d6;margin-top:2px;">' + res.before + ' → <b style="color:#fff;">' + res.after + '</b></div>' +
      (res.gradeUp ? '<div style="margin-top:8px;font-size:13px;font-weight:900;color:#ffd700;">🎉 ' + s.name + ' 등급 상승! [' + res.gradeUp + ']</div>' : '') +
      '<div style="margin:12px 0 4px;background:#fff;color:#2a2438;border-radius:14px;padding:9px 12px;font-size:12px;font-weight:700;line-height:1.5;">“' + esc(res.line) + '”</div>' +
      '<div style="font-size:11px;color:#9aa0c8;margin-top:8px;">체력 −' + LESSON_TIRED + ' · 기분 −' + LESSON_MOOD + '</div>' +
      '<button id="lesson-ok" style="' + BTN + 'width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#b793ff,#7c5cff);color:#fff;font-size:14px;">확인</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#lesson-ok').onclick = function () {
      ov.remove();
      showEvent(cid, res, function () {
        var mo = document.getElementById('meal-overlay');
        if (mo) { try { if (window.__mealRefresh) window.__mealRefresh(); } catch (e) {} drawBox(mo); }
      });
    };
  }

  // ════════ 💬 돌발 이벤트 (레슨 뒤 가끔 터지는 선택 사건) ════════
  //  fx: stat(레슨한 능력치 ±) · mood · stamina · coin(이번 레슨비 기준 배수, 음수면 잃음)
  var EVENT_CHANCE = 0.25;       // 레슨 뒤 사건이 터질 확률
  var EVENTS = [
    { id: 'senior', title: '연습실에서 만난 선배', text: '{n}이(가) 연습실에서 선배를 마주쳤어요. “내가 한마디 해줄까?”',
      choices: [
        { label: '조언을 듣는다', hint: '안전 · {s} +2', out: [{ p: 1, text: '선배의 한마디가 큰 도움이 됐어요!', fx: { stat: 2 } }] },
        { label: '혼자 해본다', hint: '도박 · {s} +4 또는 기분↓', out: [{ p: 0.5, text: '혼자 깨달은 게 있어요! 감이 확 왔어요.', fx: { stat: 4 } }, { p: 0.5, text: '혼자 끙끙대다 기운이 빠졌어요.', fx: { mood: -6 } }] }
      ] },
    { id: 'slump', title: '갑작스러운 슬럼프', min: 30, text: '{n}이(가) 갑자기 {s}이 안 된다며 얼굴이 굳었어요.',
      choices: [
        { label: '잠깐 쉬게 한다', hint: '안전 · 기분 +8 · 체력 +10', out: [{ p: 1, text: '푹 쉬고 나니 한결 나아졌어요.', fx: { mood: 8, stamina: 10 } }] },
        { label: '밀어붙인다', hint: '도박 · {s} +3 또는 체력·기분↓', out: [{ p: 0.6, text: '슬럼프를 뚫었어요! 한 단계 성장했어요.', fx: { stat: 3 } }, { p: 0.4, text: '무리해서 몸이 지쳐버렸어요…', fx: { stamina: -15, mood: -8 } }] }
      ] },
    { id: 'audition', title: '작은 오디션 제안', min: 20, text: '{n}에게 작은 오디션 제안이 들어왔어요. 도전해볼까요?',
      choices: [
        { label: '도전한다', hint: '도박 · 합격하면 코인 · 떨어지면 기분↓', out: [{ p: 0.5, text: '합격! 출연료를 받았어요 🎉', fx: { coin: 1.5, mood: 10 } }, { p: 0.5, text: '아쉽게 떨어졌어요. 하지만 경험이 됐어요.', fx: { mood: -6, stat: 1 } }] },
        { label: '이번엔 거절', hint: '안전 · 아무 일 없음', out: [{ p: 1, text: '다음 기회를 기다리기로 했어요.', fx: {} }] }
      ] },
    { id: 'letter', title: '팬이 보낸 편지', text: '{n}에게 팬이 정성껏 쓴 편지가 도착했어요.',
      choices: [
        { label: '함께 읽는다', hint: '기분 +10', out: [{ p: 1, text: '따뜻한 말에 힘이 났어요!', fx: { mood: 10 } }] },
        { label: '연습에 몰두한다', hint: '{s} +1 · 기분 +3', out: [{ p: 1, text: '편지를 가슴에 품고 더 열심히 했어요.', fx: { stat: 1, mood: 3 } }] }
      ] },
    { id: 'homework', title: '코치님의 특별 과제', text: '코치님이 {n}에게 특별 과제를 내줬어요. “어려운 걸로 할래, 쉬운 걸로 할래?”',
      choices: [
        { label: '어려운 과제', hint: '도박 · {s} +4 또는 체력↓', out: [{ p: 0.6, text: '해냈어요! 코치님도 깜짝 놀랐어요.', fx: { stat: 4 } }, { p: 0.4, text: '너무 어려워서 지쳐버렸어요.', fx: { stamina: -10 } }] },
        { label: '쉬운 과제', hint: '안전 · {s} +2', out: [{ p: 1, text: '차근차근 해냈어요.', fx: { stat: 2 } }] }
      ] },
    { id: 'blackout', title: '연습실 정전!', text: '레슨 도중 연습실 불이 꺼졌어요!',
      choices: [
        { label: '어둠 속에서 계속한다', hint: '도박 · {s} +3 또는 기분↓', out: [{ p: 0.55, text: '감각만으로 연습했더니 새로운 느낌을 얻었어요!', fx: { stat: 3 } }, { p: 0.45, text: '아무것도 안 보여서 기분만 상했어요.', fx: { mood: -4 } }] },
        { label: '촛불을 켜고 쉰다', hint: '안전 · 기분 +6', out: [{ p: 1, text: '촛불 아래서 도란도란 이야기를 나눴어요.', fx: { mood: 6 } }] }
      ] },
    { id: 'rival', title: '라이벌의 등장', min: 40, text: '라이벌 아이돌이 연습실에 나타났어요. “한번 붙어볼래?”',
      choices: [
        { label: '정면 승부', hint: '도박 · {s} +5 또는 기분↓↓', out: [{ p: 0.5, text: '승부에서 이겼어요! 자신감이 폭발했어요.', fx: { stat: 5, mood: 6 } }, { p: 0.5, text: '아쉽게 졌어요. 분한 마음이 커요.', fx: { mood: -10 } }] },
        { label: '무시한다', hint: '안전 · 기분 변화 없음', out: [{ p: 1, text: '{n}은(는) 자기 페이스를 지켰어요.', fx: { stat: 1 } }] }
      ] },
    { id: 'snack', title: '코치님의 간식', text: '코치님이 {n}에게 몰래 간식을 건넸어요.',
      choices: [
        { label: '고맙게 받는다', hint: '기분 +6 · 체력 +6', out: [{ p: 1, text: '달콤한 간식에 기운이 났어요!', fx: { mood: 6, stamina: 6 } }] },
        { label: '정중히 사양한다', hint: '{s} +1', out: [{ p: 1, text: '관리를 위해 참았어요. 의지가 단단해졌어요.', fx: { stat: 1 } }] }
      ] }
  ];
  // 능력치 30·60·90을 처음 넘으면 반드시 터지는 '한계 돌파' 사건
  var BREAK_MARKS = [30, 60, 90];
  var BREAK_EVENT = { id: 'break', title: '한계 돌파의 순간', text: '{n}의 {s} 실력이 새로운 경지에 다다랐어요! 지금이 한 단계 더 올라설 기회예요.',
    choices: [
      { label: '차분히 다진다', hint: '안전 · {s} +2 · 기분 +5', out: [{ p: 1, text: '기본기를 단단히 다졌어요.', fx: { stat: 2, mood: 5 } }] },
      { label: '한계에 도전한다', hint: '도박 · {s} +6 또는 체력↓', out: [{ p: 0.55, text: '한계를 넘었어요! 눈빛이 달라졌어요.', fx: { stat: 6, mood: 8 } }, { p: 0.45, text: '욕심이 앞서 몸이 상했어요…', fx: { stamina: -15, mood: -5 } }] }
    ] };
  function pickEvent(res, rng) {
    rng = rng || Math.random;
    var crossed = BREAK_MARKS.some(function (mk) { return res.before < mk && res.after >= mk; });
    if (crossed) return BREAK_EVENT;
    if (rng() >= EVENT_CHANCE) return null;
    var pool = EVENTS.filter(function (e) { return !e.min || res.after >= e.min; });
    return pool[Math.floor(rng() * pool.length)];
  }
  function rollOutcome(choice, rng) {
    rng = rng || Math.random;
    var r = rng(), acc = 0;
    for (var i = 0; i < choice.out.length; i++) { acc += choice.out[i].p; if (r < acc) return choice.out[i]; }
    return choice.out[choice.out.length - 1];
  }
  // 효과 적용 (코인은 호출하는 쪽에서 처리하도록 coin 배수를 그대로 돌려줌)
  function applyEventFx(st, cond, cid, k, fx) {
    var o = statOf(st, cid), changes = [];
    if (fx.stat) { var b = o[k]; o[k] = clamp(b + fx.stat, 0, STAT_MAX); if (o[k] !== b) changes.push(STAT_BY_K[k].name + ' ' + (o[k] > b ? '+' : '') + (o[k] - b)); }
    if (fx.mood) { var bm = cond.m; cond.m = clamp(cond.m + fx.mood, 0, 100); if (cond.m !== bm) changes.push('기분 ' + (cond.m > bm ? '+' : '') + (cond.m - bm)); }
    if (fx.stamina) { var bs = cond.s; cond.s = clamp(cond.s + fx.stamina, 0, 100); if (cond.s !== bs) changes.push('체력 ' + (cond.s > bs ? '+' : '') + (cond.s - bs)); }
    return changes;
  }
  function fillTxt(t, name, k) { return String(t).replace(/\{n\}/g, name).replace(/\{s\}/g, STAT_BY_K[k].name); }

  function showEvent(cid, res, done) {
    var old = document.getElementById('lesson-event'); if (old) old.remove();
    var m = M(); if (!m) { done(); return; }
    var ev = pickEvent(res); if (!ev) { done(); return; }
    var name = m.CH[cid].name, k = res.k;
    var ov = document.createElement('div');
    ov.id = 'lesson-event';
    ov.style.cssText = 'position:fixed;inset:0;z-index:835;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    function close() { ov.remove(); done(); }
    function drawAsk() {
      ov.innerHTML = '<div style="width:100%;max-width:340px;background:linear-gradient(160deg,#1b1330,#2d1b4e);border:1.5px solid ' + (ev.id === 'break' ? '#ffd700' : '#b793ff') + ';border-radius:20px;padding:18px;animation:lsPop .35s ease-out;">' +
        '<div style="text-align:center;font-size:12px;font-weight:900;color:' + (ev.id === 'break' ? '#ffd700' : '#c9b6ff') + ';">' + (ev.id === 'break' ? '🌟' : '💬') + ' 돌발 상황!</div>' +
        '<div style="text-align:center;font-size:16px;font-weight:900;color:#fff;margin:4px 0 8px;">' + esc(ev.title) + '</div>' +
        '<div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:11px;font-size:12.5px;color:#e8eaff;line-height:1.6;margin-bottom:12px;">' + esc(fillTxt(ev.text, name, k)) + '</div>' +
        ev.choices.map(function (c, i) {
          return '<button data-ci="' + i + '" style="' + BTN + 'width:100%;text-align:left;padding:11px 12px;margin-bottom:8px;background:rgba(255,255,255,0.09);border:1.5px solid #b793ff88;color:#fff;font-size:13px;">' + esc(c.label) +
            '<br><span style="font-size:11px;color:#ffe08a;font-weight:700;">' + esc(fillTxt(c.hint, name, k)) + '</span></button>';
        }).join('') + '</div>';
      Array.prototype.forEach.call(ov.querySelectorAll('[data-ci]'), function (b) {
        b.onclick = function () { resolve(Number(b.getAttribute('data-ci'))); };
      });
    }
    function resolve(ci) {
      var ms = m.load(), cond = m.statOf(ms, cid), st = load();
      var out = rollOutcome(ev.choices[ci]);
      var changes = applyEventFx(st, cond, cid, k, out.fx || {});
      if (out.fx && out.fx.coin) {
        var amt = Math.round(costOf(st, cid, k, 0) * out.fx.coin / 100) * 100;
        if (amt > 0) { gainCoins(amt); changes.push('코인 +' + amt.toLocaleString()); }
      }
      save(st); m.save(ms);
      var good = !/(지쳐|상했|떨어|졌|빠졌|상한)/.test(out.text);
      ov.innerHTML = '<div style="width:100%;max-width:340px;background:linear-gradient(160deg,#1b1330,#2d1b4e);border:1.5px solid ' + (good ? '#7ee8a5' : '#ff9d9d') + ';border-radius:20px;padding:18px;text-align:center;animation:lsPop .3s ease-out;">' +
        '<div style="font-size:34px;">' + (good ? '✨' : '💦') + '</div>' +
        '<div style="font-size:14px;font-weight:900;color:#fff;margin:6px 0;line-height:1.5;">' + esc(fillTxt(out.text, name, k)) + '</div>' +
        (changes.length ? '<div style="font-size:12px;font-weight:900;color:' + (good ? '#7ee8a5' : '#ffb3b3') + ';margin-bottom:10px;">' + esc(changes.join(' · ')) + '</div>' : '') +
        '<button id="le-ok" style="' + BTN + 'width:100%;padding:12px;background:linear-gradient(135deg,#b793ff,#7c5cff);color:#fff;font-size:14px;">확인</button></div>';
      ov.querySelector('#le-ok').onclick = close;
    }
    document.body.appendChild(ov); drawAsk();
  }

  // ════════ meal 화면에 붙이기 ════════
  function watch() {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) return;
    var watched = null;
    function attach(ov) {
      if (watched === ov) return;
      watched = ov;
      inject(ov);
      new MutationObserver(function () { inject(ov); }).observe(ov, { childList: true });   // render() 로 화면이 다시 그려지면 다시 붙임
    }
    var first = document.getElementById('meal-overlay');
    if (first) attach(first);
    new MutationObserver(function () {
      var ov = document.getElementById('meal-overlay');
      if (ov) attach(ov); else watched = null;
    }).observe(document.body, { childList: true });
    document.addEventListener('click', function (e) {          // 아이돌 칩 선택을 기억해 둠 (그림이 없을 때 대비)
      var b = e.target && e.target.closest ? e.target.closest('#meal-overlay [data-cid]') : null;
      if (b) lastCid = b.getAttribute('data-cid');
    }, true);
  }
  watch();

  // 다른 기능(2단계: 드라마·CF·기획사 연결)이 읽어갈 수 있게 열어둔다
  window.getIdolTrainStat = function (cid, k) { var o = statOf(load(), cid); return k ? o[k] : Object.assign({}, o); };
  window.__lessonTest = {
    STATS: STATS, CFG: { LESSON_COST: LESSON_COST, FREE_LESSONS: FREE_LESSONS, COST_COEF: COST_COEF, LESSON_TIRED: LESSON_TIRED, LESSON_MOOD: LESSON_MOOD, MIN_STAMINA: MIN_STAMINA, ENABLED: ENABLED },
    load: load, save: save, statOf: statOf, gradeOf: gradeOf, totalOf: totalOf, gainFor: gainFor, canLesson: canLesson, costOf: costOf, openCoachPick: openCoachPick, EVENTS: EVENTS, BREAK_EVENT: BREAK_EVENT, pickEvent: pickEvent, rollOutcome: rollOutcome, applyEventFx: applyEventFx, showEvent: showEvent, showResult: showResult, startLesson: startLesson, doLesson: doLesson, doneToday: doneToday
  };
})();
