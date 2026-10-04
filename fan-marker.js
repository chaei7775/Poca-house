// 🙋 팬덤 원정 지도의 ❗ 마커를 팬 이미지 4장(랜덤)으로 바꿔주는 패치
// 이미지: fan-mark-1.png ~ fan-mark-4.png (같은 폴더에 업로드)
(function () {
  'use strict';
  if (window.__fanMarker) return; window.__fanMarker = true;

  var IMGS = ['fan-mark-1.png', 'fan-mark-2.png', 'fan-mark-3.png', 'fan-mark-4.png'];
  var SIZE = 44; // 마커 크기(px)

  // 미리 불러놔서 깜빡임 방지
  IMGS.forEach(function (n) { var i = new Image(); i.src = n; });

  function swap(box) {
    if (!box || box.__fm) return;
    if ((box.textContent || '').trim() !== '❗') return;
    box.__fm = true;
    var src = IMGS[Math.floor(Math.random() * IMGS.length)];
    box.textContent = '';
    box.style.width = SIZE + 'px';
    box.style.height = SIZE + 'px';
    box.style.background = 'none';
    box.style.border = 'none';
    box.style.borderRadius = '0';
    box.style.boxShadow = 'none';
    box.style.filter = 'drop-shadow(0 0 6px #FF6B9D) drop-shadow(0 2px 3px rgba(0,0,0,.5))';
    var im = document.createElement('img');
    im.src = src;
    im.draggable = false;
    im.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
    box.appendChild(im);
  }

  function scan(root) {
    var layer = root && root.querySelectorAll ? root : document;
    var list = layer.querySelectorAll('#bc-layer div > div');
    for (var i = 0; i < list.length; i++) swap(list[i]);
  }

  try {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) continue;
          if (n.id === 'bc-layer' || (n.querySelector && n.querySelector('#bc-layer')) ) scan(document);
          else if (n.parentNode && n.parentNode.id === 'bc-layer') scan(n);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
