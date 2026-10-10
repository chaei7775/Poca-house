// ════════════════════════════════════════════════════════════
// 💼 포카 인베스트 (invest.js) — 아이돌 활동을 돕는 보조루프 "투자"
//
// 규칙 요약
//  · 마을 맵 오른쪽 아래 건물 [포카 / 인베스트] (플레이어 Lv.20부터). 코인을 넣고 7일(게임 속 DAY 1~7) 동안 키운다.
//  · 하루는 "하루 보내기"(📅 스케줄·식사 관리 → meal.js 의 날짜)로 넘어간다. 실제 시간은 안 기다린다.
//  · 하루가 넘어갈 때마다: 가치가 조금 움직이고(투자처마다 성격이 다름) + 내가 한 아이돌 활동(드라마 촬영·CF·팬·공연장·앨범)이
//    "활동 보너스"로 가치에 더해지고 + 사건 카드가 한 장 도착한다 (선택지 2~3개, 안 고르면 첫 번째가 자동 선택).
//  · 언제든 팔 수 있다 (중도 매각은 -10%). DAY 7 만기에 정산하면 페널티 없음 + 잘되면 특별 배당(프리미엄 조각 등).
//  · 망해도 원금 전액 손실은 없다 (투자처마다 최저 회수율이 있음).
//  · 투자 한도는 플레이어 레벨로 정해진다. 데뷔 멤버 수 / 투자 등급은 새 투자처·슬롯을 연다.
//  · 정보 카드(📰): 매일 투자처마다 소문(호재)/악재가 뜰 때가 있고, 그 하루의 변동에 반영된다. 투자 시작 전에 보고 고를 수 있다.
//  · 투자 등급: 소액주주 → 주요 투자자 → 제작 파트너 → 대주주 (끝낸 투자 횟수). 한도·슬롯·최저 회수율이 좋아진다.
//
// ✏️ 고치는 법: 아래 [설정]의 숫자 / SECTORS(투자처) / EVENTS(사건 카드)만 바꾸면 됨.
// 저장: localStorage 'ph_invest' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 배경 그림: map-invest.png (없으면 어두운 사무실 색으로 대신 보임)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ───────── [설정] ─────────
  var KEY = 'ph_invest';
  var NEED_LEVEL = 20;                 // 플레이어 레벨 (보조 루프라 늦게 열림)
  var DAYS = 7;                        // 한 판의 길이 (게임 속 날짜)
  var SELL_PENALTY = 0.10;             // 만기 전에 팔면 가치에서 깎는 비율
  var MIN_PRINCIPAL = 10000;
  var MAX_LIMIT = 300000000;           // 한 판 투자금 절대 최대 (3억)
  var LIMITS = [[10, 100000], [15, 200000], [20, 400000], [25, 700000], [30, 3000000], [40, 7500000], [50, 300000000]];  // [플레이어 레벨, 한 판 최대 투자금] — 맨 끝(Lv.50)이 최대 3억
  var GRADES = [                       // 끝낸 투자 횟수(done)로 등급 결정
    { id: 0, name: '소액주주',   need: 0,  limit: 1.0,  slots: 1, floorAdd: 0,    emoji: '🪙' },
    { id: 1, name: '주요 투자자', need: 3,  limit: 1.15, slots: 2, floorAdd: 0.02, emoji: '💼' },
    { id: 2, name: '제작 파트너', need: 8,  limit: 1.3,  slots: 2, floorAdd: 0.04, emoji: '🎞️' },
    { id: 3, name: '대주주',     need: 15, limit: 1.5,  slots: 3, floorAdd: 0.06, emoji: '👑' }
  ];
  var ACT_K = 0.004;                   // 활동 점수 1점당 가치 상승(0.004 = 0.4%) — 투자처마다 하루 상한(actCap)이 있음
  var DIV_START = 1.20;                // 이 배율(원금 대비 최종 가치) 이상이면 특별 배당 가능
  var MAX_STEPS = 7;                   // 며칠을 한꺼번에 넘겨도 최대 이만큼만 진행
  var HIST_MAX = 12;
  // 🌟 투자 한정 포카 (능력치 없음, 수집용). 이름·확률은 여기서만 바꾸면 됨
  // aud: 오디션 후원에 나오는 연습생. 새 연습생은 여기에 한 줄 추가 + 그림 파일(img)만 넣으면 끝. 그림이 없으면 실루엣으로 보여요.
  // chance: 일반 투자 대박(minRatio 이상)일 때 나올 확률 (0 이면 오디션에서만)
  var LIMITED = [
    { id: 'ace',  name: '한정판 챔피언', real: '지민', sub: '코트 위의 에이스', img: 'limited-ace.jpg', minRatio: 1.45, chance: 0.12, aud: true },
    { id: 'luna', name: '한정판 루나', real: '루나', sub: '무대를 찢는 록 보컬', img: 'limited-luna.jpg', minRatio: 99, chance: 0, aud: true },
    { id: 'taeo', name: '한정판 태오', real: '태오', sub: '스트릿의 댄스 킹',   img: 'limited-taeo.jpg', minRatio: 99, chance: 0, aud: true },
    { id: 'pri',  name: '한정판 프리', real: '프리', sub: '벚꽃빛 요정 보컬',   img: 'limited-pri.jpg',  minRatio: 99, chance: 0, aud: true }
  ];
  var LIM_KEY = 'ph_invest_limited';
  function limLoad() { try { var d = JSON.parse(localStorage.getItem(LIM_KEY) || '{}'); return d && typeof d === 'object' ? d : {}; } catch (e) { return {}; } }
  function limSave(d) { try { localStorage.setItem(LIM_KEY, JSON.stringify(d)); } catch (e) {} }
  function limOf(id) { for (var i = 0; i < LIMITED.length; i++) if (LIMITED[i].id === id) return LIMITED[i]; return null; }
  function grantLimited(id) {
    var d = limLoad(); var e = d[id] || { n: 0, first: Date.now() }; e.n += 1; d[id] = e; limSave(d);
    try { if (typeof checkTitles === 'function') checkTitles(); } catch (er) {}
  }
  function limOwnedN() { var d = limLoad(); return LIMITED.filter(function (c) { return d[c.id] && d[c.id].n > 0; }).length; }
  var EV_UP_SCALE = 0.5;   // 사건 상승폭 보정 (경제 보호)
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  // 투자처. m=하루 평균 변동, sd=하루 흔들림, floor=최저 회수율(원금 대비), actCap=활동 보너스 하루 상한
  // w=활동 종류별 가중치 (dr 드라마 점수 / cf CF 포스터 / fans 새 팬 / ev 공연장 이벤트 / alb 앨범 / deb 데뷔)
  var SECTORS = {
    goods:   { id: 'goods',   emoji: '🎁', name: '굿즈 사업', risk: 1, m: 0.012, sd: 0.025, floor: 0.90, actCap: 0.04, piece: 1, minDebut: 0, minGrade: 0,
               tag: '저위험 · 초보용', desc: '굿즈를 만들어 파는 사업. 크게 오르지도 내리지도 않아요.',
               w: { dr: 0.25, cf: 0.25, fans: 0.25, ev: 0.25, alb: 0.25, deb: 0.25 } },
    drama:   { id: 'drama',   emoji: '🎬', name: '제작사', risk: 3, m: 0.022, sd: 0.060, floor: 0.55, actCap: 0.10, piece: 2, minDebut: 1, minGrade: 0, cast: true,
               tag: '중위험 · 드라마 연동', desc: '드라마 제작에 투자해요. 내가 찍은 드라마 시청률이 가치에 바로 반영돼요. 주연 아이돌을 골라요.',
               w: { dr: 1.0, cf: 0.3, fans: 0.3, ev: 0.2, alb: 0.2, deb: 0.3 } },
    concert: { id: 'concert', emoji: '🎪', name: '공연 기획', risk: 5, m: 0.040, sd: 0.110, floor: 0.45, actCap: 0.14, piece: 3, minDebut: 2, minGrade: 0,
               tag: '고위험 · 팬덤·공연 연동', desc: '콘서트 기획에 투자해요. 팬덤과 공연장 활동이 영향을 줘요. 크게 벌 수도, 크게 잃을 수도 있어요.',
               w: { dr: 0.2, cf: 0.5, fans: 1.0, ev: 1.0, alb: 0.2, deb: 0.3 } },
    album:   { id: 'album',   emoji: '💿', name: '앨범 제작', risk: 2, m: 0.030, sd: 0.050, floor: 0.60, actCap: 0.08, piece: 2, minDebut: 1, minGrade: 1, needAlbum: 1,
               tag: '중저위험 · 작곡 연동', desc: '앨범 제작에 투자해요. 작곡 테이블에서 만든 앨범·작곡노트가 영향을 줘요. (주요 투자자 등급부터)',
               w: { dr: 0.2, cf: 0.2, fans: 0.3, ev: 0.2, alb: 1.0, deb: 0.3 } },
    // 🎤 히든: 오디션 후원. 평소엔 안 보이다가 조건을 채우면 "비공개 투자 제안"으로 도착해요 (SECTOR_ORDER 에는 없음)
    audition: { id: 'audition', emoji: '🎤', name: '오디션 후원', risk: 5, m: 0, sd: 0, floor: 0, actCap: 0, piece: 3, minDebut: 0, minGrade: 3, hidden: true,
               tag: '히든 · 고위험 · 한정 포카', desc: '아직 아무도 모르는 연습생 3명의 서바이벌. 한 명을 후원해서 7일 뒤 1등이 되면 큰 수익과 한정 포카!',
               w: { dr: 0.5, cf: 0.8, fans: 1.0, ev: 1.0, alb: 1.0, deb: 0.5 } }
  };
  var SECTOR_ORDER = ['goods', 'drama', 'concert', 'album'];

  // 정보 카드 문구 (투자처마다). hot=호재, bad=악재
  var INFO = {
    goods:   { hot: ['아이돌 굿즈 수요가 계속 오르고 있어요', '한정 굿즈 예약이 폭주했어요', '팬들의 굿즈 인증샷이 SNS에서 화제예요'],
               bad: ['원단 가격이 올랐다는 소문이에요', '짝퉁 굿즈가 돌고 있어요', '배송 지연 불만이 늘고 있어요'] },
    drama:   { hot: ['청춘 드라마 반응이 심상치 않아요', '촬영장 비하인드가 화제가 됐어요', '주연 캐스팅 기사에 댓글이 폭발했어요'],
               bad: ['주연 배우 스케줄 논란이 있어요', '경쟁 드라마가 같은 시간대에 편성됐어요', '대본 유출 소문이 돌아요'] },
    concert: { hot: ['콘서트 티켓팅 대기열이 터졌어요', '해외 팬들의 문의가 쏟아지고 있어요', '무대 연출 티저가 화제예요'],
               bad: ['공연장 대관료가 오른다는 소문이에요', '장마철 기상 예보가 불안해요', '티켓 매크로 논란이 있어요'] },
    album:   { hot: ['음원 사이트 차트에 신인 급상승이 떴어요', '작곡가 컬래버 소식이 화제예요', '티저 음원이 숏폼에서 돌고 있어요'],
               bad: ['표절 의혹 글이 올라왔어요', '앨범 발매 일정이 겹쳤어요', '믹싱 지연 소문이 있어요'] }
  };

  // ───────── 사건 카드 ─────────
  // opts[0] 은 "그대로 둔다 / 안전" 쪽 — 안 고르고 하루를 넘기면 자동으로 이게 선택돼요.
  // outs: [[확률, 가치변화(%), 결과 문구], ...]   cost: 기본 투자금의 몇 % 를 더 낸다   up: 조건을 만족하면 outs 대신 쓰는 특별 결과
  // need 키: fans(팬 수) debut(데뷔 멤버 수) star(탑스타 수) fame(주연 인지도) album(작곡노트 칸 수) ev(공연장 이벤트 횟수) dr(이 투자 중 찍은 드라마 횟수)
  function O(label, sub, outs, extra) { var o = { label: label, sub: sub, outs: outs }; if (extra) { for (var k in extra) o[k] = extra[k]; } return o; }
  var EVENTS = [
    // ───── 굿즈 사업 ─────
    { id: 'g1', sec: 'goods', d: [2, 5], emoji: '📦', title: '사전 예약 폭주', text: '굿즈 사전 예약이 예상보다 빨리 차고 있어요!',
      opts: [ O('예정대로 생산', '안전', [[1, 4, '무난하게 팔렸어요.']]),
              O('물량을 늘린다', '추가 투자 8%', [[0.6, 15, '추가분까지 완판! 🎉'], [0.4, -6, '재고가 좀 남았어요.']], { cost: 8 }),
              O('한정판을 추가한다', '팬덤 5명 이상이면 특별 결과', [[0.5, 9, '한정판이 잘 나갔어요.'], [0.5, -3, '반응이 미지근했어요.']],
                { up: { need: { fans: 5 }, outs: [[0.85, 22, '팬들이 한정판을 싹쓸이했어요! ✨'], [0.15, 6, '꽤 팔렸어요.']] } }) ] },
    { id: 'g2', sec: 'goods', d: [2, 6], emoji: '🛍️', title: '팝업스토어 제안', text: '백화점에서 팝업스토어를 열자고 연락이 왔어요.',
      opts: [ O('정중히 거절', '안전', [[1, 2, '조용히 넘어갔어요.']]),
              O('작게 열어본다', '추가 투자 6%', [[0.65, 12, '줄 서서 사 갔어요!'], [0.35, -4, '유동인구가 적었어요.']], { cost: 6 }),
              O('아이돌 사인회와 함께', '데뷔 멤버 2명 이상이면 특별 결과', [[0.5, 10, '사인회 덕에 북적였어요.'], [0.5, -2, '준비가 어수선했어요.']],
                { cost: 6, up: { need: { debut: 2 }, outs: [[0.8, 24, '사인회 줄이 건물을 한 바퀴 돌았어요! ✨'], [0.2, 8, '성황이었어요.']] } }) ] },
    { id: 'g3', sec: 'goods', d: [3, 6], emoji: '🎀', title: '컬래버 제안', text: '인기 캐릭터와 컬래버 굿즈를 내자는 제안이 들어왔어요.',
      opts: [ O('이번엔 보류', '안전', [[1, 1, '다음을 기약했어요.']]),
              O('컬래버 진행', '추가 투자 10%', [[0.55, 18, '컬래버 굿즈가 대박!'], [0.45, -8, '라이선스 비용이 부담이었어요.']], { cost: 10 }) ] },
    { id: 'g4', sec: 'goods', d: [2, 6], emoji: '💌', title: '팬들의 응원 후기', text: '굿즈를 받은 팬들이 후기를 올리고 있어요.',
      opts: [ O('조용히 지켜본다', '안전', [[1, 3, '입소문이 조금 퍼졌어요.']]),
              O('후기 이벤트를 연다', '추가 투자 3%', [[0.7, 9, '후기 이벤트가 먹혔어요!'], [0.3, 0, '큰 반응은 없었어요.']], { cost: 3 }) ] },
    { id: 'g5', sec: 'goods', d: [3, 6], emoji: '📉', title: '원자재값 상승', text: '굿즈 제작 단가가 오르고 있어요.',
      opts: [ O('그냥 둔다', '위험', [[0.5, -7, '마진이 줄었어요.'], [0.5, -2, '그럭저럭 버텼어요.']]),
              O('다른 공장을 알아본다', '추가 투자 4%', [[0.7, 5, '더 싼 곳을 찾았어요!'], [0.3, -3, '품질이 아쉬워서 접었어요.']], { cost: 4 }) ] },
    { id: 'g6', sec: 'goods', d: [5, 6], crisis: true, emoji: '🔥', title: '창고 침수 위기', text: '비가 많이 와서 굿즈 창고에 물이 들어올 것 같아요!',
      opts: [ O('설마… 그냥 둔다', '위험', [[0.5, -15, '일부 굿즈가 젖어 버렸어요.'], [0.5, -3, '다행히 피해가 작았어요.']]),
              O('긴급 이전', '추가 투자 5%', [[0.85, 2, '무사히 옮겼어요!'], [0.15, -5, '이전 중에 일부가 상했어요.']], { cost: 5 }) ] },

    // ───── 제작사 (드라마) ─────
    { id: 'd1', sec: 'drama', d: [2, 4], emoji: '🎭', title: '캐스팅 제안', text: '조연 자리에 누구를 쓸지 감독이 물어봐요.',
      opts: [ O('감독에게 맡긴다', '안전', [[0.5, 4, '무난한 캐스팅이었어요.'], [0.5, 0, '평범했어요.']]),
              O('톱스타를 객원 섭외', '추가 투자 10%', [[0.5, 16, '객원 출연이 화제!'], [0.5, -9, '출연료만 나갔어요.']], { cost: 10,
                up: { need: { fame: 50 }, outs: [[0.85, 24, '주연의 인지도 덕에 톱스타가 흔쾌히 수락! ✨'], [0.15, 8, '무난하게 성사됐어요.']] } }),
              O('신인을 발탁', '대박 또는 무난', [[0.4, 18, '신인이 눈에 띄게 잘했어요!'], [0.6, -4, '아직 어설펐어요.']]) ] },
    { id: 'd2', sec: 'drama', d: [3, 5], emoji: '📺', title: '첫 방송 시청률', text: '첫 방송이 나갔어요. 시청률 반응은?',
      opts: [ O('반응을 지켜본다', '안전', [[0.5, 6, '입소문이 조금 돌았어요.'], [0.5, -4, '기대보다 낮았어요.']]),
              O('홍보 이벤트를 연다', '추가 투자 6%', [[0.65, 13, '홍보 효과가 좋았어요!'], [0.35, -3, '큰 효과는 없었어요.']], { cost: 6,
                up: { need: { dr: 2 }, outs: [[0.9, 21, '직접 찍은 촬영분이 홍보 영상으로 터졌어요! ✨'], [0.1, 9, '꽤 좋은 반응이었어요.']] } }) ] },
    { id: 'd3', sec: 'drama', d: [2, 5], emoji: '✍️', title: '대본 수정 요청', text: '작가가 결말을 바꾸고 싶어 해요.',
      opts: [ O('원안대로', '안전', [[1, 2, '무난하게 갔어요.']]),
              O('결말을 바꾼다', '도박', [[0.5, 17, '반전 결말이 화제예요!'], [0.5, -9, '시청자들이 아쉬워했어요.']]) ] },
    { id: 'd4', sec: 'drama', d: [4, 6], emoji: '🏆', title: '시상식 후보', text: '이번 드라마가 시상식 후보에 올랐어요!',
      opts: [ O('조용히 기다린다', '안전', [[0.6, 5, '후보에 오른 것만으로도 홍보가 됐어요.'], [0.4, 1, '무난했어요.']]),
              O('시상식 캠페인을 한다', '추가 투자 8%', [[0.5, 18, '수상까지 했어요! 🏆'], [0.5, -5, '아쉽게 수상은 못했어요.']], { cost: 8,
                up: { need: { star: 1 }, outs: [[0.8, 28, '탑스타 주연 덕에 대상까지! 🏆✨'], [0.2, 10, '수상은 못 했지만 화제였어요.']] } }) ] },
    { id: 'd5', sec: 'drama', d: [3, 6], emoji: '📰', title: '촬영장 비하인드', text: '촬영장 사진이 SNS에 퍼졌어요.',
      opts: [ O('그냥 둔다', '안전', [[0.6, 4, '분위기 좋아 보인다는 반응이에요.'], [0.4, -2, '스포일러라는 불만도 있었어요.']]),
              O('공식 비하인드 영상 공개', '추가 투자 4%', [[0.7, 11, '비하인드가 인기예요!'], [0.3, 1, '조회수가 아쉬워요.']], { cost: 4 }) ] },
    { id: 'd6', sec: 'drama', d: [5, 6], crisis: true, emoji: '💸', title: '제작비 초과', text: '마지막 촬영분에서 제작비가 크게 초과됐어요!',
      opts: [ O('예산 내에서 마무리', '위험', [[0.55, -12, '급하게 마무리해서 완성도가 떨어졌어요.'], [0.45, -3, '그럭저럭 끝냈어요.']]),
              O('추가 투자로 마무리', '추가 투자 12%', [[0.75, 7, '완성도 있게 마무리했어요!'], [0.25, -6, '돈은 썼는데 반응이 미적지근했어요.']], { cost: 12 }) ] },

    // ───── 공연 기획 ─────
    { id: 'c1', sec: 'concert', d: [2, 4], emoji: '🎟️', title: '티켓 판매 폭주', text: '예상보다 빠르게 전석 매진되고 있어요!',
      opts: [ O('예정대로 진행', '안전', [[1, 8, '무난하게 성공!']]),
              O('더 큰 공연장으로 변경', '추가 투자 12%', [[0.6, 24, '추가 좌석까지 매진! 🎉'], [0.4, -12, '큰 공연장이 텅 비어 보였어요.']], { cost: 12 }),
              O('VIP 패키지 출시', '팬 12명 이상이면 특별 결과', [[0.5, 12, 'VIP 패키지가 어느 정도 팔렸어요.'], [0.5, 1, '반응이 크지 않았어요.']],
                { up: { need: { fans: 12 }, outs: [[0.85, 32, 'PERFECT CHOICE! 팬덤이 VIP 패키지를 전량 구매했어요! ✨'], [0.15, 14, '꽤 잘 팔렸어요.']] } }) ] },
    { id: 'c2', sec: 'concert', d: [2, 5], emoji: '🎤', title: '게스트 출연 제안', text: '인기 가수가 게스트로 나오고 싶대요.',
      opts: [ O('이번엔 사양', '안전', [[1, 3, '단독 공연으로 가기로 했어요.']]),
              O('게스트 섭외', '추가 투자 10%', [[0.55, 20, '게스트 효과로 화제 폭발!'], [0.45, -7, '출연료가 부담이었어요.']], { cost: 10,
                up: { need: { debut: 3 }, outs: [[0.85, 28, '데뷔 멤버 라인업과 시너지 폭발! ✨'], [0.15, 10, '무난히 성공했어요.']] } }) ] },
    { id: 'c3', sec: 'concert', d: [3, 6], emoji: '🌧️', title: '우천 예보', text: '공연 당일 비 소식이 있어요.',
      opts: [ O('그대로 진행', '위험', [[0.5, -12, '비 때문에 관객이 줄었어요.'], [0.5, 4, '다행히 비가 안 왔어요!']]),
              O('우비 이벤트를 준비', '추가 투자 4%', [[0.8, 9, '우비 입은 팬들이 오히려 화제!'], [0.2, -2, '비가 안 와서 우비가 남았어요.']], { cost: 4 }) ] },
    { id: 'c4', sec: 'concert', d: [2, 5], emoji: '📣', title: 'SNS 챌린지', text: '공연 챌린지를 열면 퍼질 것 같아요.',
      opts: [ O('열지 않는다', '안전', [[1, 2, '조용히 넘어갔어요.']]),
              O('챌린지를 연다', '추가 투자 5%', [[0.6, 16, '챌린지가 바이럴됐어요!'], [0.4, -3, '참여자가 별로 없었어요.']], { cost: 5,
                up: { need: { fans: 8 }, outs: [[0.85, 24, '팬들이 앞다투어 챌린지에 참여했어요! ✨'], [0.15, 8, '꽤 퍼졌어요.']] } }) ] },
    { id: 'c5', sec: 'concert', d: [5, 6], crisis: true, emoji: '🚨', title: '무대 장비 문제', text: '공연 하루 전, 메인 무대 장비에 문제가 생겼어요!',
      opts: [ O('간이 무대로 강행', '비용 없음 · 위험', [[0.5, -14, '간이 무대 때문에 아쉬운 공연이 됐어요.'], [0.5, -2, '다행히 큰 문제 없이 지나갔어요.']]),
              O('긴급 수리', '추가 투자 15%', [[0.8, 6, '완벽하게 복구했어요!'], [0.2, -8, '수리했지만 시간이 모자랐어요.']], { cost: 15 }),
              O('공연 연기', '확정 손실', [[1, -10, '연기 발표에 일부 팬이 실망했어요. 다음 사건에서 만회할 수 있어요.']]) ] },
    { id: 'c6', sec: 'concert', d: [4, 6], emoji: '🎆', title: '앵콜 요청', text: '관객들이 앵콜을 외치고 있어요!',
      opts: [ O('예정대로 마무리', '안전', [[1, 5, '깔끔하게 마무리했어요.']]),
              O('앵콜 무대를 연다', '추가 투자 6%', [[0.65, 16, '앵콜이 레전드가 됐어요! 🎆'], [0.35, -4, '목이 상했어요…']], { cost: 6,
                up: { need: { ev: 8 }, outs: [[0.9, 26, '공연장에서 다져진 무대 감각으로 앵콜 대성공! ✨'], [0.1, 10, '앵콜이 좋았어요.']] } }) ] },

    // ───── 앨범 제작 ─────
    { id: 'a1', sec: 'album', d: [2, 4], emoji: '🎧', title: '음원 사전 공개', text: '티저 음원을 먼저 풀지 고민이에요.',
      opts: [ O('정식 발매까지 기다린다', '안전', [[1, 3, '기대감이 쌓였어요.']]),
              O('티저를 공개한다', '추가 투자 4%', [[0.65, 12, '티저가 숏폼에서 돌아요!'], [0.35, -3, '반응이 조용했어요.']], { cost: 4,
                up: { need: { album: 6 }, outs: [[0.85, 20, '작곡노트에 쌓인 곡들 덕에 티저 퀄리티가 훌륭했어요! ✨'], [0.15, 8, '반응이 좋았어요.']] } }) ] },
    { id: 'a2', sec: 'album', d: [3, 5], emoji: '🥇', title: '차트 진입 구간', text: '발매 직후 차트 순위가 결정돼요.',
      opts: [ O('자연스럽게 둔다', '안전', [[0.5, 6, '차트 중위권에 진입했어요.'], [0.5, 0, '순위권 밖이에요.']]),
              O('팬덤 스트리밍 요청', '추가 투자 5%', [[0.6, 15, '차트 상위권!'], [0.4, -3, '화력이 모자랐어요.']], { cost: 5,
                up: { need: { fans: 10 }, outs: [[0.85, 26, '팬들이 총공격! 차트 1위! 🥇✨'], [0.15, 10, '상위권 진입!']] } }) ] },
    { id: 'a3', sec: 'album', d: [2, 5], emoji: '📀', title: '피처링 제안', text: '유명 래퍼가 피처링을 하고 싶대요.',
      opts: [ O('정중히 사양', '안전', [[1, 2, '우리 색깔을 지키기로 했어요.']]),
              O('피처링을 받는다', '추가 투자 8%', [[0.55, 18, '피처링이 대박!'], [0.45, -7, '곡 분위기가 안 맞았어요.']], { cost: 8 }) ] },
    { id: 'a4', sec: 'album', d: [4, 6], emoji: '🎼', title: '타이틀곡 선택', text: '타이틀곡을 어떤 곡으로 할지 정해야 해요.',
      opts: [ O('안전한 곡', '안전', [[1, 5, '무난하게 사랑받았어요.']]),
              O('실험적인 곡', '대박 또는 쪽박', [[0.45, 20, '신선하다는 반응이에요!'], [0.55, -8, '대중성이 아쉬웠어요.']],
                { up: { need: { album: 10 }, outs: [[0.85, 28, '쌓아둔 작곡 감각으로 신의 한 수! ✨'], [0.15, 10, '반응이 괜찮았어요.']] } }) ] },
    { id: 'a5', sec: 'album', d: [5, 6], crisis: true, emoji: '⚠️', title: '표절 의혹', text: '타이틀곡에 대한 표절 의혹 글이 올라왔어요.',
      opts: [ O('무시한다', '위험', [[0.5, -14, '논란이 걷잡을 수 없이 커졌어요.'], [0.5, -4, '며칠 뒤 잠잠해졌어요.']]),
              O('해명 영상을 올린다', '추가 투자 5%', [[0.75, 4, '깔끔한 해명으로 정리됐어요.'], [0.25, -8, '해명이 역효과였어요.']], { cost: 5 }) ] },

    // ───── 공통 ─────
    { id: 'x1', sec: 'any', d: [2, 5], emoji: '🤝', title: '업계 파티 초대', text: '업계 관계자들이 모이는 파티에 초대받았어요.',
      opts: [ O('불참', '안전', [[1, 1, '조용히 쉬었어요.']]),
              O('참석한다', '추가 투자 4%', [[0.55, 10, '좋은 인맥을 쌓았어요!'], [0.45, -2, '별 소득은 없었어요.']], { cost: 4 }) ] },
    { id: 'x2', sec: 'any', d: [2, 6], emoji: '📈', title: '업계 호황', text: '엔터 업계 전반이 호황이라는 기사가 나왔어요.',
      opts: [ O('가치를 유지', '안전', [[1, 4, '시장 분위기를 탔어요.']]),
              O('추가 투자', '추가 투자 8%', [[0.7, 12, '타이밍이 좋았어요!'], [0.3, -4, '호황이 금방 식었어요.']], { cost: 8 }) ] },
    { id: 'x3', sec: 'any', d: [3, 6], emoji: '📉', title: '시장 위축', text: '광고 시장이 얼어붙었다는 소식이에요.',
      opts: [ O('버틴다', '위험', [[0.5, -8, '시장 분위기에 휩쓸렸어요.'], [0.5, -1, '큰 영향은 없었어요.']]),
              O('비용을 줄인다', '확정 소폭', [[1, -3, '허리띠를 졸라매서 버텼어요.']]) ] },
    { id: 'x4', sec: 'any', d: [2, 6], emoji: '💝', title: '팬들의 응원 메시지', text: '팬들이 응원 메시지를 보내줬어요.',
      opts: [ O('감사 인사만 전한다', '안전', [[1, 3, '훈훈하게 마무리됐어요.']]),
              O('팬미팅을 연다', '추가 투자 5%', [[0.7, 11, '팬미팅이 성공적이었어요!'], [0.3, -2, '준비가 부족했어요.']], { cost: 5,
                up: { need: { fans: 10 }, outs: [[0.9, 18, '팬들이 가득 모여 분위기가 폭발! ✨'], [0.1, 7, '즐거운 시간이었어요.']] } }) ] },
    { id: 'x5', sec: 'any', d: [5, 6], crisis: true, emoji: '🧾', title: '세무 조사', text: '갑자기 세무 조사 통보가 왔어요.',
      opts: [ O('성실히 협조', '안전', [[0.6, -3, '약간의 추징금이 나왔어요.'], [0.4, 0, '문제없이 끝났어요.']]),
              O('버티기', '위험', [[0.4, -14, '가산세까지 물었어요.'], [0.6, 0, '다행히 별일 없었어요.']]) ] }
  ];
  var EV_BY_ID = {};
  EVENTS.forEach(function (e) { EV_BY_ID[e.id] = e; });

  // ───────── 저장/읽기 도우미 ─────────
  function J(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return (v === null || v === undefined) ? d : v; } catch (e) { return d; } }
  function keys(o) { try { return Object.keys(o || {}); } catch (e) { return []; } }
  function fmt(n) { return Math.round(n).toLocaleString(); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function toast(m) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e) {} }
  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function coinsNow() { try { return Number(coins) || 0; } catch (e) { return 0; } }
  function addCoins(n) { try { coins += n; if (typeof saveAll === 'function') saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {} }
  function spendCoins(n) { if (coinsNow() < n) return false; addCoins(-n); return true; }
  function mealDay() { var m = J('ph_meal', null); return (m && m.day >= 1) ? Math.floor(m.day) : 1; }

  function load() {
    var s = J(KEY, null);
    if (!s || typeof s !== 'object') s = {};
    if (!Array.isArray(s.pos)) s.pos = [];
    if (!Array.isArray(s.hist)) s.hist = [];
    if (typeof s.done !== 'number') s.done = 0;
    if (typeof s.wins !== 'number') s.wins = 0;
    if (typeof s.nextId !== 'number') s.nextId = 1;
    if (!s.led) s.led = { dr: [], ok: 0, cf: 0, fans: 0, ev: 0, alb: 0, deb: 0 };
    if (!s.snap) s.snap = null;
    if (!s.lastDay) s.lastDay = mealDay();
    if (!s.audSeen) s.audSeen = false;
    return s;
  }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  // ───────── 내 진행 상황 읽기 ─────────
  function debutN() { var d = (J('ph_agency', {}) || {}).done || {}; return keys(d).filter(function (k) { return d[k]; }).length; }
  function debutIds() { var d = (J('ph_agency', {}) || {}).done || {}; return keys(d).filter(function (k) { return d[k]; }); }
  function fanN() {
    var idols = (J('ph_fancafe', {}) || {}).idols || {}, n = 0;
    keys(idols).forEach(function (k) { var f = (idols[k] && idols[k].fans) || {}; keys(f).forEach(function (id) { if (f[id] && f[id].status === 'active') n++; }); });
    return n;
  }
  function cfN() { var c = J('ph_cf', {}) || {}; return Array.isArray(c.posters) ? c.posters.length : 0; }
  function cfStamp() { var c = J('ph_cf', {}) || {}; var p = (c.posters && c.posters[0]) || null; return p ? String(p.id || p.t || p.at || p.name || JSON.stringify(p).length) : ''; }
  function evN() { var r = J('ph_concertRun', null); var q = J('ph_quest3', {}) || {}; return (r && typeof r.done === 'number' ? r.done : 0) + (q.encore ? 20 : 0); }
  function albN() { return keys(J('ph_composeNote', {}) || {}).length; }
  function starN() { var d = J('ph_drama', {}) || {}; return keys(d.star || {}).filter(function (k) { return d.star[k]; }).length; }
  function fameOf(cid) { var d = J('ph_drama', {}) || {}; if (!cid) return 0; return (d.star && d.star[cid]) ? 100 : ((d.fame && d.fame[cid]) || 0); }
  function charName(cid) { try { return (typeof CHARS !== 'undefined' && CHARS[cid]) ? CHARS[cid].name : cid; } catch (e) { return cid; } }

  function gradeOf() {
    var g = GRADES[0];
    GRADES.forEach(function (x) { if (S.done >= x.need) g = x; });
    return g;
  }
  function limitNow() {
    var base = 0;
    LIMITS.forEach(function (r) { if (plv() >= r[0]) base = r[1]; });
    return Math.min(MAX_LIMIT, Math.round(base * gradeOf().limit / 1000) * 1000);   // 등급 보너스가 붙어도 3억을 넘지 않음
  }
  function strengths(pos) {
    return { fans: fanN(), debut: debutN(), star: starN(), album: albN(), ev: evN(), fame: pos && pos.cast ? fameOf(pos.cast) : 0, dr: pos && pos.n ? (pos.n.dr || 0) : 0 };
  }
  function needMet(need, st) { return keys(need).every(function (k) { return (st[k] || 0) >= need[k]; }); }
  function needText(need) {
    var N = { fans: ['팬', '명'], debut: ['데뷔 멤버', '명'], star: ['탑스타', '명'], album: ['작곡노트', '칸'], ev: ['공연장 이벤트', '회'], fame: ['주연 인지도', ''], dr: ['이번 투자 중 드라마 촬영', '회'] };
    return keys(need).map(function (k) { var n = N[k] || [k, '']; return n[0] + ' ' + need[k] + n[1]; }).join(', ') + ' 이상';
  }

  // ───────── 난수 ─────────
  function rnd() { return Math.random(); }
  function gauss() { return (rnd() + rnd() + rnd() + rnd() - 2) / 0.5774; }   // 평균 0, 표준편차 약 1
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }

  // ───────── 정보 카드 (날짜·투자처마다 같은 결과) ─────────
  function infoCard(secId, day) {
    var r = hash('info' + secId + day);
    var kind = r < 0.27 ? 'hot' : (r < 0.50 ? 'bad' : null);
    if (!kind) return null;
    var pool = INFO[secId][kind];
    var text = pool[Math.floor(hash('txt' + secId + day) * pool.length) % pool.length];
    var sec = SECTORS[secId];
    return { kind: kind, text: text, mod: (kind === 'hot' ? 1 : -1) * sec.sd * 0.6, pct: Math.round(sec.sd * 0.6 * 100) };
  }

  // ───────── 활동 장부 (드라마·CF·팬·공연장·앨범·데뷔) ─────────
  function snapNow() { return { cf: cfStamp(), cfN: cfN(), fans: fanN(), ev: evN(), alb: albN(), deb: debutN() }; }
  function pollActivity() {
    try {
      var n = snapNow();
      if (!S.snap) { S.snap = n; save(); return; }
      var o = S.snap, L = S.led, ch = false;
      if (n.cf !== o.cf && n.cfN >= 0) { L.cf += 1; ch = true; }
      if (n.fans > o.fans) { L.fans += n.fans - o.fans; ch = true; }
      if (n.ev > o.ev) { L.ev += n.ev - o.ev; ch = true; }
      if (n.alb > o.alb) { L.alb += n.alb - o.alb; ch = true; }
      if (n.deb > o.deb) { L.deb += n.deb - o.deb; ch = true; }
      S.snap = n;
      if (ch) save(); else if (JSON.stringify(o) !== JSON.stringify(n)) save();
    } catch (e) {}
  }
  window.addEventListener('ph-drama-shot', function (e) {
    try { var d = (e && e.detail) || {}; S.led.dr.push(Math.max(0, Number(d.r) || 0)); if (d.ok) S.led.ok += 1; save(); } catch (er) {}
  });
  function ledScore(sec) {
    var L = S.led, w = sec.w, sc = 0;
    L.dr.forEach(function (r) { sc += (2 + 0.7 * r) * w.dr; });
    sc += L.ok * 3 * w.dr + L.cf * 5 * w.cf + L.fans * 1.5 * w.fans + L.ev * 2 * w.ev + L.alb * 8 * w.alb + L.deb * 15 * w.deb;
    return sc;
  }
  function actBonus(sec) { return Math.min(sec.actCap, ledScore(sec) * ACT_K); }

  // ───────── 투자처 해금 ─────────
  function lockReason(sec) {
    if (plv() < NEED_LEVEL) return '플레이어 Lv.' + NEED_LEVEL + ' 필요';
    if (debutN() < sec.minDebut) return '데뷔 멤버 ' + sec.minDebut + '명 필요';
    if (gradeOf().id < sec.minGrade) return GRADES[sec.minGrade].name + ' 등급 필요';
    if (sec.needAlbum && albN() < sec.needAlbum) return '작곡노트 ' + sec.needAlbum + '칸 필요 (작곡 테이블)';
    return null;
  }
  function floorFrac(sec) { return Math.min(0.97, sec.floor + gradeOf().floorAdd); }
  function posOf(secId) { for (var i = 0; i < S.pos.length; i++) if (S.pos[i].sec === secId) return S.pos[i]; return null; }
  function clampValue(pos) {
    var sec = SECTORS[pos.sec], mn = Math.round(pos.invested * floorFrac(sec));
    if (pos.value < mn) pos.value = mn;
    pos.value = Math.round(pos.value);
  }

  // ───────── 시작 ─────────
  function startPosition(secId, amount, cast) {
    var sec = SECTORS[secId];
    if (!sec) return { err: '알 수 없는 투자처예요' };
    var lr = lockReason(sec);
    if (lr) return { err: lr };
    if (posOf(secId)) return { err: '이미 이 투자처에 투자 중이에요' };
    if (S.pos.length >= gradeOf().slots) return { err: '투자 슬롯이 가득 찼어요 (' + gradeOf().slots + '칸)' };
    amount = Math.floor(amount);
    if (amount < MIN_PRINCIPAL) return { err: '최소 ' + fmt(MIN_PRINCIPAL) + ' 코인부터 투자할 수 있어요' };
    if (amount > limitNow()) return { err: '투자 한도는 ' + fmt(limitNow()) + ' 코인이에요' };
    if (sec.cast && (!cast || debutIds().indexOf(cast) === -1)) return { err: '주연 아이돌을 골라주세요' };
    if (!spendCoins(amount)) return { err: '코인이 부족해요' };
    var pos = { id: S.nextId++, sec: secId, cast: sec.cast ? cast : null, principal: amount, invested: amount, value: amount, day: 1, start: mealDay(),
                hist: [amount], n: { dr: 0, cf: 0, fans: 0, ev: 0, alb: 0 }, pending: null, used: [], log: [], mature: false, last: null };
    S.pos.push(pos);
    save();
    return { ok: true, pos: pos };
  }

  // ───────── 사건 고르기 / 처리 ─────────
  function pickEvent(pos) {
    var d = pos.day, hasCrisis = pos.used.some(function (id) { return EV_BY_ID[id] && EV_BY_ID[id].crisis; });
    var pool = EVENTS.filter(function (e) { return (e.sec === pos.sec || e.sec === 'any') && d >= e.d[0] && d <= e.d[1] && pos.used.indexOf(e.id) === -1; });
    if (!pool.length) return null;
    var crisis = pool.filter(function (e) { return e.crisis; }), normal = pool.filter(function (e) { return !e.crisis; });
    var useCrisis = false;
    if (!hasCrisis && crisis.length) { if (d >= 6) useCrisis = true; else if (d === 5 && rnd() < 0.45) useCrisis = true; }
    var list = useCrisis ? crisis : (normal.length ? normal : crisis);
    // 투자처 전용 사건을 공통 사건보다 두 배 더 자주
    var bag = [];
    list.forEach(function (e) { bag.push(e); if (e.sec === pos.sec) bag.push(e); });
    return bag[Math.floor(rnd() * bag.length)];
  }
  function rollOuts(outs) {
    var r = rnd(), acc = 0;
    for (var i = 0; i < outs.length; i++) { acc += outs[i][0]; if (r < acc) return outs[i]; }
    return outs[outs.length - 1];
  }
  function eventCost(pos, opt) { return opt.cost ? Math.round(pos.principal * opt.cost / 100) : 0; }
  function resolveEvent(pos, idx, auto) {
    var ev = EV_BY_ID[pos.pending]; if (!ev) { pos.pending = null; return { err: '사건이 없어요' }; }
    var opt = ev.opts[idx]; if (!opt) return { err: '선택지가 없어요' };
    var cost = eventCost(pos, opt);
    if (cost) {
      if (auto) cost = 0;
      else if (!spendCoins(cost)) return { err: '추가 투자금이 모자라요 (' + fmt(cost) + ' 코인 필요)' };
    }
    if (cost) { pos.invested += cost; pos.value += cost; }
    var st = strengths(pos), upHit = !!(opt.up && needMet(opt.up.need, st));
    var out = rollOuts(upHit ? opt.up.outs : opt.outs);
    var dvEv = out[1] > 0 ? out[1] * EV_UP_SCALE : out[1];
    pos.value = pos.value * (1 + dvEv / 100);
    clampValue(pos);
    var rec = { day: pos.day, t: ev.title, e: ev.emoji, c: opt.label, dv: Math.round(dvEv * 10) / 10, m: out[2], up: upHit, auto: !!auto, cost: cost };
    pos.log.push(rec);
    pos.hist[pos.hist.length - 1] = pos.value;
    pos.pending = null;
    save();
    return { ok: true, out: out, rec: rec, upHit: upHit, cost: cost };
  }

  // ───────── 하루가 지날 때 ─────────
  function tickPosition(pos, newDay) {
    if (pos.kind === 'aud') { tickAud(pos, newDay); return; }
    var sec = SECTORS[pos.sec];
    if (pos.mature) return;
    if (pos.pending) resolveEvent(pos, 0, true);
    pos.day += 1;
    var info = infoCard(pos.sec, newDay - 1);
    var act = actBonus(sec);
    var castB = sec.cast && pos.cast ? fameOf(pos.cast) / 100 * 0.015 : 0;
    var dv = sec.m + sec.sd * gauss() + (info ? info.mod : 0) + act + castB;
    dv = Math.max(-0.35, Math.min(0.5, dv));
    pos.value = pos.value * (1 + dv);
    clampValue(pos);
    pos.last = { dv: dv, act: act, info: info ? info.kind : null };
    // 이번 투자 동안 한 활동 기록 (사건 조건에 쓰임)
    pos.n.dr += S.led.dr.length; pos.n.cf += S.led.cf; pos.n.fans += S.led.fans; pos.n.ev += S.led.ev; pos.n.alb += S.led.alb;
    if (pos.day >= DAYS) { pos.day = DAYS; pos.mature = true; }
    pos.hist.push(pos.value);
    if (!pos.mature) {
      var ev = pickEvent(pos);
      if (ev) { pos.pending = ev.id; pos.used.push(ev.id); }
    }
  }
  function resetLedger() { S.led = { dr: [], ok: 0, cf: 0, fans: 0, ev: 0, alb: 0, deb: 0 }; }
  var lastNotice = [];
  function syncDays() {
    var d = mealDay(), steps = 0;
    if (d < S.lastDay) { S.lastDay = d; save(); return 0; }
    if (d === S.lastDay) return 0;
    pollActivity();
    var n = Math.min(d - S.lastDay, MAX_STEPS);
    for (var i = 1; i <= n; i++) {
      S.pos.forEach(function (p) { tickPosition(p, S.lastDay + i); });
      resetLedger();
      steps++;
    }
    S.lastDay = d;
    save();
    var pend = S.pos.filter(function (p) { return p.pending; }).length, mat = S.pos.filter(function (p) { return p.mature; }).length;
    if (S.pos.length) toast('💼 투자 ' + S.pos[0].day + '일차 · ' + (pend ? '📩 사건 카드가 도착했어요' : '가치가 움직였어요') + (mat ? ' · 만기 정산 가능!' : ''));
    refreshBadge();
    if (document.getElementById('invest-overlay')) render();
    return steps;
  }

  // ───────── 🎤 오디션 후원 (히든) ─────────
  // 연습생 3명이 7일 동안 득표 경쟁. 한 명을 후원하고, 내 활동(CF·팬·공연장·앨범…)이 그 연습생의 득표를 올려줘요.
  // 1등이면 투자금 × WIN_MULT + 그 연습생의 한정 포카, 1등이 아니면 투자금의 LOSE_BACK 만 돌려받아요.
  var AUD = { MIN: 500000, MAX: 5000000, NEED_GRADE: 3, NEED_LIMIT: 1000000, WIN_MULT: 1.8, LOSE_BACK: 0.2,
              START: 100000, SD: 0.06, TALENT_SD: 0.012, CAP: 0.025, K: 0.0012, HOT: 0.03, BAD: 0.03, PIECES: 3 };
  function audUnlocked() { return gradeOf().id >= AUD.NEED_GRADE && limitNow() >= AUD.NEED_LIMIT; }
  function audMaxAmt() { return Math.min(limitNow(), AUD.MAX, coinsNow()); }
  function audAct() { return Math.min(AUD.CAP, ledScore(SECTORS.audition) * AUD.K); }
  function audNews(pid, cid, day) {
    var r = hash('aud' + pid + cid + day), lm = limOf(cid), nm = lm ? lm.real : cid;
    if (r < 0.20) return { kind: 'hot', mod: AUD.HOT, text: nm + ' 연습생 무대 영상 조회수가 급상승 중이에요' };
    if (r < 0.34) return { kind: 'bad', mod: -AUD.BAD, text: nm + ' 연습생 컨디션 난조 소문이 돌아요' };
    return null;
  }
  function audRanking(pos) { return pos.c.slice().sort(function (a, b) { return b.s - a.s; }); }
  function audRankOf(pos, cid) { var r = audRanking(pos); for (var i = 0; i < r.length; i++) if (r[i].id === cid) return i + 1; return 0; }
  function audMakeContestants() {
    var pool = LIMITED.filter(function (c) { return c.aud; }).slice();
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    return pool.slice(0, 3).map(function (c) {
      var t = gauss() * AUD.TALENT_SD;
      var st = Math.max(1, Math.min(5, Math.round(3 + (t / AUD.TALENT_SD) * 0.9 + gauss() * 0.9)));   // 스카우트 추정 (살짝 틀릴 수 있어요)
      return { id: c.id, s: AUD.START, t: t, st: st };
    });
  }
  function startAud(amount, pickId, cs) {
    if (!audUnlocked()) return { err: '아직 제안이 도착하지 않았어요' };
    if (posOf('audition')) return { err: '이미 오디션을 후원 중이에요' };
    if (S.pos.length >= gradeOf().slots) return { err: '투자 슬롯이 가득 찼어요 (' + gradeOf().slots + '칸)' };
    amount = Math.floor(amount);
    if (amount < AUD.MIN) return { err: '최소 ' + fmt(AUD.MIN) + ' 코인부터 후원할 수 있어요' };
    if (amount > Math.min(limitNow(), AUD.MAX)) return { err: '후원 한도는 ' + fmt(Math.min(limitNow(), AUD.MAX)) + ' 코인이에요' };
    if (!cs || !cs.some(function (c) { return c.id === pickId; })) return { err: '후원할 연습생을 골라주세요' };
    if (!spendCoins(amount)) return { err: '코인이 부족해요' };
    var pos = { id: S.nextId++, kind: 'aud', sec: 'audition', cast: null, principal: amount, invested: amount, value: amount, day: 1, start: mealDay(),
                hist: [amount], n: { dr: 0, cf: 0, fans: 0, ev: 0, alb: 0 }, pending: null, used: [], log: [], mature: false, last: null,
                pick: pickId, c: cs.map(function (c) { return { id: c.id, s: c.s, t: c.t, st: c.st, h: [c.s] }; }) };
    S.pos.push(pos); save();
    return { ok: true, pos: pos };
  }
  function tickAud(pos, newDay) {
    if (pos.mature) return;
    pos.day += 1;
    var act = audAct(), news = {};
    pos.c.forEach(function (c) {
      var nw = audNews(pos.id, c.id, newDay - 1); if (nw) news[c.id] = nw.kind;
      var g = c.t + AUD.SD * gauss() + (nw ? nw.mod : 0) + (c.id === pos.pick ? act : 0);
      g = Math.max(-0.2, Math.min(0.25, g));
      c.s = Math.max(1000, Math.round(c.s * (1 + g)));
      c.h.push(c.s);
    });
    pos.last = { act: act, news: news };
    if (pos.day >= DAYS) { pos.day = DAYS; pos.mature = true; }
    pos.hist.push(pos.invested);
  }
  function settleAud(pos) {
    if (S.pos.indexOf(pos) === -1) return { err: '이미 정산된 투자예요' };
    if (!pos.mature) return { err: '아직 결과 발표 전이에요' };
    var board = audRanking(pos).map(function (c) { return { id: c.id, s: c.s }; });
    var rank = audRankOf(pos, pos.pick), win = rank === 1;
    var payout = Math.floor(pos.invested * (win ? AUD.WIN_MULT : AUD.LOSE_BACK));
    var idx = S.pos.indexOf(pos); S.pos.splice(idx, 1);
    addCoins(payout);
    var lines = [], lm = limOf(pos.pick);
    if (win) {
      grantLimited(pos.pick); lines.push('🌟 한정 포카 〈' + (lm ? lm.real : pos.pick) + '〉 획득!');
      try { if (typeof addToBag === 'function' && addToBag('🖼️', '프리미엄 조각', 'piece', AUD.PIECES, '프리미엄 카드 조각 · 100개를 모으면 더보기 > 프리미엄 카드에서 교환')) lines.push('🖼️ 프리미엄 조각 ×' + AUD.PIECES); } catch (e) {}
    }
    var profit = payout - pos.invested;
    S.done += 1; if (profit > 0) S.wins += 1;
    S.hist.unshift({ sec: 'audition', inv: pos.invested, pay: payout, profit: profit, mature: true, day: pos.day, at: Date.now(), div: lines });
    if (S.hist.length > HIST_MAX) S.hist.length = HIST_MAX;
    save(); refreshBadge();
    return { ok: true, win: win, rank: rank, payout: payout, profit: profit, ratio: payout / pos.invested, lines: lines, board: board, pick: pos.pick };
  }

  // ───────── 매각 / 정산 ─────────
  function giveDividend(pos, ratio) {
    var sec = SECTORS[pos.sec], lines = [];
    if (ratio < DIV_START) return lines;
    if (rnd() > Math.min(0.95, 0.55 + (ratio - DIV_START) * 1.2)) return lines;
    var n = Math.max(1, Math.round(sec.piece * (1 + (ratio - DIV_START) * 6)));
    try {
      if (typeof addToBag === 'function' && addToBag('🖼️', '프리미엄 조각', 'piece', n, '프리미엄 카드 조각 · 100개를 모으면 더보기 > 프리미엄 카드에서 교환')) lines.push('🖼️ 프리미엄 조각 ×' + n);
      else lines.push('(가방이 가득 차서 배당을 못 받았어요)');
    } catch (e) {}
    if (ratio >= 1.45) {
      var m = 1 + Math.floor(rnd() * 3);
      try { if (typeof addToBag === 'function' && addToBag('🔨', '강화석', 'enhance', m, '히든카드 강화 재료 · 더보기 > 트레이닝룸에서 사용해요')) lines.push('🔨 강화석 ×' + m); } catch (e) {}
    }
    try {
      LIMITED.forEach(function (c) {
        if (ratio >= c.minRatio && rnd() < c.chance) {
          grantLimited(c.id);
          lines.push('🌟 한정 포카 〈' + c.real + '〉 획득!');
        }
      });
    } catch (e) {}
    return lines;
  }
  function finalize(pos, payout) {
    var idx = S.pos.indexOf(pos); if (idx >= 0) S.pos.splice(idx, 1);
    addCoins(payout);
    var profit = payout - pos.invested, ratio = payout / pos.invested;
    var lines = pos.mature ? giveDividend(pos, ratio) : [];
    if (pos.mature) S.done += 1;
    if (profit > 0) S.wins += 1;
    S.hist.unshift({ sec: pos.sec, inv: pos.invested, pay: payout, profit: profit, mature: !!pos.mature, day: pos.day, at: Date.now(), div: lines });
    if (S.hist.length > HIST_MAX) S.hist.length = HIST_MAX;
    save();
    refreshBadge();
    return { payout: payout, profit: profit, ratio: ratio, lines: lines, mature: !!pos.mature };
  }
  function sellPosition(pos) {
    if (S.pos.indexOf(pos) === -1) return { err: '이미 정산된 투자예요' };
    var payout = Math.floor(pos.value * (pos.mature ? 1 : (1 - SELL_PENALTY)));
    return finalize(pos, payout);
  }

  // ════════════════════════════════════════════════════════════
  // 🖥️ 화면
  // ════════════════════════════════════════════════════════════
  var C = { bg: '#17120d', card: '#251c14', line: '#4a3a28', gold: '#e8c27a', text: '#f3e9d8', mute: '#a89880', up: '#6ee7a0', down: '#ff8a8a' };
  var IMG = 'map-invest.png';
  function pctText(x) { return (x >= 0 ? '+' : '') + (Math.round(x * 10) / 10) + '%'; }
  function colorOf(x) { return x > 0 ? C.up : (x < 0 ? C.down : C.mute); }
  function stars(n) { var s = ''; for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆'; return s; }
  function btn(css) { return 'border:none;border-radius:12px;font-weight:900;cursor:pointer;' + FONT + css; }

  function spark(hist, inv) {
    var w = 260, h = 38, n = hist.length;
    if (n < 2) return '<div style="height:' + h + 'px;"></div>';
    var mn = Math.min.apply(null, hist.concat([inv])), mx = Math.max.apply(null, hist.concat([inv]));
    if (mx === mn) { mx += 1; }
    var pts = hist.map(function (v, i) { return Math.round(i / (DAYS - 1) * w) + ',' + Math.round(h - 4 - (v - mn) / (mx - mn) * (h - 8)); }).join(' ');
    var y0 = Math.round(h - 4 - (inv - mn) / (mx - mn) * (h - 8));
    var last = hist[n - 1] >= inv ? C.up : C.down;
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:' + h + 'px;display:block;" preserveAspectRatio="none">' +
      '<line x1="0" y1="' + y0 + '" x2="' + w + '" y2="' + y0 + '" stroke="' + C.line + '" stroke-dasharray="3 3"/>' +
      '<polyline fill="none" stroke="' + last + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + pts + '"/></svg>';
  }
  function dots(day) {
    var s = '';
    for (var i = 1; i <= DAYS; i++) s += '<span style="display:inline-block;width:' + (i === day ? 16 : 9) + 'px;height:9px;border-radius:5px;margin-right:3px;background:' + (i < day ? C.gold : (i === day ? '#fff' : C.line)) + ';"></span>';
    return s;
  }

  function sectionTitle(t, sub) {
    return '<div style="display:flex;align-items:baseline;justify-content:space-between;margin:18px 2px 8px;"><div style="font-size:14px;font-weight:900;color:' + C.gold + ';">' + t + '</div>' + (sub ? '<div style="font-size:11px;color:' + C.mute + ';">' + sub + '</div>' : '') + '</div>';
  }

  function posCard(pos) {
    if (pos.kind === 'aud') return audCard(pos);
    var sec = SECTORS[pos.sec], profit = pos.value - pos.invested, pct = profit / pos.invested * 100;
    var penalty = pos.mature ? 0 : SELL_PENALTY, sellNow = Math.floor(pos.value * (1 - penalty));
    var lastLine = '';
    if (pos.last) {
      lastLine = '어제 ' + pctText(pos.last.dv * 100) + (pos.last.act > 0 ? ' · 활동 보너스 +' + (Math.round(pos.last.act * 1000) / 10) + '%' : '') +
        (pos.last.info === 'hot' ? ' · 📈 호재' : (pos.last.info === 'bad' ? ' · 📉 악재' : ''));
    }
    var nowBonus = actBonus(sec);
    var act = '<div style="font-size:11px;color:' + C.mute + ';margin-top:2px;">⚡ 오늘 활동 보너스 <b style="color:' + (nowBonus > 0 ? C.up : C.mute) + ';">+' + (Math.round(nowBonus * 1000) / 10) + '%</b> <span style="opacity:.8;">(내일로 넘어갈 때 반영)</span></div>';
    var main;
    if (pos.pending) {
      var ev = EV_BY_ID[pos.pending];
      main = '<button data-act="event" data-id="' + pos.id + '" style="' + btn('width:100%;padding:13px;background:linear-gradient(135deg,#f59e0b,#ec4899);color:#fff;font-size:14px;') + '">📩 ' + (ev ? ev.emoji + ' ' + esc(ev.title) : '사건') + ' — 확인하기</button>';
    } else if (pos.mature) {
      main = '<button data-act="sell" data-id="' + pos.id + '" style="' + btn('width:100%;padding:13px;background:linear-gradient(135deg,#34d399,#10b981);color:#04251b;font-size:14px;') + '">✅ 만기 정산 · 🍔 ' + fmt(sellNow) + '</button>';
    } else {
      main = '<div style="font-size:12px;color:' + C.mute + ';text-align:center;padding:8px 0;">📅 아이돌 스케줄에서 <b style="color:' + C.gold + ';">하루 보내기</b>를 하면 다음 날로 넘어가요</div>';
    }
    var sub = pos.mature ? '' : '<button data-act="sell" data-id="' + pos.id + '" style="' + btn('width:100%;margin-top:8px;padding:9px;background:rgba(255,255,255,0.07);color:' + C.mute + ';font-size:12px;') + '">💰 중도 매각 (−' + Math.round(SELL_PENALTY * 100) + '%) · 🍔 ' + fmt(sellNow) + '</button>';
    return '<div style="background:' + C.card + ';border:1.5px solid ' + (pos.pending || pos.mature ? C.gold : C.line) + ';border-radius:16px;padding:14px;margin-bottom:10px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;">' +
        '<div style="font-size:15px;font-weight:900;color:' + C.text + ';">' + sec.emoji + ' ' + sec.name + (pos.cast ? ' <span style="font-size:11px;color:' + C.gold + ';">· 주연 ' + esc(charName(pos.cast)) + '</span>' : '') + '</div>' +
        '<div style="font-size:11px;color:' + C.mute + ';">DAY ' + pos.day + ' / ' + DAYS + (pos.mature ? ' · 만기' : '') + '</div></div>' +
      '<div style="margin:8px 0 4px;">' + dots(pos.day) + '</div>' +
      '<div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:6px;">' +
        '<div><div style="font-size:11px;color:' + C.mute + ';">현재 가치</div><div style="font-size:22px;font-weight:900;color:#fff;">🍔 ' + fmt(pos.value) + '</div></div>' +
        '<div style="text-align:right;"><div style="font-size:11px;color:' + C.mute + ';">투자금 ' + fmt(pos.invested) + '</div><div style="font-size:15px;font-weight:900;color:' + colorOf(profit) + ';">' + (profit >= 0 ? '+' : '') + fmt(profit) + ' (' + pctText(pct) + ')</div></div></div>' +
      '<div style="margin:6px 0 2px;">' + spark(pos.hist, pos.invested) + '</div>' +
      (lastLine ? '<div style="font-size:11px;color:' + C.mute + ';">' + lastLine + '</div>' : '') + act +
      '<div style="margin-top:10px;">' + main + sub + '</div></div>';
  }

  function infoRow(sec) {
    var card = infoCard(sec.id, mealDay());
    var badge = card ? (card.kind === 'hot' ? '<span style="color:' + C.up + ';font-weight:900;">🔥 호재 +' + card.pct + '%</span>' : '<span style="color:' + C.down + ';font-weight:900;">⚠️ 악재 −' + card.pct + '%</span>') : '<span style="color:' + C.mute + ';">특별한 소식 없음</span>';
    return '<div style="display:flex;gap:10px;align-items:flex-start;background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:12px;padding:10px 12px;margin-bottom:6px;">' +
      '<div style="font-size:20px;">' + sec.emoji + '</div><div style="flex:1;min-width:0;"><div style="font-size:12px;color:' + C.text + ';font-weight:700;">' + sec.name + ' · ' + badge + '</div>' +
      '<div style="font-size:12px;color:' + C.mute + ';margin-top:2px;">' + (card ? '「' + esc(card.text) + '」' : '조용한 하루예요.') + '</div></div></div>';
  }

  function newCard(sec) {
    var lr = lockReason(sec), have = posOf(sec.id), full = S.pos.length >= gradeOf().slots;
    var action;
    if (lr) action = '<div style="font-size:12px;color:' + C.down + ';text-align:center;padding:9px;background:rgba(255,255,255,0.05);border-radius:10px;">🔒 ' + lr + '</div>';
    else if (have) action = '<div style="font-size:12px;color:' + C.mute + ';text-align:center;padding:9px;">이미 투자 중이에요</div>';
    else if (full) action = '<div style="font-size:12px;color:' + C.mute + ';text-align:center;padding:9px;">슬롯이 가득 찼어요 (' + gradeOf().slots + '칸)</div>';
    else action = '<button data-act="new" data-sec="' + sec.id + '" style="' + btn('width:100%;padding:12px;background:linear-gradient(135deg,' + C.gold + ',#d4a24a);color:#2a1d08;font-size:14px;') + '">투자하기</button>';
    return '<div style="background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:16px;padding:14px;margin-bottom:10px;opacity:' + (lr ? 0.72 : 1) + ';">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-size:15px;font-weight:900;color:' + C.text + ';">' + sec.emoji + ' ' + sec.name + '</div>' +
      '<div style="font-size:12px;color:' + C.gold + ';letter-spacing:1px;">' + stars(sec.risk) + '</div></div>' +
      '<div style="font-size:11px;color:' + C.gold + ';margin:2px 0 6px;">' + sec.tag + '</div>' +
      '<div style="font-size:12px;color:' + C.mute + ';line-height:1.55;margin-bottom:6px;">' + sec.desc + '</div>' +
      '<div style="font-size:11px;color:' + C.mute + ';margin-bottom:10px;">최저 회수 ' + Math.round(floorFrac(sec) * 100) + '% · 특별 배당: 🖼️ 프리미엄 조각</div>' + action + '</div>';
  }

  // 한정 포카 그림: 그림 파일이 없으면 실루엣으로 보여요
  function artBox(c, css, owned) {
    var sil = 'background:linear-gradient(160deg,#3a2c1c,#1c140c);display:flex;align-items:center;justify-content:center;color:#6d5a40;font-size:28px;';
    return '<div style="position:relative;overflow:hidden;aspect-ratio:2/3;' + sil + css + '">' + (owned === false ? '❓' : '🎤') +
      (owned === false ? '' : '<img src="' + c.img + '" onerror="this.remove()" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;">') + '</div>';
  }
  function limHtml() {
    var d = limLoad();
    return '<div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;">' + LIMITED.map(function (c) {
      var e = d[c.id];
      if (!e) return '<div style="flex:0 0 96px;">' + artBox(c, 'border-radius:10px;border:1.5px dashed ' + C.line + ';', false) + '</div>';
      return '<div data-act="lim" data-c="' + c.id + '" style="flex:0 0 96px;cursor:pointer;position:relative;">' + artBox(c, 'border-radius:10px;border:1.5px solid ' + C.gold + ';box-shadow:0 0 14px rgba(232,194,122,.45);', true) +
        (e.n > 1 ? '<span style="position:absolute;right:4px;bottom:4px;background:rgba(0,0,0,.75);color:#fff;font-size:11px;font-weight:900;border-radius:8px;padding:1px 6px;">×' + e.n + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  // 🌟 한정판 도감 (수집만 · 전부 모으면 칭호)
  function openLimitedDex() {
    var old = document.getElementById('lim-dex'); if (old) old.remove();
    var d = limLoad(), have = limOwnedN(), all = LIMITED.length;
    var ov = document.createElement('div'); ov.id = 'lim-dex';
    ov.style.cssText = 'position:fixed;inset:0;z-index:770;overflow-y:auto;background:linear-gradient(180deg,#1a130c,#0e0a06);color:' + C.text + ';' + FONT;
    ov.innerHTML = '<div style="max-width:430px;margin:0 auto;padding:16px 14px 70px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><button data-dex="close" style="' + btn('padding:8px 12px;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;') + '">← 닫기</button>' +
      '<div style="font-size:16px;font-weight:900;color:' + C.gold + ';">🌟 한정판 도감</div><div style="width:64px;"></div></div>' +
      '<div style="text-align:center;font-size:12px;color:' + C.mute + ';margin:6px 0 14px;">' + have + ' / ' + all + ' 수집' + (have >= all ? ' · <b style="color:' + C.gold + ';">🏷️ 칭호 [한정판 수집왕] 획득!</b>' : ' · 전부 모으면 칭호 🏷️ [한정판 수집왕]') + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">' + LIMITED.map(function (c) {
        var e = d[c.id];
        return '<div ' + (e ? 'data-dex="lim" data-c="' + c.id + '" style="cursor:pointer;"' : '') + '>' + artBox(c, 'border-radius:10px;border:1.5px ' + (e ? 'solid ' + C.gold + ';box-shadow:0 0 12px rgba(232,194,122,.4);' : 'dashed ' + C.line + ';'), !!e) +
          '<div style="font-size:11px;text-align:center;margin-top:5px;color:' + (e ? C.text : C.mute) + ';font-weight:700;">' + (e ? esc(c.real) : '???') + (e && e.n > 1 ? ' ×' + e.n : '') + '</div></div>';
      }).join('') + '</div>' +
      '<div style="font-size:11px;color:' + C.mute + ';text-align:center;margin-top:18px;line-height:1.7;">한정 포카는 능력치가 없는 수집용 카드예요.<br>💼 포카 인베스트의 투자 대박이나 히든 오디션에서 만날 수 있어요.</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-dex]') : null; if (!t) return;
      if (t.getAttribute('data-dex') === 'close') ov.remove();
      else showLimited(t.getAttribute('data-c'));
    });
  }
  function showLimited(id) {
    var c = LIMITED.filter(function (x) { return x.id === id; })[0], e = limLoad()[id]; if (!c || !e) return;
    var dt = new Date(e.first);
    popup('<div style="text-align:center;"><div style="width:100%;max-width:290px;margin:0 auto;">' + artBox(c, 'border-radius:12px;border:2px solid ' + C.gold + ';box-shadow:0 0 28px rgba(232,194,122,.5);', true) + '</div>' +
      '<div style="font-size:17px;font-weight:900;color:' + C.gold + ';margin-top:12px;">' + esc(c.real) + '</div><div style="font-size:12px;color:' + C.mute + ';">' + esc(c.sub) + '</div>' +
      '<div style="font-size:11px;color:' + C.mute + ';margin-top:6px;">LIMITED EDITION · 보유 ' + e.n + '장 · ' + dt.getFullYear() + '.' + (dt.getMonth() + 1) + '.' + dt.getDate() + ' 획득</div></div>' +
      '<button data-act="ok" style="' + btn('width:100%;margin-top:14px;padding:12px;background:linear-gradient(135deg,' + C.gold + ',#d4a24a);color:#2a1d08;font-size:14px;') + '">닫기</button>');
  }
  function histRows() {
    if (!S.hist.length) return '<div style="font-size:12px;color:' + C.mute + ';text-align:center;padding:12px;">아직 기록이 없어요</div>';
    return S.hist.slice(0, 6).map(function (h) {
      var sec = SECTORS[h.sec] || { emoji: '💼', name: '투자' };
      return '<div style="display:flex;justify-content:space-between;font-size:12px;padding:7px 4px;border-bottom:1px solid ' + C.line + ';">' +
        '<span style="color:' + C.text + ';">' + sec.emoji + ' ' + sec.name + (h.mature ? '' : ' <span style="color:' + C.mute + ';">(중도 매각)</span>') + '</span>' +
        '<span style="color:' + colorOf(h.profit) + ';font-weight:900;">' + (h.profit >= 0 ? '+' : '') + fmt(h.profit) + (h.div && h.div.length ? ' 🎁' : '') + '</span></div>';
    }).join('');
  }

  function render() {
    var ov = document.getElementById('invest-overlay');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'invest-overlay';
      ov.style.cssText = 'position:fixed;inset:0;z-index:760;overflow-y:auto;-webkit-overflow-scrolling:touch;color:' + C.text + ';' + FONT +
        'background:linear-gradient(180deg,rgba(14,10,6,.55),rgba(14,10,6,.88)),url(' + IMG + ') center top/cover no-repeat,' + C.bg + ';';
      document.body.appendChild(ov);
      ov.addEventListener('click', onClick);
    }
    var g = gradeOf(), nextG = GRADES[g.id + 1];
    var gradeLine = g.emoji + ' <b style="color:' + C.gold + ';">' + g.name + '</b>' + (nextG ? ' <span style="color:' + C.mute + ';">· 다음 등급까지 ' + Math.max(0, nextG.need - S.done) + '회 (' + S.done + '/' + nextG.need + ')</span>' : ' <span style="color:' + C.mute + ';">· 최고 등급</span>');
    var secs = SECTOR_ORDER.map(function (id) { return SECTORS[id]; });
    ov.innerHTML = '<div style="max-width:430px;margin:0 auto;padding:14px 14px 90px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
        '<button data-act="close" style="' + btn('padding:8px 12px;background:rgba(255,255,255,0.1);color:#fff;font-size:13px;') + '">← 마을</button>' +
        '<div style="font-size:16px;font-weight:900;color:' + C.gold + ';letter-spacing:1px;">💼 포카 인베스트</div>' +
        '<div style="font-size:13px;font-weight:900;color:#fff;background:rgba(255,255,255,0.1);border-radius:12px;padding:7px 10px;">🍔 ' + fmt(coinsNow()) + '</div></div>' +
      '<div style="background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:14px;padding:11px 13px;font-size:12px;line-height:1.7;">' +
        gradeLine + '<br><span style="color:' + C.mute + ';">📅 게임 속 DAY ' + mealDay() + ' · 한 판 한도 <b style="color:' + C.text + ';">' + fmt(limitNow()) + '</b> · 슬롯 ' + S.pos.length + '/' + g.slots + '</span></div>' +
      sectionTitle('📰 오늘의 정보', '소문은 내일로 넘어갈 때 가치에 반영돼요') + secs.map(infoRow).join('') +
      sectionTitle('💼 내 투자', S.pos.length + ' / ' + g.slots) + (S.pos.length ? S.pos.map(posCard).join('') : '<div style="font-size:12px;color:' + C.mute + ';text-align:center;padding:18px;background:' + C.card + ';border-radius:14px;">진행 중인 투자가 없어요. 아래에서 시작해 보세요!</div>') +
      sectionTitle('🆕 새 투자', '한 투자처에 하나씩') + (audUnlocked() && !posOf('audition') ? audOffer() : '') + secs.map(newCard).join('') +
      sectionTitle('🌟 한정 포카 ' + limOwnedN() + '/' + LIMITED.length, '투자 대박·오디션 우승 때 나와요') + limHtml() +
      '<button data-act="dex" style="' + btn('width:100%;margin-top:8px;padding:9px;background:rgba(255,255,255,0.07);color:' + C.mute + ';font-size:12px;') + '">🌟 한정판 도감 보기</button>' +
      sectionTitle('🧾 최근 기록') + '<div style="background:' + C.card + ';border:1px solid ' + C.line + ';border-radius:14px;padding:6px 10px;">' + histRows() + '</div>' +
      '<button data-act="schedule" style="' + btn('width:100%;margin-top:16px;padding:14px;background:rgba(255,207,74,0.15);border:1.5px solid #ffcf4a;color:#ffe08a;font-size:14px;') + '">📅 스케줄 · 하루 보내기</button>' +
      '<div style="font-size:11px;color:' + C.mute + ';text-align:center;margin-top:8px;line-height:1.6;">투자는 아이돌 활동을 돕는 보조 콘텐츠예요.<br>드라마 촬영·CF·팬 모으기·공연장·작곡을 많이 할수록 가치가 더 올라가요!</div>' +
      '</div>';
  }

  // ───────── 팝업 ─────────
  function popup(html) {
    var old = document.getElementById('invest-pop'); if (old) old.remove();
    var p = document.createElement('div'); p.id = 'invest-pop';
    p.style.cssText = 'position:fixed;inset:0;z-index:780;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    p.innerHTML = '<div style="width:100%;max-width:380px;max-height:90vh;overflow-y:auto;background:linear-gradient(160deg,#2a2016,#1a130c);border:2px solid ' + C.gold + ';border-radius:20px;padding:20px 18px;color:' + C.text + ';">' + html + '</div>';
    document.body.appendChild(p);
    p.addEventListener('click', onClick);
    return p;
  }
  function closePop() { var p = document.getElementById('invest-pop'); if (p) p.remove(); }

  function openEvent(pos) {
    var ev = EV_BY_ID[pos.pending]; if (!ev) { pos.pending = null; save(); render(); return; }
    var st = strengths(pos);
    var opts = ev.opts.map(function (o, i) {
      var cost = eventCost(pos, o), upLine = '';
      if (o.up) { var ok = needMet(o.up.need, st); upLine = '<div style="font-size:11px;margin-top:3px;color:' + (ok ? C.up : C.mute) + ';">' + (ok ? '✅ 조건 충족 — 특별 결과 가능!' : '🔒 ' + needText(o.up.need) + '이면 특별 결과') + '</div>'; }
      return '<button data-act="pick" data-id="' + pos.id + '" data-i="' + i + '" style="' + btn('width:100%;text-align:left;padding:11px 13px;margin-top:8px;background:rgba(255,255,255,0.07);border:1px solid ' + C.line + ';color:' + C.text + ';font-size:13px;') + '">' +
        (i === 0 ? '<span style="font-size:10px;color:' + C.mute + ';float:right;">기본 선택</span>' : '') + esc(o.label) +
        '<div style="font-size:11px;font-weight:400;color:' + C.mute + ';margin-top:2px;">' + esc(o.sub) + (cost ? ' · 🍔 ' + fmt(cost) : '') + '</div>' + upLine + '</button>';
    }).join('');
    popup('<div style="text-align:center;"><div style="font-size:38px;">' + ev.emoji + '</div><div style="font-size:11px;color:' + C.mute + ';">DAY ' + pos.day + ' · ' + SECTORS[pos.sec].emoji + ' ' + SECTORS[pos.sec].name + (ev.crisis ? ' · <span style="color:' + C.down + ';">위기</span>' : '') + '</div>' +
      '<div style="font-size:18px;font-weight:900;color:' + C.gold + ';margin:4px 0 6px;">' + esc(ev.title) + '</div><div style="font-size:13px;line-height:1.6;color:' + C.text + ';">' + esc(ev.text) + '</div></div>' + opts +
      '<button data-act="later" style="' + btn('width:100%;margin-top:12px;padding:9px;background:none;color:' + C.mute + ';font-size:12px;') + '">나중에 정할래요 (하루가 지나면 기본 선택)</button>');
  }
  function showResult(r, pos) {
    var rec = r.rec, c = colorOf(rec.dv);
    popup('<div style="text-align:center;"><div style="font-size:34px;">' + (r.upHit ? '✨' : (rec.dv >= 0 ? '😊' : '😥')) + '</div>' +
      (r.upHit ? '<div style="font-size:12px;font-weight:900;color:' + C.gold + ';letter-spacing:1px;">PERFECT CHOICE</div>' : '') +
      '<div style="font-size:14px;line-height:1.7;color:' + C.text + ';margin:8px 0;">' + esc(rec.m) + '</div>' +
      '<div style="font-size:26px;font-weight:900;color:' + c + ';">' + pctText(rec.dv) + '</div>' +
      '<div style="font-size:12px;color:' + C.mute + ';margin-top:4px;">현재 가치 🍔 ' + fmt(pos.value) + '</div></div>' +
      '<button data-act="ok" style="' + btn('width:100%;margin-top:16px;padding:13px;background:linear-gradient(135deg,' + C.gold + ',#d4a24a);color:#2a1d08;font-size:14px;') + '">확인</button>');
  }
  function showSettle(res, pos) {
    var sec = SECTORS[pos.sec];
    popup('<div style="text-align:center;"><div style="font-size:38px;">' + (res.profit > 0 ? '🎉' : '📄') + '</div>' +
      '<div style="font-size:17px;font-weight:900;color:' + C.gold + ';">' + (res.mature ? '투자 정산' : '중도 매각') + ' · ' + sec.emoji + ' ' + sec.name + '</div>' +
      '<div style="font-size:12px;color:' + C.mute + ';margin:10px 0 2px;">투자금 ' + fmt(pos.invested) + ' → 받은 코인</div>' +
      '<div style="font-size:26px;font-weight:900;color:#fff;">🍔 ' + fmt(res.payout) + '</div>' +
      '<div style="font-size:15px;font-weight:900;color:' + colorOf(res.profit) + ';margin-top:4px;">' + (res.profit >= 0 ? '+' : '') + fmt(res.profit) + ' (' + pctText((res.ratio - 1) * 100) + ')</div>' +
      (res.lines.length ? '<div style="margin-top:14px;padding:10px;background:rgba(232,194,122,0.14);border:1px solid ' + C.gold + ';border-radius:12px;"><div style="font-size:12px;font-weight:900;color:' + C.gold + ';">✨ 특별 배당이 도착했어요!</div><div style="font-size:14px;color:#fff;margin-top:4px;line-height:1.7;">' + res.lines.join('<br>') + '</div></div>' : '') +
      (res.mature && gradeOf().id > 0 && S.done > 0 && GRADES[gradeOf().id].need === S.done ? '<div style="margin-top:10px;font-size:13px;color:' + C.gold + ';font-weight:900;">🎖️ 투자 등급이 올랐어요: ' + gradeOf().name + '!</div>' : '') + '</div>' +
      '<button data-act="ok" style="' + btn('width:100%;margin-top:16px;padding:13px;background:linear-gradient(135deg,' + C.gold + ',#d4a24a);color:#2a1d08;font-size:14px;') + '">확인</button>');
  }
  var draft = null;
  function openNew(secId) {
    var sec = SECTORS[secId], lim = Math.min(limitNow(), coinsNow());
    if (lim < MIN_PRINCIPAL) { toast('코인이 부족해요 (최소 ' + fmt(MIN_PRINCIPAL) + ')'); return; }
    draft = { sec: secId, amt: Math.max(MIN_PRINCIPAL, Math.floor(lim * 0.5 / 1000) * 1000), cast: null };
    if (sec.cast) { var ids = debutIds().sort(function (a, b) { return fameOf(b) - fameOf(a); }); draft.cast = ids[0] || null; }
    drawNew();
  }
  function drawNew() {
    var sec = SECTORS[draft.sec], lim = Math.min(limitNow(), coinsNow());
    var presets = [0.25, 0.5, 0.75, 1].map(function (p) {
      var v = Math.max(MIN_PRINCIPAL, Math.floor(lim * p / 1000) * 1000);
      return '<button data-act="amt" data-v="' + v + '" style="' + btn('flex:1;padding:9px 0;background:' + (draft.amt === v ? C.gold : 'rgba(255,255,255,0.08)') + ';color:' + (draft.amt === v ? '#2a1d08' : C.text) + ';font-size:12px;') + '">' + Math.round(p * 100) + '%</button>';
    }).join('');
    var cast = '';
    if (sec.cast) {
      cast = '<div style="font-size:12px;color:' + C.mute + ';margin:12px 0 6px;">🎭 주연 아이돌 <span style="opacity:.8;">(인지도가 높을수록 유리해요)</span></div><div style="display:flex;flex-wrap:wrap;gap:6px;">' +
        debutIds().map(function (cid) {
          var on = draft.cast === cid;
          return '<button data-act="cast" data-c="' + cid + '" style="' + btn('padding:8px 10px;background:' + (on ? C.gold : 'rgba(255,255,255,0.08)') + ';color:' + (on ? '#2a1d08' : C.text) + ';font-size:12px;') + '">' + esc(charName(cid)) + ' <span style="opacity:.8;font-weight:400;">' + Math.round(fameOf(cid)) + '</span></button>';
        }).join('') + '</div>';
    }
    popup('<div style="text-align:center;"><div style="font-size:36px;">' + sec.emoji + '</div><div style="font-size:17px;font-weight:900;color:' + C.gold + ';">' + sec.name + ' 투자</div><div style="font-size:11px;color:' + C.mute + ';margin-top:2px;">' + sec.tag + ' · ' + stars(sec.risk) + '</div></div>' +
      '<div style="font-size:12px;color:' + C.mute + ';margin:12px 0 6px;">💰 투자금 (한도 ' + fmt(limitNow()) + ')</div>' +
      '<div style="font-size:24px;font-weight:900;color:#fff;text-align:center;margin-bottom:8px;">🍔 ' + fmt(draft.amt) + '</div><div style="display:flex;gap:6px;">' + presets + '</div>' + cast +
      '<div style="font-size:11px;color:' + C.mute + ';margin-top:12px;line-height:1.6;">• 7일(게임 속 하루 보내기 7번) 뒤 만기 정산, 언제든 중도 매각(−' + Math.round(SELL_PENALTY * 100) + '%)<br>• 최저 회수율 ' + Math.round(floorFrac(sec) * 100) + '% (그 아래로는 안 내려가요)</div>' +
      '<button data-act="start" style="' + btn('width:100%;margin-top:14px;padding:13px;background:linear-gradient(135deg,' + C.gold + ',#d4a24a);color:#2a1d08;font-size:14px;') + '">투자 시작!</button>' +
      '<button data-act="ok" style="' + btn('width:100%;margin-top:8px;padding:10px;background:none;color:' + C.mute + ';font-size:12px;') + '">취소</button>');
  }

  // ───────── 🎤 오디션 후원 화면 ─────────
  var MEDAL = ['🥇', '🥈', '🥉'];
  function starsTxt(n) { var t = ''; for (var i = 0; i < 5; i++) t += i < n ? '★' : '☆'; return t; }
  function audOffer() {
    return '<div style="background:linear-gradient(135deg,#2a1c2e,#1a1224);border:1.5px solid #c084fc;border-radius:16px;padding:14px;margin-bottom:10px;box-shadow:0 0 18px rgba(192,132,252,.25);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;"><div style="font-size:15px;font-weight:900;color:#e9d5ff;">📩 비공개 투자 제안</div><div style="font-size:12px;color:' + C.gold + ';letter-spacing:1px;">' + stars(5) + '</div></div>' +
      '<div style="font-size:12px;color:#d8c8f0;line-height:1.6;margin:8px 0;">아직 아무도 모르는 연습생에게 투자하시겠습니까?<br>성공 여부 ??? · 예상 수익 ??? · 계약 기간 7일</div>' +
      '<div style="font-size:11px;color:' + C.mute + ';margin-bottom:10px;">1등 후원 시 투자금 ×' + AUD.WIN_MULT + ' + 한정 포카 · 아니면 투자금의 ' + Math.round(AUD.LOSE_BACK * 100) + '%만 돌려받아요</div>' +
      '<button data-act="aud-new" style="' + btn('width:100%;padding:12px;background:linear-gradient(135deg,#c084fc,#8b5cf6);color:#fff;font-size:14px;') + '">🎤 오디션 보러 가기</button></div>';
  }
  function audThumb(cid, w) { var c = limOf(cid); return c ? '<div style="width:' + w + 'px;flex-shrink:0;">' + artBox(c, 'border-radius:8px;border:1px solid ' + C.line + ';', true) + '</div>' : ''; }
  function audCard(pos) {
    var rk = audRanking(pos), myRank = audRankOf(pos, pos.pick), lm = limOf(pos.pick), max = rk[0].s;
    var rows = rk.map(function (c, i) {
      var l = limOf(c.id), mine = c.id === pos.pick, nw = audNews(pos.id, c.id, mealDay());
      return '<div style="display:flex;gap:10px;align-items:center;padding:7px 8px;margin-bottom:5px;border-radius:12px;background:' + (mine ? 'rgba(232,194,122,.14)' : 'rgba(255,255,255,.04)') + ';border:1px solid ' + (mine ? C.gold : C.line) + ';">' +
        '<div style="font-size:20px;width:26px;text-align:center;">' + (MEDAL[i] || (i + 1)) + '</div>' + audThumb(c.id, 34) +
        '<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:900;color:' + C.text + ';">' + esc(l ? l.real : c.id) + (mine ? ' <span style="font-size:10px;color:' + C.gold + ';">· 내 후원</span>' : '') +
        (nw ? ' <span style="font-size:10px;color:' + (nw.kind === 'hot' ? C.up : C.down) + ';">' + (nw.kind === 'hot' ? '📈 호재' : '📉 악재') + '</span>' : '') + '</div>' +
        '<div style="height:6px;border-radius:4px;background:rgba(255,255,255,.08);margin:5px 0 3px;"><div style="height:6px;border-radius:4px;width:' + Math.max(8, Math.round(c.s / max * 100)) + '%;background:' + (mine ? C.gold : '#7a6a54') + ';"></div></div>' +
        '<div style="font-size:11px;color:' + C.mute + ';">' + fmt(c.s) + ' 표' + (nw ? ' · ' + esc(nw.text) : '') + '</div></div></div>';
    }).join('');
    var act = audAct();
    var main = pos.mature
      ? '<button data-act="aud-settle" data-id="' + pos.id + '" style="' + btn('width:100%;padding:13px;background:linear-gradient(135deg,#c084fc,#8b5cf6);color:#fff;font-size:14px;') + '">🏆 최종 결과 발표 보기</button>'
      : '<div style="font-size:12px;color:' + C.mute + ';text-align:center;padding:8px 0;">📅 <b style="color:' + C.gold + ';">하루 보내기</b>를 하면 득표가 바뀌어요 · 7일 계약, 중도 해지 불가</div>';
    return '<div style="background:' + C.card + ';border:1.5px solid ' + (pos.mature ? '#c084fc' : C.line) + ';border-radius:16px;padding:14px;margin-bottom:10px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;"><div style="font-size:15px;font-weight:900;color:' + C.text + ';">🎤 오디션 후원 <span style="font-size:11px;color:' + C.gold + ';">· ' + esc(lm ? lm.real : pos.pick) + '</span></div>' +
      '<div style="font-size:11px;color:' + C.mute + ';">DAY ' + pos.day + ' / ' + DAYS + (pos.mature ? ' · 종료' : '') + '</div></div>' +
      '<div style="margin:8px 0 8px;">' + dots(pos.day) + '</div>' + rows +
      '<div style="font-size:11px;color:' + C.mute + ';margin:4px 0 0;">후원금 🍔 ' + fmt(pos.invested) + ' · 현재 <b style="color:#fff;">' + myRank + '위</b> · ⚡ 오늘 활동 보너스 <b style="color:' + (act > 0 ? C.up : C.mute) + ';">+' + (Math.round(act * 1000) / 10) + '%</b> <span style="opacity:.8;">(내일 득표에 반영)</span></div>' +
      '<div style="margin-top:10px;">' + main + '</div></div>';
  }
  var audDraft = null;
  function openAud() {
    var lim = audMaxAmt();
    if (lim < AUD.MIN) { toast('코인이 부족해요 (최소 ' + fmt(AUD.MIN) + ')'); return; }
    var cs = audMakeContestants();
    audDraft = { cs: cs, pick: null, amt: Math.max(AUD.MIN, Math.floor(lim * 0.5 / 10000) * 10000) };
    drawAud();
  }
  function drawAud() {
    var d = audDraft, lim = audMaxAmt();
    var cards = d.cs.map(function (c) {
      var l = limOf(c.id), on = d.pick === c.id;
      return '<div data-act="aud-pick" data-c="' + c.id + '" style="flex:1;min-width:0;cursor:pointer;text-align:center;padding:6px 4px 8px;border-radius:12px;border:2px solid ' + (on ? C.gold : C.line) + ';background:' + (on ? 'rgba(232,194,122,.16)' : 'rgba(255,255,255,.04)') + ';">' +
        artBox(l, 'border-radius:8px;', true) +
        '<div style="font-size:12px;font-weight:900;color:' + C.text + ';margin-top:5px;">' + esc(l.real) + '</div><div style="font-size:10px;color:' + C.mute + ';">' + esc(l.sub) + '</div>' +
        '<div style="font-size:10px;color:' + C.gold + ';margin-top:3px;letter-spacing:1px;">' + starsTxt(c.st) + '</div></div>';
    }).join('');
    var presets = [0.25, 0.5, 0.75, 1].map(function (p) {
      var v = Math.max(AUD.MIN, Math.floor(lim * p / 10000) * 10000), on = d.amt === v;
      return '<button data-act="aud-amt" data-v="' + v + '" style="' + btn('flex:1;padding:9px 0;background:' + (on ? C.gold : 'rgba(255,255,255,0.08)') + ';color:' + (on ? '#2a1d08' : C.text) + ';font-size:12px;') + '">' + Math.round(p * 100) + '%</button>';
    }).join('');
    popup('<div style="text-align:center;"><div style="font-size:34px;">🎤</div><div style="font-size:17px;font-weight:900;color:#e9d5ff;">비공개 오디션</div><div style="font-size:11px;color:' + C.mute + ';margin-top:2px;">후원할 연습생을 한 명 고르세요 · ★은 스카우트의 추정이라 틀릴 수 있어요</div></div>' +
      '<div style="display:flex;gap:7px;margin:12px 0;">' + cards + '</div>' +
      '<div style="font-size:12px;color:' + C.mute + ';margin:6px 0;">💰 후원금 (한도 ' + fmt(Math.min(limitNow(), AUD.MAX)) + ')</div>' +
      '<div style="font-size:24px;font-weight:900;color:#fff;text-align:center;margin-bottom:8px;">🍔 ' + fmt(d.amt) + '</div><div style="display:flex;gap:6px;">' + presets + '</div>' +
      '<div style="font-size:11px;color:' + C.mute + ';margin-top:12px;line-height:1.6;">• 7일 뒤 득표 1위 → 후원금 ×' + AUD.WIN_MULT + ' + 한정 포카 + 프리미엄 조각<br>• 1위가 아니면 후원금의 ' + Math.round(AUD.LOSE_BACK * 100) + '%만 돌려받아요<br>• 내 아이돌 활동(CF·팬·공연장·앨범)이 후원한 연습생의 득표를 올려줘요</div>' +
      '<button data-act="aud-start" style="' + btn('width:100%;margin-top:14px;padding:13px;background:' + (d.pick ? 'linear-gradient(135deg,#c084fc,#8b5cf6)' : 'rgba(255,255,255,.1)') + ';color:' + (d.pick ? '#fff' : '#888') + ';font-size:14px;') + '">' + (d.pick ? '후원 시작!' : '연습생을 골라주세요') + '</button>' +
      '<button data-act="ok" style="' + btn('width:100%;margin-top:8px;padding:10px;background:none;color:' + C.mute + ';font-size:12px;') + '">나중에 할게요</button>');
  }
  function showAudResult(r) {
    var l = limOf(r.pick);
    var board = r.board.map(function (c, i) {
      var cl = limOf(c.id), mine = c.id === r.pick;
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:10px;background:' + (mine ? 'rgba(232,194,122,.14)' : 'transparent') + ';font-size:13px;"><span style="width:22px;">' + (MEDAL[i] || (i + 1)) + '</span><span style="flex:1;font-weight:' + (mine ? 900 : 400) + ';">' + esc(cl ? cl.real : c.id) + (mine ? ' <span style="font-size:10px;color:' + C.gold + ';">내 후원</span>' : '') + '</span><span style="color:' + C.mute + ';">' + fmt(c.s) + ' 표</span></div>';
    }).join('');
    popup('<div style="text-align:center;"><div style="font-size:40px;">' + (r.win ? '🏆' : '😢') + '</div>' +
      '<div style="font-size:17px;font-weight:900;color:' + (r.win ? C.gold : C.text) + ';margin:4px 0;">' + (r.win ? '1위 데뷔! ' + esc(l ? l.real : '') + ' 연습생이 우승했어요' : '아쉽게도 ' + r.rank + '위였어요') + '</div></div>' +
      '<div style="margin:10px 0;background:rgba(255,255,255,.04);border-radius:12px;padding:6px;">' + board + '</div>' +
      '<div style="text-align:center;"><div style="font-size:12px;color:' + C.mute + ';">받은 코인</div><div style="font-size:26px;font-weight:900;color:#fff;">🍔 ' + fmt(r.payout) + '</div>' +
      '<div style="font-size:15px;font-weight:900;color:' + colorOf(r.profit) + ';margin-top:2px;">' + (r.profit >= 0 ? '+' : '') + fmt(r.profit) + ' (' + pctText((r.ratio - 1) * 100) + ')</div></div>' +
      (r.lines.length ? '<div style="margin-top:12px;padding:10px;background:rgba(232,194,122,0.14);border:1px solid ' + C.gold + ';border-radius:12px;text-align:center;font-size:14px;color:#fff;line-height:1.7;">' + r.lines.join('<br>') + '</div>' : '') +
      '<button data-act="ok" style="' + btn('width:100%;margin-top:16px;padding:13px;background:linear-gradient(135deg,' + C.gold + ',#d4a24a);color:#2a1d08;font-size:14px;') + '">확인</button>');
  }
  function showAudReveal() {
    popup('<div style="text-align:center;"><div style="font-size:42px;">📩</div><div style="font-size:11px;letter-spacing:2px;color:#c084fc;margin-top:4px;">PRIVATE OFFER</div>' +
      '<div style="font-size:18px;font-weight:900;color:#e9d5ff;margin:6px 0 10px;">비공개 투자 제안이 도착했습니다</div>' +
      '<div style="font-size:13px;line-height:1.8;color:' + C.text + ';">대주주만 받을 수 있는 제안이에요.<br>아직 아무도 모르는 연습생에게 투자하시겠습니까?<br><span style="color:' + C.mute + ';">성공 여부 ??? · 예상 수익 ??? · 계약 기간 7일</span></div></div>' +
      '<button data-act="aud-reveal" style="' + btn('width:100%;margin-top:16px;padding:13px;background:linear-gradient(135deg,#c084fc,#8b5cf6);color:#fff;font-size:14px;') + '">🎤 제안 확인하기</button>');
  }

  // ───────── 클릭 처리 ─────────
  function posById(id) { id = Number(id); for (var i = 0; i < S.pos.length; i++) if (S.pos[i].id === id) return S.pos[i]; return null; }
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
    if (!t) return;
    e.stopPropagation();
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id'), pos = id ? posById(id) : null;
    if (act === 'close') { closeInvest(); return; }
    if (act === 'ok' || act === 'later') { closePop(); if (document.getElementById('invest-overlay')) render(); return; }
    if (act === 'dex') { openLimitedDex(); return; }
    if (act === 'aud-new') { openAud(); return; }
    if (act === 'aud-reveal') { S.audSeen = true; save(); closePop(); render(); openAud(); return; }
    if (act === 'aud-pick' && audDraft) { audDraft.pick = t.getAttribute('data-c'); drawAud(); return; }
    if (act === 'aud-amt' && audDraft) { audDraft.amt = Number(t.getAttribute('data-v')); drawAud(); return; }
    if (act === 'aud-start' && audDraft) {
      var ra = startAud(audDraft.amt, audDraft.pick, audDraft.cs);
      if (ra.err) { toast(ra.err); return; }
      audDraft = null; closePop(); render(); toast('🎤 오디션 후원을 시작했어요! DAY 1'); return;
    }
    if (act === 'aud-settle' && pos) {
      var rr = settleAud(pos);
      if (rr.err) { toast(rr.err); render(); return; }
      showAudResult(rr); render(); return;
    }
    if (act === 'schedule') {
      if (typeof window.openMealSchedule === 'function') { closeInvest(); window.openMealSchedule(); }
      else toast('📅 스케줄·식사 관리는 🎤 기획사 안에 있어요');
      return;
    }
    if (act === 'event' && pos) { openEvent(pos); return; }
    if (act === 'pick' && pos) {
      var r = resolveEvent(pos, Number(t.getAttribute('data-i')), false);
      if (r.err) { toast(r.err); return; }
      showResult(r, pos); render(); return;
    }
    if (act === 'sell' && pos) {
      var penalty = pos.mature ? '' : '지금 팔면 가치의 ' + Math.round(SELL_PENALTY * 100) + '%가 깎여요. 그래도 팔까요?';
      if (!pos.mature && !window.confirm(penalty)) return;
      var res = sellPosition(pos);
      if (res.err) { toast(res.err); render(); return; }
      showSettle(res, pos); render(); return;
    }
    if (act === 'lim') { showLimited(t.getAttribute('data-c')); return; }
    if (act === 'new') { openNew(t.getAttribute('data-sec')); return; }
    if (act === 'amt' && draft) { draft.amt = Number(t.getAttribute('data-v')); drawNew(); return; }
    if (act === 'cast' && draft) { draft.cast = t.getAttribute('data-c'); drawNew(); return; }
    if (act === 'start' && draft) {
      var rs = startPosition(draft.sec, draft.amt, draft.cast);
      if (rs.err) { toast(rs.err); return; }
      draft = null; closePop(); render(); toast('💼 투자를 시작했어요! DAY 1');
    }
  }

  function openInvest() {
    if (plv() < NEED_LEVEL) { toast('💼 포카 인베스트는 플레이어 Lv.' + NEED_LEVEL + '부터 열려요 (지금 Lv.' + plv() + ')'); return; }
    try { if (typeof closePlace === 'function') closePlace(); } catch (e) {}
    syncDays(); pollActivity(); render();
    if (audUnlocked() && !S.audSeen && !posOf('audition')) setTimeout(showAudReveal, 350);
  }
  function closeInvest() { var o = document.getElementById('invest-overlay'); if (o) o.remove(); closePop(); refreshBadge(); }

  // ───────── 마을 맵 버튼 ─────────
  function refreshBadge() {
    var b = document.getElementById('btn-invest-map'); if (!b) return;
    var need = S.pos.some(function (p) { return p.pending || p.mature; });
    var dot = b.querySelector('.inv-dot');
    if (need && !dot) { dot = document.createElement('span'); dot.className = 'inv-dot'; dot.textContent = '!'; dot.style.cssText = 'position:absolute;top:-7px;right:-7px;width:17px;height:17px;border-radius:50%;background:#ef4444;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:1.5px solid #fff;'; b.appendChild(dot); }
    else if (!need && dot) dot.remove();
  }
  function addMapButton() {
    if (document.getElementById('btn-invest-map')) return true;
    var ref = null, all = document.querySelectorAll('#screen-map button[onclick]');
    for (var i = 0; i < all.length; i++) { if ((all[i].getAttribute('onclick') || '').indexOf("openPlace('park')") !== -1) { ref = all[i]; break; } }
    if (!ref || !ref.parentNode) return false;
    var b = document.createElement('button');
    b.id = 'btn-invest-map';
    b.innerHTML = '💼 포카<br>인베스트';
    b.style.cssText = 'position:absolute;left:86%;top:68%;transform:translate(-50%,-50%);white-space:nowrap;background:rgba(30,22,14,0.92);border:2px solid #e8c27a;border-radius:14px;padding:4px 8px;color:#f6dca4;font-size:10.5px;line-height:1.2;font-weight:700;cursor:pointer;text-align:center;' + FONT;
    b.onclick = openInvest;
    ref.parentNode.appendChild(b);
    refreshBadge();
    return true;
  }
  (function waitMap(n) { if (!addMapButton() && n < 100) setTimeout(function () { waitMap(n + 1); }, 150); })(0);

  setInterval(function () { try { syncDays(); } catch (e) {} }, 1000);
  setInterval(pollActivity, 2500);
  pollActivity();

  window.openInvest = openInvest;
  window.openLimitedDex = openLimitedDex;
  // 🏷️ 한정판을 전부 모으면 칭호
  (function addTitle(n) {
    try {
      if (typeof TITLES !== 'undefined' && Array.isArray(TITLES)) {
        if (!TITLES.some(function (t) { return t.id === 'limited_all'; })) TITLES.push({ id: 'limited_all', cat: '🌟 한정판', name: '한정판 도감 완성', title: '한정판 수집왕', cond: function () { return limOwnedN() >= LIMITED.length; } });
        return;
      }
    } catch (e) {}
    if (n < 100) setTimeout(function () { addTitle(n + 1); }, 200);
  })(0);
  // 컬렉션 화면에 한정판 도감 버튼
  (function addDexBtn(n) {
    var h = document.querySelector('#screen-collection .collection-header');
    if (!h) { if (n < 100) setTimeout(function () { addDexBtn(n + 1); }, 200); return; }
    if (document.getElementById('btn-lim-dex')) return;
    var b = document.createElement('button'); b.id = 'btn-lim-dex';
    b.style.cssText = 'margin-top:8px;padding:8px 14px;border-radius:12px;border:1.5px solid #e8c27a;background:rgba(232,194,122,.12);color:#e8c27a;font-size:12px;font-weight:900;cursor:pointer;' + FONT;
    function lbl() { b.textContent = '🌟 한정판 도감 ' + limOwnedN() + '/' + LIMITED.length; }
    lbl(); b.onclick = function () { lbl(); openLimitedDex(); };
    h.appendChild(b);
    setInterval(lbl, 3000);
  })(0);
  window.__investTest = {
    get S() { return S; }, set S(v) { S = v; }, SECTORS: SECTORS, EVENTS: EVENTS, GRADES: GRADES, LIMITS: LIMITS,
    startPosition: startPosition, tickPosition: tickPosition, resolveEvent: resolveEvent, sellPosition: sellPosition, syncDays: syncDays,
    limitNow: limitNow, gradeOf: gradeOf, infoCard: infoCard, strengths: strengths, actBonus: actBonus, ledScore: ledScore, lockReason: lockReason,
    AUD: AUD, startAud: startAud, tickAud: tickAud, settleAud: settleAud, audMakeContestants: audMakeContestants, audUnlocked: audUnlocked, audRanking: audRanking, audAct: audAct, openAud: openAud, openLimitedDex: openLimitedDex, limOwnedN: limOwnedN, grantLimited: grantLimited,
    LIMITED: LIMITED, limLoad: limLoad, giveDividend: giveDividend, showLimited: showLimited, pickEvent: pickEvent, needMet: needMet, resetLedger: resetLedger, load: load, save: save, floorFrac: floorFrac, render: render
  };
})();
