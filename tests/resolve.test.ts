import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import seasonsJson from '../content/seasons.json' with { type: 'json' };
import { dayNumber, parseKey, prayerDate, toKey } from '../src/core/date.ts';
import { planIndex, psalterIndex, resolve, seasonAnchors } from '../src/core/resolve.ts';

function days(from: string, to: string): string[] {
  const out: string[] = [];
  for (let n = parseKey(from); n <= parseKey(to); n++) out.push(toKey(n));
  return out;
}

describe('04:00 하루 경계 (Asia/Seoul)', () => {
  test('03:59는 전날, 04:00은 그날', () => {
    assert.equal(prayerDate(new Date('2026-11-01T18:59:59Z')), '2026-11-01'); // 서울 11/2 03:59:59
    assert.equal(prayerDate(new Date('2026-11-01T19:00:00Z')), '2026-11-02'); // 서울 11/2 04:00
  });

  test('새벽 1시에 연 밤 예식은 전날 밤', () => {
    assert.equal(prayerDate(new Date('2026-11-02T16:00:00Z')), '2026-11-02'); // 서울 11/3 01:00
  });

  test('해 넘김도 04:00에', () => {
    assert.equal(prayerDate(new Date('2026-12-31T18:59:00Z')), '2026-12-31'); // 서울 1/1 03:59
    assert.equal(prayerDate(new Date('2026-12-31T19:00:00Z')), '2027-01-01');
  });

  test('기기 시간대와 무관하게 서울 기준', () => {
    // 같은 순간이면 어느 시간대에서 만든 Date든 결과가 같다
    assert.equal(prayerDate(new Date(Date.UTC(2026, 10, 2, 3, 0))), '2026-11-02'); // 서울 12:00
  });
});

describe('날짜 문자열', () => {
  test('없는 날짜는 거절', () => {
    assert.throws(() => parseKey('2026-02-29'), /없는 날짜/);
    assert.throws(() => parseKey('2026-2-1'), /형식/);
    assert.equal(toKey(parseKey('2028-02-29')), '2028-02-29');
  });
});

describe('오늘(2026-11-02 월)', () => {
  test('resolve 전체', () => {
    assert.deepEqual(resolve('2026-11-02'), {
      date: '2026-11-02',
      weekday: 1,
      psalterDay: 124,
      missionIdx: dayNumber(2026, 11, 2) % 3,
      planDay: 262,
      season: null,
      openingKey: null,
      collectId: null,
    });
  });
});

describe('연·월 경계', () => {
  test('요일과 선교 순환은 해·달이 바뀌어도 끊기지 않는다', () => {
    for (const span of [['2026-12-28', '2027-01-04'], ['2027-01-29', '2027-02-02'], ['2028-02-27', '2028-03-02']]) {
      const list = days(span[0], span[1]).map(resolve);
      for (let i = 1; i < list.length; i++) {
        assert.equal(list[i].weekday, (list[i - 1].weekday + 1) % 7, list[i].date);
        assert.equal(list[i].missionIdx, (list[i - 1].missionIdx + 1) % 3, list[i].date);
      }
    }
  });

  test('2027-01-01은 금요일', () => {
    assert.equal(resolve('2027-01-01').weekday, 5);
  });
});

describe('시편 182일 주기', () => {
  test('1월 1일과 7월 2일에 1편부터', () => {
    assert.equal(psalterIndex('2026-01-01'), 1);
    assert.equal(psalterIndex('2026-07-01'), 182);
    assert.equal(psalterIndex('2026-07-02'), 1);
    assert.equal(psalterIndex('2026-12-30'), 182); // 364일째
  });

  test('364일을 넘는 날(평년 12/31)은 마지막 분량을 한 번 더', () => {
    assert.equal(psalterIndex('2026-12-31'), 182);
    assert.equal(psalterIndex('2027-01-01'), 1);
  });

  test('윤년: 7월 1일에 1편부터, 12/30·31은 181·182', () => {
    assert.equal(psalterIndex('2028-02-29'), 60);
    assert.equal(psalterIndex('2028-06-30'), 182);
    assert.equal(psalterIndex('2028-07-01'), 1);
    assert.equal(psalterIndex('2028-12-29'), 182);
    assert.equal(psalterIndex('2028-12-30'), 181);
    assert.equal(psalterIndex('2028-12-31'), 182);
  });

  test('5년 동안 늘 1~182', () => {
    for (const d of days('2026-01-01', '2030-12-31')) {
      const p = psalterIndex(d);
      assert.ok(p >= 1 && p <= 182, d);
    }
  });
});

describe('통독 일차', () => {
  test('1월 1일(목)에 시작, 주일은 쉼', () => {
    assert.equal(planIndex('2026-01-01'), 1);
    assert.equal(planIndex('2026-01-03'), 3);
    assert.equal(planIndex('2026-01-04'), null); // 주일
    assert.equal(planIndex('2026-01-05'), 4);
  });

  test('마지막 276일차 다음 날부터는 null', () => {
    const last = days('2026-01-01', '2026-12-31').find((d) => planIndex(d) === 276);
    assert.equal(last, '2026-11-18');
    assert.equal(planIndex('2026-11-19'), null);
    assert.equal(planIndex('2026-12-31'), null);
  });

  test('해가 바뀌면 다시 1일차(startDate 없음)', () => {
    assert.equal(planIndex('2027-01-01'), 1);
    assert.equal(planIndex('2027-01-03'), null); // 2027-01-03은 주일
  });

  test('시작일이 정해져 있으면 그 전날은 null', () => {
    const config = { startDate: '2026-03-02', restWeekdays: [0], totalDays: 276 };
    assert.equal(planIndex('2026-03-01', config), null);
    assert.equal(planIndex('2026-03-02', config), 1);
    assert.equal(planIndex('2026-03-07', config), 6);
    assert.equal(planIndex('2026-03-09', config), 7);
  });
});

describe('절기 기준일: seasons.json 검산표 5년', () => {
  for (const row of seasonsJson.check) {
    test(String(row.year), () => {
      const a = seasonAnchors(row.year);
      for (const key of ['advent1', 'ashWednesday', 'palmSunday', 'easter', 'ascension', 'pentecost'] as const) {
        assert.equal(a[key], row[key], `${row.year} ${key}`);
      }
    });
  }
});

describe('절기 경계', () => {
  const at = (d: string) => {
    const r = resolve(d);
    return [r.season, r.openingKey, r.collectId];
  };

  test('사순절·고난주간·부활절 (2026)', () => {
    assert.deepEqual(at('2026-02-17'), [null, null, null]);
    assert.deepEqual(at('2026-02-18'), ['lent', 'lent', 'ash']);
    assert.deepEqual(at('2026-02-21'), ['lent', 'lent', 'ash']);
    assert.deepEqual(at('2026-02-22'), ['lent', 'lent', 'lent1']);
    assert.deepEqual(at('2026-03-28'), ['lent', 'lent', 'lent5']);
    assert.deepEqual(at('2026-03-29'), ['holyweek', 'holyweek', 'palm']);
    assert.deepEqual(at('2026-04-01'), ['holyweek', 'holyweek', 'palm']);
    assert.deepEqual(at('2026-04-02'), ['holyweek', 'holyweek', 'maundy']);
    assert.deepEqual(at('2026-04-03'), ['holyweek', 'holyweek', 'goodfri']);
    assert.deepEqual(at('2026-04-04'), ['holyweek', 'holyweek', 'holysat']);
    assert.deepEqual(at('2026-04-05'), ['easter', 'easter', 'easter']);
    assert.deepEqual(at('2026-04-12'), ['easter', 'easter', 'easter2']);
    assert.deepEqual(at('2026-05-13'), ['easter', 'easter', 'easter6']);
    assert.deepEqual(at('2026-05-14'), ['easter', 'ascension', 'ascension']);
    assert.deepEqual(at('2026-05-17'), ['easter', 'ascension', 'easter7']);
    assert.deepEqual(at('2026-05-23'), ['easter', 'ascension', 'easter7']);
    assert.deepEqual(at('2026-05-24'), ['easter', 'pentecost', 'pentecost']);
    assert.deepEqual(at('2026-05-25'), [null, null, null]);
  });

  test('대림절과 성탄절 해 넘김 (2026→2027)', () => {
    assert.deepEqual(at('2026-11-28'), [null, null, null]);
    assert.deepEqual(at('2026-11-29'), ['advent', 'advent', 'adv1']);
    assert.deepEqual(at('2026-12-06'), ['advent', 'advent', 'adv2']);
    assert.deepEqual(at('2026-12-13'), ['advent', 'advent', 'adv3']);
    assert.deepEqual(at('2026-12-20'), ['advent', 'advent', 'adv4']);
    assert.deepEqual(at('2026-12-24'), ['advent', 'advent', 'adv4']);
    assert.deepEqual(at('2026-12-25'), ['christmas', 'christmas', 'christmas']);
    assert.deepEqual(at('2026-12-26'), ['christmas', 'christmas', 'christmas']);
    assert.deepEqual(at('2026-12-27'), ['christmas', 'christmas', 'christmas1']); // 주일
    assert.deepEqual(at('2027-01-01'), ['christmas', 'christmas', 'christmas1']);
    assert.deepEqual(at('2027-01-03'), ['christmas', 'christmas', 'christmas2']); // 주일
    assert.deepEqual(at('2027-01-05'), ['christmas', 'christmas', 'christmas2']);
    assert.deepEqual(at('2027-01-06'), [null, null, null]);
  });

  test('12/24가 주일인 해 (2028): 대림 4주는 하루, 성탄 후 둘째 주일 없음', () => {
    assert.equal(seasonAnchors(2028).advent1, '2028-12-03');
    assert.deepEqual(at('2028-12-02'), [null, null, null]);
    assert.deepEqual(at('2028-12-23'), ['advent', 'advent', 'adv3']);
    assert.deepEqual(at('2028-12-24'), ['advent', 'advent', 'adv4']);
    assert.deepEqual(at('2028-12-25'), ['christmas', 'christmas', 'christmas']);
    assert.deepEqual(at('2028-12-30'), ['christmas', 'christmas', 'christmas']);
    assert.deepEqual(at('2028-12-31'), ['christmas', 'christmas', 'christmas1']);
    assert.equal(seasonAnchors(2028).christmas2, null);
    assert.deepEqual(at('2029-01-05'), ['christmas', 'christmas', 'christmas1']);
    assert.deepEqual(at('2029-01-06'), [null, null, null]);
  });

  test('12/25가 주일인 해 (2022): 대림절 첫 주일은 11/27, 성탄 후 첫 주일은 1/1', () => {
    assert.equal(seasonAnchors(2022).advent1, '2022-11-27');
    assert.deepEqual(at('2022-12-24'), ['advent', 'advent', 'adv4']);
    assert.deepEqual(at('2022-12-31'), ['christmas', 'christmas', 'christmas']);
    assert.deepEqual(at('2023-01-01'), ['christmas', 'christmas', 'christmas1']);
    assert.deepEqual(at('2023-01-05'), ['christmas', 'christmas', 'christmas1']);
  });

  test('5년 동안 절기 기도는 절기 안에서만, 절기 안에서는 늘 있다', () => {
    for (const d of days('2026-01-01', '2030-12-31')) {
      const r = resolve(d);
      assert.equal(r.collectId === null, r.season === null, d);
      assert.equal(r.openingKey === null, r.season === null, d);
    }
  });

  test('절기 기도 26편이 5년 안에 모두 한 번 이상 쓰인다', () => {
    const used = new Set(days('2026-01-01', '2030-12-31').map((d) => resolve(d).collectId));
    for (const c of seasonsJson.collects) assert.ok(used.has(c.id), c.id);
  });
});
