#!/usr/bin/env python3
# 📦 신규 콘텐츠 묶음 만들기 (build-bundle.py)
# loader.js 의 NEW_CONTENT_FILES 에 적힌 파일을 순서대로 하나의 bundle.json 으로 묶는다.
# → 게임이 켜질 때 파일 100여 개를 따로 받지 않고 1번에 받아서, 정해진 순서대로 실행한다. (더보기 칸이 들쭉날쭉하던 원인 해결)
# ⚠️ NEW_CONTENT_FILES 의 파일을 고치거나 새로 추가한 뒤에는 꼭 이 스크립트를 한 번 돌려서 bundle.json 도 같이 올려야 한다:
#      python3 build-bundle.py
import json, re, hashlib, io, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = io.open('loader.js', encoding='utf-8').read()
m = re.search(r"NEW_CONTENT_FILES = \[([\s\S]*?)\];", src)
names = re.findall(r"'([^']+\.js)'", m.group(1))
files = []
for n in names:
    files.append([n, io.open(n, encoding='utf-8').read()])
blob = json.dumps({'files': files}, ensure_ascii=False, separators=(',', ':'))
h = hashlib.md5(blob.encode('utf-8')).hexdigest()[:10]
io.open('bundle.json', 'w', encoding='utf-8').write(blob)
src2 = re.sub(r"var BUNDLE_V = '[^']*';", "var BUNDLE_V = '%s';" % h, src)
if src2 != src:
    io.open('loader.js', 'w', encoding='utf-8').write(src2)
print('bundle.json: %d files, %d bytes, v=%s' % (len(files), len(blob.encode('utf-8')), h))
