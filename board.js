// ════════════════════════════════
// 📋 자유게시판
// ════════════════════════════════

function timeAgoText(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diffMs = Date.now() - date.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return min + '분 전';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + '시간 전';
  const day = Math.floor(hr / 24);
  if (day < 7) return day + '일 전';
  return date.getMonth() + 1 + '월 ' + date.getDate() + '일';
}

function escapeBoardHtml(v) {
  return String(v == null ? '' : v).replace(/[&<>'"]/g, function(c) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'})[c];
  });
}

async function openBoardOverlay() {
  const old = document.getElementById('board-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'board-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:970;background:#1a1a2e;display:flex;flex-direction:column;';

  overlay.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;">' +
    '<div style="color:#fff;font-size:16px;font-weight:900;">📋 게시판</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<button onclick="openBoardWritePopup()" style="background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:10px;color:#fff;padding:7px 14px;font-size:13px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">✏️ 글쓰기</button>' +
    '<button onclick="document.getElementById(\'board-overlay\').remove()" style="background:rgba(255,255,255,0.1);border:none;border-radius:10px;color:#fff;padding:7px 12px;cursor:pointer;">닫기</button>' +
    '</div></div>' +
    '<div id="board-post-list" style="flex:1;overflow-y:auto;padding:14px 16px 30px;"><div style="color:#888;text-align:center;padding:40px 0;font-size:13px;">불러오는 중...</div></div>';

  document.body.appendChild(overlay);
  await loadBoardPosts();
}

async function loadBoardPosts() {
  const listEl = document.getElementById('board-post-list');
  if (!window.pocaFirebaseReady || !window.pocaFirebase) {
    if (listEl) listEl.innerHTML = '<div style="color:#888;text-align:center;padding:40px 0;font-size:13px;">서버 연결을 기다리는 중...</div>';
    return;
  }
  const { db, collection, getDocs, query, orderBy, limit } = window.pocaFirebase;
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) {
      listEl.innerHTML = '<div style="color:#888;text-align:center;padding:40px 0;font-size:13px;">아직 글이 없어요. 첫 글을 써볼까요? ✏️</div>';
      return;
    }
    const myUid = window.pocaLoggedInUid;
    let html = '';
    snap.forEach(function(docSnap) {
      const p = docSnap.data();
      const id = docSnap.id;
      const liked = Array.isArray(p.likedBy) && myUid && p.likedBy.indexOf(myUid) !== -1;
      const likeCount = Array.isArray(p.likedBy) ? p.likedBy.length : 0;
      const isMine = myUid && p.uid === myUid;
      html += '<div style="background:rgba(255,255,255,0.06);border-radius:14px;padding:14px;margin-bottom:10px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
        '<div style="font-size:12px;font-weight:900;color:#FFB3CC;">' + escapeBoardHtml(p.nickname || '익명') + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
        '<div style="font-size:11px;color:#888;">' + timeAgoText(p.createdAt) + '</div>' +
        (isMine ? '<button onclick="deleteBoardPost(\'' + id + '\')" style="background:none;border:none;color:#888;font-size:11px;cursor:pointer;">삭제</button>' : '') +
        '</div></div>' +
        '<div style="font-size:14px;color:#fff;line-height:1.5;margin-bottom:10px;white-space:pre-wrap;word-break:break-word;">' + escapeBoardHtml(p.content) + '</div>' +
        '<button onclick="toggleBoardLike(\'' + id + '\')" style="background:none;border:none;cursor:pointer;font-size:13px;color:' + (liked ? '#FF6B9D' : '#888') + ';font-weight:900;">' + (liked ? '💖' : '🤍') + ' ' + likeCount + '</button>' +
        '</div>';
    });
    listEl.innerHTML = html;
  } catch (err) {
    listEl.innerHTML = '<div style="color:#ff6b6b;text-align:center;padding:40px 0;font-size:13px;">불러오기에 실패했어요: ' + (err.code || err.message) + '</div>';
  }
}

function openBoardWritePopup() {
  if (!window.pocaLoggedInUid) {
    showBagToast('로그인해야 글을 쓸 수 있어요! (더보기 → 계정)');
    return;
  }
  const old = document.getElementById('board-write-popup');
  if (old) old.remove();
  const popup = document.createElement('div');
  popup.id = 'board-write-popup';
  popup.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;';
  popup.onclick = function(e) { if (e.target === popup) popup.remove(); };
  popup.innerHTML = '<div style="width:100%;max-width:360px;background:#fff;border-radius:18px;padding:18px;">' +
    '<div style="font-size:15px;font-weight:900;color:#222;margin-bottom:10px;">✏️ 새 글쓰기</div>' +
    '<textarea id="board-write-text" placeholder="무슨 이야기를 나눠볼까요?" maxlength="500" style="width:100%;height:120px;border:1.5px solid #eee;border-radius:12px;padding:12px;font-size:14px;font-family:\'Noto Sans KR\',sans-serif;resize:none;margin-bottom:12px;"></textarea>' +
    '<div style="display:flex;gap:8px;">' +
    '<button onclick="document.getElementById(\'board-write-popup\').remove()" style="flex:1;padding:12px;background:#f3f3f3;border:none;border-radius:12px;color:#666;font-size:14px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">취소</button>' +
    '<button onclick="submitBoardPost()" style="flex:1;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">올리기</button>' +
    '</div></div>';
  document.body.appendChild(popup);
}

async function submitBoardPost() {
  const textEl = document.getElementById('board-write-text');
  const content = textEl ? textEl.value.trim() : '';
  if (!content) { showBagToast('내용을 입력해주세요!'); return; }
  if (!window.pocaFirebaseReady || !window.pocaFirebase || !window.pocaLoggedInUid) {
    showBagToast('로그인 상태를 확인해주세요!');
    return;
  }
  const { db, collection, addDoc, serverTimestamp } = window.pocaFirebase;
  const nick = localStorage.getItem('ph_nickname') || '플레이어';
  try {
    await addDoc(collection(db, 'posts'), {
      uid: window.pocaLoggedInUid,
      nickname: nick,
      content: content,
      likedBy: [],
      createdAt: serverTimestamp()
    });
    const popup = document.getElementById('board-write-popup');
    if (popup) popup.remove();
    showBagToast('글이 올라갔어요! 🎉');
    loadBoardPosts();
  } catch (err) {
    showBagToast('글 등록 실패: ' + (err.code || err.message));
  }
}

async function toggleBoardLike(postId) {
  if (!window.pocaLoggedInUid) { showBagToast('로그인해야 좋아요를 누를 수 있어요!'); return; }
  if (!window.pocaFirebaseReady || !window.pocaFirebase) return;
  const { db, doc, getDoc, updateDoc, arrayUnion, arrayRemove } = window.pocaFirebase;
  try {
    const ref = doc(db, 'posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const data = snap.data();
    const liked = Array.isArray(data.likedBy) && data.likedBy.indexOf(window.pocaLoggedInUid) !== -1;
    await updateDoc(ref, { likedBy: liked ? arrayRemove(window.pocaLoggedInUid) : arrayUnion(window.pocaLoggedInUid) });
    loadBoardPosts();
  } catch (err) {
    showBagToast('처리 실패: ' + (err.code || err.message));
  }
}

async function deleteBoardPost(postId) {
  if (!confirm('이 글을 삭제할까요?')) return;
  if (!window.pocaFirebaseReady || !window.pocaFirebase) return;
  const { db, doc, deleteDoc } = window.pocaFirebase;
  try {
    await deleteDoc(doc(db, 'posts', postId));
    showBagToast('삭제했어요.');
    loadBoardPosts();
  } catch (err) {
    showBagToast('삭제 실패: ' + (err.code || err.message));
  }
}

// ── 더보기 메뉴에 게시판 버튼 추가 ──
(function hookOpenMoreMenuForBoard() {
  if (typeof window.openMoreMenu !== 'function') {
    setTimeout(hookOpenMoreMenuForBoard, 50);
    return;
  }
  const originalOpenMoreMenu = window.openMoreMenu;
  window.openMoreMenu = function() {
    const result = originalOpenMoreMenu.apply(this, arguments);
    const overlay = document.getElementById('more-menu-overlay');
    if (overlay && !document.getElementById('more-menu-board-btn')) {
      const list = overlay.querySelector('div > div:last-child');
      if (list) {
        const btn = document.createElement('button');
        btn.id = 'more-menu-board-btn';
        btn.style.cssText = 'display:flex;align-items:center;gap:12px;padding:14px;background:rgba(96,165,250,0.12);border:1.5px solid #60A5FA;border-radius:14px;color:#fff;font-size:15px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;text-align:left;';
        btn.innerHTML = '<span style="font-size:24px;">📋</span> 게시판';
        btn.onclick = function() { overlay.remove(); openBoardOverlay(); };
        list.appendChild(btn);
      }
    }
    return result;
  };
})();
