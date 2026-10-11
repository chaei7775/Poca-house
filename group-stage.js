// ════════════════════════════════
// 🎬 그룹 활동 연출 (group-stage.js) — 결과창 직전에 짧은 무대 연출을 보여준다
//  · 로딩 장면(group.js scene) 다음에 이어서: 활동별 색 조명 → 멤버 얼굴이 하나씩 등장 → 말하는 멤버가 확대되며 "누가 뭘 했는지" 한 줄씩 → 등급 도장이 쾅
//  · 대성공이면 반짝이 비, NG면 화면이 흔들리고 💥. 아무 곳이나 탭하면 건너뜀
//  · 그림 파일 없이 CSS 애니메이션만 써서 가볍다 (폰 메모리 규칙)
//  · 호출: group.js 가 window.__groupStage.play(res, done) 으로 부른다. 없으면 바로 결과창
// ✏️ 길이: LINE_MS(한 줄당 시간), STAMP_MS(도장 후 대기)
// ════════════════════════════════
(function () {
  'use strict';
  var LINE_MS = 1100, STAMP_MS = 1500, FONT = "font-family:'Noto Sans KR',sans-serif;";
  var BG = {   // 활동별 분위기 색 [배경 위, 배경 아래, 조명]
    stage:   ['#2a0f4d', '#0b1030', '#ff7ad9'], album: ['#0f2a4d', '#080f24', '#7fd1ff'], dance: ['#4d0f2a', '#240818', '#ffb347'],
    variety: ['#4d3a0f', '#241a08', '#ffe27a'], photo: ['#3a0f4d', '#150824', '#ffffff'], drama: ['#1a1a2e', '#07070f', '#c084fc']
  };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function face(c, px, extra) { return '<img src="face-' + c + '.png" width="' + px + '" height="' + px + '" decoding="async" style="width:' + px + 'px;height:' + px + 'px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.7);background:#243357;' + (extra || '') + '">'; }
  function sd(c, h, actId) { var ga = window.__groupAnimal, animal = !!(ga && ga.sdSrc(c, actId) !== 'group-assets/sd/' + c + '.png'); return '<img src="' + (ga ? ga.sdSrc(c, actId) : 'group-assets/sd/' + c + '.png') + '" height="' + h + '" decoding="async" style="height:' + h + 'px;width:auto;display:block;margin:0 -6px;transform-origin:50% 100%;filter:drop-shadow(0 4px 6px rgba(0,0,0,.55));" onerror="this.onerror=null;' + (animal ? 'this.src=\'group-assets/sd/' + c + '.png\';' : 'this.src=\'face-' + c + '.png\';this.style.cssText=\'width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.7);\';') + '">'; }   // 👗 단체복 SD 전신 (group-assets/sd)
  function sfx(n) { try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play(n); } catch (e) {} }
  function css() {
    if (document.getElementById('gst-css')) return;
    var st = document.createElement('style'); st.id = 'gst-css';
    st.textContent = '@keyframes gstSweep{0%{transform:rotate(-28deg)}50%{transform:rotate(28deg)}100%{transform:rotate(-28deg)}}' +
      '@keyframes gstPop{0%{opacity:0;transform:translateY(30px) scale(.4)}70%{transform:translateY(-6px) scale(1.1)}100%{opacity:1;transform:none}}' +
      '@keyframes gstStamp{0%{opacity:0;transform:scale(3.2) rotate(-14deg)}60%{opacity:1;transform:scale(.9) rotate(-6deg)}100%{opacity:1;transform:scale(1) rotate(-6deg)}}' +
      '@keyframes gstShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(9px)}60%{transform:translateX(-7px)}80%{transform:translateX(6px)}}' +
      '@keyframes gstFall{0%{transform:translateY(-30px) rotate(0);opacity:0}15%{opacity:1}100%{transform:translateY(105vh) rotate(360deg);opacity:.9}}' +
      '@keyframes gstCap{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
      '@keyframes gstGlow{0%,100%{box-shadow:0 0 0 rgba(255,215,106,0)}50%{box-shadow:0 0 22px 6px rgba(255,215,106,.9)}}' +
      '@keyframes gstGlowSd{0%,100%{filter:drop-shadow(0 4px 6px rgba(0,0,0,.55))}50%{filter:drop-shadow(0 0 14px rgba(255,215,106,.95))}}';
    document.head.appendChild(st);
  }
  function play(res, done) {
    var rep = res && res.report;
    if (res && res.varLog && res.varLog.length) {   // 🎪 단체 예능: 내가 직접 고른 코너 결과를 방송 장면 맨 앞에 먼저 보여줌 (group-variety.js)
      var vn = function (c) { try { return CHARS[c].name; } catch (e) { return c; } };
      var TXT = ['{n}의 {t}, 스튜디오가 뒤집어졌어요! 😂', '{n}의 {t}에 방청객이 빵 터졌어요!', '{n}의 {t}, 반응은 그럭저럭…', '{n}의 {t}… 스튜디오가 조용해졌어요.'];
      var vl = res.varLog.map(function (e) { return { c: e.c, text: TXT[e.lvl].replace('{n}', vn(e.c)).replace('{t}', e.t), tone: e.lvl === 0 ? 'top' : e.lvl === 3 ? 'bad' : 'mid' }; });
      rep = { grade: rep ? rep.grade : (res.tier || ''), color: rep ? rep.color : '#ffd54a', lines: vl.concat((rep && rep.lines) || []) };
    }
    if (!rep || !rep.lines || !rep.lines.length) { done(); return; }
    css();
    var ov = document.createElement('div'), finished = false, timers = [];
    var bg = BG[res.act.id] || BG.stage, bad = !!res.ng;
    ov.style.cssText = 'position:fixed;inset:0;max-width:460px;margin:0 auto;box-shadow:0 0 0 100vmax #000;z-index:985;overflow:hidden;color:#fff;cursor:pointer;background:linear-gradient(180deg,' + bg[0] + ',' + bg[1] + ');' + FONT;
    var members = res.members, mh = members.map(function (c, i) {
      return '<div data-c="' + c + '" style="opacity:0;animation:gstPop .5s ease-out forwards;animation-delay:' + (0.2 + i * 0.28) + 's;transition:transform .25s;">' + sd(c, members.length > 3 ? 120 : 175, res.act.id) + '</div>';
    }).join('');
    var beam = function (rot, delay) { return '<div style="position:absolute;left:50%;top:-10%;width:90px;height:90%;margin-left:-45px;transform-origin:50% 0;background:linear-gradient(180deg,' + bg[2] + 'aa,transparent 85%);filter:blur(6px);opacity:.55;animation:gstSweep 3.2s ease-in-out infinite;animation-delay:' + delay + 's;"></div>'; };
    // 배경 일러스트: grp-bg-<활동id>.webp (없으면 그냥 색 배경). 위에 어두운 막을 씌워서 글씨가 읽히게
    var bgImg = '<img src="grp-bg-' + res.act.id + '.webp" decoding="async" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.remove()">' +
      '<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.55));"></div>';
    var invChips = '';   // 🏢 이 활동에 붙은 그룹 투자 시설 효과 (왼쪽 위 칩)
    try { var gi = window.__groupInvest; if (gi && gi.badges) invChips = gi.badges(res.act.id).map(function (b, i) { return '<div style="opacity:0;animation:gstPop .5s ease-out forwards;animation-delay:' + (0.1 + i * 0.12) + 's;padding:3px 8px;border-radius:99px;background:rgba(0,0,0,.5);border:1px solid rgba(255,215,106,.6);font-size:10.5px;font-weight:900;color:#ffe08a;white-space:nowrap;">' + b.icon + ' Lv.' + b.lv + ' <span style="color:#9dffb0;">+' + b.pct + '%</span></div>'; }).join(''); } catch (e) {}
    ov.innerHTML = bgImg + beam(0, 0) + beam(0, -1.6) +
      (invChips ? '<div style="position:absolute;top:10px;left:10px;display:flex;flex-direction:column;gap:4px;align-items:flex-start;z-index:2;">' + invChips + '</div>' : '') +
      '<div style="position:absolute;top:7%;left:0;right:0;text-align:center;"><img src="grp-' + res.act.id + '.png" width="84" height="84" style="width:84px;height:84px;object-fit:contain;" onerror="this.remove()"><div style="font-size:16px;font-weight:900;margin-top:4px;text-shadow:0 2px 8px #000;">' + esc(res.act.name) + '</div></div>' +
      (function () { try { return window.__groupMagic ? window.__groupMagic.html({ act: res.act.id, size: 320, fast: !!res.big, dim: bad, css: 'left:50%;top:calc(31% + ' + ((res.members.length > 3 ? 120 : 175) - 15 - 160) + 'px);margin-left:-160px;' }) : ''; } catch (e) { return ''; } })() +
      '<div id="gst-row" style="position:absolute;top:31%;left:0;right:0;display:flex;justify-content:center;align-items:flex-end;gap:4px;padding:0 10px;">' + mh + '</div>' +
      '<div id="gst-cap" style="position:absolute;top:56%;left:16px;right:16px;min-height:70px;text-align:center;font-size:14.5px;font-weight:700;line-height:1.6;text-shadow:0 2px 8px #000;"></div>' +
      '<div id="gst-stamp" style="position:absolute;left:0;right:0;bottom:12%;text-align:center;opacity:0;"></div>' +
      '<div style="position:absolute;bottom:14px;left:0;right:0;text-align:center;font-size:11px;color:rgba(255,255,255,.55);">화면을 누르면 건너뛰어요</div>';
    document.body.appendChild(ov);
    function end() { if (finished) return; finished = true; timers.forEach(clearTimeout); if (ov.parentNode) ov.remove(); done(); }
    ov.onclick = end;
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    var t0 = 0.2 * 1000 + members.length * 280 + 500;
    rep.lines.forEach(function (l, i) {
      at(t0 + i * LINE_MS, function () {
        var cap = ov.querySelector('#gst-cap'); if (!cap) return;
        var col = l.tone === 'top' ? '#ffe27a' : (l.tone === 'bad' || l.tone === 'low') ? '#ff9a9a' : '#ffffff';
        cap.innerHTML = '<div style="animation:gstCap .35s ease-out;color:' + col + ';">' + esc(l.text) + '</div>';
        Array.prototype.forEach.call(ov.querySelectorAll('#gst-row [data-c]'), function (el) {
          var me = el.getAttribute('data-c') === l.c;
          var im = el.firstChild; if (!im) return;   // 등장 애니메이션이 바깥 칸의 transform/opacity 를 잡고 있어서 안쪽 그림에 적용
          im.style.transition = 'transform .25s, opacity .25s'; im.style.transform = me ? 'scale(1.15)' : 'scale(.92)'; im.style.opacity = me ? '1' : '.55';
          if (im) { im.style.animation = me ? (l.tone === 'bad' || l.tone === 'low' ? 'gstShake .5s' : l.tone === 'top' ? 'gstGlowSd 1s' : '') : ''; }
        });
        sfx(l.tone === 'bad' || l.tone === 'low' ? 'grpBad' : 'grpLine');
      });
    });
    var ts = t0 + rep.lines.length * LINE_MS;
    at(ts, function () {
      var cap = ov.querySelector('#gst-cap'); if (cap) cap.innerHTML = '';
      Array.prototype.forEach.call(ov.querySelectorAll('#gst-row [data-c]'), function (el) { var im = el.firstChild; if (im) { im.style.transform = ''; im.style.opacity = '1'; im.style.animation = ''; } });
      var st = ov.querySelector('#gst-stamp');
      st.style.opacity = '1';
      st.innerHTML = '<div style="display:inline-block;padding:8px 26px;border:5px solid ' + rep.color + ';border-radius:16px;font-size:34px;font-weight:900;color:' + rep.color + ';background:rgba(0,0,0,.45);text-shadow:0 0 14px ' + rep.color + ';animation:gstStamp .45s ease-out forwards;">' + esc(rep.grade) + '</div>';
      if (bad) { ov.style.animation = 'gstShake .5s'; sfx('stamp'); at(ts + 160, function () { sfx('grpBad'); }); }
      else if (res.big) {
        var f = ''; for (var i = 0; i < 26; i++) f += '<span style="position:absolute;top:0;left:' + Math.round(Math.random() * 100) + '%;font-size:' + (14 + Math.round(Math.random() * 14)) + 'px;animation:gstFall ' + (1.8 + Math.random() * 1.6) + 's linear ' + (Math.random() * 0.8).toFixed(2) + 's forwards;">' + ['✨', '🎉', '⭐', '💖'][i % 4] + '</span>';
        var c = document.createElement('div'); c.style.cssText = 'position:absolute;inset:0;pointer-events:none;'; c.innerHTML = f; ov.appendChild(c); sfx('stamp'); at(ts + 180, function () { sfx('grpBig'); });
      } else sfx('stamp');
    });
    at(ts + STAMP_MS + 600, end);
  }
  window.__groupStage = { play: play };
})();
