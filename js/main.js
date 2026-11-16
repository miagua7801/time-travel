// 시작점: 열쇠 확인, 화면 전환, 모든 화면 공통(저작권 문구, 그림·영상 보호)
import { openContent } from './content.js';
import { line } from './text.js';
import { runLeave } from './ui.js';
import { loadRecord } from './state.js';
import { renderAccess } from './screens/s0-access.js';
import { renderIntro } from './screens/s1-intro.js';
import { renderTitle } from './screens/s2-title.js';
import { renderReport } from './screens/s3-report.js';
import { renderMap } from './screens/s4-map.js';
import { renderScene } from './screens/s5-scene.js';
import { renderContinued } from './screens/s6-continued.js';
import { renderRecap } from './screens/s7-recap.js';
import { renderCode } from './screens/s8-code.js';
import { renderSoon } from './screens/soon.js';

// 아직 만들지 않은 화면은 "준비 중" 자리로 간다
const SCREENS = {
  s0: renderAccess,
  s1: renderIntro,
  s2: renderTitle,
  s3: renderReport,
  s4: renderMap,
  s5: renderScene,
  s6: renderContinued,
  s7: renderRecap,
  s8: renderCode,
};
// 검은 바탕 화면
const DARK = new Set(['s0', 's1', 's2', 's6']);

// 앱 전체가 함께 쓰는 값
export const app = {
  rec: loadRecord(),
  access: 'pending', // 'ok' | 'nokey' | 'badkey' | 'fetch'
};

const screenEl = document.getElementById('screen');

// 화면을 바꾸고 그 화면의 첫 문구(또는 돌려준 요소)로 포커스를 옮긴다
export function go(name, opts = {}) {
  runLeave();
  const render = SCREENS[name] || renderSoon;
  document.body.classList.toggle('dark', DARK.has(name));
  document.body.dataset.screen = name;
  screenEl.replaceChildren();
  const focusTarget = render(screenEl, { go, app, opts, name });
  if (focusTarget) {
    if (!focusTarget.hasAttribute('tabindex') && !/^(BUTTON|INPUT|A|SELECT|TEXTAREA)$/.test(focusTarget.tagName)) focusTarget.tabIndex = -1;
    focusTarget.focus({ preventScroll: true });
  }
}

// 그림·영상: 오른쪽 누르기와 끌어서 저장하기를 막는다
function protectMedia() {
  const isMedia = (t) => t instanceof Element && t.closest('img, video, picture, canvas, .media');
  document.addEventListener('contextmenu', (e) => { if (isMedia(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', (e) => { if (isMedia(e.target)) e.preventDefault(); });
}

function renderNotice() {
  document.getElementById('notice').textContent = line('notice');
}

async function boot() {
  renderNotice();
  protectMedia();
  const r = await openContent();
  app.access = r.ok ? 'ok' : r.reason;
  go('s0');
}

boot();
