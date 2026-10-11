// ════════════════════════════════════════════════════════════
// 💿 그룹 음원 녹음 · 믹싱룸 (group-album.js)
// 그룹 활동 "그룹 음원 녹음"을 누르면 바로 연출을 보는 대신, 멤버 목소리의 볼륨 밸런스를 직접 맞춘다.
//  · 오늘 곡은 "한 명이 리드하고 나머지는 보컬 실력 순으로 받쳐주는" 곡. 누가 리드인지는 모른다
//  · 멤버마다 볼륨(1~7)을 맞추고 🎙️ 녹음하기 → 프로듀서가 멤버별로 "더 키워요 ⬆ / 줄여요 ⬇ / 딱 좋아요 ✔" 힌트를 준다
//  · 테이크는 4번 (그룹 보컬 평균이 높으면 5번, 낮으면 3번). 언제든 "이대로 확정" 가능
//  · 밸런스가 딱 맞을수록 높은 점수 (마지막 테이크 기준, 빨리 맞추면 보너스) → perf 0~1
//    group.js 의 doActivity(id, perf) 가 코인·인기도 ×(0.8~1.4), 대성공 확률 ±15%p, 등급 ±1 로 반영 / 방송 연출 앞에 멤버별 결과가 나온다
// ✏️ 고치는 법: 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  function gi(f, px) { px = px || 16; return '<img src="' + f + '" alt="" width="' + px + '" height="' + px + '" loading="lazy" decoding="async" draggable="false" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;vertical-align:-3px;">'; }   // 🖼️ 작은 아이콘 그림 (이모지 대신)

  // ── 설정 ──
  var LV_MIN = 1, LV_MAX = 7;                 // 볼륨 단계
  var TAKES = [[25, 3], [50, 4], [999, 5]];   // [그룹 보컬 평균 미만, 테이크 수]
  var LEAD_LV = [6, 7];                       // 리드 멤버의 이상적인 볼륨 (둘 중 랜덤)
  var REST_LV = [2, 5];                       // 나머지 멤버 이상적인 볼륨 범위 (보컬 낮은 → 높은 순)
  var W_ACC = 0.8, W_FAST = 0.2;              // 점수 = 정확도 80% + (다 맞췄을 때) 빨리 맞춘 보너스 20%
  var ACC = '#ff5d8f', GOLD = '#ffd54a';

  function sfx(n) { try { window.pocaSfx.play(n); } catch (e) {} }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function statOf(cid, k) { try { if (typeof window.getIdolTrainStat === 'function') { var v = window.getIdolTrainStat(cid, k); if (typeof v === 'number') return v; } } catch (e) {} return 10; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sdSrc(c) { return 'group-assets/sd/' + c + '.png'; }
  function jong(nm, a, b) { var code = nm.charCodeAt(nm.length - 1) - 0xAC00; return nm + ((code >= 0 && code % 28 !== 0) ? a : b); }

  function play(members, done) {
    members = (members || []).slice(0, 4); var n = members.length; if (n < 2) { done(null); return; }
    var avgV = members.reduce(function (a, c) { return a + statOf(c, 'vocal'); }, 0) / n, takes = 4, i;
    for (i = 0; i < TAKES.length; i++) if (avgV < TAKES[i][0]) { takes = TAKES[i][1]; break; }
    // 이상적인 밸런스: 랜덤 리드 1명은 높게, 나머지는 보컬 실력 순으로 낮게→높게
    var lead = members[rnd(n)], ideal = {};
    ideal[lead] = LEAD_LV[rnd(LEAD_LV.length)];
    var rest = members.filter(function (c) { return c !== lead; }).map(function (c) { return { c: c, v: statOf(c, 'vocal') + Math.random() * 0.01 }; }).sort(function (a, b) { return a.v - b.v; });
    rest.forEach(function (r, k) { ideal[r.c] = Math.round(REST_LV[0] + (REST_LV[1] - REST_LV[0]) * (rest.length > 1 ? k / (rest.length - 1) : 0.5)); });
    var set = {}, fb = {}, take = 0, bestSet = null, finished = false, timers = [];
    members.forEach(function (c) { set[c] = 4; });

    var ov = document.createElement('div');
    ov.id = 'ga-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;z-index:99997;background:linear-gradient(180deg,#0f2a3d 0%,#080a18 82%);color:#fff;display:flex;flex-direction:column;align-items:center;padding:14px;box-sizing:border-box;overflow:auto;-webkit-overflow-scrolling:touch;';
    document.body.appendChild(ov);
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function close(perf, log) { if (finished) return; finished = true; timers.forEach(clearTimeout); ov.remove(); done(perf, perf == null ? null : log); }

    function bars(c) {
      var s = '';
      for (var l = LV_MIN; l <= LV_MAX; l++) s += '<span style="flex:1;height:' + (8 + l * 3) + 'px;border-radius:3px;background:' + (l <= set[c] ? 'linear-gradient(180deg,' + GOLD + ',' + ACC + ')' : 'rgba(255,255,255,.16)') + ';"></span>';
      return s;
    }
    function fbHtml(c) {
      var f = fb[c]; if (!f) return '<span style="color:#8fa4c4;font-size:12px;">?</span>';
      return f === 0 ? '<span style="color:#6ee7a0;font-weight:900;font-size:13px;">✔ 딱 좋아요</span>' : f > 0 ? '<span style="color:#fcd34d;font-weight:900;font-size:13px;">⬆ 더 키워요</span>' : '<span style="color:#fca5a5;font-weight:900;font-size:13px;">⬇ 줄여요</span>';
    }
    function draw(msg) {
      var rows = members.map(function (c) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);">' +
          '<img src="' + sdSrc(c) + '" alt="" height="62" style="height:62px;width:auto;" onerror="this.onerror=null;this.src=\'face-' + c + '.png\';this.style.cssText=\'height:48px;width:48px;border-radius:50%;object-fit:cover;\'">' +
          '<div style="width:62px;"><div style="font-size:14px;font-weight:900;">' + nameOf(c) + '</div><div style="font-size:11px;color:' + GOLD + ';">'+gi('grp-stat-vocal.png', 13)+' 보컬 ' + Math.round(statOf(c, 'vocal')) + '</div><div style="margin-top:3px;">' + fbHtml(c) + '</div></div>' +
          '<button data-d="' + c + '" data-s="-1" style="width:38px;height:38px;border-radius:12px;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:20px;touch-action:manipulation;">−</button>' +
          '<div style="flex:1;display:flex;align-items:flex-end;gap:3px;height:34px;">' + bars(c) + '</div>' +
          '<button data-d="' + c + '" data-s="1" style="width:38px;height:38px;border-radius:12px;border:0;background:rgba(255,255,255,.14);color:#fff;font-size:20px;touch-action:manipulation;">+</button></div>';
      }).join('');
      ov.innerHTML =
        '<div style="width:100%;max-width:420px;display:flex;justify-content:space-between;align-items:center;"><div style="font-size:12px;color:#bfe4ff;">'+gi('grp-album.png')+' 그룹 음원 · 믹싱룸</div>' +
        '<button id="ga-x" style="background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;">그만두기</button></div>' +
        '<div style="width:100%;max-width:420px;margin:12px 0 8px;padding:12px;border-radius:14px;background:rgba(255,255,255,.08);font-size:13px;line-height:1.6;">🎧 프로듀서: "오늘 곡은 <b>한 명이 확실하게 끌고 가고</b>, 나머지는 <b>보컬 실력 순으로</b> 받쳐주는 곡이에요. 멤버별 목소리 크기를 맞춰보세요!"</div>' +
        '<div style="width:100%;max-width:420px;display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;"><span>🎙️ 테이크 ' + take + ' / ' + takes + '</span><span style="color:' + GOLD + ';">' + (msg || '') + '</span></div>' +
        '<div style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:8px;">' + rows + '</div>' +
        '<div style="flex:1;min-height:14px;"></div>' +
        '<div style="width:100%;max-width:420px;display:flex;gap:8px;margin-top:12px;">' +
        '<button id="ga-rec" style="flex:2;padding:15px;border:0;border-radius:16px;font-size:16px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);touch-action:manipulation;">🎙️ 녹음하기</button>' +
        (take > 0 ? '<button id="ga-ok" style="flex:1;padding:15px;border:0;border-radius:16px;font-size:14px;font-weight:900;color:#fff;background:rgba(255,255,255,.16);touch-action:manipulation;">이대로 확정</button>' : '') + '</div>';
      ov.querySelector('#ga-x').onclick = function () { close(null); };
      Array.prototype.forEach.call(ov.querySelectorAll('[data-d]'), function (b) {
        b.onclick = function () { var c = b.getAttribute('data-d'); set[c] = clamp(set[c] + (+b.getAttribute('data-s')), LV_MIN, LV_MAX); sfx('pop'); fb[c] = undefined; draw(msg); };
      });
      ov.querySelector('#ga-rec').onclick = record;
      var ok = ov.querySelector('#ga-ok'); if (ok) ok.onclick = function () { finish(false); };
    }
    function record() {
      take++; sfx('coin'); bestSet = JSON.parse(JSON.stringify(set));
      var allOk = true;
      members.forEach(function (c) { var d = ideal[c] - set[c]; fb[c] = d === 0 ? 0 : d > 0 ? 1 : -1; if (d !== 0) allOk = false; });
      if (allOk) { draw('✨ 완벽한 밸런스!'); sfx('reward'); later(function () { finish(true); }, 1200); return; }
      if (take >= takes) { draw('마지막 테이크였어요'); later(function () { finish(false); }, 1300); return; }
      draw('프로듀서 피드백이 왔어요');
    }
    function finish(solved) {
      if (finished) return;
      var snap = bestSet || set, err = 0, log = [];
      members.forEach(function (c) { err += Math.abs(ideal[c] - snap[c]); });
      var acc = clamp(1 - err / (n * 4), 0, 1);                       // 평균 4단계 이상 어긋나면 0점
      var left = Math.max(0, takes - take), fast = solved ? 0.5 + 0.5 * (left / Math.max(1, takes - 1)) : 0;
      var perf = clamp(W_ACC * acc + W_FAST * fast, 0, 1), pct = Math.round(perf * 100);
      members.forEach(function (c) {
        var d = ideal[c] - snap[c], a = Math.abs(d), nm = nameOf(c);
        var txt = a === 0 ? jong(nm, '의', '의') + ' 목소리가 하모니에 딱 녹아들었어요!' : a === 1 ? jong(nm, '의', '의') + ' 파트가 조금 ' + (d < 0 ? '튀었지만' : '묻혔지만') + ' 곡 분위기는 살았어요.' : jong(nm, '의', '의') + ' 목소리가 ' + (d < 0 ? '너무 튀어서' : '묻혀서') + ' 밸런스가 흔들렸어요…';
        log.push({ c: c, t: '믹싱', lvl: a === 0 ? 0 : a === 1 ? 1 : 3, txt: txt });
      });
      var g = pct >= 85 ? '명곡 탄생!' : pct >= 60 ? '완성도 높은 녹음' : pct >= 35 ? '무난한 녹음' : '밸런스가 아쉬워요';
      var note = perf >= 0.85 ? '코인·인기도 보너스 + 등급 상승!' : perf >= 0.5 ? '코인·인기도 보너스!' : perf > 0.12 ? '조금 아쉬운 녹음…' : '녹음이 엉망이 됐어요';
      var leadMsg = '오늘의 리드는 <b style="color:' + GOLD + ';">' + nameOf(lead) + '</b>였어요';
      ov.innerHTML = '<div style="flex:1;"></div><div style="text-align:center;">' +
        '<div style="font-size:12px;color:#bfe4ff;">'+gi('grp-album.png')+' 녹음 종료</div>' +
        '<div style="font-size:66px;font-weight:900;line-height:1.1;background:linear-gradient(135deg,' + GOLD + ',' + ACC + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:8px 0;">' + pct + '%</div>' +
        '<div style="font-size:20px;font-weight:900;">' + g + '</div>' +
        '<div style="font-size:13px;color:#d6e8ff;margin-top:10px;">' + leadMsg + '</div>' +
        '<div style="font-size:13px;color:#ffd0e0;margin-top:6px;">' + note + '</div></div><div style="flex:1;"></div>' +
        '<button id="ga-go" style="width:100%;max-width:420px;padding:15px;border:0;border-radius:16px;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);">음원 발매하러 가기</button>';
      sfx(perf >= 0.6 ? 'reward' : 'coin');
      ov.querySelector('#ga-go').onclick = function () { close(perf, log); };
      window.__groupAlbum.cur = { ideal: ideal, lead: lead, perf: perf };
      timers.forEach(clearTimeout);
    }

    window.__groupAlbum.cur = { ideal: ideal, lead: lead };
    draw();
  }

  window.__groupAlbum = { play: play, cur: null };
})();
