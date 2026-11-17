// 결과 전송 (docs/ARCHITECTURE.md 4.2)
// - 대기열(tt8:v2:out)에는 반·번호별 최신 한 건만 둔다. 기기에는 본문 문장을 두지 않으므로 고른 줄과 단서는 D 번호로 둔다.
// - 보낼 때 D 번호 자리에 문장을 채운다. 방식: POST, 본문은 JSON 글자(text/plain). 응답이 'ok'면 대기열에서 지운다.
// - 실패는 화면에 알리지 않는다. 대기열에 남겨 두었다가 다음 전송 때 함께 보낸다.
// - 결과 전송 주소(config.js의 RESULT_URL)가 비어 있으면 아무것도 보내지 않는다.
import { loadOutbox, saveOutbox, hasReport } from './state.js';
import { line } from './text.js';
import { getStory } from './content.js';
import { RESULT_URL, NOTEBOOK_LIMIT } from '../data/config.js';

const TIMEOUT_MS = 15000;
const FIELD_MAX = 500; // 칸 하나의 글 길이 (수신 쪽에서도 자른다)

// 지금까지의 값 가운데 값이 있는 칸 전부. 단서 칸은 보고한 뒤에만, 빈 칸까지 보내 지운 단서가 시트에서도 지워지게 한다.
export function buildFields(rec) {
  const f = {};
  if (rec.trip) f.trip = line(rec.trip === 2 ? 'btn.trip2' : 'btn.trip1');
  f.done = rec.done.length;
  for (const [id, c] of Object.entries(rec.checks)) f[id] = c.first ? 'O' : 'X' + (c.pick + 1); // X 뒤 숫자는 첫 시도에 고른 선지 번호
  for (const [id, pick] of Object.entries(rec.predict)) f[id] = line(`${id}.${pick}`);
  // 두 번째 여행: 예측 자리에서 고른 줄과 이유
  for (const [id, p] of Object.entries(rec.picks)) f[id] = (p.d === null ? line('btn.none') : 'D' + p.d) + (p.why ? ' / ' + p.why : '');
  for (const [id, m] of Object.entries(rec.mood)) f[id] = m;
  for (const [id, text] of Object.entries(rec.star)) if (text) f[id] = text;
  if (rec.flags.ended) {
    f.signWrong = rec.sign.wrong || 0;
    f.ended = 'O';
  }
  if (rec.flags.reported) {
    for (let i = 0; i < NOTEBOOK_LIMIT; i++) {
      const n = rec.notes[i];
      f['n' + (i + 1)] = n ? `#D${n.d}` + (n.memo ? ' / ' + n.memo : '') : '';
    }
  }
  return f;
}

// 대기열에 올리고 곧바로 보내 본다. 반·번호가 없으면 아무것도 하지 않는다.
export function queueResult(rec) {
  if (!hasReport(rec)) return false;
  const out = loadOutbox();
  out[`${rec.cls}:${rec.num}`] = { v: 2, cls: rec.cls, num: rec.num, fields: buildFields(rec), t: Date.now() };
  const saved = saveOutbox(out);
  flush();
  return saved;
}

// D 번호 자리에 장면 번호와 문장을 채운다 (보내는 순간에만, 메모리에서)
function findLine(d) {
  const story = getStory();
  for (const [n, sc] of Object.entries((story && story.scenes) || {})) {
    const ln = sc.lines.find((x) => x.d === d);
    if (ln) return { scene: n, text: ln.chunks.map((c) => c.text).join(' ') };
  }
  return null;
}
export function expandFields(fields) {
  const f = { ...fields };
  for (const [k, v] of Object.entries(f)) {
    if (typeof v !== 'string') continue;
    if (/^p[123]$/.test(k)) {
      f[k] = v.replace(/^D(\d+)/, (all, d) => { const l = findLine(Number(d)); return l ? `D${d} ${l.text}` : all; });
    } else if (/^n[1-5]$/.test(k)) {
      f[k] = v.replace(/^#D(\d+)/, (all, d) => { const l = findLine(Number(d)); return l ? `${l.scene} · D${d} ${l.text}` : `D${d}`; });
    }
    if (typeof f[k] === 'string') f[k] = f[k].slice(0, FIELD_MAX);
  }
  return f;
}

let sending = false;
let again = false;

// 대기열을 모두 보낸다. 한 번에 하나씩, 실패하면 남겨 둔다.
export async function flush() {
  if (!RESULT_URL) return;
  if (sending) { again = true; return; }
  sending = true;
  try {
    const out = loadOutbox();
    for (const [key, entry] of Object.entries(out)) {
      const result = await post(entry);
      if (result === 'ok' || result === 'rejected') {
        // 보내는 동안 같은 학생의 새 결과가 쌓였으면 그것은 남긴다
        const now = loadOutbox();
        if (now[key] && now[key].t === entry.t) {
          delete now[key];
          saveOutbox(now);
        }
      }
    }
  } finally {
    sending = false;
  }
  if (again) { again = false; flush(); }
}

async function post(entry) {
  const body = JSON.stringify({ v: entry.v, cls: entry.cls, num: entry.num, fields: expandFields(entry.fields) });
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : 0;
  try {
    const res = await fetch(RESULT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store',
      signal: ctrl ? ctrl.signal : undefined,
    });
    if (!res.ok) return 'fail';
    return (await res.text()).trim();
  } catch (e) {
    return 'fail';
  } finally {
    clearTimeout(timer);
  }
}

// 다시 연결되면 남은 것을 보낸다
try { window.addEventListener('online', () => flush()); } catch (e) { /* 무시 */ }
