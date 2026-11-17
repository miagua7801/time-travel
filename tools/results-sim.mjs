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

// Code.gs를 불러 doPost·doGet과 가짜 시트를 돌려준다
export function loadResults({ lockFails = false } = {}) {
  const book = new FakeBook();
  const lockLog = [];
  const ctx = {
    ContentService: { createTextOutput: (t) => ({ text: String(t), getContent() { return this.text; } }) },
    LockService: { getScriptLock: () => ({
      waitLock(ms) { lockLog.push('wait'); if (lockFails) throw new Error('timeout'); },
      releaseLock() { lockLog.push('release'); },
    }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => book },
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
  return { ctx, book, post, lockLog, header: () => ctx.header_() };
}
