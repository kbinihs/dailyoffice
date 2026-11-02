// 글자 크기·테마를 문서에 반영한다. 앱을 열 때와 설정을 바꿀 때, 기기의 밝기가 바뀔 때 부른다.
import { settings } from './data/store.ts';

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
