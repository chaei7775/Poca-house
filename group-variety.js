// ════════════════════════════════════════════════════════════
// 🎪 단체 예능 토크쇼 (group-variety.js)
// 그룹 활동 "단체 예능 출연"을 누르면 바로 연출을 보는 대신, 직접 하는 코너 3개가 먼저 열린다.
//  · 코너마다 MC가 미션을 던지고, 누구를 내보낼지 내가 고른다 (코너에 맞는 능력치가 높은 멤버가 유리)
//  · 한 멤버가 너무 많이 나가면 지치니까 멤버당 출연 횟수 제한 (= ceil(코너 수 / 멤버 수))
//  · 🐾 동물옷을 입은 멤버는 예능·매력 코너에 보너스 (group-animal.js)
//  · 결과: 대폭소 3점 · 웃음 2점 · 그럭저럭 1점 · 썰렁 0점 → 관객 만족도(perf 0~1)
//    group.js 의 doActivity(id, perf) 가 받아서 코인·인기도 ×(0.8~1.4), 대성공 확률 ±15%p, 아주 잘하면 등급 +1 / 아주 못하면 -1 로 반영
// ✏️ 고치는 법: 아래 [설정] 과 CORNERS(코너 목록)
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 설정 ──
  var ROUNDS = 3;                              // 한 번에 하는 코너 수
  var CUT = [60, 40, 20];                      // 점수 ≥60 대폭소 / ≥40 웃음 / ≥20 그럭저럭 / 그 아래 썰렁 (group.js 등급 기준과 같은 눈금)
  var NOISE = 10;                              // 운 요소 (±)
  var ANIMAL_PLUS = 10;                        // 🐾 동물옷 보너스 (예능·매력 코너)
  var STAT = { vocal: ['🎤', '보컬'], dance: ['💃', '댄스'], act: ['🎭', '연기'], fun: ['🎪', '예능'], charm: ['✨', '매력'] };
  var CORNERS = [                              // w: 코너에 필요한 능력치 비율 / animal: 동물옷 보너스가 붙는 코너
    { t: '노래 맞히기 코너', q: '전주만 듣고 제목을 맞혀라!', w: { vocal: 1 } },
    { t: '랜덤 댄스 타임', q: '처음 듣는 노래에 맞춰 즉석 댄스!', w: { dance: 1 } },
    { t: '성대모사 코너', q: '인기 선배의 성대모사에 도전!', w: { act: 1 } },
    { t: '폭탄 토크', q: 'MC의 돌발 질문, 센스 있게 받아쳐라!', w: { fun: 1 }, animal: true },
    { t: '애교 타임', q: '시청자를 녹이는 애교 한 방!', w: { charm: 1 }, animal: true },
    { t: '몸 개그 미션', q: '벌칙 게임! 온몸으로 웃겨라', w: { fun: .6, dance: .4 }, animal: true },
    { t: '상황극 코너', q: '즉석 상황극! 대사를 살려라', w: { act: .6, fun: .4 } },
    { t: '라이브 도전', q: '반주 없이 라이브로 한 소절!', w: { vocal: .7, charm: .3 } },
    { t: '매력 어필 타임', q: '팬들이 뽑은 나의 매력 포인트 소개!', w: { charm: .6, fun: .4 }, animal: true }
  ];
  var REACT = [                                // 점수 3 → 0
    { n: '대폭소!!', c: '#ffd54a', e: '😂😂😂', s: 'grpBig' },
    { n: '빵 터졌어요', c: '#6ee7a0', e: '😆', s: 'coin' },
    { n: '그럭저럭…', c: '#9ec5ff', e: '🙂', s: 'pop' },
    { n: '썰렁…', c: '#fca5a5', e: '🥶', s: 'grpBad' }
  ];
  var ACC = '#ff5d8f', GOLD = '#ffd54a';

  function sfx(n) { try { window.pocaSfx.play(n); } catch (e) {} }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function statOf(cid, k) { try { if (typeof window.getIdolTrainStat === 'function') { var v = window.getIdolTrainStat(cid, k); if (typeof v === 'number') return v; } } catch (e) {} return 10; }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 0.5; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function sdSrc(c) { try { return window.__groupAnimal ? window.__groupAnimal.sdSrc(c, 'variety') : 'group-assets/sd/' + c + '.png'; } catch (e) { return 'group-assets/sd/' + c + '.png'; } }
  function animalOn(c) { try { return !!(window.__groupAnimal && window.__groupAnimal.active(c, 'variety')); } catch (e) { return false; } }
  function weighted(c, w) { var s = 0; for (var k in w) s += w[k] * statOf(c, k); return s; }
  function wLabel(w) { return Object.keys(w).map(function (k) { return STAT[k][0] + STAT[k][1]; }).join(' + '); }

  function play(members, done) {
    members = (members || []).slice(); if (members.length < 2) { done(null); return; }
    var maxUse = Math.ceil(ROUNDS / members.length), used = {}, pts = 0, round = 0, finished = false, timers = [], log = [];
    var corners = shuffle(CORNERS).slice(0, ROUNDS);
    members.forEach(function (c) { used[c] = 0; });

    var ov = document.createElement('div');
    ov.id = 'gv-ov';
    ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;z-index:99997;background:linear-gradient(180deg,#2b1250 0%,#0d0818 80%);color:#fff;display:flex;flex-direction:column;align-items:center;padding:14px;box-sizing:border-box;overflow:auto;-webkit-overflow-scrolling:touch;';
    document.body.appendChild(ov);
    function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
    function close(perf) { if (finished) return; finished = true; timers.forEach(clearTimeout); ov.remove(); done(perf, perf == null ? null : log); }

    function head(sub) {
      return '<div style="width:100%;max-width:420px;display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="font-size:12px;color:#ffd0e0;">🎪 단체 예능 · 토크쇼</div>' +
        '<button id="gv-x" style="background:rgba(255,255,255,.12);border:0;color:#fff;border-radius:10px;padding:6px 12px;font-size:12px;">그만두기</button></div>' +
        '<div style="width:100%;max-width:420px;display:flex;align-items:center;gap:6px;margin:8px 0 2px;font-size:12px;"><span>관객 만족도</span>' +
        '<div style="flex:1;height:10px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden;"><div style="height:100%;width:' + Math.round(pts / (ROUNDS * 3) * 100) + '%;background:linear-gradient(90deg,#ff5d8f,#ffd54a);transition:width .4s;"></div></div></div>' + (sub || '');
    }
    function bindX() { var x = ov.querySelector('#gv-x'); if (x) x.onclick = function () { close(null); }; }

    function corner() {
      var cr = corners[round];
      var cards = members.map(function (c) {
        var left = maxUse - used[c], bonus = cr.animal && animalOn(c), s = Math.round(weighted(c, cr.w) + (bonus ? ANIMAL_PLUS : 0));
        return '<button data-c="' + c + '" ' + (left <= 0 ? 'disabled' : '') + ' style="width:calc(50% - 5px);box-sizing:border-box;border-radius:16px;border:2px solid ' + (left > 0 ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.08)') + ';background:' + (left > 0 ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.04)') + ';color:#fff;padding:8px 4px 10px;opacity:' + (left > 0 ? 1 : .4) + ';touch-action:manipulation;">' +
          '<img src="' + sdSrc(c) + '" alt="" height="92" style="height:92px;width:auto;display:block;margin:0 auto 4px;" onerror="this.onerror=null;this.src=\'group-assets/sd/' + c + '.png\'">' +
          '<div style="font-size:14px;font-weight:900;">' + nameOf(c) + '</div>' +
          '<div style="font-size:12px;color:' + GOLD + ';margin-top:2px;">' + wLabel(cr.w) + ' ' + s + (bonus ? ' <span style="color:#ffb3cb;">🐾+' + ANIMAL_PLUS + '</span>' : '') + '</div>' +
          '<div style="font-size:11px;color:#c9c2e0;margin-top:2px;">' + (left > 0 ? '출연 가능 ' + left + '번' : '쉬는 중') + '</div></button>';
      }).join('');
      ov.innerHTML = head() +
        '<div style="width:100%;max-width:420px;margin:12px 0 8px;padding:14px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);text-align:center;">' +
        '<div style="font-size:12px;color:#c4b5fd;">코너 ' + (round + 1) + '/' + ROUNDS + '</div>' +
        '<div style="font-size:19px;font-weight:900;margin:4px 0;">' + cr.t + '</div>' +
        '<div style="font-size:14px;color:#e8e4f6;line-height:1.5;">🎙️ MC: "' + cr.q + '"</div>' +
        '<div style="font-size:12px;color:' + GOLD + ';margin-top:6px;">필요한 실력 · ' + wLabel(cr.w) + '</div></div>' +
        '<div style="font-size:13px;margin:2px 0 8px;">누구를 내보낼까요? 👇</div>' +
        '<div style="width:100%;max-width:420px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">' + cards + '</div>';
      bindX();
      Array.prototype.forEach.call(ov.querySelectorAll('[data-c]'), function (b) {
        b.onclick = function () { if (b.disabled) return; pick(b.getAttribute('data-c')); };
      });
    }

    function pick(c) {
      var cr = corners[round]; used[c]++;
      var bonus = cr.animal && animalOn(c);
      var score = weighted(c, cr.w) + (bonus ? ANIMAL_PLUS : 0) + gauss() * NOISE;
      var lvl = score >= CUT[0] ? 0 : score >= CUT[1] ? 1 : score >= CUT[2] ? 2 : 3, r = REACT[lvl];
      pts += 3 - lvl; log.push({ c: c, t: cr.t, lvl: lvl });   // 방송 연출(group-stage.js)에서 내 선택을 다시 보여줌
      sfx(r.s);
      ov.innerHTML = head() +
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">' +
        '<img src="' + sdSrc(c) + '" alt="" height="150" style="height:150px;width:auto;margin-bottom:8px;' + (lvl < 2 ? 'animation:none;' : '') + '" onerror="this.onerror=null;this.src=\'group-assets/sd/' + c + '.png\'">' +
        '<div style="font-size:15px;color:#e8e4f6;">' + nameOf(c) + ' — ' + cr.t + '</div>' +
        '<div style="font-size:34px;font-weight:900;color:' + r.c + ';margin:10px 0 4px;">' + r.n + '</div>' +
        '<div style="font-size:30px;">' + r.e + '</div>' +
        '<div style="font-size:13px;color:' + GOLD + ';margin-top:8px;">관객 만족 +' + (3 - lvl) + '</div></div>';
      bindX();
      later(function () { round++; if (round >= ROUNDS) finale(); else corner(); }, 1500);
    }

    function finale() {
      var perf = pts / (ROUNDS * 3), pct = Math.round(perf * 100), g = pct >= 85 ? '대박!' : pct >= 60 ? '좋았어요' : pct >= 35 ? '무난했어요' : '아쉬웠어요';
      var note = perf >= 0.85 ? '코인·인기도 보너스 + 등급 상승!' : perf >= 0.5 ? '코인·인기도 보너스!' : perf > 0.12 ? '조금 아쉬운 방송…' : '방송 분위기가 가라앉았어요';
      ov.innerHTML = head() +
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">' +
        '<div style="font-size:12px;color:#c4b5fd;">촬영 종료</div>' +
        '<div style="font-size:64px;font-weight:900;line-height:1.1;background:linear-gradient(135deg,' + GOLD + ',#ff5d8f);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:8px 0;">' + pct + '%</div>' +
        '<div style="font-size:20px;font-weight:900;">' + g + '</div>' +
        '<div style="font-size:13px;color:#ffd0e0;margin-top:10px;">' + note + '</div></div>' +
        '<button id="gv-ok" style="width:100%;max-width:420px;padding:15px;border:0;border-radius:16px;font-size:17px;font-weight:900;color:#fff;background:linear-gradient(135deg,' + ACC + ',#a855f7);">방송 보러 가기</button>';
      bindX(); sfx(perf >= 0.6 ? 'reward' : 'coin');
      ov.querySelector('#gv-ok').onclick = function () { close(perf); };
      var x = ov.querySelector('#gv-x'); if (x) x.style.display = 'none';
    }

    corner();
  }

  window.__groupVariety = { play: play, CORNERS: CORNERS };
})();
