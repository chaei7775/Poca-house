// ════════════════════════════════
// 👗 새 의상 시리즈 (clothes-more.js) — 등급 '에픽' / '레전드' 추가
//  · 오로라(에픽, 능력치 +6%) / 샴페인 라운지(레전드, +10%) / 로열 프린스(레전드, +10%, 남자 멤버 느낌) / 마스코트 동물옷 4종(에픽, +6%, 한 벌짜리라 원피스 칸)
//  · 재봉 작업대 목록 맨 아래에 붙고, 만드는 방법·입히는 방법은 기존 옷과 똑같다 (성공/대성공/실패 확률도 같음)
//  · 등급이 높을수록 재료가 더 많이 든다 (recipe.q = [일반 재료 개수, 희귀 재료 개수, 마지막 희귀 재료 개수]. 기존 옷은 3/3/5)
//  · 두근(설렘 이벤트) 효과: 에픽 +4 / 레전드 +5. 의상실의 합산 상한은 clothes-equip.js 의 CAP(능력치) / HEART_CAP(두근)
//  · 새 옷을 늘리려면 아래 NEW 에 한 줄 + RECIPES 에 한 덩어리 추가하고, 그림은 저장소 루트에 cloth-<id>.webp (440x440 투명 배경)
//    그리고 상의/하의/원피스 구분은 clothes-equip.js 의 TOP_IDS / BOTTOM_IDS / DRESS_IDS 에 id 를 넣는다.
// ════════════════════════════════
(function () {
  'use strict';
  var IMG = (typeof B !== 'undefined' ? B : 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/');
  function d(stat, v, h) {
    var t = { luck: '행운 +' + v + '%, 희귀재료 +' + v + '%', coin: '알바 코인 +' + v + '%', study: '수업 점수 +' + v + '%', affection: '호감도 +' + v + '%', charm: '매력 +' + v + '%' }[stat];
    return t + ', 두근 +' + h + '%';
  }
  function mk(id, name, grade, stat, v, h) { return { id: id, name: name, img: IMG + 'cloth-' + id + '.webp', grade: grade, stat: stat, statVal: v, stat2: 'heart', val2: h, desc: d(stat, v, h) }; }
  var NEW = [
    mk('aurora-jacket',     '오로라 홀로그램 크롭 자켓', '에픽', 'luck',      6, 4),
    mk('aurora-blouse',     '오로라 튤 퍼프 블라우스',   '에픽', 'affection', 6, 4),
    mk('aurora-skirt',      '오로라 플리츠 스커트',      '에픽', 'coin',      6, 4),
    mk('aurora-dress',      '오로라 레이어드 원피스',    '에픽', 'charm',     6, 4),
    mk('champagne-jacket',  '샴페인 부클 트위드 자켓',   '레전드', 'study',     10, 5),
    mk('champagne-cardigan','샴페인 니트 가디건',        '레전드', 'affection', 10, 5),
    mk('champagne-skirt',   '샴페인 새틴 스커트',        '레전드', 'coin',      10, 5),
    mk('champagne-dress',   '샴페인 트렌치 원피스',      '레전드', 'luck',      10, 5),
    mk('prince-jacket',     '에메랄드 벨벳 재킷',        '레전드', 'charm',     10, 5),
    mk('prince-shirt',      '자보 실크 셔츠',            '레전드', 'affection', 10, 5),
    mk('prince-pants',      '미드나잇 슬림 팬츠',        '레전드', 'study',     10, 5),
    mk('prince-coat',       '와인 로열 코트 세트',       '레전드', 'coin',      10, 5),
    mk('animal-bunny',      '토끼 마스코트 옷',          '에픽', 'affection', 6, 4),
    mk('animal-kitten',     '고양이 마스코트 옷',        '에픽', 'luck',      6, 4),
    mk('animal-bear',       '곰돌이 마스코트 옷',        '에픽', 'coin',      6, 4),
    mk('animal-puppy',      '강아지 마스코트 옷',        '에픽', 'study',     6, 4)
  ];
  var RECIPES = {
    'aurora-jacket':   { q: [4, 4, 7], normal: ['빛나는돌','반짝이는조개','별빛모래','은빛거미줄','무지개꽃','맑은샘물','달빛모래'], rare3: ['무지개수정','별의파편','구름조각'], rare5: '달빛수정' },
    'aurora-blouse':   { q: [4, 4, 7], normal: ['무지개꽃','나비가루','새의깃털','은빛거미줄','별빛모래','맑은샘물','장미꽃'], rare3: ['나비의날개','구름조각','무지개수정'], rare5: '천사의깃털' },
    'aurora-skirt':    { q: [4, 4, 7], normal: ['빛나는돌','반짝이는조개','별빛모래','은빛거미줄','신비버섯','맑은샘물','네잎클로버'], rare3: ['무지개수정','바다진주','달빛수정'], rare5: '별의파편' },
    'aurora-dress':    { q: [4, 4, 7], normal: ['무지개꽃','장미꽃','별빛모래','은빛거미줄','반짝이는조개','나비가루','맑은샘물'], rare3: ['무지개수정','천사의깃털','별의파편'], rare5: '달의눈물' },
    'champagne-jacket':   { q: [5, 5, 9], normal: ['고급원목','별빛나무','은빛거미줄','달빛모래','빛나는돌','해바라기','맑은샘물'], rare3: ['달빛수정','바다진주','행운의잎'], rare5: '별의파편' },
    'champagne-cardigan': { q: [5, 5, 9], normal: ['새의깃털','은빛거미줄','해바라기','네잎클로버','맑은샘물','달빛모래','장미꽃'], rare3: ['구름조각','행운의잎','달빛수정'], rare5: '천사의깃털' },
    'champagne-skirt':    { q: [5, 5, 9], normal: ['달빛모래','별빛모래','은빛거미줄','반짝이는조개','맑은샘물','해바라기','신비버섯'], rare3: ['바다진주','달빛수정','달의눈물'], rare5: '행운의잎' },
    'champagne-dress':    { q: [5, 5, 9], normal: ['고급원목','달빛모래','별빛나무','은빛거미줄','새의깃털','장미꽃','맑은샘물'], rare3: ['행운의잎','천사의깃털','바다진주'], rare5: '달의눈물' },
    'prince-jacket':   { q: [5, 5, 9], normal: ['고급원목','빛나는돌','은빛거미줄','별빛모래','신비버섯','달빛모래','맑은샘물'], rare3: ['별의파편','달빛수정','바다진주'], rare5: '무지개수정' },
    'prince-shirt':    { q: [5, 5, 9], normal: ['새의깃털','장미꽃','은빛거미줄','별빛모래','달빛모래','반짝이는조개','맑은샘물'], rare3: ['달의눈물','구름조각','천사의깃털'], rare5: '달빛수정' },
    'prince-pants':    { q: [5, 5, 9], normal: ['고급원목','빛나는돌','은빛거미줄','별빛나무','신비버섯','달빛모래','맑은샘물'], rare3: ['달빛수정','별의파편','바다진주'], rare5: '달의눈물' },
    'prince-coat':     { q: [5, 5, 9], normal: ['고급원목','별빛나무','은빛거미줄','별빛모래','장미꽃','빛나는돌','맑은샘물'], rare3: ['별의파편','달의눈물','천사의깃털'], rare5: '무지개수정' },
    'animal-bunny':    { q: [5, 4, 8], normal: ['새의깃털','해바라기','장미꽃','나비가루','맑은샘물','은빛거미줄','네잎클로버'], rare3: ['구름조각','천사의깃털','벚꽃결정'], rare5: '행운의잎' },
    'animal-kitten':   { q: [5, 4, 8], normal: ['새의깃털','해바라기','달빛모래','나비가루','맑은샘물','은빛거미줄','신비버섯'], rare3: ['구름조각','나비의날개','행운의잎'], rare5: '천사의깃털' },
    'animal-bear':     { q: [5, 4, 8], normal: ['새의깃털','해바라기','고급원목','별빛나무','맑은샘물','은빛거미줄','신비버섯'], rare3: ['구름조각','달빛수정','바다진주'], rare5: '행운의잎' },
    'animal-puppy':    { q: [5, 4, 8], normal: ['새의깃털','해바라기','고급원목','별빛모래','맑은샘물','은빛거미줄','네잎클로버'], rare3: ['구름조각','별의파편','나비의날개'], rare5: '달빛수정' }
  };

  function install() {
    if (typeof CLOTH_ITEMS === 'undefined' || typeof CLOTH_RECIPES === 'undefined' || typeof window.getClothRecipeItems !== 'function') { setTimeout(install, 200); return; }
    NEW.forEach(function (c) { if (!CLOTH_ITEMS.some(function (x) { return x.id === c.id; })) CLOTH_ITEMS.push(c); });
    Object.keys(RECIPES).forEach(function (id) { if (!CLOTH_RECIPES[id]) CLOTH_RECIPES[id] = RECIPES[id]; });
    if (window.getClothRecipeItems.__more) return;
    var w = function (clothId) {            // 재료 개수: recipe.q 가 있으면 그 개수로 (없으면 기존 3/3/5)
      var r = CLOTH_RECIPES[clothId];
      if (!r || !r.q) return orig.apply(this, arguments);
      var items = [];
      r.normal.forEach(function (n) { items.push({ name: n, qty: r.q[0], kind: '일반' }); });
      r.rare3.forEach(function (n) { items.push({ name: n, qty: r.q[1], kind: '희귀' }); });
      items.push({ name: r.rare5, qty: r.q[2], kind: '희귀' });
      return items;
    };
    var orig = window.getClothRecipeItems;
    w.__more = true; window.getClothRecipeItems = w;
  }
  install();
  window.__clothesMore = { NEW: NEW, RECIPES: RECIPES };
})();
