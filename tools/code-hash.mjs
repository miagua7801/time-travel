// 장면 5 암호 → config.js에 넣을 해시
//   node tools/code-hash.mjs 2-1 낱말 2-2 낱말 …     반과 암호를 짝지어 적는다
//   node tools/code-hash.mjs --storyboard            private/스토리보드.md의 S8 표에서 읽는다
// 나온 줄을 data/config.js의 암호 해시 표에 붙인다. 암호 낱말은 찍지도, 파일에 남기지도 않는다.
// 해시: SHA-256("tt8:" + 반 + ":" + 대문자로 바꾼 암호). 웹앱의 S8이 같은 식으로 견준다.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PRIV } from './lib.mjs';

export function codeHash(cls, code) {
  return createHash('sha256').update('tt8:' + cls + ':' + String(code).trim().toUpperCase()).digest('hex');
}

const args = process.argv.slice(2);
let pairs = [];
if (args[0] === '--storyboard') {
  const board = path.join(PRIV, '스토리보드.md');
  if (!fs.existsSync(board)) { console.log('private/스토리보드.md가 없다'); process.exit(1); }
  pairs = [...fs.readFileSync(board, 'utf8').matchAll(/\b(\d-\d+) ([A-Z]{3,})\b/g)].map((m) => [m[1], m[2]]);
  if (!pairs.length) { console.log('스토리보드에서 반별 암호를 찾지 못했다'); process.exit(1); }
} else {
  if (!args.length || args.length % 2) {
    console.log('쓰는 법: node tools/code-hash.mjs 2-1 낱말 2-2 낱말 …   또는   node tools/code-hash.mjs --storyboard');
    process.exit(1);
  }
  for (let i = 0; i < args.length; i += 2) pairs.push([args[i], args[i + 1]]);
}

for (const [cls, code] of pairs) {
  if (!/^\d-\d+$/.test(cls)) { console.log('반 이름이 틀렸다: ' + cls); process.exit(1); }
  if (!/^[A-Za-z]+$/.test(code)) { console.log(cls + ': 암호는 영문 글자만 쓴다'); process.exit(1); }
}
const seen = new Set();
for (const [cls] of pairs) {
  if (seen.has(cls)) { console.log('같은 반이 두 번 있다: ' + cls); process.exit(1); }
  seen.add(cls);
}
for (const [cls, code] of pairs) console.log("  '" + cls + "': '" + codeHash(cls, code) + "',");
