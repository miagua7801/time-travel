// S0 접속 (스토리보드 2장, 8장)
// 상태: 열쇠 없음(또는 틀림) / 파일을 받지 못함 / 처음 / 재접속
import { el, say, button } from '../ui.js';
import { line } from '../text.js';
import { hasReport, clearRecord, newRecord, resumeTarget } from '../state.js';

export function renderAccess(root, { go, app }) {
  const box = el('section', { className: 'center-stack' });
  root.append(box);

  // 열쇠가 없거나 틀림: 단추 없음
  if (app.access === 'nokey' || app.access === 'badkey') {
    const msg = say('s0.noKey', {}, 'h1');
    box.dataset.state = 'nokey';
    box.append(msg);
    return msg;
  }

  // 잠긴 파일을 받지 못함 (초안 문구). "접속"으로 다시 시도한다.
  if (app.access === 'fetch') {
    const msg = say('s0.fetchFail', {}, 'h1');
    box.dataset.state = 'fetch';
    box.append(msg, button('btn.connect', () => location.reload(), 'primary'));
    return msg;
  }

  const rec = app.rec;

  // 처음: "접속"을 누르면 S1. 이 누름이 있어야 영상이 소리와 함께 재생된다.
  if (!hasReport(rec)) {
    const msg = say('s0.connect', {}, 'h1');
    box.dataset.state = 'first';
    box.append(msg, button('btn.connect', () => go(rec.flags.video ? 's2' : 's1'), 'primary'));
    return msg;
  }

  // 재접속
  const msg = say('s0.reconnect', {}, 'h1');
  box.dataset.state = 'return';
  const who = el('p', { className: 'who', textContent: line('s0.who', { cls: rec.cls, num: rec.num }) });
  const resume = button('btn.resume', () => go(resumeTarget(rec)), 'primary');
  const replay = button('btn.replayVideo', () => go('s1', { replay: true, back: 's0' }), 'small');
  const notMine = button('btn.notMine', () => confirmWipe(box, { go, app }), 'small');
  box.append(msg, who, resume, el('div', { className: 'btn-row small-row' }, replay, notMine));
  return msg;
}

// "내 기록이 아니다"의 확인: 지움 → 기록을 지우고 S1부터 / 취소 → 재접속 상태로
function confirmWipe(box, { go, app }) {
  const ask = say('s0.wipeAsk', {}, 'h1');
  const wipe = button('btn.wipe', () => {
    clearRecord();
    app.rec = newRecord();
    go('s1');
  }, 'primary');
  const cancel = button('btn.cancel', () => go('s0'));
  box.dataset.state = 'confirm';
  box.replaceChildren(ask, el('div', { className: 'btn-row confirm-row' }, wipe, cancel));
  ask.tabIndex = -1;
  ask.focus({ preventScroll: true });
}
