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
  // acts: 효과가 붙는 활동(없으면 전체) / per: 단계당 +% / base: 1단계 가격
  var FAC = [
    { id: 'studio',  icon: '🎙️', name: '전용 녹음실',   desc: '음원 녹음 보상',            acts: ['album'],                per: 12, base: 300000000 },
    { id: 'practice',icon: '🪞', name: '단독 연습실',   desc: '합동 무대·댄스 챌린지 보상', acts: ['stage', 'dance'],       per: 10, base: 400000000 },
    { id: 'shoot',   icon: '🎬', name: '자체 촬영 스튜디오', desc: '화보·광고, 단체 드라마 보상', acts: ['photo', 'drama'],     per: 10, base: 400000000 },
    { id: 'setpark', icon: '📺', name: '예능 전용 세트장', desc: '단체 예능 보상',          acts: ['variety'],              per: 12, base: 300000000 },
    { id: 'dorm',    icon: '🏠', name: '그룹 단독 숙소', desc: '모든 활동 보상',            acts: null,                     per: 4,  base: 600000000 },
    { id: 'tour',    icon: '🌍', name: '월드투어 기획팀', desc: '모든 활동 보상 (엄청 비쌈)', acts: null,                     per: 6,  base: 1500000000 }
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
  setInterval(attach, 700);
  window.__groupInvest = { mult: mult, FAC: FAC, lvOf: lvOf, open: open, price: price };
})();
