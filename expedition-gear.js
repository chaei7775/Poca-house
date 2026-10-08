// ════════════════════════════════════════════════════════════
// 🎀 팬덤 원정 소품 (expedition-gear.js)
// 가방의 소품(브로치·펜던트·리본·배지)을 멤버마다 2칸까지 장착. 팬덤 원정에서 효과가 적용돼요.
//   사거리(월광 리본·성운 펜던트) : 스킬 사거리 +%  (방송국·팬미팅·공연장·공항·레드카펫 / 파파라치=윙크 범위 / 월드투어=제한시간 / 리허설장=게이지 구간)
//   쿨타임(프리즘 브로치·불꽃 펜던트) : 스킬 쿨타임 -% 최대 -60%  (스킬 쓰는 맵 + 파파라치 / 월드투어=데미지 / 리허설장=게이지 느리게)
//   보상(천공 깃털 배지·은하수 브로치) : 코인·경험치 +%  (모든 팬덤 원정)
//   상자(용의 심장 브로치) : 상자 확률/보상 +%  (리허설장·월드투어=떨어질 확률 / 파파라치=상자 한 번 더 / 공항=프리미엄 조각 확률 / 레드카펫=방지권·조각 확률)
//   실수 방지(수정 왕관 배지) : 실수를 1회(전설 2회) 막아줌  (모든 팬덤 원정 · 파파라치는 '찍힘' 1회 막기)
// 저장: localStorage 'ph_fangear' = { 멤버id: [소품 가방이름, 소품 가방이름] }  (장착해도 가방 아이템은 그대로 있음)
// 다른 파일에서: FanGear.sum(멤버id, 'reach'|'cd'|'reward'|'box'|'forgive') → 합친 수치
// ✏️ 값 바꾸는 곳: special-explore.js 의 SPECIAL_GEAR(value) / SPECIAL_GEAR_GRADE_MULT, 아래 [설정]
// ════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_fangear', SLOTS = 2, CD_CAP = 60;
  var KIND_ICON = { reach: '📏', cd: '⏱️', reward: '💰', box: '🎁', forgive: '🛡️' };
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  var GRADE_COLOR = { common: '#cbd5e1', great: '#4ade80', rare: '#60a5fa', legend: '#fbbf24' };

  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function parse(name) { try { return (typeof parseGearBagName === 'function') ? parseGearBagName(name) : null; } catch (e) { return null; } }
  function bagGear() { try { return bagItems.filter(function (i) { return i.type === 'gear'; }); } catch (e) { return []; } }
  function qtyOf(name) { var it = bagGear().filter(function (i) { return i.name === name; })[0]; return it ? it.qty : 0; }
  function usedCount(name, exceptCid) { var o = load(), n = 0; Object.keys(o).forEach(function (c) { if (c === exceptCid) return; (o[c] || []).forEach(function (x) { if (x === name) n++; }); }); return n; }

  // 장착 목록 (가방에 없는 건 자동으로 빠짐)
  function equipped(cid) {
    var o = load(), arr = (o[cid] || []).filter(function (n) { return n && qtyOf(n) > 0; });
    return arr.slice(0, SLOTS).map(parse).filter(Boolean);
  }
  function sum(cid, kind) {
    var t = 0;
    equipped(cid).forEach(function (g) { if (g.effect === kind) t += g.value; });
    if (kind === 'cd') t = Math.min(CD_CAP, t);
    return t;
  }
  function mult(cid, kind) { return 1 + sum(cid, kind) / 100; }

  // 새 맵 보상: 소품 한 개 굴리기 (등급: 일반 → 고급 → 희귀 → 전설)
  function roll(minGrade) {
    try {
      var r = Math.random(), grade = r < 0.005 ? 'legend' : r < 0.035 ? 'rare' : r < 0.16 ? 'great' : 'common';
      if (minGrade === 'great' && grade === 'common') grade = 'great';
      var g = SPECIAL_GEAR[Math.floor(Math.random() * SPECIAL_GEAR.length)];
      var label = SPECIAL_GEAR_GRADES[grade], eff = gearEffectText(g.effect, gearScaledValue(g, grade));
      return { emoji: g.emoji, name: '[' + label + '] ' + g.name, cat: 'gear', qty: 1, desc: '팬덤 원정 소품 · ' + eff };
    } catch (e) { return null; }
  }

  // ── 장착 화면 ──
  function ownedChars() {
    var out = [];
    try {
      Object.keys(CHARS).forEach(function (cid) {
        if (CARDS.some(function (c) { return c.charId === cid && owned.indexOf(c.id) !== -1; })) out.push(cid);
      });
    } catch (e) {}
    if (!out.length) { try { out = Object.keys(CHARS); } catch (e) {} }
    return out;
  }
  function chName(cid) { try { return CHARS[cid].name; } catch (e) { return cid; } }
  function gearTag(g, size) {
    return '<span style="font-size:' + (size || 20) + 'px;">' + g.emoji + '</span>';
  }
  function open(cid0) {
    var list = ownedChars(); if (!list.length) return;
    var cid = list.indexOf(cid0) >= 0 ? cid0 : (list.indexOf(localStorage.getItem('ph_fg_last')) >= 0 ? localStorage.getItem('ph_fg_last') : list[0]);
    var old = document.getElementById('fg-pop'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'fg-pop';
    ov.style.cssText = 'position:fixed;inset:0;z-index:2600;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:14px;' + FONT;
    ov.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    document.body.appendChild(ov);
    function render() {
      try { localStorage.setItem('ph_fg_last', cid); } catch (e) {}
      var eq = load()[cid] || [], cur = equipped(cid);
      var slots = '';
      for (var i = 0; i < SLOTS; i++) {
        var n = eq[i], g = n && qtyOf(n) > 0 ? parse(n) : null;
        slots += '<div data-slot="' + i + '" style="flex:1;min-height:78px;border:2px ' + (g ? 'solid ' + GRADE_COLOR[g.grade] : 'dashed #888') + ';border-radius:14px;padding:8px 6px;text-align:center;background:rgba(255,255,255,.07);' + (g ? 'cursor:pointer;' : '') + '">' +
          (g ? gearTag(g, 26) + '<div style="font-size:11px;font-weight:900;color:#fff;margin-top:2px;">' + g.name + '</div><div style="font-size:10px;color:#9fe;">' + gearEffectText(g.effect, g.value) + '</div><div style="font-size:10px;color:#ffb4b4;margin-top:2px;">눌러서 빼기</div>'
            : '<div style="font-size:22px;color:#888;">＋</div><div style="font-size:11px;color:#888;">빈 칸</div>') + '</div>';
      }
      var items = bagGear().slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
      var rows = items.length ? items.map(function (it, idx) {
        var g = parse(it.name); if (!g) return '';
        var free = it.qty - usedCount(it.name, cid) - (eq.filter(function (x) { return x === it.name; }).length);
        return '<div data-gi="' + idx + '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;margin-bottom:6px;background:rgba(255,255,255,.08);border:1.5px solid ' + (free > 0 ? GRADE_COLOR[g.grade] : '#444') + ';' + (free > 0 ? 'cursor:pointer;' : 'opacity:.45;') + '">' +
          gearTag(g, 24) + '<div style="flex:1;text-align:left;"><div style="font-size:12px;font-weight:900;color:#fff;">' + it.name + ' <span style="color:#aaa;">×' + it.qty + '</span></div><div style="font-size:10.5px;color:#9fe;">' + KIND_ICON[g.effect] + ' ' + gearEffectText(g.effect, g.value) + '</div></div>' +
          '<div style="font-size:11px;font-weight:900;color:' + (free > 0 ? '#ffd76a' : '#888') + ';">' + (free > 0 ? '장착' : '사용 중') + '</div></div>';
      }).join('') : '<div style="font-size:12px;color:#aaa;padding:16px 0;">아직 소품이 없어요.<br>팬덤 원정(방송국 앞·팬미팅장·공연장)과 새 맵에서 얻을 수 있어요!</div>';
      var bonus = ['reach', 'cd', 'reward', 'box', 'forgive'].map(function (k) {
        var v = sum(cid, k); if (!v) return '';
        return '<span style="display:inline-block;margin:2px 3px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.14);font-size:11px;font-weight:900;color:#fff;">' + KIND_ICON[k] + ' ' + (k === 'cd' ? '-' : '+') + v + (k === 'forgive' ? '회' : '%') + '</span>';
      }).join('') || '<span style="font-size:11px;color:#888;">장착한 소품이 없어요</span>';
      ov.innerHTML = '<div style="width:100%;max-width:340px;max-height:92vh;overflow:auto;background:linear-gradient(160deg,#241547,#120a26);border:2px solid #C084FC;border-radius:20px;padding:16px;text-align:center;color:#fff;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;"><button id="fg-prev" style="width:34px;height:34px;border:none;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:16px;">◀</button>' +
        '<div><div style="font-size:16px;font-weight:900;">🎀 ' + chName(cid) + '의 소품</div><div style="font-size:10.5px;color:#bba;">팬덤 원정에서 효과가 적용돼요 · ' + SLOTS + '칸</div></div>' +
        '<button id="fg-next" style="width:34px;height:34px;border:none;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:16px;">▶</button></div>' +
        '<div style="display:flex;gap:8px;margin-bottom:8px;">' + slots + '</div>' +
        '<div style="margin-bottom:10px;">' + bonus + '</div>' +
        '<div style="font-size:10px;color:#9aa;line-height:1.5;margin:0 0 8px;text-align:left;">모든 팬덤 원정에서 효과가 있어요. 맵마다 적용 방식이 조금 달라요.<br>📏 사거리 = 스킬 범위 (파파라치: 윙크 범위 · 월드투어: 제한시간 · 리허설장: 게이지 구간)<br>⏱️ 쿨타임 = 스킬 쿨타임 (월드투어: 데미지 · 리허설장: 게이지 속도 느리게)</div>' +
        '<div style="text-align:left;font-size:11px;color:#ffd76a;font-weight:900;margin-bottom:6px;">가방 소품 (눌러서 장착)</div>' + rows +
        '<button id="fg-close" style="width:100%;margin-top:8px;padding:11px;border:none;border-radius:12px;background:rgba(255,255,255,.12);color:#ddd;font-size:14px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>';
      ov.querySelector('#fg-close').onclick = function () { ov.remove(); };
      ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
      ov.querySelector('#fg-prev').onclick = function () { cid = list[(list.indexOf(cid) + list.length - 1) % list.length]; render(); };
      ov.querySelector('#fg-next').onclick = function () { cid = list[(list.indexOf(cid) + 1) % list.length]; render(); };
      Array.prototype.forEach.call(ov.querySelectorAll('[data-slot]'), function (el) {
        el.onclick = function () {
          var o = load(), a = (o[cid] || []).slice(), i = Number(el.getAttribute('data-slot'));
          if (!a[i]) return; a.splice(i, 1); o[cid] = a; save(o); render();
        };
      });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-gi]'), function (el) {
        el.onclick = function () {
          var it = items[Number(el.getAttribute('data-gi'))]; if (!it) return;
          var o = load(), a = (o[cid] || []).filter(function (n) { return n && qtyOf(n) > 0; });
          var free = it.qty - usedCount(it.name, cid) - a.filter(function (x) { return x === it.name; }).length;
          if (free <= 0) return;
          if (a.length >= SLOTS) { if (typeof showBagToast === 'function') showBagToast('🎀 칸이 가득 찼어요! 먼저 하나를 빼줘요'); return; }
          a.push(it.name); o[cid] = a; save(o); render();
        };
      });
    }
    render();
  }

  window.FanGear = { sum: sum, mult: mult, equipped: equipped, roll: roll, open: open, SLOTS: SLOTS };

  // 가방에서 소품을 누르면 "🎀 장착하기" 버튼을 붙여줌
  try {
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (!n || n.id !== 'bag-detail-overlay') return;
          var box = n.firstElementChild; if (!box || box.children.length < 3) return;
          var name = (box.children[1].textContent || '').trim();
          if (!parse(name)) return;
          var it = bagGear().filter(function (i) { return i.name === name; })[0]; if (!it) return;
          var b = document.createElement('button');
          b.textContent = '🎀 장착하기';
          b.style.cssText = 'width:100%;padding:12px;margin-bottom:8px;border:none;border-radius:12px;background:linear-gradient(135deg,#C084FC,#FF6B9D);color:#fff;font-size:14px;font-weight:900;cursor:pointer;' + FONT;
          b.onclick = function () { n.remove(); open(); };
          var closeBtn = box.querySelector('button'); if (closeBtn) box.insertBefore(b, closeBtn); else box.appendChild(b);
        });
      });
    }).observe(document.body, { childList: true });
  } catch (e) {}
})();
