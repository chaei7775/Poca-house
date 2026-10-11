// ════════════════════════════════════════════════════════════
// 💃 댄스 챌린지 · 칼군무 따라하기 (group-dance.js)
// 그룹 활동 "댄스 챌린지"를 누르면 바로 연출을 보는 대신, 안무를 외워서 따라 한다 (시간 제한 없음, 기억력 게임).
//  · 안무(점프 · 웨이브 · 왼쪽 스텝 · 오른쪽 스텝)가 순서대로 한 동작씩 나온다 → 끝나면 똑같이 눌러서 따라 하기
//  · 3라운드 (동작 3개 → 4개 → 5개). 틀리면 하트가 깎이고 같은 안무를 다시 보여준다
//  · 그룹의 댄스 실력이 좋을수록 하트(실수 허용)가 많다: 평균 25 미만 2개 · 50 미만 3개 · 그 이상 4개
//  · 라운드 점수: 실수 없이 3 · 실수 1번 2 · 실수 2번 이상 1 · 하트가 다 닳으면 그 라운드부터 0 → 싱크로율(perf 0~1)
//    group.js 의 doActivity(id, perf) 가 코인·인기도 ×(0.8~1.4), 대성공 확률 ±15%p, 등급 ±1 로 반영 / 방송 연출 앞에 라운드 결과가 나온다
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var LENS = [3, 4, 5];                        // 라운드별 안무 길이
  var SHOW_MS = 700;                           // 안무 한 동작 보여주는 시간(ms)
  var HEARTS = [[25, 2], [50, 3], [999, 4]];   // [그룹 댄스 평균 미만, 하트 수]
  var MOVES = {
    U: { s: '⬆️', n: '점프', f: 'translateY(-30px) scale(1.06)' },
    D: { s: '⬇️', n: '웨이브', f: 'translateY(12px) scaleY(.86)' },
    L: { s: '⬅️', n: '왼쪽 스텝', f: 'translateX(-24px) rotate(-7deg)' },
    R: { s: '➡️', n: '오른쪽 스텝', f: 'translateX(24px) rotate(7deg)' }
  };
  var KEYS = ['U', 'D', 'L', 'R'];
  var ACC = '#ff5d8f', GOLD = '#ffd54a';

  function sfx(n) { try { window.pocaSfx.play(n); } catch (e) {} }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function statOf(cid, k) { try { if (typeof window.getIdolTrainStat === 'function') { var v = window.getIdolTrainStat(cid, k); if (typeof v === 'number') return v; } } catch (e) {} return 10; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function sdSrc(c) { return 'group-assets/sd/' + c + '.png'; }
  function jong(nm, a, b) { var code = nm.charCodeAt(nm.length - 1) - 0xAC00; return nm + ((code >= 0 && code % 28 !== 0) ? a : b); }

  function play(members, done) {
    members = (members || []).slice(0, 4); if (members.length < 2) { done(null); return; }
    var avg = members.reduce(function (a, c) { return a + statOf(c, 'dance'); }, 0) / members.length, maxH = 4, i;
    for (i = 0; i < HEARTS.length; i++) if (avg < HEARTS[i][0]) { maxH = HEARTS[i][1]; break; }
    var byDance = members.slice().sort(function (a, b) { return statOf(b, 'dance') - statOf(a, 'dance'); });   // 댄스 잘하는 순
    var hearts = maxH, round = 0, pts = 0, mistakes = 0, seq = [], pos = 0, phase = 'intro', finished = false, timers = [], log = [], blameN = 0;

    var ov = document.createElement('div');
    ov.id = 'gd-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;z-index:99997;background:radial-gradient(circle at 50% 28%,#3b1a63 0%,#0b0716 78%);color:#fff;display:flex;flex-direction:column;align-items:center;padding:14px;box-sizing:border-box;touch-action:manipulation;user-select:none;-webkit-user-select:none;';
    document.body.appendChild(ov);
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function close(perf) { if (finished) return; finished = true; timers.forEach(clearTimeout); ov.remove(); done(perf, perf == null ? null : log); }
    var $ = function (id) { return ov.querySelector('#' + id); };

    ov.innerHTML =
      '<div style="width:100%;max-width:420px;display:flex;justify-content:space-between;align-items:center;"><div style="font-size:12px;color:#e0c8ff;">💃 댄스 챌린지 · 칼군무</div>' +
      '<button id="gd-x" style="background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;">그만두기</button></div>' +
      '<div style="width:100%;max-width:420px;display:flex;justify-content:space-between;font-size:13px;margin:8px 0 2px;"><span id="gd-r">라운드 1/' + LENS.length + '</span><span id="gd-h"></span></div>' +
      '<div id="gd-msg" style="height:24px;font-size:15px;font-weight:900;color:' + GOLD + ';text-align:center;margin:4px 0;"></div>' +
      '<div id="gd-row" style="display:flex;justify-content:center;align-items:flex-end;margin:10px 0 6px;transition:transform .22s;">' + members.map(function (c) {
        return '<img src="' + sdSrc(c) + '" alt="" height="' + (members.length > 3 ? 92 : 112) + '" style="height:' + (members.length > 3 ? 92 : 112) + 'px;width:auto;margin:0 -4px;" onerror="this.onerror=null;this.src=\'face-' + c + '.png\';this.style.cssText=\'height:60px;width:60px;border-radius:50%;object-fit:cover;\'">';
      }).join('') + '</div>' +
      '<div id="gd-seq" style="min-height:44px;display:flex;gap:6px;justify-content:center;align-items:center;margin:4px 0;"></div>' +
      '<div style="flex:1;"></div>' +
      '<div id="gd-pad" style="display:grid;grid-template-columns:repeat(3,92px);grid-template-rows:repeat(2,92px);gap:8px;justify-content:center;margin-bottom:14px;"></div>';
    function setMsg(h, c) { var m = $('gd-msg'); m.innerHTML = h || ''; m.style.color = c || GOLD; }
    function hh() { var s = ''; for (var k = 0; k < maxH; k++) s += k < hearts ? '❤️' : '🖤'; $('gd-h').textContent = s; }
    $('gd-x').onclick = function () { close(null); };
    var layout = [null, 'U', null, 'L', 'D', 'R'];
    layout.forEach(function (k) {
      var b = document.createElement('button');
      if (!k) { b.style.cssText = 'visibility:hidden;width:92px;height:92px;'; $('gd-pad').appendChild(b); return; }
      b.setAttribute('data-k', k);
      b.innerHTML = '<div style="font-size:30px;line-height:1;">' + MOVES[k].s + '</div><div style="font-size:11px;margin-top:2px;">' + MOVES[k].n + '</div>';
      b.style.cssText = 'width:92px;height:92px;border-radius:20px;border:2px solid rgba(255,255,255,.28);background:rgba(255,255,255,.1);color:#fff;touch-action:manipulation;';
      b.addEventListener('pointerdown', function (e) { e.preventDefault(); press(k); });
      $('gd-pad').appendChild(b);
    });
    function dance(k) { var r = $('gd-row'); if (!r) return; r.style.transform = MOVES[k].f; later(function () { r.style.transform = ''; }, 260); }
    function flashPad(k, on) { var b = ov.querySelector('[data-k="' + k + '"]'); if (b) { b.style.background = on ? 'rgba(255,213,74,.35)' : 'rgba(255,255,255,.1)'; b.style.borderColor = on ? GOLD : 'rgba(255,255,255,.28)'; } }
    function dots() { $('gd-seq').innerHTML = seq.map(function (k, j) { return '<span style="width:12px;height:12px;border-radius:50%;background:' + (phase === 'input' && j < pos ? GOLD : 'rgba(255,255,255,.25)') + ';display:inline-block;"></span>'; }).join(''); }

    function startRound(retry) {
      if (!retry) { seq = []; for (var j = 0; j < LENS[round]; j++) seq.push(KEYS[rnd(4)]); window.__groupDance.cur = { seq: seq }; }
      pos = 0; phase = 'show'; $('gd-r').textContent = '라운드 ' + (round + 1) + '/' + LENS.length; hh(); dots();
      setMsg(retry ? '다시 보여줄게요! 잘 봐요 👀' : '안무를 잘 봐요! 👀', '#e0c8ff');
      seq.forEach(function (k, j) {
        later(function () { flashPad(k, true); dance(k); sfx('pop'); setMsg(MOVES[k].s + ' ' + MOVES[k].n, GOLD); }, 700 + j * SHOW_MS);
        later(function () { flashPad(k, false); }, 700 + j * SHOW_MS + SHOW_MS * 0.6);
      });
      later(function () { phase = 'input'; dots(); setMsg('이제 똑같이 따라 해요! 💃', '#fff'); }, 700 + seq.length * SHOW_MS + 200);
    }

    function press(k) {
      if (phase !== 'input') return;
      flashPad(k, true); later(function () { flashPad(k, false); }, 140);
      if (k === seq[pos]) {
        pos++; dance(k); sfx('pop'); dots();
        if (pos >= seq.length) roundDone();
      } else {
        phase = 'wait'; hearts--; mistakes++; sfx('fail'); hh(); setMsg('앗, 동선이 꼬였어요!', '#fca5a5');
        if (hearts <= 0) { later(failOut, 900); } else { later(function () { startRound(true); }, 1100); }
      }
    }
    function lowestDancer() { var c = byDance[byDance.length - 1 - (blameN++ % Math.max(1, byDance.length - 1))]; return c; }
    function roundDone() {
      phase = 'wait'; var m = mistakes, p = m === 0 ? 3 : m === 1 ? 2 : 1; pts += p;
      var lead = byDance[(round) % byDance.length], slip = lowestDancer(), txt, lvl;
      if (m === 0) { lvl = 0; txt = ['', jong(nameOf(lead), '의', '의') + ' 포인트 안무까지 칼군무가 완벽하게 맞았어요!', jong(nameOf(lead), '을', '를') + ' 중심으로 대열이 한 몸처럼 움직였어요!'][round % 3 === 0 ? 2 : (round % 3)] ; }
      else if (m === 1) { lvl = 1; txt = jong(nameOf(slip), '이', '가') + ' 한 번 헷갈렸지만 바로 박자를 맞췄어요.'; }
      else { lvl = 2; txt = jong(nameOf(slip), '이', '가') + ' 동선을 놓쳐서 대열이 잠깐 흔들렸어요.'; }
      log.push({ c: m === 0 ? lead : slip, t: '라운드 ' + (round + 1), lvl: lvl, txt: txt });
      setMsg(m === 0 ? '✨ 완벽한 싱크!' : m === 1 ? '👍 좋아요!' : '😅 간신히 성공!', m === 0 ? GOLD : '#9ec5ff'); sfx(m === 0 ? 'reward' : 'coin');
      mistakes = 0; round++;
      later(function () { if (round >= LENS.length) finale(); else startRound(false); }, 1100);
    }
    function failOut() {
      var slip = lowestDancer();
      log.push({ c: slip, t: '라운드 ' + (round + 1), lvl: 3, txt: jong(nameOf(slip), '의', '의') + ' 동선이 어긋나 대열이 무너졌어요…' });
      round = LENS.length; finale();
    }
    function finale() {
      var perf = pts / (LENS.length * 3), pct = Math.round(perf * 100);
      var g = pct >= 85 ? '완벽한 칼군무!' : pct >= 60 ? '멋진 군무' : pct >= 35 ? '무난한 군무' : '대열이 흐트러졌어요';
      var note = perf >= 0.85 ? '코인·인기도 보너스 + 등급 상승!' : perf >= 0.5 ? '코인·인기도 보너스!' : perf > 0.12 ? '조금 아쉬운 군무…' : '군무가 무너졌어요';
      sfx(perf >= 0.6 ? 'reward' : 'coin');
      ov.innerHTML = '<div style="flex:1;"></div><div style="text-align:center;">' +
        '<div style="font-size:12px;color:#e0c8ff;">💃 챌린지 종료</div>' +
        '<div style="font-size:12px;color:#bcb0d8;margin-top:6px;">싱크로율</div>' +
        '<div style="font-size:66px;font-weight:900;line-height:1.1;background:linear-gradient(135deg,' + GOLD + ',' + ACC + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:6px 0;">' + pct + '%</div>' +
        '<div style="font-size:20px;font-weight:900;">' + g + '</div>' +
        '<div style="font-size:13px;color:#ffd0e0;margin-top:10px;">' + note + '</div></div><div style="flex:1;"></div>' +
        '<button id="gd-ok" style="width:100%;max-width:420px;padding:15px;border:0;border-radius:16px;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);">영상 올리러 가기</button>';
      ov.querySelector('#gd-ok').onclick = function () { close(perf); };
    }

    // 시작: 설명 한 번 → 첫 라운드
    setMsg('💃 칼군무를 외워서 따라 해요!', '#e0c8ff'); hh();
    $('gd-seq').innerHTML = '<div style="font-size:12px;color:#c9b8e8;text-align:center;line-height:1.6;">안무가 한 동작씩 나와요. 다 보고 나면<br>똑같은 순서로 버튼을 눌러요 (시간 제한 없음)</div>';
    later(function () { startRound(false); }, 1800);
  }

  window.__groupDance = { play: play, cur: null };
})();
