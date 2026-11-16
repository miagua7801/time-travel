// 장면 카드 보기: 앞면(그림) ⇄ 뒷면(핵심 문장). 뒷면 문장은 잠긴 파일에서 받는다. (스토리보드 3장 S4)
import { el, button, img } from '../ui.js';
import { line } from '../text.js';
import { SCENES } from '../../data/scenes.js';
import { getStory } from '../content.js';

// 카드 한 장. 누르면(Enter·Space) 뒤집힌다.
export function makeCard(n, flipped = false) {
  const scene = SCENES[n - 1];
  const story = getStory();
  const back = story && story.cards && story.cards[String(n)] ? story.cards[String(n)].back : '';
  const front = el('span', { className: 'card-face card-front' }, img(`assets/img/cards/${scene.img}.webp`, '', line(`card.${scene.card}`)));
  const rear = el('span', { className: 'card-face card-back', lang: 'en', textContent: back });
  const card = el('button', { type: 'button', className: 'card' }, front, rear);
  const set = (on) => {
    card.classList.toggle('flipped', on);
    card.setAttribute('aria-pressed', String(on));
    front.hidden = on;
    rear.hidden = !on;
  };
  card.addEventListener('click', () => set(!card.classList.contains('flipped')));
  set(flipped);
  return card;
}

// 카드 보기 창. cards: 장면 번호 목록. 처음에는 모두 뒷면. "길 지도"나 Esc로 닫는다.
export function openCards(root, cards, { focusCard, onClose } = {}) {
  const items = cards.map((n) => ({ n, card: makeCard(n, true) }));
  const row = el('div', { className: 'card-row' }, ...items.map((it) => it.card));
  const close = button('btn.map', () => shut(), 'primary');
  const box = el('div', { className: 'cards-view' }, row, close);
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', line('btn.cardView'));
  const onKey = (e) => {
    if (e.key === 'Escape') { shut(); return; }
    if (e.key !== 'Tab') return;
    // 창 안에서만 Tab이 돈다
    const stops = [...items.map((it) => it.card), close];
    const at = stops.indexOf(document.activeElement);
    e.preventDefault();
    stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length].focus();
  };
  function shut() {
    document.removeEventListener('keydown', onKey, true);
    box.remove();
    if (onClose) onClose();
  }
  document.addEventListener('keydown', onKey, true);
  root.append(box);
  const first = items.find((it) => it.n === focusCard) || items[0];
  (first ? first.card : close).focus();
  return shut;
}
