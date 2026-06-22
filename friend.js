// ════════════════════════════════
// 👥 친구 시스템 (닉네임 검색 → 신청 → 수락)
// ════════════════════════════════

function escapeFriendHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>'"]/g, function(c) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c];
  });
}

async function openFriendOverlay() {
  if (!window.pocaLoggedInUid) {
    showBagToast('로그인해야 친구 기능을 쓸 수 있어요! (더보기 → 계정)');
    return;
  }
  const old = document.getElementById('friend-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'friend-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:970;background:#1a1a2e;display:flex;flex-direction:column;';

  overlay.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;">' +
    '<div style="color:#fff;font-size:16px;font-weight:900;">👥 친구</div>' +
    '<button onclick="document.getElementById(\'friend-overlay\').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;">닫기</button>' +
    '</div>' +
    '<div style="padding:14px 16px;flex-shrink:0;display:flex;gap:8px;">' +
    '<input id="friend-search-input" type="text" placeholder="닉네임으로 검색" style="flex:1;padding:11px;border:none;border-radius:10px;font-size:14px;font-family:\'Noto Sans KR\',sans-serif;">' +
    '<button onclick="searchFriendByNickname()" style="background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:10px;color:#fff;padding:11px 16px;font-size:13px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">검색</button>' +
    '</div>' +
    '<div id="friend-search-result" style="padding:0 16px;"></div>' +
    '<div id="friend-list-area" style="flex:1;overflow-y:auto;padding:8px 16px 30px;"><div style="color:#888;text-align:center;padding:30px 0;font-size:13px;">불러오는 중...</div></div>';

  document.body.appendChild(overlay);
  await loadFriendData();
}

async function loadFriendData() {
  const area = document.getElementById('friend-list-area');
  if (!window.pocaFirebaseReady || !window.pocaFirebase || !window.pocaLoggedInUid) {
    if (area) area.innerHTML = '<div style="color:#888;text-align:center;padding:30px 0;font-size:13px;">서버 연결을 기다리는 중...</div>';
    return;
  }
  const { db, doc, getDoc } = window.pocaFirebase;
  try {
    const mySnap = await getDoc(doc(db, 'users', window.pocaLoggedInUid));
    const myData = mySnap.exists() ? mySnap.data() : {};
    const friends = Array.isArray(myData.friends) ? myData.friends : [];
    const incoming = Array.isArray(myData.incomingRequests) ? myData.incomingRequests : [];

    let html = '';

    if (incoming.length > 0) {
      html += '<div style="font-size:12px;font-weight:900;color:#FFD700;margin:10px 0 8px;">📩 받은 친구신청 (' + incoming.length + ')</div>';
      for (const uid of incoming) {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) continue;
        const d = snap.data();
        html += friendRowHtml(d, uid, 'request');
      }
    }

    html += '<div style="font-size:12px;font-weight:900;color:#FFB3CC;margin:14px 0 8px;">💖 내 친구 (' + friends.length + ')</div>';
    if (friends.length === 0) {
      html += '<div style="color:#888;text-align:center;padding:20px 0;font-size:13px;">아직 친구가 없어요. 닉네임으로 검색해서 추가해보세요!</div>';
    } else {
      for (const uid of friends) {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) continue;
        const d = snap.data();
        html += friendRowHtml(d, uid, 'friend');
      }
    }

    area.innerHTML = html;
  } catch (err) {
    area.innerHTML = '<div style="color:#ff6b6b;text-align:center;padding:30px 0;font-size:13px;">불러오기 실패: ' + (err.code || err.message) + '</div>';
  }
}

function friendRowHtml(d, uid, mode) {
  const nick = escapeFriendHtml(d.nickname || '플레이어');
  const lv = d.playerLevel || 1;
  const cardCount = Array.isArray(d.owned) ? d.owned.length : 0;
  let actionHtml = '';
  if (mode === 'request') {
    actionHtml = '<div style="display:flex;gap:6px;">' +
      '<button onclick="acceptFriendRequest(\'' + uid + '\')" style="background:#FF6B9D;border:none;border-radius:8px;color:#fff;padding:6px 10px;font-size:11px;font-weight:900;cursor:pointer;">수락</button>' +
      '<button onclick="rejectFriendRequest(\'' + uid + '\')" style="background:rgba(255,255,255,0.1);border:none;border-radius:8px;color:#aaa;padding:6px 10px;font-size:11px;cursor:pointer;">거절</button>' +
      '</div>';
  } else if (mode === 'search') {
    actionHtml = '<button onclick="sendFriendRequest(\'' + uid + '\',\'' + nick.replace(/'/g, "\\'") + '\')" style="background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:8px;color:#fff;padding:6px 12px;font-size:11px;font-weight:900;cursor:pointer;">친구신청</button>';
  } else if (mode === 'friend') {
    actionHtml = '<button onclick="removeFriend(\'' + uid + '\')" style="background:none;border:none;color:#888;font-size:11px;cursor:pointer;">삭제</button>';
  }
  return '<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.06);border-radius:12px;padding:11px 13px;margin-bottom:8px;">' +
    '<div><div style="font-size:13px;font-weight:900;color:#fff;">' + nick + '</div>' +
    '<div style="font-size:11px;color:#888;margin-top:2px;">Lv.' + lv + ' · 카드 ' + cardCount + '장</div></div>' +
    actionHtml + '</div>';
}

async function searchFriendByNickname() {
  const input = document.getElementById('friend-search-input');
  const resultEl = document.getElementById('friend-search-result');
  const nick = input ? input.value.trim() : '';
  if (!nick) return;
  if (!window.pocaFirebaseReady || !window.pocaFirebase) return;
  const { db, collection, getDocs, query, where } = window.pocaFirebase;
  resultEl.innerHTML = '<div style="color:#888;font-size:12px;padding:8px 0;">검색 중...</div>';
  try {
    const q = query(collection(db, 'users'), where('nickname', '==', nick));
    const snap = await getDocs(q);
    if (snap.empty) {
      resultEl.innerHTML = '<div style="color:#888;font-size:12px;padding:8px 0;">해당 닉네임을 찾을 수 없어요.</div>';
      return;
    }
    let html = '';
    snap.forEach(function(docSnap) {
      if (docSnap.id === window.pocaLoggedInUid) return;
      html += friendRowHtml(docSnap.data(), docSnap.id, 'search');
    });
    resultEl.innerHTML = html || '<div style="color:#888;font-size:12px;padding:8px 0;">본인은 검색되지 않아요.</div>';
  } catch (err) {
    resultEl.innerHTML = '<div style="color:#ff6b6b;font-size:12px;padding:8px 0;">검색 실패: ' + (err.code || err.message) + '</div>';
  }
}

async function sendFriendRequest(targetUid, nick) {
  if (!window.pocaFirebaseReady || !window.pocaFirebase) return;
  const { db, doc, updateDoc, arrayUnion } = window.pocaFirebase;
  try {
    await updateDoc(doc(db, 'users', targetUid), { incomingRequests: arrayUnion(window.pocaLoggedInUid) });
    showBagToast(nick + '에게 친구신청을 보냈어요!');
    const resultEl = document.getElementById('friend-search-result');
    if (resultEl) resultEl.innerHTML = '';
  } catch (err) {
    showBagToast('신청 실패: ' + (err.code || err.message));
  }
}

async function acceptFriendRequest(uid) {
  if (!window.pocaFirebaseReady || !window.pocaFirebase) return;
  const { db, doc, updateDoc, arrayUnion, arrayRemove } = window.pocaFirebase;
  try {
    await updateDoc(doc(db, 'users', window.pocaLoggedInUid), {
      friends: arrayUnion(uid),
      incomingRequests: arrayRemove(uid)
    });
    await updateDoc(doc(db, 'users', uid), { friends: arrayUnion(window.pocaLoggedInUid) });
    showBagToast('친구가 됐어요! 🎉');
    loadFriendData();
  } catch (err) {
    showBagToast('처리 실패: ' + (err.code || err.message));
  }
}

async function rejectFriendRequest(uid) {
  if (!window.pocaFirebaseReady || !window.pocaFirebase) return;
  const { db, doc, updateDoc, arrayRemove } = window.pocaFirebase;
  try {
    await updateDoc(doc(db, 'users', window.pocaLoggedInUid), { incomingRequests: arrayRemove(uid) });
    loadFriendData();
  } catch (err) {
    showBagToast('처리 실패: ' + (err.code || err.message));
  }
}

async function removeFriend(uid) {
  if (!confirm('친구를 삭제할까요?')) return;
  if (!window.pocaFirebaseReady || !window.pocaFirebase) return;
  const { db, doc, updateDoc, arrayRemove } = window.pocaFirebase;
  try {
    await updateDoc(doc(db, 'users', window.pocaLoggedInUid), { friends: arrayRemove(uid) });
    await updateDoc(doc(db, 'users', uid), { friends: arrayRemove(window.pocaLoggedInUid) });
    loadFriendData();
  } catch (err) {
    showBagToast('처리 실패: ' + (err.code || err.message));
  }
}

// ── 더보기 메뉴에 친구 타일 추가 ──
(function hookOpenMoreMenuForFriend() {
  if (typeof window.openMoreMenu !== 'function') {
    setTimeout(hookOpenMoreMenuForFriend, 50);
    return;
  }
  const originalOpenMoreMenu = window.openMoreMenu;
  window.openMoreMenu = function() {
    const result = originalOpenMoreMenu.apply(this, arguments);
    const overlay = document.getElementById('more-menu-overlay');
    if (overlay && !document.getElementById('more-menu-friend-btn')) {
      const grid = overlay.querySelector('#more-menu-grid');
      if (grid) {
        const btn = document.createElement('button');
        btn.id = 'more-menu-friend-btn';
        btn.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;aspect-ratio:0.95;padding:6px 4px;background:#FF6B9D1f;border:1.5px solid #FF6B9D;border-radius:12px;color:#fff;font-size:10px;font-weight:700;line-height:1.2;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:center;';
        btn.innerHTML = '<span style="font-size:19px;">👥</span><span>친구</span>';
        btn.onclick = function() { overlay.remove(); openFriendOverlay(); };
        grid.appendChild(btn);
      }
    }
    return result;
  };
})();
