// 🖼️ 재료 아이콘 (mat-icons.js)
// 이모지로 나오던 재료(51종)를 그림(mat-*.png)으로 바꿔서 보여준다. 그림이 아직 안 불러와졌거나 없으면 원래 이모지가 그대로 나온다.
//  · window.matIconUrl(이름) / window.matIcon(이름, 크기px, 대체이모지) → <img> HTML / window.matImage(이름) → 캔버스용 Image(_ok)
//  · 가방 칸·가방 상세는 여기서 직접 바꿔 끼우고, "🐚 반짝이는조개" 처럼 이모지+이름이 글자로 나오는 곳은 화면에 나타날 때 자동으로 그림으로 바꾼다.
// 되돌리려면 loader.js 에서 이 파일 줄만 지우면 됨.
(function () {
  'use strict';
  if (window.__matIcons) return; window.__matIcons = true;
  var BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var MAP = {"반짝이는조개": "mat-shell.png", "달빛모래": "mat-moonsand.png", "별빛모래": "mat-starsand.png", "맑은샘물": "mat-spring.png", "바다진주": "mat-pearl.png", "달의눈물": "mat-moontear.png", "무지개꽃": "mat-rainbowflower.png", "장미꽃": "mat-rose.png", "나비가루": "mat-butterflydust.png", "네잎클로버": "mat-clover4.png", "나비의날개": "mat-butterflywing.png", "벚꽃결정": "mat-sakuracrystal.png", "별빛나무": "mat-starwood.png", "고급원목": "mat-goodwood.png", "신비버섯": "mat-mushroom.png", "새의깃털": "mat-birdfeather.png", "행운의잎": "mat-luckyleaf.png", "천사의깃털": "mat-angelfeather.png", "빛나는돌": "mat-shiningstone.png", "은빛거미줄": "mat-spiderweb.png", "기타": "mat-gtr.png", "베이스": "mat-bas.png", "드럼": "mat-drm.png", "피아노": "mat-pno.png", "신스": "mat-syn.png", "스트링": "mat-str.png", "마이크": "mat-mic.png", "색소폰": "mat-sax.png", "트럼펫": "mat-tpt.png", "코러스": "mat-cho.png", "믹싱콘솔": "mat-mix.png", "달빛수정": "mat-moonlightcrystal.png", "별의파편": "mat-starfragment.png", "무지개수정": "mat-rainbowcrystal.png", "구름조각": "mat-cloudpiece.png", "해바라기": "mat-sunflower.png", "공방의 원석": "mat-forgeore.png", "재조합석": "mat-recombine.png", "강화석": "mat-enhance.png", "방지권": "mat-protect.png", "초월석": "mat-transcend.png", "프리미엄 조각": "mat-premiumpiece.png", "온음표": "mat-n1.png", "2분음표": "mat-n2.png", "4분음표": "mat-n4.png", "8분음표": "mat-n8.png", "16분음표": "mat-n16.png", "셋잇단음표": "mat-trp.png", "악보용지": "mat-scr.png", "가사조각": "mat-lyr.png", "영감의불꽃": "mat-spk.png", "꽃다발": "mat-gift_bouquet.png", "케이크": "mat-gift_cake.png", "게임기": "mat-gift_game.png", "곰인형": "mat-gift_bear.png", "책": "mat-gift_book.png", "에너지드링크": "mat-drink_energy.png", "딸기스무디": "mat-drink_smoothie.png", "사과주스": "mat-drink_juice.png", "에픽 재조합석": "mat-epicstone.png", "소원의 조각": "mat-wishpiece.png", "소원의 결정": "mat-wishcrystal.png", "별빛 털": "mat-sp_fur.png", "반짝이는 날개가루": "mat-sp_dust.png", "은빛 깃털": "mat-sp_feather.png", "신비한 꽃가루": "mat-sp_pollen.png", "달빛 잎사귀": "mat-sp_leaf.png", "수정 조각": "mat-sp_crystal.png", "월광 리본": "mat-gear_ribbon.png", "프리즘 브로치": "mat-gear_prism.png", "천공 깃털 배지": "mat-gear_sky.png", "은하수 브로치": "mat-gear_galaxy.png", "수정 왕관 배지": "mat-gear_crown.png", "불꽃 펜던트": "mat-gear_flame.png", "성운 펜던트": "mat-gear_nebula.png", "용의 심장 브로치": "mat-gear_dragon.png", "응원 머리띠": "goods-hat-1.png", "팬클럽 야구모자": "goods-hat-2.png", "반짝 왕관": "goods-hat-3.png", "응원 메가폰": "goods-hand-1.png", "야광봉": "goods-hand-2.png", "팬클럽 목걸이": "goods-acc-1.png", "투어 헤드폰": "goods-acc-2.png", "기념 반지": "goods-acc-3.png", "별빛 송사리": "mat-fish_songsari.png", "은빛 붕어": "mat-fish_bungeo.png", "달빛 잉어": "mat-fish_ingeo.png", "꽃잎 금붕어": "mat-fish_goldfish.png", "황금 잉어": "mat-fish_goldcarp.png", "통발 새우": "mat-trap_shrimp.png", "통발 가재": "mat-trap_crayfish.png", "진주조개": "mat-trap_pearlclam.png", "황금 진주조개": "mat-trap_goldclam.png", "반짝이 가루": "mat-sparkledust.png", "무지개색 이슬": "mat-rainbowdew.png", "필름": "mat-film.png", "현상액": "mat-developer.png", "등교권 조각": "mat-ticketfrag.png", "등교권": "mat-ticket.png", "감정 스킬북": "mat-book_emotion.png", "액션 스킬북": "mat-book_action.png", "애드리브 스킬북": "mat-book_adlib.png", "보조 스킬북": "mat-book_aux.png", "작은 회복약": "mat-potion_s.png", "큰 회복약": "mat-potion_l.png", "피로회복 드링크": "mat-drink_fatigue.png", "프리미엄 카드 선택권": "mat-premiumpick.png", "카메라": "mat-tool_camera.png", "무드조명": "mat-tool_mood.png", "분위기 향수": "mat-tool_scent.png"};
  var NAMES = Object.keys(MAP).sort(function (a, b) { return b.length - a.length; });

  // 굿즈 공방 장비: 이름이 선물과 겹치는 "꽃다발" 때문에 종류(type)로 따로 찾는다
  var GOODS = {'꽃다발': 'goods-hand-3.png'};   // (나머지 8개는 MAP 에 이름으로 들어 있음)
  function iconFor(it, px) {
    if (it && it.type === 'goods_gear' && it.gear && GOODS[it.gear.base]) return '<img data-mi="1" src="' + BASE + GOODS[it.gear.base] + '" alt="" draggable="false" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;pointer-events:none;">';
    return icon(it.name, px, it.emoji);
  }
  function url(name) { var f = MAP[String(name || '').replace(/^[^\w가-힣\[]+/, '').replace(/^\[[^\]]*\]\s*/, '').trim()]; return f ? BASE + f : ''; }
  function icon(name, px, fb) {
    var u = url(name); px = px || 24;
    if (!u) return fb || '';
    return '<img data-mi="1" src="' + u + '" alt="" draggable="false" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;vertical-align:-' + Math.round(px * 0.2) + 'px;pointer-events:none;"' + (fb ? ' onerror="this.outerHTML=\'' + String(fb).replace(/'/g, '') + '\'"' : '') + '>';
  }
  var imgCache = {};
  function image(name) {
    var u = url(name); if (!u) return null;
    if (imgCache[u]) return imgCache[u];
    var im = new Image(); im.crossOrigin = 'anonymous'; im.onload = function () { im._ok = true; }; im.src = u; imgCache[u] = im; return im;
  }
  window.matIconUrl = url; window.matIcon = icon; window.matImage = image;

  // ── 글자로 나오는 "🐚 이름" → "[그림] 이름" 자동 교체 ──
  var EM = '[\\u2600-\\u27BF\\u2B00-\\u2BFF\\u2669-\\u266F\\u{1F000}-\\u{1FAFF}][\\uFE0F\\u200D]?';
  var RE = new RegExp('(' + EM + ')\\s?(?:\\[[^\\]]{1,8}\\]\\s?)?(' + NAMES.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (n.length <= 2 ? '(?![가-힣])' : ''); }).join('|') + ')', 'u');
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CANVAS: 1, OPTION: 1, SELECT: 1 };
  function fixText(node) {
    var t = node.nodeValue; if (!t || t.length > 400) return;
    var m = RE.exec(t); if (!m) return;
    var par = node.parentNode; if (!par || SKIP[par.nodeName] || (par.closest && par.closest('[contenteditable],[data-mi]'))) return;
    var before = t.slice(0, m.index), after = t.slice(m.index + m[1].length + (t.charAt(m.index + m[1].length) === ' ' ? 1 : 0));
    var frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    var sp = document.createElement('span'); sp.innerHTML = icon(m[2], 20, m[1]);
    while (sp.firstChild) frag.appendChild(sp.firstChild);
    frag.appendChild(document.createTextNode(' ' + after));
    par.replaceChild(frag, node);
  }
  // 잡화점 칸(선물·음료·재료 판매): 이름으로 그림 찾아서 이모지 자리에 끼움
  function fixShop(root) {
    if (!root.querySelectorAll) return;
    var list = root.matches && root.matches('.shop-item-emoji') ? [root] : Array.prototype.slice.call(root.querySelectorAll('.shop-item-emoji'));
    list.forEach(function (el) {
      if (el.querySelector('[data-mi]')) return;
      var row = el.closest('.shop-item'), nm = row && row.querySelector('.shop-item-name');
      if (!nm) return;
      var name = nm.textContent.replace(/\s*\(\d+개\)\s*$/, '').trim();
      if (url(name)) el.innerHTML = icon(name, 38, el.textContent);
    });
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 1) { try { fixShop(root); } catch (e) {} }
    if (root.nodeType === 3) { fixText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    var w = document.createTreeWalker(root, 4, null), list = [], n;
    while ((n = w.nextNode())) { if (n.nodeValue && n.nodeValue.length > 1 && n.nodeValue.length < 400) list.push(n); }
    list.forEach(fixText);
  }
  var pend = [], raf = 0;
  function flush() { raf = 0; var l = pend; pend = []; l.forEach(function (n) { if (n.isConnected) scan(n); }); }
  function start() {
    if (!document.body) return setTimeout(start, 200);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'characterData') pend.push(m.target);
        else m.addedNodes.forEach(function (n) { if (!(n.nodeType === 1 && n.getAttribute && n.getAttribute('data-mi'))) pend.push(n); });
      });
      if (pend.length && !raf) raf = requestAnimationFrame(flush);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    scan(document.body);
  }
  start();

  // ── 가방 칸 / 가방 상세 ──
  function wrap(fname, after) {
    var orig = window[fname]; if (typeof orig !== 'function' || orig.__mi) return;
    var w = function () { var r = orig.apply(this, arguments); try { after.apply(this, arguments); } catch (e) {} return r; };
    w.__mi = true; window[fname] = w;
  }
  function bagGrid() {
    try {
      var slots = document.querySelectorAll('#bag-grid .bag-slot.has-item');
      Array.prototype.forEach.call(slots, function (el, i) {
        var it = bagItems[i], u = it && !it.img ? (url(it.name) || (it.type === 'goods_gear' && it.gear && GOODS[it.gear.base]) || '') : '';
        var nmEl = el.querySelector('.bag-item-name');
        if (it && nmEl) nmEl.textContent = String(it.name).replace(/[\u{1F300}-\u{1FFFF}]/gu, '').trim();   // 5글자로 잘리던 이름을 전부 보여줌
        var em = el.querySelector('.bag-item-emoji');
        if (u && em) em.innerHTML = iconFor(it, 40);
      });
    } catch (e) {}
  }
  function bagDetail(idx) {
    try {
      var it = bagItems[idx]; if (!it || !(url(it.name) || (it.type === 'goods_gear' && it.gear && GOODS[it.gear.base]))) return;
      var ovs = document.querySelectorAll('div[style*="font-size:52px"]');
      Array.prototype.forEach.call(ovs, function (d) { if (d.textContent.trim() === String(it.emoji).trim()) d.innerHTML = iconFor(it, 64); });
    } catch (e) {}
  }
  try { var st = document.createElement('style'); st.textContent = '#bag-grid .bag-item-name{white-space:normal!important;line-height:1.15;font-size:8.5px!important;word-break:keep-all;max-height:2.4em;}'; document.head.appendChild(st); } catch (e) {}
  function hookBag() { wrap('renderBag', bagGrid); wrap('showBagItemDetail', bagDetail); }
  hookBag(); setTimeout(hookBag, 1500); setTimeout(hookBag, 4000);
})();
