// 👗 내 집 옷장 (wardrobe-home.js)
// - 내 집 장소 화면의 '방 꾸미기' 버튼 밑에 '👗 옷장' 버튼 추가 → 누르면 의상실(clothes-equip.js)이 열림
// - 더보기 > 의상실도 그대로 있음 (같은 화면)
(function () {
  'use strict';
  function sync() {
    var deco = document.getElementById('btn-room-deco');
    if (!deco) return;
    var b = document.getElementById('btn-wardrobe');
    if (!b) {
      b = document.createElement('button');
      b.id = 'btn-wardrobe';
      b.textContent = '👗 옷장 (멤버 옷 입히기)';
      b.style.cssText = deco.style.cssText;
      b.setAttribute('onclick', '');
      b.onclick = function () {
        if (typeof closePlace === 'function') closePlace();
        if (typeof window.openClothesEquip === 'function') window.openClothesEquip();
        else alert('준비 중이에요!');
      };
      deco.parentNode.insertBefore(b, deco.nextSibling);
    }
    b.style.display = deco.style.display;     // 방 꾸미기 버튼이 보일 때(= 내 집)만 보임
  }
  setInterval(sync, 400);
})();
