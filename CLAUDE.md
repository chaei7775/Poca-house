# 포카하우스 작업 규칙

- 새 기능은 새 `.js` 파일로 만들고 `loader.js` 의 `NEW_CONTENT_FILES` 배열에 파일명을 추가한다.
- `NEW_CONTENT_FILES` 의 파일을 고치거나 추가/삭제했으면 커밋 전에 꼭 `python3 build-bundle.py` 를 실행해서 `bundle.json` 과 `loader.js` 의 `BUNDLE_V` 를 같이 커밋한다. (게임은 bundle.json 하나로 받아 배열 순서대로 실행함. 안 갱신하면 수정이 반영 안 됨)
- 커밋 메시지 끝에 Co-Authored-By / Claude-Session 줄. 푸시 전 `git pull --rebase origin main`.
- 사용자(채이)는 코딩 경험 없음, 모바일로 확인. 답변은 짧은 반말.
