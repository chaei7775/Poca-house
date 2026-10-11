// ════════════════════════════════
// 🔮 그룹 투자 마법진 (group-magic.js) — 투자할수록 멤버 발밑의 마법진이 커지고 화려해진다
//  · 그림: grp-magic.webp (512px, 투명 배경에 흰 선). 마스크로 쓰고 색은 시설 색으로 칠한다 (그림 한 장으로 여러 색)
//  · 투자 합계 1~7: 1겹 / 8~15: 2겹 / 16이상: 3겹 (겹마다 반대 방향으로 돌아감). 합계가 클수록 빛이 강해짐
//  · 색: 투자한 시설 색 (녹음실 분홍 · 연습실 파랑 · 촬영 금색 · 세트장 초록 · 숙소 주황 · 투어 보라). 활동에 맞는 시설 색이 먼저
//  · 쓰는 곳: 활동 연출 화면(group-stage.js) / 그룹 화면의 멤버 줄(group.js)  — 투자가 0이면 아무것도 안 그린다
//  · 호출: window.__groupMagic.html({ act, size, css, flat, fast, dim }) → 넣을 HTML 문자열
// ════════════════════════════════
(function () {
  'use strict';
  var COL = { studio: '#ff6bd6', practice: '#4aa8ff', shoot: '#ffd76a', setpark: '#7dffb0', dorm: '#ffa86b', tour: '#c084fc' };
  var IMG = 'grp-magic.webp';
  function css() {
    if (document.getElementById('gm-css')) return;
    var st = document.createElement('style'); st.id = 'gm-css';
    st.textContent = '@keyframes gmSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes gmPulse{0%,100%{opacity:.7}50%{opacity:1}}';
    document.head.appendChild(st);
  }
  function mixed(list) { return list.length > 1 ? 'linear-gradient(135deg,' + list.join(',') + ')' : list[0]; }
  // 투자 정보: 겹 수 / 색 목록 / 번짐 크기 (html·draw 가 같이 씀)
  function info(o) {
    var gi = window.__groupInvest; if (!gi || !gi.FAC) return null;
    var total = gi.total(); if (total <= 0) return null;
    var fl = gi.FAC.filter(function (f) { return gi.lvOf(f.id) > 0; });
    fl.sort(function (a, b) {
      var ra = (!a.acts || (o.act && a.acts.indexOf(o.act) !== -1)) ? 1 : 0, rb = (!b.acts || (o.act && b.acts.indexOf(o.act) !== -1)) ? 1 : 0;
      return (rb - ra) || (gi.lvOf(b.id) - gi.lvOf(a.id));
    });
    return { total: total, cols: fl.map(function (f) { return COL[f.id] || '#fff'; }), n: total >= 16 ? 3 : total >= 8 ? 2 : 1, glow: 5 + Math.round(total * 0.5) };
  }

  // ── 캔버스 맵용 (공항 입국장·VIP 게이트·월드투어 스타디움): 플레이어 발밑에 눕혀서 돌려 그린다 ──
  var im = null, imOk = false, tints = {};
  function tinted(col) {
    if (tints[col]) return tints[col];
    var S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S;
    var g = cv.getContext('2d'); g.drawImage(im, 0, 0, S, S); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, S, S);
    return (tints[col] = cv);
  }
  // c: 캔버스 ctx / x,y: 플레이어 중심 / R: 플레이어 반지름 / t: 시간(초)
  function draw(c, x, y, R, t) {
    var f = info({}); if (!f) return;
    if (!im) { im = new Image(); im.onload = function () { imOk = true; }; im.src = IMG; return; }
    if (!imOk) return;
    var SC = [1, 0.72, 0.5], SP = [0.35, -0.55, 0.9];
    c.save();
    c.translate(x, y + R * 0.85); c.scale(1, 0.62);
    c.globalCompositeOperation = 'lighter';
    for (var i = 0; i < f.n; i++) {
      var col = f.cols[i % f.cols.length], rr = R * 5.2 * SC[i];
      c.save(); c.rotate((t || 0) * SP[i]); c.globalAlpha = 1;
      c.drawImage(tinted(col), -rr, -rr, rr * 2, rr * 2);
      c.drawImage(tinted(col), -rr, -rr, rr * 2, rr * 2);   // 두 번 겹쳐 그려서 더 진하고 또렷하게
      c.restore();
    }
    c.restore();
  }

  function html(o) {
    o = o || {};
    var f = info(o); if (!f) return '';
    css();
    var cols = f.cols, n = f.n;
    var glow = f.glow, S = o.size || 260, sp = o.fast ? 0.6 : 1;
    var SC = [1, 0.72, 0.5], T = [26, 17, 11], layers = '';
    for (var i = 0; i < n; i++) {
      var c1 = cols[i % cols.length], c2 = cols[(i + 1) % cols.length];
      var bg = mixed(c1 === c2 ? [c1] : [c1, c2]);
      layers += '<div style="position:absolute;inset:0;transform:scale(' + SC[i] + ');filter:drop-shadow(0 0 ' + glow + 'px ' + c1 + ');">' +
        '<div style="width:100%;height:100%;background:' + bg + ';-webkit-mask-image:url(' + IMG + ');mask-image:url(' + IMG + ');-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;' +
        'animation:gmSpin ' + (T[i] * sp).toFixed(1) + 's linear infinite' + (i % 2 ? ' reverse' : '') + ';"></div></div>';
    }
    var tilt = o.flat === false ? '' : 'transform:perspective(' + Math.round(S * 2) + 'px) rotateX(64deg);';
    return '<div class="gm-wrap" style="position:absolute;width:' + S + 'px;height:' + S + 'px;pointer-events:none;' + tilt + 'opacity:' + (o.dim ? 0.4 : 0.9) + ';' + (o.dim ? 'filter:grayscale(.9);' : 'animation:gmPulse 3s ease-in-out infinite;') + (o.css || '') + '">' + layers + '</div>';
  }
  window.__groupMagic = { html: html, draw: draw };
})();
