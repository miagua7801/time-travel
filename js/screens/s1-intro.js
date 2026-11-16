// S1 도입 영상 (스토리보드 2장)
// 첫 접속: 건너뛰기 없음, 끝나면 S2. 다시 보기: "건너뛰기"가 있고 끝나면 온 화면으로.
// 3초 안에 시작되지 않거나 열리지 않으면 바로 넘어간다.
import { el, button, later, onLeave } from '../ui.js';
import { saveRecord } from '../state.js';
import { VIDEO_VOLUME, VIDEO_WAIT_MS } from '../../data/config.js';

export function renderIntro(root, { go, app, opts }) {
  const replay = Boolean(opts.replay);
  const next = replay ? (opts.back || 's0') : 's2';

  const video = el('video', {
    className: 'intro-video media',
    src: 'assets/img/video/intro_web.mp4',
    preload: 'auto',
    playsInline: true,
    disablePictureInPicture: true,
    controls: false,
  });
  video.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback');
  video.setAttribute('aria-hidden', 'true');
  video.volume = VIDEO_VOLUME;

  const stage = el('section', { className: 'intro' }, video);
  root.append(stage);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (!replay && !app.rec.flags.video) {
      app.rec.flags.video = true;
      saveRecord(app.rec);
    }
    go(next);
  };

  video.addEventListener('ended', finish);
  video.addEventListener('error', finish);
  onLeave(() => { video.pause(); video.removeAttribute('src'); video.load(); });

  // 3초 안에 재생이 시작되지 않으면 넘어간다
  let started = false;
  video.addEventListener('playing', () => { started = true; }, { once: true });
  later(VIDEO_WAIT_MS, () => { if (!started) finish(); });

  const p = video.play();
  if (p && p.catch) p.catch(() => { /* 재생이 막히면 3초 뒤 넘어간다 */ });

  if (replay) {
    const skip = button('btn.skip', finish, 'small skip');
    stage.append(skip);
    return skip;
  }
  return stage;
}
