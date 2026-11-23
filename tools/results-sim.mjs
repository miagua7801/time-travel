// 결과 수신 Apps Script(apps-script/results/Code.gs)를 Node에서 돌리는 가짜 Google 환경.
// tools/test-results.mjs(단위 시험)와 Playwright 점검(가짜 수신 서버)이 함께 쓴다. 실제 Google에는 아무것도 보내지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const CODE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps-script', 'results', 'Code.gs');

// 아주 작은 가짜 스프레드시트: 시트마다 2차원 배열
class FakeSheet {
  constructor(name) { this.name = name; this.rows = []; this.frozen = 0; }
  getLastRow() { return this.rows.length; }
  setFrozenRows(n) { this.frozen = n; }
  getRange(r, c, nr, nc) {
    const sh = this;
    return {
      getValues() {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = sh.rows[r - 1 + i] || [];
          const vals = [];
          for (let j = 0; j < nc; j++) vals.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]);
          out.push(vals);
        }
        return out;
      },
      setValues(v) {
        if (v.length !== nr || v.some((x) => x.length !== nc)) throw new Error('setValues 크기가 범위와 다르다');
        for (let i = 0; i < nr; i++) {
          const row = sh.rows[r - 1 + i] || (sh.rows[r - 1 + i] = []);
          for (let j = 0; j < nc; j++) row[c - 1 + j] = v[i][j];
        }
      },
      sort(col) {
        const part = sh.rows.slice(r - 1, r - 1 + nr);
        part.sort((a, b) => Number(a[col - 1]) - Number(b[col - 1]));
        sh.rows.splice(r - 1, nr, ...part);
      },
    };
  }
}
class FakeBook {
  constructor() { this.sheets = new Map(); }
  getSheetByName(n) { return this.sheets.get(n) || null; }
  insertSheet(n) { const s = new FakeSheet(n); this.sheets.set(n, s); return s; }
}

// 아주 작은 가짜 드라이브: 폴더·파일 나무. 휴지통은 trashed 표시만 (DriveApp처럼 목록에는 남는다)
let nextId = 1;
const iter = (list) => { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; };
export class FakeFile {
  constructor(blob) { this.id = nextId++; this.name = blob.getName(); this.type = blob.type; this.bytes = blob.bytes; this.trashed = false; }
  getName() { return this.name; }
  isTrashed() { return this.trashed; }
  setTrashed(v) { this.trashed = Boolean(v); return this; }
}
export class FakeFolder {
  constructor(name) { this.id = nextId++; this.name = name; this.folders = []; this.files = []; this.trashed = false; }
  getName() { return this.name; }
  getUrl() { return 'https://drive.google.com/drive/folders/fake' + this.id; }
  isTrashed() { return this.trashed; }
  setTrashed(v) { this.trashed = Boolean(v); return this; }
  getFoldersByName(n) { return iter(this.folders.filter((f) => f.name === n)); }
  getFilesByName(n) { return iter(this.files.filter((f) => f.name === n)); }
  createFolder(n) { const f = new FakeFolder(n); this.folders.push(f); return f; }
  createFile(blob) { const f = new FakeFile(blob); this.files.push(f); return f; }
  // 시험용: 휴지통에 없는 하위 폴더·파일
  live(n) { return this.folders.find((f) => f.name === n && !f.trashed) || null; }
  liveFiles(n) { return this.files.filter((f) => !f.trashed && (n === undefined || f.name === n)); }
  // 시험용: 영구 삭제 (휴지통 비우기)
  purge() { this.folders = this.folders.filter((f) => !f.trashed); this.files = this.files.filter((f) => !f.trashed); }
}

// Code.gs를 불러 doPost·doGet과 가짜 시트를 돌려준다
export function loadResults({ lockFails = false } = {}) {
  const book = new FakeBook();
  const drive = new FakeFolder('내 드라이브');
  const lockLog = [];
  const logs = [];
  const ctx = {
    ContentService: { createTextOutput: (t) => ({ text: String(t), getContent() { return this.text; } }) },
    LockService: { getScriptLock: () => ({
      waitLock(ms) { lockLog.push('wait'); if (lockFails) throw new Error('timeout'); },
      releaseLock() { lockLog.push('release'); },
    }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => book },
    DriveApp: { getRootFolder: () => drive },
    Logger: { log: (m) => { logs.push(String(m)); } },
    Utilities: {
      // Apps Script처럼 -128~127 바이트 배열
      base64Decode: (t) => { if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t)) throw new Error('base64 아님'); return [...Buffer.from(t, 'base64')].map((b) => (b > 127 ? b - 256 : b)); },
      newBlob: (bytes, type, name) => ({ bytes, type, name, getName() { return this.name; } }),
    },
    Date,
    JSON,
    Math,
    Number,
    String,
    Object,
    isFinite,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(CODE, 'utf8'), ctx, { filename: 'Code.gs' });
  const post = (body) => ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).getContent();
  return { ctx, book, drive, post, lockLog, logs, header: () => ctx.header_() };
}
