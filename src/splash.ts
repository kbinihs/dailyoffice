// 첫 화면(모션). 앱을 처음 열 때 한 번, 2.6초 안에 끝난다. 아무 데나 누르면 바로 넘어간다(디자인 시스템 Splash).
// 그동안 기록을 불러오고 홈을 그려 두었다가, "매일, 함께"와 십자가가 상단 바의 제목 자리로 날아가 앉으며 보라 면이 걷힌다.
import { h } from './ui.ts';

const RAYS = Array.from({ length: 12 }, (_, i) => {
  const r = ((i * 30 - 90) * Math.PI) / 180;
  const at = (d: number) => `${(120 + d * Math.cos(r)).toFixed(1)} ${(102 + d * Math.sin(r)).toFixed(1)}`;
  return `M${at(50)}L${at(108)}`;
}).join('');

/** 첫 화면을 띄우고, `ready`가 끝나고 최소 시간이 지나면(또는 누르면) 걷는다. */
export function runSplash(ready: Promise<unknown>): Promise<void> {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const splash = h('div', { class: 'splash', role: 'img', 'aria-label': '매일, 함께' });
  splash.innerHTML =
    '<div class="splash-mark">' +
    `<svg class="splash-rays" viewBox="0 0 240 240" aria-hidden="true"><path d="${RAYS}"/></svg>` +
    '<svg class="cross-art" viewBox="0 0 120 120" aria-hidden="true">' +
    '<rect class="bar v" x="54" y="8" width="12" height="104" rx="4"/>' +
    '<rect class="bar h" x="24" y="36" width="72" height="12" rx="4"/></svg></div>' +
    '<p class="splash-name">매일, 함께</p>' +
    '<p class="splash-line">하루의 모든 순간을 하나님 앞에서</p>';
  document.body.append(splash);
  requestAnimationFrame(() => splash.classList.add('play'));

  const shown = new Promise((r) => setTimeout(r, reduce ? 600 : 2000));
  const skipped = new Promise((r) => splash.addEventListener('click', r, { once: true }));
  return Promise.race([Promise.all([shown, ready]), Promise.all([skipped, ready])]).then(() => lift(splash, reduce));
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 글자 노드가 실제로 차지한 상자 */
function textBox(node: Node): DOMRect {
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

async function lift(splash: HTMLElement, reduce: boolean): Promise<void> {
  if (reduce) {
    splash.remove();
    return;
  }
  const title = document.querySelector<HTMLElement>('.topbar h1');
  const mark = title?.querySelector<SVGSVGElement>('.cross');
  const text = title && [...title.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
  if (!title || !mark || !text) {
    // 홈이 아닌 화면으로 열었으면(제목에 앱 이름이 없으면) 면째 위로 걷는다
    splash.classList.add('lift');
    await wait(450);
    splash.remove();
    return;
  }

  // 그리던 모션은 끝 장면으로 넘기고, 그 자리에서 잰다
  for (const a of splash.getAnimations({ subtree: true })) a.finish();
  const name = splash.querySelector<HTMLElement>('.splash-name')!;
  const art = splash.querySelector<SVGSVGElement>('.cross-art')!;

  // 이름: 글자 상자가 상단 바 제목의 글자 상자에 꼭 겹치도록 옮기고 줄인다
  const box = name.getBoundingClientRect();
  const from = textBox(name.firstChild!);
  const to = textBox(text);
  const s = to.width / from.width;
  const tx = to.left - box.left - (from.left - box.left) * s;
  const ty = to.top - box.top - (from.top - box.top) * s;

  // 십자가: 첫 화면 그림(120칸, 막대 x 24–96 · y 8–112)을 상단 바 표시(20칸, x 3.5–16.5 · y 1–19)에 맞춘다
  const a = art.getBoundingClientRect();
  const m = mark.getBoundingClientRect();
  const k = a.width / 120;
  const k2 = m.width / 20;
  const sx = (13 * k2) / (72 * k);
  const sy = (18 * k2) / (104 * k);
  const cx = m.left + 3.5 * k2 - a.left - 24 * k * sx;
  const cy = m.top + 1 * k2 - a.top - 8 * k * sy;

  const fly: KeyframeAnimationOptions = { duration: 650, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' };
  const fade: KeyframeAnimationOptions = { duration: 200, easing: 'linear', fill: 'forwards' };
  name.style.transformOrigin = '0 0';
  art.style.transformOrigin = '0 0';
  splash.style.pointerEvents = 'none';
  // 날아가는 동안 진짜 제목은 숨겨 두었다가, 앉는 순간 바꿔 끼운다
  document.body.classList.add('splash-flying');

  const animations = [
    name.animate(
      [
        { transform: 'none', color: getComputedStyle(name).color },
        { transform: `translate(${tx}px, ${ty}px) scale(${s})`, color: getComputedStyle(title).color },
      ],
      fly,
    ),
    art.animate([{ transform: 'none' }, { transform: `translate(${cx}px, ${cy}px) scale(${sx}, ${sy})` }], fly),
    ...[...art.querySelectorAll('.bar')].map((bar) =>
      bar.animate([{ fill: getComputedStyle(bar).fill }, { fill: getComputedStyle(mark).fill }], fly),
    ),
    splash.animate(
      [{ backgroundColor: getComputedStyle(splash).backgroundColor }, { backgroundColor: 'transparent' }],
      { duration: 450, delay: 120, easing: 'linear', fill: 'forwards' },
    ),
    ...[...splash.querySelectorAll('.splash-rays, .splash-line')].map((el) =>
      el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], fade),
    ),
  ];
  // 숨은 탭에서는 애니메이션이 멈출 수 있어 시간으로도 끝낸다
  await Promise.race([Promise.all(animations.map((x) => x.finished)), wait(900)]);
  document.body.classList.remove('splash-flying');
  splash.remove();
}
