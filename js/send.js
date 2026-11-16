// 결과 전송 대기열 (docs/ARCHITECTURE.md 4.2).
// 이 단계에서는 대기열(tt8:v2:out)에 쌓기만 한다. 실제 전송(POST)은 결과 수신 주소를 잇는 단계에서 붙인다.
// 대기열에는 반·번호별 최신 한 건만 둔다. 본문 문장은 넣지 않는다.
import { loadOutbox, saveOutbox, hasReport } from './state.js';
import { line } from './text.js';

// 지금까지의 값 가운데 값이 있는 칸만
export function buildFields(rec) {
  const f = {};
  if (rec.trip) f.trip = line(rec.trip === 2 ? 'btn.trip2' : 'btn.trip1');
  f.done = rec.done.length;
  for (const [id, c] of Object.entries(rec.checks)) f[id] = c.first ? 'O' : 'X' + (c.pick + 1); // X 뒤 숫자는 첫 시도에 고른 선지 번호
  for (const [id, pick] of Object.entries(rec.predict)) f[id] = line(`${id}.${pick}`);
  // 두 번째 여행: 예측 자리에서 고른 줄과 이유. 대기열에는 D 번호로만 두고, 문장은 보낼 때 채운다.
  for (const [id, p] of Object.entries(rec.picks)) f[id] = (p.d === null ? line('btn.none') : 'D' + p.d) + (p.why ? ' / ' + p.why : '');
  for (const [id, m] of Object.entries(rec.mood)) f[id] = m;
  for (const [id, text] of Object.entries(rec.star)) if (text) f[id] = text;
  // 간판, 엔딩, 단서 수첩 칸은 그 화면을 만드는 단계에서 더한다.
  return f;
}

// 대기열에 올린다. 반·번호가 없으면 아무것도 하지 않는다.
export function queueResult(rec) {
  if (!hasReport(rec)) return false;
  const out = loadOutbox();
  out[`${rec.cls}:${rec.num}`] = { v: 2, cls: rec.cls, num: rec.num, fields: buildFields(rec) };
  return saveOutbox(out);
}
