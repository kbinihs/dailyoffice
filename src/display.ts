// 글자 크기·테마·절기 색을 문서에 반영한다. 앱을 열 때와 설정을 바꿀 때, 기기의 밝기가 바뀔 때 부른다.
import type { DateKey } from './core/date.ts';
import { resolve } from './core/resolve.ts';
import { settings } from './data/store.ts';

/**
 * 그날의 전례색을 <html data-tone>에 붙인다(설정에서 끄면 뗀다). 토큰은 style.css의 [data-tone] 블록.
 * 날짜로 정하므로 ?date=로 미리 볼 수 있다. applyDisplay()보다 먼저 불러 상태 표시줄 색이 면을 따르게 한다.
 */
export function applyTone(date: DateKey): void {
  const html = document.documentElement;
  if (settings().seasonColor) html.dataset.tone = resolve(date).tone.color;
  else delete html.dataset.tone;
}

export function applyDisplay(): void {
  const s = settings();
  const html = document.documentElement;
  html.style.setProperty('--font-scale', String(s.fontScale));
  if (s.theme === 'auto') delete html.dataset.theme;
  else html.dataset.theme = s.theme;

  // 브라우저 상태 표시줄도 앱의 바탕(토큰)을 따른다. 설정에서 밝기를 정해도 기기 설정과 갈라지지 않게.
  const surface = getComputedStyle(html).getPropertyValue('--md-sys-color-surface').trim();
  if (!surface) return;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.removeAttribute('media');
    meta.content = surface;
  }
}
