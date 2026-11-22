// 기기 저장(localStorage). 모든 읽기·쓰기는 try/catch — 실패해도 진행은 계속된다.
// 저장이 막힌 기기에서도 이번 접속 동안은 이어 가도록 메모리 사본을 함께 둔다.
// 본문 문장은 저장하지 않는다. 학생 정보는 반·번호뿐이다. (docs/ARCHITECTURE.md 4.1)

const REC = 'tt8:v2:rec';
const OUT = 'tt8:v2:out';

const memory = new Map();

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch (e) { /* 저장 실패는 무시 */ }
  return memory.has(key) ? memory.get(key) : null;
}

function write(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function remove(key) {
  memory.delete(key);
  try { localStorage.removeItem(key); } catch (e) { /* 저장 실패는 무시 */ }
}

export function newRecord() {
  return {
    v: 2,
    cls: null, num: null, trip: null, day: null,
    // guide: 장비 점검 1~6단계를 봤다 · guide7: 장면 2의 7단계를 봤다
    flags: { video: false, s6: false, unlocked: false, ended: false, reported: false, from5: false, rule: false, guide: false, guide7: false },
    done: [],
    checks: {}, predict: {}, picks: {}, mood: {}, star: {},
    sign: { fixed: [], wrong: 0 },
    notes: [],
    t: null,
  };
}

// 저장된 기록. 모양이 틀리면 새 기록으로 본다.
export function loadRecord() {
  const r = read(REC);
  if (!r || typeof r !== 'object' || r.v !== 2) return newRecord();
  const base = newRecord();
  return { ...base, ...r, flags: { ...base.flags, ...(r.flags || {}) }, sign: { ...base.sign, ...(r.sign || {}) } };
}

export function saveRecord(rec) {
  rec.t = new Date().toISOString();
  return write(REC, rec);
}

// "내 기록이 아니다": 기록만 지운다. 열쇠와 보내지 못한 결과는 남긴다.
export function clearRecord() {
  remove(REC);
}

// 저장된 기록이 있는가 (반·번호까지 보고한 기록)
export const hasReport = (rec) => Boolean(rec && rec.cls && rec.num);

// 기기의 오늘 날짜 'YYYY-MM-DD'
export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 2차시: S3에서 보고한 날과 오늘이 다르면
export const isSecondDay = (rec) => Boolean(rec.day && rec.day !== today());

// "이어서 출발"이 가는 곳 (docs/ARCHITECTURE.md 3.3). 위에서부터 맞는 첫 줄.
export function resumeTarget(rec) {
  const done = new Set(rec.done);
  const first4 = [1, 2, 3, 4].every((n) => done.has(n));
  if (!hasReport(rec)) return rec.flags.video ? 's2' : 's1';
  if (rec.flags.ended) return 's4';
  if (rec.flags.unlocked && done.has(6)) return 's9';
  if (rec.flags.unlocked) return 's4';
  if (done.has(4) && !rec.flags.s6) return 's6';
  if (first4 && isSecondDay(rec)) return 's7';
  return 's4';
}

// 보내지 못한 결과 (전송은 뒤 단계에서 만든다)
export function loadOutbox() {
  const o = read(OUT);
  return o && typeof o === 'object' ? o : {};
}
export function saveOutbox(o) {
  return write(OUT, o);
}
