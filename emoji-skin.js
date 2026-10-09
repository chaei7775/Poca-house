// ════════════════════════════════════════════════════════════
// 🖼️ 이모지 → 그림 교체 (emoji-skin.js)
// 화면 어디서든 아래 MAP 에 있는 이모지가 나오면 자동으로 그림(em-○○.png)으로 바꿔 보여준다. (팝업·토스트·캔버스 공통)
// ✏️ 그림 바꾸는 법: 같은 이름의 em-○○.png 교체 / 이모지 추가는 MAP 에 한 줄 + 그림 파일 추가
// 되돌리려면 loader.js 에서 이 파일 줄만 지우면 됨.
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (window.__emojiSkin) return; window.__emojiSkin = true;
  var BASE = window.__emojiBase || 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  var MAP = {
    // 아이템/재화
    '🍔': 'burger', '🎁': 'gift', '🧩': 'puzzle', '🔹': 'gemblue', '🔶': 'gemorange', '💠': 'gemepic', '💎': 'diamond', '🎀': 'bow',
    '🎒': 'bag', '🔨': 'hammer', '🧪': 'potion', '🎫': 'ticket', '🎟': 'pass', '💰': 'moneybag', '🪙': 'coin', '🏆': 'trophy', '🍀': 'clover',
    // 무대/방송
    '🎤': 'mic', '📸': 'camera', '🎥': 'movie', '🎞': 'film', '📺': 'tv', '🎧': 'headphones', '🎹': 'keys', '🎼': 'notes', '🎵': 'notes', '🎶': 'notes',
    '🎭': 'mask', '🎙': 'standmic', '📣': 'mega', '📰': 'news', '🕶': 'sunglasses', '🚐': 'van', '📷': 'instant', '🏟': 'stadium',
    // 마음/감정
    '💖': 'heart', '💝': 'heart', '💗': 'heart', '💓': 'heart', '❤': 'heart', '💞': 'heart', '💕': 'heart',
    '💜': 'heart', '🤍': 'heart', '💔': 'heartbroken', '♥': 'heart', '🩷': 'heart', '💌': 'letter', '😊': 'smile', '😢': 'cry', '😴': 'sleep',
    '💪': 'muscle', '👑': 'crown', '🌹': 'rose', '🌸': 'blossom', '🌷': 'blossom', '🦋': 'butterfly',
    // 광역 스킬 아이콘 (전용 이모지 → em-sk-○○.png)
    '🪩': 'sk-highlight', '😘': 'sk-wink', '🧨': 'sk-encore', '🎠': 'sk-rose', '🎑': 'sk-finale',
    '🔆': 'pt-sparkle', '🏵': 'pt-star', '🎗': 'pt-heartpink', '🧧': 'pt-heartred', '🎐': 'pt-note1', '🎏': 'pt-note2', '🥀': 'pt-petal', '🪅': 'pt-blossom', '🎍': 'pt-fwgold', '🧿': 'pt-fwblue', '🔅': 'pt-ribbon', '🪭': 'pt-confetti',
    '🪓': 'enh-work', '🔰': 'enh-ok', '🌫': 'enh-fail', '🪬': 'enh-protect', '🧱': 'enh-destroy', '🔱': 'enh-trans',
    '🖋': 'sk-sign', '🫱': 'sk-photo', '🫰': 'sk-shake', '🫶': 'sk-heart',
    // 생활/UI
    '🔒': 'lock', '🔥': 'fire', '⚡': 'bolt', '🛡': 'shield', '🚨': 'siren', '🔮': 'crystal', '📖': 'book', '📘': 'book', '📚': 'book',
    '📅': 'calendar', '📋': 'clipboard', '👗': 'dress', '🎽': 'dress', '🧵': 'thread', '☕': 'coffee', '🥤': 'drink', '🌙': 'moon', '💡': 'bulb', '🏠': 'house'
  };
  var KEYS = Object.keys(MAP);
  var RE = new RegExp('(?:' + KEYS.join('|') + ')\\uFE0F?', 'g');
  var TEST = new RegExp(KEYS.join('|'));
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, OPTION: 1, TITLE: 1, INPUT: 1, NOSCRIPT: 1 };
  var IMG = {};
  function url(k) { return BASE + 'em-' + k + '.png'; }
  function mk(ch) {
    var s = document.createElement('span');
    s.className = 'phfx';
    s.textContent = ch;
    s.style.cssText = 'display:inline-block;width:1.1em;height:1.1em;vertical-align:-.2em;overflow:hidden;white-space:nowrap;color:transparent;text-shadow:none;' +
      'background:url("' + url(MAP[ch]) + '") center/contain no-repeat;';
    return s;
  }
  function fixText(t) {
    var p = t.parentNode;
    if (!p || SKIP[p.nodeName] || (p.classList && p.classList.contains('phfx'))) return;
    var v = t.nodeValue;
    if (!v || !TEST.test(v)) return;
    var frag = document.createDocumentFragment(), last = 0, m;
    RE.lastIndex = 0;
    while ((m = RE.exec(v))) {
      if (m.index > last) frag.appendChild(document.createTextNode(v.slice(last, m.index)));
      frag.appendChild(mk(m[0].replace(/️/g, '')));
      last = m.index + m[0].length;
    }
    if (last < v.length) frag.appendChild(document.createTextNode(v.slice(last)));
    p.replaceChild(frag, t);
  }
  function scan(n) {
    if (n.nodeType === 3) { fixText(n); return; }
    if (n.nodeType !== 1 || SKIP[n.nodeName]) return;
    var w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT, null), list = [], x;
    while ((x = w.nextNode())) if (TEST.test(x.nodeValue)) list.push(x);
    list.forEach(fixText);
  }
  // 그림을 미리 받아 둔다 (처음 이모지가 보였다가 바뀌거나, 그림이 뜨기 전에 빈칸이 보이는 깜빡임 방지)
  function preload() {   // 한꺼번에 받으면 폰 메모리가 튀어서, 몇 장씩 나눠서 천천히 받는다
    var seen = {}, q = [];
    KEYS.forEach(function (c) { var k = MAP[c]; if (!seen[k]) { seen[k] = 1; q.push(k); } });
    (function next() { q.splice(0, 6).forEach(function (k) { var i = new Image(); i.src = url(k); IMG[k] = i; }); if (q.length) setTimeout(next, 250); })();
  }
  // 페이지가 그려지기 시작할 때부터 지켜본다: 새로 생기는 글자는 화면에 그려지기 전에 바로 그림으로 바꿈
  function start() {
    setTimeout(preload, 3000);   // 시작할 때는 화면부터 띄우고, 그림 미리받기는 3초 뒤에
    if (document.body) scan(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'characterData') fixText(m.target);
        else m.addedNodes.forEach(function (n) { if (!(n.classList && n.classList.contains('phfx'))) scan(n); });
      });
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    if (!document.body) document.addEventListener('DOMContentLoaded', function () { scan(document.body); });
  }
  start();

  // 캔버스: 이모지 한 글자만 찍는 fillText 를 그림 그리기로 바꾼다
  function img(k) { if (!IMG[k]) { IMG[k] = new Image(); IMG[k].src = url(k); } return IMG[k]; }
  var orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, mw) {
    try {
      var t = String(text).replace(/️/g, '').trim();
      var k = MAP[t];
      if (k) {
        var im = img(k);
        if (im.complete && im.naturalWidth) {
          var px = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 16])[1]) || 16;
          var s = px * 1.1, a = this.textAlign, b = this.textBaseline;
          var dx = (a === 'center') ? x - s / 2 : (a === 'right' || a === 'end') ? x - s : x;
          var dy = (b === 'middle') ? y - s / 2 : (b === 'top' || b === 'hanging') ? y : y - s * 0.85;
          this.drawImage(im, dx, dy, s, s);
          return;
        }
      }
    } catch (e) {}
    return orig.apply(this, arguments);
  };
})();
