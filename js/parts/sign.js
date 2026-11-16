// 간판 글자: 카드 1 그림의 빈 간판 자리에 앱이 글자를 얹어 쓴다. 그림 파일에는 글자가 없다.
// 자리는 data/scenes.js의 SIGN_SPOT(그림 기준 %). 장면 1과 S9 간판 고치기가 같은 자리를 쓴다.
// 글자 크기는 그림 너비에 맞춰 달라지므로, 얹는 곳(부모)은 container-type: inline-size 여야 한다 (.sign-host).
import { el } from '../ui.js';
import { getStory } from '../content.js';
import { SIGN_SPOT } from '../../data/scenes.js';

// 간판 자리에 놓인 빈 글자 칸. 안의 내용은 부르는 쪽이 채운다.
export function signBox(...kids) {
  const box = el('div', { className: 'sign-text', lang: 'en' }, ...kids);
  box.style.left = SIGN_SPOT.left + '%';
  box.style.top = SIGN_SPOT.top + '%';
  box.style.width = SIGN_SPOT.width + '%';
  box.style.height = SIGN_SPOT.height + '%';
  return box;
}

// 올바른 간판 문구 (잠긴 데이터의 카드 1 뒷면 문장). 대문자로.
export function signText() {
  const story = getStory();
  const back = story && story.cards && story.cards['1'] ? story.cards['1'].back : '';
  return String(back).toUpperCase();
}
