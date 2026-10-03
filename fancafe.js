// ════════════════════════════════
// ☕ 팬카페 (fancafe.js) — 1단계
// 주택가 메뉴에 "☕ 시온 팬카페" 버튼을 붙인다. (game.js / index.html / agency.js / cf-shoot.js는 건드리지 않음)
//
// - 시온이 기획사에서 "데뷔 완료"해야 열린다. 처음엔 회원이 나 혼자(1명).
// - 대표 팬 10명(NPC)이 하나둘 가입한다. 팬마다 유형 · 말투 · 좋아하는 답글 톤 · 애착도가 있다.
// - 팬들은 3시간마다 글을 쓴다. 접속하지 않은 동안 쌓인 글은 팬카페를 열 때 한꺼번에 보인다 (최대 48시간치).
// - 내가 하는 일: ♥ 누르기, 답글 톤 고르기(다정 / 장난 / 담백). 팬마다 좋아하는 톤이 달라서 애착도가 다르게 오른다.
// - 애착도가 낮아진 팬은 "탈덕할까 고민중" 글을 올린다. 48시간 안에 붙잡지 못하면 떠난다 (CF 성공 때 돌아올 수도 있음).
// - CF(cf-shoot.js)에서 별 1개 이상으로 성공하면 반응이 오고, 가끔 "커뮤니티에서 언급" 바이럴로 회원이 폭증한다.
// - 저장: localStorage 'ph_fancafe' (기획사 / CF와 같은 방식 — 이 기기에만 저장됨)
//
// 값을 바꾸고 싶으면 아래 설정과 팬 명단(ROSTER)만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var STORAGE_KEY = 'ph_fancafe';
  var AGENCY_KEY = 'ph_agency';          // 데뷔 여부를 읽어오는 곳 (agency.js가 저장)
  var CF_KEY = 'ph_cf';                  // CF 결과(포스터)를 읽어오는 곳 (cf-shoot.js가 저장)
  var IDOLS = ['sion'];                  // 팬카페가 열리는 아이돌 (나중에 멤버를 늘릴 때 여기에 추가)

  var HOUR = 3600000, DAY = 24 * HOUR;
  var TICK_MS = 3 * HOUR;                // 팬들이 글을 쓰는 주기
  var MAX_TICKS = 16;                    // 오래 접속 안 했을 때 한 번에 보여주는 최대 주기 수 (16 × 3시간 = 48시간)
  var FIRST_FAN_DELAY = 10 * 60 * 1000;  // 카페를 연 뒤 첫 팬이 찾아오기까지 (CF에 성공하면 바로 옴)
  var JOIN_BASE = 0.25;                  // 주기마다 새 팬이 가입할 기본 확률
  var JOIN_CARE = 0.25;                  // 최근 24시간 안에 ♥/답글을 했으면 추가
  var JOIN_CF = 0.35;                    // 최근 24시간 안에 CF에 성공했으면 추가
  var JOIN_MAX = 0.85;
  var POST_MAX = 40;                     // 게시판에 남기는 최대 글 수

  var HEART_AFF = 2;                     // ♥ 한 번에 오르는 애착도
  var TONE_HIT = 10;                     // 팬이 좋아하는 톤으로 답글했을 때
  var TONE_MISS = 4;                     // 다른 톤으로 답글했을 때
  var DECAY_GRACE = 4 * DAY;             // 그 팬에게 ♥/답글을 안 하고 이만큼 지나면 애착도가 내려가기 시작
  var DECAY_PER_DAY = 3;                 // 그 뒤로 하루마다 내려가는 애착도 (팬마다 따로 계산)
  var DECAY_FLOOR = 15;                  // 시간만으로는 이 아래로 안 내려감
  var DECAY_MAX_DAYS = 4;                // 한 번 접속할 때 적용되는 최대 일수

  var QUIT_AFF = 25;                     // 이 이하면 탈덕 고민 글이 올라올 수 있음
  var QUIT_GRACE = 48 * HOUR;            // 가입 후 이 시간 동안은 탈덕 고민 안 함
  var QUIT_COOLDOWN = 72 * HOUR;         // 탈덕 고민 글 사이 최소 간격
  var QUIT_WAIT = 48 * HOUR;             // 이 시간 안에 답하지 않으면 떠남
  var QUIT_ROLL = 0.5;                   // 조건을 채운 주기마다 탈덕 고민 글이 올라올 확률
  var QUIT_BASE = { warm: 55, playful: 45, serious: 30 };   // 붙잡기 성공 확률(%) — 톤별 기본값
  var QUIT_PREF_BONUS = 25;              // 그 팬이 좋아하는 톤이면 추가
  var STAY_AFF = 60;                     // 붙잡았을 때 애착도
  var RETURN_AFF = 50;                   // 돌아왔을 때 애착도
  var RETURN_CHANCE = 0.6;               // CF 성공 때 떠난 팬 / 뜸한 팬이 돌아올 확률
  var GHOST_AWAY_AFTER = 48 * HOUR;      // '갑자기 안 오는 팬'이 사라지는 시점 (가입 후)
  var GHOST_BACK_AFTER = 5 * DAY;        // 사라진 뒤 이만큼 지나면 스스로 돌아옴
  var LURKER_AFF = 80;                   // 눈팅러가 처음으로 글을 쓰는 애착도

  var VIRAL_CHANCE = { 1: 0.05, 2: 0.2, 3: 0.45 };   // CF 별 개수별 "커뮤니티에서 언급" 확률
  var JOIN_ON_CF = { 1: 0.5, 2: 1, 3: 1 };            // CF 별 개수별 대표 팬 가입 확률
  var CF_REACT_MAX = 2;                  // CF 반응 글을 쓰는 팬 수 (최대)

  // ── 답글 톤 ──
  var TONES = {
    warm:    { label: '💗 다정하게',   short: '다정한', reply: '와줘서 고마워요 💗' },
    playful: { label: '😆 장난스럽게', short: '장난스러운', reply: 'ㅋㅋㅋ 환영환영!' },
    serious: { label: '😎 담백하게',   short: '담백한', reply: '…좋은 글 고맙습니다.' }
  };
  var TONE_KEYS = ['warm', 'playful', 'serious'];

  // ── 탈덕 고민 글 제목 (본문은 팬마다 다름) ──
  var QUIT_TITLES = ['나 탈덕할까 고민중...', '요즘 마음이 좀 그래요', '계속 와도 되는 걸까요'];

  // ── 공통 글 ──
  var LEAVE_POST = ['탈덕합니다', '그동안 즐거웠어요. 다들 건강하세요. {idol} 앞길 응원할게요.'];
  var STAY_POST = ['남기로 했어요 ㅎㅎ', '{idol} 생각하니까 마음이 다시 정해졌어요. 계속 있을게요!'];
  var RETURN_POST = ['돌아왔어요', '다시 와봤어요. 소식 보니까 마음이 또 움직이네요. 잘 부탁해요.'];

  // ── 커뮤니티 반응 (바이럴) ──
  var VIRAL_QUOTES = [
    '얘 누구임?', 'CF에 나온 분 맞지?', '{brand} CF 그 사람 팬카페 어디예요',
    '목소리 뭐야 소름', '실검 1위 실화?', '이 사람 노래 있나요?', '나만 몰랐어?? 지금 입덕함'
  ];

  // ── 대표 팬 10명 (가입하는 순서대로) ──
  // tone: 이 팬이 좋아하는 답글 톤 / rate: 3시간마다 글을 쓸 확률
  // {idol} = 아이돌 이름, {n} = 그 팬의 글 번호, {brand} = CF 브랜드
  var ROSTER = [
    { id: 'veteran', nick: '첫눈이오면', label: '고인물', emoji: '🎖️', tone: 'serious', rate: 0.12, startAff: 70,
      hello: ['데뷔 때부터 팬이었어요', '이제야 카페가 생겼네요. 1호 팬 자리는 제가 지키겠습니다.'],
      posts: [
        ['데뷔 때부터 봤는데', '회원이 한 자리 숫자였던 시절이 엊그제 같네요. 계속 지켜볼게요.'],
        ['예전 무대 영상 다시 봄', '그때나 지금이나 {idol} 목소리는 그대로예요. 그게 좋음.'],
        ['신입 회원분들께', '어서 오세요. 여긴 천천히 오래 좋아하는 분위기예요. 부담 갖지 마세요.'],
        ['문득 생각났는데', '처음 {idol} 보고 가입 버튼 누르던 날이 아직도 기억나요.']
      ],
      cf: '{brand} CF 봤어요. 이제 시작이라고 생각해요. 계속 응원할게요.',
      quit: '처음부터 지켜봤는데 요즘은 잘 모르겠어요. 제가 필요한 사람인가 싶고...' },

    { id: 'daily', nick: '출석왕콩', label: '매일 오는 팬', emoji: '📅', tone: 'playful', rate: 0.13,
      hello: ['출석부 만들어도 되나요?', '가입했어요! 매일 출석할게요. 출석부 따로 만들어야 하나?'],
      posts: [
        ['출석체크 {n}번째', '오늘도 출석 완료! {idol} 오늘도 화이팅 ✨'],
        ['출석 {n}번째 ✋', '출석부에 도장 쾅. 다들 밥은 먹었나요?'],
        ['{n}번 출석했습니다', '이쯤 되면 출석이 아니라 생활 ㅋㅋ']
      ],
      cf: '{brand} CF 보고 출석도장 두 개 찍음 ㅋㅋ',
      quit: '출석도 {n}번 했는데 아무도 알아주질 않네요. 오늘이 마지막 출석일지도.' },

    { id: 'photo', nick: '찰칵찰칵', label: '금손 팬', emoji: '📸', tone: 'warm', rate: 0.10,
      hello: ['사진 담당 지원합니다', '카메라 들고 왔어요. 무대 사진 필요하면 불러주세요 📸'],
      posts: [
        ['오늘 찍은 사진 올려요 📸', '역광이었는데 {idol} 실루엣이 너무 예쁘게 나왔어요. 보정 안 했음!'],
        ['직캠 올립니다', '손 떨려서 흔들린 거 죄송... 그래도 표정은 놓치지 않았어요.'],
        ['사진 요청 받습니다', '찍고 싶은 장면 있으면 댓글 주세요. 금손까진 아니고 열정손 정도?']
      ],
      cf: '{brand} CF 화면 캡처했어요. 이 컷은 포스터로 나와야 해요 📸',
      quit: '사진 올려도 반응이 없네요. 제가 찍은 게 별로인가 봐요...' },

    { id: 'ghost', nick: '달토끼', label: '갑자기 안 오는 팬', emoji: '🌙', tone: 'serious', rate: 0.10,
      hello: ['가입은 했는데...', '글은 잘 못 쓰지만 응원은 하고 있어요.'],
      posts: [
        ['눈팅 중이에요', '조용히 구경만 하다 갑니다 ㅎㅎ'],
        ['오랜만에 글 써요', '요즘 자주 못 와서 미안해요. 그래도 {idol} 소식은 챙겨 보고 있어요.']
      ],
      back: ['오랜만이에요...', '한동안 못 왔네요. 그래도 {idol} 소식은 계속 챙겨 봤어요.'],
      cf: '{brand} CF 나왔더라? 잠깐 들렀어요.',
      quit: '사실 한동안 안 온 이유가 있는데... 그냥 조용히 떠날까 해요.' },

    { id: 'collector', nick: '포카부자', label: '포카 수집광', emoji: '🃏', tone: 'playful', rate: 0.12,
      hello: ['포카 모으는 사람 왔어요', '{idol} 포카 있으면 다 모으고 싶어서 가입했어요. 교환도 환영!'],
      posts: [
        ['포카 정리하다가', '바인더 한 권이 {idol} 카드로만 찼어요. 이제 두 번째 권 시작...'],
        ['교환 구해요 🃏', '{idol} 기본 카드 있으신 분? 제 중복이랑 바꿔요.'],
        ['포카 보관 팁', '슬리브 두 겹 끼우면 모서리 안 상해요. 이건 진짜 꿀팁.']
      ],
      cf: '{brand} CF 컷으로 포카 나오면 무조건 삽니다',
      quit: '포카 모으는 보람이 사라졌어요. 이쯤에서 정리할까 고민 중입니다.' },

    { id: 'concert', nick: '콘서트귀신', label: '공연마다 오는 팬', emoji: '🎫', tone: 'warm', rate: 0.08,
      hello: ['공연 정보 어디서 보나요?', '공연은 무조건 갈 사람입니다. 일정 나오면 알려주세요!'],
      posts: [
        ['이번 무대도 갑니다', '어디서 하든 일단 티켓팅부터. 전석 매진이어도 갑니다. 갈 거예요.'],
        ['무대 가는 길 🎫', '리허설부터 기다리는 중. 응원봉 배터리 새로 갈아 끼움.'],
        ['공연 후기 (장문)', '무대 위 {idol} 눈빛이 아직도 안 잊혀요. 후기 쓰다 새벽 됨.']
      ],
      cf: '{brand} CF에서도 눈빛이... 다음 무대 때 직접 보고 싶다',
      quit: '다음 공연도 가고 싶었는데, 이젠 잘 모르겠어요. 마음이 식은 건가...' },

    { id: 'voice', nick: '음색수집가', label: '목소리 덕후', emoji: '🎧', tone: 'warm', rate: 0.10,
      hello: ['목소리 때문에 왔습니다', '한 번 들었는데 안 잊혀서 검색하다 여기까지 왔어요.'],
      posts: [
        ['{idol} 목소리 분석 (비전문가)', '숨소리가 섞이는 구간이 있어요. 그래서 한 번 들으면 못 잊는 듯.'],
        ['자꾸 듣게 되는 목소리', '자기 전에 틀어놓는 용도로 시작했는데 이제 잠이 안 와요 ㅋㅋ'],
        ['음색 때문에 입덕', '처음 듣고 "이게 뭐지" 했는데 3일 뒤 가입했습니다.']
      ],
      cf: '{brand} CF에 나온 목소리 맞죠? 한 번에 알아봤어요',
      quit: '목소리가 좋아서 왔는데 요즘 소식이 없어서 지쳤어요.' },

    { id: 'lurker', nick: '눈팅만3년', label: '눈팅러', emoji: '👀', tone: 'warm', rate: 0, hello: null,
      posts: [],
      first: ['처음 글 써봅니다', '3년 눈팅하다 처음 써요. 항상 지켜보고 있었습니다. 고마워요, 답글 달아줘서.'],
      cf: null,
      quit: '눈팅만 하다 가려고요. 글 남기는 것도 처음이자 마지막일지도.' },

    { id: 'writer', nick: '밤하늘작가', label: '글쟁이 팬', emoji: '✍️', tone: 'serious', rate: 0.08,
      hello: ['글 쓰는 사람입니다', '가끔 {idol} 보고 떠오른 글 올려도 될까요?'],
      posts: [
        ['{idol} 모티브 짧은 글', '밤 호수 위에 서서 노래하는 사람의 이야기. 완성되면 올릴게요.'],
        ['오늘의 한 줄', '무대 조명이 꺼지면 노래만 남는다.'],
        ['이야기가 자꾸 떠올라요', '{idol} 노래를 들으면 장면이 먼저 보여요. 이거 병인가요 ㅋㅋ']
      ],
      cf: '{brand} CF 보고 단편 하나 떠올랐어요. 곧 올릴게요.',
      quit: '쓰던 글이 막혀서 더 못 쓰겠어요. 영감이 안 와요.' },

    { id: 'casual', nick: '친구따라왔어요', label: '라이트 팬', emoji: '🍀', tone: 'playful', rate: 0.08,
      hello: ['친구 따라 왔어요', '구경하러 왔는데 분위기 좋아서 가입했어요!'],
      posts: [
        ['질문 있어요', '{idol} 노래 추천 좀요. 처음 듣는 사람이 들을 만한 걸로!'],
        ['가입 인증 ✋', '여기 분위기 좋네요. 눌러앉겠습니다.'],
        ['요즘 이거 듣는 중', '친구가 틀어줬는데 계속 맴돌아요. 왜 이러죠 ㅋㅋ']
      ],
      cf: '{brand} CF 보고 알아봤어요! 연예인 맞죠?',
      quit: '별로 안 친한 사람들끼리 있는 느낌이라... 슬슬 접을까 해요.' }
  ];

  // ════════ 도우미 ════════
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fill(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] !== undefined ? vars[k] : m; });
  }
  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length) % arr.length]; }
  function toast(m) { if (typeof showBagToast === 'function') { try { showBagToast(m); } catch (e) {} } }
  function defOf(id) { for (var i = 0; i < ROSTER.length; i++) if (ROSTER[i].id === id) return ROSTER[i]; return null; }
  function idolName(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function varsFor(cid, extra) {
    var v = { idol: idolName(cid) };
    if (extra) for (var k in extra) v[k] = extra[k];
    return v;
  }
  function timeAgo(ts, now) {
    var min = Math.floor((now - ts) / 60000);
    if (min < 1) return '방금 전';
    if (min < 60) return min + '분 전';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + '시간 전';
    return Math.floor(hr / 24) + '일 전';
  }

  // ════════ 저장 ════════
  function loadAll() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.idols || typeof s.idols !== 'object') s.idols = {};
    return s;
  }
  function saveAllState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {} }

  function blankIdol(now) {
    return { openedAt: now, lastTick: now, lastCare: 0, lastCfTs: now, lastCfSuccess: 0,
             seenAt: 0, anon: 0, seq: 0, fans: {}, posts: [] };
  }
  function normalize(ic, now) {
    if (typeof ic.openedAt !== 'number') ic.openedAt = now;
    if (typeof ic.lastTick !== 'number') ic.lastTick = ic.openedAt;
    if (typeof ic.lastCare !== 'number') ic.lastCare = 0;
    if (typeof ic.lastCfTs !== 'number') ic.lastCfTs = ic.openedAt;
    if (typeof ic.lastCfSuccess !== 'number') ic.lastCfSuccess = 0;
    if (typeof ic.seenAt !== 'number') ic.seenAt = 0;
    if (typeof ic.anon !== 'number') ic.anon = 0;
    if (typeof ic.seq !== 'number') ic.seq = 0;
    if (!ic.fans || typeof ic.fans !== 'object') ic.fans = {};
    if (!Array.isArray(ic.posts)) ic.posts = [];
    return ic;
  }
  function getIdol(s, cid, now) {
    if (!s.idols[cid]) {
      var ic = blankIdol(now);
      s.idols[cid] = ic;
      addPost(ic, { ts: now, fanId: null, kind: 'sys', title: '☕ ' + idolName(cid) + ' 팬카페가 열렸어요',
                    body: '회원 1명 — 바로 나예요.\n활동하다 보면 사람들이 하나둘 찾아올 거예요.' });
    }
    return normalize(s.idols[cid], now);
  }

  // ════════ 게임 데이터 읽기 ════════
  function isDebuted(cid) {
    try {
      var a = JSON.parse(localStorage.getItem(AGENCY_KEY) || 'null');
      return !!(a && a.done && a.done[cid]);
    } catch (e) { return false; }
  }
  function readPosters() {
    try {
      var c = JSON.parse(localStorage.getItem(CF_KEY) || 'null');
      return c && Array.isArray(c.posters) ? c.posters : [];
    } catch (e) { return []; }
  }

  // ════════ 순수 로직 (화면 없이도 테스트 가능) ════════
  function members(ic) {
    var n = 1 + (ic.anon || 0);
    Object.keys(ic.fans).forEach(function (id) { if (ic.fans[id].status !== 'left') n++; });
    return n;
  }
  function namedActive(ic) {
    var n = 0;
    Object.keys(ic.fans).forEach(function (id) { if (ic.fans[id].status === 'active') n++; });
    return n;
  }
  function nextDef(ic) {
    for (var i = 0; i < ROSTER.length; i++) if (!ic.fans[ROSTER[i].id]) return ROSTER[i];
    return null;
  }
  function smallHearts(ic, rng) { return Math.floor(rng() * Math.min(25, members(ic)) * 0.6); }

  function addPost(ic, p) {
    ic.seq++;
    p.id = 'p' + ic.seq;
    if (typeof p.hearts !== 'number') p.hearts = 0;
    p.myHeart = false;
    p.replied = null;
    p.resolved = null;
    ic.posts.push(p);
    ic.posts.sort(function (a, b) { return b.ts - a.ts; });
    if (ic.posts.length > POST_MAX) {
      var drop = ic.posts.length - POST_MAX;
      for (var i = ic.posts.length - 1; i >= 0 && drop > 0; i--) {
        var q = ic.posts[i];
        if (q.kind === 'quit' && !q.resolved) continue;      // 진행 중인 탈덕 고민 글은 지우지 않음
        ic.posts.splice(i, 1); drop--;
      }
    }
    return p;
  }
  function postById(ic, id) {
    for (var i = 0; i < ic.posts.length; i++) if (ic.posts[i].id === id) return ic.posts[i];
    return null;
  }
  function pendingQuit(ic, fanId) {
    return ic.posts.some(function (p) { return p.kind === 'quit' && p.fanId === fanId && !p.resolved; });
  }

  function joinFan(ic, cid, def, ts, rng) {
    var fan = { aff: def.startAff || 50, status: 'active', joinedAt: ts, lastTouch: ts, lastDecay: 0, postCount: 0, warnAt: 0, awayAt: 0,
                ghostDone: false, lurkerBroke: false, knownTone: false, lastTpl: -1 };
    ic.fans[def.id] = fan;
    if (def.hello) {
      var v = varsFor(cid);
      addPost(ic, { ts: ts, fanId: def.id, kind: 'hello', title: fill(def.hello[0], v), body: fill(def.hello[1], v), hearts: smallHearts(ic, rng) });
    }
    return fan;
  }
  function regularPost(ic, cid, def, fan, ts, rng) {
    if (!def.posts || !def.posts.length) return;
    var idx = Math.floor(rng() * def.posts.length) % def.posts.length;
    if (def.posts.length > 1 && idx === fan.lastTpl) idx = (idx + 1) % def.posts.length;   // 같은 글 연속 방지
    fan.lastTpl = idx;
    fan.postCount++;
    var t = def.posts[idx], v = varsFor(cid, { n: fan.postCount });
    addPost(ic, { ts: ts, fanId: def.id, kind: 'post', title: fill(t[0], v), body: fill(t[1], v), hearts: smallHearts(ic, rng) });
  }
  function quitPost(ic, cid, def, fan, ts, rng) {
    var v = varsFor(cid, { n: Math.max(1, fan.postCount) });
    addPost(ic, { ts: ts, fanId: def.id, kind: 'quit', title: pick(QUIT_TITLES, rng), body: fill(def.quit, v), hearts: 0, expiresAt: ts + QUIT_WAIT });
    fan.warnAt = ts;
  }
  function leaveFan(ic, cid, fanId, ts) {
    var fan = ic.fans[fanId]; if (!fan || fan.status === 'left') return;
    fan.status = 'left'; fan.leftAt = ts;
    ic.posts.forEach(function (p) { if (p.kind === 'quit' && p.fanId === fanId && !p.resolved) p.resolved = 'left'; });
    var v = varsFor(cid);
    addPost(ic, { ts: ts, fanId: fanId, kind: 'leave', title: LEAVE_POST[0], body: fill(LEAVE_POST[1], v), hearts: 0 });
  }
  function stayFan(ic, cid, fanId, ts) {
    var fan = ic.fans[fanId]; if (!fan) return;
    fan.aff = STAY_AFF; fan.warnAt = ts; fan.lastTouch = ts;
    var v = varsFor(cid);
    addPost(ic, { ts: ts, fanId: fanId, kind: 'stay', title: STAY_POST[0], body: fill(STAY_POST[1], v), hearts: 0 });
  }
  function returnFan(ic, cid, fanId, ts) {
    var fan = ic.fans[fanId], def = defOf(fanId); if (!fan || !def) return;
    fan.status = 'active'; fan.aff = RETURN_AFF; fan.warnAt = ts; fan.lastTouch = ts;
    var t = def.back || RETURN_POST, v = varsFor(cid);
    addPost(ic, { ts: ts, fanId: fanId, kind: 'return', title: fill(t[0], v), body: fill(t[1], v), hearts: 0 });
  }

  // 3시간 한 번 — 가입 · 글 · 탈덕 고민 판정
  function doTick(ic, cid, t, rng) {
    // 1) 대답 없는 탈덕 고민 글 → 떠남
    ic.posts.slice().forEach(function (p) {
      if (p.kind === 'quit' && !p.resolved && p.expiresAt <= t) leaveFan(ic, cid, p.fanId, t);
    });
    // 2) 새 팬 가입
    var care = ic.lastCare > 0 && (t - ic.lastCare) < DAY;
    var cf = ic.lastCfSuccess > 0 && (t - ic.lastCfSuccess) < DAY;
    var chance = Math.min(JOIN_MAX, JOIN_BASE + (care ? JOIN_CARE : 0) + (cf ? JOIN_CF : 0));
    var nd = nextDef(ic);
    if (nd && Object.keys(ic.fans).length > 0 && rng() < chance) joinFan(ic, cid, nd, t, rng);
    // 3) 팬마다 행동
    ROSTER.forEach(function (def) {
      var fan = ic.fans[def.id];
      if (!fan || fan.status === 'left') return;

      if (def.id === 'ghost') {                              // 갑자기 안 오는 팬
        if (fan.status === 'away') {
          if (t - fan.awayAt >= GHOST_BACK_AFTER) returnFan(ic, cid, def.id, t);
          return;
        }
        if (!fan.ghostDone && t - fan.joinedAt >= GHOST_AWAY_AFTER) { fan.status = 'away'; fan.awayAt = t; fan.ghostDone = true; return; }
      }
      if (def.id === 'lurker') {                             // 눈팅러: 애착도가 높아지면 딱 한 번 글을 씀
        if (!fan.lurkerBroke && fan.aff >= LURKER_AFF && rng() < 0.5) {
          var vv = varsFor(cid);
          addPost(ic, { ts: t, fanId: def.id, kind: 'post', title: fill(def.first[0], vv), body: fill(def.first[1], vv), hearts: smallHearts(ic, rng) + 3 });
          fan.lurkerBroke = true;
        }
      } else if (rng() < def.rate) {
        regularPost(ic, cid, def, fan, t, rng);
      }
      // 탈덕 고민
      if (fan.status === 'active' && fan.aff <= QUIT_AFF && (t - fan.joinedAt) >= QUIT_GRACE &&
          (t - fan.warnAt) >= QUIT_COOLDOWN && !pendingQuit(ic, def.id) && rng() < QUIT_ROLL) {
        quitPost(ic, cid, def, fan, t, rng);
      }
    });
  }

  // 접속할 때 호출: 첫 팬 · 애착도 감소 · 쌓인 주기 처리
  function sync(ic, cid, now, rng) {
    rng = rng || Math.random;
    if (now < ic.lastTick) ic.lastTick = now;                      // 시계가 뒤로 갔을 때
    // 첫 팬
    if (Object.keys(ic.fans).length === 0 && now - ic.openedAt >= FIRST_FAN_DELAY) {
      joinFan(ic, cid, ROSTER[0], ic.openedAt + FIRST_FAN_DELAY, rng);
    }
    // 애착도 감소 — 팬마다 따로: 그 팬에게 ♥/답글을 안 한 지 DECAY_GRACE가 지나면 하루마다 조금씩
    Object.keys(ic.fans).forEach(function (id) {
      var f = ic.fans[id];
      if (f.status !== 'active') return;
      var touch = typeof f.lastTouch === 'number' ? f.lastTouch : f.joinedAt;
      var base = Math.max(touch + DECAY_GRACE, f.lastDecay || 0);
      var days = Math.floor((now - base) / DAY);
      if (days <= 0) return;
      var eff = Math.min(DECAY_MAX_DAYS, days);
      var next = f.aff - eff * DECAY_PER_DAY;
      f.aff = Math.max(Math.min(f.aff, DECAY_FLOOR), next);          // 이미 바닥 아래면 더 안 깎음
      f.lastDecay = days > DECAY_MAX_DAYS ? now : base + days * DAY;
    });
    // 쌓인 주기
    var n = Math.floor((now - ic.lastTick) / TICK_MS);
    if (n > 0) {
      var aligned = ic.lastTick + n * TICK_MS;
      var start = Math.max(ic.lastTick, aligned - MAX_TICKS * TICK_MS);
      for (var t = start + TICK_MS; t <= aligned; t += TICK_MS) doTick(ic, cid, t, rng);
      ic.lastTick = aligned;
    }
  }

  // CF 결과 반응 (cf-shoot.js가 저장한 포스터를 읽어서 처리)
  function handleCF(ic, cid, poster, rng) {
    var stars = Math.max(1, Math.min(3, poster.stars || 1));
    var ts = poster.ts || Date.now();
    var before = members(ic);
    var out = { viral: false, from: before, to: before, reacted: 0, joined: 0, returned: 0 };
    ic.lastCare = Math.max(ic.lastCare, ts);
    ic.lastCfSuccess = ts;
    var v = varsFor(cid, { brand: poster.brand || 'CF' });

    // 떠난 팬 / 뜸한 팬이 돌아옴
    Object.keys(ic.fans).forEach(function (id) {
      var f = ic.fans[id];
      if ((f.status === 'left' || f.status === 'away') && rng() < RETURN_CHANCE) { returnFan(ic, cid, id, ts); out.returned++; }
    });
    // 새 팬 가입 (맨 처음 팬도 CF 덕분에 바로 올 수 있음)
    var nd = nextDef(ic);
    if (nd && rng() < JOIN_ON_CF[stars]) { joinFan(ic, cid, nd, ts, rng); out.joined++; }
    // CF 반응 글
    var reactors = ROSTER.filter(function (d) { var f = ic.fans[d.id]; return f && f.status === 'active' && d.cf; });
    for (var i = 0; i < CF_REACT_MAX && reactors.length; i++) {
      var d = reactors.splice(Math.floor(rng() * reactors.length), 1)[0];
      addPost(ic, { ts: ts + (i + 1) * 1000, fanId: d.id, kind: 'cf', title: '[CF] ' + (poster.brand || '') + ' 봤어요', body: fill(d.cf, v), hearts: smallHearts(ic, rng) });
      out.reacted++;
    }
    // 바이럴
    if (rng() < VIRAL_CHANCE[stars]) {
      var gain = Math.round(15 + before * (3 + rng() * 6) + rng() * 40);
      ic.anon += gain;
      for (var k = 0; k < 2; k++) {
        var nd2 = nextDef(ic);
        if (nd2 && rng() < 0.7) { joinFan(ic, cid, nd2, ts, rng); out.joined++; }
      }
      var after = members(ic);
      var pool = VIRAL_QUOTES.slice(), quotes = [];
      while (quotes.length < 3 && pool.length) quotes.push(fill(pool.splice(Math.floor(rng() * pool.length), 1)[0], v));
      var pct = 120 + Math.floor(rng() * 360);
      addPost(ic, { ts: ts + 5000, fanId: null, kind: 'viral',
                    title: '📱 커뮤니티에서 ' + idolName(cid) + '이(가) 언급되고 있습니다',
                    body: quotes.map(function (q) { return '“' + q + '”'; }).join('\n') + '\n실시간 검색량 +' + pct + '%\n팬카페 ' + before + '명 → ' + after + '명',
                    hearts: 0 });
      out.viral = true;
    }
    out.to = members(ic);
    return out;
  }
  function processCF(ic, cid, rng) {
    rng = rng || Math.random;
    var list = readPosters().filter(function (p) { return p && p.charId === cid && p.ts > ic.lastCfTs; })
                            .sort(function (a, b) { return a.ts - b.ts; });
    var sum = { handled: 0, viral: false, from: null, to: null, reacted: 0, joined: 0, returned: 0 };
    list.forEach(function (p) {
      var r = handleCF(ic, cid, p, rng);
      ic.lastCfTs = p.ts;
      sum.handled++;
      if (sum.from === null) sum.from = r.from;
      sum.to = r.to;
      if (r.viral) sum.viral = true;
      sum.reacted += r.reacted; sum.joined += r.joined; sum.returned += r.returned;
    });
    return sum;
  }

  // ── 내가 하는 행동 ──
  function heartPost(ic, postId, now) {
    var p = postById(ic, postId); if (!p || p.myHeart || !p.fanId) return false;
    var fan = ic.fans[p.fanId]; if (!fan || fan.status === 'left') return false;
    p.myHeart = true; p.hearts++;
    fan.aff = Math.min(100, fan.aff + HEART_AFF);
    fan.lastTouch = now;
    ic.lastCare = Math.max(ic.lastCare, now);
    return true;
  }
  function replyPost(ic, postId, tone, now) {
    var p = postById(ic, postId); if (!p || p.replied || !p.fanId || p.kind === 'quit' || !TONES[tone]) return null;
    var fan = ic.fans[p.fanId], def = defOf(p.fanId);
    if (!fan || !def || fan.status === 'left') return null;
    var hit = def.tone === tone;
    fan.aff = Math.min(100, fan.aff + (hit ? TONE_HIT : TONE_MISS));
    fan.lastTouch = now;
    if (hit) fan.knownTone = true;
    p.replied = tone;
    ic.lastCare = Math.max(ic.lastCare, now);
    return { hit: hit };
  }
  function quitChance(def, fan, tone) {
    return Math.max(5, Math.min(95, QUIT_BASE[tone] + (def.tone === tone ? QUIT_PREF_BONUS : 0)));
  }
  function resolveQuit(ic, cid, postId, tone, now, rng) {
    rng = rng || Math.random;
    var p = postById(ic, postId); if (!p || p.kind !== 'quit' || p.resolved || !TONES[tone]) return null;
    var fan = ic.fans[p.fanId], def = defOf(p.fanId); if (!fan || !def) return null;
    var chance = quitChance(def, fan, tone);
    ic.lastCare = Math.max(ic.lastCare, now);
    fan.lastTouch = now;
    if (def.tone === tone) fan.knownTone = true;
    if (rng() * 100 < chance) { p.resolved = 'stayed'; p.replied = tone; stayFan(ic, cid, p.fanId, now); return { stayed: true }; }
    p.replied = tone;
    leaveFan(ic, cid, p.fanId, now);       // p.resolved = 'left'
    return { stayed: false };
  }

  // ════════ 화면 ════════
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BTN = 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT;
  var ui = { cid: null, tab: 'board', replyOpen: null, prevSeen: 0 };

  function signature(ic) { return members(ic) + '|' + ic.posts.length + '|' + (ic.posts[0] ? ic.posts[0].id : ''); }

  function openFanCafe(cid) {
    cid = cid || IDOLS[0];
    if (typeof CHARS === 'undefined' || !CHARS[cid]) return;
    if (!isDebuted(cid)) { toast('먼저 🎤 기획사에서 ' + idolName(cid) + '을(를) 데뷔시켜 주세요!'); return; }
    if (typeof closePlace === 'function') { try { closePlace(); } catch (e) {} }
    var s = loadAll(), now = Date.now(), ic = getIdol(s, cid, now);
    sync(ic, cid, now);
    processCF(ic, cid);
    ui.cid = cid; ui.tab = 'board'; ui.replyOpen = null; ui.prevSeen = ic.seenAt;
    ic.seenAt = now;
    saveAllState(s);
    var ov = document.getElementById('fancafe-overlay');
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'fancafe-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:750;background:linear-gradient(160deg,#150f26,#2a1745);overflow-y:auto;' + FONT;
    ov.onclick = onClick;
    document.body.appendChild(ov);
    render();
  }

  function fanAvatar(def, size) {
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:' + Math.floor(size * 0.55) + 'px;flex-shrink:0;">' + def.emoji + '</div>';
  }

  function postHtml(p, ic, now) {
    var fresh = p.ts > ui.prevSeen && ui.prevSeen > 0;
    var newTag = fresh ? '<span style="background:#FF6B9D;color:#fff;font-size:9px;font-weight:900;border-radius:6px;padding:1px 5px;margin-left:6px;">NEW</span>' : '';
    var def = p.fanId ? defOf(p.fanId) : null;
    var fan = p.fanId ? ic.fans[p.fanId] : null;
    var sys = !def;
    var border = p.kind === 'viral' ? '#FFD700' : p.kind === 'sys' ? '#60A5FA' : p.kind === 'quit' && !p.resolved ? '#FF6B6B' : 'rgba(255,255,255,0.1)';
    var bg = p.kind === 'viral' ? 'rgba(255,215,0,0.10)' : p.kind === 'quit' && !p.resolved ? 'rgba(255,107,107,0.10)' : 'rgba(255,255,255,0.06)';
    var head = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
      (sys ? '<div style="width:30px;height:30px;border-radius:50%;background:rgba(96,165,250,0.25);display:flex;align-items:center;justify-content:center;font-size:16px;">📢</div>' : fanAvatar(def, 30)) +
      '<div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:900;color:' + (sys ? '#93C5FD' : '#FFB3CC') + ';">' + (sys ? '알림' : esc(def.nick)) + newTag + '</div>' +
      (def ? '<div style="font-size:10px;color:#888;">' + esc(def.label) + '</div>' : '') + '</div>' +
      '<div style="font-size:11px;color:#888;">' + timeAgo(p.ts, now) + '</div></div>';
    var body = '<div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:4px;">' + esc(p.title) + '</div>' +
      '<div style="font-size:13px;color:#ddd;line-height:1.6;word-break:break-word;">' + esc(p.body).replace(/\n/g, '<br>') + '</div>';
    var foot = '';

    if (p.kind === 'quit') {
      if (!p.resolved) {
        var left = Math.max(0, p.expiresAt - now), hrs = Math.ceil(left / HOUR);
        var hint = fan && fan.knownTone && def ? '<div style="font-size:11px;color:#FFD700;margin-top:8px;">💡 ' + esc(def.nick) + '님은 ' + TONES[def.tone].short + ' 말투를 좋아해요</div>' : '';
        foot = '<div style="margin-top:10px;font-size:12px;color:#FF9A9A;font-weight:900;">⏰ ' + hrs + '시간 안에 붙잡지 않으면 떠나요</div>' + hint +
          '<div style="display:flex;gap:6px;margin-top:8px;">' + TONE_KEYS.map(function (k) {
            return '<button data-act="quit" data-id="' + p.id + '" data-tone="' + k + '" style="' + BTN + 'flex:1;padding:10px 4px;background:rgba(255,255,255,0.12);color:#fff;font-size:12px;">' + TONES[k].label + '</button>';
          }).join('') + '</div>';
      } else {
        foot = '<div style="margin-top:8px;font-size:12px;font-weight:900;color:' + (p.resolved === 'stayed' ? '#4ade80' : '#aaa') + ';">' + (p.resolved === 'stayed' ? '✅ 붙잡았어요' : '💔 떠났어요') + '</div>';
      }
    } else if (def && p.kind !== 'leave') {
      var gone = !fan || fan.status === 'left';
      var heartBtn = '<button data-act="heart" data-id="' + p.id + '" style="' + BTN + 'background:none;padding:4px 0;font-size:13px;color:' + (p.myHeart ? '#FF6B9D' : '#888') + ';">' + (p.myHeart ? '💖' : '🤍') + ' ' + p.hearts + '</button>';
      var replyArea = '';
      if (p.replied) {
        replyArea = '<div style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.06);border-radius:10px;font-size:12px;color:#ccc;">↳ 나: ' + esc(TONES[p.replied].reply) + '</div>';
      } else if (!gone) {
        if (ui.replyOpen === p.id) {
          replyArea = '<div style="display:flex;gap:6px;margin-top:8px;">' + TONE_KEYS.map(function (k) {
            return '<button data-act="reply" data-id="' + p.id + '" data-tone="' + k + '" style="' + BTN + 'flex:1;padding:9px 4px;background:rgba(192,132,252,0.22);color:#fff;font-size:12px;">' + TONES[k].label + '</button>';
          }).join('') + '</div>';
        }
      }
      var replyBtn = (!p.replied && !gone) ? '<button data-act="replytoggle" data-id="' + p.id + '" style="' + BTN + 'background:none;padding:4px 0;font-size:13px;color:#C084FC;">💬 답글</button>' : '';
      foot = '<div style="display:flex;gap:16px;margin-top:8px;">' + (gone ? '<span style="font-size:13px;color:#666;">🤍 ' + p.hearts + '</span>' : heartBtn) + replyBtn + '</div>' + replyArea;
    }
    return '<div style="background:' + bg + ';border:1.5px solid ' + border + ';border-radius:14px;padding:14px;margin-bottom:10px;">' + head + body + foot + '</div>';
  }

  function fansHtml(ic) {
    var rows = '', unmet = 0;
    ROSTER.forEach(function (def) {
      var fan = ic.fans[def.id];
      if (!fan) { unmet++; return; }
      var st = fan.status === 'active' ? '<span style="color:#4ade80;">🟢 활동 중</span>' : fan.status === 'away' ? '<span style="color:#93C5FD;">🌙 요즘 안 보여요</span>' : '<span style="color:#888;">💔 탈덕</span>';
      var aff = Math.max(0, Math.min(100, Math.round(fan.aff)));
      var color = aff >= 60 ? '#4ade80' : aff > QUIT_AFF ? '#FFD700' : '#FF6B6B';
      var tone = fan.knownTone ? '💡 ' + TONES[def.tone].short + ' 말투를 좋아해요' : '💡 취향을 아직 몰라요 (답글로 알아가 봐요)';
      rows += '<div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:12px;margin-bottom:8px;' + (fan.status === 'left' ? 'opacity:0.55;' : '') + '">' +
        fanAvatar(def, 44) +
        '<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:900;color:#fff;">' + esc(def.nick) + ' <span style="font-size:11px;color:#C084FC;font-weight:700;">' + esc(def.label) + '</span></div>' +
        '<div style="font-size:11px;margin-top:2px;">' + st + '</div>' +
        '<div style="height:6px;background:rgba(255,255,255,0.12);border-radius:3px;margin-top:6px;overflow:hidden;"><div style="height:100%;width:' + aff + '%;background:' + color + ';"></div></div>' +
        '<div style="font-size:10px;color:#999;margin-top:4px;">애착도 ' + aff + ' · ' + tone + '</div></div></div>';
    });
    if (unmet > 0) {
      rows += '<div style="text-align:center;font-size:12px;color:#888;padding:14px 0;">아직 만나지 못한 대표 팬 ' + unmet + '명…<br>활동하면 하나둘 찾아와요 ✨</div>';
    }
    return rows;
  }

  function render() {
    var ov = document.getElementById('fancafe-overlay');
    if (!ov || !ui.cid) return;
    var cid = ui.cid, s = loadAll(), now = Date.now(), ic = getIdol(s, cid, now);
    var total = members(ic), named = namedActive(ic);
    var alone = Object.keys(ic.fans).length === 0;
    var wait = alone ? Math.max(1, Math.ceil((FIRST_FAN_DELAY - (now - ic.openedAt)) / 60000)) : 0;

    var summary = total === 1
      ? '<div style="font-size:13px;color:#ddd;line-height:1.6;">회원 한 명… 바로 나예요 🥲<br><span style="font-size:12px;color:#aaa;">활동하면 사람들이 하나둘 찾아와요. (🎬 CF 촬영이 제일 빨라요)' + (alone ? '<br>첫 팬이 올 때까지 약 ' + wait + '분…' : '') + '</span></div>'
      : '<div style="font-size:12px;color:#aaa;">대표 팬 ' + named + '명 활동 중 · 이름 없는 회원 ' + (ic.anon || 0) + '명</div>';

    var tabBtn = function (key, label) {
      var on = ui.tab === key;
      return '<button data-act="tab" data-tab="' + key + '" style="' + BTN + 'flex:1;padding:10px;background:' + (on ? 'linear-gradient(135deg,#FF6B9D,#C084FC)' : 'rgba(255,255,255,0.08)') + ';color:' + (on ? '#fff' : '#aaa') + ';font-size:13px;">' + label + '</button>';
    };

    var content = ui.tab === 'board'
      ? (ic.posts.length ? ic.posts.map(function (p) { return postHtml(p, ic, now); }).join('') : '<div style="text-align:center;color:#888;font-size:13px;padding:40px 0;">아직 글이 없어요</div>')
      : fansHtml(ic);

    ov.innerHTML = '<div style="max-width:430px;margin:0 auto;padding:18px 16px 40px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">' +
      '<div style="font-size:19px;font-weight:900;color:#fff;">☕ ' + esc(idolName(cid)) + ' 팬카페</div>' +
      '<button data-act="close" style="' + BTN + 'padding:8px 14px;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;">닫기</button></div>' +
      '<div style="background:linear-gradient(135deg,rgba(255,107,157,0.18),rgba(192,132,252,0.18));border:1.5px solid #C084FC;border-radius:16px;padding:14px;margin-bottom:14px;">' +
      '<div style="font-size:12px;color:#aaa;">회원 수</div><div style="font-size:28px;font-weight:900;color:#FFD700;margin-bottom:6px;">👥 ' + total.toLocaleString() + '명</div>' + summary + '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:14px;">' + tabBtn('board', '📋 게시판') + tabBtn('fans', '🧑‍🤝‍🧑 팬 명단') + '</div>' +
      content + '</div>';
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id'), tone = t.getAttribute('data-tone');
    var cid = ui.cid, now = Date.now();
    if (act === 'close') { var ov = document.getElementById('fancafe-overlay'); if (ov) ov.remove(); return; }
    if (act === 'tab') { ui.tab = t.getAttribute('data-tab'); ui.replyOpen = null; render(); return; }
    if (act === 'replytoggle') { ui.replyOpen = ui.replyOpen === id ? null : id; render(); return; }
    var s = loadAll(), ic = getIdol(s, cid, now);
    if (act === 'heart') { heartPost(ic, id, now); }
    else if (act === 'reply') {
      var r = replyPost(ic, id, tone, now);
      ui.replyOpen = null;
      if (r) toast(r.hit ? '✨ 취향 저격! 애착도가 크게 올랐어요' : '💬 답글을 남겼어요');
    } else if (act === 'quit') {
      var q = resolveQuit(ic, cid, id, tone, now);
      if (q) toast(q.stayed ? '🥹 마음을 돌렸어요!' : '💔 결국 떠났어요…');
    }
    saveAllState(s);
    render();
  }

  // ════════ 살아 있는 카페: CF 결과 · 첫 팬 가입을 실시간으로 반영 ════════
  function live() {
    if (typeof document !== 'undefined' && document.hidden) return;
    var s = loadAll(), now = Date.now(), changedAny = false, toastMsg = null;
    IDOLS.forEach(function (cid) {
      if (!s.idols[cid] || typeof CHARS === 'undefined' || !CHARS[cid]) return;
      var ic = normalize(s.idols[cid], now), sig = signature(ic), hadFans = Object.keys(ic.fans).length > 0;
      sync(ic, cid, now);
      var cf = processCF(ic, cid);
      if (signature(ic) !== sig) {
        changedAny = true;
        if (cf.handled) toastMsg = cf.viral ? '📱 커뮤니티에서 화제! 팬카페 ' + cf.from + '명 → ' + cf.to + '명' : '☕ 팬카페에 CF 반응 글이 올라왔어요';
        else if (!hadFans && Object.keys(ic.fans).length > 0) toastMsg = '☕ 팬카페에 첫 회원이 찾아왔어요!';
      }
    });
    if (changedAny) {
      saveAllState(s);
      if (toastMsg && !document.getElementById('fancafe-overlay')) toast(toastMsg);
      render();
    }
  }
  setInterval(live, 5000);

  window.openFanCafe = openFanCafe;
  window.__fancafeTest = {
    ROSTER: ROSTER, TONES: TONES, STORAGE_KEY: STORAGE_KEY, loadAll: loadAll, saveAllState: saveAllState, getIdol: getIdol,
    sync: sync, processCF: processCF, handleCF: handleCF, members: members, heartPost: heartPost, replyPost: replyPost,
    resolveQuit: resolveQuit, quitChance: quitChance, live: live, open: openFanCafe, isDebuted: isDebuted,
    CONST: { TICK_MS: TICK_MS, MAX_TICKS: MAX_TICKS, FIRST_FAN_DELAY: FIRST_FAN_DELAY, QUIT_AFF: QUIT_AFF, QUIT_WAIT: QUIT_WAIT,
             QUIT_GRACE: QUIT_GRACE, DAY: DAY, HOUR: HOUR, POST_MAX: POST_MAX }
  };

  // ── 주택가 메뉴에 버튼 붙이기 ──
  var hookTries = 0;
  (function hookHousingMenu() {
    hookTries++;
    var anchor = document.getElementById('btn-explore-housing');
    if (!anchor || typeof PLACE_BUTTONS === 'undefined' || typeof ALL_PLACE_BTNS === 'undefined' || typeof CHARS === 'undefined') {
      if (hookTries < 400) setTimeout(hookHousingMenu, 50);
      return;
    }
    if (document.getElementById('btn-fancafe-housing')) return;
    var b = document.createElement('button');
    b.id = 'btn-fancafe-housing';
    b.textContent = '☕ ' + idolName(IDOLS[0]) + ' 팬카페';
    b.style.cssText = 'display:none;width:100%;padding:14px;margin-top:10px;background:rgba(255,179,128,0.18);border:1.5px solid #FFB380;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;' + FONT;
    b.onclick = function () { openFanCafe(IDOLS[0]); };
    anchor.insertAdjacentElement('afterend', b);
    if (!PLACE_BUTTONS.housing) PLACE_BUTTONS.housing = [];
    if (PLACE_BUTTONS.housing.indexOf('btn-fancafe-housing') === -1) PLACE_BUTTONS.housing.push('btn-fancafe-housing');
    if (ALL_PLACE_BTNS.indexOf('btn-fancafe-housing') === -1) ALL_PLACE_BTNS.push('btn-fancafe-housing');
  })();
})();
