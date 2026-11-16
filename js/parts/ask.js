// 묻기 칸: 확인 문제, 장면 완료(요약·카드·다음 장면), ★ 도전, 다시 보기의 내가 고른 답 (docs/ARCHITECTURE.md 3.4)
// 예측·관찰 일지는 그 장면을 만드는 단계에서 더한다.
import { el, say, button, img, later } from '../ui.js';
import { line } from '../text.js';

const HOLD_RIGHT = 1200;  // "맞아." 뒤 다음으로 넘어가기까지
const HOLD_WRONG2 = 4000; // 둘째 오답: 정답과 근거 줄을 볼 시간

// Travis 발문 상자. 글은 바꿔 끼울 수 있고, 바뀌면 role="status"로 알린다.
function travisBox(id) {
  const box = say(id);
  const text = box.querySelector('.say-text');
  text.setAttribute('role', 'status');
  return {
    box,
    text,
    set(copyId) {
      text.textContent = line(copyId);
      text.dataset.copy = copyId;
      box.dataset.copy = copyId;
    },
  };
}

// 영어 선지 3개 + "뜻 보기". 선지는 적힌 순서 그대로.
function optionRow(check, onPick) {
  let korean = false;
  const opts = check.options.map((o, i) => {
    const key = el('span', { className: 'opt-key', textContent: String(i + 1) });
    const text = el('span', { className: 'opt-text', lang: 'en', textContent: o.en });
    const mark = el('span', { className: 'opt-mark' });
    const b = el('button', { type: 'button', className: 'opt' }, key, text, mark);
    b.addEventListener('click', () => { if (onPick && !b.disabled) onPick(i); });
    return { b, text, mark };
  });
  const meaning = button('btn.meaning', () => {
    korean = !korean;
    meaning.setAttribute('aria-pressed', String(korean));
    opts.forEach((o, i) => {
      o.text.textContent = korean ? check.options[i].ko : check.options[i].en;
      o.text.lang = korean ? 'ko' : 'en';
    });
  }, 'small meaning');
  meaning.setAttribute('aria-pressed', 'false');
  return {
    el: el('div', { className: 'opt-row' }, ...opts.map((o) => o.b), meaning),
    opts,
    lock(on) { opts.forEach((o) => { o.b.disabled = on || o.b.classList.contains('is-wrong'); }); },
    // 색과 함께 기호로 표시한다
    mark(i, kind) {
      opts[i].b.classList.add(kind === 'right' ? 'is-right' : 'is-wrong');
      opts[i].mark.textContent = kind === 'right' ? '✓' : '✕';
    },
  };
}

// 확인 문제. 첫 오답: 근거 줄 밑줄 + "다시 고르기". 둘째 오답: 정답 표시 후 넘어감. 기록은 첫 시도만.
//   onFirst(pick, right)  첫 시도를 기록   onEvidence(d)  근거 줄 밑줄   onDone()  다음으로
export function checkAsk(id, check, { onFirst, onEvidence, onDone }) {
  const t = travisBox(`ask.${id}`);
  let tries = 0;
  let open = true;
  const row = optionRow(check, pick);
  const retry = button('btn.retry', () => {
    retry.hidden = true;
    t.set(`ask.${id}`);
    row.lock(false);
    open = true;
    const first = row.opts.find((o) => !o.b.disabled);
    if (first) first.b.focus();
  }, 'primary');
  retry.hidden = true;

  function pick(i) {
    if (!open) return;
    open = false;
    tries++;
    const right = i === check.answer;
    if (tries === 1) onFirst(i, right);
    row.lock(true);
    if (right) {
      row.mark(i, 'right');
      t.set('check.right');
      later(HOLD_RIGHT, onDone);
    } else if (tries === 1) {
      row.mark(i, 'wrong');
      t.set('check.wrong1');
      onEvidence(check.evidence);
      retry.hidden = false;
      retry.focus();
    } else {
      row.mark(i, 'wrong');
      row.mark(check.answer, 'right');
      t.set('check.wrong2');
      onEvidence(check.evidence);
      later(HOLD_WRONG2, onDone);
    }
  }

  return {
    el: el('div', { className: 'ask ask-check' }, t.box, el('div', { className: 'ask-line' }, row.el, retry)),
    focus: t.text,
    // 숫자 키 1~3
    key(n) { if (open && row.opts[n - 1] && !row.opts[n - 1].b.disabled) pick(n - 1); },
  };
}

// 다시 보기: 내가 첫 시도에 고른 답. 고칠 수 없다.
export function checkReview(id, check, saved) {
  const t = travisBox(`ask.${id}`);
  t.text.removeAttribute('role');
  const row = optionRow(check, null);
  row.lock(true);
  row.opts[saved.pick].b.setAttribute('aria-pressed', 'true');
  row.opts[saved.pick].b.classList.add('is-mine');
  if (saved.pick !== check.answer) row.mark(saved.pick, 'wrong');
  row.mark(check.answer, 'right');
  return el('div', { className: 'ask ask-check ask-review' }, t.box, el('div', { className: 'ask-line' }, row.el));
}

// ★ 도전: 한 줄 쓰기. 낼 때마다 저장한다. 고쳐서 다시 낼 수 있다.
function starForm(starId, values, saved, onSubmit) {
  const ask = say(`star.${starId}`, values);
  ask.id = `star-ask-${starId}`;
  const input = el('input', { type: 'text', className: 'star-input', maxLength: 100, autocomplete: 'off', value: saved || '' });
  input.setAttribute('aria-labelledby', ask.id);
  const status = el('p', { className: 'star-status' });
  status.setAttribute('role', 'status');
  const send = button('btn.report', null, 'primary');
  send.type = 'submit';
  const form = el('form', { className: 'star-form' }, input, send, status);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    onSubmit(text);
    status.textContent = line('star.saved');
    status.dataset.copy = 'star.saved';
  });
  input.addEventListener('input', () => { status.textContent = ''; });
  return { el: el('div', { className: 'ask ask-star' }, ask, form), input };
}

// 묻기 칸의 오른쪽 단추들 + 가운데 내용. "★ 도전"을 누르면 가운데가 쓰기 칸으로 바뀌고, 다시 누르면 돌아온다.
function withSide(main, mainButton, star) {
  const middle = el('div', { className: 'ask-middle' }, main);
  const side = el('div', { className: 'ask-side' }, mainButton);
  if (star) {
    let form = null;
    const toggle = button('btn.star', () => {
      const opening = !form;
      toggle.setAttribute('aria-expanded', String(opening));
      if (opening) {
        form = starForm(star.id, star.values, star.saved(), star.onSubmit);
        middle.replaceChildren(form.el);
        form.input.focus();
      } else {
        form = null;
        middle.replaceChildren(main);
      }
    }, 'small');
    toggle.setAttribute('aria-expanded', 'false');
    side.append(toggle);
  }
  return el('div', { className: 'ask-wide' }, middle, side);
}

// 장면 완료: Travis 요약 → 카드 획득 → "다음 장면" (+ "★ 도전")
export function doneView(scene, { onNext, star }) {
  const summary = say(`scene.${scene.n}.summary`);
  const got = el('div', { className: 'got' },
    img(`assets/img/cards/${scene.img}.webp`, 'got-card', ''),
    say('card.got', { card: line(`card.${scene.card}`) }));
  got.setAttribute('role', 'status');
  const next = button('btn.nextScene', onNext, 'primary');
  return { el: withSide(el('div', { className: 'ask ask-done' }, summary, got), next, star), focus: next };
}

// 다시 보기: 묻기 대신 내가 고른 답(기록이 있을 때만) + "길 지도" (+ "★ 도전")
export function reviewView(reviews, { onMap, star }) {
  const map = button('btn.map', onMap, 'primary');
  return { el: withSide(el('div', { className: 'ask-reviews' }, ...reviews), map, star), focus: map };
}
