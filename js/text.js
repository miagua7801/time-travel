// data/copy.js의 문구를 꺼내 { } 자리를 채운다. 없는 id면 경고를 남기고 id를 그대로 돌려준다.
import { COPY } from '../data/copy.js';

export function line(id, values = {}) {
  const entry = COPY[id];
  if (!entry) {
    console.warn(`[text] copy.js에 없는 id: ${id}`);
    return id;
  }
  return entry.text.replace(/\{(\w+)\}/g, (whole, key) => {
    if (key in values) return String(values[key]);
    console.warn(`[text] ${id}: 채울 값 없음 {${key}}`);
    return whole;
  });
}

export function voiceOf(id) {
  return COPY[id] ? COPY[id].voice : 'label';
}

export function isDraft(id) {
  return Boolean(COPY[id] && COPY[id].draft);
}
