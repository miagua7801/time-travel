// 시작점: 공통 머리 영역과 화면 전환
import { sound } from './state.js';
import { stopAudio } from './audio.js';
import { renderId } from './screens/s0-id.js';
import { renderStart } from './screens/s1-start.js';
import { renderChapter } from './screens/chapter.js';

const SCREENS = {
  s0: renderId,
  s1: renderStart,
  chapter: renderChapter,
};

const PROGRESS = ['챕터 1', '챕터 2', '챕터 3', '시험'];

// 앱 전체가 공유하는 값: 지금 학생의 상태
export const app = { student: null };

const screenEl = document.getElementById('screen');
const topEl = document.getElementById('top');

function renderTop(progress) {
  topEl.replaceChildren();

  const list = document.createElement('ol');
  list.className = 'progress';
  list.setAttribute('aria-label', '진행');
  PROGRESS.forEach((label, i) => {
    const li = document.createElement('li');
    li.textContent = label;
    if (i < progress) li.classList.add('done');
    if (i === progress) { li.classList.add('now'); li.setAttribute('aria-current', 'step'); }
    list.append(li);
  });

  const snd = document.createElement('button');
  snd.type = 'button';
  snd.setAttribute('aria-pressed', String(sound.on));
  const label = () => { snd.textContent = sound.on ? '소리 끄기' : '소리 켜기'; };
  label();
  snd.addEventListener('click', () => {
    sound.on = !sound.on;
    snd.setAttribute('aria-pressed', String(sound.on));
    label();
  });

  topEl.append(list, snd);
}

// 화면을 바꾸고 그 화면의 제목(첫 지시문)으로 포커스를 옮긴다
export function go(name, opts = {}) {
  const render = SCREENS[name];
  if (!render) { console.warn(`[main] 없는 화면: ${name}`); return; }
  stopAudio();
  // 챕터 화면은 학생의 현재 챕터로 진행 막대를 채운다
  const chapterNow = name === 'chapter' && app.student ? Math.max((app.student.chapter || 1) - 1, 0) : 0;
  renderTop(opts.progress ?? chapterNow);
  screenEl.replaceChildren();
  const heading = render(screenEl, { go, app });
  if (heading) {
    heading.tabIndex = -1;
    heading.focus();
  }
}

go('s0');
