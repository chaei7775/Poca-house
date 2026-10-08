// ════════════════════════════════
// 📍 포카마을 지도: 우리 이름표를 그림에 박혀 있는 글씨 리본 위에 정확히 덮기 (map-pin-pos.js)
// 지도 그림(map-village.png)에는 "해변 / 동쪽 숲 / 중앙 광장…" 글씨 리본이 그려져 있어서 우리 이름표와 겹쳐 두 번 보였음.
// → 장소 버튼을 리본 위치(그림 안의 % 좌표)로 옮겨서 리본 글씨가 가려지게 함.
// 위치를 바꾸고 싶으면 아래 POS 의 [가로%, 세로%] 만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';
  var POS = {
    school:        [48.9,  6.4],
    beach:         [12.0, 22.0],
    forest:        [27.0, 28.7],
    housing:       [69.0, 21.4],
    mystery:       [90.6, 22.1],
    shopping:      [62.5, 30.7],
    square:        [53.9, 46.3],
    'cafe-street': [88.2, 49.7],
    lake:          [18.9, 59.7],
    room:          [46.4, 75.1],
    park:          [78.5, 81.1]
  };
  var css = '';
  Object.keys(POS).forEach(function (k) {
    css += '#screen-map button[onclick][onclick^="openPlace(\'' + k + '\')"]{left:' + POS[k][0] + '% !important;top:' + POS[k][1] + '% !important;min-width:68px;text-align:center;justify-content:center;}';
  });
  // 연습생 숙소촌은 이름이 길어서 글씨를 조금 줄여 '신비의 섬' 칸과 안 겹치게
  css += '#screen-map button[onclick][onclick^="openPlace(\'housing\')"]{font-size:9.5px !important;padding-left:6px !important;padding-right:6px !important;}' +
    '#screen-map button[onclick][onclick^="openPlace(\'mystery\')"]{font-size:11px !important;padding-left:6px !important;padding-right:6px !important;}';
  var st = document.createElement('style');
  st.id = 'map-pin-pos-style';
  st.textContent = css;
  document.head.appendChild(st);
})();
