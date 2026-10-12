// ════════════════════════════════
// 🔮 그룹 투자 마법진 (group-magic.js) — 투자할수록 멤버 발밑의 마법진이 커지고 화려해진다
//  · 그림: grp-magic.webp (512px, 투명 배경에 흰 선). 마스크로 쓰고 색은 시설 색으로 칠한다 (그림 한 장으로 여러 색)
//  · 투자 합계 1~7: 1겹 / 8~15: 2겹 / 16이상: 3겹 (겹마다 반대 방향으로 돌아감). 합계가 클수록 빛이 강해짐
//  · 색: 투자한 시설 색 (녹음실 분홍 · 연습실 파랑 · 촬영 금색 · 세트장 초록 · 숙소 주황 · 투어 보라). 활동에 맞는 시설 색이 먼저
//  · 🌑 은백색 마법진은 '초월' 효과: 히든카드를 초월한 멤버(window.getTranscendStage)에게만 금빛 마법진 위에 겹쳐 나온다 (초월 1~3단계: 반짝이 4/6/8개 · 3단계는 더 빠르게). 투자가 0이어도 초월했으면 은백색 마법진만 나옴. 그룹 화면은 멤버 중 가장 높은 초월 단계
//  · 쓰는 곳: 활동 연출 화면(group-stage.js) / 그룹 화면의 멤버 줄(group.js)  — 투자가 0이면 아무것도 안 그린다
//  · 호출: window.__groupMagic.html({ act, size, css, flat, fast, dim }) → 넣을 HTML 문자열
// ════════════════════════════════
(function () {
  'use strict';
  var COL = { studio: '#ff6bd6', practice: '#4aa8ff', shoot: '#ffd76a', setpark: '#7dffb0', dorm: '#ffa86b', tour: '#c084fc' };
  var DARK = 'grp-magic-dark.webp';   // 🌑 금빛 마법진 위에 겹치는 작은 은백색 마법진 (256px, 금빛 마법진의 0.6배 크기로 반대 방향으로 빠르게 돌고 반짝임)
  var DARK_SC = 0.6, DARK_T = 6;       // 금빛 마법진 대비 크기 / html 판 회전 한 바퀴 시간(초) — 금빛은 11~26초
  var IMG = 'grp-magic-img.webp';   // 채이가 준 금빛 마법진 원본 그림 (색 안 바꾸고 그대로 씀)
  function css() {
    if (document.getElementById('gm-css')) return;
    var st = document.createElement('style'); st.id = 'gm-css';
    st.textContent = '@keyframes gmSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes gmPulse{0%,100%{opacity:.7}50%{opacity:1}}@keyframes gmTw{0%,100%{opacity:.1;transform:scale(.4)}50%{opacity:1;transform:scale(1.15)}}';
    document.head.appendChild(st);
  }
  function trStage(o) {   // 초월 단계 0~3 (o.cid 한 명 또는 o.members 중 최고)
    try {
      if (typeof window.getTranscendStage !== 'function') return 0;
      var ids = o.members ? o.members : (o.cid ? [o.cid] : []), best = 0;
      ids.forEach(function (c) { var n = Number(window.getTranscendStage(c)) || 0; if (n > best) best = n; });
      return Math.max(0, Math.min(3, best));
    } catch (e) { return 0; }
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
  var im = null, imOk = false, tints = {}, dimg = null, dOk = false;
  function tinted(col) {
    if (tints[col]) return tints[col];
    var S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
    var g = cv.getContext('2d'); g.drawImage(im, 0, 0, S, S); 
    return (tints[col] = cv);
  }
  // c: 캔버스 ctx / x,y: 플레이어 중심 / R: 플레이어 반지름 / t: 시간(초)
  function draw(c, x, y, R, t, cid) {
    var f = info({}), ts = trStage({ cid: cid }); if (!f && !ts) return;
    if (!im) { im = new Image(); im.onload = function () { imOk = true; }; im.src = IMG; dimg = new Image(); dimg.onload = function () { dOk = true; }; dimg.src = DARK; return; }
    if (!imOk) return;
    var SC = [1, 0.72, 0.5], SP = [0.35, -0.55, 0.9];
    c.save();
    c.translate(x, y + R * 0.85); c.scale(1, 0.62);
    c.globalCompositeOperation = 'source-over';   // 'lighter' 는 밝은 배경에서 하얗게 번져 선이 두꺼워 보임
    for (var i = 0; f && i < f.n; i++) {
      var col = f.cols[i % f.cols.length], rr = R * 5.2 * SC[i];
      c.save(); c.rotate((t || 0) * SP[i]); c.globalAlpha = 0.85;
      c.drawImage(tinted(col), -rr, -rr, rr * 2, rr * 2);   // 한 번만 (두 번 겹치면 선이 두꺼워 보임)
      c.restore();
    }
    // 🌑 은백색 마법진(초월): 금빛의 0.6배 크기, 반대 방향으로 빠르게 + 반짝이
    if (!ts) { c.restore(); return; }
    if (!dOk) { c.restore(); return; }
    var dr = R * 5.2 * DARK_SC, tt = (t || 0) * (ts >= 3 ? 1.3 : 1), spN = ts === 1 ? 4 : ts === 2 ? 6 : 8;
    c.globalCompositeOperation = 'source-over';
    c.save(); c.rotate(-tt * 1.5); c.globalAlpha = 1; c.drawImage(dimg, -dr, -dr, dr * 2, dr * 2); c.restore();
    c.globalCompositeOperation = 'lighter';
    for (var k = 0; k < spN; k++) {
      var an = -tt * 0.9 + k * Math.PI / 4 + (k % 2 ? 0.2 : 0), rd = dr * (0.9 + (k % 3) * 0.12), tw = 0.5 + 0.5 * Math.sin(tt * (3 + k % 4) + k * 1.7), sz = R * (k % 2 ? 0.14 : 0.2) * (0.4 + tw);
      c.globalAlpha = 0.25 + 0.75 * tw; c.fillStyle = '#e6f2ff';
      var px = Math.cos(an) * rd, py = Math.sin(an) * rd;
      c.beginPath(); c.moveTo(px, py - sz * 1.6); c.lineTo(px + sz * 0.4, py - sz * 0.4); c.lineTo(px + sz * 1.6, py); c.lineTo(px + sz * 0.4, py + sz * 0.4);
      c.lineTo(px, py + sz * 1.6); c.lineTo(px - sz * 0.4, py + sz * 0.4); c.lineTo(px - sz * 1.6, py); c.lineTo(px - sz * 0.4, py - sz * 0.4); c.closePath(); c.fill();
    }
    c.restore();
  }

  function html(o) {
    o = o || {};
    var f = info(o), ts = trStage(o); if (!f && !ts) return '';
    css();
    var cols = f ? f.cols : [], n = f ? f.n : 0;
    var glow = f ? f.glow : 8, S = o.size || 260, sp = o.fast ? 0.6 : 1;
    var SC = [1, 0.72, 0.5], T = [26, 17, 11], layers = '';
    for (var i = 0; i < n; i++) {
      var c1 = cols[i % cols.length], c2 = cols[(i + 1) % cols.length];
      layers += '<div style="position:absolute;inset:0;transform:scale(' + SC[i] + ');filter:drop-shadow(0 0 ' + glow + 'px #ffc860);">' +
        '<img src="' + IMG + '" alt="" decoding="async" style="width:100%;height:100%;display:block;' +
        'animation:gmSpin ' + (T[i] * sp).toFixed(1) + 's linear infinite' + (i % 2 ? ' reverse' : '') + ';"></div>';
    }
    var dk = '<div style="position:absolute;inset:0;transform:scale(' + DARK_SC + ');filter:drop-shadow(0 0 ' + (glow + 2) + 'px #bcd8ff);"><img src="' + DARK + '" alt="" decoding="async" style="width:100%;height:100%;display:block;animation:gmSpin ' + (DARK_T * (ts >= 3 ? 0.75 : 1) * sp).toFixed(1) + 's linear infinite reverse;"></div>';
    var spk = '';   // ✨ 은백색 마법진 둘레를 도는 반짝이
    for (var k = 0, spN = ts === 1 ? 4 : ts === 2 ? 6 : 8; k < spN; k++) { var ang = k * 45 + (k % 2 ? 12 : 0), rad = 24 + (k % 3) * 3; spk += '<span style="position:absolute;left:' + (50 + rad * Math.cos(ang * Math.PI / 180)).toFixed(1) + '%;top:' + (50 + rad * Math.sin(ang * Math.PI / 180)).toFixed(1) + '%;width:' + (k % 2 ? 7 : 10) + 'px;height:' + (k % 2 ? 7 : 10) + 'px;margin:-5px 0 0 -5px;background:radial-gradient(circle,#fff 0%,#cfe6ff 40%,transparent 70%);border-radius:50%;animation:gmTw ' + (1.1 + (k % 4) * 0.3).toFixed(1) + 's ease-in-out ' + (k * 0.17).toFixed(2) + 's infinite;"></span>'; }
    if (ts) layers += dk + '<div style="position:absolute;inset:0;animation:gmSpin ' + (14 * sp).toFixed(1) + 's linear infinite;">' + spk + '</div>';
    var tilt = o.flat === false ? '' : 'transform:perspective(' + Math.round(S * 2) + 'px) rotateX(64deg);';
    return '<div class="gm-wrap" style="position:absolute;width:' + S + 'px;height:' + S + 'px;pointer-events:none;' + tilt + 'opacity:' + (o.dim ? 0.4 : 0.9) + ';' + (o.dim ? 'filter:grayscale(.9);' : 'animation:gmPulse 3s ease-in-out infinite;') + (o.css || '') + '">' + layers + '</div>';
  }
  window.__groupMagic = { html: html, draw: draw };
})();
