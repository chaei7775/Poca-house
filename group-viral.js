// ════════════════════════════════
// 📱 그룹 활동 바이럴 (group-viral.js) — 활동이 터지면 SNS 실시간 트렌드·직캠이 돌아다니고 보상이 커진다
//  · 활동이 끝날 때마다 확률로 '바이럴' 발생 (대성공·높은 등급·그룹 투자·그룹 레벨이 높을수록 잘 터짐, 최대 50%)
//  · 보통 바이럴: 코인 ×1.5 · 인기도 +50% / 초대박(바이럴 중 25%): 코인 ×3 · 인기도 +150%
//  · 연출: 활동 연출 뒤, 결과창 전에 SNS 화면(트렌드 순위·직캠 조회수·팬 댓글)이 한 번 뜬다
//  · group.js 가 doActivity 에서 roll() 을, 결과창 전에 show() 를 부른다 (없으면 그냥 넘어감)
//  · A급(좋음) 이상일 때만 터짐 (MIN_TIER)
// ✏️ 고치는 법: BASE/CAP/MUL/MIN_TIER 숫자만
// ════════════════════════════════
(function () {
  'use strict';
  var BASE = 0.06, CAP = 0.5, BIG_ADD = 0.25, TIER_ADD = 0.04, INV_ADD = 0.004, LV_ADD = 0.01;
  var MEGA_RATE = 0.25, MUL = [1.5, 3], FAME_MUL = [0.5, 1.5];
  var MIN_TIER = 2;   // 바이럴은 이 등급 이상에서만 (0 C아쉬움 · 1 B보통 · 2 A좋음 · 3 S훌륭 · 4 SS최고)
  var KIND = {
    stage:   { ic: '🎥', t: '직캠', tag: '직캠' },
    dance:   { ic: '💃', t: '챌린지 영상', tag: '챌린지' },
    variety: { ic: '🤣', t: '예능 짤', tag: '짤' },
    photo:   { ic: '📸', t: '화보 직찍', tag: '화보' },
    album:   { ic: '🎧', t: '음원 역주행', tag: '음원' },
    drama:   { ic: '🎬', t: '명장면 클립', tag: '명장면' }
  };
  var COMMENTS = [
    '미쳤다 이거 보고 하루종일 돌려봄 ㅠㅠ', '직캠 조회수 실화냐 ㅋㅋㅋㅋ', '입덕했다 책임져라', '이 그룹 모르는 사람 없게 해줘야 한다',
    '친구 단톡방에 다 돌렸다 ㅋㅋ', '이건 못 참지 ㅠㅠ 또 봐도 또 좋아', '실검 1위 가자!!!', '이번 활동 진짜 레전드다', '캡처해서 프사 바꿈', '벌써 100번 봄 ㅋㅋㅋ'
  ];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // opt: { big, ng, tier(0~), fame(그룹 인기도) } → null(안 터짐) 또는 { mega, mul, famePlus, kind }
  function roll(act, members, opt) {
    opt = opt || {};
    if (opt.ng) return null;
    if ((opt.tier || 0) < MIN_TIER) return null;   // A급 미만은 바이럴 없음
    var p = BASE + (opt.big ? BIG_ADD : 0) + Math.max(0, opt.tier || 0) * TIER_ADD;
    try { if (window.__groupInvest) p += window.__groupInvest.total() * INV_ADD; } catch (e) {}
    try { var lv = 0; if (typeof opt.lv === 'number') lv = opt.lv; p += lv * LV_ADD; } catch (e) {}
    p = Math.min(CAP, p);
    if (Math.random() >= p) return null;
    var mega = Math.random() < MEGA_RATE, i = mega ? 1 : 0;
    return { mega: mega, mul: MUL[i], fameMul: FAME_MUL[i], kind: (act && act.id) || 'stage' };
  }

  function show(res, done) {
    var v = res && res.viral, ov = document.getElementById('grp-ov');
    if (!v || !ov) { done && done(); return; }
    try { if (window.pocaSfx) { window.pocaSfx.play('grpViral'); if (v.mega) setTimeout(function () { window.pocaSfx.play('grpBig'); }, 500); } } catch (e) {}
    var K = KIND[v.kind] || KIND.stage, mem = res.members || [], star = pick(mem) || mem[0];
    var gname = ''; try { gname = window.__groupTest.load().group.name; } catch (e) {}
    var views = rnd(18, 260) * (v.mega ? 6 : 1), shares = rnd(2, 40) * (v.mega ? 5 : 1), rank = v.mega ? 1 : rnd(2, 9);
    var face = star ? '<img src="face-' + esc(star) + '.png" alt="" width="64" height="64" style="width:64px;height:64px;border-radius:14px;object-fit:cover;flex:none;border:2px solid #ff9ecb;">' : '';
    var cm = [pick(COMMENTS), pick(COMMENTS), pick(COMMENTS)].map(function (t, i) {
      return '<div style="display:flex;gap:6px;padding:6px 0;border-top:1px solid rgba(255,255,255,.08);font-size:12px;line-height:1.5;"><span style="color:#ff9ecb;font-weight:900;flex:none;">@팬' + rnd(100, 999) + '</span><span style="color:#e9eefc;flex:1;">' + esc(t) + '</span><span style="color:#9fb0d0;flex:none;">♥' + rnd(20, 4000) + '</span></div>';
    }).join('');
    var p = document.createElement('div');
    p.id = 'grp-viral';
    p.style.cssText = 'position:absolute;inset:0;background:rgba(5,8,20,.88);display:flex;align-items:center;justify-content:center;padding:16px;z-index:3;font-family:inherit;';
    p.innerHTML = '<div style="background:linear-gradient(160deg,#1a1b3a,#2a1745);border:2px solid ' + (v.mega ? '#ffd76a' : '#ff9ecb') + ';border-radius:20px;padding:16px;max-width:330px;width:100%;color:#fff;box-shadow:0 0 28px ' + (v.mega ? '#ffd76a66' : '#ff9ecb55') + ';">' +
      '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">📱</span><span style="font-size:13px;font-weight:900;color:#9fd8ff;">실시간 트렌드</span><span style="margin-left:auto;font-size:11px;color:#ffb0c8;">LIVE ●</span></div>' +
      '<div style="margin:10px 0 8px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.07);">' +
        '<div style="font-size:11px;color:#9fb0d0;">지금 많이 보는 이야기</div>' +
        '<div style="font-size:15px;font-weight:900;margin-top:2px;"><span style="color:#ffd76a;">' + rank + '위</span> #' + esc(gname || '우리그룹') + '_' + K.tag + '</div></div>' +
      '<div style="display:flex;gap:10px;align-items:center;padding:8px 0;">' + face +
        '<div style="min-width:0;"><div style="font-size:14px;font-weight:900;">' + K.ic + ' ' + esc(star ? (function (c) { try { return CHARS[c].name; } catch (e) { return c; } })(star) : '') + ' ' + K.t + '</div>' +
        '<div style="font-size:12px;color:#cfd8ff;margin-top:2px;">조회수 <b style="color:#ffd76a;">' + views + '만</b> · 공유 ' + shares + '만</div></div></div>' +
      cm +
      '<div style="margin-top:10px;text-align:center;font-size:' + (v.mega ? '17' : '15') + 'px;font-weight:900;color:' + (v.mega ? '#ffd76a' : '#ff9ecb') + ';">' + (v.mega ? '🔥🔥 초대박 바이럴!! 🔥🔥' : '🔥 바이럴 터졌어요!') + '</div>' +
      '<div style="text-align:center;font-size:12px;color:#ffe08a;margin-top:2px;">코인 ×' + v.mul + ' · 인기도 +' + (v.famePlus || 0) + '</div>' +
      '<button id="grp-vok" style="margin-top:12px;width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#ff6b9d,#c084fc);color:#fff;font-size:14px;font-weight:900;font-family:inherit;cursor:pointer;">확인</button></div>';
    ov.appendChild(p);
    var closed = false, fin = function () { if (closed) return; closed = true; p.remove(); done && done(); };
    p.querySelector('#grp-vok').onclick = fin;
    setTimeout(fin, 12000);   // 안 눌러도 넘어감
  }
  window.__groupViral = { roll: roll, show: show, CFG: { BASE: BASE, CAP: CAP, MUL: MUL } };
})();
