// 장비 점검 (사용법 안내, 스토리보드 3장): 화면을 어둡게 덮고, 누를 단추 자리만 밝게 남겨 흰 점선으로 두른다.
// 그 옆에 흰 글씨 [본부] 문구 한 줄을 두고 흰 점선 곡선으로 단추와 잇는다 (교사가 준 레퍼런스 모양).
// 따로 화면을 만들지 않고 화면(host) 위에 얹는다. 움직이는 효과 없음.
//
// 누름 처리 (block):
//   'none'    덮개는 누름을 막지 않는다. 단추는 원래대로 동작하고, 장면 화면이 did(no)로 알려 주면 다음으로 (수첩이 찼을 때 안내 등)
//   'target'  가리킨 단추를 누르면 설명만 닫히거나 넘어가고 원래 동작은 일어나지 않는다. 다른 단추는 원래대로 (6·7단계)
//   'all'     가리킨 단추를 누르면 설명만 넘어간다. 그 밖의 단추도 원래 동작을 막는다 (장비 점검 1~5단계: 소리가 한 순간도 나지 않게)
//   가리킨 단추를 누르는 것은 click을 가장 먼저(capture) 받아 멈추므로, 단추의 원래 처리는 불리지 않는다. Enter·Space도 click으로 온다.
// 키보드 (block 'all'): Tab·Shift+Tab은 가리킨 단추와 "건너뛰기"(있을 때) 사이에서만 돈다. 본문 줄과 다른 단추로 가지 않는다.
//   가리킨 단추가 아직 준비되지 않았으면(소리를 받는 동안 잠긴 이어 듣기 등) 포커스는 안내 문구에 두고, 준비되는 순간 단추로 옮긴다.
//   안내 문구에 포커스가 있을 때 밝게 남긴 곳에 본문 칸이 있으면(5단계) ↑↓·Page Up/Down·Space로 본문 칸을 굴린다.
import { el, button } from '../ui.js';
import { line } from '../text.js';

const SVG = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

// 마지막 조작이 키보드였는가. 키보드면 단계마다 가리키는 단추로 포커스를 옮긴다.
let keyboard = false;
document.addEventListener('keydown', (e) => { if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') keyboard = true; }, true);
document.addEventListener('pointerdown', () => { keyboard = false; }, true);

// steps: [{ no, copy, target() → 가리킬 단추, hole() → 밝게 남길 곳(없으면 target), focus() → 포커스를 줄 요소(없으면 target),
//           skip() → true면 건너뜀, sides → 문구를 놓아 볼 자리 순서 ('right' | 'left' | 'below' | 'above'),
//           id → 화면에 적는 단계 이름(없으면 no), auto → 이 시간(밀리초)이 지나면 저절로 다음 단계, onShow() → 이 단계가 나올 때,
//           accept(el) → 가리킨 단추 말고도 이 단계를 넘기는 누름(예: 아무 ☆나), also() → 테두리 없이 함께 밝게 남길 곳들 }]
// skip: true면 문구 아래에 "건너뛰기" (길 지도의 "사용법"으로 다시 볼 때)
// done: { copy, ms } 마지막 단계까지 가면 이 [본부] 문구를 ms 동안 보이고 닫는다 (그동안에도 누름을 막는다)
// onEnd(finished): 끝났을 때. 마지막 단계까지 갔으면 true, 건너뛰기·화면 떠남이면 false
// onStep(step): 단계가 바뀔 때마다
// dim: false면 화면을 어둡게 덮지 않는다. 테두리·곡선은 강조색, 문구는 본문 글자색 (S10 되감기 안내)
// 단계의 mid: true면 옆(left·right) 문구를 단추와 같은 높이 가운데에 둔다
export function makeGuide(host, { steps, skip = false, block = 'none', done = null, dim = true, onEnd, onStep }) {
  // 덮개: 어두운 막(가운데 구멍) + 흰 점선 테두리 + 흰 점선 곡선 + 끝점
  const veil = svgEl('path', { class: 'guide-veil-fill', 'fill-rule': 'evenodd' });
  const ring = svgEl('rect', { class: 'guide-ring', rx: 12, ry: 12 });
  const link = svgEl('path', { class: 'guide-link' });
  const dot = svgEl('circle', { class: 'guide-dot', r: 5 });
  const cover = svgEl('svg', { class: 'guide-cover', 'aria-hidden': 'true' });
  cover.append(veil, ring, link, dot);
  if (!dim) cover.classList.add('no-dim');

  const text = el('p', { className: 'say say-hq guide-text' });
  const tip = el('div', { className: 'guide-tip' }, text);
  tip.setAttribute('role', 'status');
  if (block === 'all') tip.tabIndex = -1; // 가리킨 단추가 준비될 때까지 포커스를 둘 곳
  if (!dim) tip.classList.add('no-dim');
  const skipBtn = skip ? button('btn.skip', () => end(false), 'small') : null;
  if (skipBtn) tip.append(skipBtn);
  let at = -1;
  let over = false;
  let closing = false; // 마무리 문구를 보이는 중
  let raf = 0;
  let autoTimer = 0;
  let doneTimer = 0;
  let focusPending = false; // 키보드로 왔는데 가리킨 단추가 아직 준비되지 않음(예: 소리를 받는 동안 잠긴 이어 듣기)

  const shown = (t) => Boolean(t && t.isConnected && t.getClientRects().length);

  // 누름 가로채기
  const onClickCapture = (e) => {
    if (over || block === 'none') return;
    const t = e.target instanceof Element ? e.target : null;
    if (!t || !host.contains(t)) return;
    if (skipBtn && skipBtn.contains(t)) return; // "건너뛰기"는 그대로
    if (closing) { if (block === 'all') { e.preventDefault(); e.stopImmediatePropagation(); } return; }
    if (at < 0) return;
    const s = steps[at];
    const tg = s.target();
    const hit = (tg && tg.contains(t)) || (s.accept && s.accept(t));
    if (hit) {
      e.preventDefault();
      e.stopImmediatePropagation();
      begin(at + 1);
      return;
    }
    if (block === 'all' && t.closest('button, .line-text, input, a, label')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  };
  document.addEventListener('click', onClickCapture, true);

  // 키보드 가두기 (block 'all'): 지금 포커스를 둘 곳들
  const focusTarget = () => { if (at < 0) return null; const s = steps[at]; return s.focus ? s.focus() : s.target(); };
  const ready = (f) => Boolean(f && !f.disabled && shown(f));
  const stops = () => {
    const f = focusTarget();
    const list = [ready(f) ? f : (shown(tip) && !tip.hidden ? tip : null)];
    if (skipBtn && !skipBtn.hidden && shown(skipBtn)) list.push(skipBtn);
    return list.filter(Boolean);
  };
  const SCROLL_KEYS = { ArrowDown: 0.15, ArrowUp: -0.15, PageDown: 0.85, PageUp: -0.85, ' ': 0.85 };
  const onKeyCapture = (e) => {
    if (over || closing || block !== 'all' || at < 0 || !host.isConnected || host.hidden) return;
    if (e.key === 'Tab' && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const list = stops();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement);
      const next = i < 0 ? (e.shiftKey ? list[list.length - 1] : list[0]) : list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length];
      next.focus({ preventScroll: true });
      return;
    }
    // 안내 문구에 포커스: 밝게 남긴 본문 칸을 굴린다 (5단계에서 본문 끝까지 내려야 "다 읽었다"가 켜진다)
    if (document.activeElement === tip && e.key in SCROLL_KEYS) {
      const s = steps[at];
      const h = s.hole ? s.hole() : null;
      const scroller = h && (h.matches('.reader-body') ? h : h.querySelector('.reader-body'));
      if (!scroller) return;
      e.preventDefault();
      scroller.scrollBy({ top: scroller.clientHeight * (e.shiftKey && e.key === ' ' ? -SCROLL_KEYS[e.key] : SCROLL_KEYS[e.key]) });
    }
  };
  if (block === 'all') document.addEventListener('keydown', onKeyCapture, true);

  function begin(i) {
    while (i < steps.length && steps[i].skip && steps[i].skip()) i++;
    if (i >= steps.length) { end(true); return; }
    at = i;
    const s = steps[i];
    text.textContent = line(s.copy);
    text.dataset.copy = s.copy;
    host.dataset.guide = s.id || String(s.no);
    if (!cover.isConnected) host.append(cover, tip);
    clearTimeout(autoTimer);
    if (s.auto) autoTimer = setTimeout(() => { if (!over && !closing && at === i) begin(i + 1); }, s.auto);
    if (onStep) onStep(s);
    if (s.onShow) s.onShow();
    const t = s.target();
    if (t && t.closest('.reader-body')) t.scrollIntoView({ block: 'nearest' });
    focusPending = true; // 한 단계에 한 번: 키보드로 조작 중일 때 단추가 준비되면 옮긴다
    tryFocus();
    place();
  }

  // 키보드로 조작 중이면 가리킨 단추로 포커스를 옮긴다. 단추가 잠겨 있으면 준비되는 순간 옮긴다(tick에서 다시 본다).
  function tryFocus() {
    if (!focusPending || !keyboard || at < 0) return; // 그사이 마우스로 바꿨으면 옮기지 않는다
    const f = focusTarget();
    if (ready(f)) {
      f.focus({ preventScroll: true });
      focusPending = false;
    } else if (block === 'all' && document.activeElement !== tip && !(skipBtn && document.activeElement === skipBtn) && shown(tip) && !tip.hidden) {
      tip.focus({ preventScroll: true }); // 준비될 때까지 안내 문구에 (본문 줄로 가지 않게)
    }
  }

  // 가리키는 단추를 따라 덮개와 문구를 놓는다. 본문 칸 밖으로 굴러간 줄이면 잠시 감춘다.
  function place() {
    if (over || closing || at < 0) return;
    const s = steps[at];
    const t = s.target();
    const hb = host.getBoundingClientRect();
    let visible = shown(t) && !host.hidden;
    let r = null;
    if (visible) {
      r = t.getBoundingClientRect();
      const scroller = t.closest('.reader-body');
      if (scroller) {
        const b = scroller.getBoundingClientRect();
        if (r.bottom < b.top + 4 || r.top > b.bottom - 4) visible = false;
      }
    }
    cover.style.display = visible ? '' : 'none';
    tip.hidden = !visible;
    if (!visible) return;

    const W = hb.width;
    const H = hb.height;
    cover.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const pad = 6;
    const box = (n, p) => { const q = n.getBoundingClientRect(); return { x: q.left - hb.left - p, y: q.top - hb.top - p, w: q.width + p * 2, h: q.height + p * 2 }; };
    // 밝게 남길 곳 (구멍)
    const holeEl = s.hole && shown(s.hole()) ? s.hole() : t;
    const h = box(holeEl, pad);
    // 구멍이 단추보다 넓으면(본문 칸, 묻기 칸) 테두리와 곡선은 밝은 곳 위에 그려지므로 파란색으로
    cover.classList.toggle('in-light', holeEl !== t);
    const rad = 12;
    const roundRect = (b) => `M${b.x + rad},${b.y} H${b.x + b.w - rad} Q${b.x + b.w},${b.y} ${b.x + b.w},${b.y + rad} V${b.y + b.h - rad} Q${b.x + b.w},${b.y + b.h} ${b.x + b.w - rad},${b.y + b.h} H${b.x + rad} Q${b.x},${b.y + b.h} ${b.x},${b.y + b.h - rad} V${b.y + rad} Q${b.x},${b.y} ${b.x + rad},${b.y} Z`;
    // 함께 밝게 남길 곳 (구멍끼리 겹치지 않게 여백을 작게)
    const extra = s.also ? s.also().filter(shown).map((e) => roundRect(box(e, 3))) : [];
    veil.setAttribute('d', dim ? `M0,0 H${W} V${H} H0 Z ${roundRect(h)} ${extra.join(' ')}` : '');
    // 흰 점선 테두리는 단추에
    const g = box(t, pad);
    Object.entries({ x: g.x, y: g.y, width: g.w, height: g.h }).forEach(([k, v]) => ring.setAttribute(k, v));

    // 문구 자리: 단계마다 정한 순서(sides)대로 놓아 보고, 화면 안에 들어가는 첫 자리에 둔다.
    // 곡선이 들어갈 틈(gap)을 두고, 옆이면 조금 위로, 위·아래면 조금 오른쪽으로 비켜 곡선이 휘게 한다.
    const gap = 44;
    const w = tip.offsetWidth;
    const th = tip.offsetHeight;
    // 문구는 밝게 남긴 곳(구멍) 바깥의 어두운 곳에 둔다
    const sideY = s.mid ? g.y + g.h / 2 - th / 2 : g.y + g.h / 2 - th - 10;
    const spots = {
      right: [h.x + h.w + gap, sideY],
      left: [h.x - gap - w, sideY],
      below: [g.x + 36, h.y + h.h + gap],
      above: [g.x + 36, h.y - gap - th],
    };
    const fit = (k) => {
      const [x, y] = spots[k];
      return k === 'below' || k === 'above' ? [Math.max(8, Math.min(x, W - w - 8)), y] : [x, Math.max(8, y)];
    };
    const inside = ([x, y]) => x >= 4 && y >= 4 && x + w <= W - 4 && y + th <= H - 4;
    const order = [...(s.sides || []), 'right', 'below', 'above', 'left'];
    const side = order.find((k) => inside(fit(k))) || 'below';
    const [x, y] = fit(side);
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(4, y)}px`;
    tip.dataset.side = side;

    // 문구에서 단추로 가는 흰 점선 곡선
    let sx; let sy; let ex; let ey; let cx; let cy;
    const tx = x + 14;
    if (side === 'right' || side === 'left') {
      sx = side === 'right' ? x - 8 : x + w + 8;
      sy = y + th / 2;
      ex = side === 'right' ? g.x + g.w + 4 : g.x - 4;
      ey = g.y + g.h / 2;
      cx = ex + (sx - ex) * 0.15;
      cy = sy;
    } else {
      sx = Math.min(tx, x + w - 14);
      sy = side === 'below' ? y - 8 : y + th + 8;
      ex = Math.max(g.x + 14, Math.min(sx - 24, g.x + g.w - 14));
      ey = side === 'below' ? g.y + g.h + 4 : g.y - 4;
      cx = sx;
      cy = ey + (sy - ey) * 0.15;
    }
    link.setAttribute('d', `M${sx},${sy} Q${cx},${cy} ${ex},${ey}`);
    dot.setAttribute('cx', ex);
    dot.setAttribute('cy', ey);
  }

  // 화면이 바뀌어도(본문 굴림, 묻기 칸 열림) 덮개가 단추를 따라가게 한다.
  // 가리키던 단추가 없어지면(예: 뜻 보기 전에 답을 고름) 다음 단계로, 마지막이면 끝.
  function tick() {
    if (over || closing) return;
    if (!host.isConnected) { end(false); return; }
    if (!host.hidden && at >= 0) {
      const s = steps[at];
      const t = s.target();
      if ((s.skip && s.skip()) || !(t && t.isConnected)) begin(at + 1);
      else { tryFocus(); place(); }
    }
    raf = requestAnimationFrame(tick);
  }

  // 마무리 문구: 화면 전체를 덮고 가운데에 [본부] 문구만
  function showDone() {
    closing = true;
    cancelAnimationFrame(raf);
    clearTimeout(autoTimer);
    const hb = host.getBoundingClientRect();
    cover.style.display = '';
    cover.setAttribute('viewBox', `0 0 ${hb.width} ${hb.height}`);
    veil.setAttribute('d', `M0,0 H${hb.width} V${hb.height} H0 Z`);
    for (const n of [ring, link, dot]) n.style.display = 'none';
    text.textContent = line(done.copy);
    text.dataset.copy = done.copy;
    host.dataset.guide = 'done';
    if (skipBtn) skipBtn.hidden = true;
    tip.hidden = false;
    tip.classList.add('is-done');
    tip.style.left = `${Math.max(8, (hb.width - tip.offsetWidth) / 2)}px`;
    tip.style.top = `${Math.max(8, (hb.height - tip.offsetHeight) / 2)}px`;
    doneTimer = setTimeout(() => finish(true), done.ms);
  }

  function finish(finished) {
    if (over) return;
    over = true;
    cancelAnimationFrame(raf);
    clearTimeout(autoTimer);
    clearTimeout(doneTimer);
    document.removeEventListener('click', onClickCapture, true);
    document.removeEventListener('keydown', onKeyCapture, true);
    cover.remove();
    tip.remove();
    delete host.dataset.guide;
    if (onEnd) onEnd(finished);
  }

  function end(finished) {
    if (over) return;
    if (finished && done && !closing && host.isConnected) { showDone(); return; }
    finish(closing ? true : finished);
  }

  return {
    start() { if (over) return; begin(0); if (!over && !closing) raf = requestAnimationFrame(tick); },
    // (block 'none') 학생이 no 단계의 단추를 눌렀다. 지금 단계이거나 그 뒤 단계면 그다음으로 간다.
    did(no) {
      if (over || closing || at < 0) return;
      if (no < steps[at].no) return;
      const i = steps.findIndex((s) => s.no === no);
      begin(i + 1);
    },
    end: () => end(false),
    get step() { return over || at < 0 ? 0 : steps[at].no; },
    get active() { return !over; },
  };
}
