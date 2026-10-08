// ════════════════════════════════
// 🚗 로드 매니저 (road-manager.js) — 운전해서 탐험을 대신 다녀오는 "탐험 파견"
// 더보기 > 🚗 로드 매니저. 탐험 맵 하나와 시간(30분 / 1시간 / 2시간)을 고르고 스태미나를 내면, 앱을 꺼도 실제 시간이 흘러서
// 시간이 되면 재료 + 경험치를 받아올 수 있다. 직접 탐험할 때의 EFF(70%) 효율이라 손으로 하는 쪽이 계속 이득이다.
//  · 플레이어 Lv.UNLOCK_LV 부터 (처음엔 로드 매니저 소개 스토리 → 계약)
//  · 동시에 파견은 1건. 스태미나는 30분당 10 (직접 탐험 1번 = 10과 같은 비율)
//  · 보상: 그 맵의 재료(탐험과 같은 목록 · 희귀 확률은 행운 반영) + 플레이어 경험치(재료 1개당 10 × EFF)
//  · 돌아오는 길에 가끔 작은 일이 생김 (행운으로 희귀 재료 +1 / 졸다가 재료 -1)
//  · 이미지: road-manager.png (없으면 🚗 이모지) — 저장소 루트에 올리면 자동 적용
// 저장: localStorage 'ph_roadmgr' (ph_ 로 시작 → 클라우드 저장에 자동 포함)
// 값을 바꾸고 싶으면 아래 [설정]만 고치면 된다.
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_roadmgr';
  // ── 설정 ──
  var NAME = '박현수';
  var TITLE = '로드 매니저';
  var IMG = 'road-manager.png?v=1';
  var ACC = '#34d399';
  var UNLOCK_LV = 12;
  var EFF = 0.7;                     // 직접 탐험 대비 효율
  var PER_UNIT_MIN = 30;             // 1단위 = 30분
  var STAMINA_PER_UNIT = 10;         // 1단위 스태미나
  var ITEMS_PER_UNIT = 5.5;          // 직접 탐험 1번(4~7개)의 평균 재료 수
  var EXP_PER_ITEM = 10;             // collectExploreItem 의 재료당 경험치와 같음
  var RARE_BASE = 0.25;              // 희귀 확률 기본 (직접은 0.30 + 행운/100)
  var LUCKY_P = 0.22, MISHAP_P = 0.12;
  var DURATIONS = [{ u: 1, label: '30분' }, { u: 2, label: '1시간' }, { u: 4, label: '2시간' }];
  var MAPS = ['beach', 'park', 'forest', 'lake', 'square', 'mystery'];
  var STORY = [
    '안녕하세요, 대표님! 이번에 로드 매니저로 합류한 ' + NAME + '입니다. 운전은 자신 있습니다!',
    '대표님 바쁘실 때 제가 대신 심부름 다녀올게요. 필요한 거 있으면 말씀만 하세요!',
    '아직 일이 익숙하지 않아서… 대표님이 직접 하시는 것보다는 ' + Math.round(EFF * 100) + '%정도밖에 못 해올 거예요. 죄송합니다!',
    '대신 열심히 달릴게요! 출발 전에 에너지 드링크 한 캔만 마시고 가겠습니다!'
  ];
  var FONT = "font-family:'Noto Sans KR',sans-serif;";

  // ── 도구 ──
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function plv() { try { return Number(playerLevel) || 1; } catch (e) { return 1; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function toast(m) { if (typeof showBagToast === 'function') showBagToast(m); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function titleOf(id) { try { return PLACE_TITLES[id] || id; } catch (e) { return id; } }
  function mats(id) { try { return EXPLORE_MATERIALS[id]; } catch (e) { return null; } }
  function mapOpen(id) {
    if (!mats(id)) return false;
    if (id === 'mystery') { try { return typeof isMysteryIslandUnlocked === 'function' ? !!isMysteryIslandUnlocked() : false; } catch (e) { return false; } }
    return true;
  }
  function fmtTime(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + '시간 ' : '') + (h || m ? m + '분 ' : '') + ss + '초';
  }
  function job() { return load().job || null; }
  function status() { var j = job(); if (!j) return 'idle'; return Date.now() >= j.end ? 'ready' : 'running'; }
  function avatar(px) {
    return '<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:' + px + 'px;height:' + px + 'px;border-radius:50%;background:linear-gradient(135deg,' + ACC + ',#3b82f6);overflow:hidden;font-size:' + Math.round(px * 0.55) + 'px;flex:none;border:2px solid ' + ACC + ';">🚗' +
      '<img src="' + IMG + '" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 25%;" onload="this.parentNode.style.fontSize=\'0\'" onerror="this.remove()"></span>';
  }
  function iconOf(name) { try { return window.matIcon ? window.matIcon(name, 22, getMaterialEmoji(name)) : getMaterialEmoji(name); } catch (e) { return '📦'; } }

  // ── 보상 계산 (받을 때 굴림) ──
  function roll(j) {
    var m = mats(j.map); if (!m) return { items: [], exp: 0, note: '' };
    var luck = 0; try { luck = typeof getEquippedStat === 'function' ? Number(getEquippedStat('luck')) || 0 : 0; } catch (e) {}
    var rare = Math.min(0.6, RARE_BASE + luck / 100);
    var n = Math.max(1, Math.round(j.u * EFF * ITEMS_PER_UNIT * (0.85 + Math.random() * 0.3)));
    var note = '';
    var r = Math.random();
    var lucky = r < LUCKY_P, mishap = !lucky && r < LUCKY_P + MISHAP_P;
    var counts = {}, i, name;
    for (i = 0; i < n; i++) { name = pick(Math.random() < rare ? m.rare : m.normal); counts[name] = (counts[name] || 0) + 1; }
    if (lucky) { name = pick(m.rare); counts[name] = (counts[name] || 0) + 1; note = pick(['🍀 휴게소에서 귀한 걸 주웠대요! (+1)', '🍀 길가에서 반짝이는 걸 발견했대요! (+1)', '🍀 현지 어르신이 덤으로 챙겨주셨대요! (+1)']); }
    if (mishap && n > 1) { var keys = Object.keys(counts), k = pick(keys); counts[k] -= 1; if (counts[k] <= 0) delete counts[k]; note = pick(['😴 졸다가 짐 하나를 흘렸대요… (-1)', '🍟 휴게소에서 배고파서 간식을 사 먹었대요… (-1)']); }
    var items = Object.keys(counts).map(function (k) { return { name: k, qty: counts[k] }; });
    var total = items.reduce(function (a, b) { return a + b.qty; }, 0);
    return { items: items, exp: Math.round(total * EXP_PER_ITEM * EFF), note: note };
  }

  // ── 화면 ──
  function overlay() {
    var old = document.getElementById('road-mgr'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'road-mgr';
    ov.style.cssText = 'position:fixed;inset:0;z-index:1150;background:rgba(10,8,22,.94);overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:16px;' + FONT;
    document.body.appendChild(ov);
    return ov;
  }
  var tickTimer = null;
  function closeAll() { var o = document.getElementById('road-mgr'); if (o) o.remove(); if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }
  var BOX = 'width:100%;max-width:360px;color:#fff;margin:auto 0;';
  function header() {
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' + avatar(54) +
      '<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:900;">' + esc(NAME) + ' <span style="font-size:11px;color:' + ACC + ';font-weight:400;">' + esc(TITLE) + '</span></div>' +
      '<div style="font-size:11px;color:#aaa;margin-top:2px;">탐험 대신 다녀오기 · 효율 ' + Math.round(EFF * 100) + '%</div></div>' +
      '<button id="rm-close" style="padding:7px 12px;border:none;border-radius:10px;background:rgba(255,255,255,.12);color:#fff;font-size:12px;cursor:pointer;' + FONT + '">닫기</button></div>';
  }
  function bindClose(ov) { var c = ov.querySelector('#rm-close'); if (c) c.onclick = closeAll; }

  function showStory() {
    var ov = overlay(), i = 0;
    (function draw() {
      var last = i >= STORY.length - 1;
      ov.style.alignItems = 'flex-end';
      ov.innerHTML = '<div style="' + BOX + '"><div style="text-align:center;margin-bottom:14px;">' + avatar(120) + '</div>' +
        '<div style="background:linear-gradient(135deg,#1a1a2e,#10302b);border:2px solid ' + ACC + ';border-radius:18px;padding:16px 18px;">' +
        '<div style="font-size:12px;font-weight:900;color:' + ACC + ';margin-bottom:6px;">🚗 ' + esc(NAME) + ' <span style="color:#aaa;font-weight:400;">· ' + esc(TITLE) + '</span></div>' +
        '<div style="font-size:14px;line-height:1.7;min-height:72px;">' + esc(STORY[i]) + '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;"><span style="font-size:11px;color:#888;">' + (i + 1) + ' / ' + STORY.length + '</span>' +
        '<button id="rm-next" style="border:none;border-radius:12px;padding:10px 20px;font-weight:900;font-size:14px;color:#fff;cursor:pointer;background:linear-gradient(135deg,' + ACC + ',#3b82f6);' + FONT + '">' + (last ? '계약하기' : '다음') + '</button></div></div></div>';
      ov.querySelector('#rm-next').onclick = function () {
        if (!last) { i++; draw(); return; }
        var s = load(); s.met = true; save(s); ov.style.alignItems = 'flex-start'; toast('🚗 ' + NAME + ' 로드 매니저가 합류했어요!'); open();
      };
    })();
  }

  var sel = { map: 'forest', u: 1 };
  function open() {
    if (plv() < UNLOCK_LV) { toast('🚗 로드 매니저는 플레이어 Lv.' + UNLOCK_LV + '부터 만날 수 있어요 (지금 Lv.' + plv() + ')'); return; }
    if (!load().met) { showStory(); return; }
    var st = status();
    if (st === 'ready') return renderReady();
    if (st === 'running') return renderRunning();
    renderIdle();
  }

  function renderIdle() {
    var ov = overlay(); ov.style.alignItems = 'flex-start';
    if (!mapOpen(sel.map)) sel.map = MAPS.filter(mapOpen)[0] || 'forest';
    var stam = 0; try { stam = stamina; } catch (e) {}
    var maps = MAPS.map(function (id) {
      var on = sel.map === id, open_ = mapOpen(id);
      return '<button data-map="' + id + '" ' + (open_ ? '' : 'disabled') + ' style="padding:10px 6px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT +
        'border:2px solid ' + (on ? ACC : 'rgba(255,255,255,.2)') + ';background:' + (on ? 'rgba(52,211,153,.18)' : 'rgba(255,255,255,.06)') + ';color:#fff;' + (open_ ? '' : 'opacity:.4;') + '">' + esc(titleOf(id)) + (open_ ? '' : '<br><span style="font-size:10px;color:#aaa;">🔒 잠김</span>') + '</button>';
    }).join('');
    var durs = DURATIONS.map(function (d) {
      var on = sel.u === d.u, cost = d.u * STAMINA_PER_UNIT, avg = Math.round(d.u * EFF * ITEMS_PER_UNIT);
      return '<button data-u="' + d.u + '" style="padding:10px 4px;border-radius:12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT +
        'border:2px solid ' + (on ? ACC : 'rgba(255,255,255,.2)') + ';background:' + (on ? 'rgba(52,211,153,.18)' : 'rgba(255,255,255,.06)') + ';color:#fff;">' + d.label + '<br><span style="font-size:10px;color:#ccc;font-weight:400;">⚡' + cost + ' · 재료 약 ' + avg + '개</span></button>';
    }).join('');
    var cost = sel.u * STAMINA_PER_UNIT, can = stam >= cost;
    ov.innerHTML = '<div style="' + BOX + '">' + header() +
      '<div style="font-size:12px;font-weight:900;color:' + ACC + ';margin-bottom:6px;">📍 어디로 갈까요?</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px;">' + maps + '</div>' +
      '<div style="font-size:12px;font-weight:900;color:' + ACC + ';margin-bottom:6px;">⏱️ 얼마나 다녀올까요?</div>' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-bottom:14px;">' + durs + '</div>' +
      '<div style="font-size:11px;color:#aaa;text-align:center;margin-bottom:10px;">현재 스태미나 ⚡' + stam + ' · 출발 시 ⚡' + cost + ' · 앱을 꺼도 시간은 흘러요</div>' +
      '<button id="rm-go" style="width:100%;padding:14px;border:none;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer;color:#fff;background:' + (can ? 'linear-gradient(135deg,' + ACC + ',#3b82f6)' : '#555') + ';' + FONT + '">🚗 ' + (can ? '출발!' : '스태미나가 부족해요') + '</button></div>';
    bindClose(ov);
    ov.querySelectorAll('[data-map]').forEach(function (b) { b.onclick = function () { sel.map = b.getAttribute('data-map'); renderIdle(); }; });
    ov.querySelectorAll('[data-u]').forEach(function (b) { b.onclick = function () { sel.u = +b.getAttribute('data-u'); renderIdle(); }; });
    ov.querySelector('#rm-go').onclick = go;
  }

  function go() {
    if (status() !== 'idle') return;
    var cost = sel.u * STAMINA_PER_UNIT;
    try { if (stamina < cost) { toast('스태미나가 부족해요! ⚡ ' + cost + ' 필요'); return; } stamina -= cost; if (typeof saveStamina === 'function') saveStamina(); if (typeof updateStaminaDisplay === 'function') updateStaminaDisplay(); } catch (e) { return; }
    var s = load(), now = Date.now();
    s.job = { map: sel.map, u: sel.u, start: now, end: now + sel.u * PER_UNIT_MIN * 60000, cost: cost, notified: false };
    save(s);
    try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play('pick'); } catch (e) {}
    renderRunning();
  }

  function renderRunning() {
    var ov = overlay(); ov.style.alignItems = 'flex-start';
    var j = job(); if (!j) return renderIdle();
    ov.innerHTML = '<div style="' + BOX + '">' + header() +
      '<div style="text-align:center;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:16px;padding:22px 14px;">' +
      '<div style="position:relative;height:96px;overflow:hidden;margin-bottom:2px;">' +
        '<img src="road-puff1.png?v=1" style="position:absolute;left:calc(50% - 96px);top:30px;height:34px;animation:rmSmoke 1.2s ease-out infinite;" alt="">' +
        '<img src="road-puff2.png?v=1" style="position:absolute;left:calc(50% - 96px);top:34px;height:26px;animation:rmSmoke 1.2s ease-out .4s infinite;" alt="">' +
        '<img src="road-puff3.png?v=1" style="position:absolute;left:calc(50% - 96px);top:38px;height:18px;animation:rmSmoke 1.2s ease-out .8s infinite;" alt="">' +
        '<img src="road-van.png?v=1" style="position:absolute;left:calc(50% - 66px);top:6px;height:66px;animation:rmBob .5s ease-in-out infinite alternate;" alt="">' +
        '<div style="position:absolute;left:0;right:0;bottom:8px;height:3px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.45) 0 18px,transparent 18px 36px);animation:rmRoad .5s linear infinite;"></div>' +
      '</div>' +
      '<div style="font-size:14px;font-weight:900;margin:8px 0 2px;">' + esc(titleOf(j.map)) + '로 달리는 중</div>' +
      '<div id="rm-left" style="font-size:22px;font-weight:900;color:' + ACC + ';margin:6px 0 10px;"></div>' +
      '<div style="height:10px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden;"><div id="rm-bar" style="height:100%;width:0;background:linear-gradient(90deg,' + ACC + ',#3b82f6);"></div></div>' +
      '<div style="font-size:11px;color:#aaa;margin-top:10px;line-height:1.6;">앱을 꺼도 괜찮아요. 시간이 되면 돌아와서 알려줘요.</div></div></div>' +
      '<style>@keyframes rmSmoke{0%{opacity:0;transform:translateX(26px) scale(.5)}20%{opacity:1}100%{opacity:0;transform:translateX(-46px) scale(1.2)}}@keyframes rmBob{from{transform:translateY(0)}to{transform:translateY(-3px)}}@keyframes rmRoad{from{background-position:0 0}to{background-position:-36px 0}}</style>';
    bindClose(ov);
    if (tickTimer) clearInterval(tickTimer);
    function upd() {
      var jj = job(); if (!jj) { closeAll(); return; }
      var left = jj.end - Date.now();
      if (left <= 0) { clearInterval(tickTimer); tickTimer = null; renderReady(); return; }
      var L = document.getElementById('rm-left'), B = document.getElementById('rm-bar'); if (!L) { clearInterval(tickTimer); tickTimer = null; return; }
      L.textContent = fmtTime(left); B.style.width = Math.min(100, (Date.now() - jj.start) / (jj.end - jj.start) * 100) + '%';
    }
    upd(); tickTimer = setInterval(upd, 1000);
  }

  function renderReady() {
    var ov = overlay(); ov.style.alignItems = 'flex-start';
    var s = load(), j = s.job; if (!j) return renderIdle();
    if (!j.result) { j.result = roll(j); save(s); }                    // 한 번 굴린 결과는 저장 (열었다 닫아도 그대로)
    var r = j.result;
    var rows = r.items.length ? r.items.map(function (it) { return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.07);">' + iconOf(it.name) + '<span style="flex:1;font-size:13px;font-weight:700;">' + esc(it.name) + '</span><b style="color:' + ACC + ';">×' + it.qty + '</b></div>'; }).join('') : '<div style="font-size:12px;color:#aaa;text-align:center;padding:10px;">남은 재료가 없어요</div>';
    ov.innerHTML = '<div style="' + BOX + '">' + header() +
      '<div style="text-align:center;font-size:16px;font-weight:900;margin-bottom:4px;">🚗 ' + esc(titleOf(j.map)) + ' 다녀왔어요!</div>' +
      (r.note ? '<div style="text-align:center;font-size:12px;color:#fcd34d;margin-bottom:8px;">' + esc(r.note) + '</div>' : '<div style="height:8px;"></div>') +
      '<div style="display:grid;gap:6px;margin-bottom:10px;">' + rows + '</div>' +
      '<div style="text-align:center;font-size:13px;font-weight:900;color:#fcd34d;margin-bottom:14px;">⭐ 경험치 +' + r.exp.toLocaleString() + '</div>' +
      '<button id="rm-claim" style="width:100%;padding:14px;border:none;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer;color:#fff;background:linear-gradient(135deg,' + ACC + ',#3b82f6);' + FONT + '">받기</button></div>';
    bindClose(ov);
    ov.querySelector('#rm-claim').onclick = claim;
  }

  function claim() {
    var s = load(), j = s.job; if (!j || !j.result) return;
    var left = [], added = 0;
    j.result.items.forEach(function (it) {
      var ok = false; try { ok = addToBag(getMaterialEmoji(it.name), it.name, 'material', it.qty, '제작 재료 (로드 매니저)'); } catch (e) {}
      if (ok) added += it.qty; else left.push(it);
    });
    if (j.result.exp && !j.result.expDone) { try { addPlayerExp(j.result.exp); } catch (e) {} j.result.expDone = true; }
    try { if (typeof saveAll === 'function') saveAll(); } catch (e) {}
    if (left.length) {                                                   // 가방이 꽉 찼으면 남은 것만 보관
      j.result.items = left; save(s); toast('가방이 꽉 찼어요! 자리를 비우고 남은 재료를 다시 받아주세요');
      renderReady(); return;
    }
    s.done = (s.done || 0) + 1; delete s.job; save(s);
    try { if (window.pocaSfx && pocaSfx.play) pocaSfx.play('reward'); } catch (e) {}
    toast('🚗 재료 ' + added + '개 + ⭐ ' + (j.result.exp || 0) + ' 경험치를 받았어요!');
    try { window.dispatchEvent(new CustomEvent('ph-roadmgr-done', { detail: { map: j.map, n: added } })); } catch (e) {}
    closeAll();
  }

  // ── 더보기 메뉴에 타일 ──
  function whenReady(test, fn) { var t = 0; (function a() { var ok = false; try { ok = test(); } catch (e) {} if (ok) { fn(); return; } if (++t < 200) setTimeout(a, 100); })(); }
  whenReady(function () { return typeof window.openMoreMenu === 'function' && typeof window.moreMenuTileHtml === 'function'; }, function () {
    var original = window.openMoreMenu;
    if (original.__roadWrapped) return;
    var wrapped = function () {
      var res = original.apply(this, arguments);
      var grid = document.getElementById('more-menu-grid');
      if (grid && !document.getElementById('more-road-tile')) {
        var st = status(), tag = st === 'ready' ? ' ✅' : (st === 'running' ? ' ⏳' : '');
        grid.insertAdjacentHTML('beforeend', window.moreMenuTileHtml('🚗', '로드 매니저' + tag, ACC, 'openRoadManager()'));
        if (grid.lastElementChild) grid.lastElementChild.id = 'more-road-tile';
      }
      return res;
    };
    wrapped.__roadWrapped = true;
    window.openMoreMenu = wrapped;
  });

  // ── 돌아오면 알림 (한 번) ──
  setInterval(function () {
    var s = load(), j = s.job;
    if (j && !j.notified && Date.now() >= j.end) {
      j.notified = true; save(s);
      toast('🚗 ' + NAME + ' 매니저가 돌아왔어요! 더보기 > 로드 매니저에서 받아가요');
    }
  }, 3000);

  window.openRoadManager = open;
  window.__roadMgrTest = { load: load, save: save, open: open, status: status, roll: roll, go: go, claim: claim, sel: sel, EFF: EFF };
})();
