// ════════════════════════════════
// 🎽 장착 현황 (equip-panel.js)
// 가방 화면 오른쪽 가장자리에 "🎽 장착 현황" 탭이 붙는다. 누르면 오른쪽에서 패널이 밀려 나와
// 지금 끼고 있는 것을 한 번에 보여준다. (가방은 그대로 왼쪽에 보임, 바깥을 누르면 닫힘)
//   👤 내 의상 / 💎 프리미엄 장착 효과 / 🎟️ 체험 카드
//   멤버별로: 👗 의상실 옷(상의·하의·원피스) + 🎁 굿즈(머리·손·액세서리)와 각 능력치
// 보기 전용 화면이다. 바꾸러 가는 버튼(의상실·굿즈 공방)은 패널 아래에 있다.
// 기존 파일은 건드리지 않고 저장 값(localStorage)과 이미 열려 있는 값을 읽기만 한다.
// ════════════════════════════════
(function () {
  'use strict';

  var ACC = '#C084FC';
  var CHAR_ORDER = ['minjun', 'sion', 'doyun', 'harin', 'yuna', 'ara'];
  var GOODS_SLOTS = [['hat', '머리'], ['hand', '손'], ['acc', '액세서리']];
  var GEAR_STAT = {
    coin: ['🍔', '원정 코인', '%'], exp: ['⭐', '원정 EXP', '%'], piece: ['🖼️', '프리미엄 조각', '%'],
    ticket: ['🎫', '등교권·조각 드랍', '%'], wish: ['🧩', '소원의 조각', '%p'], honor: ['✨', '우등생조각', '%']
  };
  var CLOTH_STAT = { coin: '알바 코인', luck: '행운·희귀재료', affection: '호감도', study: '수업 점수', charm: '매력' };
  var GRADE_COLOR = { normal: '#cbd5e1', good: '#4ade80', rare: '#FFD700' };
  var GRADE_LABEL = { normal: '일반', good: '고급', rare: '레어' };

  function read(key, dflt) { try { var d = JSON.parse(localStorage.getItem(key) || 'null'); return d == null ? dflt : d; } catch (e) { return dflt; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function base() { try { return B; } catch (e) { return ''; } }
  function charName(id) { try { return CHARS[id].name; } catch (e) { return id; } }
  function clothDef(id) { try { return CLOTH_ITEMS.filter(function (c) { return c.id === id; })[0] || null; } catch (e) { return null; } }

  // ════════ 데이터 모으기 (화면 없이도 테스트 가능) ════════
  function gearText(stats) {
    return Object.keys(stats || {}).filter(function (k) { return GEAR_STAT[k] && stats[k]; })
      .map(function (k) { return GEAR_STAT[k][0] + ' ' + GEAR_STAT[k][1] + ' +' + stats[k] + GEAR_STAT[k][2]; });
  }
  function collect() {
    var out = { player: null, premium: [], trial: null, chars: [], count: 0 };
    // 👤 내 의상
    try {
      if (typeof equippedCloth !== 'undefined' && equippedCloth) {
        var id = typeof equippedCloth === 'object' ? equippedCloth.id : equippedCloth, c = clothDef(id);
        var val = (typeof equippedCloth === 'object' && equippedCloth.statVal) || (c && c.statVal) || 0;
        if (c) { out.player = { name: c.name, text: (CLOTH_STAT[c.stat] || c.stat) + ' +' + val + '%', img: c.img }; out.count++; }
      }
    } catch (e) {}
    // 💎 프리미엄 장착 효과
    try { if (typeof window.getPremiumEquipLines === 'function') { out.premium = window.getPremiumEquipLines() || []; out.count += out.premium.length; } } catch (e) {}
    // 🎟️ 체험 카드
    try {
      var tr = read('ph_trialCard', null);
      if (tr && window.__trialTest && window.__trialTest.isActive && window.__trialTest.isActive()) {
        out.trial = { name: '세연 체험 카드', text: '스태미나 -10% · 희귀재료 +1% · D-' + (window.__trialTest.dday ? window.__trialTest.dday() : '?') };
        out.count++;
      }
    } catch (e) {}
    // 멤버별 의상실 + 굿즈
    var clo = read('ph_clothesEquip', {}) || {}, goods = read('ph_goodsgear', {}) || {};
    CHAR_ORDER.forEach(function (cid) {
      var row = { id: cid, name: charName(cid), clothes: [], goods: [] };
      var ce = clo[cid] || {};
      ['dress', 'top', 'bottom'].forEach(function (slot) {
        var p = ce[slot]; if (!p) return;
        var d = clothDef(p.id); if (!d) return;
        var kind = slot === 'dress' ? '원피스' : slot === 'top' ? '상의' : '하의';
        row.clothes.push({ kind: kind, name: (p.great ? '✨ ' : '') + d.name, img: d.img, text: CLOTH_STAT[d.stat] || d.stat });
        out.count++;
      });
      var ge = goods[cid] || {};
      GOODS_SLOTS.forEach(function (s) {
        var it = ge[s[0]];
        if (!it) { row.goods.push({ slot: s[1], empty: true }); return; }
        row.goods.push({ slot: s[1], emoji: it.emoji, name: it.base, grade: it.grade, lines: gearText(it.stats) });
        out.count++;
      });
      out.chars.push(row);
    });
    return out;
  }

  // ════════ 화면 ════════
  var ROOT = 'equip-panel', TAB = 'equip-tab';
  function section(title, body) {
    return '<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:900;color:#e9d5ff;margin-bottom:6px;">' + title + '</div>' + body + '</div>';
  }
  function chipRow(emoji, name, text, color) {
    return '<div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.07);border-radius:10px;padding:7px 9px;margin-bottom:5px;">' +
      '<div style="font-size:20px;">' + emoji + '</div><div style="flex:1;min-width:0;"><div style="font-size:12px;font-weight:900;color:' + (color || '#fff') + ';">' + esc(name) + '</div>' +
      (text ? '<div style="font-size:11px;color:#c9b8e8;line-height:1.45;">' + text + '</div>' : '') + '</div></div>';
  }
  function html() {
    var d = collect(), h = '';
    var top = '';
    top += d.player ? chipRow('👤', d.player.name, esc(d.player.text)) : '<div style="font-size:11px;color:#8b7bb0;">입고 있는 의상이 없어요 (가방에서 옷을 눌러 착용)</div>';
    h += section('👤 내 의상', top);
    h += section('💎 프리미엄 장착 효과', d.premium.length ? d.premium.map(function (l) { return chipRow('', l, '', '#fff').replace('<div style="font-size:20px;"></div>', ''); }).join('') : '<div style="font-size:11px;color:#8b7bb0;">장착한 프리미엄 카드가 없어요 (트레이닝룸 > 프리미엄 카드)</div>');
    if (d.trial) h += section('🎟️ 체험 카드', chipRow('🎟️', d.trial.name, esc(d.trial.text), '#fcd34d'));
    h += '<div style="height:1px;background:rgba(255,255,255,0.12);margin:4px 0 12px;"></div>';
    h += '<div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:8px;">👥 멤버별 장착</div>';
    function hasAny(c) { return c.clothes.length || c.goods.some(function (g) { return !g.empty; }); }
    var idle = d.chars.filter(function (c) { return !hasAny(c); });
    d.chars.filter(hasAny).forEach(function (c) {
      var any = true;
      h += '<div style="background:rgba(255,255,255,0.06);border:1.5px solid ' + (any ? 'rgba(192,132,252,0.55)' : 'rgba(255,255,255,0.1)') + ';border-radius:14px;padding:9px;margin-bottom:9px;">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><img src="' + base() + 'face-' + c.id + '.png" style="width:34px;height:34px;border-radius:50%;object-fit:cover;background:#2a2146;" onerror="this.style.visibility=\'hidden\'">' +
        '<div style="font-size:14px;font-weight:900;color:#fff;">' + esc(c.name) + '</div></div>';
      if (c.clothes.length) h += c.clothes.map(function (x) { return chipRow('👗', x.kind + ' · ' + x.name, esc(x.text)); }).join('');
      else h += '<div style="font-size:11px;color:#8b7bb0;margin-bottom:5px;">👗 입은 옷 없음</div>';
      h += c.goods.map(function (g) {
        if (g.empty) return '<div style="display:flex;align-items:center;gap:8px;border:1px dashed rgba(255,255,255,0.18);border-radius:10px;padding:6px 9px;margin-bottom:5px;font-size:11px;color:#8b7bb0;">＋ ' + g.slot + ' 비어 있음</div>';
        return chipRow(g.emoji, g.slot + ' · ' + g.name + ' (' + (GRADE_LABEL[g.grade] || '') + ')', g.lines.map(esc).join('<br>'), GRADE_COLOR[g.grade]);
      }).join('');
      h += '</div>';
    });
    if (idle.length) {
      h += '<div style="background:rgba(255,255,255,0.04);border:1px dashed rgba(255,255,255,0.15);border-radius:12px;padding:9px;margin-bottom:9px;"><div style="font-size:11px;font-weight:900;color:#8b7bb0;margin-bottom:6px;">아무것도 안 낀 멤버</div><div style="display:flex;flex-wrap:wrap;gap:8px;">' +
        idle.map(function (c) { return '<div style="display:flex;align-items:center;gap:5px;font-size:12px;color:#c9b8e8;"><img src="' + base() + 'face-' + c.id + '.png" style="width:24px;height:24px;border-radius:50%;object-fit:cover;background:#2a2146;" onerror="this.style.visibility=\'hidden\'">' + esc(c.name) + '</div>'; }).join('') + '</div></div>';
    }
    h += '<div style="display:flex;gap:8px;margin-top:4px;">' +
      '<button data-go="clothes" style="flex:1;padding:10px;border:none;border-radius:10px;background:rgba(192,132,252,.25);color:#fff;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer;">👗 의상실</button>' +
      '<button data-go="goods" style="flex:1;padding:10px;border:none;border-radius:10px;background:rgba(255,184,107,.25);color:#fff;font-size:12px;font-weight:900;font-family:inherit;cursor:pointer;">🎁 굿즈 공방</button></div>';
    return { html: h, count: d.count };
  }

  function open() {
    try { localStorage.setItem('ph_equip_viewed', '1'); } catch (e) {}   // 길잡이가 '장착 현황 열어봤는지' 확인용
    close();
    var wrap = document.createElement('div');
    wrap.id = ROOT;
    wrap.style.cssText = 'position:fixed;inset:0;z-index:955;background:rgba(0,0,0,0.45);font-family:\'Noto Sans KR\',sans-serif;';
    var r = html();
    wrap.innerHTML = '<div id="equip-drawer" style="position:absolute;top:0;right:0;bottom:0;width:min(86vw,350px);background:linear-gradient(180deg,#1f1637,#2d1b4e);border-left:2px solid ' + ACC + ';box-shadow:-8px 0 24px rgba(0,0,0,.5);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .22s ease-out;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px;"><div style="font-size:16px;font-weight:900;color:#fff;">🎽 장착 현황 <span style="font-size:11px;color:#c9b8e8;">' + r.count + '개 착용 중</span></div>' +
      '<button id="equip-x" style="background:none;border:none;color:#bbb;font-size:20px;cursor:pointer;">✕</button></div>' +
      '<div style="flex:1;overflow-y:auto;padding:0 12px 28px;-webkit-overflow-scrolling:touch;">' + r.html + '</div></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { var dr = document.getElementById('equip-drawer'); if (dr) dr.style.transform = 'translateX(0)'; });
    wrap.onclick = function (e) { if (e.target === wrap) close(); };
    document.getElementById('equip-x').onclick = close;
    Array.prototype.forEach.call(wrap.querySelectorAll('[data-go]'), function (b) {
      b.onclick = function () {
        var g = b.getAttribute('data-go'); close();
        try { if (g === 'clothes' && typeof window.openClothesEquip === 'function') window.openClothesEquip(); else if (g === 'goods' && typeof window.openGoodsGear === 'function') window.openGoodsGear(); } catch (err) {}
      };
    });
  }
  function close() { var w = document.getElementById(ROOT); if (w) w.remove(); }

  // 가방 화면이 열려 있을 때만 오른쪽 가장자리에 탭을 보여준다
  function ensureTab() {
    var tab = document.getElementById(TAB);
    if (!tab) {
      tab = document.createElement('button');
      tab.id = TAB;
      tab.style.cssText = 'position:fixed;right:0;top:46%;z-index:900;display:none;padding:12px 7px;border:none;border-radius:14px 0 0 14px;background:linear-gradient(180deg,#C084FC,#FF6B9D);color:#fff;font-size:12px;font-weight:900;font-family:\'Noto Sans KR\',sans-serif;line-height:1.25;cursor:pointer;box-shadow:-3px 3px 10px rgba(0,0,0,.35);writing-mode:vertical-rl;letter-spacing:1px;';
      tab.textContent = '🎽 장착 현황 ◀';
      tab.onclick = open;
      document.body.appendChild(tab);
    }
    return tab;
  }
  function tick() {
    var bag = document.getElementById('screen-bag');
    var on = !!(bag && bag.classList.contains('active')) && !document.getElementById(ROOT);
    ensureTab().style.display = on ? 'block' : 'none';
  }
  setInterval(tick, 350);
  tick();

  window.openEquipPanel = open;
  window.__equipTest = { collect: collect, gearText: gearText };
})();
