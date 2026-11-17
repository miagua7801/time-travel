// S9 간판 고치기 (스토리보드 6장, docs/ARCHITECTURE.md 3.2, 결정 6)
// 카드 1 그림의 간판 자리에 틀린 간판 글(잠긴 데이터)을 앱이 쓴다. 고칠 낱말 7개는 단추, 나머지 3개는 누를 수 없다.
// 낱말을 누르면 간판 아래에 선지 2개(열 때마다 좌우를 섞음). 맞으면 간판의 낱말이 바뀐다.
// 틀리면 고른 선지에 ✕가 붙고 흐려지며 남은 선지만 누를 수 있다. 흔들기·문구 없음.
// 다 고치면 내레이션 → "수료증"(S10).
import { el, say, button, img, onLeave } from '../ui.js';
import { saveRecord } from '../state.js';
import { getStory } from '../content.js';
import { SIGN_SPOT } from '../../data/scenes.js';
import { signBox } from '../parts/sign.js';
import { openCards } from '../parts/cardview.js';

const MARGIN_X = 8;   // 간판 둘레에 함께 보이는 그림 (그림 너비 기준 %)
const MARGIN_Y = 8;

function shuffle2() {
  return Math.random() < 0.5 ? [0, 1] : [1, 0];
}

export function renderSign(root, { go, app }) {
  const rec = app.rec;
  const story = getStory();
  const sign = story && story.sign;
  const fixable = new Map((sign ? sign.words : []).map((w, i) => [String(w.wrong).toLowerCase(), i]));
  const fixed = new Set(rec.sign.fixed);

  const head = say('s9.open', {}, 'h1');

  // ----- 간판: 그림을 간판 둘레만 잘라 크게 보인다 -----
  const cropX = SIGN_SPOT.left - MARGIN_X;
  const cropY = SIGN_SPOT.top - MARGIN_Y;
  const cropW = SIGN_SPOT.width + MARGIN_X * 2;
  const cropH = SIGN_SPOT.height + MARGIN_Y * 2;
  const host = el('div', { className: 'sign-host s9-host media' }, img('assets/img/cards/card_1_sign.webp', 's9-img', ''));
  host.style.setProperty('--crop-x', cropX);
  host.style.setProperty('--crop-y', cropY);
  host.style.setProperty('--crop-w', cropW);
  const stage = el('div', { className: 's9-stage' }, host);
  stage.style.setProperty('--crop-ratio', `${cropW} / ${cropH}`);

  // 틀린 간판 글을 낱말로 나눈다. 낱말 뒤의 문장부호는 그대로 둔다.
  const tokens = String(sign ? sign.wrong : '').split(/\s+/).filter(Boolean).map((t) => {
    const m = t.match(/^([A-Za-z]+)(.*)$/) || [t, t, ''];
    return { word: m[1], tail: m[2], index: fixable.has(m[1].toLowerCase()) ? fixable.get(m[1].toLowerCase()) : -1 };
  });
  const wordButtons = new Map(); // 낱말 순번 → 단추
  const parts = [];
  tokens.forEach((t, k) => {
    if (k) parts.push(' ');
    if (t.index < 0) {
      parts.push(el('span', { className: 'sign-word locked', textContent: t.word }), t.tail);
      return;
    }
    const w = sign.words[t.index];
    const b = el('button', { type: 'button', className: 'sign-word', textContent: t.word });
    b.dataset.index = String(t.index);
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => openWord(t.index));
    wordButtons.set(t.index, { b, w });
    parts.push(b, t.tail);
  });
  host.append(signBox(...parts));

  // ----- 선지 -----
  const choices = el('div', { className: 's9-choices' });
  choices.setAttribute('role', 'group');
  let current = -1;

  function markFixed(i) {
    const { b, w } = wordButtons.get(i);
    b.textContent = w.options[w.answer];
    b.classList.add('fixed');
    b.disabled = true;
    b.setAttribute('aria-pressed', 'false');
  }

  function openWord(i) {
    if (fixed.has(i)) return;
    for (const [j, x] of wordButtons) x.b.setAttribute('aria-pressed', String(j === i));
    current = i;
    const w = wordButtons.get(i).w;
    const opts = shuffle2().map((k, pos) => {
      const mark = el('span', { className: 'opt-mark' });
      const b = el('button', { type: 'button', className: 'opt s9-opt' },
        el('span', { className: 'opt-key', textContent: String(pos + 1) }),
        el('span', { className: 'opt-text', lang: 'en', textContent: w.options[k] }), mark);
      b.addEventListener('click', () => pick(i, k, b, mark));
      return b;
    });
    choices.replaceChildren(...opts);
    choices.setAttribute('aria-label', w.wrong);
    box.dataset.state = 'choose';
    opts[0].focus();
  }

  function pick(i, k, b, mark) {
    if (b.disabled || current !== i) return;
    const w = wordButtons.get(i).w;
    if (k !== w.answer) {
      rec.sign.wrong = (rec.sign.wrong || 0) + 1;
      saveRecord(rec);
      b.disabled = true;
      b.classList.add('is-wrong');
      mark.textContent = '✕';
      const rest = [...choices.querySelectorAll('button')].find((x) => !x.disabled);
      if (rest) rest.focus();
      return;
    }
    fixed.add(i);
    rec.sign.fixed = [...fixed].sort((a, z) => a - z);
    saveRecord(rec);
    markFixed(i);
    choices.replaceChildren();
    current = -1;
    if (fixed.size === wordButtons.size) { allDone(); return; }
    box.dataset.state = 'words';
    // 다음 고칠 낱말로
    const next = [...wordButtons.keys()].map((j) => wordButtons.get(j).b).find((x) => !x.disabled && Number(x.dataset.index) > i)
      || [...wordButtons.values()].map((x) => x.b).find((x) => !x.disabled);
    if (next) next.focus();
  }

  function allDone() {
    box.dataset.state = 'done';
    const done = say('s9.done');
    done.setAttribute('role', 'status');
    const cert = button('btn.certificate', () => go('s10'), 'primary');
    choices.replaceChildren(done, cert);
    cert.focus();
  }

  // 카드 보기: 간판 카드의 뒷면(원래 간판 문구)
  const cards = button('btn.cardView', () => {
    const opener = document.activeElement;
    openCards(box, [1], { onClose: () => { if (opener && opener.isConnected) opener.focus(); } });
  }, '');

  const onKey = (e) => {
    if (box.dataset.state !== 'choose' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '1' || e.key === '2') {
      const b = choices.querySelectorAll('button')[Number(e.key) - 1];
      if (b) b.click();
    }
  };
  document.addEventListener('keydown', onKey);

  const box = el('section', { className: 's9' }, head, stage, el('div', { className: 's9-bottom' }, choices, el('div', { className: 's9-side' }, cards)));
  box.dataset.state = 'words';
  root.append(box);
  for (const i of fixed) if (wordButtons.has(i)) markFixed(i);
  if (wordButtons.size && fixed.size === wordButtons.size) allDone();

  onLeave(() => document.removeEventListener('keydown', onKey));
  return head;
}
