// 되감기 임무 목록 (스토리보드 S11): ☐ 단서 담기 (n/5) · ☐ 단서 수첩 보고. 마친 임무는 ✓.
// 단서 담기는 다섯 개가 되면 ✓, 보고는 "보고"를 누르면 ✓. 보고를 마치면 두 임무를 모두 마친 것으로 본다
// (다섯 개를 다 채우지 않아도 보고할 수 있으므로).
import { el } from '../ui.js';
import { line } from '../text.js';
import { NOTEBOOK_LIMIT } from '../../data/config.js';

export function missionList(rec) {
  const item = () => {
    const mark = el('span', { className: 'task-mark' });
    mark.setAttribute('aria-hidden', 'true');
    const text = el('span', { className: 'task-text' });
    const li = el('li', { className: 'task' }, mark, text);
    return { li, mark, text };
  };
  const a = item();
  const b = item();
  const list = el('ul', { className: 'tasks' }, a.li, b.li);
  const set = (it, done, copyId, values) => {
    it.mark.textContent = done ? '✓' : '☐';
    it.text.textContent = line(copyId, values);
    it.text.dataset.copy = copyId;
    it.li.classList.toggle('is-done', done);
    it.li.dataset.done = String(done);
  };
  const refresh = () => {
    const n = rec.notes.length;
    const reported = Boolean(rec.flags.reported);
    set(a, n >= NOTEBOOK_LIMIT || reported, 's11.task1', { n, max: NOTEBOOK_LIMIT });
    set(b, reported, 's11.task2');
  };
  refresh();
  return { el: list, refresh };
}
