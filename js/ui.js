// 화면 만들기 공통 도구: 요소 만들기, 캐릭터 그림, 목소리별 문구 상자
import { LINES } from '../data/lines.js';
import { line, lineParts, lineVoice } from './text.js';

export function el(tag, props = {}, ...kids) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
}

// 그림 파일이 없으면 그림만 빠지고 글은 그대로 보인다
export function charImg(name, className) {
  const img = el('img', { className, src: `assets/characters/${name}.png`, alt: '' });
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

export function jobArt(key, className = 'job-art') {
  const img = el('img', { className, src: `assets/characters/job_${key}.png`, alt: '' });
  img.addEventListener('error', () => {
    const dot = el('div', { className: `job-dot ${className}` });
    dot.dataset.job = key;
    img.replaceWith(dot);
  }, { once: true });
  return img;
}

// 직업 이름: 굵게, 그 직업 색 바탕(노랑은 어두운 글자) — 색만으로 뜻을 전하지 않고 이름을 함께 쓴다
export function jobTag(key, name) {
  const tag = el('b', { className: 'job-tag', textContent: name });
  tag.dataset.job = key;
  return tag;
}

// 지시문 머리('[지령] 증거 확보:')와 지시 문장을 나눈다. 문구는 바꾸지 않고 자르기만 한다.
// '[지령] 빈칸에…'처럼 '○○:'가 없으면 머리는 '[지령]'만.
export function splitInstruction(text) {
  const m = /^(\[[^\]]+\])\s*(?:([^:.]{1,12}):\s*)?([\s\S]*)$/.exec(text);
  if (!m) return { badge: '', body: text };
  return { badge: m[2] ? `${m[1]} ${m[2]}` : m[1], body: m[3] };
}

// 퀘스트 지시문 공통 모양: 작은 색 배지 + 아래 줄에 지시 문장. 모든 챕터 화면이 이것을 쓴다.
export function instruction(id, values = {}, tag = 'h1') {
  const { badge, body } = splitInstruction(line(id, values));
  const node = el(tag, { className: 'instruction' });
  if (badge) node.append(el('span', { className: 'badge', textContent: badge }));
  node.append(el('span', { className: 'instr-text', textContent: body }));
  return node;
}

// lines.js 문구 하나를 목소리에 맞는 상자로. mark는 색 말고도 결과를 알리는 기호(✓ ✕)
// rich: { 자리이름: (값) => 노드들 } — { } 자리 하나를 꾸민 노드로 넣는다(글자는 그대로)
export function speak(id, values = {}, mark = '', rich = {}) {
  const face = (LINES[id] && LINES[id].face) || 'basic';
  const content = Object.keys(rich).length
    ? lineParts(id, values).flatMap((p) => (typeof p === 'string' ? [p] : rich[p.key] ? rich[p.key](p.value) : [p.value]))
    : line(id, values);
  return voiceBox(content, lineVoice(id), face, mark);
}

// lines.js 밖에 따로 확정된 문구(CORRECT_BLANK 등)를 같은 모양으로. text는 글자 또는 노드 배열
export function voiceBox(text, voice, face = 'basic', mark = '') {
  const parts = Array.isArray(text) ? text : [text];
  const markNode = () => el('span', { className: 'mark', textContent: mark, ariaHidden: 'true' });
  if (voice === 'travis') {
    const box = el('div', { className: 'line-box travis' }, charImg(`travis_${face}`, 'face'));
    if (mark) box.append(markNode());
    box.append(el('span', {}, ...parts));
    return box;
  }
  if (voice === 'narration') {
    return el('p', { className: 'narration' }, ...(mark ? [markNode()] : []), ...parts);
  }
  return el('p', { className: 'line-box' }, ...(mark ? [markNode()] : []), ...parts);
}
