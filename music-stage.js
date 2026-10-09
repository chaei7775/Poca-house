// ════════════════════════════════════════════════════════════
// 🎙️ 음방 무대 미니게임 (music-stage.js)
// 기획사 일정표의 "📺 음악방송 활동" 날이 되면 정산 팝업에서(또는 📈 음원차트 > 🎤 음악방송 탭에서) 열린다.
//
//  1) 패턴 따라 치기: 6칸 패드가 깜빡이는 순서를 보고 똑같이 터치. 3라운드(3칸 → 4칸 → 5칸)
//     틀리면 하트가 하나 깎이고 같은 패턴을 다시 보여줌. 하트가 0이면 거기서 끝.
//  2) 퍼펙트 게이지: 움직이는 바를 가운데 구간에서 멈추기 (못 맞춰도 앞 결과는 그대로)
//  결과 별 0~5개 = 라운드 클리어 수(0~3) + 게이지(없음 0 / 굿 +1 / 퍼펙트 +2)
//  보상은 music-chart.js 의 musicStageDone 이 줌 (코인 + 내 곡 차트 점수 + 별 5개면 팬카페 가입자)
//  컨디션(그날 정산 등급)이 좋을수록 깜빡임이 느리고 하트가 많다.
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var ROUNDS = [3, 4, 5];                       // 라운드별 패턴 길이
  var COND = {                                  // 컨디션 등급별: 깜빡임 길이(ms) / 하트 수
    perfect: { flash: 720, hearts: 4 },
    good:    { flash: 620, hearts: 3 },
    normal:  { flash: 540, hearts: 3 },
    bad:     { flash: 470, hearts: 2 }
  };
  var SPEEDUP = 0.9;                            // 라운드마다 깜빡임이 이만큼씩 빨라짐 (×)
  var GAP = 160;                                // 깜빡임 사이 쉬는 시간(ms)
  var PERFECT_ZONE = 6, GOOD_ZONE = 17;         // 게이지 가운데 ±% (퍼펙트 / 굿)
  var PADS = [
    { c: '#ff5d8f', e: '🎤' }, { c: '#a855f7', e: '🎹' }, { c: '#fbbf24', e: '🥁' },
    { c: '#38bdf8', e: '🎸' }, { c: '#4ade80', e: '🎷' }, { c: '#fb923c', e: '🎻' }
  ];
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var GOLD = '#FFD700';

  window.__stageTest = { COND: COND, ROUNDS: ROUNDS, cur: null, open: function () { return open.apply(null, arguments); } };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function sfx(n) { try { if (window.pocaSfx) window.pocaSfx.play(n); } catch (e) {} }
  function toast(m) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e) {} }
  var BTN = 'border:none;border-radius:12px;font-size:14px;font-weight:900;cursor:pointer;' + FONT;

  function layer(inner) {
    var old = $('stage-overlay'); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = 'stage-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:985;background:radial-gradient(circle at 50% 20%,#2a1745,#0b0916 70%);display:flex;align-items:center;justify-content:center;padding:16px;' + FONT;
    ov.innerHTML = '<div style="width:100%;max-width:330px;text-align:center;">' + inner + '</div>';
    document.body.appendChild(ov);
    return ov;
  }
  function hearts(n, max) { var o = ''; for (var i = 0; i < max; i++) o += i < n ? '❤️' : '🖤'; return o; }

  function open(cid, quality) {
    try { if ((Number(playerLevel) || 1) < 18) { if (typeof showBagToast === 'function') showBagToast('🔒 음악방송은 플레이어 Lv.18부터 열려요'); return; } } catch (e) {}
    var C = window.__chart; if (!C) return;
    var item = C.pendingStage(cid);
    if (!item) { toast('지금 할 수 있는 음방 무대가 없어요'); return; }
    var cond = COND[quality] || COND[item.q] || COND.good;
    var st; st = window.__stageTest.cur = { round: 0, cleared: 0, hearts: cond.hearts, max: cond.hearts, seq: [], idx: 0, accept: false, ended: false };

    var ov = layer(
      '<div style="font-size:12px;color:#c4b5fd;">📺 음악방송 무대</div>' +
      '<div style="font-size:18px;font-weight:900;color:#fff;margin:2px 0 8px;">' + esc(nameOf(cid)) + '의 무대</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:13px;color:#fff;margin-bottom:8px;"><span id="sg-round">1/3 라운드</span><span id="sg-hearts"></span></div>' +
      '<div id="sg-msg" style="height:22px;font-size:14px;font-weight:900;color:' + GOLD + ';margin-bottom:8px;"></div>' +
      '<div id="sg-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;"></div>' +
      '<div id="sg-extra" style="margin-top:14px;"></div>');
    var grid = $('sg-grid');
    PADS.forEach(function (p, i) {
      var b = document.createElement('button');
      b.dataset.i = i;
      b.style.cssText = 'aspect-ratio:1;border-radius:18px;border:3px solid ' + p.c + '66;background:' + p.c + '22;font-size:32px;cursor:pointer;touch-action:manipulation;transition:background .08s,transform .08s,box-shadow .08s;';
      b.textContent = p.e;
      b.addEventListener('touchstart', function (e) { e.preventDefault(); press(i); }, { passive: false });
      b.addEventListener('mousedown', function () { if (!('ontouchstart' in window)) press(i); });
      grid.appendChild(b);
    });
    function pad(i) { return grid.children[i]; }
    function light(i, on) {
      var b = pad(i), p = PADS[i]; if (!b) return;
      b.style.background = on ? p.c : p.c + '22'; b.style.boxShadow = on ? '0 0 26px ' + p.c : 'none'; b.style.transform = on ? 'scale(1.06)' : '';
    }
    function setMsg(t) { var m = $('sg-msg'); if (m) m.innerHTML = t; }
    function head() { var r = $('sg-round'), h = $('sg-hearts'); if (r) r.textContent = Math.min(st.round + 1, 3) + '/3 라운드 · 패턴 ' + ROUNDS[Math.min(st.round, 2)] + '칸'; if (h) h.textContent = hearts(st.hearts, st.max); }

    function newRound() {
      head();
      var n = ROUNDS[st.round], seq = [], last = -1;
      for (var i = 0; i < n; i++) { var k; do { k = Math.floor(Math.random() * 6); } while (k === last); seq.push(k); last = k; }
      st.seq = seq; show();
    }
    function show() {
      st.accept = false; st.idx = 0; setMsg('👀 잘 보세요!');
      var flash = Math.round(cond.flash * Math.pow(SPEEDUP, st.round)), t = 650;
      st.seq.forEach(function (k) {
        setTimeout(function () { if (!st.ended) { light(k, true); sfx('pop'); } }, t);
        setTimeout(function () { light(k, false); }, t + flash);
        t += flash + GAP;
      });
      setTimeout(function () { if (!st.ended) { st.accept = true; setMsg('🎵 같은 순서로 터치!'); } }, t);
    }
    function press(i) {
      if (!st.accept || st.ended) return;
      light(i, true); setTimeout(function () { light(i, false); }, 110);
      if (i === st.seq[st.idx]) {
        st.idx++;
        if (st.idx >= st.seq.length) {
          st.accept = false; st.cleared++; st.round++;
          setMsg('✨ 라운드 클리어!'); sfx('reward');
          setTimeout(function () { if (st.round >= ROUNDS.length) gauge(); else newRound(); }, 800);
        }
      } else {
        st.hearts--; head(); st.accept = false;
        if (st.hearts <= 0) { setMsg('💔 하트가 다 떨어졌어요'); setTimeout(function () { if (st.cleared > 0) gauge(); else finish(0); }, 900); }
        else { setMsg('❌ 아깝다! 다시 보여줄게요'); setTimeout(show, 900); }
      }
    }

    // ── 퍼펙트 게이지 ──
    function gauge() {
      if (st.ended) return;
      for (var i = 0; i < 6; i++) light(i, false);
      grid.style.display = 'none'; setMsg('🎯 가운데에서 멈춰요! (퍼펙트 구간)');
      var ex = $('sg-extra');
      ex.innerHTML = '<div style="position:relative;height:34px;border-radius:17px;background:rgba(255,255,255,.12);overflow:hidden;margin-bottom:16px;">' +
        '<div style="position:absolute;top:0;bottom:0;left:' + (50 - GOOD_ZONE) + '%;width:' + (GOOD_ZONE * 2) + '%;background:rgba(251,191,36,.35);"></div>' +
        '<div style="position:absolute;top:0;bottom:0;left:' + (50 - PERFECT_ZONE) + '%;width:' + (PERFECT_ZONE * 2) + '%;background:rgba(74,222,128,.75);"></div>' +
        '<div id="sg-mark" style="position:absolute;top:3px;width:10px;height:28px;border-radius:5px;background:#fff;box-shadow:0 0 10px #fff;"></div></div>' +
        '<button id="sg-stop" style="' + BTN + 'width:100%;padding:20px;font-size:19px;background:linear-gradient(135deg,#ff5d8f,#a855f7);color:#fff;touch-action:manipulation;">⭐ 지금!</button>';
      var pos = 0, dir = 1, speed = 2.6, done = false;
      var iv = setInterval(function () { pos += dir * speed; if (pos >= 98) { pos = 98; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; } var m = $('sg-mark'); if (m) m.style.left = pos + '%'; else clearInterval(iv); }, 16);
      $('sg-stop').onclick = function () {
        if (done) return; done = true; clearInterval(iv);
        var d = Math.abs((pos + 1) - 50), g = d <= PERFECT_ZONE ? 2 : d <= GOOD_ZONE ? 1 : 0;
        setMsg(g === 2 ? '🌟 PERFECT!' : g === 1 ? '👍 GOOD' : '😅 아쉬워요');
        sfx(g ? 'reward' : 'pop');
        setTimeout(function () { finish(g); }, 900);
      };
    }

    function finish(g) {
      if (st.ended) return; st.ended = true;
      var stars = st.cleared + g, r = C.musicStageDone(item.id, stars);
      ov.remove();
      if (!r) { toast('무대 결과를 저장하지 못했어요'); return; }
      var star = ''; for (var i = 0; i < 5; i++) star += i < stars ? '⭐' : '☆';
      var ov2 = layer(
        '<div style="font-size:50px;margin-bottom:4px;">' + (stars >= 5 ? '🏆' : stars >= 3 ? '🎤' : '🎶') + '</div>' +
        '<div style="font-size:22px;font-weight:900;color:' + GOLD + ';margin-bottom:6px;">' + (stars >= 5 ? '완벽한 무대!' : stars >= 3 ? '멋진 무대!' : stars >= 1 ? '무대 끝!' : '긴장했나 봐요') + '</div>' +
        '<div style="font-size:22px;margin-bottom:10px;letter-spacing:2px;">' + star + '</div>' +
        '<div style="font-size:13px;color:#e8e8f4;line-height:1.8;margin-bottom:16px;">라운드 ' + st.cleared + '/3 · 게이지 ' + (g === 2 ? '퍼펙트' : g === 1 ? '굿' : '미스') + '<br>' +
        '보너스 코인 <b style="color:' + GOLD + ';">+' + fmt(r.coins) + '</b><br>' +
        '내 곡 차트 점수 <b style="color:#6ee7a0;">+' + r.boost + '</b> (3일)' +
        (r.fans ? '<br>팬카페 가입자 <b style="color:#6ee7a0;">+' + fmt(r.fans) + '명</b>' : '') + '</div>' +
        '<button id="sg-ok" style="' + BTN + 'width:100%;padding:13px;background:linear-gradient(135deg,#ff5d8f,#a855f7);color:#fff;">확인</button>');
      $('sg-ok').onclick = function () { ov2.remove(); try { if (window.__chartUi && $('chart-overlay')) window.__chartUi.refresh(); } catch (e) {} };
      sfx('reward');
    }

    // 시작: 설명 한 번 보여주고 첫 라운드
    setMsg('🎶 잘 보고 따라 쳐요!'); head();
    setTimeout(newRound, 900);
  }

  window.openMusicStage = open;
})();
