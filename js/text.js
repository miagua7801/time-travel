// lines.js의 문구를 꺼내 { } 자리를 채운다. 없는 id면 경고를 남기고 id를 그대로 돌려준다.
import { LINES } from '../data/lines.js';

export function line(id, values = {}) {
  const entry = LINES[id];
  if (!entry) {
    console.warn(`[text] lines.js에 없는 id: ${id}`);
    return id;
  }
  return entry.text.replace(/\{(\w+)\}/g, (whole, key) => {
    if (key in values) return String(values[key]);
    console.warn(`[text] ${id}: 채울 값 없음 {${key}}`);
    return whole;
  });
}

// line()과 같은 문구를 조각으로: 글자 조각과 { key, value } 자리 조각. 화면에서 자리 하나만 꾸밀 때 쓴다.
export function lineParts(id, values = {}) {
  const full = line(id, values); // 없는 id·값 경고는 line()이 남긴다
  const entry = LINES[id];
  if (!entry) return [full];
  const out = [];
  let last = 0;
  entry.text.replace(/\{(\w+)\}/g, (whole, key, offset) => {
    out.push(entry.text.slice(last, offset));
    out.push({ key, value: key in values ? String(values[key]) : whole });
    last = offset + whole.length;
    return whole;
  });
  out.push(entry.text.slice(last));
  return out.filter((p) => p !== '');
}

export function lineVoice(id) {
  return LINES[id] ? LINES[id].voice : 'hq';
}
