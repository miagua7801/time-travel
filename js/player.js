// 소리: 이어 듣기, 문장 듣기, 뉴스. (docs/ARCHITECTURE.md 5.4)
// 잠긴 음성 묶음을 풀어 덩어리별 소리 자료(AudioBuffer)로 바꿔 메모리에만 둔다. 주소(src)가 생기지 않는다.
// 이어 듣기는 덩어리를 Web Audio 시각에 맞춰 미리 줄 세워, 앞 덩어리가 끝나는 바로 그 시각에 다음 덩어리가 시작된다.
import { loadScenePack, dropScenePack } from './content.js';

let ctx = null;
let buffers = new Map();   // id → AudioBuffer (지금 장면 것만)
let edges = new Map();     // id → { head, tail } 파일 앞뒤의 조용한 구간(초)
const QUIET = 0.01;        // 이보다 작은 소리는 조용한 구간으로 본다
const GUARD = 0.04;        // 조용한 구간을 건너뛸 때 말소리 앞뒤로 남겨 두는 여유(초)
let loadedScene = 0;
let current = null;        // 재생 중인 것 { sources, timer, onEnd }
let log = { plan: [], ended: [] }; // 마지막 재생의 시간 기록 (점검용. 덩어리 id와 시각만)

function audioContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { ctx = null; }
  }
  return ctx;
}

// 장면의 소리를 준비한다. 돌려주는 것: 쓸 수 있으면 true. false면 듣기 단추를 흐리게 한다.
// 받는 도중에 다른 장면을 받기 시작하면(이전 장면 다시 보기 ↔ 지금 장면) 앞의 것은 버리고 false를 돌려준다.
let loading = 0;
export async function loadSceneAudio(n) {
  if (loadedScene === n && buffers.size) return true;
  const my = ++loading;
  stop();
  buffers = new Map();
  edges = new Map();
  loadedScene = 0;
  const ac = audioContext();
  if (!ac) return false;
  const pack = await loadScenePack(n);
  if (my !== loading || !pack) return false;
  const bufs = new Map();
  const eds = new Map();
  try {
    await Promise.all(pack.ids.map(async (id) => {
      const bytes = pack.get(id);
      const buf = await ac.decodeAudioData(bytes.buffer);
      bufs.set(id, buf);
      eds.set(id, quietEdges(buf));
    }));
  } catch (e) {
    return false;
  }
  if (my !== loading) return false;
  buffers = bufs;
  edges = eds;
  loadedScene = n;
  return true;
}

// 파일 앞뒤의 조용한 구간 길이(초)
function quietEdges(buf) {
  const ch = buf.getChannelData(0);
  const n = ch.length;
  let a = 0;
  while (a < n && Math.abs(ch[a]) < QUIET) a++;
  let b = 0;
  while (b < n - a && Math.abs(ch[n - 1 - b]) < QUIET) b++;
  return { head: a / buf.sampleRate, tail: b / buf.sampleRate };
}

export function dropSceneAudio() {
  loading++;
  stop();
  buffers = new Map();
  edges = new Map();
  loadedScene = 0;
  dropScenePack();
}

export const hasSound = (id) => buffers.has(id);

// 덩어리들을 순서대로 끊김 없이 튼다.
//   pause(i)       i번째 덩어리 앞의 쉼(밀리초). 숫자면 두 파일 사이의 조용한 구간을 건너뛰고 그만큼만 쉰다. null이면 파일을 그대로 잇는다.
//   onStep(i, id)  i번째 덩어리가 시작될 때
//   onEnd(done)    끝까지 틀었으면 true, 도중에 멈췄으면 false
export function play(ids, { pause, onStep, onEnd } = {}) {
  stop();
  const ac = audioContext();
  const list = ids.filter((id) => buffers.has(id));
  if (!ac || !list.length) { if (onEnd) onEnd(false); return false; }
  if (ac.state === 'suspended') ac.resume().catch(() => {});

  let at = ac.currentTime + 0.08;
  const plan = [];
  const pauseAt = (i) => { const p = pause ? pause(i) : null; return typeof p === 'number' ? p / 1000 : null; };
  const sources = list.map((id, i) => {
    const buf = buffers.get(id);
    const e = edges.get(id);
    const before = i > 0 ? pauseAt(i) : null;
    const after = i < list.length - 1 ? pauseAt(i + 1) : null;
    const cutHead = before !== null ? Math.max(0, e.head - GUARD) : 0;
    const cutTail = after !== null ? Math.max(0, e.tail - GUARD) : 0;
    const dur = Math.max(0.05, buf.duration - cutHead - cutTail);
    const keptHead = e.head - cutHead;
    const keptTail = e.tail - cutTail;
    // 남겨 둔 여유까지 합쳐서 쉼이 정한 길이가 되게 한다
    if (before !== null) at += Math.max(0, before - plan[i - 1].keptTail - keptHead);
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.connect(ac.destination);
    src.start(at, cutHead, dur);
    plan.push({ id, at, dur, keptHead, keptTail });
    at += dur;
    return src;
  });
  const endAt = at;
  log = { plan, ended: [] };
  sources.forEach((src, i) => {
    src.onended = () => { if (current && current.sources === sources) log.ended.push({ id: plan[i].id, t: ac.currentTime }); };
  });

  let step = -1;
  const tick = () => {
    const now = ac.currentTime;
    let i = step;
    while (i + 1 < plan.length && now >= plan[i + 1].at) i++;
    if (i !== step) {
      step = i;
      if (onStep) onStep(i, plan[i].id);
    }
    if (now >= endAt) finish(true);
  };
  const finish = (done) => {
    if (!current || current.sources !== sources) return;
    clearInterval(current.timer);
    current = null;
    if (!done) sources.forEach((s) => { s.onended = null; try { s.stop(); } catch (e) { /* 이미 끝남 */ } });
    if (onEnd) onEnd(done);
  };
  current = { sources, timer: setInterval(tick, 50), finish };
  tick();
  return true;
}

export function stop() {
  if (current) current.finish(false);
}

export const isPlaying = () => Boolean(current);

// 점검용: 마지막 재생에서 덩어리 사이 틈(밀리초).
//   planned  줄 세운 시각의 틈 (앞 덩어리가 끝나는 시각 → 다음 덩어리가 시작하는 시각)
//   quiet    실제로 들리는 조용한 구간 (planned + 앞 덩어리 끝과 다음 덩어리 앞에 남은 조용한 구간)
//   raw      파일을 그대로 이었을 때의 조용한 구간 (앞 파일 끝 + 다음 파일 앞)
//   endedLag 앞 덩어리가 끝났다고 브라우저가 알려 온 시각 − 줄 세운 끝 시각
export function gapReport() {
  const rows = [];
  for (let i = 0; i + 1 < log.plan.length; i++) {
    const a = log.plan[i];
    const b = log.plan[i + 1];
    const e = log.ended.find((x) => x.id === a.id);
    const planned = b.at - (a.at + a.dur);
    rows.push({
      from: a.id, to: b.id,
      planned: planned * 1000,
      quiet: (planned + a.keptTail + b.keptHead) * 1000,
      raw: (edges.get(a.id).tail + edges.get(b.id).head) * 1000,
      endedLag: e ? (e.t - (a.at + a.dur)) * 1000 : null,
    });
  }
  return rows;
}
