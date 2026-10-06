// 📍 재료가 나오는 맵 안내 (공용). 재료를 쓰는 화면(재봉·통발·굿즈 공방·CF·소속사 등)에서 window.matWhere('고급원목') 으로 불러 쓴다.
// 맵 재료 목록(EXPLORE_MATERIALS)과 맵 이름표(PLACE_TITLES)에서 자동 계산하므로 맵 재료가 바뀌어도 항상 맞는다.
(function () {
  'use strict';
  // EXPLORE_MATERIALS 에 없는 맵의 재료 (각 맵 파일이 자체 목록을 쓰는 경우)
  var EXTRA = { housing: ['빛나는돌', '별빛모래', '네잎클로버', '고급원목', '행운의잎', '달의눈물'] };
  // 일반 탐험 맵이 아닌 곳에서만 나오는 재료
  var SPECIAL = { '공방의 원석': '탐험 맵 어디서나 재료를 주울 때 가끔', '재조합석': '탐험 중 가끔 (재료를 주울 때)', '에픽 재조합석': '신비의 섬 탐험 중 아주 가끔' };
  function titles() { try { if (typeof PLACE_TITLES !== 'undefined') return PLACE_TITLES; } catch (e) {} return {}; }
  function list(name) {
    var out = [], t = titles();
    function add(pid) { var s = t[pid] || pid; if (out.indexOf(s) < 0) out.push(s); }
    try {
      if (typeof EXPLORE_MATERIALS !== 'undefined') Object.keys(EXPLORE_MATERIALS).forEach(function (pid) {
        var e = EXPLORE_MATERIALS[pid] || {};
        if ((e.normal || []).indexOf(name) >= 0 || (e.rare || []).indexOf(name) >= 0) add(pid);
      });
      Object.keys(EXTRA).forEach(function (pid) {
        if (EXTRA[pid].indexOf(name) >= 0 && !(typeof EXPLORE_MATERIALS !== 'undefined' && EXPLORE_MATERIALS[pid])) add(pid);
      });
    } catch (e) {}
    return out;
  }
  window.matWhere = function (name) {
    if (SPECIAL[name]) return SPECIAL[name];
    var o = list(name);
    return o.length ? o.join(' · ') : '';
  };
  // 한 줄 표시용 (📍 포함, 없으면 빈 문자열)
  window.matWhereTag = function (name, style) {
    var w = window.matWhere(name);
    return w ? '<span style="' + (style || 'color:#8fd3ff;font-size:10.5px;') + '">📍 ' + w + '</span>' : '';
  };
})();
