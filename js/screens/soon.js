// 아직 만들지 않은 화면의 자리. 개발 중에만 쓴다 (학생 문구 아님).
import { el } from '../ui.js';

export function renderSoon(root, { name }) {
  const h = el('h1', { className: 'soon', textContent: '준비 중' });
  root.append(el('section', { className: 'center-stack' }, h, el('p', { className: 'soon-id', textContent: String(name || '').toUpperCase() })));
  return h;
}
