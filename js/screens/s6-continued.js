// S6 To be continued (스토리보드 4장, docs/ARCHITECTURE.md 3.2, 결정 8·9·28)
// ① T. rex 카드 큰 그림 + 큰 글씨 + 음성 → ② 예측 ②(첫 여행만) → ③ 암전 "To be continued" → ④ 본부 문구와 "길 지도"
// 2차시(S3에서 보고한 날과 다른 날)이면 본부 문구가 이동 지령으로 바뀌고 "이어서 출발"(S8)이 함께 나온다.
import { el, say, button, img, later, onLeave } from '../ui.js';
import { line } from '../text.js';
import { saveRecord, isSecondDay } from '../state.js';
import { getStory } from '../content.js';
import { loadSceneAudio, dropSceneAudio, play } from '../player.js';
import { queueResult } from '../send.js';
import { SCENES } from '../../data/scenes.js';
import { LISTEN_PAUSE_INLINE_MS } from '../../data/config.js';
import { predictAsk } from '../parts/ask.js';

const VOICE = ['R_6_9', 'R_6_10']; // 큰 글씨 문장의 출판사 음성 (장면 4 묶음)
const SHOW_MS = 2500;  // 음성이 없을 때 큰 글씨를 보여 주는 시간
const AFTER_MS = 600;  // 음성이 끝난 뒤 다음으로 넘어가기까지
const TITLE_MS = 2200; // "To be continued"를 보여 주는 시간

export function renderContinued(root, { go, app }) {
  const rec = app.rec;
  const story = getStory();
  const scene = SCENES[3];
  let alive = true;
  let liveAsk = null;

  const quote = el('h1', { className: 'tbc-quote', lang: 'en', textContent: (story && story.quotes && story.quotes.s6) || '' });
  const askBox = el('div', { className: 'tbc-ask' });
  askBox.hidden = true;
  const title = el('p', { className: 'tbc-title', lang: 'en', textContent: line('s6.continued') });
  const end = el('div', { className: 'tbc-end' });
  end.hidden = true;
  const dark = el('div', { className: 'tbc-dark' }, title, end);
  const box = el('section', { className: 'tbc media' }, img(`assets/img/cards/${scene.img}.webp`, 'tbc-img', ''), quote, askBox, dark);
  box.dataset.step = 'quote';
  root.append(box);

  // ② 예측 ②: 첫 여행만, 아직 고르지 않았을 때
  function stepPredict() {
    if (!alive) return;
    if (rec.trip === 2 || rec.predict.p2) { stepDark(); return; }
    const ask = predictAsk('p2', {
      onPick(key) {
        rec.predict.p2 = key;
        saveRecord(rec);
      },
      onDone: () => { liveAsk = null; stepDark(); },
    });
    liveAsk = ask;
    askBox.replaceChildren(ask.el);
    askBox.hidden = false;
    box.dataset.step = 'predict';
    ask.focus.tabIndex = -1;
    ask.focus.focus({ preventScroll: true });
  }

  // ③ 암전
  function stepDark() {
    if (!alive) return;
    askBox.hidden = true;
    dark.classList.add('on');
    box.dataset.step = 'dark';
    later(TITLE_MS, stepEnd);
  }

  // ④ 본부 문구와 단추. 여기까지 보면 S6을 본 것으로 저장하고 1차시 기록을 대기열에 올린다.
  function stepEnd() {
    if (!alive) return;
    rec.flags.s6 = true;
    saveRecord(rec);
    queueResult(rec);
    const second = isSecondDay(rec);
    const msg = say(second ? 's6.go5' : 's6.wait');
    msg.setAttribute('role', 'status');
    const map = button('btn.map', () => go('s4'), second ? '' : 'primary');
    const row = el('div', { className: 'btn-row' });
    let first = map;
    if (second) {
      first = button('btn.resume', () => go('s8'), 'primary');
      row.append(first);
    }
    row.append(map);
    end.replaceChildren(msg, row);
    end.hidden = false;
    box.dataset.step = 'end';
    first.focus();
  }

  // ① 큰 글씨 + 음성. 소리를 못 받으면 글씨만 잠깐 보여 준다.
  loadSceneAudio(4).then((ok) => {
    if (!alive) return;
    const started = ok && play(VOICE, {
      pause: () => LISTEN_PAUSE_INLINE_MS,
      onEnd: () => { if (alive) later(AFTER_MS, stepPredict); },
    });
    if (!started) later(SHOW_MS, stepPredict);
  });

  const onKey = (e) => {
    if (!liveAsk || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key >= '1' && e.key <= '3') liveAsk.key(Number(e.key));
  };
  document.addEventListener('keydown', onKey);
  onLeave(() => {
    alive = false;
    document.removeEventListener('keydown', onKey);
    dropSceneAudio();
  });
  return quote;
}
