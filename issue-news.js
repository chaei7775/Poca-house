// ════════════════════════════════
// 📰 포카일보 · 아이돌 이슈 (issue-news.js)
// "하루 보내기"로 날짜가 넘어갈 때마다 가끔(기본 35%) 데뷔한 아이돌의 찌라시/기사 팝업이 뜬다.
//  · 기사 제목 + 선택지 3개 → 고르면 후속 기사 + 컨디션(비주얼·체력·기분)/코인이 바뀐다. 정답은 없고, 일부 선택은 운(도박)이 섞여 있다.
//  · 하루(게임 속 1일)에 최대 1번, 데뷔한 아이돌이 1명 이상일 때만. 하루 보내기 / 드라마 촬영 끝 / 기획사 정산 / 탐험 끝 / 야식 들킴 중 먼저 오는 하나만 뜬다.
//  · 식사에서 "야식 들킴!"이 터지면(meal.js → 'ph-sneak-caught' 이벤트) 그 직후 야식 전용 기사(SNEAK)가 이어서 뜬다.
//  · 선택 결과에 따라 팬카페 '이름 없는 회원' 수도 소폭 오르내린다(탈덕·애착도에는 손대지 않음).
//  · 컨디션은 meal.js 의 'ph_meal' 수치를 그대로 바꾼다 → 드라마 촬영/기획사 정산에 반영됨.
// 저장: localStorage 'ph_issue' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 기사를 더 늘리고 싶으면 아래 GENERIC(모든 아이돌) / BY_IDOL(아이돌별)에 한 덩어리만 추가하면 됨.
//   fx: v=비주얼 s=체력 m=기분 c=코인 f=팬카페 회원수(생략하면 기분·비주얼에서 자동 계산) / risk: { p: 반전 확률, r: 반전 후속기사, fx: 반전 효과 }
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_issue';
  var CHANCE = 0.4;          // 하루 보내기 때 (하루 1번 슬롯을 쓸 확률)
  var EXTRA_CHANCE = 0.3;    // 드라마 촬영 끝 / 기획사 정산 / 탐험 끝 때 (슬롯이 비어 있을 때만)
  var EXTRA_GAP_MS = 90000;  // 추가 발생 최소 간격
  var SNEAK_BYPASS_CAP = true;  // true 면 야식 들킴 기사는 하루 1번 제한을 무시하고 항상 뜸
  var POLL_MS = 1500;
  var STAT_MULT = 2;      // 기사 효과 배율: 비주얼·체력·기분 (아래 기사 숫자 × 이 값)
  var COIN_MULT = 2;      // 기사 효과 배율: 코인 (기존 4 → 2)
  var COIN_LOSS_CAP = 3000;  // 한 번의 선택으로 잃는 코인 상한
  var COIN_GAIN_CAP = 8000;  // 한 번의 선택으로 버는 코인 상한
  var FAN_MIN = -2, FAN_MAX = 3; // 팬카페 이름 없는 회원 증감 범위(소폭)
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  // ── 기사 ──
  var GENERIC = [
    { id: 'ramen', head: '🚨 [단독] 연성고 연습생 {n}, 새벽 편의점 컵라면 3개 폭식 현장 포착… 팬덤 충격', sub: '"국물까지 다 드시더라고요" 목격자 증언',
      ch: [
        { l: '피부 관리 해야지! 야식 금지령', r: '"야식 끊겠다" 선언한 {n}… 팬들 "참아줘서 고맙다" 응원 물결', fx: { v: 5, m: -10 } },
        { l: '맛있게 먹었으면 됐다', r: '{n}의 먹방 짤 확산… "먹을 때 제일 귀엽다" 반응 폭발', fx: { v: -2, m: 20 } },
        { l: '소속사 공식입장: "곡 영감을 얻는 과정"', r: '소속사 "영감 얻는 중" 입장문… "갓벽 대처" 칭찬 릴레이', fx: { v: 3, m: 8, c: -2000 } } ] },
    { id: 'date', head: '⚡ [속보] {n}, 심야에 정체불명의 인물과 포착? 알고 보니…', sub: '"모자 쓴 두 사람이 골목을 걸었다" 커뮤니티 발칵',
      ch: [
        { l: '즉각 해명 영상을 올린다', r: '"그냥 매니저님이었어요" 해명에 팬들 "빠른 대처 감사"', fx: { v: 2, m: -5, c: -1000 } },
        { l: '무대응으로 일관', r: '무대응 이틀째… 추측글은 시들해졌다', fx: { m: 5, s: -3 } },
        { l: '유머로 받아친다 (운 50%)', r: '"그분은 제 치킨 배달원" 드립이 대박! 연예 뉴스 1면', fx: { m: 15, v: 5 }, risk: { p: 0.5, r: '유머가 선 넘었다며 일부 팬이 불편함을 토로… 사과문 게시', fx: { m: -12, v: -3 } } } ] },
    { id: 'fashion', head: '📰 [포착] {n}, 출근길 공항 패션 화제 "그 후드티 어디 거?" 품절 대란', sub: '온라인 쇼핑몰 서버 마비… 브랜드 측 "문의 폭주"',
      ch: [
        { l: '협찬 문의에 답한다', r: '브랜드와 협찬 계약 성사! 광고 수익이 들어왔다', fx: { c: 4000, s: -5 } },
        { l: '그냥 즐긴다', r: '"우연히 입은 건데요?" {n}의 쑥스러운 반응에 팬들 심쿵', fx: { m: 10 } },
        { l: '패션 화보 촬영을 제안', r: '화보 컷 공개! "비주얼 미쳤다" 호평', fx: { v: 10, s: -8 } } ] },
    { id: 'late', head: '📰 [포착] {n}, 연습실 5분 지각… "졸린 얼굴" 직캠 하루 만에 20만 뷰', sub: '"눈 비비는 모습이 너무 귀엽다" 댓글 폭주',
      ch: [
        { l: '단호하게 주의를 준다', r: '"반성 중입니다" {n}의 자필 사과… 팬들 "착하다"', fx: { m: -12, s: 3 } },
        { l: '간식을 챙겨준다', r: '"배고팠던 거였네" 간식 먹는 영상에 팬들 폭소', fx: { m: 12, c: -1000 } },
        { l: '직캠에 응원 댓글을 단다', r: '소속사 공식 계정의 댓글이 화제! "이 기획사 최고"', fx: { v: 6, m: 6 } } ] },
    { id: 'cam', head: '🚨 [화제] {n} 팬싸 직캠 100만 뷰… "손가락 하트" 밈으로 번졌다', sub: '일반인도 따라 하는 챌린지 열풍',
      ch: [
        { l: '공식 챌린지를 연다', r: '챌린지 참여 인원 폭증! 광고 문의까지 이어졌다', fx: { c: 5000, s: -10 } },
        { l: '조용히 즐긴다', r: '"저도 따라 해봤어요" {n}의 한마디에 팬들 환호', fx: { m: 12 } },
        { l: '광고 문의에 응답', r: '화장품 광고 계약! 촬영 일정이 조금 늘었다', fx: { c: 3000, v: 3, s: -4 } } ] },
    { id: 'rumor', head: '🚨 [논란] {n}에 대한 근거 없는 루머 글 확산 "인성 논란 있대"', sub: '출처 불명의 글에 팬카페 술렁',
      ch: [
        { l: '정면 대응 (운 50%)', r: '증거 자료까지 공개하며 루머 일축! 팬들 "속이 시원하다"', fx: { m: 10, v: 3, c: -1500 }, risk: { p: 0.5, r: '대응이 오히려 논란을 키웠다… 며칠 뒤 잠잠해짐', fx: { m: -12, c: -1500 } } },
        { l: '무시한다', r: '시간이 지나자 루머는 사그라들었다', fx: { m: -3 } },
        { l: '입덕 계기 영상을 공개', r: '"역시 이 맛에 입덕" 팬들이 직접 반박글을 올려줬다', fx: { m: 10, v: 4 } } ] },
    { id: 'mic', head: '📰 [포착] {n}, 라이브 중 마이크 켜진 채 혼잣말 노출… "귀엽다" 반응', sub: '"아 배고프다…" 한마디가 짤로 확산',
      ch: [
        { l: '사과 영상을 올린다', r: '정중한 사과에 팬들 "그럴 수도 있지" 위로', fx: { m: -5 } },
        { l: '밈으로 받아들인다', r: '"배고프다" 자막 굿즈 요청이 쇄도! 팬덤이 들썩', fx: { m: 15, v: 2 } },
        { l: '웃어넘긴다', r: '다음 라이브에서 "배고프다" 외치는 {n}… 시청자 폭소', fx: { m: 8 } } ] },
    { id: 'night', head: '📰 [단독] {n}, 새벽까지 연습실 불 안 꺼져… "노력형 아이돌" 감동', sub: '경비 아저씨 "하루도 안 빠지고 오더라"',
      ch: [
        { l: '쉬라고 강제 휴식', r: '"푹 잤더니 날아갈 것 같아요" {n}의 근황에 팬들 안도', fx: { s: 15, m: -3 } },
        { l: '응원 도시락을 보낸다', r: '도시락 인증샷이 팬들 사이에서 화제! "대표님 사랑해요"', fx: { m: 10, s: 5, c: -1500 } },
        { l: '연습 영상을 공개', r: '연습 영상 조회수 폭발! "노력은 배신 안 한다" 응원 댓글', fx: { v: 8, s: -12 } } ] }
  ];
  var BY_IDOL = {
    sion: [
      { id: 'sion_roof', head: '📰 [포착] 시온, 밤마다 옥상에서 기타 치는 모습 포착… "목소리 장난 아니다"', sub: '주민 제보 "저도 모르게 창문 열고 들었어요"',
        ch: [
          { l: '앨범 영감이라며 홍보', r: '"옥상 라이브" 콘셉트 티저에 팬들 기대감 폭발', fx: { c: 3000, m: 5 } },
          { l: '방음 부스를 마련해준다', r: '"이제 마음껏 부를 수 있어요" 시온의 감사 인사', fx: { c: -2500, s: 10, m: 10 } },
          { l: '팬들에게 몰래 라이브', r: '깜짝 옥상 라이브가 전설이 됐다… 서버 터질 뻔', fx: { v: 4, m: 10, s: -6 } } ] }
    ],
    minjun: [
      { id: 'minjun_book', head: '📰 [포착] 민준, 도서관 심야 독서 목격담… "책 읽는 모습이 화보"', sub: '"조용히 책장 넘기는 소리가 설렜다" 제보',
        ch: [
          { l: '북토크를 제안', r: '북토크 신청 마감! "민준 추천 도서" 베스트셀러에 올랐다', fx: { v: 8, s: -8 } },
          { l: '책을 선물한다', r: '"고맙습니다. 열심히 읽을게요" 민준이 환하게 웃었다', fx: { c: -1500, m: 12 } },
          { l: '독서 사진을 업로드', r: '"책 읽는 얼굴 반칙" 게시물 좋아요 폭발', fx: { v: 10, m: 3 } } ] }
    ],
    doyun: [
      { id: 'doyun_rule', head: '🚨 [단독] 도윤 회의록 유출? "규칙은 공정해야 한다" 카리스마 어록 화제', sub: '학생회 시절 명언 모음이 커뮤니티를 달군다',
        ch: [
          { l: '해명 입장을 발표', r: '"그냥 제 소신이에요" 해명에도 어록은 계속 퍼진다', fx: { m: -5 } },
          { l: '밈으로 인정한다', r: '"규칙 하나 정해줄게" 말투가 유행어로 등극!', fx: { m: 12, v: 3 } },
          { l: '어록 콘텐츠를 제작', r: '"도윤의 규칙" 시리즈가 인기몰이! 광고 수익 발생', fx: { c: 4000, s: -8 } } ] }
    ],
    harin: [
      { id: 'harin_demo', head: '🚨 [속보] 하린, 새벽 막차 역에서 흥얼거린 신곡 데모 유출', sub: '"누가 녹음했냐" 커뮤니티 들썩',
        ch: [
          { l: '정식 공개를 서두른다', r: '앞당겨 낸 신곡이 차트 상위권에! 수익 발생', fx: { c: 5000, s: -10, m: 5 } },
          { l: '유출 삭제를 요청', r: '삭제는 됐지만 아쉬움을 토로하는 팬들이 많았다', fx: { m: -8, c: -1000 } },
          { l: '팬 반응을 지켜본다', r: '"이 노래 정식 발매 해주세요" 청원이 올라왔다', fx: { m: 10 } } ] }
    ],
    yuna: [
      { id: 'yuna_flower', head: '📰 [포착] 윤아, 꽃집 알바 인증샷 화제… "꽃보다 윤아"', sub: '꽃집 사장님 "손님이 몰려서 정신없어요"',
        ch: [
          { l: '꽃 화보를 촬영', r: '봄 콘셉트 화보 공개! "꽃밭이 걸어 다닌다" 호평', fx: { v: 10, s: -8 } },
          { l: '꽃다발 팬 이벤트', r: '선착순 꽃다발 이벤트에 팬들이 줄을 섰다!', fx: { c: -2000, m: 14 } },
          { l: '꽃집 사장님께 인사', r: '"윤아 덕분에 대박 났어요" 사장님이 답례를 건넸다', fx: { m: 8, c: 1500 } } ] }
    ],
    ara: [
      { id: 'ara_queen', head: '🚨 [화제] 아라, 무대 후 한마디 "오늘 주인공은 나" 역대급 카리스마 밈', sub: '"이 정도면 팬서비스" 칭찬과 걱정이 반반',
        ch: [
          { l: '표현을 순화하는 입장문', r: '"조금 과했네요" 순화 입장에 대중 반응은 잠잠해졌다', fx: { m: -6, v: 2 } },
          { l: '카리스마 콘셉트로 밀고 간다 (운 50%)', r: '"주인공은 나" 콘셉트 굿즈가 완판! 팬덤 환호', fx: { c: 4000, v: 6, m: -3 }, risk: { p: 0.5, r: '콘셉트가 과하다는 평이 있어 호불호가 갈렸다', fx: { m: -8 } } },
          { l: '웃으며 사과하는 영상', r: '"이 반전 매력 뭐야" 사과 영상이 오히려 호평', fx: { m: 12 } } ] }
    ]
  };

  // ── 야식 들킴 전용 기사 (meal.js 에서 야식을 먹다 들키면 이어서 뜬다) ──
  var SNEAK = [
    { id: 'sneak1', head: '🚨 [현장포착] {n}, 촬영장 구석에서 몰래 야식 먹다 스태프에게 덜미', sub: '"입에 뭘 문 채로 눈이 마주쳤어요" 현장 스태프 증언',
      ch: [
        { l: '"식단 지키겠습니다" 반성 영상', r: '자필 반성문에 팬들 "먹는 것도 사랑스러운데ㅠ" 오히려 응원', fx: { m: -4, v: 3, f: 2 } },
        { l: '"사실 저도 먹고 싶었다" 공감 드립 (운 60%)', r: '"야식은 인류의 적" 드립이 밈으로! 공감 댓글 폭발', fx: { m: 12, f: 3 }, risk: { p: 0.4, r: '"관리 안 하는 거냐"며 일부 팬이 서운함을 토로했다', fx: { m: -6, f: -1 } } },
        { l: '조용히 넘어간다', r: '화제는 하루 만에 식었다', fx: { m: 2 } } ] },
    { id: 'sneak2', head: '📰 [포착] {n}의 "한 입만" 직캠 확산… 입가에 양념이?', sub: 'CCTV 캡처가 커뮤니티를 점령 "범인은 이 얼굴"',
      ch: [
        { l: '식단 도시락 인증샷을 올린다', r: '"그래도 도시락 먹는 척하는 거 귀엽다" 반응이 이어졌다', fx: { v: 4, m: -3, c: -1000, f: 1 } },
        { l: '야식 먹방 콘텐츠로 승화', r: '"먹방 요정 {n}" 먹방 라이브 신청이 폭주했다!', fx: { m: 10, c: 2000, s: -3, f: 3 } },
        { l: '공식 입장: "다음엔 같이 먹어요"', r: '팬들과 야식 약속(?)이 화제… "대표님 센스" 칭찬', fx: { m: 8, v: -1, f: 2 } } ] }
  ];

  // ── 도우미 ──
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function mealState() { try { return JSON.parse(localStorage.getItem('ph_meal') || '{}') || {}; } catch (e) { return {}; } }
  function debuted() {
    try { var d = (JSON.parse(localStorage.getItem('ph_agency') || '{}') || {}).done || {}; return Object.keys(d).filter(function (k) { return d[k] && typeof CHARS !== 'undefined' && CHARS[k]; }); } catch (e) { return []; }
  }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function imgOf(cid) { try { return CHARS[cid].img || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fill(t, cid) { return String(t).replace(/\{n\}/g, nameOf(cid)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  var clamp = function (x) { return Math.max(0, Math.min(100, x)); };

  function pool(cid) { return GENERIC.concat(BY_IDOL[cid] || []); }

  // ── 하루 1번 슬롯 (게임 속 날짜 기준) ──
  function today() { return mealState().day; }
  function slotFree() { var d = today(); return d != null && load().shownDay !== d; }
  function markShown() { var s = load(); s.shownDay = today(); save(s); }
  function popupOpen() { return !!(document.getElementById('meal-event') || document.getElementById('issue-pop')); }

  // ── 팬카페 이름 없는 회원 수 (팬카페가 열린 아이돌만) ──
  function cafeStore() { try { return JSON.parse(localStorage.getItem('ph_fancafe') || 'null'); } catch (e) { return null; } }
  function hasCafe(cid) { var s = cafeStore(); return !!(s && s.idols && s.idols[cid] && typeof s.idols[cid] === 'object'); }
  function fanDelta(fx) {
    if (!fx) return 0;
    if (typeof fx.f === 'number') return Math.max(FAN_MIN, Math.min(FAN_MAX, fx.f));
    var raw = (fx.m || 0) * 0.6 + (fx.v || 0) * 0.4;
    return Math.max(FAN_MIN, Math.min(FAN_MAX, Math.round(raw / 4)));
  }
  function applyFans(cid, n) {
    if (!n || !hasCafe(cid)) return 0;
    var s = cafeStore(), ic = s.idols[cid];
    var before = typeof ic.anon === 'number' ? ic.anon : 0;
    ic.anon = Math.max(0, before + n);
    try { localStorage.setItem('ph_fancafe', JSON.stringify(s)); } catch (e) { return 0; }
    return ic.anon - before;
  }

  function applyFx(cid, fx) {
    fx = fx || {};
    if (fx.v || fx.s || fx.m) {
      var st = mealState(); if (!st.stat) st.stat = {};
      var s = st.stat[cid] || (st.stat[cid] = { v: 50, s: 50, m: 50 });
      if (fx.v) s.v = clamp((s.v == null ? 50 : s.v) + fx.v);
      if (fx.s) s.s = clamp((s.s == null ? 50 : s.s) + fx.s);
      if (fx.m) s.m = clamp((s.m == null ? 50 : s.m) + fx.m);
      try { localStorage.setItem('ph_meal', JSON.stringify(st)); } catch (e) {}
    }
    if (fx.c) {
      try { coins = Math.max(0, coins + fx.c); if (typeof saveAll === 'function') saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {}
    }
  }
  function scaled(fx) {
    if (!fx) return fx; var o = {};
    ['v', 's', 'm'].forEach(function (k) { if (fx[k]) o[k] = Math.round(fx[k] * STAT_MULT); });
    if (fx.c) o.c = Math.max(-COIN_LOSS_CAP, Math.min(COIN_GAIN_CAP, Math.round(fx.c * COIN_MULT / 500) * 500));
    return o;
  }
  function chips(fx) {
    var out = [];
    if (fx.v) out.push('✨ 비주얼 ' + (fx.v > 0 ? '+' : '') + fx.v);
    if (fx.s) out.push('💪 체력 ' + (fx.s > 0 ? '+' : '') + fx.s);
    if (fx.m) out.push('😊 기분 ' + (fx.m > 0 ? '+' : '') + fx.m);
    if (fx.c) out.push('🍔 ' + (fx.c > 0 ? '+' : '') + fx.c.toLocaleString());
    if (fx.fans) out.push('👥 팬 ' + (fx.fans > 0 ? '+' : '') + fx.fans);
    return out;
  }

  // ── 팝업 ──
  function show(cid, tpl) {
    var old = document.getElementById('issue-pop'); if (old) old.remove();
    markShown();                                                     // 오늘 기사 슬롯 사용
    var ov = document.createElement('div'); ov.id = 'issue-pop';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1250;background:rgba(0,0,0,.88);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    document.body.appendChild(ov);
    var img = imgOf(cid);
    var paper = 'background:#f4f1e8;color:#111;border-radius:6px;border:3px solid #111;box-shadow:0 0 0 3px #fff,0 10px 40px rgba(0,0,0,.6);';
    function front() {
      ov.innerHTML = '<div style="width:100%;max-width:340px;max-height:94vh;overflow-y:auto;' + paper + '">' +
        '<div style="background:#111;color:#fff;padding:7px 12px;display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:900;letter-spacing:1px;"><span>📰 포카일보</span><span style="color:#ff5c5c;">● 긴급</span></div>' +
        '<div style="padding:12px 14px 14px;">' +
        (img ? '<div style="position:relative;height:150px;overflow:hidden;border:2px solid #111;margin-bottom:10px;background:#bbb;"><img src="' + esc(img) + '" style="width:100%;height:100%;object-fit:cover;object-position:top;filter:grayscale(1) contrast(1.25) brightness(.9);" onerror="this.parentNode.style.display=\'none\'"><div style="position:absolute;right:6px;bottom:6px;background:rgba(0,0,0,.7);color:#fff;font-size:10px;padding:2px 6px;">※ 독자 제공 사진</div></div>' : '') +
        '<div style="font-size:19px;font-weight:900;line-height:1.35;margin-bottom:6px;">' + esc(fill(tpl.head, cid)) + '</div>' +
        '<div style="font-size:12px;color:#555;line-height:1.5;margin-bottom:12px;border-left:3px solid #c00;padding-left:8px;">' + esc(fill(tpl.sub, cid)) + '</div>' +
        '<div style="font-size:11px;font-weight:900;color:#c00;margin-bottom:6px;">대표님, 어떻게 하시겠어요?</div>' +
        tpl.ch.map(function (c, i) { return '<button data-i="' + i + '" style="display:block;width:100%;text-align:left;margin-bottom:7px;padding:11px 12px;border:2px solid #111;border-radius:8px;background:#fff;color:#111;font-size:13px;font-weight:900;cursor:pointer;' + FONT + '">' + (i + 1) + '. ' + esc(fill(c.l, cid)) + '</button>'; }).join('') +
        '</div></div>';
      ov.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { choose(+b.getAttribute('data-i')); }; });
    }
    function choose(i) {
      var c = tpl.ch[i], res = c.r, fx = c.fx, twist = false;
      if (c.risk && Math.random() < c.risk.p) { res = c.risk.r; fx = c.risk.fx; twist = true; }
      var raw = fx || {}; fx = scaled(fx);
      var fd = applyFans(cid, fanDelta(typeof raw.f === 'number' ? raw : { m: raw.m, v: raw.v }));
      applyFx(cid, fx);
      if (fd) fx.fans = fd;
      var s = load(); (s.log = s.log || []).unshift({ t: Date.now(), cid: cid, id: tpl.id, c: i, twist: twist }); s.log = s.log.slice(0, 30); s.count = (s.count || 0) + 1; save(s);
      var cs = chips(fx || {});
      ov.innerHTML = '<div style="width:100%;max-width:340px;' + paper + '">' +
        '<div style="background:#111;color:#fff;padding:7px 12px;font-size:12px;font-weight:900;letter-spacing:1px;">📰 포카일보 · 후속 보도</div>' +
        '<div style="padding:16px 14px 14px;">' + (twist ? '<div style="font-size:11px;font-weight:900;color:#c00;margin-bottom:6px;">⚠️ 예상 밖의 전개!</div>' : '') +
        '<div style="font-size:18px;font-weight:900;line-height:1.4;margin-bottom:12px;">' + esc(fill(res, cid)) + '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">' + cs.map(function (t) { return '<span style="font-size:11px;font-weight:900;padding:4px 8px;border-radius:10px;background:#111;color:#fff;">' + t + '</span>'; }).join('') + '</div>' +
        '<button id="issue-ok" style="width:100%;padding:12px;border:none;border-radius:8px;background:#111;color:#fff;font-size:14px;font-weight:900;cursor:pointer;' + FONT + '">확인</button></div></div>';
      ov.querySelector('#issue-ok').onclick = function () { ov.remove(); };
      try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play(twist ? 'reward' : 'cheer'); } catch (e) {}
    }
    try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play('pick'); } catch (e) {}
    front();
  }

  function fire(cid, tplId) {
    cid = cid || pick(debuted()); if (!cid) return false;
    var list = pool(cid), tpl = tplId ? list.concat(SNEAK).filter(function (t) { return t.id === tplId; })[0] : null;
    if (!tpl) {
      var s = load(), recent = (s.log || []).slice(0, 3).map(function (l) { return l.id; });
      var fresh = list.filter(function (t) { return recent.indexOf(t.id) < 0; });
      tpl = pick(fresh.length ? fresh : list);
    }
    show(cid, tpl); return true;
  }

  function fireIfFree(cid, tplId, bypass) {          // 하루 1번 제한 + 다른 팝업이 떠 있지 않을 때만
    if (popupOpen() || (!bypass && !slotFree())) return false;
    return fire(cid, tplId);
  }

  // ── 날짜가 넘어가면 가끔 발생 ──
  function tick() {
    var st = mealState(), day = st.day;
    if (!day) return;
    var s = load();
    if (s.lastDay == null) { s.lastDay = day; save(s); return; }      // 처음 켠 날은 발생 안 함
    if (day <= s.lastDay) { if (day < s.lastDay) { s.lastDay = day; save(s); } return; }
    s.lastDay = day; save(s);
    var ids = debuted(); if (!ids.length || Math.random() >= CHANCE) return;
    var cid = pick(ids);
    (function wait(n) {                                              // 다른 팝업(일정 정산 등)이 닫힌 뒤에 보여줌
      if (popupOpen()) { if (n < 40) setTimeout(function () { wait(n + 1); }, 800); return; }
      setTimeout(function () { fireIfFree(cid); }, 700);
    })(0);
  }
  setInterval(tick, POLL_MS);

  // ── 드라마 촬영 끝 / 기획사 정산 때도 가끔 발생 ──
  var lastExtra = 0, drShown = false;
  function extra() {
    var now = Date.now();
    if (!slotFree() || now - lastExtra < EXTRA_GAP_MS) return;      // 오늘 이미 떴으면 건너뜀
    var ids = debuted(); if (!ids.length || Math.random() >= EXTRA_CHANCE) return;
    lastExtra = now;
    var cid = pick(ids);
    setTimeout(function () { fireIfFree(cid); }, 1800);
  }

  // ── 식사에서 야식 들킴 → 바로 이어서 야식 기사 ──
  window.addEventListener('ph-sneak-caught', function (e) {
    var ids = debuted(); if (!ids.length) return;
    var cid = e && e.detail && e.detail.cid; if (ids.indexOf(cid) < 0) cid = pick(ids);
    var tplId = pick(SNEAK).id;
    (function wait(n) {
      if (popupOpen()) { if (n < 20) setTimeout(function () { wait(n + 1); }, 600); return; }
      fireIfFree(cid, tplId, SNEAK_BYPASS_CAP);
    })(0);
  });
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('#agency-claim');
    if (t) extra();
  }, true);
  setInterval(function () {
    var r = document.getElementById('dr-result');
    var shown = !!(r && !r.hidden && r.innerHTML.length > 20);
    if (shown && !drShown) extra();
    drShown = shown;
    // 탐험 결과 화면(숲·해변·연습실·뷰티·촬영 세트·스튜디오)이 새로 뜨면
    var hs = document.querySelectorAll('div[style*="font-size:18px;font-weight:900"]');
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (h.__issueSeen || !/탐험 끝!|완벽한 변신|변신 완료|완벽한 촬영/.test(h.textContent)) continue;
      h.__issueSeen = true; extra();
    }
  }, 800);

  window.__issueTest = { fire: fire, fireIfFree: fireIfFree, SNEAK: SNEAK, slotFree: slotFree, GENERIC: GENERIC, BY_IDOL: BY_IDOL, tick: tick, CHANCE: CHANCE, extra: extra, load: load };
})();
