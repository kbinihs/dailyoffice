import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKey, toKey } from '../src/core/date.ts';
import { OFFICE_IDS, officeAt } from '../src/core/office.ts';
import { resolve } from '../src/core/resolve.ts';
import { type Block, type OfficeOptions, alternate, buildOffice } from '../src/office/model.ts';

const SOLO: OfficeOptions = { mode: 'solo', blessingForm: '2인칭' };
const TOGETHER: OfficeOptions = { mode: 'together', blessingForm: '1인칭 복수' };

const ids = (blocks: Block[]) => blocks.map((b) => b.id);
const find = (blocks: Block[], id: string) => blocks.find((b) => b.id === id);

describe('시간대 자동 선택 (서울 시각)', () => {
  const at = (hhmm: string) => officeAt(new Date(`2026-11-02T${hhmm}:00+09:00`));
  test('05–11 아침, 11–17 낮, 그 외 밤', () => {
    assert.equal(at('04:59'), 'evening');
    assert.equal(at('05:00'), 'morning');
    assert.equal(at('10:59'), 'morning');
    assert.equal(at('11:00'), 'midday');
    assert.equal(at('16:59'), 'midday');
    assert.equal(at('17:00'), 'evening');
    assert.equal(at('23:30'), 'evening');
    assert.equal(at('01:00'), 'evening');
  });
});

describe('밤 예식 (2026-11-02, 평상시)', () => {
  const r = resolve('2026-11-02');

  test('순서대로, 절기 밖이라 절기 기도는 빠진다', () => {
    assert.deepEqual(ids(buildOffice('evening', r, SOLO)), [
      'evening.opening',
      'common.confession.invite',
      'common.confession',
      'common.absolution.lay',
      'psalter.evening',
      'common.lordsPrayer',
      'evening.collect.weekday',
      'evening.mission',
      'common.thanksgiving',
      'common.blessing',
      'common.dismissal',
    ]);
  });

  test('시편은 그날 분량, 고백으로 부름 뒤에는 침묵', () => {
    const blocks = buildOffice('evening', r, SOLO);
    const psalter = find(blocks, 'psalter.evening');
    assert.ok(psalter?.kind === 'psalter');
    assert.equal(psalter.label, '시편 106:34-48');
    assert.deepEqual(psalter.passages, [{ book: 'Ps', chapter: 106, from: 34, to: 48 }]);
    const invite = find(blocks, 'common.confession.invite');
    assert.ok(invite?.kind === 'text');
    assert.equal(invite.rubricAfter, '잠시 침묵합니다.');
  });

  test('요일 기도에는 그날 제목이 붙는다', () => {
    const collect = find(buildOffice('evening', r, SOLO), 'evening.collect.weekday');
    assert.ok(collect?.kind === 'text');
    assert.equal(collect.subtitle, '평화를 위한 기도');
  });

  test('혼자면 축복은 2인칭(받는 말씀), 고르는 칸 없음', () => {
    const blessing = find(buildOffice('evening', r, { ...SOLO, blessingForm: '1인칭 복수' }), 'common.blessing');
    assert.ok(blessing?.kind === 'text');
    assert.match(blessing.text, /^여호와는 네게/);
    assert.equal(blessing.source, '민수기 6:24-26');
    assert.equal(blessing.forms, undefined);
  });

  test('함께면 고른 꼴로, 두 꼴을 고를 수 있다', () => {
    const blessing = find(buildOffice('evening', r, TOGETHER), 'common.blessing');
    assert.ok(blessing?.kind === 'text');
    assert.match(blessing.text, /^여호와께서 우리에게/);
    assert.equal(blessing.source, '민수기 6:24-26을 따라');
    assert.deepEqual(blessing.forms, ['2인칭', '1인칭 복수']);
    assert.equal(blessing.form, '1인칭 복수');
  });

  test('축복 말고는 혼자와 함께의 본문이 같다', () => {
    const strip = (bs: Block[]) => bs.filter((b) => b.id !== 'common.blessing');
    assert.deepEqual(strip(buildOffice('evening', r, SOLO)), strip(buildOffice('evening', r, TOGETHER)));
  });

  test('마침은 인도자와 나머지가 주고받는다', () => {
    const dismissal = find(buildOffice('evening', r, SOLO), 'common.dismissal');
    assert.ok(dismissal?.kind === 'lines');
    assert.deepEqual(dismissal.lines.map((l) => l.who), ['leader', 'people']);
  });
});

describe('절기', () => {
  test('대림절: 절기 기도가 요일 기도 앞에, 여는 말씀은 절기 것으로', () => {
    const r = resolve('2026-11-30');
    for (const office of ['morning', 'evening'] as const) {
      const blocks = buildOffice(office, r, SOLO);
      const order = ids(blocks);
      assert.equal(order.indexOf('season.collect') + 1, order.indexOf(`${office}.collect.weekday`), office);
      const collect = find(blocks, 'season.collect');
      assert.ok(collect?.kind === 'text');
      assert.equal(collect.subtitle, '대림절 첫째 주');
    }
  });

  test('낮 예식은 절기에도 그대로', () => {
    assert.deepEqual(ids(buildOffice('midday', resolve('2026-11-30'), SOLO)), ids(buildOffice('midday', resolve('2026-11-02'), SOLO)));
  });

  test('부활절에는 마침에 알렐루야', () => {
    const dismissal = find(buildOffice('evening', resolve('2026-05-14'), SOLO), 'common.dismissal');
    assert.ok(dismissal?.kind === 'lines');
    assert.ok(dismissal.lines.every((l) => l.text.includes('알렐루야')));
  });
});

describe('시편 교독', () => {
  test('첫 절부터 인도자, 번갈아', () => {
    const lines = alternate([
      { verse: 34, text: 'a' },
      { verse: 35, text: 'b' },
      { verse: 36, text: 'c' },
    ]);
    assert.deepEqual(lines.map((l) => [l.verse, l.who]), [[34, 'leader'], [35, 'people'], [36, 'leader']]);
  });
});

describe('5년 동안 날마다 세 예식이 그려진다', () => {
  test('모든 블록에 본문이 있다', () => {
    for (let n = parseKey('2026-01-01'); n <= parseKey('2030-12-31'); n++) {
      const r = resolve(toKey(n));
      for (const office of OFFICE_IDS) {
        for (const opts of [SOLO, TOGETHER]) {
          for (const b of buildOffice(office, r, opts)) {
            if (b.kind === 'text') assert.ok(b.text.trim(), `${r.date} ${office} ${b.id}`);
          }
        }
      }
    }
  });
});
