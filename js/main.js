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
import { renderSign } from './screens/s9-sign.js';
import { renderCertificate } from './screens/s10-certificate.js';
import { renderRewind } from './screens/s11-rewind.js';
import { renderSoon } from './screens/soon.js';
import { flush } from './send.js';

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
  s9: renderSign,
  s10: renderCertificate,
  s11: renderRewind,
};
// 검은 바탕 화면
const DARK = new Set(['s0', 's1', 's2', 's6']);

// 앱 전체가 함께 쓰는 값
export const app = {
  rec: loadRecord(),
  access: 'pending', // 'ok' | 'nokey' | 'badkey' | 'fetch'
  fresh: false,      // 이번이 첫 접속인가 (S0에서 "접속"을 눌렀다). 장비 점검은 첫 접속에서만.
};

const screenEl = document.getElementById('screen');

// 누름으로 화면이 바뀐 직후, 같은 누름이 새 화면의 단추에 닿는 것을 막는다.
//   마우스·터치: 두 번 누르기(더블클릭)의 두 번째 누름 — 화면이 바뀐 뒤 SWITCH_GUARD_MS 동안의 누름을 무시한다.
//   키보드: Enter·Space·숫자 키를 누른 채로 있어 반복되는 입력 — 그 키를 뗄 때까지 반복 입력을 무시한다.
// 시간이 되어 저절로 바뀐 화면(영상 끝, 장면 완료 등)에는 걸지 않는다. 학생이 실제로 누른 것(isTrusted)만 본다.
const SWITCH_GUARD_MS = 400;
const ACT_KEY = (k) => k === 'Enter' || k === ' ' || /^[0-9]$/.test(k);
let lastInput = { kind: '', key: '', t: -1e9 };
let pointerGuardUntil = 0;
let heldKey = '';
// 포커스 테두리는 키보드로 움직일 때만 보인다. 마지막 입력이 마우스·터치면 <html data-input="pointer">로 감춘다(css).
// Chrome은 글자 칸에서 Enter를 한 번 치면 그 뒤 스크립트로 옮긴 포커스에도 테두리를 계속 그리므로, 직접 판단한다.
// 처음에는 마우스로 본다. 글자를 쓰는 키는 바꾸지 않고, 옮기기·누르기 키(Tab, Enter, Space, 화살표, Esc, 숫자)만 키보드로 바꾼다.
const MOVE_KEY = (k) => k === 'Tab' || k === 'Enter' || k === ' ' || k === 'Escape' || k === 'Home' || k === 'End' || k.startsWith('Arrow') || /^[0-9]$/.test(k);
function setInput(kind) {
  try { if (document.documentElement.dataset.input !== kind) document.documentElement.dataset.input = kind; } catch (e) { /* 무시 */ }
}
setInput('pointer');
window.addEventListener('pointerdown', (e) => { if (e.isTrusted) setInput('pointer'); }, true);
window.addEventListener('keydown', (e) => { if (e.isTrusted && MOVE_KEY(e.key)) setInput('keyboard'); }, true);

function guardInput(e) {
  if (!e.isTrusted) return;
  const now = performance.now();
  if (e.type === 'keyup') { if (e.key === heldKey) heldKey = ''; return; }
  if (e.type === 'keydown') {
    if (heldKey && e.repeat && e.key === heldKey) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (ACT_KEY(e.key)) lastInput = { kind: 'key', key: e.key, t: now };
    return;
  }
  if (e.type === 'click' && e.detail === 0) return; // Enter·Space로 누른 단추의 click (위의 키 입력이 맡음)
  if (now < pointerGuardUntil) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  lastInput = { kind: 'pointer', key: '', t: now };
}
for (const t of ['click', 'pointerdown', 'keydown', 'keyup']) window.addEventListener(t, guardInput, true);
function armGuard() {
  if (performance.now() - lastInput.t > 100) return; // 누름 때문에 바뀐 화면이 아님
  if (lastInput.kind === 'pointer') pointerGuardUntil = performance.now() + SWITCH_GUARD_MS;
  else heldKey = lastInput.key;
}

// 화면을 바꾸고 그 화면의 첫 문구(또는 돌려준 요소)로 포커스를 옮긴다
export function go(name, opts = {}) {
  armGuard();
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
  // 지난번에 보내지 못한 결과가 있으면 보낸다 (화면에는 알리지 않음)
  if (r.ok) flush();
}

boot();
