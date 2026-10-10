// ════════════════════════════════
// 👥 그룹 (group.js) — 1단계
// 데뷔한 아이돌 2~4명을 자유롭게 묶어 "내 그룹"을 만든다. (그룹은 1개, 한 아이돌은 한 그룹에만. 개인 활동은 그대로 병행)
//  · 더보기 → [그룹] : 그룹 만들기 / 멤버·이름 바꾸기 / 해체
//  · 🎤 합동 무대: 하루 N번. 코인 보상 = 기본 × 멤버 수 보너스 × 멤버들의 평균 인연 보너스 × 그룹 레벨 보너스 (가끔 대성공)
//  · 무대를 할 때마다 그룹 인기도가 쌓이고, 인기도에 따라 그룹 레벨(신인 → 월드 스타)이 오른다.
// 저장: localStorage 'ph_group' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 됨.
// ════════════════════════════════
(function () {
  'use strict';

  // ── [설정] ──
  var KEY = 'ph_group';
  var MIN_MEMBERS = 2, MAX_MEMBERS = 4;
  var NAME_MAX = 10;
  var STAGE_PER_DAY = 2;               // 하루에 할 수 있는 합동 무대 횟수
  var BASE_COIN = 300000;              // 합동 무대 기본 코인
  var MEMBER_BONUS = 0.35;             // 멤버 1명 늘 때마다 +35%
  var BOND_BONUS = 0.5;                // 평균 인연(1~20) 만점이면 +50%
  var LEVEL_BONUS = 0.05;              // 그룹 레벨 1당 +5%
  var BIG_CHANCE = 0.2, BIG_MULT = 1.5; // 대성공 확률 / 배율
  var FAME_BASE = 10, FAME_PER_MEMBER = 3;   // 무대 1번 인기도 = 10 + 멤버수×3 (대성공이면 ×1.5)
  var LEVELS = [                       // [필요 인기도, 이름]
    [0, '신인 그룹'], [80, '라이징 그룹'], [240, '인기 그룹'], [560, '대세 그룹'], [1100, '국민 그룹'], [2000, '월드 스타']
  ];
  var ACC = '#7cc4ff';
  var Z = 976;
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var IDS = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString(); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function name(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function emoji(cid) { try { return CHARS[cid].emoji; } catch (e) { return '⭐'; } }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ── 저장 ──
  function load() {
    var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!s || typeof s !== 'object') s = {};
    if (!s.fame || typeof s.fame !== 'number') s.fame = 0;
    if (!s.total) s.total = 0;
    if (!Array.isArray(s.log)) s.log = [];
    if (s.day !== today()) { s.day = today(); s.today = 0; }
    if (typeof s.today !== 'number') s.today = 0;
    if (s.group && (!Array.isArray(s.group.members) || !s.group.name)) s.group = null;
    return s;
  }
  function save(s) { if (s.log.length > 20) s.log.length = 20; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  // ── 게임 연결 ──
  function debutedIds() {
    var a = null; try { a = JSON.parse(localStorage.getItem('ph_agency') || 'null'); } catch (e) {}
    return IDS.filter(function (cid) { try { return !!(a && ((a.done && a.done[cid]) || (a.debut && a.debut[cid])) && CHARS[cid]); } catch (e) { return false; } });
  }
  function bond(cid) { try { return getAffectionGateLevel(cid) || 1; } catch (e) { return 1; } }
  function levelOf(fame) { var lv = 0; for (var i = 0; i < LEVELS.length; i++) if (fame >= LEVELS[i][0]) lv = i; return lv; }
  function addCoins(n) {
    try { coins = Math.max(0, coins + n); if (typeof saveAll === 'function') saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {}
  }

  // ── 보상 계산 (순수 함수) ──
  function reward(members, fame, big) {
    var n = members.length, avg = members.reduce(function (a, c) { return a + bond(c); }, 0) / n;
    var lv = levelOf(fame);
    var mult = (1 + MEMBER_BONUS * (n - 1)) * (1 + BOND_BONUS * (avg / 20)) * (1 + LEVEL_BONUS * lv);
    var coin = Math.floor(BASE_COIN * mult * (big ? BIG_MULT : 1));
    var gain = Math.floor((FAME_BASE + FAME_PER_MEMBER * n) * (big ? BIG_MULT : 1));
    return { coin: coin, fame: gain, avg: avg, mult: mult };
  }

  // ── 합동 무대 ──
  var LINES = {
    normal: ['{m}의 하모니가 객석을 가득 채웠어요.', '{g}의 이름이 현수막에 걸렸어요!', '무대 위 {m}, 호흡이 척척 맞았어요.', '팬들이 한목소리로 "{g}!"를 외쳤어요.', '리허설보다 훨씬 좋은 무대였어요.'],
    big: ['{m}이(가) 완벽한 합을 보여줬어요! 앙코르가 쏟아졌어요 🎉', '{g}의 무대에 객석이 들썩! 오늘의 레전드 무대예요 ✨', '마지막 소절에서 모두가 눈물이… 대성공이에요!']
  };
  function names(list) { return list.map(name).join(', '); }
  function doStage() {
    var s = load(); if (!s.group) return null;
    if (s.today >= STAGE_PER_DAY) return { err: '오늘은 합동 무대를 다 했어요 (하루 ' + STAGE_PER_DAY + '번). 내일 또 해요!' };
    var live = s.group.members.filter(function (c) { return debutedIds().indexOf(c) !== -1; });
    if (live.length < MIN_MEMBERS) return { err: '데뷔한 멤버가 ' + MIN_MEMBERS + '명 이상이어야 해요. 멤버를 바꿔주세요' };
    var big = Math.random() < BIG_CHANCE;
    var r = reward(live, s.fame, big);
    var lv0 = levelOf(s.fame);
    addCoins(r.coin);
    s.fame += r.fame; s.total += 1; s.today += 1;
    var lv1 = levelOf(s.fame);
    var line = pick(big ? LINES.big : LINES.normal).replace(/\{m\}/g, names(live)).replace(/\{g\}/g, s.group.name);
    s.log.unshift({ t: Date.now(), m: (big ? '🌟 대성공! ' : '🎤 ') + '+' + fmt(r.coin) + ' 코인 · 인기도 +' + r.fame });
    save(s);
    return { big: big, coin: r.coin, fame: r.fame, line: line, levelUp: lv1 > lv0 ? LEVELS[lv1][1] : '', members: live, avg: r.avg };
  }

  // ── 화면 ──
  var ui = { edit: false, sel: [], name: '' };

  function closeOv() { var o = document.getElementById('grp-ov'); if (o) o.remove(); }
  function open() {
    var old = document.getElementById('grp-ov'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'grp-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + Z + ';background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:12px;' + FONT;
    ov.onclick = function (e) { if (e.target === ov) closeOv(); };
    document.body.appendChild(ov);
    var s = load(); ui.edit = !s.group; ui.sel = s.group ? s.group.members.slice() : []; ui.name = s.group ? s.group.name : '';
    render();
  }
  function shell(inner) {
    return '<div style="background:#14213d;border:1.5px solid ' + ACC + ';border-radius:18px;width:100%;max-width:380px;max-height:90vh;display:flex;flex-direction:column;color:#fff;">' +
      '<div style="padding:14px 16px 8px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;">👥 내 그룹</div>' +
      '<button id="grp-x" style="margin-left:auto;border:none;border-radius:10px;background:rgba(255,255,255,0.1);color:#fff;padding:6px 12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="padding:0 14px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch;">' + inner + '</div></div>';
  }
  function btn(id, label, bg, extra) {
    return '<button id="' + id + '" style="width:100%;padding:13px;border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;background:' + bg + ';' + FONT + (extra || '') + '">' + label + '</button>';
  }

  function formHtml(s) {
    var ids = debutedIds();
    if (ids.length < MIN_MEMBERS && !s.group) {
      return '<div style="text-align:center;color:#9fb0d0;padding:28px 6px;font-size:13px;line-height:1.8;"><div style="font-size:40px;margin-bottom:6px;">🎤</div>그룹은 데뷔한 아이돌이 ' + MIN_MEMBERS + '명 이상 있어야 만들 수 있어요.<br>지금 데뷔한 아이돌: <b>' + ids.length + '명</b><br><span style="font-size:11.5px;">기획사에서 아이돌을 더 데뷔시켜 봐요!</span></div>';
    }
    var chips = ids.map(function (cid) {
      var on = ui.sel.indexOf(cid) !== -1;
      return '<button data-m="' + cid + '" style="padding:9px 12px;border-radius:12px;font-size:13px;font-weight:900;cursor:pointer;color:#fff;' + FONT + 'border:1.5px solid ' + (on ? ACC : 'rgba(255,255,255,0.2)') + ';background:' + (on ? 'rgba(124,196,255,0.22)' : 'rgba(255,255,255,0.06)') + ';">' + esc(emoji(cid)) + ' ' + esc(name(cid)) + (on ? ' ✓' : '') + '</button>';
    }).join('');
    var n = ui.sel.length, ok = n >= MIN_MEMBERS && n <= MAX_MEMBERS && String(ui.name).trim().length >= 1;
    return '<div style="font-size:12px;color:#9fb0d0;margin-bottom:6px;">그룹 이름 (최대 ' + NAME_MAX + '글자)</div>' +
      '<input id="grp-name" maxlength="' + NAME_MAX + '" value="' + esc(ui.name) + '" placeholder="예) 포카걸즈" style="width:100%;box-sizing:border-box;padding:11px;border-radius:12px;border:1.5px solid rgba(255,255,255,0.2);background:#fff8ec;color:#3a2a1e;font-size:14px;outline:none;' + FONT + '">' +
      '<div style="font-size:12px;color:#9fb0d0;margin:12px 0 6px;">멤버 고르기 (' + MIN_MEMBERS + '~' + MAX_MEMBERS + '명 · 데뷔한 아이돌만) — <b style="color:' + (n >= MIN_MEMBERS ? '#9fe8b0' : '#ffd76a') + ';">' + n + '/' + MAX_MEMBERS + '</b></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;">' + chips + '</div>' +
      btn('grp-save', s.group ? '✅ 저장하기' : '👥 그룹 만들기', ok ? 'linear-gradient(135deg,#4aa8ff,#7c5cff)' : 'rgba(255,255,255,0.12)', ok ? '' : 'opacity:0.6;') +
      (s.group ? '<button id="grp-cancel" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:12px;color:#c9d6f0;font-size:13px;font-weight:900;cursor:pointer;background:rgba(255,255,255,0.08);' + FONT + '">취소</button>' : '') +
      '<div style="font-size:10.5px;color:#7f90b3;text-align:center;margin-top:10px;line-height:1.6;">그룹은 1개만, 한 아이돌은 한 그룹에만 들어가요.<br>그룹을 만들어도 개인 활동은 그대로 할 수 있어요.</div>';
  }

  function mainHtml(s) {
    var g = s.group, lv = levelOf(s.fame), nextAt = LEVELS[lv + 1] ? LEVELS[lv + 1][0] : null, curAt = LEVELS[lv][0];
    var pct = nextAt ? Math.min(100, Math.floor((s.fame - curAt) / (nextAt - curAt) * 100)) : 100;
    var live = g.members.filter(function (c) { return debutedIds().indexOf(c) !== -1; });
    var r = live.length >= MIN_MEMBERS ? reward(live, s.fame, false) : null;
    var mem = g.members.map(function (cid) {
      return '<div style="text-align:center;flex:1;min-width:0;"><div style="font-size:30px;">' + esc(emoji(cid)) + '</div><div style="font-size:11.5px;font-weight:900;margin-top:2px;">' + esc(name(cid)) + '</div><div style="font-size:10px;color:#9fb0d0;">인연 Lv.' + bond(cid) + '</div></div>';
    }).join('');
    var left = Math.max(0, STAGE_PER_DAY - s.today);
    var logs = s.log.slice(0, 5).map(function (l) { return '<div style="padding:6px 0;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:#dbe6ff;">' + esc(l.m) + '</div>'; }).join('');
    return '<div style="background:linear-gradient(135deg,rgba(74,168,255,0.18),rgba(124,92,255,0.18));border:1.5px solid rgba(124,196,255,0.5);border-radius:16px;padding:14px;margin-bottom:12px;">' +
      '<div style="text-align:center;font-size:19px;font-weight:900;">' + esc(g.name) + '</div>' +
      '<div style="text-align:center;font-size:11.5px;color:#ffe08a;margin:3px 0 10px;">⭐ ' + esc(LEVELS[lv][1]) + ' (Lv.' + (lv + 1) + ')</div>' +
      '<div style="display:flex;gap:6px;margin-bottom:12px;">' + mem + '</div>' +
      '<div style="height:8px;border-radius:6px;background:rgba(255,255,255,0.12);overflow:hidden;"><div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#4aa8ff,#c084fc);"></div></div>' +
      '<div style="font-size:10.5px;color:#9fb0d0;margin-top:4px;text-align:center;">인기도 ' + fmt(s.fame) + (nextAt ? ' / ' + fmt(nextAt) + ' (다음: ' + esc(LEVELS[lv + 1][1]) + ')' : ' (최고 레벨!)') + '</div></div>' +
      '<div style="font-size:12px;color:#c9d6f0;margin-bottom:8px;text-align:center;">오늘 합동 무대 <b style="color:' + (left ? '#ffe08a' : '#ff8a8a') + ';">' + s.today + '/' + STAGE_PER_DAY + '</b>' + (r ? ' · 한 번에 약 <b>' + fmt(r.coin) + '</b> 코인' : '') + '</div>' +
      btn('grp-stage', '🎤 합동 무대 서기', left && r ? 'linear-gradient(135deg,#ff6b9d,#c084fc)' : 'rgba(255,255,255,0.12)', left && r ? '' : 'opacity:0.6;') +
      '<div style="display:flex;gap:8px;margin-top:8px;"><button id="grp-edit" style="flex:1;padding:11px;border:none;border-radius:12px;color:#fff;font-size:12.5px;font-weight:900;cursor:pointer;background:rgba(255,255,255,0.1);' + FONT + '">✏️ 멤버·이름 바꾸기</button>' +
      '<button id="grp-del" style="flex:1;padding:11px;border:none;border-radius:12px;color:#ffb0b0;font-size:12.5px;font-weight:900;cursor:pointer;background:rgba(255,80,80,0.12);' + FONT + '">그룹 해체</button></div>' +
      (logs ? '<div style="margin-top:12px;font-size:11px;color:#9fb0d0;font-weight:900;">최근 활동</div>' + logs : '') +
      '<div style="font-size:10.5px;color:#7f90b3;text-align:center;margin-top:10px;line-height:1.6;">멤버가 많고, 멤버들의 인연 단계가 높고, 그룹 레벨이 높을수록 보상이 커져요.</div>';
  }

  function render() {
    var ov = document.getElementById('grp-ov'); if (!ov) return;
    var s = load();
    ov.innerHTML = shell(ui.edit || !s.group ? formHtml(s) : mainHtml(s));
    bind(ov, s);
  }

  function popup(res) {
    var ov = document.getElementById('grp-ov'); if (!ov) return;
    var m = res.members.map(function (c) { return esc(emoji(c)); }).join(' ');
    var p = document.createElement('div');
    p.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:18px;z-index:2;';
    p.innerHTML = '<div style="background:#1b2a52;border:2px solid ' + (res.big ? '#ffd76a' : ACC) + ';border-radius:18px;padding:20px 18px;max-width:320px;width:100%;text-align:center;color:#fff;' + FONT + '">' +
      '<div style="font-size:34px;margin-bottom:4px;">' + m + '</div>' +
      '<div style="font-size:16px;font-weight:900;color:' + (res.big ? '#ffd76a' : '#fff') + ';">' + (res.big ? '🌟 대성공 무대!' : '🎤 무대 끝!') + '</div>' +
      '<div style="font-size:12.5px;color:#dbe6ff;line-height:1.7;margin:8px 0 10px;">' + esc(res.line) + '</div>' +
      '<div style="font-size:15px;font-weight:900;color:#ffe08a;">+' + fmt(res.coin) + ' 코인</div>' +
      '<div style="font-size:12px;color:#9fd8ff;margin-top:2px;">그룹 인기도 +' + res.fame + '</div>' +
      (res.levelUp ? '<div style="margin-top:10px;font-size:13px;font-weight:900;color:#ff9ecb;">🎊 그룹 레벨 업! → ' + esc(res.levelUp) + '</div>' : '') +
      '<button id="grp-pok" style="margin-top:14px;width:100%;padding:12px;border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#4aa8ff,#7c5cff);' + FONT + '">확인</button></div>';
    ov.appendChild(p);
    p.querySelector('#grp-pok').onclick = function () { p.remove(); render(); };
  }
  function toast(m) {
    try {
      var old = document.getElementById('grp-toast'); if (old) old.remove();
      var el = document.createElement('div'); el.id = 'grp-toast';
      el.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:rgba(20,33,61,0.97);border:1.5px solid ' + ACC + ';color:#fff;padding:11px 20px;border-radius:20px;font-size:13px;font-weight:800;z-index:2600;max-width:90vw;text-align:center;line-height:1.5;' + FONT;
      el.textContent = m; document.body.appendChild(el); setTimeout(function () { if (el.parentNode) el.remove(); }, 3200);
    } catch (e) {}
  }

  function bind(ov, s) {
    var x = ov.querySelector('#grp-x'); if (x) x.onclick = closeOv;
    var nm = ov.querySelector('#grp-name'); if (nm) nm.addEventListener('input', function () { ui.name = nm.value; var b = ov.querySelector('#grp-save'); if (b) { var ok = ui.sel.length >= MIN_MEMBERS && ui.sel.length <= MAX_MEMBERS && nm.value.trim().length >= 1; b.style.opacity = ok ? '1' : '0.6'; b.style.background = ok ? 'linear-gradient(135deg,#4aa8ff,#7c5cff)' : 'rgba(255,255,255,0.12)'; } });
    Array.prototype.forEach.call(ov.querySelectorAll('[data-m]'), function (b) {
      b.onclick = function () {
        var cid = b.getAttribute('data-m'), i = ui.sel.indexOf(cid);
        if (nm) ui.name = nm.value;
        if (i !== -1) ui.sel.splice(i, 1);
        else if (ui.sel.length >= MAX_MEMBERS) { toast('멤버는 최대 ' + MAX_MEMBERS + '명까지예요'); return; }
        else ui.sel.push(cid);
        render();
      };
    });
    var sv = ov.querySelector('#grp-save');
    if (sv) sv.onclick = function () {
      var nmv = String(ui.name || '').trim();
      if (ui.sel.length < MIN_MEMBERS) { toast('멤버를 ' + MIN_MEMBERS + '명 이상 골라주세요'); return; }
      if (!nmv) { toast('그룹 이름을 지어주세요'); return; }
      var st = load(); var first = !st.group;
      st.group = { name: Array.from(nmv).slice(0, NAME_MAX).join(''), members: ui.sel.slice(), made: st.group ? st.group.made : Date.now() };
      save(st); ui.edit = false; toast(first ? '👥 그룹 "' + st.group.name + '" 결성!' : '저장했어요'); render();
    };
    var cn = ov.querySelector('#grp-cancel'); if (cn) cn.onclick = function () { ui.edit = false; render(); };
    var ed = ov.querySelector('#grp-edit'); if (ed) ed.onclick = function () { var st = load(); ui.sel = st.group.members.slice(); ui.name = st.group.name; ui.edit = true; render(); };
    var dl = ov.querySelector('#grp-del');
    if (dl) dl.onclick = function () {
      if (dl.getAttribute('data-sure') !== '1') { dl.setAttribute('data-sure', '1'); dl.textContent = '정말 해체? 한 번 더 누르기'; setTimeout(function () { if (dl.parentNode) { dl.setAttribute('data-sure', '0'); dl.textContent = '그룹 해체'; } }, 3500); return; }
      var st = load(); st.group = null; st.fame = 0; st.total = 0; st.log = []; save(st); ui.edit = true; ui.sel = []; ui.name = ''; toast('그룹을 해체했어요'); render();
    };
    var sg = ov.querySelector('#grp-stage');
    if (sg) sg.onclick = function () { var res = doStage(); if (!res) return; if (res.err) { toast(res.err); return; } popup(res); };
  }

  // ── 더보기 메뉴 타일 ──
  function whenReady(cond, fn) { if (cond()) fn(); else setTimeout(function () { whenReady(cond, fn); }, 150); }
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var orig = window.openMoreMenu;
    if (orig.__grpWrapped) return;
    var w = function () {
      var res = orig.apply(this, arguments);
      try {
        var grid = document.getElementById('more-menu-grid');
        if (grid && !document.getElementById('more-group-tile')) {
          grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🧑‍🎤', '그룹', ACC, 'openGroup()'));
          if (grid.lastElementChild) grid.lastElementChild.id = 'more-group-tile';
        }
      } catch (e) {}
      return res;
    };
    w.__grpWrapped = true; window.openMoreMenu = w;
  });

  window.openGroup = open;
  window.__groupTest = { load: load, save: save, reward: reward, doStage: doStage, levelOf: levelOf, debutedIds: debutedIds, CFG: { STAGE_PER_DAY: STAGE_PER_DAY, BASE_COIN: BASE_COIN } };
})();
