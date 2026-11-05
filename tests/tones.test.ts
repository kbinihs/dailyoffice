// 절기 색 토큰(style.css [data-tone])의 명암비. 글자와 바탕의 쌍이 모두 WCAG AA(4.5:1)를 넘어야 한다.
// 디자인 원칙(design.md 8절): 명암비 AA, 강조는 색만으로 하지 않는다.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import seasonsJson from '../content/seasons.json' with { type: 'json' };

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const TONES = [...new Set(seasonsJson.tones.map((t) => t.color))];

/** `selector {` 블록 안의 --md-sys-color-* 값 */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `style.css에 ${selector} 블록이 없습니다`);
  const end = css.indexOf('}', start);
  const out: Record<string, string> = {};
  for (const m of css.slice(start, end).matchAll(/--md-sys-color-([\w-]+):\s*(#[0-9a-f]{6})/gi)) out[m[1]] = m[2].toLowerCase();
  return out;
}

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** 글자 토큰과 그 바탕 토큰 */
const PAIRS: [string, string][] = [
  ['primary', 'surface'],
  ['on-primary', 'primary'],
  ['on-primary-container', 'primary-container'],
  ['on-secondary-container', 'secondary-container'],
  ['on-surface', 'surface'],
  ['on-surface-variant', 'surface'],
  ['on-surface-variant', 'surface-container-high'],
];

function check(label: string, base: Record<string, string>, tone: Record<string, string>): void {
  const all = { ...base, ...tone };
  for (const [fg, bg] of PAIRS) {
    const ratio = contrast(all[fg], all[bg]);
    assert.ok(ratio >= 4.5, `${label}: ${fg} on ${bg} = ${ratio.toFixed(2)} (${all[fg]} / ${all[bg]})`);
  }
}

describe('절기 색 명암비', () => {
  const lightBase = tokens(':root');
  const darkBase = tokens(":root[data-theme='dark']");

  test('기본 팔레트', () => {
    check('light', lightBase, {});
    check('dark', darkBase, {});
  });

  for (const tone of TONES) {
    test(`${tone}: 밝음·어두움 모두 AA`, () => {
      const light = tokens(`:root[data-tone='${tone}']`);
      const dark = tokens(`:root[data-theme='dark'][data-tone='${tone}']`);
      assert.ok(light.primary && dark.primary, `${tone} 토큰이 없습니다`);
      check(`${tone} light`, lightBase, light);
      check(`${tone} dark`, darkBase, dark);
      // 자동 밝기(기기 설정)일 때도 같은 값으로 어두워져야 한다
      const auto = tokens(`:root:not([data-theme='light'])[data-tone='${tone}']`);
      assert.deepEqual(auto, dark, `${tone}: 자동 어둡게와 설정 어둡게의 토큰이 다릅니다`);
      // 밝음 블록이 정한 토큰은 어두움 블록도 모두 정해야 한다(아니면 어두운 화면에 밝은 값이 남는다)
      assert.deepEqual(Object.keys(dark).sort(), Object.keys(light).sort(), `${tone}: 밝음·어두움 토큰 목록이 다릅니다`);
    });
  }
});
