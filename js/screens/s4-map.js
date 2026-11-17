// S4 길 지도 (스토리보드 3장, docs/ARCHITECTURE.md 3.2)
// 칸 상태: 마침(카드 앞면) · 지금(강조) · 잠김(자물쇠). 마친 장면을 누르면 다시 보기.
// 수료증·단서 수첩 단추는 자리만 두었다. 가는 화면(S10·S11)과 S8은 해당 단계에서 만든다.
import { el, say, button, img } from '../ui.js';
import { line } from '../text.js';
import { saveRecord } from '../state.js';
import { SCENES, MAP_SPOTS } from '../../data/scenes.js';
import { NOTEBOOK_LIMIT } from '../../data/config.js';
import { openCards } from '../parts/cardview.js';

const LONG_PRESS_MS = 500;

// 지금 할 장면: 마치지 않은 첫 장면. 장면 5·6은 암호를 푼 뒤에만.
export function currentScene(rec) {
  const done = new Set(rec.done);
  for (const s of SCENES) {
    if (done.has(s.n)) continue;
    if (s.n >= 5 && !rec.flags.unlocked) return 0;
    return s.n;
  }
  return 0;
}

export function renderMap(root, { go, app }) {
  const rec = app.rec;
  const done = new Set(rec.done);
  const now = currentScene(rec);
  const status = el('div', { className: 'map-status', role: 'status' });
  const box = el('section', { className: 'map' });
  box.dataset.state = now ? `now-${now}` : 'none';

  const showCards = (focusCard) => {
    const cards = SCENES.filter((s) => done.has(s.n)).map((s) => s.n);
    if (!cards.length) return;
    const opener = document.activeElement;
    openCards(box, cards, { focusCard, onClose: () => { if (opener && opener.isConnected) opener.focus(); } });
  };

  const cells = SCENES.map((s, i) => {
    const state = done.has(s.n) ? 'done' : s.n === now ? 'now' : 'locked';
    const no = el('span', { className: 'cell-no', textContent: String(s.n) });
    const cell = el('button', { type: 'button', className: `cell is-${state}`, title: line(`scene.${s.n}.name`) });
    cell.dataset.scene = String(s.n);
    if (state === 'done') cell.append(img(`assets/img/cards/${s.img}.webp`, 'cell-card', line(`card.${s.card}`)), no);
    else if (state === 'now') { cell.append(no); cell.setAttribute('aria-current', 'step'); }
    else cell.append(el('span', { className: 'cell-lock', textContent: '🔒' }), no);

    // 길게 누르면 카드 보기 (마친 장면)
    let pressTimer = 0;
    let longPressed = false;
    if (state === 'done') {
      cell.addEventListener('pointerdown', () => {
        longPressed = false;
        pressTimer = setTimeout(() => { longPressed = true; showCards(s.n); }, LONG_PRESS_MS);
      });
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) cell.addEventListener(ev, () => clearTimeout(pressTimer));
    }
    cell.addEventListener('click', () => {
      if (longPressed) { longPressed = false; return; }
      if (state !== 'locked') { go('s5', { n: s.n }); return; }
      // 장면 4를 마친 뒤의 장면 5 칸은 암호 화면으로
      if (s.n === 5 && done.has(4)) { go('s8'); return; }
      status.replaceChildren(say('s4.locked'));
    });
    const li = el('li', { className: 'map-spot' }, cell);
    li.style.left = MAP_SPOTS[i][0] + '%';
    li.style.top = MAP_SPOTS[i][1] + '%';
    return { li, cell, state };
  });

  const mapImg = img('assets/img/map.webp', 'map-img', '');
  mapImg.decoding = 'sync'; // 칸보다 바탕 그림이 늦게 그려지지 않게
  const stage = el('div', { className: 'map-stage media' },
    mapImg,
    el('ol', { className: 'map-cells' }, ...cells.map((c) => c.li)));

  // 아래 단추들
  const bar = el('div', { className: 'btn-row map-buttons' });
  if (done.size) bar.append(button('btn.cardView', () => showCards(), ''));
  if (rec.flags.ended) bar.append(button('btn.certificate', () => go('s10'), ''));
  if (rec.trip === 2 || rec.flags.ended) {
    const notebook = el('button', { type: 'button', className: 'notebook', textContent: `★ ${rec.notes.length}/${NOTEBOOK_LIMIT}` });
    notebook.setAttribute('aria-label', `${line('notebook.name')} ${rec.notes.length}/${NOTEBOOK_LIMIT}`);
    notebook.addEventListener('click', () => go('s11', { view: 'notebook' }));
    bar.append(notebook);
  }
  bar.append(button('btn.replayVideo', () => go('s1', { replay: true, back: 's4' }), 'small'));
  // 여행 다시 고르기: 장면 1을 마치기 전까지. 장면 1에서 담은 단서는 비운다.
  if (!done.has(1)) {
    bar.append(button('btn.retrip', () => {
      rec.notes = [];
      saveRecord(rec);
      go('s2');
    }, 'small'));
  }

  box.append(stage, el('div', { className: 'map-bar' }, status, bar));
  root.append(box);
  const target = cells.find((c) => c.state === 'now') || cells.find((c) => c.state === 'done');
  return target ? target.cell : box;
}
