// ════════════════════════════════════════════════════════════
// 📈 음원차트 — 화면 (music-chart-ui.js)   ※ 순위 계산은 music-chart.js (window.__chart)
// 더보기 > 📈 음원차트
//   TOP100 탭 : 시간대별 실시간 차트 (▲▼ NEW, 콘크리트 1위 왕관)
//   내 곡 탭  : 24시간 순위 그래프 · 점수 내역 · 📣 스밍 총공 · 정산 받기 · 사재기 해명
//   음악방송 탭: 금·토·일 3위 안이면 출전 → 1위 발표 연출 → 앵콜 미니게임
//   올킬 / 사건 / 신곡 소식은 열 때 한 번씩 연출로 보여줌
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var ACC = '#ff5d8f', GOLD = '#FFD700', BG = '#0f1020';
  var tab = 'top';
  function C() { return window.__chart; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function nameOf(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function toast(m) { try { if (typeof showBagToast === 'function') showBagToast(m); } catch (e) {} }
  function sfx(n) { try { if (window.pocaSfx) window.pocaSfx.play(n); } catch (e) {} }
  function whenReady(test, fn) { var t = 0; (function a() { var ok = false; try { ok = test(); } catch (e) {} if (ok) { fn(); return; } if (++t < 200) setTimeout(a, 100); })(); }
  // 아이콘 그림 (없으면 이모지)
  function ico(file, emoji, px) { px = px || 24; return '<img src="' + file + '" alt="" draggable="false" style="width:' + px + 'px;height:' + px + 'px;object-fit:contain;vertical-align:' + (px > 40 ? 'middle' : '-' + Math.round(px * 0.2) + 'px') + ';" onerror="this.outerHTML=\'' + emoji + '\'">'; }
  var BTN = 'border:none;border-radius:12px;font-size:14px;font-weight:900;cursor:pointer;' + FONT;

  function layer(id, inner, z) {
    var old = $(id); if (old) old.remove();
    var ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + (z || 950) + ';background:rgba(6,6,16,.94);display:flex;align-items:center;justify-content:center;padding:18px;' + FONT;
    ov.innerHTML = '<div style="width:100%;max-width:330px;max-height:92vh;overflow-y:auto;text-align:center;">' + inner + '</div>';
    document.body.appendChild(ov);
    return ov;
  }

  // ════════ 큰 연출 팝업 ════════
  function bigPopup(emoji, title, body, btn, cb, color) {
    color = color || GOLD;
    var ov = layer('chart-pop',
      '<div style="font-size:54px;margin-bottom:6px;">' + emoji + '</div>' +
      '<div style="font-size:22px;font-weight:900;color:' + color + ';text-shadow:0 0 22px ' + color + '99;margin-bottom:10px;">' + title + '</div>' +
      '<div style="font-size:13px;color:#e8e8f4;line-height:1.7;margin-bottom:16px;">' + body + '</div>' +
      '<button id="chart-pop-ok" style="' + BTN + 'width:100%;padding:13px;background:linear-gradient(135deg,' + ACC + ',#a855f7);color:#fff;">' + (btn || '확인') + '</button>', 975);
    $('chart-pop-ok').onclick = function () { ov.remove(); if (cb) cb(); };
    return ov;
  }
  function confetti(ov) {
    var em = ['✨', '🎉', '⭐', '🎶', '💖', '👑'];
    for (var i = 0; i < 26; i++) {
      var d = document.createElement('div');
      d.textContent = em[i % em.length];
      d.style.cssText = 'position:absolute;top:-30px;left:' + Math.round(Math.random() * 96) + '%;font-size:' + (14 + Math.round(Math.random() * 16)) + 'px;pointer-events:none;transition:transform ' + (2 + Math.random() * 2).toFixed(1) + 's linear,opacity 2.5s;opacity:1;';
      ov.appendChild(d);
      (function (d) { setTimeout(function () { d.style.transform = 'translateY(' + (window.innerHeight + 60) + 'px) rotate(' + Math.round(Math.random() * 360) + 'deg)'; d.style.opacity = '.2'; }, 30 + Math.random() * 600); })(d);
    }
  }

  // ════════ 소식(큐) 하나씩 보여주기 ════════
  function showNews(done) {
    var s = C().load(), n = s.news.shift();
    if (!n) { C().save(s); if (done) done(); return; }
    C().save(s);
    var next = function () { showNews(done); };
    var song = n.id ? s.songs.filter(function (x) { return x.id === n.id; })[0] : null;
    if (n.type === 'release' && song) bigPopup('🎶', '신곡이 차트에 올랐어요!', '<b style="color:#fff;">' + esc(song.title) + '</b><br>' + esc(nameOf(song.cid)) + ' · ' + esc(C().genreName(song.genre)) + '<br>현재 <b style="color:' + GOLD + ';">' + (song.rank > 100 ? '차트 밖' : song.rank + '위') + '</b>예요.<br><span style="color:#aab;font-size:12px;">📣 스밍 총공으로 순위를 올려봐요!</span>', '좋아요', next);
    else if (n.type === 'allkill' && song) {
      var ov = bigPopup(ico('chart-allkill.png', '👑', 104), 'ALL KILL!', '<b style="color:#fff;font-size:15px;">' + esc(song.title) + '</b><br>' + esc(nameOf(song.cid)) + ' — <b>차트 1위 탈환!</b><br>콘크리트 1위를 밀어냈어요!' + (n.first ? '<br><span style="color:' + GOLD + ';">🎁 첫 1위 기념 소원의 조각 +5</span>' : ''), '올킬!', next);
      sfx('reward'); confetti(ov);
    }
    else if (n.type === 'invest') bigPopup('📊', '기획사 주가 급등!', '차트 1위 소식에 투자 <b>[앨범 제작]</b>의 가치가<br><b style="color:#6ee7a0;">+30%</b> 올랐어요!<br><span style="color:#aab;font-size:12px;">(곡당 최대 3일)</span>', '와!', next, '#6ee7a0');
    else if (n.type === 'event' && n.ev) {
      var ev = n.ev;
      if (ev.type === 'scandal') bigPopup(ico('chart-scandal.png', '🚨', 88), ev.name, esc(ev.text) + '<br><span style="color:#fca5a5;font-size:12px;">내 곡 탭에서 해명하세요! (기한 2일)</span>', '확인', function () { tab = 'mine'; render(); next(); }, '#ff6b6b');
      else bigPopup(ev.type === 'viral' ? '🔥' : ev.type === 'comeback' ? '🎤' : '📣', ev.name, esc(ev.text) + (ev.gain ? '<br><span style="color:#6ee7a0;">팬카페 가입자 +' + fmt(ev.gain) + '명</span>' : ''), '확인', next, ev.type === 'comeback' ? '#a5b4fc' : GOLD);
    }
    else if (n.type === 'scandal-fail') bigPopup('📉', '해명하지 못했어요', nameOf(n.cid) + '의 곡이 사재기 의혹으로<br>순위가 급락했어요 (4일)', '확인', next, '#ff6b6b');
    else if (n.type === 'end' && song) bigPopup('🏁', '차트 아웃', '<b>' + esc(song.title) + '</b>의 차트 활동이 끝났어요.<br>최고 순위 <b style="color:' + GOLD + ';">' + (song.peak > 100 ? '-' : song.peak + '위') + '</b>', '확인', next);
    else next();
  }

  // ════════ 메인 화면 ════════
  var CHART_LV = 20;
  function lvNow() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function openChart() {
    if (lvNow() < CHART_LV) { toast('🔒 음원차트는 플레이어 Lv.' + CHART_LV + '부터 열려요 (지금 Lv.' + lvNow() + ')'); return; }
    var ov = $('chart-overlay'); if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'chart-overlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:940;background:' + BG + ';overflow-y:auto;' + FONT;
    document.body.appendChild(ov);
    render();
    showNews(function () { render(); });
  }
  window.openMusicChart = openChart;

  function render() {
    var ov = $('chart-overlay'); if (!ov) return;
    var s = C().load();
    var tb = function (id, label) { var on = tab === id; return '<button data-tab="' + id + '" style="' + BTN + 'flex:1;padding:10px 4px;font-size:13px;color:#fff;background:' + (on ? 'linear-gradient(135deg,' + ACC + ',#a855f7)' : 'rgba(255,255,255,.08)') + ';">' + label + '</button>'; };
    var showDot = s.show && !s.show.done ? ' 🔴' : '';
    ov.innerHTML = '<div style="position:sticky;top:0;z-index:3;background:' + BG + ';padding:12px 14px 8px;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><div style="font-size:17px;font-weight:900;color:#fff;">' + ico('more-chart.png', '📈', 26) + ' POCA MUSIC <span style="font-size:11px;color:#8b8fa8;font-weight:400;">실시간 차트</span></div>' +
      '<button id="chart-close" style="' + BTN + 'padding:7px 12px;background:rgba(255,255,255,.12);color:#fff;font-size:13px;">닫기</button></div>' +
      '<div style="display:flex;gap:6px;">' + tb('top', 'TOP 100') + tb('mine', '내 곡') + tb('show', '🎤 음악방송' + showDot) + '</div></div>' +
      '<div style="padding:4px 14px 40px;" id="chart-body">' + (tab === 'top' ? topHtml(s) : tab === 'mine' ? mineHtml(s) : showHtml(s)) + '</div>';
    $('chart-close').onclick = function () { ov.remove(); };
    ov.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tab'); render(); }; });
    if (tab === 'mine') bindMine(s);
    if (tab === 'show') bindShow(s);
  }

  // ── TOP100 ──
  function deltaHtml(e) {
    if (e.delta === null) return '<span style="color:#ff5d8f;font-weight:900;font-size:10px;">NEW</span>';
    if (e.delta > 0) return '<span style="color:#ff6b6b;font-size:10px;">▲' + e.delta + '</span>';
    if (e.delta < 0) return '<span style="color:#60a5fa;font-size:10px;">▼' + (-e.delta) + '</span>';
    return '<span style="color:#666;font-size:10px;">–</span>';
  }
  function topHtml(s) {
    var h = C().nowHour(), day = C().gameDay(), list = C().chartAt(h, day, s).slice(0, 100), tr = C().trendGenre(day);
    var rows = list.map(function (e) {
      var mine = e.kind === 'mine';
      return '<div style="display:flex;align-items:center;gap:8px;padding:7px 8px;margin-bottom:3px;border-radius:10px;background:' + (mine ? 'linear-gradient(90deg,rgba(255,93,143,.28),rgba(168,85,247,.18))' : 'rgba(255,255,255,.04)') + ';' + (mine ? 'border:1px solid ' + ACC + ';' : '') + '">' +
        '<div style="width:26px;text-align:center;font-size:' + (e.rank <= 3 ? 17 : 14) + 'px;font-weight:900;color:' + (e.rank === 1 ? GOLD : e.rank <= 3 ? '#fff' : '#9aa0b8') + ';">' + e.rank + '</div>' +
        '<div style="width:30px;text-align:center;">' + deltaHtml(e) + '</div>' +
        '<div style="flex:1;min-width:0;text-align:left;"><div style="font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (e.king ? '👑 ' : '') + (mine ? '<span style="color:' + ACC + ';">★ </span>' : '') + esc(e.title) + '</div>' +
        '<div style="font-size:11px;color:#8b8fa8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(e.artist) + (e.kind === 'guest' ? ' · 기습 컴백' : '') + '</div></div>' +
        (mine ? '<div style="font-size:10px;font-weight:900;color:#fff;background:' + ACC + ';border-radius:8px;padding:2px 6px;">내 곡</div>' : '') + '</div>';
    }).join('');
    var mineOut = s.songs.filter(function (x) { return !x.over && (x.rank || 101) > 100; });
    return '<div style="font-size:11px;color:#8b8fa8;margin:2px 2px 8px;display:flex;justify-content:space-between;"><span>오늘 ' + h + '시 기준</span><span>🔥 이번 주 트렌드 <b style="color:' + GOLD + ';">' + (tr ? esc(tr.name) : '-') + '</b></span></div>' +
      (mineOut.length ? '<div style="font-size:12px;color:#fca5a5;background:rgba(255,100,100,.1);border-radius:10px;padding:8px 10px;margin-bottom:8px;">차트 밖: ' + mineOut.map(function (x) { return esc(x.title); }).join(', ') + ' — 내 곡 탭에서 총공으로 올려봐요</div>' : '') +
      rows;
  }

  // ── 내 곡 ──
  function graphSvg(ranks, h) {
    var W = 290, H = 96, pl = 26, pr = 6, pt = 8, pb = 16;
    var vals = ranks.map(function (r) { return Math.min(r, 100); }), lo = Math.max(1, Math.min.apply(null, vals) - 3), hi = Math.min(100, Math.max.apply(null, vals) + 3);
    if (hi - lo < 8) hi = lo + 8;
    var x = function (i) { return pl + (W - pl - pr) * i / 23; };
    var y = function (r) { return pt + (H - pt - pb) * (Math.min(r, 100) - lo) / (hi - lo); };
    var pts = vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); });
    var bands = [[0, 2, '팬덤 화력'], [22, 23, '']].map(function (b) { return '<rect x="' + x(b[0]).toFixed(1) + '" y="' + pt + '" width="' + (x(b[1]) - x(b[0])).toFixed(1) + '" height="' + (H - pt - pb) + '" fill="rgba(168,85,247,.16)"/>'; }).join('');
    var lbl = [0, 6, 12, 18, 23].map(function (i) { return '<text x="' + x(i).toFixed(1) + '" y="' + (H - 3) + '" fill="#8b8fa8" font-size="9" text-anchor="middle">' + i + '시</text>'; }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="display:block;">' + bands +
      '<text x="2" y="' + (pt + 7) + '" fill="#8b8fa8" font-size="9">' + lo + '위</text><text x="2" y="' + (H - pb) + '" fill="#8b8fa8" font-size="9">' + hi + '위</text>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + ACC + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<circle cx="' + x(h).toFixed(1) + '" cy="' + y(vals[h]).toFixed(1) + '" r="4.5" fill="#fff" stroke="' + ACC + '" stroke-width="2"/>' + lbl + '</svg>';
  }
  var PART_LABELS = [['base', '앨범 기본'], ['note', '작곡 완성도'], ['trend', '트렌드 장르'], ['fans', '팬덤'], ['fame', '인지도'], ['hidden', '히든카드'], ['burst', '신곡 버스트'], ['boost', '스밍 총공'], ['mods', '사건'], ['age', '시간 경과']];
  function mineHtml(s) {
    var day = C().gameDay(), h = C().nowHour(), live = s.songs.filter(function (x) { return !x.over; });
    var out = '';
    if (s.pending > 0) out += '<div style="background:linear-gradient(135deg,rgba(255,215,0,.18),rgba(255,93,143,.14));border:1px solid ' + GOLD + '88;border-radius:14px;padding:11px 12px;margin:6px 0 10px;display:flex;align-items:center;justify-content:space-between;"><div style="text-align:left;font-size:12px;color:#fff;">💰 차트 정산금<br><b style="font-size:16px;color:' + GOLD + ';">🍔 ' + fmt(s.pending) + '</b></div><button id="chart-claim" style="' + BTN + 'padding:10px 16px;background:' + GOLD + ';color:#1a1a2e;">받기</button></div>';
    if (s.ev && s.ev.type === 'scandal' && !s.ev.done) out += '<div style="background:rgba(255,80,80,.14);border:1px solid #ff6b6b99;border-radius:14px;padding:11px 12px;margin:6px 0 10px;text-align:left;"><div style="font-size:13px;font-weight:900;color:#ff9a9a;">🚨 사재기 의혹! (해명 기한 DAY ' + s.ev.expire + ')</div><div style="font-size:12px;color:#ddd;line-height:1.6;margin:4px 0 8px;">' + esc(s.ev.text) + '</div><button id="chart-explain" style="' + BTN + 'width:100%;padding:11px;background:#ef4444;color:#fff;">해명하기</button></div>';
    if (!live.length) return out + '<div style="text-align:center;padding:40px 10px;color:#aab;font-size:13px;line-height:1.8;"><div style="font-size:44px;margin-bottom:8px;">🎼</div>아직 차트에 오른 곡이 없어요.<br><b style="color:#fff;">작곡 테이블</b>에서 <b style="color:' + GOLD + ';">정규 앨범</b>을 만들고<br>아이돌에게 <b style="color:#fff;">타이틀곡</b>으로 주면 차트에 올라가요!<br><button id="chart-compose" style="' + BTN + 'margin-top:14px;padding:12px 18px;background:linear-gradient(135deg,#ffb86b,' + ACC + ');color:#fff;">🎼 작곡 테이블 열기</button></div>';
    live.forEach(function (sg) {
      var ranks = C().hourRanks(sg, day, s), nowR = ranks[h], p = C().parts(sg, day), canS = C().canStream(s, sg.id);
      var tr = C().trendGenre(day), trend = tr && tr.id === sg.genre;
      var dl = sg.prev ? sg.prev - nowR : 0;
      out += '<div style="background:rgba(255,255,255,.06);border:1px solid #ffffff1c;border-radius:16px;padding:12px;margin:8px 0;text-align:left;">' +
        '<div style="display:flex;align-items:center;gap:10px;"><div style="text-align:center;min-width:58px;"><div style="font-size:11px;color:#8b8fa8;">현재</div><div style="font-size:' + (nowR > 99 ? 20 : 28) + 'px;font-weight:900;color:' + (nowR === 1 ? GOLD : '#fff') + ';">' + (nowR > 100 ? '차트밖' : nowR + '위') + '</div>' +
        (nowR <= 100 && dl ? '<div style="font-size:11px;color:' + (dl > 0 ? '#ff6b6b' : '#60a5fa') + ';">' + (dl > 0 ? '▲' : '▼') + Math.abs(dl) + '</div>' : '') + '</div>' +
        '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(sg.title) + '</div>' +
        '<div style="font-size:11px;color:#aab;">' + esc(nameOf(sg.cid)) + ' · ' + esc(C().genreName(sg.genre)) + (trend ? ' <span style="color:' + GOLD + ';font-weight:900;">🔥트렌드</span>' : '') + '</div>' +
        '<div style="font-size:11px;color:#8b8fa8;">최고 ' + (sg.peak > 100 ? '-' : sg.peak + '위') + ' · 활동 D+' + (day - sg.rel) + '/' + C().CFG.SONG_LIFE + ' · 1위 ' + (sg.ones || 0) + '일</div></div></div>' +
        '<div style="margin:8px 0 2px;font-size:11px;color:#8b8fa8;">24시간 순위 (밤 22~01시 팬덤 화력↑ · 낮 13~17시 대중성 싸움↓)</div>' +
        graphSvg(ranks, h) +
        '<details style="margin-top:6px;"><summary style="font-size:12px;color:#c4b5fd;cursor:pointer;">점수 내역 · 합계 ' + p.total.toFixed(1) + '</summary><div style="margin-top:6px;">' +
        PART_LABELS.map(function (l) { var v = p[l[0]]; if (!v && l[0] !== 'base') return ''; return '<div style="display:flex;justify-content:space-between;font-size:12px;color:' + (v < 0 ? '#fca5a5' : '#ddd') + ';padding:2px 0;"><span>' + l[1] + '</span><b>' + (v > 0 && l[0] !== 'base' ? '+' : '') + v.toFixed(1) + '</b></div>'; }).join('') +
        '<div style="font-size:11px;color:#8b8fa8;margin-top:4px;line-height:1.5;">팬 ' + fmt(C().members(sg.cid)) + '명 · 히든카드를 강화하고 팬을 늘릴수록 올라가요. 1위 라이벌은 약 99점이에요.</div></div></details>' +
        '<button data-stream="' + sg.id + '" style="' + BTN + 'width:100%;margin-top:10px;padding:13px;background:' + (canS ? 'linear-gradient(135deg,' + ACC + ',#a855f7)' : 'rgba(255,255,255,.1)') + ';color:' + (canS ? '#fff' : '#8b8fa8') + ';">' + (canS ? ico('chart-stream.png', '📣', 22) + ' 스밍 총공 시작 (⚡' + C().STREAM_STAMINA + ')' : '✅ 오늘 총공 완료') + '</button></div>';
    });
    return out;
  }
  function bindMine(s) {
    var b;
    if ((b = $('chart-claim'))) b.onclick = function () { var n = C().claimPending(); sfx('coin'); toast('💰 차트 정산금 🍔 +' + fmt(n)); render(); };
    if ((b = $('chart-compose'))) b.onclick = function () { $('chart-overlay').remove(); if (typeof window.openComposeTable === 'function') window.openComposeTable(); };
    if ((b = $('chart-explain'))) b.onclick = function () { explainFlow(); };
    document.querySelectorAll('[data-stream]').forEach(function (el) { el.onclick = function () { startStream(el.getAttribute('data-stream')); }; });
  }

  // ── 사재기 해명 ──
  function explainFlow() {
    var ov = layer('chart-explain-pop',
      '<div>' + ico('chart-scandal.png', '🚨', 72) + '</div><div style="font-size:19px;font-weight:900;color:#ff9a9a;margin-bottom:10px;">어떻게 대응할까요?</div>' +
      '<button id="ex-quiz" style="' + BTN + 'width:100%;padding:14px;margin-bottom:8px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;">📝 해명문 작성하기<br><span style="font-size:11px;font-weight:400;">알맞은 문장을 고르면 의혹이 사라져요</span></button>' +
      '<button id="ex-fan" style="' + BTN + 'width:100%;padding:14px;margin-bottom:8px;background:linear-gradient(135deg,' + ACC + ',#a855f7);color:#fff;">💪 팬덤 반박 총공 (⚡' + C().STREAM_STAMINA + ')<br><span style="font-size:11px;font-weight:400;">타격을 절반으로 줄여요</span></button>' +
      '<button id="ex-back" style="' + BTN + 'width:100%;padding:11px;background:rgba(255,255,255,.1);color:#aaa;">나중에</button>', 970);
    $('ex-back').onclick = function () { ov.remove(); };
    $('ex-fan').onclick = function () {
      if (!C().spendStreamStamina()) { toast('스태미나가 부족해요! ⚡'); return; }
      C().resolveScandal('half'); ov.remove(); bigPopup('💪', '팬덤이 반박했어요', '타격이 절반으로 줄었어요.', '확인', render, '#a5b4fc');
    };
    $('ex-quiz').onclick = function () {
      var opts = [
        { t: '“근거 자료를 공개하고, 사실이 아닌 부분은 법적으로 대응하겠습니다.”', ok: true },
        { t: '“우린 몰라요. 그쪽이 먼저 이상한 소문 퍼뜨렸잖아요!”', ok: false },
        { t: '“…대응하지 않겠습니다. 시간이 해결해 줄 거예요.”', ok: false }
      ].sort(function () { return Math.random() - 0.5; });
      ov.querySelector('div').innerHTML = '<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:10px;">📝 해명문 한 줄을 골라요</div>' +
        opts.map(function (o, i) { return '<button data-o="' + i + '" style="' + BTN + 'width:100%;padding:13px;margin-bottom:8px;text-align:left;font-weight:700;font-size:13px;line-height:1.5;background:rgba(255,255,255,.1);color:#fff;">' + o.t + '</button>'; }).join('');
      ov.querySelectorAll('[data-o]').forEach(function (b) {
        b.onclick = function () {
          var ok = opts[Number(b.getAttribute('data-o'))].ok;
          C().resolveScandal(ok ? 'clear' : 'fail'); ov.remove();
          if (ok) bigPopup('✅', '해명 성공!', '의혹이 사라지고 팬들이 응원해요!<br>(3일 동안 소폭 상승)', '확인', function () { render(); }, '#6ee7a0');
          else bigPopup('📉', '역효과였어요…', '해명이 오히려 논란이 됐어요.<br>순위가 급락해요 (4일)', '확인', function () { render(); }, '#ff6b6b');
        };
      });
    };
  }

  // ════════ 총공 미니게임 ════════
  function startStream(sid) {
    var s = C().load();
    if (!C().canStream(s, sid)) { toast('오늘은 이미 총공했어요'); return; }
    if (!C().spendStreamStamina()) { toast('스태미나가 부족해요! ⚡ 음료를 마셔봐요'); return; }
    var sg = s.songs.filter(function (x) { return x.id === sid; })[0];
    var T = 10, taps = 0, score = 0, fever = 0, feverLeft = 0, left = T, running = true;
    var ov = layer('chart-stream',
      '<div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:2px;">' + ico('chart-stream.png', '📣', 22) + ' 스밍 총공!</div><div style="font-size:12px;color:#aab;margin-bottom:8px;">' + esc(sg.title) + ' — 10초 동안 연타!</div>' +
      '<div id="st-time" style="font-size:34px;font-weight:900;color:' + GOLD + ';">10.0</div>' +
      '<div style="height:12px;border-radius:6px;background:rgba(255,255,255,.12);overflow:hidden;margin:6px 0 4px;"><div id="st-fever" style="height:100%;width:0%;background:linear-gradient(90deg,#60a5fa,#f472b6);"></div></div>' +
      '<div id="st-msg" style="font-size:11px;color:#c4b5fd;height:15px;margin-bottom:8px;">팬덤 피버 게이지를 채우면 3초 동안 ×2!</div>' +
      '<button id="st-btn" style="width:210px;height:210px;border-radius:50%;border:6px solid #fff3;background:radial-gradient(circle at 35% 30%,#ff8fb4,' + ACC + ' 55%,#a855f7);color:#fff;font-size:30px;font-weight:900;cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none;box-shadow:0 0 40px ' + ACC + '88;' + FONT + '">스밍!<br><span id="st-score" style="font-size:20px;">0</span></button>', 972);
    var btn = $('st-btn'), t0 = Date.now();
    function tap(e) {
      if (!running) return; if (e && e.preventDefault) e.preventDefault();
      taps++; var add = feverLeft > 0 ? 2 : 1; score += add;
      if (feverLeft <= 0) { fever = Math.min(100, fever + 4); if (fever >= 100) { feverLeft = 3000; fever = 100; $('st-msg').textContent = '🔥 피버 타임! 점수 ×2'; btn.style.boxShadow = '0 0 60px #fbbf24'; } }
      $('st-score').textContent = score; $('st-fever').style.width = fever + '%';
      btn.style.transform = 'scale(.94)'; setTimeout(function () { btn.style.transform = ''; }, 60);
    }
    btn.addEventListener('touchstart', tap, { passive: false }); btn.addEventListener('mousedown', function (e) { if (!('ontouchstart' in window)) tap(e); });
    var iv = setInterval(function () {
      var el = Date.now() - t0; left = Math.max(0, T - el / 1000);
      $('st-time').textContent = left.toFixed(1);
      if (left <= 0) { clearInterval(iv); clearInterval(fv); running = false; finish(); }
    }, 80);
    var fv = setInterval(function () {   // 피버 남은 시간 줄이기
      if (feverLeft > 0) { feverLeft -= 100; fever = Math.max(0, feverLeft / 30); if (feverLeft <= 0) { feverLeft = 0; fever = 0; $('st-msg').textContent = '팬덤 피버 게이지를 채우면 3초 동안 ×2!'; btn.style.boxShadow = ''; } if ($('st-fever')) $('st-fever').style.width = fever + '%'; }
    }, 100);
    function finish() {
      var power = Math.min(1, score / 70), r = C().applyStream(sid, power);
      ov.remove();
      if (!r) { toast('총공 결과를 저장하지 못했어요'); render(); return; }
      var grade = power >= 0.9 ? '대성공!' : power >= 0.5 ? '성공!' : '아쉬워요';
      bigPopup(ico('chart-stream.png', '📣', 80), '총공 ' + grade, '스밍 점수 <b style="color:#fff;">' + score + '</b> (' + taps + '번 터치)<br>차트 점수 <b style="color:' + GOLD + ';">+' + r.gain + '</b><br>순위 ' + (r.before > 100 ? '차트밖' : r.before + '위') + ' → <b style="color:' + GOLD + ';">' + (r.after > 100 ? '차트밖' : r.after + '위') + '</b><br><span style="color:#aab;font-size:11px;">(총공 점수는 하루마다 절반으로 식어요)</span>', '확인', render);
      sfx('reward');
    }
  }

  // ── 음악방송 ──
  function nextShowDay(day) { for (var d = day; d < day + 8; d++) if (C().CFG.SHOW_DAYS.indexOf(d % 7) !== -1 && d >= day) return d; return day; }
  function showHtml(s) {
    var day = C().gameDay(), ST = s.stats, out = '';
    out += '<div style="display:flex;gap:8px;margin:8px 0;"><div style="flex:1;background:rgba(255,255,255,.06);border-radius:12px;padding:10px;"><div style="font-size:11px;color:#8b8fa8;">🏆 1위 트로피</div><div style="font-size:22px;font-weight:900;color:' + GOLD + ';">' + (ST.trophies || 0) + '</div></div>' +
      '<div style="flex:1;background:rgba(255,255,255,.06);border-radius:12px;padding:10px;"><div style="font-size:11px;color:#8b8fa8;">🎤 출전</div><div style="font-size:22px;font-weight:900;color:#fff;">' + (ST.shows || 0) + '</div></div>' +
      '<div style="flex:1;background:rgba(255,255,255,.06);border-radius:12px;padding:10px;"><div style="font-size:11px;color:#8b8fa8;">👑 차트 1위</div><div style="font-size:22px;font-weight:900;color:#fff;">' + (ST.ones || 0) + '일</div></div></div>';
    if (s.stage && s.stage.length) {
      out += '<div style="background:linear-gradient(135deg,rgba(255,93,143,.2),rgba(168,85,247,.16));border:1px solid ' + ACC + '88;border-radius:16px;padding:12px;margin:8px 0;text-align:left;"><div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:6px;">🎙️ 음방 활동 무대가 기다려요 (' + s.stage.length + ')</div>' +
        s.stage.map(function (x) { return '<button data-stage="' + x.cid + '" data-q="' + x.q + '" style="' + BTN + 'width:100%;margin-top:5px;padding:11px;background:linear-gradient(135deg,' + ACC + ',#a855f7);color:#fff;">' + esc(nameOf(x.cid)) + ' · 무대 미니게임 시작</button>'; }).join('') + '</div>';
    }
    if (s.show && !s.show.done) {
      var sg = s.songs.filter(function (x) { return x.id === s.show.sid; })[0];
      out += '<div style="background:linear-gradient(135deg,rgba(255,93,143,.22),rgba(168,85,247,.2));border:1px solid ' + ACC + ';border-radius:16px;padding:14px;margin:8px 0;"><div>' + ico('chart-show.png', '🎤', 64) + '</div><div style="font-size:16px;font-weight:900;color:#fff;margin:4px 0;">오늘 음악방송 1위 후보!</div><div style="font-size:12px;color:#ddd;margin-bottom:10px;">' + (sg ? esc(sg.title) + ' · ' + esc(nameOf(sg.cid)) + ' (차트 ' + sg.rank + '위)' : '') + '</div><button id="show-go" style="' + BTN + 'width:100%;padding:14px;background:linear-gradient(135deg,' + ACC + ',#a855f7);color:#fff;font-size:15px;">🎙️ 무대 올라가기</button></div>';
    } else if (s.show && s.show.done) {
      var rs = s.show.res;
      out += '<div style="background:rgba(255,255,255,.06);border-radius:14px;padding:12px;margin:8px 0;font-size:13px;color:#ddd;line-height:1.7;">오늘 음악방송은 끝났어요.<br>' + (rs ? (rs.win ? '<b style="color:' + GOLD + ';">🏆 1위!</b>' : '<b style="color:#aab;">아쉽게 2위</b>') : '') + '</div>';
    } else {
      out += '<div style="background:rgba(255,255,255,.06);border-radius:14px;padding:12px;margin:8px 0;font-size:13px;color:#ddd;line-height:1.7;">오늘은 음악방송이 없어요.<br>다음 음악방송: <b style="color:#fff;">DAY ' + nextShowDay(day + 1) + '</b></div>';
    }
    out += '<div style="font-size:12px;color:#8b8fa8;line-height:1.7;background:rgba(255,255,255,.04);border-radius:12px;padding:10px 12px;text-align:left;">• 📺 <b>음악방송 활동</b>은 기획사 일정표(식사·일정)에서 드라마처럼 날짜를 잡아요. 활동 날 무대 미니게임을 하면 차트 점수가 올라가요<br>• 음악방송은 <b>금·토·일</b>(게임 DAY%7 = 5·6·0)에 열려요<br>• 차트 <b>3위 안</b>이어야 출전할 수 있어요<br>• 1위 후보 두 팀이 점수 대결! 이기면 <b>코인 ' + fmt(C().CFG.WIN_PAY) + ' + 소원의 조각 ' + C().CFG.SHOW_WISH + '</b><br>• 1위를 하면 <b>앵콜 무대</b> 미니게임! 3번 다 성공하면 <b>🏆 1위 기념 포토카드</b></div>';
    return out;
  }
  function bindShow(s) { var b = $('show-go'); if (b) b.onclick = startShow; document.querySelectorAll('[data-stage]').forEach(function (el) { el.onclick = function () { if (window.openMusicStage) window.openMusicStage(el.getAttribute('data-stage'), el.getAttribute('data-q')); else toast('무대를 불러오지 못했어요'); }; }); }

  function startShow() {
    var res = C().runShow(); if (!res) { toast('지금은 출전할 수 없어요'); return; }
    var ov = layer('chart-show',
      '<div style="font-size:12px;color:#aab;margin-bottom:6px;">🎙️ 이번 주 1위 발표</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
      '<div id="sh-a" style="flex:1;border-radius:14px;padding:12px 8px;background:rgba(255,93,143,.16);border:2px solid ' + ACC + ';"><div style="font-size:11px;color:#ffb3cb;">' + esc(nameOf(res.cid)) + '</div><div style="font-size:13px;font-weight:900;color:#fff;margin:4px 0;">' + esc(res.title) + '</div><div id="sh-sa" style="font-size:26px;font-weight:900;color:#fff;">0</div></div>' +
      '<div id="sh-b" style="flex:1;border-radius:14px;padding:12px 8px;background:rgba(96,165,250,.12);border:2px solid #60a5fa66;"><div style="font-size:11px;color:#9ec5ff;">라이벌</div><div style="font-size:12px;font-weight:900;color:#fff;margin:4px 0;word-break:keep-all;">' + esc(res.rival) + '</div><div id="sh-sb" style="font-size:26px;font-weight:900;color:#fff;">0</div></div></div>' +
      '<div id="sh-msg" style="font-size:13px;color:#c4b5fd;height:20px;">점수 집계 중…</div>', 972);
    var step = 0, N = 36;
    var iv = setInterval(function () {
      step++; var k = step / N, e = 1 - Math.pow(1 - k, 2);
      $('sh-sa').textContent = fmt(Math.round(res.mine * e)); $('sh-sb').textContent = fmt(Math.round(res.theirs * e));
      if (step >= N) {
        clearInterval(iv);
        var win = res.win, a = $('sh-a'), b = $('sh-b');
        (win ? a : b).style.boxShadow = '0 0 34px ' + (win ? GOLD : '#60a5fa'); (win ? a : b).style.borderColor = win ? GOLD : '#60a5fa';
        $('sh-msg').innerHTML = win ? '<b style="color:' + GOLD + ';font-size:16px;">🏆 1위는… ' + esc(nameOf(res.cid)) + '!</b>' : '<b style="color:#9ec5ff;">아쉽게 2위예요</b>';
        if (win) { sfx('reward'); confetti(ov); }
        setTimeout(function () {
          ov.remove();
          if (win) bigPopup(ico('chart-trophy.png', '🏆', 96), '음악방송 1위!', '코인 <b style="color:' + GOLD + ';">+' + fmt(C().CFG.WIN_PAY) + '</b> · 소원의 조각 +' + C().CFG.SHOW_WISH + '<br>앵콜 무대가 열려요!', '앵콜 무대로!', encore);
          else bigPopup('🎤', '다음엔 꼭!', '총공으로 점수를 올려서<br>다시 도전해요.', '확인', render, '#9ec5ff');
        }, 2300);
      }
    }, 70);
  }

  // ── 앵콜 미니게임: 움직이는 마커가 초록 구간에 있을 때 터치, 3번 ──
  function encore() {
    var round = 0, hits = 0, pos = 0, dir = 1, speed = 2.2, zone = [38, 62], waiting = true;
    var ov = layer('chart-encore',
      '<div style="font-size:16px;font-weight:900;color:' + GOLD + ';margin-bottom:2px;">🎶 앵콜 라이브!</div><div style="font-size:12px;color:#aab;margin-bottom:12px;">초록 구간에서 터치해서 팬서비스 제스처를 해요 (3번)</div>' +
      '<div id="en-round" style="font-size:13px;color:#fff;margin-bottom:8px;">1/3</div>' +
      '<div style="position:relative;height:30px;border-radius:15px;background:rgba(255,255,255,.12);overflow:hidden;margin-bottom:14px;"><div id="en-zone" style="position:absolute;top:0;bottom:0;background:rgba(74,222,128,.55);"></div><div id="en-mark" style="position:absolute;top:2px;width:10px;height:26px;border-radius:5px;background:#fff;"></div></div>' +
      '<div id="en-res" style="height:22px;font-size:14px;font-weight:900;margin-bottom:8px;"></div>' +
      '<button id="en-btn" style="' + BTN + 'width:100%;padding:18px;font-size:18px;background:linear-gradient(135deg,' + ACC + ',#a855f7);color:#fff;touch-action:manipulation;">💖 팬서비스!</button>', 972);
    function setZone() { var w = Math.max(12, 26 - round * 4), c = 20 + Math.random() * 60; zone = [c - w / 2, c + w / 2]; var z = $('en-zone'); if (z) { z.style.left = zone[0] + '%'; z.style.width = (zone[1] - zone[0]) + '%'; } }
    setZone();
    var iv = setInterval(function () {
      pos += dir * (speed + round * 0.7); if (pos >= 98) { pos = 98; dir = -1; } if (pos <= 0) { pos = 0; dir = 1; }
      var m = $('en-mark'); if (m) m.style.left = pos + '%'; else clearInterval(iv);
    }, 16);
    $('en-btn').onclick = function () {
      if (!waiting) return; waiting = false;
      var ok = pos >= zone[0] - 2 && pos <= zone[1] + 2; if (ok) hits++;
      $('en-res').innerHTML = ok ? '<span style="color:#6ee7a0;">✨ 대성공!</span>' : '<span style="color:#fca5a5;">아깝다!</span>';
      round++;
      setTimeout(function () {
        if (round >= 3) {
          clearInterval(iv); ov.remove();
          var r = C().encoreReward(hits);
          if (r) bigPopup(hits >= 3 ? ico('chart-trophy.png', '🏆', 96) : '🎶', hits >= 3 ? '앵콜 대성공!' : '앵콜 무대 끝!', '성공 ' + hits + '/3' + (r.coins ? '<br>앵콜 보너스 코인 <b style="color:' + GOLD + ';">+' + fmt(r.coins) + '</b>' : '') + (r.card ? '<br><b style="color:' + GOLD + ';">🏆 1위 기념 트로피 포토카드</b>를 받았어요!' : ''), '확인', render);
          else render();
        } else { waiting = true; $('en-round').textContent = (round + 1) + '/3'; $('en-res').innerHTML = ''; setZone(); }
      }, 650);
    };
  }

  // ════════ 더보기 메뉴에 연결 ════════
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu;
    try { if (typeof MORE_ICON_FILES === 'object') MORE_ICON_FILES['📈'] = 'chart'; } catch (e) {}   // more-chart.png (없으면 이모지)
    window.openMoreMenu = function () {
      var res = orig.apply(this, arguments);
      var grid = $('more-menu-grid');
      if (grid && !$('more-chart-tile')) {
        grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('📈', lvNow() < CHART_LV ? '음원차트 🔒Lv.' + CHART_LV : '음원차트', ACC, 'openMusicChart()'));
        if (grid.lastElementChild) grid.lastElementChild.id = 'more-chart-tile';
      }
      return res;
    };
  });

  window.__chartUi = { refresh: render, open: openChart, startStream: startStream, startShow: startShow, encore: encore, explainFlow: explainFlow, showNews: showNews };
})();

// ── 중앙광장에 📺 음원차트·음악방송 버튼 붙이기 ──
(function hookSquareChart() {
  var anchor = document.getElementById('btn-fanclub-square');
  if (!anchor || typeof PLACE_BUTTONS === 'undefined' || typeof ALL_PLACE_BTNS === 'undefined') { setTimeout(hookSquareChart, 80); return; }
  if (document.getElementById('btn-chart-square')) return;
  var b = document.createElement('button');
  b.id = 'btn-chart-square';
  b.textContent = '📈 음원차트 · 음악방송';
  b.style.cssText = "display:none;width:100%;padding:14px;margin-top:10px;background:rgba(96,165,250,0.2);border:1.5px solid #60a5fa;border-radius:12px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:'Noto Sans KR',sans-serif;";
  b.onclick = function () { try { if (typeof closePlace === 'function') closePlace(); } catch (e) {} if (window.__chartUi) window.__chartUi.open(); };
  anchor.insertAdjacentElement('afterend', b);
  if (PLACE_BUTTONS.square.indexOf('btn-chart-square') === -1) PLACE_BUTTONS.square.push('btn-chart-square');
  if (ALL_PLACE_BTNS.indexOf('btn-chart-square') === -1) ALL_PLACE_BTNS.push('btn-chart-square');
})();
