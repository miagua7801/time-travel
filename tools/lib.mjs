// 준비 도구가 함께 쓰는 것: 경로, 평문 읽기, 본문 자료 만들기·점검, 잠그기·풀기.
// 교사 컴퓨터에서 Node로만 실행한다. 학생 화면에는 쓰이지 않는다.
// 열쇠의 내용과 교과서 문장은 화면에 찍지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes } from 'node:crypto';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PRIV = path.join(ROOT, 'private');
export const OUT = path.join(ROOT, 'content');
export const KEY_FILE = path.join(PRIV, 'vault.key');

export const SCENE_COUNT = 6;
const CHUNKS_PER_SCENE = [22, 11, 14, 32, 10, 22]; // 스토리보드 9장
const KEYS_PER_SCENE = [3, 3, 2, 3, 2, 3];        // 기획안 4장
const WHO = { narrator: 'narrator', 'Mr. Parker': 'parker', Eckels: 'eckels', Travis: 'travis' };
const CHECK_IDS = ['c1', 'c2', 'c4', 'c5', 'c6'];

// ---------- 글자 다루기 ----------

// 비교용 낱말 목록: 소문자, 글자·숫자만
export function words(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
}

// big 안에 small이 이어진 낱말로 들어 있는지
export function hasRun(big, small) {
  if (!small.length) return false;
  for (let i = 0; i + small.length <= big.length; i++) {
    let ok = true;
    for (let k = 0; k < small.length; k++) if (big[i + k] !== small[k]) { ok = false; break; }
    if (ok) return true;
  }
  return false;
}

// 곧은 따옴표를 본문과 같은 둥근 따옴표로 (don't → don’t)
const curly = (s) => String(s).replace(/(\w)'(\w)/g, '$1’$2');
// 인용할 때 바깥 따옴표를 뗀다
const unquote = (s) => String(s).replace(/^[“”"\s]+|[“”"\s]+$/g, '');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- 평문 읽기 ----------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
}

// 쉼표로 나눈 간단한 CSV (큰따옴표로 감싼 칸 지원)
function readCsv(file) {
  const rows = [];
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { cells.push(cur); cur = ''; } else cur += ch;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

export function hasPrivate() {
  return fs.existsSync(path.join(PRIV, 'audio_map.json'));
}

export function loadSources() {
  const need = ['audio_map.json', 'word_gloss.csv', path.join('content', 'extras.json')];
  const missing = need.filter((f) => !fs.existsSync(path.join(PRIV, f)));
  if (missing.length) throw new Error('private/에 없는 파일: ' + missing.join(', '));
  const map = readJson(path.join(PRIV, 'audio_map.json'));
  const extras = readJson(path.join(PRIV, 'content', 'extras.json'));
  const rows = readCsv(path.join(PRIV, 'word_gloss.csv'));
  const head = rows[0].map((h) => h.toLowerCase());
  const col = (name) => head.indexOf(name);
  const gloss = rows.slice(1).map((r) => ({
    scene: Number(r[col('first_scene')]),
    word: r[col('word')],
    meaning: r[col('meaning_ko')],
  }));
  return { map, extras, gloss, glossHead: head };
}

// ---------- 본문 자료 만들기와 점검 ----------

// 돌려주는 것: { story, packs, errors, warnings, stats }
// story는 story.bin에 들어갈 평문, packs는 장면별 음성 묶음에 넣을 파일 목록.
export function build({ map, extras, gloss, glossHead }) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  const chunks = Array.isArray(map.story) ? map.story : [];
  const repeated = new Set((map.repeated_sentences || []).map((r) => r.file));

  // 덩어리
  if (chunks.length !== 111) err(`음성 덩어리가 111개가 아니다: ${chunks.length}개`);
  chunks.forEach((c, i) => {
    if (c.order !== i + 1) err(`order가 순서대로가 아니다: ${i + 1}번째 항목의 order ${c.order}`);
    if (!(c.scene >= 1 && c.scene <= SCENE_COUNT)) err(`장면 번호가 틀렸다: ${c.file}`);
    if (!Number.isInteger(c.worksheet_line)) err(`학습지 번호가 없다: ${c.file}`);
    if (!(c.speaker in WHO)) err(`말하는 사람을 알 수 없다: ${c.file} (${c.speaker})`);
    if (!c.text || !String(c.text).trim()) err(`본문이 비었다: ${c.file}`);
    if (repeated.has(c.file)) err(`반복 파일이 본문에 섞였다: ${c.file}`);
    if (!fs.existsSync(path.join(PRIV, 'Reading', c.file))) err(`음성 파일이 없다: private/Reading/${c.file}`);
    if (i > 0 && c.scene < chunks[i - 1].scene) err(`장면 순서가 거꾸로다: ${c.file}`);
  });
  if (new Set(chunks.map((c) => c.file)).size !== chunks.length) err('같은 음성 파일이 두 번 쓰였다');
  for (const n of ['news_N1.mp3', 'news_N2.mp3']) {
    if (!fs.existsSync(path.join(PRIV, 'news', n))) err(`뉴스 파일이 없다: private/news/${n}`);
  }

  // 장면 → 줄 → 덩어리
  const scenes = {};
  const lineOf = new Map(); // D 번호 → { scene, line }
  for (const c of chunks) {
    const sc = (scenes[c.scene] ||= { page: c.page, lines: [], vocab: [] });
    let line = sc.lines[sc.lines.length - 1];
    if (!line || line.d !== c.worksheet_line) {
      if (lineOf.has(c.worksheet_line)) err(`학습지 번호 ${c.worksheet_line}의 덩어리가 떨어져 있다: ${c.file}`);
      line = { d: c.worksheet_line, key: false, chunks: [] };
      sc.lines.push(line);
      lineOf.set(c.worksheet_line, { scene: c.scene, line });
    }
    line.chunks.push({ id: c.file.replace(/\.mp3$/i, ''), who: WHO[c.speaker] || 'narrator', text: String(c.text), sec: c.seconds });
  }
  for (let n = 1; n <= SCENE_COUNT; n++) {
    const count = scenes[n] ? scenes[n].lines.reduce((a, l) => a + l.chunks.length, 0) : 0;
    if (count !== CHUNKS_PER_SCENE[n - 1]) err(`장면 ${n}의 덩어리 수가 다르다: ${count}개 (${CHUNKS_PER_SCENE[n - 1]}개여야 함)`);
  }
  const lineWords = (l) => words(l.chunks.map((c) => c.text).join(' '));

  // 제목 줄
  const first = scenes[1] && scenes[1].lines[0];
  if (first && first.chunks.length === 1 && first.chunks[0].id === 'R_1_1') first.title = true;
  else err('장면 1의 첫 줄이 제목(R_1_1)이 아니다');

  // 핵심 문장
  const keyLines = extras.keyLines || [];
  if (keyLines.length !== 16 || new Set(keyLines).size !== 16) err(`핵심 문장이 16개가 아니다: ${keyLines.length}개`);
  const keyCount = new Array(SCENE_COUNT).fill(0);
  for (const d of keyLines) {
    const hit = lineOf.get(d);
    if (!hit) { err(`핵심 문장 번호 D${d}가 본문에 없다`); continue; }
    hit.line.key = true;
    keyCount[hit.scene - 1]++;
  }
  keyCount.forEach((k, i) => { if (k !== KEYS_PER_SCENE[i]) err(`장면 ${i + 1}의 핵심 문장 수가 다르다: ${k}개 (${KEYS_PER_SCENE[i]}개여야 함)`); });

  // 단어 뜻
  for (const name of ['first_scene', 'word', 'meaning_ko']) {
    if (!glossHead.includes(name)) err(`word_gloss.csv에 ${name} 칸이 없다`);
  }
  if (gloss.length !== 30) warn(`단어 뜻이 30개가 아니다: ${gloss.length}개`);
  const forms = extras.vocabForms || {};
  const seenWord = new Set();
  let spanTotal = 0;
  for (const g of gloss) {
    const label = `단어 "${g.word}"`;
    if (!g.word || !g.meaning) { err(`${label}: 낱말이나 뜻이 비었다`); continue; }
    if (!(g.scene >= 1 && g.scene <= SCENE_COUNT)) { err(`${label}: first_scene이 1~6이 아니다`); continue; }
    if (seenWord.has(g.word.toLowerCase())) { err(`${label}: 목록에 두 번 있다`); continue; }
    seenWord.add(g.word.toLowerCase());
    const sc = scenes[g.scene];
    if (!sc) continue;
    const pattern = forms[g.word]
      ? new RegExp('\\b(?:' + forms[g.word].map(escapeRe).join('|') + ')\\b', 'gi')
      : new RegExp('\\b' + escapeRe(g.word) + '(?:s|es|d|ed|ing)?\\b', 'gi');
    const spans = [];
    for (const line of sc.lines) {
      if (line.title) continue;
      line.chunks.forEach((ch, ci) => {
        for (const m of ch.text.matchAll(pattern)) spans.push({ d: line.d, c: ci, s: m.index, e: m.index + m[0].length });
      });
    }
    if (!spans.length) {
      err(`${label}: 장면 ${g.scene} 본문에서 찾지 못했다. 꼴이 다르면 extras.json의 vocabForms에 본문 속 꼴을 적는다`);
      continue;
    }
    spanTotal += spans.length;
    sc.vocab.push({ word: g.word, meaning: g.meaning, spans });
  }
  for (const w of Object.keys(forms)) {
    if (!seenWord.has(w.toLowerCase())) warn(`vocabForms의 "${w}"가 word_gloss.csv에 없다`);
  }
  // 겹치는 표시
  for (let n = 1; n <= SCENE_COUNT; n++) {
    const all = (scenes[n] ? scenes[n].vocab : []).flatMap((v) => v.spans.map((sp) => ({ ...sp, word: v.word })));
    all.sort((a, b) => a.d - b.d || a.c - b.c || a.s - b.s);
    for (let i = 1; i < all.length; i++) {
      const p = all[i - 1];
      const q = all[i];
      if (p.d === q.d && p.c === q.c && q.s < p.e) err(`단어 표시가 겹친다: "${p.word}"와 "${q.word}" (D${q.d})`);
    }
  }

  // 확인 문제
  const checks = {};
  for (const id of CHECK_IDS) {
    const c = (extras.checks || {})[id];
    const scene = Number(id.slice(1));
    if (!c) { err(`확인 문제 ${id}가 없다`); continue; }
    const opts = c.options || [];
    if (opts.length !== 3 || opts.some((o) => !o.en || !o.ko)) err(`확인 문제 ${id}: 선지 3개에 en·ko가 모두 있어야 한다`);
    if (![0, 1, 2].includes(c.answer)) err(`확인 문제 ${id}: answer는 0·1·2 중 하나`);
    const hit = lineOf.get(c.evidence);
    if (!hit) err(`확인 문제 ${id}: 근거 줄 D${c.evidence}가 본문에 없다`);
    else if (hit.scene !== scene) err(`확인 문제 ${id}: 근거 줄 D${c.evidence}가 장면 ${scene}에 없다`);
    for (let i = 1; i < opts.length; i++) {
      if (String(opts[i].en).length < String(opts[i - 1].en).length) warn(`확인 문제 ${id}: 선지가 짧은 것부터가 아니다`);
    }
    checks[id] = { options: opts.map((o) => ({ en: curly(o.en), ko: o.ko })), answer: c.answer, evidence: c.evidence };
  }
  const extraChecks = Object.keys(extras.checks || {}).filter((k) => !CHECK_IDS.includes(k));
  if (extraChecks.length) err('모르는 확인 문제: ' + extraChecks.join(', '));

  // 카드 뒷면: 그 장면의 한 줄 안에 이어진 낱말로 있어야 한다
  const cards = {};
  for (let n = 1; n <= SCENE_COUNT; n++) {
    const back = extras.cards && extras.cards[n] && extras.cards[n].back;
    if (!back) { err(`카드 ${n}의 뒷면 문장이 없다`); continue; }
    const w = words(back);
    if (scenes[n] && !scenes[n].lines.some((l) => hasRun(lineWords(l), w))) err(`카드 ${n}의 뒷면 문장이 장면 ${n} 본문에 없다`);
    cards[n] = { back: curly(back) };
  }

  // 간판
  const sign = extras.sign || {};
  const signWords = sign.words || [];
  if (signWords.length !== 7) err(`간판에서 고칠 낱말이 7개가 아니다: ${signWords.length}개`);
  if ((sign.locked || []).length !== 3) err('간판에서 누를 수 없는 낱말이 3개가 아니다');
  const wrongTokens = words(sign.wrong || '');
  const signLine = lineOf.get(sign.line);
  if (!signLine || signLine.scene !== 6) err('간판 줄(sign.line)이 장면 6에 없다');
  else if (!hasRun(lineWords(signLine.line), wrongTokens)) err('틀린 간판 글이 본문의 간판 줄과 다르다');
  const fixable = new Map(signWords.map((w) => [String(w.wrong).toLowerCase(), w]));
  const lockedSet = new Set((sign.locked || []).map((w) => w.toLowerCase()));
  const fixed = [];
  for (const t of wrongTokens) {
    if (fixable.has(t)) {
      const w = fixable.get(t);
      if (!Array.isArray(w.options) || w.options.length !== 2 || ![0, 1].includes(w.answer)) { err('간판 낱말의 선지는 2개, answer는 0·1'); fixed.push(t); continue; }
      fixed.push(String(w.options[w.answer]).toLowerCase());
    } else if (lockedSet.has(t)) fixed.push(t);
    else err('틀린 간판 글에 목록에 없는 낱말이 있다');
  }
  if (cards[1] && fixed.join(' ') !== words(extras.cards[1].back).join(' ')) err('간판을 다 고친 글이 카드 1 뒷면과 다르다');

  // 인용
  const quotes = {};
  const q = extras.quotes || {};
  const starLine = lineOf.get(q.star2);
  if (!starLine || starLine.scene !== 2) err('quotes.star2의 줄이 장면 2에 없다');
  else quotes.star2 = unquote(starLine.line.chunks.map((c) => c.text).join(' '));
  const byId = new Map(chunks.map((c) => [c.file.replace(/\.mp3$/i, ''), c]));
  const s6 = (q.s6 || []).map((id) => byId.get(id));
  if (!s6.length || s6.some((c) => !c)) err('quotes.s6의 음성 파일이 본문에 없다');
  else quotes.s6 = unquote(s6.map((c) => c.text).join(' '));

  const story = { v: 1, scenes, checks, cards, sign: { wrong: sign.wrong, locked: sign.locked, words: signWords }, quotes };

  // 음성 묶음
  const packs = [];
  for (let n = 1; n <= SCENE_COUNT; n++) {
    const items = chunks.filter((c) => c.scene === n).map((c) => ({ id: c.file.replace(/\.mp3$/i, ''), file: path.join(PRIV, 'Reading', c.file) }));
    if (n === 1) items.push({ id: 'N1', file: path.join(PRIV, 'news', 'news_N1.mp3') });
    if (n === 6) items.push({ id: 'N2', file: path.join(PRIV, 'news', 'news_N2.mp3') });
    packs.push({ name: `s${n}.bin`, items });
  }

  const stats = {
    chunks: chunks.length,
    lines: Object.values(scenes).reduce((a, s) => a + s.lines.length, 0),
    linesPerScene: Array.from({ length: SCENE_COUNT }, (_, i) => (scenes[i + 1] ? scenes[i + 1].lines.length : 0)),
    keyLines: keyLines.length,
    vocab: gloss.length,
    vocabSpans: spanTotal,
    checks: Object.keys(checks).length,
    cards: Object.keys(cards).length,
    signWords: signWords.length,
    packItems: packs.map((p) => p.items.length),
  };
  return { story, packs, errors, warnings, stats };
}

// 음성 묶음의 평문: 머리 길이 4바이트 + 머리 JSON + mp3 바이트들
export function packBytes(items) {
  const bodies = items.map((it) => fs.readFileSync(it.file));
  let off = 0;
  const head = { v: 1, items: items.map((it, i) => { const row = { id: it.id, off, len: bodies[i].length }; off += bodies[i].length; return row; }) };
  const headBytes = Buffer.from(JSON.stringify(head), 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(headBytes.length, 0);
  return Buffer.concat([len, headBytes, ...bodies]);
}

// ---------- 열쇠와 잠금 ----------

const KEY_SHAPE = /^[A-Za-z0-9_-]{43}$/;

// 열쇠 글자를 읽는다. 없으면 null. 화면에 찍지 않는다.
export function readKeyText() {
  if (!fs.existsSync(KEY_FILE)) return null;
  const text = fs.readFileSync(KEY_FILE, 'utf8').trim();
  if (!KEY_SHAPE.test(text)) throw new Error('private/vault.key의 모양이 틀렸다 (base64url 43자여야 함)');
  return text;
}

export function createKeyText() {
  const text = randomBytes(32).toString('base64url');
  fs.mkdirSync(path.dirname(KEY_FILE), { recursive: true });
  fs.writeFileSync(KEY_FILE, text + '\n', { flag: 'wx' }); // 이미 있으면 덮어쓰지 않고 실패
  return text;
}

export const keyBytes = (text) => Buffer.from(text, 'base64url');
export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

// 잠근 파일: IV 12바이트 + 암호문 + 인증 꼬리 16바이트. 파일 이름이 추가 인증 값.
// IV는 열쇠·이름·평문 해시에서 만들어, 내용이 같으면 잠긴 파일도 같다.
export function seal(name, plain, key) {
  const iv = createHmac('sha256', key).update('iv\0' + name + '\0' + sha256(plain)).digest().subarray(0, 12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(name, 'utf8'));
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]);
}

// 틀린 열쇠나 바뀐 파일이면 예외를 던진다
export function open(name, sealed, key) {
  const iv = sealed.subarray(0, 12);
  const tag = sealed.subarray(sealed.length - 16);
  const body = sealed.subarray(12, sealed.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(name, 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

export const lockedNames = () => ['story.bin', ...Array.from({ length: SCENE_COUNT }, (_, i) => `s${i + 1}.bin`)];
