// 열쇠 점검: node tools/key-check.mjs
// private/vault.key의 '지문'(SHA-256 앞 8자)을 찍는다. 열쇠 자체는 찍지 않는다.
// 입구 Apps Script 편집기에서 checkKey()를 실행해 나온 지문과 같아야 한다.
// 함께 content/story.bin이 이 열쇠로 풀리는지도 본다.
import fs from 'node:fs';
import path from 'node:path';
import { OUT, readKeyText, keyBytes, open, sha256 } from './lib.mjs';

let text;
try { text = readKeyText(); } catch (e) { console.log(e.message); process.exit(1); }
if (!text) { console.log('private/vault.key가 없다. node tools/lock.mjs를 먼저 실행한다.'); process.exit(1); }
console.log('열쇠 지문 ' + sha256(Buffer.from(text, 'utf8')).slice(0, 8));

const file = path.join(OUT, 'story.bin');
if (fs.existsSync(file)) {
  try { open('story.bin', fs.readFileSync(file), keyBytes(text)); console.log('content/story.bin: 이 열쇠로 풀림'); } catch (e) { console.log('content/story.bin: 이 열쇠로 풀리지 않음'); process.exit(1); }
}
