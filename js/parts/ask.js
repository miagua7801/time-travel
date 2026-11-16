// 묻기 칸: 확인 문제, 예측, 관찰 일지, 두 번째 여행의 문장 고르기, 장면 완료(요약·카드·다음 장면), ★ 도전,
// 다시 보기의 내가 고른 답 (docs/ARCHITECTURE.md 3.4, 3.6)
import { el, say, button, img, later } from '../ui.js';
import { line } from '../text.js';

const HOLD = 1500; // 짧은 확인 문구("맞아.", "네 예측, 기록했다." 등) 뒤 다음으로 넘어가기까지

// 발문 상자. 글은 바꿔 끼울 수 있고, 바뀌면 role="status"로 알린다. Travis 문구면 얼굴이 함께 보인다.
function promptBox(id, values = {}) {
  const face = say('check.right').querySelector('.face'); // Travis 얼굴
  const text = el('p', { className: 'say-text' });
  text.setAttribute('role', 'status');
  const box = el('div', { className: 'say say-travis prompt' }, face, text);
  const set = (copyId, v = {}) => {
    const s = say(copyId, v);
    const travis = s.classList.contains('say-travis');
    text.textContent = (travis ? s.querySelector('.say-text') : s).textContent;
    text.dataset.copy = copyId;
    box.dataset.copy = copyId;
    box.classList.toggle('no-face', !travis);
  };
  set(id, values);
  return { box, text, set };
}

// 선지 줄. items: [{ nodes: 선지 안에 넣을 것들 }]. 숫자 표시와 결과 기호 자리가 붙는다.
function choiceRow(items, onPick, extra = null) {
  const opts = items.map((it, i) => {
    const key = el('span', { className: 'opt-key', textContent: String(i + 1) });
    const mark = el('span', { className: 'opt-mark' });
    const b = el('button', { type: 'button', className: 'opt' + (it.className ? ' ' + it.className : '') }, key, ...it.nodes, mark);
    b.addEventListener('click', () => { if (onPick && !b.disabled) onPick(i); });
    return { b, mark };
  });
  return {
    el: el('div', { className: 'opt-row' }, ...opts.map((o) => o.b), extra),
    opts,
    lock(on) { opts.forEach((o) => { o.b.disabled = on || o.b.classList.contains('is-wrong'); }); },
    // 색과 함께 기호로 표시한다
    mark(i, kind) {
      opts[i].b.classList.add(kind === 'right' ? 'is-right' : 'is-wrong');
      opts[i].mark.textContent = kind === 'right' ? '✓' : '✕';
    },
    // 내가 고른 것 (맞다 틀리다 없이)
    mine(i) {
      opts[i].b.classList.add('is-mine');
      opts[i].b.setAttribute('aria-pressed', 'true');
      if (!opts[i].mark.textContent) opts[i].mark.textContent = '●';
    },
  };
}

// "뜻 보기": 영어 ⇄ 한국어. texts: [{ node, en, ko }]
function meaningButton(texts) {
  let korean = false;
  const b = button('btn.meaning', () => {
    korean = !korean;
    b.setAttribute('aria-pressed', String(korean));
    for (const t of texts) {
      t.node.textContent = korean ? t.ko : t.en;
      t.node.lang = korean ? 'ko' : 'en';
    }
  }, 'small meaning');
  b.setAttribute('aria-pressed', 'false');
  return b;
}

// 영어 선지 3개 + "뜻 보기". 선지는 적힌 순서 그대로.
function checkRow(check, onPick) {
  const texts = check.options.map((o) => ({ node: el('span', { className: 'opt-text', lang: 'en', textContent: o.en }), en: o.en, ko: o.ko }));
  return choiceRow(texts.map((t) => ({ nodes: [t.node] })), onPick, meaningButton(texts));
}

// 한국어 선택지 3개 (예측)
function predictRow(id, onPick) {
  return choiceRow(['a', 'b', 'c'].map((k) => ({ nodes: [el('span', { className: 'opt-text', textContent: line(`${id}.${k}`) })] })), onPick);
}

// 그림 카드 3장 + "뜻 보기" (관찰 일지)
function moodRow(mood, onPick) {
  const texts = mood.options.map((k) => ({ node: el('span', { className: 'opt-text', lang: 'en', textContent: k }), en: k, ko: line(`mood.${k}`) }));
  return choiceRow(mood.options.map((k, i) => ({
    className: 'mood',
    nodes: [img(`assets/img/mood/mood_${k}.webp`, 'mood-img', ''), texts[i].node],
  })), onPick, meaningButton(texts));
}

// ---------- 확인 문제 ----------
// 첫 오답: 근거 줄 밑줄 + "다시 고르기". 둘째 오답: 정답과 밑줄을 보인 채 단추를 눌러 넘어감. 기록은 첫 시도만.
//   onFirst(pick, right)  첫 시도를 기록   onEvidence(d)  근거 줄 밑줄   onDone()  다음으로
export function checkAsk(id, check, { onFirst, onEvidence, onDone }) {
  const t = promptBox(`ask.${id}`);
  let tries = 0;
  let open = true;
  const row = checkRow(check, pick);
  const retry = button('btn.retry', () => {
    retry.hidden = true;
    t.set(`ask.${id}`);
    row.lock(false);
    open = true;
    const first = row.opts.find((o) => !o.b.disabled);
    if (first) first.b.focus();
  }, 'primary');
  retry.hidden = true;
  // 둘째 오답 뒤: "문장을 한 번 더 읽고 가자." → 읽은 뒤 누르는 단추
  const goOn = button('btn.readDone', () => onDone(), 'primary');
  goOn.hidden = true;

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
      later(HOLD, onDone);
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
      goOn.hidden = false;
      goOn.focus();
    }
  }

  return {
    el: el('div', { className: 'ask ask-check' }, t.box, el('div', { className: 'ask-line' }, row.el, retry, goOn)),
    focus: t.text,
    key(n) { if (open && row.opts[n - 1] && !row.opts[n - 1].b.disabled) pick(n - 1); },
  };
}

export function checkReview(id, check, saved) {
  const t = promptBox(`ask.${id}`);
  t.text.removeAttribute('role');
  const row = checkRow(check, null);
  row.lock(true);
  row.opts[saved.pick].b.setAttribute('aria-pressed', 'true');
  row.opts[saved.pick].b.classList.add('is-mine');
  if (saved.pick !== check.answer) row.mark(saved.pick, 'wrong');
  row.mark(check.answer, 'right');
  return el('div', { className: 'ask ask-check ask-review' }, t.box, el('div', { className: 'ask-line' }, row.el));
}

// ---------- 예측 (첫 여행): 한국어 선택지 3개. 한 번 고르면 바꿀 수 없다 ----------
export function predictAsk(id, { onPick, onDone }) {
  const t = promptBox(`ask.${id}`);
  let open = true;
  const row = predictRow(id, (i) => {
    if (!open) return;
    open = false;
    onPick(['a', 'b', 'c'][i]);
    row.lock(true);
    row.mine(i);
    t.set('predict.saved');
    later(HOLD, onDone);
  });
  return {
    el: el('div', { className: 'ask ask-predict' }, t.box, el('div', { className: 'ask-line' }, row.el)),
    focus: t.text,
    key(n) { if (open && row.opts[n - 1]) row.opts[n - 1].b.click(); },
  };
}

export function predictReview(id, saved) {
  const t = promptBox(`ask.${id}`);
  t.text.removeAttribute('role');
  const row = predictRow(id, null);
  row.lock(true);
  row.mine(['a', 'b', 'c'].indexOf(saved));
  return el('div', { className: 'ask ask-predict ask-review' }, t.box, el('div', { className: 'ask-line' }, row.el));
}

// ---------- 관찰 일지: 그림 카드 3장. 고르면 본문 줄이 잠깐 빛나고, 맞다 틀리다는 말하지 않는다 ----------
export function moodAsk(id, mood, { onPick, onDone }) {
  const t = promptBox(`ask.${id}`);
  let open = true;
  const row = moodRow(mood, (i) => {
    if (!open) return;
    open = false;
    onPick(mood.options[i]);
    row.lock(true);
    row.mine(i);
    t.set('mood.saved');
    later(HOLD + 500, onDone);
  });
  return {
    el: el('div', { className: 'ask ask-mood' }, t.box, el('div', { className: 'ask-line' }, row.el)),
    focus: t.text,
    key(n) { if (open && row.opts[n - 1]) row.opts[n - 1].b.click(); },
  };
}

export function moodReview(id, mood, saved) {
  const t = promptBox(`ask.${id}`);
  t.text.removeAttribute('role');
  const row = moodRow(mood, null);
  row.lock(true);
  row.mine(mood.options.indexOf(saved));
  return el('div', { className: 'ask ask-mood ask-review' }, t.box, el('div', { className: 'ask-line' }, row.el));
}

// ---------- 두 번째 여행의 예측 자리: 본문의 ☆로 문장 하나를 고르거나 "없다" → 이유 한 줄(비워도 됨) ----------
//   startPicking(fn)  본문의 ☆가 fn(d)를 부르게 한다   stopPicking()   textOf(d)  그 줄의 글   onSave(d | null, why)
export function pickAsk(id, { startPicking, stopPicking, textOf, onSave, onDone }) {
  const t = promptBox('trip2.pick');
  const none = button('btn.none', () => chosen(null), '');
  const picked = el('p', { className: 'picked-line' });
  const input = el('input', { type: 'text', className: 'star-input', maxLength: 100, autocomplete: 'off' });
  input.setAttribute('aria-labelledby', `why-${id}`);
  t.text.id = `why-${id}`;
  const send = button('btn.report', null, 'primary');
  send.type = 'submit';
  const form = el('form', { className: 'star-form' }, input, send);
  form.hidden = true;
  const lineBox = el('div', { className: 'ask-line' }, none, picked);
  let d = null;
  let stage = 'pick';

  function chosen(dd) {
    if (stage !== 'pick') return;
    stage = 'why';
    d = dd;
    stopPicking(d);
    none.hidden = true;
    picked.textContent = d === null ? line('btn.none') : textOf(d);
    if (d !== null) picked.lang = 'en';
    t.set('trip2.why');
    form.hidden = false;
    input.focus();
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (stage !== 'why') return;
    stage = 'done';
    onSave(d, input.value.trim());
    input.disabled = true;
    send.disabled = true;
    t.set('trip2.saved');
    later(HOLD, onDone);
  });
  startPicking(chosen);

  return {
    el: el('div', { className: 'ask ask-pick' }, t.box, lineBox, form),
    focus: t.text,
    key() {},
  };
}

export function pickReview(saved, textOf) {
  const t = promptBox('trip2.pick');
  t.text.removeAttribute('role');
  const picked = el('p', { className: 'picked-line', textContent: saved.d === null ? line('btn.none') : textOf(saved.d) });
  if (saved.d !== null) picked.lang = 'en';
  const why = saved.why ? el('p', { className: 'picked-why', textContent: saved.why }) : null;
  return el('div', { className: 'ask ask-pick ask-review' }, t.box, el('div', { className: 'ask-line' }, picked, why));
}

// ---------- ★ 도전: 한 줄 쓰기. 낼 때마다 저장한다. 고쳐서 다시 낼 수 있다 ----------
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
