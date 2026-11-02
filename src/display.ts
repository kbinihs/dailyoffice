// 글자 크기·테마를 문서에 반영한다. 앱을 열 때와 설정을 바꿀 때 부른다.
import { settings } from './data/store.ts';

export function applyDisplay(): void {
  const s = settings();
  const html = document.documentElement;
  html.style.setProperty('--font-scale', String(s.fontScale));
  if (s.theme === 'auto') delete html.dataset.theme;
  else html.dataset.theme = s.theme;
}
