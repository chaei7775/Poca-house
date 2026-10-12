// 🎒 가방 분류 탭 (bag-tabs.js) — 전체 / 장비 / 재료 / 굿즈 / 옷 / 물약 / 스킬북 / 기타
// game.js 의 renderBag 를 건드리지 않고, 그린 뒤에 해당 탭이 아닌 칸만 숨긴다.
// (칸 순서·번호는 그대로라서 다른 파일의 가방 후킹이 그대로 동작함)
(function () {
  var TABS = [
    ['all', '전체'], ['gear', '장비'], ['mat', '재료'], ['goods', '굿즈'],
    ['cloth', '옷'], ['potion', '물약'], ['book', '스킬북'], ['etc', '기타']
  ];
  var MAP = {
    gear: 'gear', tool: 'gear',
    material: 'mat', enhance: 'mat', alchemy: 'mat', piece: 'mat', film: 'mat',
    goods_gear: 'goods',
    cloth: 'cloth',
    potion: 'potion', drink: 'potion', food: 'potion', sweet: 'potion',
    skillbook: 'book', skilltome: 'book'
  };
  var cur = 'all';
  function catOf(it) { return (it && MAP[it.type]) || 'etc'; }

  function bar() {
    var grid = document.getElementById('bag-grid');
    if (!grid || !grid.parentNode) return null;
    var b = document.getElementById('bag-tabs');
    if (b) return b;
    b = document.createElement('div');
    b.id = 'bag-tabs';
    b.style.cssText = 'position:sticky;top:-14px;z-index:5;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:8px 2px 8px;margin:-14px -2px 8px;background:#FFF0F5;scrollbar-width:none;';
    b.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-bt]') : null;
      if (!t) return;
      cur = t.getAttribute('data-bt');
      apply();
    });
    grid.parentNode.insertBefore(b, grid);
    return b;
  }

  function apply() {
    var grid = document.getElementById('bag-grid'); if (!grid) return;
    var b = bar(); if (!b) return;
    var items = (typeof bagItems !== 'undefined' && bagItems) || [];
    var cnt = { all: items.length };
    items.forEach(function (it) { var c = catOf(it); cnt[c] = (cnt[c] || 0) + 1; });
    b.innerHTML = TABS.map(function (t) {
      var on = t[0] === cur, n = cnt[t[0]] || 0;
      return '<button data-bt="' + t[0] + '" style="flex:0 0 auto;border:none;border-radius:14px;padding:7px 12px;font-size:12px;font-weight:800;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;white-space:nowrap;' +
        (on ? 'background:linear-gradient(135deg,#FF6B9D,#C084FC);color:#fff;' : 'background:#fff;color:#a06a8a;box-shadow:0 0 0 1px #f3c9dd inset;') + '">' +
        t[1] + (t[0] === 'all' ? '' : ' ' + n) + '</button>';
    }).join('');
    var old = document.getElementById('bag-tab-empty'); if (old) old.remove();
    var slots = grid.children, shown = 0;
    for (var i = 0; i < slots.length; i++) {
      var el = slots[i], show;
      if (cur === 'all') show = true;
      else if (i < items.length) show = catOf(items[i]) === cur;
      else show = false;
      el.style.display = show ? '' : 'none';
      if (show && i < items.length) shown++;
    }
    if (cur !== 'all' && !shown) {
      var m = document.createElement('div');
      m.id = 'bag-tab-empty';
      m.style.cssText = 'grid-column:1/-1;text-align:center;padding:36px 0;font-size:13px;color:#b08aa0;font-weight:700;';
      m.textContent = '이 탭엔 아직 아이템이 없어요';
      grid.appendChild(m);
    }
    var ex = document.getElementById('bag-expand-btn');
    if (ex) ex.style.display = '';
  }

  function hook() {
    if (typeof window.renderBag !== 'function') { setTimeout(hook, 200); return; }
    if (window.renderBag.__bt) return;
    var o = window.renderBag;
    var f = function () { var r = o.apply(this, arguments); try { apply(); } catch (e) {} return r; };
    f.__bt = true;
    window.renderBag = f;
    try { window.renderBag(); } catch (e) {}
  }
  hook();
})();
