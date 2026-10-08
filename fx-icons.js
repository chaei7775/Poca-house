// ════════════════════════════════════════════════════════════
// ✨ 폭죽/별 이모지 → 그림 교체 (fx-icons.js)
// 화면 어디서든 🎉🎊✨⭐🌟 이 나오면 자동으로 그림(fx-*.png)으로 바꿔 보여준다. (팝업·토스트·캔버스 공통)
// ✏️ 그림 바꾸는 법: fx-star/glow/spark/burst/popper/shower.png 파일 교체
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var BASE = 'https://raw.githubusercontent.com/chaei7775/Poca-house/main/';
  // 이모지 → 그림 파일(fx-○○.png). 그림을 바꾸려면 같은 이름 파일만 교체하면 됨
  var MAP = { '🎉': 'popper', '🎊': 'burst', '✨': 'spark', '⭐': 'star', '🌟': 'glow', '💫': 'shower' };
  var URL = {}, IMG = {};
  ['popper', 'burst', 'spark', 'star', 'glow', 'shower'].forEach(function (k) { URL[k] = BASE + 'fx-' + k + '.png'; });
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
