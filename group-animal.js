// ════════════════════════════════════════════════════════════
// 🐾 그룹 예능 · 동물 콘셉트 (group-animal.js)
// 멤버마다 정해진 동물옷이 있다: 민준=곰 · 시온=고양이 · 도윤=강아지 · 하린=토끼 · 윤아=판다 · 아라=펭귄
// 🧵 재봉에서 만든 그 동물옷을 의상실에서 그 멤버에게 입혀두면(원피스 칸) → "단체 예능 출연" 연출에서 그 멤버가 동물옷 SD 로 나온다.
//    입고 나온 멤버 수만큼 코인·인기도 보너스 (한 명당 +ANIMAL_BONUS, 최대 4명).
//    안 입은 멤버는 원래 블랙&골드 단체복 그대로. 그림 파일이 아직 없으면 자동으로 원래 SD 로 나온다.
// 🖼️ 그림: group-assets/sd/<멤버id>-animal.png (투명 배경, 높이 300px 안팎. 예: minjun-animal.png)
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var ANIMAL = { minjun: 'bear', sion: 'kitten', doyun: 'puppy', harin: 'bunny', yuna: 'panda', ara: 'penguin' };
  var ANIMAL_NAME = { bear: '곰', kitten: '고양이', puppy: '강아지', bunny: '토끼', panda: '판다', penguin: '펭귄' };
  var ANIMAL_BONUS = 0.12;                   // 동물옷 입고 나온 멤버 한 명당 코인·인기도 +12%
  var ACT_ID = 'variety';                    // 어느 활동에서 동물 콘셉트가 켜지는지 (단체 예능 출연)

  var ready = {};                            // 그림이 실제로 있는 멤버만 true (HEAD 요청으로 확인, 그림은 받지 않음)
  function checkAssets() {
    Object.keys(ANIMAL).forEach(function (cid) {
      try {
        fetch('group-assets/sd/' + cid + '-animal.png', { method: 'HEAD', cache: 'no-cache' })
          .then(function (r) { ready[cid] = !!(r && r.ok); }).catch(function () {});
      } catch (e) {}
    });
  }
  function equipOf(cid) {
    try { var d = JSON.parse(localStorage.getItem('ph_clothesEquip') || '{}'); return (d && d[cid]) || {}; } catch (e) { return {}; }
  }
  function wears(cid) {                      // 그 멤버가 자기 동물옷을 입고 있나
    var a = ANIMAL[cid]; if (!a) return false;
    var dress = equipOf(cid).dress;
    return !!(dress && dress.id === 'animal-' + a);
  }
  function active(cid, actId) { return actId === ACT_ID && wears(cid) && !!ready[cid]; }
  function sdSrc(cid, actId) { return active(cid, actId) ? 'group-assets/sd/' + cid + '-animal.png' : 'group-assets/sd/' + cid + '.png'; }
  function count(members, actId) { var n = 0; (members || []).forEach(function (c) { if (active(c, actId)) n++; }); return n; }
  function mult(members, actId) { return 1 + ANIMAL_BONUS * count(members, actId); }
  function hint(cid) { var a = ANIMAL[cid]; return a ? ANIMAL_NAME[a] + ' 마스코트 옷' : ''; }

  checkAssets();
  window.__groupAnimal = { sdSrc: sdSrc, mult: mult, count: count, wears: wears, active: active, hint: hint, ANIMAL: ANIMAL, ready: ready };
})();
