// 🖼️ 재료 아이콘 (mat-icons.js)
// 이모지로 나오던 재료(51종)를 그림(mat-*.png)으로 바꿔서 보여준다. 그림이 아직 안 불러와졌거나 없으면 원래 이모지가 그대로 나온다.
//  · window.matIconUrl(이름) / window.matIcon(이름, 크기px, 대체이모지) → <img> HTML / window.matImage(이름) → 캔버스용 Image(_ok)
//  · 가방 칸·가방 상세는 여기서 직접 바꿔 끼우고, "🐚 반짝이는조개" 처럼 이모지+이름이 글자로 나오는 곳은 화면에 나타날 때 자동으로 그림으로 바꾼다.
// 되돌리려면 loader.js 에서 이 파일 줄만 지우면 됨.
(function () {
  'use strict';
  if (window.__matIcons) return; window.__matIcons = true;
  var BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var MAP = {"반짝이는조개": "mat-shell.png", "달빛모래": "mat-moonsand.png", "별빛모래": "mat-starsand.png", "맑은샘물": "mat-spring.png", "바다진주": "mat-pearl.png", "달의눈물": "mat-moontear.png", "무지개꽃": "mat-rainbowflower.png", "장미꽃": "mat-rose.png", "나비가루": "mat-butterflydust.png", "네잎클로버": "mat-clover4.png", "나비의날개": "mat-butterflywing.png", "벚꽃결정": "mat-sakuracrystal.png", "별빛나무": "mat-starwood.png", "고급원목": "mat-goodwood.png", "신비버섯": "mat-mushroom.png", "새의깃털": "mat-birdfeather.png", "행운의잎": "mat-luckyleaf.png", "천사의깃털": "mat-angelfeather.png", "빛나는돌": "mat-shiningstone.png", "은빛거미줄": "mat-spiderweb.png", "기타": "mat-gtr.png", "베이스": "mat-bas.png", "드럼": "mat-drm.png", "피아노": "mat-pno.png", "신스": "mat-syn.png", "스트링": "mat-str.png", "마이크": "mat-mic.png", "색소폰": "mat-sax.png", "트럼펫": "mat-tpt.png", "코러스": "mat-cho.png", "믹싱콘솔": "mat-mix.png", "달빛수정": "mat-moonlightcrystal.png", "별의파편": "mat-starfragment.png", "무지개수정": "mat-rainbowcrystal.png", "구름조각": "mat-cloudpiece.png", "해바라기": "mat-sunflower.png", "공방의 원석": "mat-forgeore.png", "재조합석": "mat-recombine.png", "강화석": "mat-enhance.png", "방지권": "mat-protect.png", "초월석": "mat-transcend.png", "프리미엄 조각": "mat-premiumpiece.png", "온음표": "mat-n1.png", "2분음표": "mat-n2.png", "4분음표": "mat-n4.png", "8분음표": "mat-n8.png", "16분음표": "mat-n16.png", "셋잇단음표": "mat-trp.png", "악보용지": "mat-scr.png", "가사조각": "mat-lyr.png", "영감의불꽃": "mat-spk.png"};
  var NAMES = Object.keys(MAP).sort(function (a, b) { return b.length - a.length; });

  function url(name) { var f = MAP[String(name || '').replace(/^[^\w가-힣]+/, '').trim()]; return f ? BASE + f : ''; }
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
  var RE = new RegExp('(' + EM + ')\\s?(' + NAMES.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'u');
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
  function scan(root) {
    if (!root) return;
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
        var it = bagItems[i], u = it && !it.img ? url(it.name) : '';
        var em = el.querySelector('.bag-item-emoji');
        if (u && em) em.innerHTML = icon(it.name, 40, it.emoji);
      });
    } catch (e) {}
  }
  function bagDetail(idx) {
    try {
      var it = bagItems[idx]; if (!it || !url(it.name)) return;
      var ovs = document.querySelectorAll('div[style*="font-size:52px"]');
      Array.prototype.forEach.call(ovs, function (d) { if (d.textContent.trim() === String(it.emoji).trim()) d.innerHTML = icon(it.name, 64, it.emoji); });
    } catch (e) {}
  }
  function hookBag() { wrap('renderBag', bagGrid); wrap('showBagItemDetail', bagDetail); }
  hookBag(); setTimeout(hookBag, 1500); setTimeout(hookBag, 4000);
})();
