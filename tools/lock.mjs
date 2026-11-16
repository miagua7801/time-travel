// 잠그기: node tools/lock.mjs
// private/의 평문과 음성을 content/의 잠긴 파일로 만든다. 먼저 check-content와 같은 점검을 한다.
// 열쇠는 private/vault.key에서 읽고, 없으면 새로 만든다. 열쇠의 내용은 찍지 않는다.
// private/ 자료를 고친 뒤에는 이 도구를 다시 실행하면 된다. 내용이 바뀌지 않은 파일은 그대로 남는다.
import fs from 'node:fs';
import path from 'node:path';
import { OUT, loadSources, build, packBytes, readKeyText, createKeyText, keyBytes, seal, open, sha256, lockedNames } from './lib.mjs';

let result;
try {
  result = build(loadSources());
} catch (e) {
  console.log('잠그기 중단: ' + e.message);
  process.exit(1);
}
if (result.errors.length) {
  for (const e of result.errors) console.log('오류: ' + e);
  console.log('잠그기 중단: 평문 자료에 오류 ' + result.errors.length + '개. node tools/check-content.mjs로 확인한다.');
  process.exit(1);
}
for (const w of result.warnings) console.log('주의: ' + w);

let keyText;
try {
  keyText = readKeyText();
} catch (e) {
  console.log('잠그기 중단: ' + e.message);
  process.exit(1);
}
if (keyText) console.log('열쇠: private/vault.key를 읽었다');
else {
  keyText = createKeyText();
  console.log('열쇠: 새로 만들어 private/vault.key에 두었다. 입구의 스크립트 속성 KEY에 이 파일의 내용을 넣는다');
}
const key = keyBytes(keyText);

// 평문 모으기
const plain = new Map();
plain.set('story.bin', Buffer.from(JSON.stringify(result.story), 'utf8'));
for (const p of result.packs) plain.set(p.name, packBytes(p.items));

// 잠가서 쓰기
fs.mkdirSync(OUT, { recursive: true });
const names = lockedNames();
const digests = [];
for (const name of names) {
  const sealed = seal(name, plain.get(name), key);
  const file = path.join(OUT, name);
  const before = fs.existsSync(file) ? fs.readFileSync(file) : null;
  const same = before !== null && before.equals(sealed);
  if (!same) fs.writeFileSync(file, sealed);
  digests.push(sha256(sealed));
  console.log((same ? '그대로 ' : before ? '바뀜   ' : '새로   ') + 'content/' + name + '  ' + (sealed.length / 1024).toFixed(0) + 'KB');
}

// 목록과 판 번호
const index = { v: sha256(Buffer.from(digests.join(''))).slice(0, 12), files: names };
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
console.log('content/index.json  판 ' + index.v);

// 쓰지 않는 잠긴 파일이 남아 있으면 알린다 (지우지는 않는다)
const stray = fs.readdirSync(OUT).filter((f) => f !== 'index.json' && !names.includes(f));
if (stray.length) console.log('주의: content/에 목록에 없는 파일이 있다: ' + stray.join(', '));

// 다시 풀어 평문과 같은지 확인
let ok = 0;
for (const name of names) {
  try {
    const back = open(name, fs.readFileSync(path.join(OUT, name)), key);
    if (sha256(back) === sha256(plain.get(name))) ok++;
    else console.log('오류: 풀린 내용이 평문과 다르다: ' + name);
  } catch (e) {
    console.log('오류: 풀리지 않는다: ' + name);
  }
}
console.log('풀림 확인 ' + ok + '/' + names.length);
if (ok !== names.length) process.exit(1);
