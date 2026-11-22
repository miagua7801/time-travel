// 단서 수첩 단추(★ n/5)와 그 옆의 "단서 기준" 말풍선.
// 가리키기(마우스)·키보드 포커스·누르기로 연다. show(ms)로 잠깐 자동으로 보여 줄 수도 있다.
//   mode 'inline'  말풍선이 단추 아래 줄에 끼어 들어가 아래 내용을 밀어낸다 (본문을 가리지 않음). 놓을 곳은 부르는 쪽이 정한다(rule.panel).
//   mode 'float'   말풍선이 단추 위에 뜬다 (길 지도 아래 띠처럼 위에 글이 없는 곳)
//   onClick        누르면 다른 일을 할 때(길 지도의 수첩 단추 → 단서 수첩). 이때는 가리키기·포커스로만 연다.
//                  false를 돌려주면 그때만 평소처럼 말풍선을 열고 닫는다.
import { el, say } from '../ui.js';
import { line } from '../text.js';

let seq = 0;

export function clueRule({ mode = 'inline', text, label, onClick } = {}) {
  const id = `clue-rule-${++seq}`;
  const button = el('button', { type: 'button', className: 'clue-count' });
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', id);
  const panel = el('div', { className: `clue-rule ${mode}`, id },
    say('rule.title'),
    el('ol', {}, ...[1, 2, 3].map((k) => el('li', {}, say(`rule.${k}`, {}, 'span')))));
  panel.hidden = true;
  const wrap = el('span', { className: 'clue-rule-wrap' }, button, mode === 'float' ? panel : null);

  let hover = false;
  let focus = false;
  let sticky = false;
  let timed = false;
  let timer = 0;
  const visible = () => hover || focus || sticky || timed;
  const sync = () => {
    const on = visible();
    panel.hidden = !on;
    button.setAttribute('aria-expanded', String(on));
  };

  button.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  button.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { hover = false; sync(); } });
  button.addEventListener('focus', () => { focus = true; sync(); });
  button.addEventListener('blur', () => { focus = false; sticky = false; sync(); });
  button.addEventListener('click', () => {
    if (onClick && onClick() !== false) return;
    timed = false;
    sticky = !sticky;
    if (!sticky) { hover = false; focus = false; } // 다시 누르면 닫는다
    sync();
  });
  const onKey = (e) => { if (e.key === 'Escape' && visible()) { hover = focus = sticky = timed = false; sync(); } };
  document.addEventListener('keydown', onKey);

  const paint = () => {
    button.textContent = text();
    if (label) button.setAttribute('aria-label', label());
  };
  paint();

  return {
    wrap,
    panel,
    button,
    refresh: paint,
    // 잠깐 자동으로 보여 준다
    show(ms = 4000) {
      timed = true;
      sync();
      clearTimeout(timer);
      timer = setTimeout(() => { timed = false; sync(); }, ms);
    },
    get open() { return visible(); },
    destroy() { clearTimeout(timer); document.removeEventListener('keydown', onKey); },
  };
}

export const ruleTitle = () => line('rule.title');
