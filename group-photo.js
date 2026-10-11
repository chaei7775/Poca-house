// ════════════════════════════════════════════════════════════
// 📸 그룹 화보·광고 · 촬영 스튜디오 (group-photo.js)
// 그룹 활동 "그룹 화보·광고"를 누르면 바로 연출을 보는 대신, 포토그래퍼가 되어 멤버를 직접 찍는다.
//  · 오늘의 컨셉(큐트/시크/청량/몽환)이 정해진다 → 멤버마다 컨셉에 맞는 포즈를 고른다
//  · 포즈를 고르면 셔터 게이지가 좌우로 움직인다 → 초록 구간에서 📸 셔터!
//    (초록 구간은 멤버 매력이 높을수록, 컨셉 포즈를 골랐을수록 넓어진다)
//  · 멤버당 2컷. 컷 점수 = 타이밍 65% + 포즈 35% → 평균이 perf 0~1
//    group.js 의 doActivity(id, perf) 가 코인·인기도 ×(0.8~1.4), 대성공 확률 ±15%p, 등급 ±1 로 반영 / 방송 연출 앞에 멤버별 컷 평가가 나온다
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  function gi(f, px) { px = px || 16; return '<img src="' + f + '" alt="" width="' + px + '" height="' + px + '" loading="lazy" decoding="async" draggable="false" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;vertical-align:-3px;">'; }   // 🖼️ 작은 아이콘 그림 (이모지 대신)

  // ── 설정 ──
  var SHOTS_EACH = 2;                  // 멤버당 촬영 컷 수
  var SWEEP_MS = 1100;                 // 게이지가 한쪽 끝에서 반대쪽 끝까지 가는 시간 (짧을수록 어려움)
  var ZONE_BASE = 0.07, ZONE_CHARM = 1 / 400, ZONE_MAX = 0.17, ZONE_POSE = 0.05;   // 초록 구간 절반 폭 = 기본 + 매력/400 (최대 0.17) + 컨셉 포즈 보너스
  var W_TIME = 0.65, W_POSE = 0.35, POSE_WRONG = 0.3;   // 컷 점수 비율 / 컨셉과 안 맞는 포즈의 포즈 점수
  var ACC = '#ff5d8f', GOLD = '#ffd54a';
  var CONCEPTS = [
    { id: 'cute',  name: '큐트',  icon: '🎀', pose: '하트 만들기',   grad: '#ff8fb8' },
    { id: 'chic',  name: '시크',  icon: '🕶️', pose: '팔짱 끼고 정면', grad: '#8b93a8' },
    { id: 'fresh', name: '청량',  icon: '🌊', pose: '점프 샷',        grad: '#5cc8ff' },
    { id: 'dream', name: '몽환',  icon: '🌙', pose: '눈 감고 미소',   grad: '#b79cff' }
  ];

  function sfx(n) { try { window.pocaSfx.play(n); } catch (e) {} }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function statOf(cid, k) { try { if (typeof window.getIdolTrainStat === 'function') { var v = window.getIdolTrainStat(cid, k); if (typeof v === 'number') return v; } } catch (e) {} return 10; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sdSrc(c) { return 'group-assets/sd/' + c + '.png'; }
  function jong(nm, a, b) { var code = nm.charCodeAt(nm.length - 1) - 0xAC00; return nm + ((code >= 0 && code % 28 !== 0) ? a : b); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function play(members, done) {
    members = (members || []).slice(0, 4); var n = members.length; if (n < 2) { done(null); return; }
    var concept = CONCEPTS[rnd(CONCEPTS.length)];
    var queue = []; for (var r = 0; r < SHOTS_EACH; r++) members.forEach(function (c) { queue.push(c); });
    var idx = 0, scores = {}, finished = false, raf = 0, timers = [], phase = 'pose', t0 = 0, zone = null, poseOk = false, busyUntil = 0;
    members.forEach(function (c) { scores[c] = []; });

    var ov = document.createElement('div');
    ov.id = 'gp-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;z-index:99997;background:linear-gradient(180deg,#2a1230 0%,#0a0814 82%);color:#fff;display:flex;flex-direction:column;align-items:center;padding:14px;box-sizing:border-box;overflow:auto;-webkit-overflow-scrolling:touch;';
    document.body.appendChild(ov);
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function close(perf, log) { if (finished) return; finished = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); ov.remove(); done(perf, perf == null ? null : log); }

    function head(msg) {
      return '<div style="width:100%;max-width:420px;display:flex;justify-content:space-between;align-items:center;"><div style="font-size:12px;color:#ffc4e0;">'+gi('grp-photo.png')+' 그룹 화보 · 촬영 스튜디오</div>' +
        '<button id="gp-x" style="background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;">그만두기</button></div>' +
        '<div style="width:100%;max-width:420px;margin:10px 0 6px;padding:10px 12px;border-radius:14px;background:linear-gradient(135deg,' + concept.grad + '55,rgba(255,255,255,.06));border:1px solid ' + concept.grad + '88;font-size:13px;">' +
        '오늘의 컨셉 <b style="font-size:16px;">' + concept.icon + ' ' + concept.name + '</b><span style="float:right;color:' + GOLD + ';">' + Math.min(idx + 1, queue.length) + ' / ' + queue.length + '컷</span></div>' +
        '<div id="gp-msg" style="width:100%;max-width:420px;min-height:20px;font-size:13px;color:' + GOLD + ';text-align:center;margin-bottom:4px;">' + (msg || '') + '</div>';
    }
    function who(c) {
      return '<div style="text-align:center;margin:4px 0;"><img src="' + sdSrc(c) + '" alt="" height="150" style="height:150px;width:auto;" onerror="this.onerror=null;this.src=\'face-' + c + '.png\';this.style.cssText=\'height:110px;width:110px;border-radius:50%;object-fit:cover;\'">' +
        '<div style="font-size:15px;font-weight:900;">' + nameOf(c) + '</div><div style="font-size:11px;color:' + GOLD + ';">'+gi('grp-stat-charm.png', 13)+' 매력 ' + Math.round(statOf(c, 'charm')) + '</div></div>';
    }
    function bindX() { var x = ov.querySelector('#gp-x'); if (x) x.onclick = function () { close(null); }; }

    function posePhase() {
      phase = 'pose'; cancelAnimationFrame(raf);
      var c = queue[idx];
      var others = shuffle(CONCEPTS.filter(function (k) { return k.id !== concept.id; })).slice(0, 2);
      var opts = shuffle([concept].concat(others));
      ov.innerHTML = head(jong(nameOf(c), '은', '는') + ' 어떤 포즈로 찍을까요?') + who(c) +
        '<div style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:8px;margin-top:6px;">' + opts.map(function (k) {
          return '<button data-k="' + k.id + '" style="padding:13px;border:0;border-radius:14px;font-size:15px;font-weight:900;color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);text-align:left;touch-action:manipulation;">' + k.icon + ' ' + k.pose + '</button>';
        }).join('') + '</div>';
      bindX();
      Array.prototype.forEach.call(ov.querySelectorAll('[data-k]'), function (b) {
        b.onclick = function () { poseOk = b.getAttribute('data-k') === concept.id; sfx('pop'); shotPhase(); };
      });
    }

    function shotPhase() {
      phase = 'shot'; var c = queue[idx];
      var half = clamp(ZONE_BASE + statOf(c, 'charm') * ZONE_CHARM, ZONE_BASE, ZONE_MAX) + (poseOk ? ZONE_POSE : 0);
      var mid = 0.25 + Math.random() * 0.5;
      zone = { mid: mid, half: half };
      ov.innerHTML = head(poseOk ? '컨셉에 딱 맞는 포즈! 구간이 넓어졌어요' : '포즈가 컨셉과 조금 달라요…') + who(c) +
        '<div style="width:100%;max-width:420px;position:relative;height:30px;border-radius:15px;background:rgba(255,255,255,.14);margin-top:6px;overflow:hidden;">' +
        '<div style="position:absolute;top:0;bottom:0;left:' + ((mid - half) * 100) + '%;width:' + (half * 200) + '%;background:rgba(110,231,160,.55);"></div>' +
        '<div id="gp-ptr" style="position:absolute;top:-2px;bottom:-2px;width:6px;margin-left:-3px;border-radius:3px;background:#fff;box-shadow:0 0 8px #fff;left:0;"></div></div>' +
        '<div style="flex:1;min-height:12px;"></div>' +
        '<button id="gp-shot" style="width:100%;max-width:420px;padding:18px;border:0;border-radius:18px;font-size:19px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);touch-action:manipulation;">📸 셔터!</button>';
      bindX();
      var ptr = ov.querySelector('#gp-ptr'); t0 = performance.now();
      window.__groupPhoto.cur.pos = 0;
      function tick(now) {
        if (finished || phase !== 'shot') return;
        var ph = ((now - t0) / SWEEP_MS) % 2, pos = ph < 1 ? ph : 2 - ph;
        window.__groupPhoto.cur.pos = pos; ptr.style.left = (pos * 100) + '%';
        raf = requestAnimationFrame(tick);
      }
      raf = requestAnimationFrame(tick);
      ov.querySelector('#gp-shot').onclick = function () { shoot(); };
    }

    function shoot(posOverride) {
      if (phase !== 'shot' || finished) return;
      phase = 'result'; cancelAnimationFrame(raf);
      var c = queue[idx], pos = typeof posOverride === 'number' ? posOverride : window.__groupPhoto.cur.pos;
      var d = Math.abs(pos - zone.mid), tm = d <= zone.half / 3 ? 1 : d <= zone.half ? 0.75 : d <= zone.half * 2 ? 0.4 : 0.1;
      var s = W_TIME * tm + W_POSE * (poseOk ? 1 : POSE_WRONG);
      scores[c].push(s); sfx(tm >= 0.75 ? 'reward' : 'pop');
      var lab = tm === 1 ? '✨ 완벽한 컷!' : tm === 0.75 ? '좋은 컷!' : tm === 0.4 ? '살짝 흔들렸어요' : '초점이 나갔어요…';
      var m = ov.querySelector('#gp-msg'); if (m) m.innerHTML = lab;
      var b = ov.querySelector('#gp-shot'); if (b) { b.disabled = true; b.style.opacity = '.5'; }
      later(function () { idx++; if (idx >= queue.length) finish(); else posePhase(); }, 900);
    }

    function finish() {
      if (finished) return;
      var all = [], log = [];
      members.forEach(function (c) {
        var avg = scores[c].reduce(function (a, v) { return a + v; }, 0) / Math.max(1, scores[c].length); all.push(avg);
        var nm = nameOf(c), lvl = avg >= 0.75 ? 0 : avg >= 0.45 ? 1 : 3;
        var txt = lvl === 0 ? jong(nm, '의', '의') + ' 컷이 화보 표지감이라고 감탄이 나왔어요!' : lvl === 1 ? jong(nm, '의', '의') + ' 컷은 무난하게 잘 나왔어요.' : jong(nm, '의', '의') + ' 컷이 흔들려서 재촬영 이야기가 나왔어요…';
        log.push({ c: c, t: '촬영', lvl: lvl, txt: txt });
      });
      var perf = clamp(all.reduce(function (a, v) { return a + v; }, 0) / n, 0, 1), pct = Math.round(perf * 100);
      var g = pct >= 85 ? '표지 확정!' : pct >= 60 ? '화보 퀄리티 최고' : pct >= 35 ? '무난한 촬영' : '건질 컷이 적어요';
      var note = perf >= 0.85 ? '코인·인기도 보너스 + 등급 상승!' : perf >= 0.5 ? '코인·인기도 보너스!' : perf > 0.12 ? '조금 아쉬운 촬영…' : '촬영이 엉망이 됐어요';
      ov.innerHTML = '<div style="flex:1;"></div><div style="text-align:center;">' +
        '<div style="font-size:12px;color:#ffc4e0;">'+gi('grp-photo.png')+' 촬영 종료</div>' +
        '<div style="font-size:66px;font-weight:900;line-height:1.1;background:linear-gradient(135deg,' + GOLD + ',' + ACC + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:8px 0;">' + pct + '%</div>' +
        '<div style="font-size:20px;font-weight:900;">' + g + '</div>' +
        '<div style="font-size:13px;color:#ffd0e0;margin-top:10px;">' + note + '</div></div><div style="flex:1;"></div>' +
        '<button id="gp-go" style="width:100%;max-width:420px;padding:15px;border:0;border-radius:16px;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);">화보 공개하러 가기</button>';
      sfx(perf >= 0.6 ? 'reward' : 'coin');
      ov.querySelector('#gp-go').onclick = function () { close(perf, log); };
      window.__groupPhoto.cur.perf = perf;
    }

    window.__groupPhoto.cur = { concept: concept, queue: queue, pos: 0, shoot: shoot, pose: function () { return poseOk; }, zone: function () { return zone; } };
    posePhase();
  }

  window.__groupPhoto = { play: play, cur: null };
})();
