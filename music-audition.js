// ════════════════════════════════════════════════════════════
// 💃 음악방송 오디션 무대 (music-audition.js)
// 음악방송 출전을 누르면 "오디션" 게임처럼 직접 플레이한다.
//  · 화면에 나온 화살표(↑↓←→) 순서대로 제한시간 안에 터치
//  · 다 누르면 포즈 게이지: 움직이는 바가 가운데에 올 때 💃 포즈! (퍼펙트 / 쿨 / 굿 / 배드)
//  · 5스테이지(화살표 4→8개). 틀리면 그 스테이지는 MISS + 콤보 끊김. 콤보가 쌓이면 점수 보너스
//  결과 0~1(perf)을 music-chart.js 의 runShow(perf) 가 받아서 내 곡 점수에 +-로 반영한다.
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var STAGES = 5, LEN0 = 4;                 // 스테이지 수 / 첫 스테이지 화살표 개수 (스테이지마다 +1)
  var TIME_BASE = 1.6, TIME_PER = 0.3;      // 제한시간(초) = TIME_BASE + TIME_PER × 화살표 개수
  var POSE_PERFECT = 6, POSE_COOL = 13, POSE_GOOD = 23;   // 게이지 가운데 ±% (퍼펙트 / 쿨 / 굿)
  var POSE_PTS = { perfect: 30, cool: 20, good: 10, bad: 0 };
  var COMBO_BONUS = 0.04;                   // 연속 성공 스테이지마다 점수 +4%
  var GAUGE_SPEED = 120;                    // 게이지 바 속도 (%/초)
  var ACC = '#ff5d8f', GOLD = '#ffd54a';
  var ARROWS = [{ k: 'U', s: '⬆️' }, { k: 'D', s: '⬇️' }, { k: 'L', s: '⬅️' }, { k: 'R', s: '➡️' }];

  function sfx(n) { try { window.pocaSfx.play(n); } catch (e) {} }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function rnd(n) { return Math.floor(Math.random() * n); }

  function open(opt, done) {
    var cid = opt.cid, ended = false, timers = [];
    var ov = document.createElement('div');
    ov.id = 'aud-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;z-index:99998;background:radial-gradient(circle at 50% 30%,#3a1b5e 0%,#0b0714 78%);color:#fff;font-family:inherit;display:flex;flex-direction:column;align-items:center;padding:14px 14px 18px;box-sizing:border-box;touch-action:none;user-select:none;-webkit-user-select:none;';
    document.body.appendChild(ov);

    var stage = 0, seq = [], pos = 0, combo = 0, bestCombo = 0, total = 0, tStart = 0, tLimit = 0, raf = 0, phase = 'intro';
    var stageScores = [];

    function clearAll() { cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers = []; }
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function close(cancel) { if (ended) return; ended = true; clearAll(); ov.remove(); if (!cancel) done(Math.max(0, Math.min(1, total / STAGES / 100))); }

    function frame() {
      return '<div style="width:100%;display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="font-size:12px;color:#c4b5fd;">📺 음악방송 · 오디션 무대</div>' +
        '<button id="aud-x" style="background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;">그만두기</button></div>' +
        '<div style="display:flex;align-items:center;gap:10px;margin:8px 0 2px;"><img src="face-' + cid + '.png" alt="" onerror="this.style.display=\'none\'" style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid ' + ACC + ';"><div style="font-size:18px;font-weight:900;">' + nameOf(cid) + '의 무대</div></div>' +
        '<div style="display:flex;justify-content:space-between;width:100%;max-width:380px;font-size:13px;margin:4px 0;"><span id="aud-st">1/' + STAGES + '</span><span id="aud-combo" style="color:' + GOLD + ';font-weight:900;"></span></div>' +
        '<div id="aud-msg" style="height:26px;font-size:17px;font-weight:900;color:' + GOLD + ';"></div>' +
        '<div id="aud-seq" style="min-height:62px;display:flex;flex-wrap:wrap;justify-content:center;gap:5px;max-width:380px;margin:4px 0;"></div>' +
        '<div style="width:100%;max-width:380px;height:12px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;margin:6px 0 4px;"><div id="aud-bar" style="height:100%;width:100%;background:linear-gradient(90deg,#4ade80,#fbbf24,#f43f5e);transform-origin:left;"></div></div>' +
        '<div id="aud-gauge" style="display:none;position:relative;width:100%;max-width:380px;height:30px;border-radius:15px;background:rgba(255,255,255,.14);overflow:hidden;margin:0 0 4px;"><div id="aud-gz3" style="position:absolute;top:0;bottom:0;background:rgba(251,191,36,.35);"></div><div id="aud-gz2" style="position:absolute;top:0;bottom:0;background:rgba(74,222,128,.5);"></div><div id="aud-gz1" style="position:absolute;top:0;bottom:0;background:rgba(255,93,143,.75);"></div><div id="aud-mk" style="position:absolute;top:0;bottom:0;width:6px;background:#fff;left:0;border-radius:3px;"></div></div>' +
        '<div style="flex:1;"></div>' +
        '<div id="aud-pad" style="display:grid;grid-template-columns:repeat(3,84px);grid-template-rows:repeat(2,84px);gap:8px;justify-content:center;margin-bottom:10px;"></div>' +
        '<button id="aud-pose" style="width:100%;max-width:380px;padding:16px;border:0;border-radius:16px;font-size:18px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);opacity:.35;">💃 포즈!</button>';
    }
    ov.innerHTML = frame();
    var $ = function (id) { return ov.querySelector('#' + id); };
    $('aud-x').onclick = function () { close(true); };

    // 방향 패드 (↑ 가운데 위, ← ↓ → 아래줄)
    var layout = [null, 'U', null, 'L', 'D', 'R'];
    layout.forEach(function (k) {
      var b = document.createElement('button');
      if (!k) { b.style.visibility = 'hidden'; b.style.cssText += ';width:84px;height:84px;'; $('aud-pad').appendChild(b); return; }
      var a = ARROWS.filter(function (x) { return x.k === k; })[0];
      b.textContent = a.s;
      b.style.cssText = 'width:84px;height:84px;border-radius:20px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);font-size:34px;touch-action:manipulation;';
      b.setAttribute('data-k', k);
      $('aud-pad').appendChild(b);
    });
    $('aud-pose').addEventListener('pointerdown', function (e) { e.preventDefault(); pose(); });
    // 👆 터치 입력: 패드 버튼을 톡 누르거나, 화면 아무 데서나 상하좌우로 밀면(스와이프) 입력됨
    var sx = 0, sy = 0, sTarget = null, SWIPE = 28, TAP = 16;
    ov.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; sTarget = e.target; });
    ov.addEventListener('pointerup', function (e) {
      if (!sTarget || sTarget.closest('#aud-pose') || sTarget.closest('#aud-x') || sTarget.closest('#aud-seq button')) { sTarget = null; return; }
      var dx = e.clientX - sx, dy = e.clientY - sy, d = Math.sqrt(dx * dx + dy * dy), btn = sTarget.closest('[data-k]');
      sTarget = null;
      if (d <= TAP && btn) press(btn.getAttribute('data-k'));
      else if (d >= SWIPE) press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
    });

    function setMsg(h, c) { var m = $('aud-msg'); if (m) { m.innerHTML = h || ''; m.style.color = c || GOLD; } }
    function setCombo() { var c = $('aud-combo'); if (c) c.textContent = combo >= 2 ? combo + ' COMBO!' : ''; }

    // ── 인트로 ──
    function intro() {
      phase = 'intro';
      $('aud-seq').innerHTML = '<div style="font-size:14px;line-height:1.7;text-align:center;color:#e8e8f4;">나오는 <b>화살표 순서대로</b><br>아래 버튼을 톡 누르거나, <b>화면에서 그 방향으로 밀어요</b>!<br>제한시간 안에 끝내요!<br>다 누르면 <b>💃 포즈</b> 타이밍을 맞춰요.<br><span style="color:#ffb3cb;font-size:12px;">틀리면 그 스테이지는 MISS · 연속 성공하면 콤보 보너스</span></div>';
      var go = document.createElement('button');
      go.textContent = '🎶 무대 시작!';
      go.style.cssText = 'margin-top:8px;padding:12px 26px;border:0;border-radius:14px;font-size:16px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);';
      go.onclick = function () { go.remove(); nextStage(); };
      $('aud-seq').appendChild(go);
    }

    // ── 스테이지 ──
    function nextStage() {
      if (ended) return;
      if (stage >= STAGES) return finish();
      var len = LEN0 + stage; seq = []; pos = 0;
      for (var i = 0; i < len; i++) seq.push(ARROWS[rnd(4)].k);
      $('aud-st').textContent = (stage + 1) + '/' + STAGES;
      $('aud-gauge').style.display = 'none'; $('aud-bar').parentNode.style.display = 'block';
      $('aud-pose').style.opacity = '.35';
      renderSeq(); setMsg('');
      tLimit = (TIME_BASE + TIME_PER * len) * 1000; tStart = performance.now(); phase = 'seq';
      tick();
    }
    function renderSeq() {
      $('aud-seq').innerHTML = seq.map(function (k, i) {
        var a = ARROWS.filter(function (x) { return x.k === k; })[0];
        var st = i < pos ? 'opacity:.25;filter:grayscale(1);' : i === pos ? 'transform:scale(1.25);filter:drop-shadow(0 0 10px ' + GOLD + ');' : '';
        return '<span style="font-size:34px;line-height:1;display:inline-block;' + st + '">' + a.s + '</span>';
      }).join('');
    }
    function tick() {
      if (phase !== 'seq') return;
      var el = performance.now() - tStart, left = Math.max(0, 1 - el / tLimit);
      $('aud-bar').style.transform = 'scaleX(' + left + ')';
      if (left <= 0) return stageEnd(false, 0);
      raf = requestAnimationFrame(tick);
    }
    function press(k) {
      if (phase !== 'seq') return;
      if (k === seq[pos]) {
        pos++; sfx('pop'); renderSeq();
        if (pos >= seq.length) { phase = 'pose'; cancelAnimationFrame(raf); startGauge(); }
      } else { stageEnd(false, 0); }
    }

    // ── 포즈 게이지 ──
    var gpos = 0, gdir = 1, gT = 0, gStartedAt = 0, timeLeftRatio = 0;
    function startGauge() {
      timeLeftRatio = Math.max(0, 1 - (performance.now() - tStart) / tLimit);
      $('aud-bar').parentNode.style.display = 'none'; $('aud-gauge').style.display = 'block';
      var z = function (id, w) { var e = $(id); e.style.left = (50 - w) + '%'; e.style.width = (w * 2) + '%'; };
      z('aud-gz3', POSE_GOOD); z('aud-gz2', POSE_COOL); z('aud-gz1', POSE_PERFECT);
      $('aud-pose').style.opacity = '1'; setMsg('지금이야! 💃 포즈!', '#fff');
      gpos = 0; gdir = 1; gT = performance.now(); gStartedAt = gT; gaugeTick();
    }
    function gaugeTick() {
      if (phase !== 'pose') return;
      var now = performance.now(), dt = (now - gT) / 1000; gT = now;
      gpos += gdir * GAUGE_SPEED * dt;
      if (gpos >= 100) { gpos = 100; gdir = -1; } if (gpos <= 0) { gpos = 0; gdir = 1; }
      $('aud-mk').style.left = 'calc(' + gpos + '% - 3px)';
      if (now - gStartedAt > 2600) return stageEnd(true, 'bad');
      raf = requestAnimationFrame(gaugeTick);
    }
    function pose() {
      if (phase !== 'pose') return;
      var d = Math.abs(gpos - 50), g = d <= POSE_PERFECT ? 'perfect' : d <= POSE_COOL ? 'cool' : d <= POSE_GOOD ? 'good' : 'bad';
      stageEnd(true, g);
    }

    function stageEnd(ok, grade) {
      if (phase === 'wait') return; phase = 'wait'; cancelAnimationFrame(raf);
      var pts = 0;
      if (ok) {
        pts = 40 + 30 * timeLeftRatio + POSE_PTS[grade];
        if (grade !== 'bad') { combo++; bestCombo = Math.max(bestCombo, combo); } else combo = 0;
        pts = Math.min(100, pts * (1 + COMBO_BONUS * Math.max(0, combo - 1)));
        var label = { perfect: 'PERFECT!', cool: 'COOL!', good: 'GOOD', bad: 'BAD' }[grade];
        setMsg(label, grade === 'perfect' ? GOLD : grade === 'cool' ? '#6ee7a0' : grade === 'good' ? '#9ec5ff' : '#fca5a5');
        sfx(grade === 'perfect' ? 'reward' : grade === 'bad' ? 'fail' : 'coin');
      } else {
        combo = 0; setMsg('MISS…', '#fca5a5'); sfx('fail');
      }
      total += pts; stageScores.push(Math.round(pts)); setCombo();
      stage++; later(nextStage, 750);
    }

    function finish() {
      phase = 'end'; clearAll();
      var perf = Math.max(0, Math.min(1, total / STAGES / 100)), pct = Math.round(perf * 100);
      var g = pct >= 85 ? 'S' : pct >= 70 ? 'A' : pct >= 50 ? 'B' : 'C';
      ov.innerHTML = '<div style="flex:1;"></div><div style="text-align:center;">' +
        '<div style="font-size:12px;color:#c4b5fd;">📺 무대 종료</div>' +
        '<div style="font-size:84px;font-weight:900;line-height:1;background:linear-gradient(135deg,' + GOLD + ',#ff5d8f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:8px 0;">' + g + '</div>' +
        '<div style="font-size:22px;font-weight:900;">' + pct + '점</div>' +
        '<div style="font-size:13px;color:#e8e8f4;margin-top:8px;line-height:1.8;">최고 콤보 <b style="color:' + GOLD + ';">' + bestCombo + '</b> · 스테이지 ' + stageScores.join(' / ') + '<br><span style="color:#ffb3cb;">이 점수가 방송 순위 대결에 반영돼요!</span></div></div><div style="flex:1;"></div>' +
        '<button id="aud-ok" style="width:100%;max-width:380px;padding:15px;border:0;border-radius:16px;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);">순위 발표 보러 가기</button>';
      sfx(g === 'S' || g === 'A' ? 'reward' : 'coin');
      ov.querySelector('#aud-ok').onclick = function () { close(false); };
    }

    intro();
  }

  window.openAuditionShow = open;
})();
