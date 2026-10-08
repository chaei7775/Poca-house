// ════════════════════════════════════════════════════════════
// ✨ 폭죽/별 이모지 → 그림 교체 (fx-icons.js)
// 화면 어디서든 🎉🎊✨⭐🌟 이 나오면 자동으로 그림(SVG)으로 바꿔 보여준다. (팝업·토스트·캔버스 공통)
// ✏️ 그림 모양 고치는 법: 아래 SVG 문자열만 바꾸면 전부 같이 바뀜
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var G = '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE98A"/><stop offset="1" stop-color="#F5A524"/></linearGradient>' +
    '<radialGradient id="h"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#FFD54A" stop-opacity="0"/></radialGradient></defs>';
  var STAR = 'M32 5 L39.5 23.5 L59 25 L44 38 L48.8 57.5 L32 47 L15.2 57.5 L20 38 L5 25 L24.5 23.5 Z';
  var SVG = {
    star: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + G + '<path d="' + STAR + '" fill="url(#g)" stroke="#C98A12" stroke-width="3" stroke-linejoin="round"/><path d="M32 12 L36 24 L26 25 Z" fill="#fff" opacity=".55"/></svg>',
    glow: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + G + '<circle cx="32" cy="32" r="30" fill="url(#h)"/><path d="' + STAR + '" fill="url(#g)" stroke="#E0A020" stroke-width="2.5" stroke-linejoin="round" transform="translate(6.4 6.4) scale(.8)"/></svg>',
    spark: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' + G + '<path d="M28 6 Q30 26 50 28 Q30 30 28 50 Q26 30 6 28 Q26 26 28 6Z" fill="#FFF3B0" stroke="#F5C542" stroke-width="2.5" stroke-linejoin="round"/><path d="M50 36 Q51 44 58 45 Q51 46 50 54 Q49 46 42 45 Q49 44 50 36Z" fill="#FFE27A"/><circle cx="14" cy="50" r="3" fill="#FFE27A"/></svg>',
    party: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke-linecap="round" fill="none" stroke-width="4"><path d="M32 30 L32 8" stroke="#FF5C93"/><path d="M32 30 L12 16" stroke="#FFD54A"/><path d="M32 30 L52 16" stroke="#4FC3F7"/><path d="M32 30 L6 34" stroke="#B388FF"/><path d="M32 30 L58 34" stroke="#69DB7C"/></g><rect x="26" y="2" width="8" height="5" rx="1.5" fill="#FF5C93" transform="rotate(20 30 4)"/><rect x="6" y="8" width="8" height="5" rx="1.5" fill="#FFD54A" transform="rotate(-30 10 10)"/><rect x="50" y="8" width="8" height="5" rx="1.5" fill="#4FC3F7" transform="rotate(35 54 10)"/><circle cx="4" cy="42" r="3.5" fill="#B388FF"/><circle cx="60" cy="42" r="3.5" fill="#69DB7C"/><circle cx="20" cy="42" r="3" fill="#FFD54A"/><circle cx="46" cy="44" r="3" fill="#FF5C93"/><circle cx="32" cy="46" r="3.5" fill="#4FC3F7"/><circle cx="32" cy="30" r="5" fill="#fff" stroke="#FFD54A" stroke-width="2.5"/></svg>'
  };
  var MAP = { '🎉': 'party', '🎊': 'party', '✨': 'spark', '⭐': 'star', '🌟': 'glow', '💫': 'glow' };
  var URL = {}, IMG = {};
  Object.keys(SVG).forEach(function (k) { URL[k] = 'data:image/svg+xml;utf8,' + encodeURIComponent(SVG[k]); });
  var RE = /(?:🎉|🎊|✨|⭐|🌟|💫)️?/g;
  var TEST = /🎉|🎊|✨|⭐|🌟|💫/;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, OPTION: 1, TITLE: 1, INPUT: 1, NOSCRIPT: 1 };

  // 한 글자(🎉 등) 를 <span> 으로 감싸서 그림을 배경으로 깐다 (글자는 투명하게 남겨 둬서 textContent 는 그대로)
  function mk(ch) {
    var s = document.createElement('span');
    s.className = 'phfx';
    s.textContent = ch;
    s.style.cssText = 'display:inline-block;width:1.05em;height:1.05em;vertical-align:-.14em;overflow:hidden;white-space:nowrap;color:transparent;text-shadow:none;' +
      'background:url("' + URL[MAP[ch]] + '") center/contain no-repeat;';
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
      frag.appendChild(mk(m[0].charAt(0) === '️' ? m[0] : String.fromCodePoint(m[0].codePointAt(0))));
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
  function start() {
    scan(document.body);
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === 'characterData') fixText(m.target);
        else m.addedNodes.forEach(function (n) { if (!(n.classList && n.classList.contains('phfx'))) scan(n); });
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  // 캔버스 게임: 이모지 한 글자만 찍는 fillText 를 그림 그리기로 바꾼다
  function img(k) {
    if (!IMG[k]) { IMG[k] = new Image(); IMG[k].src = URL[k]; }
    return IMG[k];
  }
  Object.keys(URL).forEach(img);
  var orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, mw) {
    try {
      var t = String(text).replace(/️/g, '').trim();
      var k = MAP[t];
      if (k) {
        var im = img(k);
        if (im.complete && im.naturalWidth) {
          var px = parseFloat((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 16])[1]) || 16;
          var s = px * 1.05, a = this.textAlign, b = this.textBaseline;
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
