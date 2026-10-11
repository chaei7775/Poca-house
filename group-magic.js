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
  function html(o) {
    o = o || {};
    var gi = window.__groupInvest; if (!gi || !gi.FAC) return '';
    var total = gi.total(); if (total <= 0) return '';
    css();
    // 투자한 시설 색: 이 활동에 붙는 시설을 먼저, 그 다음 레벨 높은 순
    var fl = gi.FAC.filter(function (f) { return gi.lvOf(f.id) > 0; });
    fl.sort(function (a, b) {
      var ra = (!a.acts || (o.act && a.acts.indexOf(o.act) !== -1)) ? 1 : 0, rb = (!b.acts || (o.act && b.acts.indexOf(o.act) !== -1)) ? 1 : 0;
      return (rb - ra) || (gi.lvOf(b.id) - gi.lvOf(a.id));
    });
    var cols = fl.map(function (f) { return COL[f.id] || '#fff'; });
    var n = total >= 16 ? 3 : total >= 8 ? 2 : 1;
    var glow = 5 + Math.round(total * 0.5), S = o.size || 260, sp = o.fast ? 0.6 : 1;
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
  window.__groupMagic = { html: html };
})();
