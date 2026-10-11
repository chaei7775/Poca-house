// ════════════════════════════════
// 🏢 그룹 투자 (group-invest.js) — 번 돈을 크게 쓰는 곳. 사면 그룹 활동 보상이 영구로 오른다
//  · 그룹 화면에 "🏢 그룹 투자" 버튼이 생긴다 (그룹 화면이 열릴 때 붙임)
//  · 시설마다 최대 5단계, 단계가 오를수록 비싸짐: 가격 = base × RATE^현재단계
//  · 효과는 group.js 의 reward() 가 window.__groupInvest.mult(활동id) 로 불러 쓴다 (코인·인기도 둘 다)
//  · 저장: localStorage 'ph_ginvest' = { lv: { 시설id: 단계 } }  (ph_ 로 시작 → 클라우드 저장 자동 포함)
// ✏️ 가격/효과는 아래 FAC 표만 고치면 됨
// ════════════════════════════════
(function () {
  'use strict';
  var KEY = 'ph_ginvest', MAXLV = 5, RATE = 1.9, Z = 990;
  var FONT = "font-family:'Noto Sans KR',sans-serif;";
  // 💰 가격은 하루 5천만 버는 기준으로 맞춤 (1단계 약 3일치 ~ 전부 최대 약 5달치)
  // acts: 효과가 붙는 활동(없으면 전체) / per: 단계당 +% / base: 1단계 가격
  var FAC = [
    { id: 'studio',  icon: '🎙️', name: '전용 녹음실',   desc: '음원 녹음 보상',            acts: ['album'],                per: 12, base: 120000000 },
    { id: 'practice',icon: '🪞', name: '단독 연습실',   desc: '합동 무대·댄스 챌린지 보상', acts: ['stage', 'dance'],       per: 10, base: 150000000 },
    { id: 'shoot',   icon: '🎬', name: '자체 촬영 스튜디오', desc: '화보·광고, 단체 드라마 보상', acts: ['photo', 'drama'],     per: 10, base: 150000000 },
    { id: 'setpark', icon: '📺', name: '예능 전용 세트장', desc: '단체 예능 보상',          acts: ['variety'],              per: 12, base: 120000000 },
    { id: 'dorm',    icon: '🏠', name: '그룹 단독 숙소', desc: '모든 활동 보상',            acts: null,                     per: 4,  base: 250000000 },
    { id: 'tour',    icon: '🌍', name: '월드투어 기획팀', desc: '모든 활동 보상 (엄청 비쌈)', acts: null,                     per: 6,  base: 400000000 }
  ];
  function load() { var s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} if (!s || typeof s !== 'object') s = {}; if (!s.lv) s.lv = {}; return s; }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function lvOf(id) { return Math.min(MAXLV, load().lv[id] || 0); }
  function price(f, lv) { return Math.floor(f.base * Math.pow(RATE, lv) / 1000000) * 1000000; }
  function fmt(n) { return Number(n).toLocaleString(); }
  function money() { try { return Math.floor(coins); } catch (e) { return 0; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function mult(actId) {
    var m = 1;
    FAC.forEach(function (f) { if (!f.acts || f.acts.indexOf(actId) !== -1) m += lvOf(f.id) * f.per / 100; });
    return m;
  }
  function spend(n) { try { coins = Math.max(0, coins - n); if (typeof saveAll === 'function') saveAll(); if (typeof updateCoinsDisplay === 'function') updateCoinsDisplay(); } catch (e) {} }
  function toast(m) { if (typeof showBagToast === 'function') { try { showBagToast(m); } catch (e) {} } }

  function render() {
    var ov = document.getElementById('gi-ov'); if (!ov) return;
    var rows = FAC.map(function (f) {
      var lv = lvOf(f.id), maxed = lv >= MAXLV, p = maxed ? 0 : price(f, lv), can = !maxed && money() >= p;
      var pips = ''; for (var i = 0; i < MAXLV; i++) pips += '<span style="display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:3px;background:' + (i < lv ? '#ffd76a' : 'rgba(255,255,255,.15)') + ';"></span>';
      return '<div style="display:flex;align-items:center;gap:10px;padding:11px;margin-bottom:8px;border-radius:13px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);">' +
        '<div style="font-size:30px;width:40px;text-align:center;">' + f.icon + '</div><div style="flex:1;min-width:0;">' +
        '<div style="font-size:13px;font-weight:900;">' + esc(f.name) + ' <span style="font-size:10.5px;color:#ffe08a;">Lv.' + lv + '/' + MAXLV + '</span></div>' +
        '<div style="font-size:10.5px;color:#9fb0d0;margin-top:1px;">' + esc(f.desc) + ' 단계당 +' + f.per + '%</div>' +
        '<div style="margin-top:4px;">' + pips + (lv ? '<span style="font-size:10.5px;color:#9dffb0;font-weight:900;margin-left:4px;">현재 +' + (lv * f.per) + '%</span>' : '') + '</div></div>' +
        '<button data-f="' + f.id + '" style="flex-shrink:0;padding:9px 10px;border:none;border-radius:11px;color:#fff;font-size:11.5px;font-weight:900;cursor:pointer;line-height:1.4;' + FONT + 'background:' + (maxed ? 'rgba(255,255,255,.1)' : can ? 'linear-gradient(135deg,#ff6b9d,#c084fc)' : 'rgba(255,255,255,.12)') + ';">' +
        (maxed ? '최대' : '🍔 ' + fmt(p / 10000) + '만<br>투자') + '</button></div>';
    }).join('');
    ov.innerHTML = '<div style="background:#14213d;border:1.5px solid #ffd76a;border-radius:18px;width:100%;max-width:380px;max-height:90vh;display:flex;flex-direction:column;color:#fff;' + FONT + '">' +
      '<div style="padding:14px 16px 8px;display:flex;align-items:center;"><div style="font-size:16px;font-weight:900;">🏢 그룹 투자</div>' +
      '<button id="gi-x" style="margin-left:auto;border:none;border-radius:10px;background:rgba(255,255,255,.1);color:#fff;padding:6px 12px;font-size:12px;font-weight:900;cursor:pointer;' + FONT + '">닫기</button></div>' +
      '<div style="padding:0 14px 16px;overflow-y:auto;-webkit-overflow-scrolling:touch;">' +
      '<div style="font-size:11.5px;color:#cfe;margin-bottom:10px;line-height:1.6;">시설에 투자하면 <b>그룹 활동 보상이 영구로</b> 올라가요. 내 코인: <b style="color:#ffe08a;">🍔 ' + fmt(money()) + '</b></div>' + rows + '</div></div>';
    ov.querySelector('#gi-x').onclick = function () { ov.remove(); };
    Array.prototype.forEach.call(ov.querySelectorAll('[data-f]'), function (b) {
      b.onclick = function () {
        var f = FAC.filter(function (x) { return x.id === b.getAttribute('data-f'); })[0], lv = lvOf(f.id);
        if (lv >= MAXLV) return;
        var p = price(f, lv);
        if (money() < p) { toast('코인이 모자라요 (🍔 ' + fmt(p) + ' 필요)'); return; }
        spend(p); var s = load(); s.lv[f.id] = lv + 1; save(s);
        toast(f.icon + ' ' + f.name + ' Lv.' + (lv + 1) + ' 투자 완료!');
        try { if (typeof checkTitles === 'function') checkTitles(); } catch (e) {}
        render();
      };
    });
  }
  function open() {
    if (document.getElementById('gi-ov')) return;
    var ov = document.createElement('div'); ov.id = 'gi-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:' + Z + ';background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;padding:12px;';
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    document.body.appendChild(ov); render();
  }
  // 그룹 화면에 버튼 붙이기
  function attach() {
    var ed = document.getElementById('grp-edit');
    if (!ed || document.getElementById('gi-btn')) return;
    var row = ed.parentNode, b = document.createElement('button');
    b.id = 'gi-btn';
    b.style.cssText = 'width:100%;margin-top:8px;padding:12px;border:none;border-radius:12px;color:#fff;font-size:13px;font-weight:900;cursor:pointer;background:linear-gradient(135deg,#d99a1e,#ff7a59);' + FONT;
    b.textContent = '🏢 그룹 투자 (보상 영구 UP)';
    b.onclick = open;
    row.parentNode.insertBefore(b, row);
  }

  // ── 👀 눈에 보이는 효과 ──
  // ① 소속사 등급 (투자 단계 합계 0~30): 그룹 화면 맨 위에 배지로 보임
  var RANKS = [[0, '무소속', '#9fb0d0'], [1, '신생 기획사', '#8fd3ff'], [8, '중견 기획사', '#9dffb0'], [16, '대형 기획사', '#ffd76a'], [24, '엔터 거물', '#ff9ec4'], [30, '엔터 제국', '#ffe45c']];
  function total() { var t = 0; FAC.forEach(function (f) { t += lvOf(f.id); }); return t; }
  function rank() { var t = total(), r = RANKS[0]; RANKS.forEach(function (x) { if (t >= x[0]) r = x; }); return { name: r[1], color: r[2], total: t, max: FAC.length * MAXLV }; }
  // ② 지금 활동에 붙는 시설 효과 (연출 화면에서 칩으로 보임)
  function badges(actId) {
    var out = [];
    FAC.forEach(function (f) { var lv = lvOf(f.id); if (lv > 0 && (!f.acts || f.acts.indexOf(actId) !== -1)) out.push({ icon: f.icon, name: f.name, lv: lv, pct: lv * f.per }); });
    return out;
  }
  // ③ 칭호: 소속사 등급별 + 시설 최대 단계별 (더보기 > 칭호에서 장착)
  var FAC_TITLE = { studio: '레코딩의 제왕', practice: '무대의 지배자', shoot: '카메라의 연인', setpark: '예능 제작자', dorm: '멤버들의 집주인', tour: '월드투어 총괄' };
  function addTitles(n) {
    try {
      if (typeof TITLES !== 'undefined' && Array.isArray(TITLES)) {
        var have = function (id) { return TITLES.some(function (t) { return t.id === id; }); };
        RANKS.forEach(function (r, i) {
          if (!r[0]) return;
          var id = 'gi_rank_' + r[0];
          if (!have(id)) TITLES.push({ id: id, cat: '🏢 그룹', name: '그룹 투자 ' + r[0] + '단계 달성', title: r[1] + ' 대표', cond: function () { return total() >= r[0]; } });
        });
        FAC.forEach(function (f) {
          var id = 'gi_max_' + f.id;
          if (!have(id)) TITLES.push({ id: id, cat: '🏢 그룹', name: f.name + ' 최대 투자', title: FAC_TITLE[f.id] || f.name, cond: function () { return lvOf(f.id) >= MAXLV; } });
        });
        return;
      }
    } catch (e) {}
    if (n < 100) setTimeout(function () { addTitles(n + 1); }, 200);
  }
  addTitles(0);
  function attachBadge() {
    var ov = document.getElementById('grp-ov'); if (!ov || !document.getElementById('grp-edit')) { var o = document.getElementById('gi-badge'); if (o && !document.getElementById('grp-edit')) o.remove(); return; }
    if (document.getElementById('gi-badge')) return;
    var body = ov.firstElementChild && ov.firstElementChild.children[1]; if (!body) return;
    var r = rank(), chips = FAC.map(function (f) {
      var lv = lvOf(f.id), on = lv > 0, mx = lv >= MAXLV;
      return '<div style="display:flex;flex-direction:column;align-items:center;min-width:42px;padding:5px 4px;border-radius:10px;background:' + (on ? 'rgba(255,215,106,.12)' : 'rgba(255,255,255,.05)') + ';border:1.5px solid ' + (mx ? '#ffe45c' : on ? 'rgba(255,215,106,.45)' : 'rgba(255,255,255,.1)') + ';' + (mx ? 'box-shadow:0 0 10px #ffe45c88;' : '') + '">' +
        '<div style="font-size:20px;line-height:1;' + (on ? '' : 'filter:grayscale(1);opacity:.4;') + '">' + f.icon + '</div>' +
        '<div style="font-size:9.5px;font-weight:900;margin-top:2px;color:' + (mx ? '#ffe45c' : on ? '#ffe08a' : '#6f7f9f') + ';">' + (mx ? 'MAX' : 'Lv.' + lv) + '</div></div>';
    }).join('');
    var d = document.createElement('div'); d.id = 'gi-badge';
    d.style.cssText = 'margin-bottom:10px;padding:9px 10px;border-radius:14px;background:linear-gradient(135deg,rgba(255,215,106,.10),rgba(255,122,89,.10));border:1.5px solid ' + r.color + '66;' + FONT;
    d.innerHTML = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;"><div style="font-size:13px;font-weight:900;color:' + r.color + ';">🏢 ' + r.name + '</div><div style="font-size:10.5px;color:#9fb0d0;margin-left:auto;">투자 ' + r.total + '/' + r.max + '</div></div>' +
      '<div style="display:flex;gap:5px;justify-content:space-between;">' + chips + '</div>';
    body.insertBefore(d, body.firstChild);
  }
  setInterval(attachBadge, 500);
  setInterval(attach, 700);
  window.__groupInvest = { mult: mult, FAC: FAC, lvOf: lvOf, open: open, price: price, rank: rank, badges: badges, total: total };
})();
