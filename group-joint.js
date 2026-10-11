// ════════════════════════════════════════════════════════════
// 🎤 합동 무대 · 포메이션 짜기 (group-joint.js)
// 그룹 활동 "합동 무대"를 누르면 바로 연출을 보는 대신, 무대를 직접 짠다.
//  1) 오늘 부를 곡 콘셉트를 3개 중에서 고른다 (그룹이 잘하는 능력치와 맞는 곡이 유리)
//  2) 포지션(센터 · 메인 · 서브 · 후열)에 멤버를 배치한다. 곡마다 포지션이 보는 능력치가 다르다
//     (예: 감성 발라드는 센터=보컬, 파워 퍼포먼스는 센터=댄스). 맞는 멤버를 맞는 자리에 세우면 완성도↑
//  3) 무대 완성도(perf 0~1) → group.js 의 doActivity(id, perf) 가 코인·인기도 ×(0.8~1.4), 대성공 확률 ±15%p, 등급 ±1 로 반영
//     그리고 방송 연출(group-stage.js)에서 포지션별 결과가 먼저 나온다
// ✏️ 고치는 법: 아래 [설정] 과 SONGS(곡 목록)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var SLOTS = ['센터', '메인', '서브', '후열'];                 // 포지션 이름 (멤버 수만큼 앞에서부터 사용)
  var SLOT_W = { 2: [.6, .4], 3: [.5, .3, .2], 4: [.4, .25, .2, .15] };   // 멤버 수별 포지션 중요도
  var W_ABS = 0.45, W_ARR = 0.4, W_FIT = 0.15;                 // 완성도 = 실력 45% + 배치 40% + 곡 궁합 15%
  var ABS_MAX = 70;                                            // 포지션 점수가 이만큼이면 실력 만점
  var NOISE = 0.06;                                            // 운 요소 (±)
  var CUT = [60, 40, 20];                                      // 포지션별 반응 기준 (≥60 최고 / ≥40 환호 / ≥20 무난)
  var STAT = { vocal: ['🎤', '보컬'], dance: ['💃', '댄스'], act: ['🎭', '연기'], fun: ['🎪', '예능'], charm: ['✨', '매력'] };
  var SONGS = [                                                // 포지션 순서: 센터 · 메인 · 서브 · 후열 이 보는 능력치
    { t: '감성 발라드', d: '목소리로 객석을 울리는 곡', k: ['vocal', 'charm', 'vocal', 'act'] },
    { t: '파워 퍼포먼스', d: '칼군무로 압도하는 곡', k: ['dance', 'dance', 'vocal', 'charm'] },
    { t: '청량 댄스팝', d: '매력으로 반하게 하는 곡', k: ['charm', 'dance', 'vocal', 'fun'] },
    { t: '뮤지컬 스테이지', d: '연기와 노래가 어우러지는 곡', k: ['act', 'vocal', 'charm', 'dance'] },
    { t: '파티 송', d: '분위기를 띄우는 신나는 곡', k: ['fun', 'dance', 'charm', 'vocal'] }
  ];
  var LINE = [                                                 // 포지션 반응 문구 (최고 → 흔들림)
    '{n}의 {s} 파트, 객석이 숨을 죽였어요!', '{n}의 {s} 파트, 환호가 터졌어요!', '{n}의 {s} 파트, 무난하게 소화했어요.', '{n}의 {s} 파트, 조금 흔들렸어요…'
  ];
  var ACC = '#ff5d8f', GOLD = '#ffd54a';

  function sfx(n) { try { window.pocaSfx.play(n); } catch (e) {} }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function statOf(cid, k) { try { if (typeof window.getIdolTrainStat === 'function') { var v = window.getIdolTrainStat(cid, k); if (typeof v === 'number') return v; } } catch (e) {} return 10; }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 0.5; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sdSrc(c) { try { return window.__groupAnimal ? window.__groupAnimal.sdSrc(c, 'stage') : 'group-assets/sd/' + c + '.png'; } catch (e) { return 'group-assets/sd/' + c + '.png'; } }
  function perms(a) { if (a.length <= 1) return [a]; var out = []; a.forEach(function (x, i) { perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(function (p) { out.push([x].concat(p)); }); }); return out; }
  function score(song, order, w) { var s = 0; order.forEach(function (c, i) { s += w[i] * statOf(c, song.k[i]); }); return s; }   // order[i] = i번째 포지션에 선 멤버
  function bestWorst(song, members, w) { var b = -1, wst = 1e9; perms(members).forEach(function (p) { var s = score(song, p, w); if (s > b) b = s; if (s < wst) wst = s; }); return { best: b, worst: wst }; }

  function play(members, done) {
    members = (members || []).slice(0, 4); var n = members.length; if (n < 2) { done(null); return; }
    var w = SLOT_W[n], songs = shuffle(SONGS).slice(0, 3), song = null, assign = [], sel = 0, finished = false, timers = [];
    var bw = songs.map(function (s) { return bestWorst(s, members, w); });
    var ov = document.createElement('div');
    ov.id = 'gj-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;z-index:99997;background:linear-gradient(180deg,#14214d 0%,#0a0a1c 80%);color:#fff;display:flex;flex-direction:column;align-items:center;padding:14px;box-sizing:border-box;overflow:auto;-webkit-overflow-scrolling:touch;';
    document.body.appendChild(ov);
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function close(perf, log) { if (finished) return; finished = true; timers.forEach(clearTimeout); ov.remove(); done(perf, perf == null ? null : log); }
    function head() {
      return '<div style="width:100%;max-width:420px;display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="font-size:12px;color:#bcd0ff;">🎤 합동 무대 · 포메이션</div>' +
        '<button id="gj-x" style="background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;">그만두기</button></div>';
    }
    function bindX() { var x = ov.querySelector('#gj-x'); if (x) x.onclick = function () { close(null); }; }
    function img(c, h) { return '<img src="' + sdSrc(c) + '" alt="" height="' + h + '" style="height:' + h + 'px;width:auto;display:block;margin:0 auto;" onerror="this.onerror=null;this.src=\'group-assets/sd/' + c + '.png\'">'; }

    // ── 1단계: 곡 고르기 ──
    function pickSong() {
      ov.innerHTML = head() +
        '<div style="font-size:19px;font-weight:900;margin:16px 0 4px;">오늘 부를 곡을 골라요</div>' +
        '<div style="font-size:12px;color:#bcd0ff;margin-bottom:12px;">우리 그룹이 잘하는 능력치와 맞는 곡이 유리해요</div>' +
        '<div style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:10px;">' + songs.map(function (s, i) {
          var tags = s.k.slice(0, n).map(function (k, j) { return '<span style="display:inline-block;margin:2px 4px 0 0;padding:2px 8px;border-radius:99px;background:rgba(255,255,255,.12);font-size:11px;">' + SLOTS[j] + ' ' + STAT[k][0] + STAT[k][1] + '</span>'; }).join('');
          return '<button data-s="' + i + '" style="text-align:left;padding:14px;border-radius:16px;border:2px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;touch-action:manipulation;">' +
            '<div style="font-size:17px;font-weight:900;">🎵 ' + s.t + '</div><div style="font-size:12px;color:#d6defa;margin:3px 0 4px;">' + s.d + '</div>' + tags + '</button>';
        }).join('') + '</div>';
      bindX();
      Array.prototype.forEach.call(ov.querySelectorAll('[data-s]'), function (b) { b.onclick = function () { song = +b.getAttribute('data-s'); sfx('pop'); assign = []; sel = 0; formation(); }; });
    }

    // ── 2단계: 포지션 배치 ──
    function formation() {
      var sg = songs[song];
      var slots = '', i;
      for (i = 0; i < n; i++) {
        var c = assign[i], key = sg.k[i];
        slots += '<button data-slot="' + i + '" style="width:calc(50% - 5px);box-sizing:border-box;padding:6px 4px 8px;border-radius:14px;border:2px solid ' + (sel === i ? GOLD : 'rgba(255,255,255,.25)') + ';background:' + (sel === i ? 'rgba(255,213,74,.14)' : 'rgba(255,255,255,.07)') + ';color:#fff;min-height:128px;touch-action:manipulation;">' +
          '<div style="font-size:12px;font-weight:900;color:' + (sel === i ? GOLD : '#bcd0ff') + ';">' + SLOTS[i] + ' · ' + STAT[key][0] + STAT[key][1] + '</div>' +
          (c ? img(c, 74) + '<div style="font-size:13px;font-weight:900;">' + nameOf(c) + '</div><div style="font-size:11px;color:' + GOLD + ';">' + STAT[key][1] + ' ' + Math.round(statOf(c, key)) + '</div>' : '<div style="height:92px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#8a95c4;">비어 있음</div>') +
          '</button>';
      }
      var key2 = sg.k[sel];
      var chips = members.map(function (c) {
        var at = assign.indexOf(c);
        return '<button data-m="' + c + '" style="width:calc(25% - 6px);min-width:74px;box-sizing:border-box;padding:6px 2px;border-radius:12px;border:2px solid ' + (at >= 0 ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.3)') + ';background:rgba(255,255,255,.07);color:#fff;opacity:' + (at >= 0 ? .45 : 1) + ';touch-action:manipulation;">' +
          img(c, 52) + '<div style="font-size:12px;font-weight:900;">' + nameOf(c) + '</div><div style="font-size:11px;color:' + GOLD + ';">' + STAT[key2][1] + ' ' + Math.round(statOf(c, key2)) + '</div>' + (at >= 0 ? '<div style="font-size:10px;color:#aab;">' + SLOTS[at] + '</div>' : '') + '</button>';
      }).join('');
      var full = assign.filter(Boolean).length === n;
      ov.innerHTML = head() +
        '<div style="font-size:18px;font-weight:900;margin:12px 0 2px;">🎵 ' + sg.t + '</div>' +
        '<div style="font-size:12px;color:#bcd0ff;margin-bottom:10px;">자리를 누르고 → 멤버를 눌러서 세워요</div>' +
        '<div style="width:100%;max-width:420px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">' + slots + '</div>' +
        '<div style="font-size:12px;margin:12px 0 6px;color:#d6defa;">' + SLOTS[sel] + ' 자리에 맞는 능력치: <b style="color:' + GOLD + ';">' + STAT[key2][0] + STAT[key2][1] + '</b></div>' +
        '<div style="width:100%;max-width:420px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">' + chips + '</div>' +
        '<div style="flex:1;min-height:12px;"></div>' +
        '<button id="gj-go" ' + (full ? '' : 'disabled') + ' style="width:100%;max-width:420px;margin-top:12px;padding:15px;border:0;border-radius:16px;font-size:17px;font-weight:900;color:#fff;background:' + (full ? 'linear-gradient(135deg,' + ACC + ',#a855f7)' : 'rgba(255,255,255,.14)') + ';opacity:' + (full ? 1 : .6) + ';">' + (full ? '🎤 무대 시작!' : '모든 자리를 채워주세요') + '</button>';
      bindX();
      Array.prototype.forEach.call(ov.querySelectorAll('[data-slot]'), function (b) { b.onclick = function () { sel = +b.getAttribute('data-slot'); sfx('pop'); formation(); }; });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-m]'), function (b) {
        b.onclick = function () {
          var c = b.getAttribute('data-m'), at = assign.indexOf(c);
          if (at >= 0) assign[at] = null;                 // 이미 선 멤버를 누르면 그 자리에서 빼서 현재 자리로 옮김
          assign[sel] = c; sfx('pop');
          var nx = -1, k; for (k = 0; k < n; k++) if (!assign[k]) { nx = k; break; }
          if (nx >= 0) sel = nx;
          formation();
        };
      });
      var go = ov.querySelector('#gj-go'); if (go && full) go.onclick = function () { stage(); };
    }

    // ── 3단계: 무대 결과 ──
    function stage() {
      var sg = songs[song], S = score(sg, assign, w), bwi = bw[song], span = bwi.best - bwi.worst;
      var q = span > 0.001 ? (S - bwi.worst) / span : 1;                                  // 배치 점수 (내 배치가 최선 배치에 얼마나 가까운가)
      var maxBest = Math.max.apply(null, bw.map(function (x) { return x.best; })), fit = maxBest > 0 ? bwi.best / maxBest : 1, q2 = clamp((fit - 0.7) / 0.3, 0, 1);   // 곡 궁합
      var ab = clamp(S / ABS_MAX, 0, 1);
      var perf = clamp(W_ABS * ab + W_ARR * q + W_FIT * q2 + gauss() * NOISE, 0, 1);
      var log = assign.map(function (c, i) {
        var v = statOf(c, sg.k[i]) + gauss() * 8, lvl = v >= CUT[0] ? 0 : v >= CUT[1] ? 1 : v >= CUT[2] ? 2 : 3;
        return { c: c, t: SLOTS[i], lvl: lvl, txt: LINE[lvl].replace('{n}', nameOf(c)).replace('{s}', SLOTS[i]) };
      });
      var pct = Math.round(perf * 100), g = pct >= 85 ? '완벽한 무대!' : pct >= 60 ? '멋진 무대' : pct >= 35 ? '무난한 무대' : '아쉬운 무대';
      var note = perf >= 0.85 ? '코인·인기도 보너스 + 등급 상승!' : perf >= 0.5 ? '코인·인기도 보너스!' : perf > 0.12 ? '조금 아쉬운 무대…' : '무대가 삐걱댔어요';
      var tip = q < 0.5 ? '💡 자리를 바꾸면 더 잘할 수 있었어요' : q2 < 0.5 ? '💡 우리 그룹에 더 맞는 곡이 있었어요' : '';
      ov.innerHTML = head() +
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">' +
        '<div style="display:flex;justify-content:center;align-items:flex-end;margin-bottom:10px;">' + assign.map(function (c) { return img(c, n > 3 ? 90 : 118); }).join('') + '</div>' +
        '<div style="font-size:12px;color:#bcd0ff;">🎵 ' + sg.t + '</div>' +
        '<div style="font-size:62px;font-weight:900;line-height:1.1;background:linear-gradient(135deg,' + GOLD + ',' + ACC + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:6px 0;">' + pct + '%</div>' +
        '<div style="font-size:20px;font-weight:900;">' + g + '</div>' +
        '<div style="font-size:13px;color:#ffd0e0;margin-top:10px;">' + note + '</div>' +
        (tip ? '<div style="font-size:12px;color:#bcd0ff;margin-top:8px;">' + tip + '</div>' : '') + '</div>' +
        '<button id="gj-ok" style="width:100%;max-width:420px;padding:15px;border:0;border-radius:16px;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);">무대 올라가기</button>';
      var x = ov.querySelector('#gj-x'); if (x) x.style.display = 'none';
      sfx(perf >= 0.6 ? 'reward' : 'coin');
      ov.querySelector('#gj-ok').onclick = function () { close(perf, log); };
    }

    pickSong();
  }

  window.__groupJoint = { play: play, SONGS: SONGS };
})();
