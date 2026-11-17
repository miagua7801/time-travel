// 화면 만들기 공통 도구: 요소 만들기, 목소리별 문구, 단추, 그림
import { line, voiceOf, isDraft } from './text.js';

export function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids.filter((k) => k !== null && k !== undefined && k !== false));
  return node;
}

// copy.js 문구 하나를 목소리에 맞는 요소로. 목소리 표시는 화면에 나오지 않고 모양(class)으로만 쓴다.
// 초안 문구는 data-draft를 붙여 둔다 (화면에는 보이지 않음).
export function say(id, values = {}, tag = 'p') {
  const voice = voiceOf(id);
  const node = el(tag, { className: `say say-${voice}`, textContent: line(id, values) });
  node.dataset.copy = id;
  if (isDraft(id)) node.dataset.draft = 'true';
  if (voice === 'travis') {
    const box = el('div', { className: 'say say-travis' }, charImg('travis_basic', 'face'));
    node.className = 'say-text';
    box.dataset.copy = id;
    box.append(node);
    return box;
  }
  return node;
}

// 단추. kind: 'primary' | 'small' | ''
export function button(id, onClick, kind = '') {
  const b = el('button', { type: 'button', className: kind, textContent: line(id) });
  b.dataset.copy = id;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

// 그림. 끌어서 저장하기를 막는다. 받지 못하면 1초 뒤 한 번 더 받아 보고, 그래도 안 되면 그림만 빠진다.
export function img(src, className = '', alt = '') {
  const node = el('img', { src, className, alt, draggable: false, decoding: 'async' });
  let retried = false;
  node.addEventListener('error', () => {
    if (retried) { node.remove(); return; }
    retried = true;
    setTimeout(() => { if (node.isConnected) node.src = src + (src.includes('?') ? '&' : '?') + 'r=1'; }, 1000);
  });
  return node;
}

// 다음 화면에 쓸 그림을 미리 받아 둔다. 학급 전체가 한꺼번에 받을 때 빈 상자가 보이지 않게.
const kept = new Map(); // 주소 → Image (받은 그림이 메모리에서 빠지지 않게 잡아 둔다)
export function preload(urls) {
  for (const u of urls) {
    if (!u || kept.has(u)) continue;
    try {
      const im = new Image();
      im.decoding = 'async';
      if ('fetchPriority' in im) im.fetchPriority = 'low';
      im.src = u;
      kept.set(u, im);
    } catch (e) { /* 미리 받기 실패는 무시 */ }
  }
}
export const cardSrc = (name) => `assets/img/cards/${name}.webp`;
export const moodSrc = (key) => `assets/img/mood/mood_${key}.webp`;

export function charImg(name, className) {
  const node = img(`assets/characters/${name}.png`, className, '');
  node.decoding = 'sync'; // 문구보다 얼굴이 늦게 그려지지 않게
  return node;
}

// 묻기 칸의 Travis 얼굴을 미리 받아 둔다
preload(['assets/characters/travis_basic.png']);

// 움직임 줄이기를 켠 기기인가
export function reducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
}

// 화면이 바뀌면 멈춰야 하는 타이머·애니메이션을 모은다
const cleanups = [];
export function onLeave(fn) {
  cleanups.push(fn);
}
export function runLeave() {
  while (cleanups.length) {
    try { cleanups.pop()(); } catch (e) { /* 정리 실패는 무시 */ }
  }
}
export function later(ms, fn) {
  const id = setTimeout(fn, ms);
  onLeave(() => clearTimeout(id));
  return id;
}
