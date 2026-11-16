// S8 암호 입력 (스토리보드 5장, docs/ARCHITECTURE.md 4.4, 결정 17)
// 반마다 다른 낱말. config.js에는 SHA-256("tt8:" + 반 + ":" + 대문자로 바꾼 암호)만 있다. 대소문자 구분 없음.
// 맞으면 "잠금이 풀렸다." → 장면 5. "길 지도"로 돌아갈 수 있다.
import { el, say, button, later } from '../ui.js';
import { saveRecord } from '../state.js';
import { CODE_HASHES } from '../../data/config.js';

const OPEN_MS = 1200; // "잠금이 풀렸다."를 보여 주는 시간

async function codeHash(cls, code) {
  const bytes = new TextEncoder().encode('tt8:' + cls + ':' + String(code).trim().toUpperCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function renderCode(root, { go, app }) {
  const rec = app.rec;
  const ask = say('s8.ask', {}, 'h1');
  ask.id = 's8-ask';
  const input = el('input', { type: 'text', id: 's8-code', className: 'code-input', maxLength: 12, autocomplete: 'off', spellcheck: false });
  input.setAttribute('autocapitalize', 'characters');
  input.setAttribute('aria-labelledby', 's8-ask');
  input.addEventListener('input', () => { input.value = input.value.replace(/[^A-Za-z]/g, ''); });
  const status = el('div', { className: 'status', role: 'status' });
  const unlock = button('btn.unlock', null, 'primary');
  unlock.type = 'submit';
  const form = el('form', { className: 'report-form' }, input, el('div', { className: 'btn-row' }, unlock));
  let busy = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    let right = false;
    try {
      right = Boolean(input.value) && (await codeHash(rec.cls, input.value)) === CODE_HASHES[rec.cls];
    } catch (err) { right = false; }
    if (!right) {
      busy = false;
      status.replaceChildren(say('s8.wrong'));
      input.select();
      input.focus();
      return;
    }
    rec.flags.unlocked = true;
    saveRecord(rec);
    const open = say('s8.open');
    open.classList.add('code-ok');
    open.setAttribute('role', 'status');
    body.replaceChildren(open);
    box.dataset.state = 'open';
    later(OPEN_MS, () => go('s5', { n: 5 }));
  });

  const map = button('btn.map', () => go('s4'), 'small');
  const body = el('div', { className: 'report-body' }, form, status);
  const box = el('section', { className: 'report' }, ask, body, el('div', { className: 'corner' }, map));
  box.dataset.state = 'form';
  root.append(box);
  return input;
}
