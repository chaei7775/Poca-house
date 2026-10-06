// ════════════════════════════════════════════════════════════
// 📚 연대기 퀘스트 (story-quest.js) — game.js / index.html / 다른 퀘스트 파일은 건드리지 않음
// · 퀘스트 탭 맨 아래에 "📚 연대기 퀘스트" 섹션이 생긴다 (pocalevel.js 의 기존 "스토리 퀘스트"와 별개). (6개 챕터 + 아이돌 6명의 인연 이야기)
// · 퀘스트는 한 번에 하나씩 열린다. 달성하면 자동 완료 → 코인/경험치 → 이야기 팝업이 뜬다.
// · 지난 이야기는 퀘스트 탭에서 언제든 다시 볼 수 있다.
// · 식사/달력(meal.js) 기록은 'ph_meal' 을 지켜보면서 자동으로 센다 (meal.js 수정 필요 없음).
// 등록: loader.js NEW_CONTENT_FILES 맨 끝(meal.js 뒤)에 'story-quest.js' 한 줄 추가
//
// ✏️ 고치는 법
//   - 이야기 대사 → 아래 CHAPTERS / IDOLS 안의 글자만 바꾸면 됨
//   - 보상 → 각 퀘스트의 coins(코인) / exp(경험치) 숫자
//   - 대사 쓰는 법: 'n:내레이션' · 'p:내 대사' · 'i:그 퀘스트 아이돌 대사' · 'x:sion:다른 아이돌 대사'
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var KEY = 'ph_chronicle';   // ⚠ 'ph_story' 는 game.js 가 아이돌 이야기 읽음 기록으로 이미 쓰는 이름이라 겹치면 안 됨
  var NAMES = { minjun: '민준', sion: '시온', doyun: '도윤', harin: '하린', yuna: '윤아', ara: '아라' };
  var ORDER = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];

  // ───────── 저장/읽기 도우미 ─────────
  function J(key, def) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return (v === null || v === undefined) ? def : v; } catch (e) { return def; }
  }
  function keys(o) { try { return Object.keys(o || {}); } catch (e) { return []; } }
  function load() {
    var s = J(KEY, {}) || {};
    if (!s.cnt) s.cnt = {};
    var c = s.cnt;
    c.days = c.days || 0; c.meals = c.meals || 0; c.rests = c.rests || 0;
    c.events = c.events || {}; c.booked = c.booked || {}; c.byChar = c.byChar || {};
    if (!s.flags) s.flags = {};
    return s;
  }
  // 예전 버전이 'ph_story' 안에 섞어 저장했던 기록은 새 이름으로 옮김 (game.js 기록은 건드리지 않음)
  (function migrate() {
    try {
      if (localStorage.getItem(KEY)) return;
      var old = J('ph_story', null);
      if (old && (old.cnt || old.flags || old.snap)) {
        var m = {}; ['cnt', 'flags', 'snap'].forEach(function (k) { if (old[k]) m[k] = old[k]; });
        localStorage.setItem(KEY, JSON.stringify(m));
      }
    } catch (e) {}
  })();
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  function flag(n) { if (!S.flags[n]) { S.flags[n] = 1; save(); } }

  // ───────── 진행 상황 읽기 ─────────
  function qdone(id) { try { return typeof questProgress !== 'undefined' && questProgress[id] === 'done'; } catch (e) { return false; } }
  function plv() { try { return typeof playerLevel !== 'undefined' ? playerLevel : 1; } catch (e) { return 1; } }
  function ownedN() { try { return typeof owned !== 'undefined' ? owned.length : 0; } catch (e) { return 0; } }
  function albaN() { try { return typeof albaDone !== 'undefined' ? albaDone : 0; } catch (e) { return 0; } }
  function debutMap() { return (J('ph_agency', {}) || {}).done || {}; }
  function debutN() { var d = debutMap(); return keys(d).filter(function (k) { return d[k]; }).length; }
  function fanN() {
    var idols = (J('ph_fancafe', {}) || {}).idols || {}, n = 0;
    keys(idols).forEach(function (k) { n += keys(idols[k] && idols[k].fans).length; });
    return n;
  }
  function gate(id) {   // 인연 단계 (친절1=1 … 친절5=5, 우호1=6 … 신뢰1=11 … 인연5=20)
    try { return typeof getAffectionGateLevel === 'function' ? getAffectionGateLevel(id) : 0; } catch (e) { return 0; }
  }
  function dramaN() { return (J('ph_drama', {}) || {}).shoots || 0; }
  function fameOf(id) { var d = J('ph_drama', {}) || {}; return (d.star && d.star[id]) ? 100 : ((d.fame && d.fame[id]) || 0); }
  function maxEnh() {
    var l = (J('ph_enhance', {}) || {}).level || {}, m = 0;
    keys(l).forEach(function (k) { if (l[k] > m) m = l[k]; });
    return m;
  }
  function anyTrans() {
    var st = (J('ph_enhance', {}) || {}).stage || {};
    return keys(st).some(function (k) { return st[k] > 0; });
  }
  function allSixCondition(min) {
    var m = J('ph_meal', null); if (!m || !m.stat) return false;
    return ORDER.every(function (id) { var t = m.stat[id]; return t && t.v >= min && t.s >= min && t.m >= min; });
  }
  var cnt = function () { return S.cnt; };
  function q2(n) { return !!(J('ph_quest2', {}) || {})[n]; }                       // quest-extra.js 가 남긴 '해봤음' 기록
  function anyGate(min) { return ORDER.some(function (id) { return gate(id) >= min; }); }
  function anyAffExp() { var a = J('ph_affectionExp', {}) || {}; return keys(a).some(function (k) { return a[k] > 0; }); }
  function storyReadAny() { var r = J('ph_story', {}) || {}; return keys(r).some(function (k) { return /_\d+$/.test(k) && r[k] === true; }); }
  function bagHas(name) { try { return typeof bagItems !== 'undefined' && bagItems.some(function (i) { return i && i.name === name; }); } catch (e) { return false; } }
  function wishN() { try { return typeof wishFragments !== 'undefined' ? wishFragments : 0; } catch (e) { return 0; } }
  function recombined() { return parseInt(localStorage.getItem('ph_rc_pity') || '0') > 0 || (J('ph_hiddenCards', []) || []).length > 0; }
  // 낚시를 해봤는지: 낚시 화면이 열린 적이 있거나, 가방에 낚시로 잡은 물고기가 있음
  function fishInBag() {
    try { return typeof bagItems !== 'undefined' && bagItems.some(function (i) { return i && i.desc && String(i.desc).indexOf('낚시로 잡은 물고기') !== -1; }); } catch (e) { return false; }
  }
  // fishing.js 는 호수 입구에서 window.startFishing 을 거치지 않고 안쪽 함수를 바로 불러서,
  // 기존 "호수에서 낚시" 튜토리얼이 완료 안 되는 문제가 있음 → 낚시 화면이 뜨면 우리가 직접 알려줌
  (function watchExplore(tries) {
    if (typeof window.checkQuestProgress !== 'function') { if (tries < 100) setTimeout(function () { watchExplore(tries + 1); }, 100); return; }
    var orig = window.checkQuestProgress;
    if (orig.__storyWatch) return;
    var w3 = function (c) { try { if (c === 'first_explore') flag('explored'); } catch (e) {} return orig.apply(this, arguments); };
    w3.__storyWatch = true;
    window.checkQuestProgress = w3;
  })(0);
  // 드링크: 가방의 1개/5개/10개/가득 버튼(drink-bulk.js)은 기존 드링크 퀘스트 감지를 거치지 않아서,
  // "스태미나 +N" 알림이 뜨면 우리가 직접 알려줌
  (function watchDrink(tries) {
    if (typeof window.showBagToast !== 'function') { if (tries < 100) setTimeout(function () { watchDrink(tries + 1); }, 100); return; }
    var orig = window.showBagToast;
    if (orig.__storyDrink) return;
    var w2 = function (msg) {
      try {
        if (typeof msg === 'string' && msg.indexOf('사용!') !== -1 && msg.indexOf('스태미나 +') !== -1) {
          flag('drank');
          if (typeof checkQuestProgress === 'function') checkQuestProgress('q2_drink');
        }
      } catch (e) {}
      return orig.apply(this, arguments);
    };
    w2.__storyDrink = true;
    window.showBagToast = w2;
  })(0);
  (function watchFishing() {
    if (!document.body) { setTimeout(watchFishing, 100); return; }
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var added = list[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n && n.nodeType === 1 && n.id === 'fishing-overlay') {
            flag('fished');
            try { if (typeof checkQuestProgress === 'function') { checkQuestProgress('q2_fishing'); checkQuestProgress('first_explore'); } } catch (e) {}
            return;
          }
        }
      }
    }).observe(document.body, { childList: true });
  })();
  function eventsTotal() { var e = S.cnt.events; return (e.drama || 0) + (e.comeback || 0); }
  function bookedTotal() { var b = S.cnt.booked; return (b.drama || 0) + (b.comeback || 0) + (b.rest || 0); }

  // ════════════════════════════════════════════════════════════
  // 📚 이야기 데이터
  //  q(id, 제목, 목표(힌트), 코인, 경험치, 달성조건, [대사들])
  // ════════════════════════════════════════════════════════════
  function q(id, title, hint, coins, exp, detect, lines, who) {
    return { id: id, title: title, hint: hint, coins: coins, exp: exp, detect: detect, lines: lines, who: who || '' };
  }

  var CHAPTERS = [
    // ───────────────── 1장 ─────────────────
    { id: 'c1', title: '1장 · 카드 속에서 온 아이', emoji: '🌱',
      intro: '코인 한 닢 없이 도착한 마을. 그곳엔 이상한 가게와 이상한 카드가 있었다.',
      quests: [
        q('s1_1', '일단 살아야지', '🍔 포카버거에서 알바를 해보자. (튜토리얼 "일단 살아야지")', 100, 20,
          function () { return qdone('tut_alba') || albaN() >= 1; },
          ['n:주머니를 뒤집어 봐도 먼지뿐이었다. 마을에 도착한 첫날, 나는 정말로 빈털터리였다.',
           'n:포카버거 사장님이 나를 위아래로 훑어보더니 앞치마를 던져줬다.',
           'x:minjun:(멀리서 지켜보다 작게) …저 아이, 어딘가 낯이 익은데.',
           'n:첫 알바비로 받은 동전 몇 개. 이상하게 따뜻했다.']),
        q('s1_2', '저 가게가 궁금해', '🎴 포카 가게에서 카드를 뽑아보자.', 100, 20,
          function () { return qdone('tut_gacha') || ownedN() >= 1; },
          ['n:골목 끝, 유리창 너머로 카드가 반짝이는 가게가 보였다.',
           'n:카드를 한 장 뽑자 종이가 아니라 마치 창문처럼 느껴졌다. 그 안에서 누군가 이쪽을 보고 있었다.',
           'n:카드 속 눈동자가 아주 잠깐, 깜빡였다.']),
        q('s1_3', '카드가 말을 걸었어', '💞 인연 화면에서 카드 속 아이돌을 만나보자.', 150, 30,
          function () { return qdone('tut_meet'); },
          ['i:…네가 나를 뽑은 거야?',
           'p:카드가… 말을 해?',
           'i:나도 잘 몰라. 눈을 떴더니 여기였고, 내가 누군지도 반쯤은 흐릿해.',
           'i:근데 이상하지. 너를 보면 뭔가 떠오를 것 같아.'], 'minjun'),
        q('s1_4', '카드 다섯 장', '🎴 카드를 5장 모아보자.', 150, 30,
          function () { return ownedN() >= 5; },
          ['n:카드가 늘어날수록 방 안이 시끌시끌해졌다.',
           'n:표정은 다 달랐지만 공통점이 하나 있었다. 모두 뭔가를 잊은 사람처럼 먼 곳을 보고 있다는 것.']),
        q('s1_5', '선물로 마음 얻기', '🎁 인연 → 선물하기로 선물을 줘보자.', 200, 30,
          function () { return qdone('tut_gift') || q2('gift') || anyAffExp(); },
          ['n:서툴게 내민 선물을 아이돌은 한참 바라보다 두 손으로 받았다.',
           'i:…누가 나한테 뭘 준 건 처음인 것 같아. 아니, 처음이 아닌가?',
           'i:기억이 안 나는데도 기분은 좋아. 이상하지?'], 'yuna'),
        q('s1_6', '재료를 찾아서', '🚐 스케줄 가기로 촬영 세트장·뷰티 살롱·공원에서 재료를 모아보자.', 200, 30,
          function () { return qdone('tut_explore') || q2('explore') || !!S.flags.fished || !!S.flags.explored; },
          ['n:숲속에서 반짝이는 가루를 발견했다. 별가루 같았다.',
           'n:가방에 담자 카드 속 아이돌들이 일제히 같은 쪽을 쳐다봤다. 마치 무언가를 알아본 것처럼.']),
        q('s1_7', '호수의 물고기', '🎣 워크숍 캠프 호숫가에서 낚시를 해보자.', 200, 30,
          function () { return qdone('tut_fishing') || !!S.flags.fished || fishInBag(); },
          ['n:호수는 거울처럼 조용했다. 낚싯줄을 던지자 수면에 별 모양 파문이 번졌다.',
           'n:이 마을의 물과 하늘은 어딘가 서로 이어져 있는 것 같다.']),
        q('s1_8', '배고프면 못 움직여', '🥤 가방의 드링크로 스태미나를 채워보자.', 150, 20,
          function () { return qdone('tut_drink') || !!S.flags.drank || !!(J('ph_quest2', {}) || {}).drink; },
          ['n:마을을 뛰어다니다 보니 다리가 풀렸다. 드링크 한 모금에 다시 힘이 났다.',
           'n:아이돌들도 똑같구나. 힘들면 쉬고, 배고프면 먹어야 하는 사람들.']),
        q('s1_9', '포카를 모아봐', '🎴 카드를 10장 모아보자.', 300, 50,
          function () { return qdone('main_cards'); },
          ['n:열 장째 카드를 내려놓았을 때, 카드들이 동시에 희미하게 빛났다.',
           'x:sion:…뭐야, 이 느낌. 누가 우리를 부르는 소리 같았는데.',
           'x:ara:착각이겠지. …그래도 신경 쓰이네.']),
        q('s1_10', '처음 듣는 이야기', '📖 인연 화면에서 아이돌의 이야기를 처음으로 들어보자.', 400, 60,
          function () { return qdone('main_story') || storyReadAny(); },
          ['i:있잖아. 나한테는 "별의 기록"이라는 말이 계속 맴돌아.',
           'i:뭔지는 몰라. 하지만 잃어버린 진실의 조각이 거기 있는 것 같아.',
           'p:같이 찾아볼게요.',
           'i:…고마워. 네가 그렇게 말해줄 줄 알았어.',
           'n:1장 끝. 이 마을엔 뭔가 비밀이 있다. 그리고 그 열쇠는 카드 속 아이들이 쥐고 있다.'], 'minjun')
      ] },

    // ───────────────── 2장 ─────────────────
    { id: 'c2', title: '2장 · 기억의 조각', emoji: '🔮',
      intro: '아이돌들은 자신이 누구였는지 잊었다. 조각을 모으면 기억이 돌아올지도 모른다.',
      quests: [
        q('s2_1', '마음을 열어봐', '💞 아이돌과 인연 단계를 올려보자.', 300, 40,
          function () { return qdone('main_affection') || anyGate(2); },
          ['n:자주 만나고, 선물하고, 이야기를 나누자 아이돌들의 말투가 조금씩 부드러워졌다.',
           'x:doyun:…계속 들러. 규칙은 아니지만, 그렇게 해주면 좋겠어.']),
        q('s2_2', '학원 문을 열어라', '⭐ 포카하우스 레벨 10을 달성하자.', 400, 50,
          function () { return qdone('main_level') || plv() >= 10; },
          ['n:잠겨 있던 기술학원 문이 열렸다. 먼지 쌓인 교실 칠판에 누군가 써둔 글씨가 남아 있었다.',
           'n:"이름이 불리면, 사람은 돌아온다."',
           'n:누가 썼는지는 알 수 없었다.']),
        q('s2_3', '전설의 섬', '🏝️ 신비의 섬을 열어보자.', 400, 50,
          function () { return qdone('main_mystery') || anyGate(3); },
          ['i:신비의 섬에 가봐. 거기에 네가 찾는 게 있을 거야.',
           'p:섬이라니, 지도에도 없는데.',
           'i:마음이 열려야 보이는 곳이래. 이제 네 앞에 나타날 거야.'], 'harin'),
        q('s2_4', '기억의 조각', '✨ 신비의 섬에서 소원의 조각을 찾아보자.', 500, 80,
          function () { return qdone('main_wish') || wishN() > 0 || bagHas('소원의 결정') || q2('crystal'); },
          ['n:모래 위에서 손톱만 한 조각이 반짝였다. 쥐자마자 머릿속에 낯선 장면이 스쳤다.',
           'n:환한 조명, 함성, 그리고… 누군가 부르는 이름.',
           'n:그 사이로 낯선 하늘이 스쳤다. 날개도 없이 떨어지던, 나의 기억까지.',
           'n:이 조각들은 아이돌들의 것이면서, 어쩌면 나의 것이기도 하다.']),
        q('s2_5', '조각이 모이면', '🔮 소원의 조각 100개로 소원의 결정을 만들어보자.', 700, 100,
          function () { return qdone('main_crystal') || q2('crystal') || bagHas('소원의 결정'); },
          ['n:조각 백 개가 하나로 뭉쳐 푸른 결정이 되었다. 손에서 심장 소리처럼 쿵, 쿵 울렸다.',
           'x:minjun:이거야. 별의 기록 일부가 여기 담겨 있어.',
           'x:minjun:…아직 전부는 아니지만.']),
        q('s2_6', '카드 재조합', '🔮 카드 재조합기를 한 번 써보자.', 300, 40,
          function () { return qdone('tut_recombine') || q2('recombine') || recombined(); },
          ['n:겹치는 카드 두 장이 빛으로 녹아 새로운 한 장이 되었다.',
           'n:사라진 게 아니라 이어진 것이라고, 카드 속 아이가 말해줬다.']),
        q('s2_7', '숨겨진 얼굴', '🌟 첫 히든카드를 얻어보자.', 600, 80,
          function () { return qdone('main_hidden'); },
          ['n:히든카드 속 아이돌은 평소와 다른 표정을 짓고 있었다.',
           'i:이건… 내가 무대 위에서만 짓던 얼굴이야.',
           'i:봐. 기억은 이렇게, 조금씩 돌아오나 봐.'], 'ara'),
        q('s2_8', '내 방 꾸미기', '🛋️ 내 집에서 방 테마를 사서 적용해보자.', 300, 40,
          function () { return qdone('tut_room'); },
          ['n:방이 바뀌자 아이돌들이 하나둘 모여 앉았다.',
           'x:yuna:와, 우리 집 같아! …아, 우리 집이라고 말해도 되려나?']),
        q('s2_9', '굿즈 만들기', '🎁 굿즈 공방에서 굿즈를 하나 만들어보자.', 300, 40,
          function () { return qdone('tut_goods'); },
          ['n:서툰 손으로 만든 굿즈지만 아이돌은 소중하게 받아 들었다.',
           'x:sion:…직접 만든 거야? 이상하게 버리면 안 될 것 같아.']),
        q('s2_10', '레벨 20', '⭐ 포카하우스 레벨 20을 달성하자.', 700, 0,
          function () { return qdone('main_lv20'); },
          ['n:어느새 이 마을이 낯설지 않다. 골목 모퉁이마다 아이돌들의 목소리가 남아 있었다.',
           'n:2장 끝. 조각을 모으면 모을수록 한 가지 말이 선명해졌다.',
           'n:"이름이 불리면, 사람은 돌아온다."']) ] },

    // ───────────────── 3장 ─────────────────
    { id: 'c3', title: '3장 · 무대에 서는 이유', emoji: '🎤',
      intro: '이름이 불리려면 무대가 필요하다. 아이돌들은 데뷔를 꿈꾸기 시작한다.',
      quests: [
        q('s3_1', '첫 데뷔', '🎤 기획사에서 아이돌을 데뷔시키자.', 800, 100,
          function () { return qdone('main_debut'); },
          ['n:첫 무대의 조명이 켜지자 객석은 텅 비어 있었다. 그래도 아이돌은 끝까지 노래했다.',
           'i:아무도 없어도… 이상하게 가슴이 뛰어. 이 느낌, 알아.',
           'i:나는 분명 이런 무대에 서고 싶었던 거야.']),
        q('s3_2', 'CF 촬영', '🎬 광장의 CF 촬영을 해보자.', 600, 80,
          function () { return qdone('main_cf'); },
          ['n:카메라 앞에서 아이돌은 어색하게 웃었다. 하지만 컷 소리가 나자 눈빛이 달라졌다.',
           'n:촬영장 스태프들이 속삭였다. "쟤, 처음 보는 얼굴인데 눈길이 가네."']),
        q('s3_3', '팬카페 오픈', '☕ 연습생 숙소촌의 팬카페를 열어보자.', 600, 80,
          function () { return qdone('main_fancafe'); },
          ['n:팬카페 첫 글. 회원은 나 혼자뿐이었다.',
           'n:그런데도 아이돌은 그 글을 몇 번이고 다시 읽었다.',
           'i:누군가 내 이름을 적어줬어. 그것만으로 충분해.'], 'yuna'),
        q('s3_4', '팬 다섯 명', '☕ 팬카페에 팬을 5명 모아보자.', 800, 100,
          function () { return qdone('main_fan5') || fanN() >= 5; },
          ['n:팬 닉네임이 하나씩 늘어갈 때마다 아이돌의 윤곽이 또렷해지는 것 같았다.',
           'x:ara:…이름이 불릴 때마다 내가 선명해져. 이게 기억인가 봐.']),
        q('s3_5', '카메라 앞의 연기', '🎥 드라마 촬영을 한 번 해보자.', 400, 60,
          function () { return qdone('tut_drama'); },
          ['n:대본을 받아 든 아이돌이 한 줄을 읽었다. "내 이름을 불러줘."',
           'n:대사인데도, 목소리가 떨렸다.']),
        q('s3_6', '감독의 OK', '🎥 드라마에서 감독 OK 컷을 받아보자.', 900, 120,
          function () { return qdone('main_drama_ok'); },
          ['n:"컷! 오케이!" 스튜디오가 조용해졌다가 박수가 터졌다.',
           'x:doyun:…나쁘지 않았어. 내가 이런 칭찬을 하는 건 드문 일이야.']),
        q('s3_7', '팬덤 원정', '🚐 팬덤 원정을 출발해보자.', 600, 80,
          function () { return qdone('main_expedition') || q2('expedition'); },
          ['n:방송국 앞은 팬들의 목소리로 가득했다. 처음 들어보는 환호였다.',
           'n:환호 속에서 카드 한 장이 파르르 떨렸다. 이름이 불리는 건 이렇게 크게 울리는 일이었다.']),
        q('s3_8', '굿즈 장착', '🎁 굿즈를 아이돌 카드에 장착해보자.', 600, 80,
          function () { return qdone('main_goods_equip'); },
          ['n:굿즈를 단 아이돌이 거울 앞에서 한 바퀴 돌았다.',
           'x:yuna:어때? 이거 달고 무대 서면 팬들이 좋아하겠지?']),
        q('s3_9', '드라마 10회', '🎥 드라마 촬영을 10번 해보자.', 1000, 120,
          function () { return qdone('main_drama_10') || dramaN() >= 10; },
          ['n:열 번의 촬영. 이제 아이돌은 대본 없이도 감정을 꺼낼 줄 안다.',
           'n:울다 웃다 하는 얼굴 속에서, 아이돌이 문득 중얼거렸다.',
           'i:…나, 이런 일을 하던 사람이었나 봐.'], 'harin'),
        q('s3_10', '레벨 30', '⭐ 포카하우스 레벨 30을 달성하자.', 1000, 0,
          function () { return qdone('main_lv30'); },
          ['n:3장 끝. 아이돌들은 이제 카드 속에만 있지 않다.',
           'n:무대에 서고, 카메라 앞에서 웃고, 팬들이 그 이름을 부른다.',
           'n:하지만 아직 부족하다. 기억의 마지막 조각은 더 큰 무대에 있다.']) ] },

    // ───────────────── 4장 ─────────────────
    { id: 'c4', title: '4장 · 하루하루가 쌓여', emoji: '🍙',
      intro: '무대 뒤의 일상. 먹고, 쉬고, 준비하는 하루가 아이돌을 만든다. (기획사 → 🍙 식사·일정)',
      quests: [
        q('s4_1', '식사·일정표 열기', '🎤 기획사 화면의 🍙 버튼으로 식사·일정표를 열어보자.', 200, 30,
          function () { return !!S.flags.mealOpen || cnt().days > 0 || cnt().meals > 0; },
          ['n:기획사 구석에 걸린 낡은 달력. 오늘 날짜에 동그라미가 쳐져 있었다.',
           'x:minjun:무대만큼 중요한 게 하루의 시간이야. 기억도 일상 속에서 돌아오거든.']),
        q('s4_2', '첫 끼니', '🍙 아이돌에게 밥을 한 번 먹여보자.', 200, 30,
          function () { return cnt().meals >= 1; },
          ['n:접시를 비운 아이돌이 포크를 내려놓고 웃었다.',
           'i:맛있다. 밥을 같이 먹는다는 게… 이런 느낌이구나.'], 'yuna'),
        q('s4_3', '하루를 보내다', '🌙 하루 보내기 버튼으로 날짜를 넘겨보자.', 200, 30,
          function () { return cnt().days >= 1; },
          ['n:🌙 하루가 지나갔다. 아이돌들은 잘 자고 일어나 달라진 컨디션으로 아침을 맞았다.']),
        q('s4_4', '일정을 잡아주자', '📅 아이돌에게 일정(드라마·컴백·휴식)을 하나 잡아주자.', 300, 40,
          function () { return bookedTotal() >= 1; },
          ['n:달력에 이름과 날짜를 적자 아이돌의 눈빛이 달라졌다.',
           'x:doyun:일정이란 약속이야. 약속은 지켜져야 의미가 있지.']),
        q('s4_5', '촬영 전엔 식단', '📅 드라마 촬영 일정을 잡고 샐러드 같은 가벼운 식사를 해보자.', 400, 50,
          function () { return (cnt().booked.drama || 0) >= 1 && cnt().meals >= 3; },
          ['n:촬영 사흘 전부터 식단이 달라졌다. 샐러드, 요거트, 과일컵.',
           'i:솔직히 치킨이 먹고 싶지만… 카메라는 정직하니까.',
           'i:참을 수 있어. 널 위해서라면.'], 'ara'),
        q('s4_6', '촬영 당일의 도시락', '🎥 드라마 일정을 끝까지 치러 정산을 받아보자.', 500, 60,
          function () { return (cnt().events.drama || 0) >= 1; },
          ['n:촬영 날, 스태프가 건넨 도시락. 컨디션이 좋은 날은 컷이 빨리 끝난다.',
           'n:정산서를 받아 든 아이돌이 처음으로 우쭐해졌다.',
           'i:봤지? 내 컨디션 관리, 완벽했잖아.'], 'ara'),
        q('s4_7', '쉬는 것도 일이야', '🛌 휴식 일정을 잡아보자.', 300, 40,
          function () { return (cnt().booked.rest || 0) >= 1; },
          ['n:"쉬는 것도 일"이라고 말하자 아이돌이 놀란 눈으로 나를 봤다.',
           'x:harin:…쉬어도 되는 거야? 계속 노래해야 하는 줄 알았어.']),
        q('s4_8', '쉬는 날의 떡볶이', '🛌 휴식 일정을 한 번 끝까지 보내보자.', 400, 50,
          function () { return (cnt().rests || 0) >= 1; },
          ['n:휴식 기간 내내 아이돌들은 좋아하는 음식을 마음껏 먹었다.',
           'n:배가 부르고 기분이 좋아진 얼굴은 어떤 무대 의상보다 눈부셨다.']),
        q('s4_9', '컴백 준비', '💿 컴백 일정을 잡고 정산까지 받아보자.', 600, 70,
          function () { return (cnt().events.comeback || 0) >= 1; },
          ['n:컴백 무대 직전, 아이돌은 손바닥에 땀을 쥐고 있었다.',
           'x:sion:…몸은 가벼워. 어젯밤 먹은 삼계탕 덕인가?',
           'n:무대가 끝난 뒤, 환호가 한참 이어졌다.']),
        q('s4_10', '열 끼', '🍙 아이돌들에게 밥을 모두 합쳐 10번 먹이자.', 400, 50,
          function () { return cnt().meals >= 10; },
          ['n:식당 의자가 이제 모자랄 지경이다.',
           'n:밥을 같이 먹는 사이는 쉽게 멀어지지 않는다고, 누가 그랬다.']),
        q('s4_11', '일주일', '🌙 하루 보내기를 7번 해보자.', 500, 60,
          function () { return cnt().days >= 7; },
          ['n:🌙 일주일이 흘렀다. 달력 위의 동그라미들이 줄을 이어 하나의 길이 되었다.',
           'x:minjun:반복되는 하루가 쌓이면, 그게 기억이 돼.']),
        q('s4_12', '일정 다섯 번', '📅 드라마·컴백 일정을 합쳐 5번 정산받자.', 1000, 100,
          function () { return eventsTotal() >= 5; },
          ['n:일정표는 이제 빈칸이 거의 없다. 바쁘지만 모두 즐거운 얼굴이다.',
           'n:한 번의 큰 무대보다 수백 번의 평범한 하루가 아이돌을 만든다.']),
        q('s4_13', '오십 끼', '🍙 밥을 모두 합쳐 50번 먹이자.', 1000, 100,
          function () { return cnt().meals >= 50; },
          ['n:식단 노트는 어느새 두 번째 권이 되었다.',
           'x:doyun:…고마워. 내 몫까지 챙겨준 거, 잊지 않을게.',
           'n:4장 끝. 무대 위의 빛은 무대 밖의 하루로부터 나온다.']) ] },

    // ───────────────── 5장 ─────────────────
    { id: 'c5', title: '5장 · 별의 기록', emoji: '🌟',
      intro: '더 높은 곳으로. 기록의 마지막 조각이 가장 큰 무대에 숨어 있다.',
      quests: [
        q('s5_1', '첫 강화', '🎤 트레이닝룸에서 히든카드를 강화해보자.', 1000, 120,
          function () { return qdone('main_enh1') || maxEnh() >= 1; },
          ['n:트레이닝룸의 거울엔 땀에 젖은 아이돌이 비쳤다.',
           'i:어제의 나보다 오늘이 조금 낫다면 그걸로 된 거야.'], 'sion'),
        q('s5_2', '프리미엄 카드', '💎 프리미엄 조각으로 프리미엄 카드를 교환해보자.', 1200, 150,
          function () { return qdone('main_premium'); },
          ['n:손바닥만 한 카드 한 장. 하지만 무게는 이상할 만큼 묵직했다.',
           'n:이건 기록이다. 아이돌이 무대에서 남긴 순간들의 기록.']),
        q('s5_3', '5강 돌파', '🎤 히든카드를 5강까지 올려보자.', 1500, 200,
          function () { return qdone('main_enh5') || maxEnh() >= 5; },
          ['n:5강의 문턱. 여기서부터는 실패가 두렵다.',
           'i:괜찮아. 넘어져도 다시 일어나는 게 아이돌이니까.'], 'doyun'),
        q('s5_4', '공연장', '🎤 팬덤 원정의 공연장에 입장해보자.', 2000, 200,
          function () { return qdone('main_concert'); },
          ['n:공연장의 문이 열렸다. 수천 개의 빈 좌석이 이쪽을 향해 있다.',
           'n:이곳이다. 기억 속 그 무대와 같은 냄새가 난다.']),
        q('s5_5', '프리미엄 카드 강화', '💎 프리미엄 카드를 2레벨 이상 강화하자.', 1500, 150,
          function () { return qdone('main_premium_up'); },
          ['n:카드를 강화할 때마다 안에서 작은 빛이 한 겹씩 더 번졌다.']),
        q('s5_6', '앵콜 스테이지', '🎤 공연장에서 이벤트 20번을 채워 앵콜을 열자.', 3000, 300,
          function () { return qdone('main_encore'); },
          ['n:"앵콜! 앵콜!" 객석이 한목소리로 외쳤다.',
           'x:ara:들려? 저건 내 이름이야. …그리고 네 이름도 섞여 있어.']),
        q('s5_7', '첫 현상', '📷 포토랩에서 프리미엄 카드를 현상해보자.', 3000, 300,
          function () { return qdone('main_develop'); },
          ['n:암실의 붉은 불빛 아래, 흐릿하던 사진이 서서히 선명해졌다.',
           'n:사진 속 아이돌은 웃고 있었다. 이름 모를 팬들이 그 주위를 둘러싸고 있었다.']),
        q('s5_8', '10강 달성', '🎤 히든카드를 10강까지 올려보자.', 4000, 400,
          function () { return qdone('main_enh10') || maxEnh() >= 10; },
          ['n:10강. 숨을 고르는 아이돌의 눈에 이제는 두려움이 없었다.',
           'i:처음엔 아무것도 기억 못 했는데… 이제는 알아. 내가 왜 무대에 서고 싶었는지.',
           'i:누군가 내 이름을 불러주길, 그게 다였어.'], 'harin'),
        q('s5_9', '센터의 자리', '👑 포토랩 현상에서 센터 효과를 얻어보자.', 5000, 500,
          function () { return qdone('main_center'); },
          ['n:센터. 가장 밝은 자리. 아이돌은 스포트라이트 아래 서서 눈을 감았다.',
           'i:괜찮아. 이 자리가 무겁지 않아. 네가 뒤에 있으니까.'], 'ara'),
        q('s5_10', '첫 초월', '🌌 히든카드를 초월시켜보자.', 6000, 600,
          function () { return qdone('main_trans') || anyTrans(); },
          ['n:초월의 순간, 카드가 빛으로 부서졌다가 하나의 별로 다시 모였다.',
           'n:5장 끝. 별의 기록은 이제 거의 완성되었다. 마지막 한 장만 남았다.']) ] },

    // ───────────────── 6장 ─────────────────
    { id: 'c6', title: '6장 · 네 이름을 부를게', emoji: '👑',
      intro: '모든 조각이 모였다. 이제 여섯 명이 함께 서는 마지막 무대만 남았다.',
      quests: [
        q('s6_1', '전원 데뷔', '🎤 6명 모두 데뷔시키자.', 5000, 500,
          function () { return qdone('main_debut_all') || debutN() >= 6; },
          ['n:여섯 명이 한 자리에 모였다. 처음 카드에서 나왔던 날처럼 서먹하게 서 있었다.',
           'x:sion:…이렇게 다 모이니까 이상하네.',
           'x:yuna:이상하긴! 완전 좋은데!']),
        q('s6_2', '팬 스무 명', '☕ 팬카페에 팬을 20명 모아보자.', 4000, 400,
          function () { return fanN() >= 20; },
          ['n:스무 개의 이름. 모두 아이돌을 위해 직접 적은 글자들이었다.',
           'x:harin:이 사람들이… 내 이름을 기억해주고 있어.']),
        q('s6_3', '완벽한 컨디션', '🍙 6명 모두 비주얼·체력·기분을 70 이상으로 만들자.', 5000, 500,
          function () { return allSixCondition(70); },
          ['n:건강한 몸, 편안한 마음, 반짝이는 얼굴.',
           'n:여섯 명이 동시에 완벽한 컨디션으로 서는 일은 쉽지 않다. 하지만 오늘만큼은 모두 최고였다.']),
        q('s6_4', '프리미엄 컬렉터', '💎 프리미엄 카드 6종을 모두 모으자.', 8000, 800,
          function () { return qdone('main_premium_all'); },
          ['n:여섯 장의 프리미엄 카드가 책상 위에 나란히 놓였다. 한 사람의 이야기가 한 장씩 담겨 있었다.']),
        q('s6_5', '레벨 50', '⭐ 포카하우스 레벨 50을 달성하자.', 8000, 0,
          function () { return qdone('main_lv50'); },
          ['n:50번째 레벨. 처음 마을에 도착한 날 빈 주머니를 뒤지던 내가 아득하게 느껴졌다.']),
        q('s6_6', '드라마 30회', '🎥 드라마 촬영을 30번 해보자.', 6000, 600,
          function () { return dramaN() >= 30; },
          ['n:서른 번째 컷. 아이돌은 이제 대본 속 인물이 아니라 자기 자신을 연기했다.']),
        q('s6_7', '히든카드 완전 정복', '🌟 히든카드를 전부 모으자.', 10000, 1000,
          function () { return qdone('main_hidden_all'); },
          ['n:마지막 히든카드를 내려놓았을 때, 책상 위의 모든 카드가 동시에 빛났다.',
           'n:이제 다 모였다. 별의 기록은 완성되었다.']),
        q('s6_8', '네 이름을 부를게', '👑 앞의 이야기를 모두 마치면 열려요.', 20000, 2000,
          function () {
            return CHAPTERS.every(function (ch) {
              return ch.quests.every(function (qq) { return qq.id === 's6_8' || qdone(qq.id); });
            });
          },
          ['n:마지막 무대. 객석은 가득 차 있었다. 팬카페에서, 원정에서, 촬영장에서 만난 모든 사람들이 거기 있었다.',
           'x:minjun:나는 민준. 도서관의 별을 기억하는 사람.',
           'x:sion:시온. 관객 없던 무대에서 기타를 쳤던 사람.',
           'x:doyun:도윤. 지키고 싶은 사람이 있었던 사람.',
           'x:harin:하린. 새벽의 노래가 닿길 바랐던 사람.',
           'x:yuna:윤아. 봄을 기다리던 사람.',
           'x:ara:아라. 주인공이 되고 싶었던 사람.',
           'n:객석이 한목소리로 여섯 개의 이름을 불렀다. 그 순간, 카드 속 마지막 안개가 걷혔다.',
           'p:이제 기억나요?',
           'i:응. 우리는 카드가 아니라 사람이었어. 그리고 지금은… 네 곁에 있어.',
           'n:그때, 등 뒤가 간질거렸다. 하늘로 돌아가는 길이 열렸다는 걸 알았다.',
           'n:하지만 나는 아직, 대답하지 않았다.',
           'n:🎉 연대기 완결. "약속"의 답은 앞으로 네가 정해.'], 'minjun')
      ] }
  ];

  // ════════════════════════════════════════════════════════════
  // 💞 아이돌별 인연 이야기 (한 명당 6편)
  // ════════════════════════════════════════════════════════════
  var IDOLS = {
    minjun: { title: '민준 · 도서관의 별', quests: [
      ['첫 번째 책갈피', 'aff3', ['i:…또 왔네. 이번엔 길 안 잃었어?', 'p:이제 잃어도 괜찮아요. 찾아주실 거잖아요.', 'i:(헛기침) 책갈피. 이거 가져. 읽던 곳을 잃지 않게.']],
      ['무대 위의 책벌레', 'debut', ['n:조명이 켜지자 민준은 책 대신 마이크를 쥐었다.', 'i:글자로만 하던 말을 소리로 하는 건 낯설어.', 'i:근데 너한테는 소리로 하고 싶었어.']],
      ['함께 먹는 점심', 'meal', ['n:민준은 샌드위치를 반으로 갈라 내게 내밀었다.', 'i:책 읽다 보면 끼니를 잊게 돼. 네가 챙겨주니까 좋네.']],
      ['카메라 앞에서도 차분하게', 'drama', ['n:촬영장에서도 민준은 소란에 흔들리지 않았다.', 'i:대본은 결국 이야기야. 이야기라면 내가 제일 잘 읽지.']],
      ['별자리의 이름', 'aff6', ['i:오늘 별자리 봤어? 사실 저 별들 이름을 나는 전부 알고 있었던 것 같아.', 'i:잃어버렸던 게 아니라… 네가 있어서 꺼낼 수 있게 된 거야.']],
      ['별의 기록을 펼치며', 'aff11', ['i:이제 말할 수 있어. 별의 기록은 사실… 내가 쓴 일기야.', 'i:아무에게도 불리지 못한 내 이름이 적혀 있었어.', 'i:근데 지금은 네가 그 이름을 불러주니까, 더 이상 외롭지 않아.']]
    ] },
    sion: { title: '시온 · 폭풍 속의 기타', quests: [
      ['한 곡만 더', 'aff3', ['i:…또 왔어? 할 일 없나 보네.', 'p:시온 씨 연주가 듣고 싶어서요.', 'i:(기타를 고쳐 잡으며) 딱 한 곡만이다.']],
      ['관객이 생긴 무대', 'debut', ['n:객석이 가득 찬 건 아니었지만, 첫 줄에 앉은 사람들은 눈을 반짝였다.', 'i:…하, 관객이 있다는 게 이런 거였나.']],
      ['무뚝뚝한 식사', 'meal', ['i:배 안 고파. …그래도 네가 가져온 거니까 먹어줄게.', 'n:그릇이 순식간에 비었다.']],
      ['카메라는 불편해', 'drama', ['i:연기는 낯간지러워. 그래도 네가 보고 있다고 생각하면… 할 수 있어.']],
      ['폭풍이 지난 뒤', 'aff6', ['i:내가 기타를 잡은 건, 아무도 안 들어줘도 나만은 들어주려고였어.', 'i:근데 이제 너까지 들어주니까… 조금 부끄럽네.']],
      ['관객 없던 무대의 기억', 'aff11', ['i:생각났어. 그 무대엔 관객이 한 명도 없었어. 그래도 끝까지 쳤지.', 'i:사라지기 전의 마지막 연주였어.', 'i:그리고 지금 그 곡을 처음으로 들어준 사람이 너야.']]
    ] },
    doyun: { title: '도윤 · 보이지 않는 실세', quests: [
      ['규칙 하나', 'aff3', ['i:규칙 하나 더 만들어도 될까.', 'p:이번엔 뭔데요?', 'i:"자주 올 것." …그뿐이야.']],
      ['무대에 오른 학생회장', 'debut', ['n:무대 위의 도윤은 평소보다 훨씬 부드러웠다.', 'i:내가 무대에서 웃게 될 줄은 몰랐어.']],
      ['식단표', 'meal', ['i:식단표는 내가 짠다. …아니, 오늘만큼은 네가 정해줘.', 'n:도윤이 직접 내려놓는 순간은 드물다.']],
      ['연출의 기준', 'drama', ['i:연기도 결국 설계야. 감정의 순서를 정하면 돼.', 'i:…단, 오늘은 설계가 무너졌어. 네가 웃어서.']],
      ['가면을 내리고', 'aff6', ['i:나는 늘 누군가를 지키려고 규칙을 만들었어.', 'i:근데 그 규칙이 나를 가두고 있다는 걸, 이제 알겠어.']],
      ['지키고 싶은 사람', 'aff11', ['i:기억났어. 내가 지키고 싶었던 사람들이 있었어. 이름도 얼굴도 흐릿하지만.', 'i:이번엔 흐릿하지 않아. 내 앞에 있는 사람이니까.', 'i:…특히 너.']]
    ] },
    harin: { title: '하린 · 새벽의 노래', quests: [
      ['막차를 기다리며', 'aff3', ['i:또 막차를 놓친 거야?', 'p:이번엔 일부러요.', 'i:(작게 웃으며) 나쁜 사람. …같이 기다려줄게.']],
      ['첫 무대의 떨림', 'debut', ['n:마이크를 쥔 하린의 손끝이 떨리고 있었다.', 'i:노래가 닿지 않으면 어쩌지.', 'p:닿아요. 제가 맨 앞에서 듣고 있을게요.']],
      ['따뜻한 국물', 'meal', ['i:목이 아플 땐 따뜻한 걸 먹어야 해. 같이 먹자.', 'n:하린은 국물을 한 숟갈 뜨고는 행복한 표정을 지었다.']],
      ['눈물 연기', 'drama', ['n:드라마 속 하린의 눈물은 연기가 아니었다.', 'i:대사를 하는데 진짜 내 이야기 같았어.']],
      ['달빛 아래의 약속', 'aff6', ['i:있잖아, 내 노래는 늘 아무에게도 닿지 못했어.', 'i:근데 네가 들어주고 나서부터 노래가 달라졌어.']],
      ['마지막 무대를 넘어', 'aff11', ['i:그날이 마지막 무대인 줄 알았어. 아무도 듣지 않을 줄 알았거든.', 'i:근데 지금은 알아. 그 노래가 끝나지 않고, 너한테까지 이어졌다는 걸.']]
    ] },
    yuna: { title: '윤아 · 봄을 기다리는 꽃집', quests: [
      ['꽃 한 송이', 'aff3', ['i:어서 와! 오늘은 널 위해 제일 예쁜 걸로 골랐어!', 'n:윤아가 건넨 꽃에는 작은 쪽지가 붙어 있었다. "오늘도 와줘서 고마워."']],
      ['스포트라이트 아래서', 'debut', ['n:조명 아래 윤아는 꽃잎처럼 가볍게 돌았다.', 'i:와, 이게 무대구나! 심장이 꽃봉오리처럼 터질 것 같아!']],
      ['달콤한 간식 시간', 'meal', ['i:케이크 먹자! 아니, 샐러드부터… 아니, 케이크!', 'n:윤아는 한참을 고민하다 결국 둘 다 먹었다.']],
      ['꽃 같은 연기', 'drama', ['i:연기가 처음엔 무서웠는데, 네가 지켜본다고 생각하면 꽃이 피는 것 같아!']],
      ['봄 축제의 약속', 'aff6', ['i:있잖아, 나 사실 봄이 오기 전까지 늘 혼자였어.', 'i:근데 이번 봄엔 네가 있잖아. 그래서 괜찮아.']],
      ['이름을 불러줘', 'aff11', ['i:생각났어. 내 이름은 꽃이 필 때 처음 불렸어.', 'i:그런데 아무도 안 불러주면 꽃이 시드는 것처럼 나도 흐려져.', 'i:그러니까 계속, 계속 불러줘. 약속이야!']]
    ] },
    ara: { title: '아라 · 무대의 여왕', quests: [
      ['도도한 인사', 'aff3', ['i:오늘도 왔네. 질리지도 않아?', 'p:아라 씨 얼굴 보러 오는 건데요.', 'i:(귀가 붉어지며) …흥. 그럼 계속 보든가.']],
      ['여왕의 첫 무대', 'debut', ['n:무대 중앙에 선 아라는 객석을 한 번 쓱 훑었다.', 'i:이 정도 환호쯤이야. …근데 왜 눈물이 나지?']],
      ['여왕의 식단 관리', 'meal', ['i:다이어트 중이야. 하지만 오늘은 특별히 먹어줄게. 네가 만들어준 거니까.']],
      ['스타의 연기', 'drama', ['i:연기는 내 전공이야. 감정을 어떻게 꺼내는지 알거든.', 'i:…근데 네 앞에서는 연기가 안 돼.']],
      ['가면 뒤의 얼굴', 'aff6', ['i:나는 늘 주인공이어야 한다고 생각했어.', 'i:근데 주인공이 되지 못했던 기억이 있어. 그래서 더 악착같았나 봐.']],
      ['주인공은 나야', 'aff11', ['i:기억났어. 나는 한 번도 센터에 서본 적이 없었어.', 'i:그래서 카드 속에서도 주인공이 되고 싶었던 거야.', 'i:근데 지금은 알겠어. 주인공은 이름이 불리는 사람이라는 걸. 그리고 그건 이제 나야.']]
    ] }
  };

  // 아이돌별 퀘스트 조건 (종류별)
  function idolDetect(id, kind) {
    switch (kind) {
      case 'aff3': return function () { return gate(id) >= 3; };
      case 'aff6': return function () { return gate(id) >= 6; };
      case 'aff11': return function () { return gate(id) >= 11; };
      case 'debut': return function () { return !!debutMap()[id]; };
      case 'meal': return function () { return (cnt().byChar[id] || 0) >= 5; };
      case 'drama': return function () { return fameOf(id) >= 20; };
    }
    return function () { return false; };
  }
  var IDOL_HINT = {
    aff3: function (n) { return '💞 ' + n + '와(과) 인연 단계를 친절 Lv.3까지 올리자.'; },
    aff6: function (n) { return '💞 ' + n + '와(과) 인연 단계를 우호 단계까지 올리자.'; },
    aff11: function (n) { return '💞 ' + n + '와(과) 인연 단계를 신뢰 단계까지 올리자.'; },
    debut: function (n) { return '🎤 기획사에서 ' + n + '를(을) 데뷔시키자.'; },
    meal: function (n) { return '🍙 ' + n + '에게 밥을 5번 먹이자. (기획사 → 식사·일정)'; },
    drama: function (n) { return '🎥 ' + n + '의 히든카드로 드라마를 찍어 인지도 20을 쌓자.'; }
  };
  var IDOL_REWARD = { aff3: [500, 60], debut: [800, 80], meal: [600, 60], drama: [900, 100], aff6: [1500, 150], aff11: [4000, 400] };

  // 트랙(진행 줄기) 만들기: 메인 6챕터 + 아이돌 6명
  var TRACKS = [];
  CHAPTERS.forEach(function (ch, i) {
    TRACKS.push({ id: ch.id, title: ch.title, emoji: ch.emoji, intro: ch.intro, quests: ch.quests, kind: 'main',
      lock: i === 0 ? null : { track: CHAPTERS[i - 1].id, text: '앞 챕터를 모두 마치면 열려요.' } });
  });
  ORDER.forEach(function (cid) {
    var d = IDOLS[cid];
    var list = d.quests.map(function (row, i) {
      return q('i_' + cid + '_' + (i + 1), row[0], IDOL_HINT[row[1]](NAMES[cid]), IDOL_REWARD[row[1]][0], IDOL_REWARD[row[1]][1],
        idolDetect(cid, row[1]), row[2], cid);
    });
    TRACKS.push({ id: 'i_' + cid, title: '💞 ' + d.title, emoji: '', intro: NAMES[cid] + '와(과) 쌓아가는 이야기.', quests: list, kind: 'idol', cid: cid,
      lock: { quest: 's1_3', text: '1장 "카드가 말을 걸었어"를 마치면 열려요.' } });
  });

  var BYID = {};
  TRACKS.forEach(function (t) { t.quests.forEach(function (x) { x.track = t.id; BYID[x.id] = x; }); });

  // ───────── 상태 도우미 ─────────
  function trackById(id) { for (var i = 0; i < TRACKS.length; i++) if (TRACKS[i].id === id) return TRACKS[i]; return null; }
  function trackDone(t) { return t.quests.every(function (x) { return qdone(x.id); }); }
  function trackUnlocked(t) {
    if (!t.lock) return true;
    if (t.lock.track) { var p = trackById(t.lock.track); return !!p && trackDone(p); }
    if (t.lock.quest) return qdone(t.lock.quest);
    return true;
  }
  function activeOf(t) {
    for (var i = 0; i < t.quests.length; i++) if (!qdone(t.quests[i].id)) return t.quests[i];
    return null;
  }
  function counts() {
    var d = 0, n = 0;
    TRACKS.forEach(function (t) { t.quests.forEach(function (x) { n++; if (qdone(x.id)) d++; }); });
    return { done: d, total: n };
  }

  // ───────── 식사/달력 기록 자동 세기 (ph_meal 변화를 지켜봄) ─────────
  function snapOf(m) {
    var eaten = {}, sched = {};
    keys(m.eaten).forEach(function (c) { eaten[c] = { day: m.eaten[c].day, n: m.eaten[c].n || 0 }; });
    keys(m.sched).forEach(function (c) { sched[c] = { type: m.sched[c].type, day: m.sched[c].day }; });
    return { day: m.day || 1, eaten: eaten, sched: sched };
  }
  function sampleMeal() {
    var m = J('ph_meal', null);
    if (!m || typeof m !== 'object') return;
    m.eaten = m.eaten || {}; m.sched = m.sched || {};
    var p = S.snap, c = S.cnt, changed = false;
    if (!p) {
      S.snap = snapOf(m); c.days = Math.max(c.days, (m.day || 1) - 1); save(); return;
    }
    if ((m.day || 1) > p.day) { c.days += (m.day - p.day); changed = true; }
    keys(m.eaten).forEach(function (cid) {
      var e = m.eaten[cid], pe = p.eaten[cid], add = 0;
      if (!e) return;
      if (pe && pe.day === e.day) add = (e.n || 0) - pe.n; else add = (e.n || 0);
      if (add > 0) { c.meals += add; c.byChar[cid] = (c.byChar[cid] || 0) + add; changed = true; }
    });
    keys(m.sched).forEach(function (cid) {
      var s = m.sched[cid], ps = p.sched[cid];
      if (!ps || ps.type !== s.type || ps.day !== s.day) { c.booked[s.type] = (c.booked[s.type] || 0) + 1; changed = true; }
    });
    keys(p.sched).forEach(function (cid) {
      var ps = p.sched[cid], s = m.sched[cid];
      if (!s || s.type !== ps.type) {      // 일정이 끝남(정산 or 휴식 종료)
        if (ps.type === 'rest') c.rests = (c.rests || 0) + 1; else c.events[ps.type] = (c.events[ps.type] || 0) + 1;
        changed = true;
      }
    });
    S.snap = snapOf(m);
    if (changed) save();
  }
  // 🍙 식사·일정 버튼을 눌렀는지
  document.addEventListener('click', function (e) {
    try {
      var el = e.target && e.target.closest && e.target.closest('#meal-open-btn');
      if (el) flag('mealOpen');
    } catch (err) {}
  }, true);

  // ════════════════════════════════════════════════════════════
  // 🎬 이야기 팝업
  // ════════════════════════════════════════════════════════════
  var queue = [];     // 보여줄 이야기 줄
  var showing = false;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function parseLine(raw, who) {
    var i = raw.indexOf(':');
    var tag = raw.slice(0, i), rest = raw.slice(i + 1);
    if (tag === 'x') { var j = rest.indexOf(':'); return { who: rest.slice(0, j), text: rest.slice(j + 1) }; }
    if (tag === 'i') return { who: who || 'minjun', text: rest };
    if (tag === 'p') return { who: 'player', text: rest };
    return { who: 'n', text: rest };
  }
  function openStory(x, reward) {
    if (!x) return;
    var lines = x.lines.map(function (r) { return parseLine(r, x.who); });
    var t = trackById(x.track);
    var idx = 0;
    var ov = document.createElement('div');
    ov.id = 'story-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:880;background:rgba(8,6,20,.88);display:flex;align-items:flex-end;justify-content:center;font-family:inherit;animation:stFade .25s ease;';
    ov.innerHTML =
      '<style>@keyframes stFade{from{opacity:0}to{opacity:1}}@keyframes stPop{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}</style>' +
      '<div style="width:100%;max-width:480px;padding:0 12px 18px;box-sizing:border-box;">' +
      '<div style="text-align:center;margin-bottom:10px;">' +
      '<div style="font-size:11px;color:#FFB3CC;letter-spacing:.5px;">' + esc(t ? t.title : '') + '</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin-top:2px;">' + esc(x.title) + '</div></div>' +
      '<div id="story-face" style="height:150px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:-14px;position:relative;z-index:1;"></div>' +
      '<div id="story-box" style="position:relative;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,179,204,.5);border-radius:16px;padding:16px 16px 14px;min-height:110px;color:#fff;backdrop-filter:blur(6px);">' +
      '<div id="story-name" style="font-size:12px;font-weight:900;color:#FFD700;margin-bottom:6px;"></div>' +
      '<div id="story-text" style="font-size:14px;line-height:1.65;"></div>' +
      '<div id="story-next" style="position:absolute;right:14px;bottom:8px;font-size:11px;color:#FFB3CC;">탭해서 계속 ▶</div></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">' +
      '<button id="story-skip" style="background:none;border:none;color:#aaa;font-size:12px;padding:6px 4px;cursor:pointer;">건너뛰기</button>' +
      '<div id="story-reward" style="font-size:12px;color:#FFD700;font-weight:700;"></div></div></div>';
    document.body.appendChild(ov);
    var faceEl = ov.querySelector('#story-face'), nameEl = ov.querySelector('#story-name'), textEl = ov.querySelector('#story-text'),
        nextEl = ov.querySelector('#story-next'), rewEl = ov.querySelector('#story-reward'), boxEl = ov.querySelector('#story-box');

    function show() {
      var l = lines[idx];
      boxEl.style.animation = 'none'; void boxEl.offsetWidth; boxEl.style.animation = 'stPop .25s ease';
      if (l.who === 'n') {
        faceEl.innerHTML = ''; nameEl.textContent = ''; textEl.style.fontStyle = 'italic'; textEl.style.color = '#e8dcff';
      } else if (l.who === 'player') {
        faceEl.innerHTML = ''; nameEl.textContent = '나'; textEl.style.fontStyle = 'normal'; textEl.style.color = '#fff';
      } else {
        faceEl.innerHTML = '<img src="face-' + esc(l.who) + '.png" style="height:150px;object-fit:contain;filter:drop-shadow(0 4px 10px rgba(0,0,0,.5));" onerror="this.style.display=\'none\'">';
        nameEl.textContent = NAMES[l.who] || ''; textEl.style.fontStyle = 'normal'; textEl.style.color = '#fff';
      }
      textEl.textContent = l.text;
      var last = idx >= lines.length - 1;
      nextEl.textContent = last ? '탭해서 닫기 ✔' : '탭해서 계속 ▶';
      rewEl.textContent = (last && reward) ? ('🍔 +' + x.coins + '  ⭐ +' + x.exp) : '';
    }
    function close() { ov.remove(); showing = false; setTimeout(pump, 300); }
    ov.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'story-skip') { close(); return; }
      try { if (window.pocaSfx) window.pocaSfx.play('page'); } catch (e2) {}
      if (idx >= lines.length - 1) close(); else { idx++; show(); }
    });
    showing = true;
    try { if (window.pocaSfx) window.pocaSfx.play(reward ? 'reward' : 'open'); } catch (e3) {}
    show();
  }
  var storyQueue = [];
  function enqueue(id, reward) { storyQueue.push({ id: id, reward: reward }); pump(); }
  function pump() {
    if (showing || !storyQueue.length) return;
    // 다른 풀스크린(드라마 촬영 등) 중에는 기다림
    var busy = document.getElementById('drama-root') || document.querySelector('#meal-eat-overlay');
    if (busy) { setTimeout(pump, 2000); return; }
    var it = storyQueue.shift();
    openStory(BYID[it.id], it.reward);
  }

  // ════════════════════════════════════════════════════════════
  // ⚙️ 등록 / 자동 판정
  // ════════════════════════════════════════════════════════════
  function register() {
    if (typeof QUESTS === 'undefined') return false;
    TRACKS.forEach(function (t) {
      t.quests.forEach(function (x) {
        if (!QUESTS[x.id]) QUESTS[x.id] = { title: x.title, desc: x.hint, condition: 'story_' + x.id, rewardCoins: x.coins, rewardExp: x.exp, type: 'story' };
      });
    });
    return true;
  }

  function tick() {
    try {
      sampleMeal();
      if (showing || storyQueue.length) return;
      if (typeof completeQuest !== 'function' || typeof questProgress === 'undefined') return;
      for (var i = 0; i < TRACKS.length; i++) {
        var t = TRACKS[i];
        if (!trackUnlocked(t)) continue;
        var a = activeOf(t);
        if (!a) continue;
        var ok = false;
        try { ok = !!a.detect(); } catch (e) {}
        if (ok) {
          completeQuest(a.id, QUESTS[a.id]);
          enqueue(a.id, true);
          refreshList(); updateChip();
          return;          // 한 번에 하나씩
        }
      }
    } catch (e) {}
  }

  // ════════════════════════════════════════════════════════════
  // 📋 퀘스트 탭에 섹션 추가
  // ════════════════════════════════════════════════════════════
  var openTracks = {};   // 펼친 트랙
  function sectionHtml() {
    var c = counts();
    var h = '<div id="story-section" style="margin-top:22px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
      '<div style="font-size:13px;font-weight:700;color:#FFB3CC;">📚 연대기 퀘스트</div>' +
      '<div style="font-size:11px;color:#aaa;">' + c.done + ' / ' + c.total + '</div></div>';
    var group = '';
    TRACKS.forEach(function (t) {
      if (t.kind !== group) {
        group = t.kind;
        h += '<div style="font-size:11px;color:#9b8cc4;margin:12px 0 6px;">' + (group === 'main' ? '— 메인 스토리 —' : '— 아이돌 인연 이야기 —') + '</div>';
      }
      var unlocked = trackUnlocked(t);
      var done = t.quests.filter(function (x) { return qdone(x.id); });
      var act = unlocked ? activeOf(t) : null;
      var pct = Math.round(done.length / t.quests.length * 100);
      h += '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,' + (unlocked ? '0.16' : '0.07') + ');border-radius:12px;padding:12px;margin-bottom:8px;opacity:' + (unlocked ? '1' : '0.5') + ';">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="font-size:14px;font-weight:700;color:#fff;">' + (unlocked ? '' : '🔒 ') + esc((t.emoji ? t.emoji + ' ' : '') + t.title) + '</div>' +
        '<div style="font-size:11px;color:#FFD700;">' + done.length + '/' + t.quests.length + '</div></div>';
      h += '<div style="height:4px;background:rgba(255,255,255,.1);border-radius:2px;margin:8px 0;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#FFB3CC,#FFD700);border-radius:2px;"></div></div>';
      if (!unlocked) {
        h += '<div style="font-size:12px;color:#888;">' + esc(t.lock.text) + '</div>';
      } else if (act) {
        h += '<div data-st="detail" data-q="' + act.id + '" style="cursor:pointer;">' +
          '<div style="font-size:11px;color:#FFB3CC;margin-bottom:2px;">▶ 지금 할 일 <span style="color:#9b8cc4;">(탭하면 자세히)</span></div>' +
          '<div style="font-size:13px;font-weight:700;color:#fff;">' + esc(act.title) + ' <span style="font-size:11px;color:#FFD700;font-weight:400;">🍔' + act.coins + '</span></div>' +
          '<div style="font-size:12px;color:#ccc;margin-top:3px;line-height:1.5;">' + esc(act.hint) + '</div></div>';
      } else {
        h += '<div style="font-size:12px;color:#7ee0a0;">✅ 이야기를 모두 마쳤어요.</div>';
      }
      if (done.length) {
        var open = !!openTracks[t.id];
        h += '<div data-st="toggle" data-t="' + t.id + '" style="font-size:11px;color:#9b8cc4;margin-top:8px;cursor:pointer;">' + (open ? '▾' : '▸') + ' 지난 이야기 다시 보기 (' + done.length + ')</div>';
        if (open) {
          h += '<div style="margin-top:6px;">';
          done.forEach(function (x) {
            h += '<div data-st="replay" data-q="' + x.id + '" style="font-size:12px;color:#ddd;padding:6px 8px;background:rgba(255,255,255,.05);border-radius:8px;margin-bottom:4px;cursor:pointer;">📖 ' + esc(x.title) + '</div>';
          });
          h += '</div>';
        }
      }
      h += '</div>';
    });
    h += '</div>';
    return h;
  }
  function openDetail(x) {
    if (!x) return;
    var t = trackById(x.track);
    var old = document.getElementById('story-detail'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'story-detail';
    ov.style.cssText = 'position:fixed;inset:0;z-index:870;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:18px;';
    ov.innerHTML = '<div style="width:100%;max-width:340px;background:linear-gradient(135deg,#1a1a2e,#2d1b4e);border:2px solid #C084FC;border-radius:20px;padding:22px 20px;text-align:center;color:#fff;">' +
      '<div style="font-size:11px;color:#FFB3CC;">' + esc(t ? t.title : '') + '</div>' +
      '<div style="font-size:19px;font-weight:900;margin:6px 0 10px;">' + esc(x.title) + '</div>' +
      '<div style="font-size:12px;color:#c9bfe6;font-style:italic;line-height:1.6;margin-bottom:10px;">' + esc(t ? t.intro : '') + '</div>' +
      '<div style="font-size:14px;line-height:1.7;background:rgba(255,255,255,.07);border-radius:12px;padding:12px;margin-bottom:10px;">🎯 ' + esc(x.hint) + '</div>' +
      '<div style="font-size:13px;font-weight:900;color:#FFD700;margin-bottom:14px;">🍔 ' + x.coins.toLocaleString() + ' · ⭐ ' + x.exp + 'xp</div>' +
      '<div style="font-size:11px;color:#aaa;margin-bottom:12px;">조건을 달성하면 자동으로 완료돼요.</div>' +
      '<button id="story-detail-ok" style="width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;font-weight:900;font-size:14px;cursor:pointer;">확인</button></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target.id === 'story-detail-ok') ov.remove(); });
  }
  function renderSection() {
    var el = document.getElementById('quest-list');
    if (!el) return;
    var old = document.getElementById('story-section');
    if (old) old.remove();
    el.insertAdjacentHTML('beforeend', sectionHtml());
    if (!el.__stBound) {
      el.__stBound = true;
      el.addEventListener('click', function (e) {
        var n = e.target && e.target.closest ? e.target.closest('[data-st]') : null;
        if (!n) return;
        if (n.getAttribute('data-st') === 'toggle') { var id = n.getAttribute('data-t'); openTracks[id] = !openTracks[id]; renderSection(); }
        else if (n.getAttribute('data-st') === 'replay') { if (!showing) openStory(BYID[n.getAttribute('data-q')], false); }
        else if (n.getAttribute('data-st') === 'detail') { openDetail(BYID[n.getAttribute('data-q')]); }
      });
    }
  }
  function refreshList() {
    var cur = document.getElementById('screen-quest');
    if (cur && cur.classList.contains('active')) { try { renderSection(); } catch (e) {} }
  }
  function hookRender() {
    if (typeof window.renderQuestList !== 'function') { setTimeout(hookRender, 150); return; }
    var orig = window.renderQuestList;
    if (orig.__storyHooked) return;
    var w = function () { var r = orig.apply(this, arguments); try { renderSection(); } catch (e) {} return r; };
    w.__storyHooked = true;
    window.renderQuestList = w;
    refreshList();
  }


  // ════════════════════════════════════════════════════════════
  // 🏠 홈 배너(QUEST 문구 옆)에 연대기 진행 상황 칩
  // ════════════════════════════════════════════════════════════
  function chipHtml() {
    var c = counts(), pct = Math.round(c.done / c.total * 100);
    return '<div style="font-size:11px;font-weight:900;color:#fff;white-space:nowrap;">📚 연대기 ' + c.done + '/' + c.total + '</div>' +
      '<div style="height:4px;width:96px;background:rgba(255,255,255,.35);border-radius:2px;margin-top:4px;overflow:hidden;">' +
      '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#FFB3CC,#FFD700);"></div></div>';
  }
  function updateChip() {
    var banner = document.querySelector('.home-banner');
    if (!banner) return;
    var chip = document.getElementById('story-home-chip');
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'story-home-chip';
      chip.style.cssText = 'position:absolute;top:10px;right:10px;z-index:3;padding:7px 11px;border-radius:14px;background:rgba(40,20,70,.72);' +
        'box-shadow:0 2px 8px #0003;cursor:pointer;backdrop-filter:blur(4px);';
      chip.addEventListener('click', function (e) {
        e.stopPropagation();
        try { if (typeof goTo === 'function') goTo('quest'); else if (typeof showScreen === 'function') showScreen('quest'); } catch (err) {}
        setTimeout(function () { var s2 = document.getElementById('story-section'); if (s2 && s2.scrollIntoView) s2.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
      });
      banner.appendChild(chip);
    }
    var h = chipHtml();
    if (chip.__h !== h) { chip.innerHTML = h; chip.__h = h; }
  }

  // ───────── 시작 ─────────
  (function boot() {
    if (!register()) { setTimeout(boot, 250); return; }
    hookRender();
    setInterval(function () { tick(); updateChip(); }, 2500);
    setTimeout(updateChip, 300);
  })();

  // 테스트용
  window.__storyTest = { TRACKS: TRACKS, BYID: BYID, S: function () { return S; }, sampleMeal: sampleMeal, trackUnlocked: trackUnlocked,
    activeOf: activeOf, tick: tick, sectionHtml: sectionHtml, parseLine: parseLine, counts: counts, openStory: openStory, reset: function () { S = load(); } };
})();
