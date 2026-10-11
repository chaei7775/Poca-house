// ════════════════════════════════════════════════════════════
// 🎭 단체 드라마 · 촬영 현장 (group-drama.js)
// 그룹 활동 "단체 드라마"를 누르면 바로 연출을 보는 대신, 감독이 되어 장면마다 배우를 캐스팅하고 감정 연기를 직접 이끈다.
//  · 오늘 찍을 장면은 3개 (눈물 연기 / 로맨스 / 코믹 / 액션 …). 장면마다 필요한 능력치가 다르다
//  · 캐스팅: 장면마다 한 명을 고른다 (한 멤버가 너무 많이 연기할 수 없다: 멤버당 최대 ceil(3 ÷ 인원)번)
//  · 촬영: "감정 버튼"을 꾹 누르면 감정 게이지가 차오른다 → 초록 구간에서 손을 떼면 OK!
//    끝까지 차면 감정 과잉 NG → 한 번 재촬영 (재촬영은 점수 ×0.8). 초록 구간은 배우가 장면에 어울릴수록 넓어진다
//  · 장면 점수 평균이 perf 0~1
//    group.js 의 doActivity(id, perf) 가 코인·인기도 ×(0.8~1.4), 대성공 확률 ±15%p, 등급 ±1 로 반영 / 방송 연출 앞에 장면별 평가가 나온다
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  function gi(f, px) { px = px || 16; return '<img src="' + f + '" alt="" width="' + px + '" height="' + px + '" loading="lazy" decoding="async" draggable="false" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;vertical-align:-3px;">'; }   // 🖼️ 작은 아이콘 그림 (이모지 대신)

  // ── 설정 ──
  var SCENES_N = 3;                    // 한 번에 찍는 장면 수
  var FILL_MS = 1500;                  // 감정 게이지가 0 → 100% 까지 차는 시간 (짧을수록 어려움)
  var ZONE_BASE = 0.06, ZONE_FIT = 1 / 500, ZONE_MAX = 0.16;   // 초록 구간 절반 폭 = 기본 + 어울림 점수/500 (최대 0.16)
  var T_MIN = 0.5, T_MAX = 0.85;       // 초록 구간 중심이 놓이는 위치 범위
  var RETAKE_MULT = 0.8;               // 재촬영 점수 배율
  var STAT = { vocal: [gi('grp-stat-vocal.png', 14), '보컬'], dance: [gi('grp-stat-dance.png', 14), '댄스'], act: [gi('grp-stat-act.png', 14), '연기'], fun: [gi('grp-stat-fun.png', 14), '예능'], charm: [gi('grp-stat-charm.png', 14), '매력'] };
  var SCENES = [                       // w: 장면에 필요한 능력치 비율
    { t: '눈물의 이별 신', i: gi('grp-sc-cry.png', 22), q: '떠나는 연인을 붙잡는 오열 연기', w: { act: 1 } },
    { t: '설레는 첫 만남', i: gi('grp-sc-love.png', 22), q: '눈이 마주치는 순간 심장이 뛰는 장면', w: { charm: .6, act: .4 } },
    { t: '코믹 감초 신', i: gi('grp-sc-comedy.png', 22), q: '분위기를 뒤집는 코믹 애드리브', w: { fun: .8, act: .2 } },
    { t: '숨 막히는 액션 신', i: gi('grp-sc-action.png', 22), q: '직접 소화하는 추격·액션 장면', w: { dance: .7, act: .3 } },
    { t: '감동의 독백 신', i: '🎙️', q: '마지막 편지를 읽어 내려가는 내레이션', w: { vocal: .5, act: .5 } },
    { t: '반전 악역 등장', i: gi('grp-sc-villain.png', 22), q: '소름 돋는 눈빛의 반전 악역 연기', w: { act: .7, charm: .3 } }
  ];
  var ACC = '#ff5d8f', GOLD = '#ffd54a';

  function sfx(n) { try { window.pocaSfx.play(n); } catch (e) {} }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function statOf(cid, k) { try { if (typeof window.getIdolTrainStat === 'function') { var v = window.getIdolTrainStat(cid, k); if (typeof v === 'number') return v; } } catch (e) {} return 10; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sdSrc(c) { return 'group-assets/sd/' + c + '.png'; }
  function jong(nm, a, b) { var code = nm.charCodeAt(nm.length - 1) - 0xAC00; return nm + ((code >= 0 && code % 28 !== 0) ? a : b); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fitOf(c, w) { var s = 0; for (var k in w) s += statOf(c, k) * w[k]; return s; }

  function play(members, done) {
    members = (members || []).slice(0, 4); var n = members.length; if (n < 2) { done(null); return; }
    var scenes = shuffle(SCENES).slice(0, SCENES_N), limit = Math.ceil(SCENES_N / n);
    var idx = 0, cast = [], used = {}, results = [], finished = false, raf = 0, timers = [], phase = 'cast';
    var cur = { scene: null, who: null, zone: null, val: 0, take: 1 };
    members.forEach(function (c) { used[c] = 0; });

    var ov = document.createElement('div');
    ov.id = 'gd-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;z-index:99997;background:linear-gradient(180deg,#2a1020 0%,#0c0810 82%);color:#fff;display:flex;flex-direction:column;align-items:center;padding:14px;box-sizing:border-box;overflow:auto;-webkit-overflow-scrolling:touch;-webkit-user-select:none;user-select:none;';
    document.body.appendChild(ov);
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function close(perf, log) { if (finished) return; finished = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); ov.remove(); done(perf, perf == null ? null : log); }

    function head(msg) {
      var sc = scenes[idx];
      return '<div style="width:100%;max-width:420px;display:flex;justify-content:space-between;align-items:center;"><div style="font-size:12px;color:#ffc4d6;">'+gi('grp-drama.png')+' 단체 드라마 · 촬영 현장</div>' +
        '<button id="gd-x" style="background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;">그만두기</button></div>' +
        '<div style="width:100%;max-width:420px;margin:10px 0 6px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);">' +
        '<div style="font-size:12px;color:' + GOLD + ';">장면 ' + (idx + 1) + ' / ' + scenes.length + '</div>' +
        '<div style="font-size:17px;font-weight:900;margin-top:2px;">' + sc.i + ' ' + sc.t + '</div><div style="font-size:12px;color:#d9c4cf;margin-top:2px;">' + sc.q + '</div></div>' +
        '<div id="gd-msg" style="width:100%;max-width:420px;min-height:20px;font-size:13px;color:' + GOLD + ';text-align:center;margin-bottom:4px;">' + (msg || '') + '</div>';
    }
    function bindX() { var x = ov.querySelector('#gd-x'); if (x) x.onclick = function () { close(null); }; }
    function wStr(w) { var a = []; for (var k in w) a.push(STAT[k][0] + STAT[k][1] + ' ' + Math.round(w[k] * 100) + '%'); return a.join(' · '); }

    function castPhase() {
      phase = 'cast'; cancelAnimationFrame(raf);
      var sc = scenes[idx];
      var cards = members.map(function (c) {
        var full = used[c] >= limit, f = Math.round(fitOf(c, sc.w));
        return '<button data-c="' + c + '"' + (full ? ' disabled' : '') + ' style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.1);color:#fff;text-align:left;touch-action:manipulation;' + (full ? 'opacity:.35;' : '') + '">' +
          '<img src="' + sdSrc(c) + '" alt="" height="60" style="height:60px;width:auto;" onerror="this.onerror=null;this.src=\'face-' + c + '.png\';this.style.cssText=\'height:48px;width:48px;border-radius:50%;object-fit:cover;\'">' +
          '<div style="flex:1;"><div style="font-size:15px;font-weight:900;">' + nameOf(c) + '</div><div style="font-size:11px;color:' + GOLD + ';">어울림 ' + f + '</div></div>' +
          '<div style="font-size:11px;color:#c9b8c2;">' + (full ? '이미 출연' : '출연 ' + used[c] + '/' + limit) + '</div></button>';
      }).join('');
      ov.innerHTML = head('이 장면을 맡을 배우를 고르세요') +
        '<div style="width:100%;max-width:420px;font-size:12px;color:#d9c4cf;margin-bottom:8px;text-align:center;">필요한 능력치 · ' + wStr(sc.w) + '</div>' +
        '<div style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:8px;">' + cards + '</div>';
      bindX();
      Array.prototype.forEach.call(ov.querySelectorAll('[data-c]'), function (b) {
        b.onclick = function () { var c = b.getAttribute('data-c'); if (used[c] >= limit) return; used[c]++; sfx('pop'); cast[idx] = c; actPhase(1); };
      });
    }

    function actPhase(take) {
      phase = 'act'; var sc = scenes[idx], c = cast[idx];
      var half = clamp(ZONE_BASE + fitOf(c, sc.w) * ZONE_FIT, ZONE_BASE, ZONE_MAX), mid = T_MIN + Math.random() * (T_MAX - T_MIN);
      cur.scene = sc; cur.who = c; cur.zone = { mid: mid, half: half }; cur.val = 0; cur.take = take;
      ov.innerHTML = head(take === 1 ? jong(nameOf(c), '이', '가') + ' 연기에 들어가요! 버튼을 꾹 누르세요' : '재촬영! 이번엔 신중하게…') +
        '<div style="text-align:center;margin:4px 0;"><img src="' + sdSrc(c) + '" alt="" height="130" style="height:130px;width:auto;" onerror="this.onerror=null;this.src=\'face-' + c + '.png\';this.style.cssText=\'height:100px;width:100px;border-radius:50%;object-fit:cover;\'"><div style="font-size:14px;font-weight:900;">' + nameOf(c) + '</div></div>' +
        '<div style="width:100%;max-width:420px;position:relative;height:34px;border-radius:17px;background:rgba(255,255,255,.14);overflow:hidden;">' +
        '<div style="position:absolute;top:0;bottom:0;left:' + ((mid - half) * 100) + '%;width:' + (half * 200) + '%;background:rgba(110,231,160,.55);"></div>' +
        '<div id="gd-fill" style="position:absolute;top:0;bottom:0;left:0;width:0;border-radius:17px;background:linear-gradient(90deg,#ff8fb8,' + ACC + ');opacity:.85;"></div></div>' +
        '<div style="width:100%;max-width:420px;display:flex;justify-content:space-between;font-size:11px;color:#c9b8c2;margin-top:4px;"><span>담담</span><span>🟩 초록에서 손 떼기</span><span>과잉</span></div>' +
        '<div style="flex:1;min-height:12px;"></div>' +
        '<button id="gd-hold" style="width:100%;max-width:420px;padding:26px;border:0;border-radius:18px;font-size:19px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);touch-action:none;-webkit-touch-callout:none;">🎬 감정 꾹 누르기</button>';
      bindX();
      var fill = ov.querySelector('#gd-fill'), btn = ov.querySelector('#gd-hold'), t0 = 0, holding = false;
      function tick(now) {
        if (finished || phase !== 'act' || !holding) return;
        var v = clamp((now - t0) / FILL_MS, 0, 1); cur.val = v; fill.style.width = (v * 100) + '%';
        if (v >= 1) { holding = false; release(1); return; }
        raf = requestAnimationFrame(tick);
      }
      function down(e) { if (phase !== 'act' || holding) return; if (e && e.preventDefault) e.preventDefault(); holding = true; t0 = performance.now(); raf = requestAnimationFrame(tick); }
      function up(e) { if (!holding) return; holding = false; cancelAnimationFrame(raf); release(cur.val); }
      btn.addEventListener('pointerdown', down); btn.addEventListener('pointerup', up); btn.addEventListener('pointercancel', up);
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }

    function release(v) {
      if (phase !== 'act' || finished) return;
      phase = 'result'; cancelAnimationFrame(raf);
      var z = cur.zone, take = cur.take, msg, s, ng = false;
      if (v >= 0.999) { ng = true; s = 0.05; msg = '💥 감정 과잉! NG!'; }
      else {
        var d = Math.abs(v - z.mid), tm = d <= z.half / 3 ? 1 : d <= z.half ? 0.75 : d <= z.half * 2 ? 0.4 : 0.1;
        s = tm; msg = tm === 1 ? '✨ 완벽한 연기! 컷, OK!' : tm === 0.75 ? '좋아요! 한 번에 OK' : tm === 0.4 ? '조금 아쉬운 연기…' : (v < z.mid ? '감정이 너무 약했어요…' : '감정이 너무 셌어요…');
        if (take === 2) s *= RETAKE_MULT;
      }
      var m = ov.querySelector('#gd-msg'); if (m) m.innerHTML = msg;
      var b = ov.querySelector('#gd-hold'); if (b) { b.disabled = true; b.style.opacity = '.5'; }
      sfx(s >= 0.75 ? 'reward' : 'pop');
      later(function () {
        if (ng && take === 1) { actPhase(2); return; }
        results[idx] = { c: cur.who, s: s, ng: ng, take: take }; idx++;
        if (idx >= scenes.length) finish(); else castPhase();
      }, 1000);
    }

    function finish() {
      if (finished) return;
      var log = [], sum = 0;
      results.forEach(function (r, k) {
        sum += r.s; var nm = nameOf(r.c), sc = scenes[k];
        var lvl = r.s >= 0.7 ? 0 : r.s >= 0.35 ? 1 : 3;
        var txt = lvl === 0 ? jong(nm, '의', '의') + ' ' + sc.t + ' 연기에 스태프들이 숨을 죽였어요!' : lvl === 1 ? jong(nm, '의', '의') + ' ' + sc.t + '은 무난하게 마무리됐어요.' : jong(nm, '의', '의') + ' ' + sc.t + '에서 NG가 이어져 촬영이 길어졌어요…';
        log.push({ c: r.c, t: '연기', lvl: lvl, txt: txt });
      });
      var perf = clamp(sum / results.length, 0, 1), pct = Math.round(perf * 100);
      var g = pct >= 85 ? '레전드 드라마 탄생!' : pct >= 60 ? '몰입도 높은 촬영' : pct >= 35 ? '무난한 촬영' : '편집이 힘든 촬영';
      var note = perf >= 0.85 ? '코인·인기도 보너스 + 등급 상승!' : perf >= 0.5 ? '코인·인기도 보너스!' : perf > 0.12 ? '조금 아쉬운 촬영…' : '촬영이 엉망이 됐어요';
      ov.innerHTML = '<div style="flex:1;"></div><div style="text-align:center;">' +
        '<div style="font-size:12px;color:#ffc4d6;">'+gi('grp-drama.png')+' 촬영 종료</div>' +
        '<div style="font-size:66px;font-weight:900;line-height:1.1;background:linear-gradient(135deg,' + GOLD + ',' + ACC + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:8px 0;">' + pct + '%</div>' +
        '<div style="font-size:20px;font-weight:900;">' + g + '</div>' +
        '<div style="font-size:13px;color:#ffd0e0;margin-top:10px;">' + note + '</div></div><div style="flex:1;"></div>' +
        '<button id="gd-go" style="width:100%;max-width:420px;padding:15px;border:0;border-radius:16px;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);">드라마 방영하러 가기</button>';
      sfx(perf >= 0.6 ? 'reward' : 'coin');
      ov.querySelector('#gd-go').onclick = function () { close(perf, log); };
      window.__groupDrama.cur.perf = perf;
    }

    cur.release = release; cur.scenes = scenes; cur.phaseOf = function () { return phase; };
    window.__groupDrama.cur = cur;
    castPhase();
  }

  window.__groupDrama = { play: play, cur: null };
})();
