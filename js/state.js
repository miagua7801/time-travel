// 기기 저장(localStorage). 모든 접근은 try/catch — 실패해도 진행은 계속된다.
import { STORAGE_PREFIX } from '../data/config.js';

const LAST_KEY = STORAGE_PREFIX + 'last';

// 저장이 막힌 기기에서도 이어 가도록 메모리 사본을 함께 둔다
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

export function studentKey(cls, number) {
  return `${STORAGE_PREFIX}${cls}-${number}`;
}

export function newStudent(cls, number, group) {
  return {
    class: cls, number, group,
    job: null, knows: false,
    chapter: 0, stage: 'start',
    items: {}, attempts: {},
    notebook: { c1: [], c2: [] },
    links: {}, sign: [], exam: {},
    groupClues: {}, // S3 '모둠 단서' 표시 (점수 없음, 저장만)
    sent: { p1: false, p2: false }, pending: [],
    updatedAt: null,
  };
}

export function loadStudent(cls, number) {
  const data = read(studentKey(cls, number));
  return data && typeof data === 'object' ? data : null;
}

export function saveStudent(st) {
  st.updatedAt = new Date().toISOString();
  const ok = write(studentKey(st.class, st.number), st);
  write(LAST_KEY, { class: st.class, number: st.number });
  return ok;
}

export function loadLast() {
  const last = read(LAST_KEY);
  return last && typeof last === 'object' ? last : null;
}

// 소리 켜기/끄기 상태 (단계 3에서 audio.js가 이 값을 읽는다). 저장하지 않는다.
export const sound = { on: false };
