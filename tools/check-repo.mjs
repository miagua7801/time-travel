// 커밋 전 점검: node tools/check-repo.mjs   (겹친 낱말 묶음까지 보려면 --show)
// 커밋 대상(추적 중인 파일 + 아직 추적하지 않지만 무시되지 않는 파일)에
// private/ 파일, 원본 음성, 열쇠, 교과서 문장, 장면 5 암호 낱말이 없는지 본다.
// 열쇠의 내용은 찍지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, PRIV, OUT, words, hasPrivate, loadSources, readKeyText, keyBytes, open, lockedNames } from './lib.mjs';

const show = process.argv.includes('--show');
const TEXT_EXT = new Set(['.js', '.mjs', '.html', '.css', '.md', '.json', '.gs', '.txt', '.csv', '.py', '.svg', '']);
const AUDIO_EXT = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac']);

const problems = [];
const notes = [];
const bad = (m) => problems.push(m);

const targets = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0').filter(Boolean).filter((f) => fs.existsSync(path.join(ROOT, f)));

// 1. 있으면 안 되는 파일
for (const f of targets) {
  const ext = path.extname(f).toLowerCase();
  if (f.startsWith('private/')) bad('private/ 파일이 커밋 대상이다: ' + f);
  if (AUDIO_EXT.has(ext)) bad('음성 파일이 커밋 대상이다: ' + f);
  if (ext === '.key' || path.basename(f) === '.env') bad('열쇠·비밀 파일이 커밋 대상이다: ' + f);
  if (f.startsWith('content/') && f !== 'content/index.json' && ext !== '.bin') bad('content/에는 잠긴 파일(.bin)과 index.json만 둔다: ' + f);
}

const isText = (f) => TEXT_EXT.has(path.extname(f).toLowerCase()) && !f.startsWith('content/') || f === 'content/index.json';
const textFiles = targets.filter(isText);

// 2. 열쇠, 3. 잠긴 파일이 정말 잠겼는지
let keyText = null;
try { keyText = readKeyText(); } catch (e) { bad(e.message); }
if (keyText) {
  const needle = Buffer.from(keyText, 'utf8');
  for (const f of targets) {
    if (fs.readFileSync(path.join(ROOT, f)).includes(needle)) bad('열쇠가 들어 있다: ' + f);
  }
  const key = keyBytes(keyText);
  for (const name of lockedNames()) {
    const file = path.join(OUT, name);
    if (!fs.existsSync(file)) { notes.push('content/' + name + '가 아직 없다'); continue; }
    try { open(name, fs.readFileSync(file), key); } catch (e) { bad('잠긴 파일이 지금 열쇠로 풀리지 않는다: content/' + name); }
  }
} else {
  notes.push('private/vault.key가 없어 열쇠 검사를 건너뛰었다');
}
for (const f of targets.filter((t) => t.startsWith('content/') && t.endsWith('.bin'))) {
  const headBytes = fs.readFileSync(path.join(ROOT, f)).subarray(0, 4);
  const head = headBytes.toString('latin1');
  if (head.startsWith('ID3') || head.startsWith('{') || (headBytes[0] === 0xff && (headBytes[1] & 0xe0) === 0xe0)) bad('잠기지 않은 것으로 보이는 파일: ' + f);
}

// 4. 교과서 문장, 5. 암호 낱말
if (hasPrivate()) {
  let src = null;
  try { src = loadSources(); } catch (e) { notes.push('본문 대조를 건너뛰었다: ' + e.message); }
  if (src) {
    const chunks = src.map.story;
    const titleWords = words(chunks[0].text);
    const titleGrams = new Set();
    for (let i = 0; i + 3 <= titleWords.length; i++) titleGrams.add(titleWords.slice(i, i + 3).join(' '));

    // 비교할 글: 장면 전체(덩어리 경계를 넘는 묶음 포함), 반복 문장, 확인 문제 선지, 카드 뒷면, 간판
    const sources = [];
    const byScene = {};
    for (const c of chunks.slice(1)) byScene[c.scene] = (byScene[c.scene] || '') + ' ' + c.text;
    sources.push(...Object.values(byScene));
    sources.push(...(src.map.repeated_sentences || []).map((r) => r.text));
    for (const c of Object.values(src.extras.checks || {})) sources.push(...(c.options || []).map((o) => o.en));
    for (const c of Object.values(src.extras.cards || {})) sources.push(c.back || '');
    sources.push((src.extras.sign && src.extras.sign.wrong) || '');

    const grams = new Set();
    for (const t of sources) {
      const w = words(t);
      for (let i = 0; i + 3 <= w.length; i++) {
        const g = w.slice(i, i + 3).join(' ');
        if (!titleGrams.has(g)) grams.add(g);
      }
    }
    let total = 0;
    for (const f of textFiles) {
      const doc = ' ' + words(fs.readFileSync(path.join(ROOT, f), 'utf8')).join(' ') + ' ';
      const hits = [...grams].filter((g) => doc.includes(' ' + g + ' '));
      if (hits.length) {
        total += hits.length;
        bad('교과서 문장과 세 낱말 이상 겹친다: ' + f + ' (' + hits.length + '곳)' + (show ? ' → ' + hits.join(' | ') : ''));
      }
    }
    notes.push('본문 대조: 텍스트 파일 ' + textFiles.length + '개, 세 낱말 묶음 ' + grams.size + '개, 겹친 곳 ' + total + '곳 (단원 제목 제외)');
  }

  // 장면 5 암호 낱말 (스토리보드 S8 표)
  const board = path.join(PRIV, '스토리보드.md');
  if (fs.existsSync(board)) {
    const codes = [...fs.readFileSync(board, 'utf8').matchAll(/\b\d-\d+ ([A-Z]{3,})\b/g)].map((m) => m[1]);
    let found = 0;
    for (const f of textFiles) {
      const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        if (codes.some((c) => new RegExp('\\b' + c + '\\b').test(line))) { found++; bad('장면 5 암호 낱말이 들어 있다: ' + f + ' ' + (i + 1) + '행'); }
      });
    }
    notes.push('암호 낱말 검사: 낱말 ' + codes.length + '개, 발견 ' + found + '곳');
  }
} else {
  notes.push('private/가 없어 본문 대조와 암호 낱말 검사를 건너뛰었다');
}

console.log('커밋 대상 ' + targets.length + '개 (텍스트 ' + textFiles.length + '개)');
for (const n of notes) console.log(n);
for (const p of problems) console.log('문제: ' + p);
if (problems.length) {
  console.log('점검 실패: 문제 ' + problems.length + '개. 커밋하지 않는다.');
  process.exit(1);
}
console.log('점검 통과');
