// ════════════════════════════════
// ☁️ 계정 시스템 (회원가입/로그인 + 데이터 동기화)
// ════════════════════════════════

// ── 최초 접속 온보딩 (회원가입/로그인 vs 게스트로 시작) ──
function openOnboardingOverlay() {
  if (document.getElementById('onboarding-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1001;background:linear-gradient(135deg,#FF6B9D,#C084FC);display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = '<div style="width:100%;max-width:340px;background:#fff;border-radius:22px;padding:28px 22px;text-align:center;">' +
    '<div style="font-size:48px;margin-bottom:10px;">🌸</div>' +
    '<div style="font-size:18px;font-weight:900;color:#222;margin-bottom:6px;">포카하우스에 오신걸 환영해요!</div>' +
    '<div style="font-size:13px;color:#888;margin-bottom:20px;">계정을 만들면 캐시를 지워도, 기기를 바꿔도 데이터가 안전하게 보관돼요</div>' +
    '<button onclick="document.getElementById(\'onboarding-overlay\').remove();openAuthOverlay();" style="width:100%;padding:14px;margin-bottom:10px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:14px;color:#fff;font-size:15px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">☁️ 회원가입 / 로그인</button>' +
    '<button onclick="document.getElementById(\'onboarding-overlay\').remove();const p=document.getElementById(\'nickname-popup\');if(p)p.style.display=\'flex\';" style="width:100%;padding:12px;background:#f3f3f3;border:none;border-radius:14px;color:#666;font-size:13px;font-weight:700;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">게스트로 시작하기</button>' +
    '</div>';
  document.body.appendChild(overlay);
}

(function hookCheckNicknameForOnboarding() {
  if (typeof window.checkNickname !== 'function') {
    setTimeout(hookCheckNicknameForOnboarding, 50);
    return;
  }
  const originalCheckNickname = window.checkNickname;
  window.checkNickname = function() {
    const nick = localStorage.getItem('ph_nickname');
    if (!nick) {
      openOnboardingOverlay();
      return;
    }
    return originalCheckNickname.apply(this, arguments);
  };
})();

// Firebase Auth 준비되면 로그인 상태 추적
(function watchAuthState() {
  if (!window.pocaAuth) {
    setTimeout(watchAuthState, 100);
    return;
  }
  const { auth, onAuthStateChanged } = window.pocaAuth;
  onAuthStateChanged(auth, function(user) {
    if (user) {
      window.pocaLoggedInUid = user.uid;
      window.pocaLoggedInEmail = user.email;
    } else {
      window.pocaLoggedInUid = null;
      window.pocaLoggedInEmail = null;
    }
    updateAuthOverlayStatus();
  });
})();

// ── 서버 데이터를 로컬(localStorage)에 복원 ──
function restorePocaDataFromServer(data) {
  if (!data) return;
  if (data.nickname) localStorage.setItem('ph_nickname', data.nickname);
  if (typeof data.coins === 'number') localStorage.setItem('ph_coins', data.coins);
  if (Array.isArray(data.owned)) localStorage.setItem('ph_owned', JSON.stringify(data.owned));
  if (data.cardCounts) localStorage.setItem('ph_cardCounts', JSON.stringify(data.cardCounts));
  if (typeof data.bagSlots === 'number') localStorage.setItem('ph_bagSlots', data.bagSlots);
  if (Array.isArray(data.bagItems)) localStorage.setItem('ph_bagItems', JSON.stringify(data.bagItems));
  if (data.inventory) localStorage.setItem('ph_inventory', JSON.stringify(data.inventory));
  if (typeof data.wishFragments === 'number') localStorage.setItem('ph_wish', data.wishFragments);
  if (typeof data.stamina === 'number') localStorage.setItem('ph_stamina', data.stamina);
  if (data.currentRoom) localStorage.setItem('ph_currentRoom', data.currentRoom);
  if (data.affection) localStorage.setItem('ph_affection', JSON.stringify(data.affection));
  if (Array.isArray(data.ownedRooms)) localStorage.setItem('ph_ownedRooms', JSON.stringify(data.ownedRooms));
  if (Array.isArray(data.hints)) localStorage.setItem('ph_hints', JSON.stringify(data.hints));
  if (Array.isArray(data.learnedSkills)) localStorage.setItem('ph_learnedSkills', JSON.stringify(data.learnedSkills));
  if (typeof data.albaDone === 'number') localStorage.setItem('ph_alba', data.albaDone);
  if (typeof data.playerLevel === 'number') localStorage.setItem('ph_playerLevel', data.playerLevel);
  if (typeof data.playerExp === 'number') localStorage.setItem('ph_playerExp', data.playerExp);
  if (data.cardLevels) localStorage.setItem('ph_cardLevels', JSON.stringify(data.cardLevels));
  if (data.cardExpData) localStorage.setItem('ph_cardExp', JSON.stringify(data.cardExpData));
  if (data.storyProgress) localStorage.setItem('ph_storyProgress', JSON.stringify(data.storyProgress));
}

// ── 회원가입 ──
// ── 닉네임 중복 체크 (Firestore users 컬렉션 조회) ──
async function checkNicknameUnique(nick, excludeUid) {
  if (!window.pocaFirebaseReady || !window.pocaFirebase) return false; // 서버 연결 안 되면 그냥 통과시킴
  const { db, collection, getDocs, query, where } = window.pocaFirebase;
  try {
    const q = query(collection(db, 'users'), where('nickname', '==', nick));
    const snap = await getDocs(q);
    let taken = false;
    snap.forEach(function(d) {
      if (d.id !== excludeUid) taken = true;
    });
    return taken;
  } catch (err) {
    return false; // 체크 실패해도 막지 않음 (사용성 우선)
  }
}

async function pocaSignup(email, pw) {
  if (!window.pocaAuth || !window.pocaFirebaseReady) {
    pocaAuthMessage('서버 연결을 기다리는 중이에요. 잠시 후 다시 시도해주세요.', true);
    return;
  }
  const nickInput = document.getElementById('auth-nickname');
  const nick = nickInput ? nickInput.value.trim() : '';
  if (!nick || nick.length < 2) {
    pocaAuthMessage('닉네임을 2자 이상 입력해주세요.', true);
    return;
  }
  const taken = await checkNicknameUnique(nick);
  if (taken) {
    pocaAuthMessage('이미 사용 중인 닉네임이에요.', true);
    return;
  }
  const { auth, createUserWithEmailAndPassword } = window.pocaAuth;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    window.pocaLoggedInUid = cred.user.uid;
    window.pocaLoggedInEmail = cred.user.email;
    localStorage.setItem('ph_nickname', nick);
    const topbarNick = document.getElementById('topbar-nick');
    if (topbarNick) topbarNick.textContent = nick;
    // 지금까지 모은 데이터를 새 계정으로 백업
    if (typeof savePocaUserToServer === 'function') {
      await savePocaUserToServer('signup');
    }
    pocaAuthMessage('회원가입 완료! 지금 데이터가 계정에 저장됐어요 🎉');
    updateAuthOverlayStatus();
    const onboard = document.getElementById('onboarding-overlay');
    if (onboard) onboard.remove();
    const nickPopup = document.getElementById('nickname-popup');
    if (nickPopup) nickPopup.style.display = 'none';
    if (typeof checkAttendance === 'function') checkAttendance();
  } catch (err) {
    pocaAuthMessage(pocaAuthErrorText(err), true);
  }
}

// ── 로그인 ──
async function pocaLogin(email, pw) {
  if (!window.pocaAuth || !window.pocaFirebaseReady) {
    pocaAuthMessage('서버 연결을 기다리는 중이에요. 잠시 후 다시 시도해주세요.', true);
    return;
  }
  const { auth, signInWithEmailAndPassword } = window.pocaAuth;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    window.pocaLoggedInUid = cred.user.uid;
    window.pocaLoggedInEmail = cred.user.email;
    const { db, doc, getDoc } = window.pocaFirebase;
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (snap.exists()) {
      restorePocaDataFromServer(snap.data());
      pocaAuthMessage('불러왔어요! 잠시 후 새로고침됩니다 ✨');
      setTimeout(function() { location.reload(); }, 1200);
    } else {
      pocaAuthMessage('로그인 완료! (이 계정엔 저장된 데이터가 아직 없어요)');
      updateAuthOverlayStatus();
    }
  } catch (err) {
    pocaAuthMessage(pocaAuthErrorText(err), true);
  }
}

// ── 로그아웃 ──
async function pocaLogout() {
  if (!window.pocaAuth) return;
  const { auth, signOut } = window.pocaAuth;
  try {
    await signOut(auth);
    window.pocaLoggedInUid = null;
    window.pocaLoggedInEmail = null;
    pocaAuthMessage('로그아웃 됐어요. (이 기기에 저장된 게임 진행은 그대로 남아있어요)');
    updateAuthOverlayStatus();
  } catch (err) {
    pocaAuthMessage(pocaAuthErrorText(err), true);
  }
}

function pocaAuthErrorText(err) {
  const code = err && err.code || '';
  if (code.includes('email-already-in-use')) return '이미 가입된 이메일이에요. 로그인을 시도해보세요.';
  if (code.includes('invalid-email')) return '이메일 형식을 확인해주세요.';
  if (code.includes('weak-password')) return '비밀번호는 6자 이상이어야 해요.';
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return '비밀번호가 맞지 않아요.';
  if (code.includes('user-not-found')) return '가입되지 않은 이메일이에요.';
  return '오류가 발생했어요: ' + code;
}

function pocaAuthMessage(text, isError) {
  const el = document.getElementById('auth-message');
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? '#ff6b6b' : '#4ade80';
}

function updateAuthOverlayStatus() {
  const statusEl = document.getElementById('auth-status');
  if (!statusEl) return;
  if (window.pocaLoggedInUid) {
    statusEl.innerHTML = '✅ <b>' + (window.pocaLoggedInEmail || '계정') + '</b>로 로그인됨';
  } else {
    statusEl.innerHTML = '게스트로 플레이 중 (로그인하면 데이터가 안전하게 백업돼요)';
  }
}

// ── 계정 오버레이 UI ──
function openAuthOverlay() {
  const old = document.getElementById('auth-overlay');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = '<div style="width:100%;max-width:360px;background:#fff;border-radius:20px;padding:22px 20px;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
    '<div style="font-size:17px;font-weight:900;color:#222;">☁️ 계정</div>' +
    '<button onclick="document.getElementById(\'auth-overlay\').remove()" style="background:#f3f3f3;border:none;border-radius:8px;color:#666;padding:6px 12px;cursor:pointer;">닫기</button></div>' +
    '<div id="auth-status" style="font-size:12px;color:#9333ea;font-weight:700;margin-bottom:14px;"></div>' +
    '<input id="auth-nickname" type="text" placeholder="닉네임 (회원가입 시, 2-8자)" maxlength="8" style="width:100%;padding:12px;border:1.5px solid #eee;border-radius:10px;font-size:14px;margin-bottom:8px;font-family:\'Noto Sans KR\',sans-serif;">' +
    '<input id="auth-email" type="email" placeholder="이메일" style="width:100%;padding:12px;border:1.5px solid #eee;border-radius:10px;font-size:14px;margin-bottom:8px;font-family:\'Noto Sans KR\',sans-serif;">' +
    '<input id="auth-pw" type="password" placeholder="비밀번호 (6자 이상)" style="width:100%;padding:12px;border:1.5px solid #eee;border-radius:10px;font-size:14px;margin-bottom:12px;font-family:\'Noto Sans KR\',sans-serif;">' +
    '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
    '<button onclick="pocaSignup(document.getElementById(\'auth-email\').value.trim(),document.getElementById(\'auth-pw\').value)" style="flex:1;padding:12px;background:linear-gradient(135deg,#FF6B9D,#C084FC);border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">회원가입</button>' +
    '<button onclick="pocaLogin(document.getElementById(\'auth-email\').value.trim(),document.getElementById(\'auth-pw\').value)" style="flex:1;padding:12px;background:#9333ea;border:none;border-radius:12px;color:#fff;font-size:14px;font-weight:900;cursor:pointer;font-family:\'Noto Sans KR\',sans-serif;">로그인</button></div>' +
    '<button onclick="pocaLogout()" style="width:100%;padding:10px;background:#f3f3f3;border:none;border-radius:10px;color:#666;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:10px;font-family:\'Noto Sans KR\',sans-serif;">로그아웃</button>' +
    '<div id="auth-message" style="font-size:12px;text-align:center;min-height:16px;"></div>' +
    '</div>';
  document.body.appendChild(overlay);
  updateAuthOverlayStatus();
}
