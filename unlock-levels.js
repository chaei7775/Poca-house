// ════════════════════════════════════════════════════════════
// 🔓 해금 레벨표 (unlock-levels.js) — 레벨 숫자는 전부 여기서만 고친다
// 이 파일은 index.html 에서 pocalevel.js 보다 먼저 불러온다 (loader.js 묶음과 별개, 항상 제일 먼저).
// 쓰는 곳: unlock-gate.js(menu·nav·place) / quest-guide.js(guide) / story-quest.js(story) / quest-lv-tags.js(quest) / agency-unlock.js(agency) / pocalevel.js(pocahouse)
// 고치면: 맵·더보기 잠금, 길잡이, 스토리 '지금 할 일', 퀘스트 목록 숨김이 같이 바뀐다.
// ⚠️ 한 기능의 레벨을 바꿀 땐 같은 기능이 여러 칸에 있는지 확인 (예: 광장 = place.square, 기획사 = agency, 데뷔 퀘스트들 = quest.main_debut …)
// ════════════════════════════════════════════════════════════
window.PH_LEVELS = (function () {
  // ── 더보기 메뉴·버튼 (버튼 글자에서 re 로 찾음) ──
  var menu = [
    { lv: 8,  re: /드라마 촬영/,            name: '드라마 촬영' },
    { lv: 10, re: /CF 촬영/,                name: 'CF 촬영' },
    { lv: 12, re: /스케줄 · 식사|스케줄·식사|스케줄 관리/, name: '스케줄 · 식사' },
    { lv: 12, re: /팬카페/,                  name: '팬카페' },
    { lv: 15, re: /분양소/,                  name: '분양소' },
    { lv: 15, re: /굿즈 공방/,               name: '굿즈 공방' },
    { lv: 15, re: /의상실/,                  name: '의상실' },
    { lv: 15, re: /거래소/,                  name: '거래소' },
    { lv: 12, re: /^로드 매니저/,             name: '로드 매니저' },
    { lv: 15, re: /작곡 테이블|작곡 스튜디오|작곡스튜디오/, name: '작곡 스튜디오' },
    { lv: 15, re: /통발/,                    name: '통발' },
    { lv: 18, re: /^[^가-힣A-Za-z0-9]*팬클럽( 의뢰소)?$/,                  name: '팬클럽 의뢰소' },
    { lv: 18, re: /음원차트/,                name: '음원차트' },
    { lv: 20, re: /인베스트/,                name: '포카 인베스트' },
    { lv: 20, re: /^[^가-힣A-Za-z0-9]*그룹$/,               name: '그룹' },
    // ── 초반 구간: 처음엔 [뽑기 · 인연 · 알바]만, 레벨이 오를수록 더보기 메뉴가 하나씩 열림 ──
    { lv: 2,  re: /스케줄 가기/,            name: '스케줄 가기' },
    { lv: 4,  re: /^히든카드 도감$/,        name: '히든카드 도감' },
    { lv: 4,  re: /^친구$/,                 name: '친구' },
    { lv: 4,  re: /^게시판$/,               name: '게시판' },
    { lv: 8,  re: /^칭호$/,                 name: '칭호' },
    { lv: 8,  re: /^내 컬렉션$/,            name: '내 컬렉션' },
    { lv: 10, re: /^트레이닝룸$/,           name: '트레이닝룸' },
    { lv: 10, re: /^팬 스킬 상점$/,         name: '팬 스킬 상점' },
    { lv: 12, re: /^카드 재조합기$/,        name: '카드 재조합기' },
    { lv: 12, re: /^프리미엄 카드$/,        name: '프리미엄 카드' },
    { lv: 12, re: /^해프닝 카드/,           name: '해프닝 카드' },
    { lv: 5,  re: /^우편함/,                name: '우편함' },
    { lv: 10, re: /^히든 효과$/,            name: '히든 효과' }
  ];
  // ── 아래 탭 (id) ──
  var nav = { 'nav-quest': { lv: 2, name: '퀘스트' }, 'nav-bag': { lv: 2, name: '가방' }, 'nav-map': { lv: 2, name: '맵' }, 'nav-shop': { lv: 2, name: '더보기' } };
  // ── 맵 장소 (openPlace('...')) ──
  var place = {
    'cafe-street': { lv: 2, name: '카페거리' },
    school: { lv: 3, name: '연성고등학교' }, shopping: { lv: 3, name: '상점거리' }, room: { lv: 3, name: '내 집' },
    beach: { lv: 4, name: '뷰티 살롱' }, forest: { lv: 4, name: '촬영 세트장' }, park: { lv: 4, name: '꽃길공원' }, lake: { lv: 4, name: '워크숍 캠프' },
    square: { lv: 5, name: '중앙광장' }, mystery: { lv: 6, name: '신비의 섬' }, housing: { lv: 8, name: '연습생 숙소촌' }
  };
  // ── 길잡이 단계 id → 열리는 레벨 (레벨이 모자란 단계는 길잡이가 건너뜀) ──
  var guide = { agency: 5, explore: 4, school: 3, lv3: 3, room: 3, fishing: 4, mystery: 6, develop: 12, alldebut: 5, mgr_actor: 8, equip_view: 12, recombine: 12, hidden: 12, premium: 12, prem_equip: 12, enhance: 10, transcend: 10, studio: 15, album: 15, royalty: 15, goods: 15, goods_equip: 15, drama: 8, star_fame: 8, star_top: 8, mgr_top: 8, cf: 10, fancafe: 12, invest: 20, invest_done: 20, invest_grade: 20, chart_in: 18, chart_stream: 18, chart_book: 18, chart_act: 18, chart_show: 18, chart_one: 20, group_make: 20, group_act: 20, group_10: 20 };
  // ── 스토리 퀘스트 id → 열리는 레벨 ('지금 할 일'에서 건너뜀) ──
  var story = { s1_6: 4, s1_7: 4, s2_3: 6, s2_4: 6, s3_1: 5,
    s3_5: 8, s3_9: 8, s4_5: 8, s6_6: 8, s3_2: 10, s5_1: 10, s3_3: 12, s3_4: 12, s6_2: 12, s2_6: 12, s5_2: 12, s5_5: 12, s5_7: 12, s6_4: 12,
    s2_9: 15, s4_9b: 18, s4_9c: 18, s6_7b: 18, s4_1: 5,
    i_minjun_2: 5, i_sion_2: 5, i_doyun_2: 5, i_harin_2: 5, i_yuna_2: 5, i_ara_2: 5,
    i_minjun_3: 5, i_sion_3: 5, i_doyun_3: 5, i_harin_3: 5, i_yuna_3: 5, i_ara_3: 5 };
  // ── 퀘스트 목록 id → 열리는 레벨 ((Lv.N~) 표시를 붙이고 레벨이 될 때까지 숨김) ──
  var quest = {
    tut_explore: 4, tut_fishing: 4, main_mystery: 6, main_wish: 6, main_crystal: 6,
    main_debut: 5, main_debut_all: 5, main_mgr_actor: 8, main_mgr_top: 8, main_mgr_run10: 12,
    tut_recombine: 12, main_hidden: 12, main_premium: 12, main_premium_up: 12, main_premium_all: 12, main_develop: 12,
    main_enh1: 10, main_enh5: 10, main_enh10: 10,
    sub_sweets: 5, sub_meal: 5, sub_lesson: 5, sub_spa: 5, sub_gift: 4,
    sub_mail_read: 5, sub_mail_idol: 5, sub_mail_friend: 5,
    main_trans: 10, main_hidden_all: 12, main_expedition: 12, main_concert: 5, main_encore: 5, main_center: 12, main_mgr_event: 12, main_mgr_event10: 12,
    n_great: 10, n_skill: 10, n_gear1: 12, n_gear2: 12,
    n_map_rhythm: 25, n_map_papa: 30, n_map_world: 35, n_map_all: 35, chart_first_one: 18
  };
  // ── 기획사(데뷔) ──
  var agency = 5;
  // ── 포카하우스 기능 (방꾸미기·창고·가구상점·특별탐험) ──
  var pocahouse = { roomDeco: 3, warehouse: 5, furnitureShop: 8, agency: 10, specialMoonlit: 20, specialWorkshop: 30 };
  pocahouse.agency = agency;   // 기획사 잠금 안내도 같은 값
  return { menu: menu, nav: nav, place: place, guide: guide, story: story, quest: quest, agency: agency, pocahouse: pocahouse };
})();
