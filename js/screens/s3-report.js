// S3 반·번호 보고 (스토리보드 2장, 5장 S7 표, 8장)
// 반 단추 6개 + 번호 → "보고" → 임무 문구(두 번째 여행은 한 줄 더) → "임무 시작"
// 작은 단추 "장면 5부터"는 항상 보인다: 기록이 사라진 기기로 2차시에 들어온 학생용. 반·번호를 보고하고 S8로.
import { el, say, button } from '../ui.js';
import { line } from '../text.js';
import { saveRecord, today } from '../state.js';
import { CLASSES, NUMBER_MIN, NUMBER_MAX } from '../../data/config.js';

export function renderReport(root, { go, app }) {
  const rec = app.rec;
  const ask = say('s3.ask', {}, 'h1');

  // 반: 라디오 단추 (화살표 키로 옮기고 Space로 고름)
  const classGroup = el('div', { className: 'class-row', role: 'radiogroup' });
  const radios = CLASSES.map((c) => {
    const input = el('input', { type: 'radio', name: 'cls', value: c, id: 'cls-' + c, className: 'pill-input' });
    if (rec.cls === c) input.checked = true;
    const label = el('label', { htmlFor: 'cls-' + c, className: 'pill', textContent: c });
    classGroup.append(input, label);
    return input;
  });
  const classField = el('div', { className: 'field' }, el('span', { className: 'field-label', id: 's3-cls', textContent: line('s3.cls') }), classGroup);
  classGroup.setAttribute('aria-labelledby', 's3-cls');

  // 번호
  const num = el('input', {
    type: 'text', id: 's3-num', inputMode: 'numeric', autocomplete: 'off', maxLength: 2,
    className: 'num-input', value: rec.num ? String(rec.num) : '',
  });
  num.setAttribute('pattern', '[0-9]*');
  num.addEventListener('input', () => { num.value = num.value.replace(/[^0-9]/g, '').slice(0, 2); });
  const numField = el('div', { className: 'field' }, el('label', { className: 'field-label', htmlFor: 's3-num', textContent: line('s3.num') }), num);

  const status = el('div', { className: 'status', role: 'status' });

  // 입력 확인. 맞으면 반·번호를 저장하고 true.
  const take = () => {
    const picked = radios.find((r) => r.checked);
    const n = Number(num.value);
    if (!picked || !num.value) {
      status.replaceChildren(say('s3.need'));
      (picked ? num : radios[0]).focus();
      return false;
    }
    // 번호가 범위 밖일 때만 범위 문구 (비었을 때는 위의 문구)
    if (!Number.isInteger(n) || n < NUMBER_MIN || n > NUMBER_MAX) {
      status.replaceChildren(say('s3.range'));
      num.focus();
      return false;
    }
    rec.cls = picked.value;
    rec.num = n;
    if (!rec.day) rec.day = today();
    saveRecord(rec);
    return true;
  };

  const form = el('form', { className: 'report-form' }, classField, numField);
  const report = button('btn.report', null, 'primary');
  report.type = 'submit';
  form.append(el('div', { className: 'btn-row' }, report));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!take()) return;
    showMission();
  });

  // 장면 5부터: 반·번호를 보고하고 장면 1~4를 마친 것으로 본 뒤 S8로
  const from5 = button('btn.from5', () => {
    if (!take()) return;
    rec.flags.from5 = true;
    rec.flags.s6 = true;
    rec.done = Array.from(new Set([...rec.done, 1, 2, 3, 4])).sort();
    saveRecord(rec);
    go('s8');
  }, 'small');

  const body = el('div', { className: 'report-body' }, form, status);
  const box = el('section', { className: 'report' }, ask, body, el('div', { className: 'corner' }, from5));
  root.append(box);

  function showMission() {
    const lines = [say('s3.mission', {}, 'p')];
    if (rec.trip === 2) lines.push(say('s3.mission2', {}, 'p'));
    const start = button('btn.missionStart', () => go('s4'), 'primary');
    const mission = el('div', { className: 'mission', role: 'status' }, ...lines, el('div', { className: 'btn-row' }, start));
    body.replaceChildren(mission);
    box.dataset.state = 'mission';
    start.focus();
  }

  box.dataset.state = 'form';
  return ask;
}
