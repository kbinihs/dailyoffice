import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { type Snapshot, countAdded, mergeSnapshot, parseBackup, summarize, toBackup } from '../src/data/backup.ts';

const EMPTY: Snapshot = {
  settings: { fontScale: 1, theme: 'auto', mode: 'solo', lastLeader: null, blessingForm: '2인칭' },
  people: [],
  checks: {},
  reading: {},
};

const DEVICE_A: Snapshot = {
  settings: { fontScale: 22 / 18, theme: 'dark', mode: 'together', lastLeader: '하늘', blessingForm: '1인칭 복수' },
  people: ['하늘', '바다'],
  checks: { '2026-11-01': { evening: true }, '2026-11-02': { morning: true, midday: true } },
  reading: { '2026': { '260': true, '261': true, '262': true } },
};

function roundTrip(from: Snapshot, into: Snapshot): Snapshot {
  const parsed = parseBackup(JSON.stringify(toBackup(from)));
  assert.ok(parsed.ok);
  return mergeSnapshot(into, parsed.data);
}

describe('기기 A에서 내보내 기기 B에서 가져오기', () => {
  test('빈 기기 B: 체크·이름·설정이 그대로', () => {
    assert.deepEqual(roundTrip(DEVICE_A, EMPTY), DEVICE_A);
  });

  test('같은 파일을 두 번 가져와도 그대로', () => {
    assert.deepEqual(roundTrip(DEVICE_A, roundTrip(DEVICE_A, EMPTY)), DEVICE_A);
  });

  test('파일에는 앱 이름·형식·만든 시각이 붙는다', () => {
    const file = toBackup(DEVICE_A, new Date('2026-11-02T12:00:00Z'));
    assert.equal(file.app, '매일, 함께');
    assert.equal(file.format, 1);
    assert.equal(file.exportedAt, '2026-11-02T12:00:00.000Z');
  });
});

describe('병합: 같은 날짜·일차는 OR', () => {
  const deviceB: Snapshot = {
    settings: { ...EMPTY.settings, fontScale: 1, lastLeader: '별' },
    people: ['별', '하늘'],
    checks: { '2026-11-02': { morning: false, evening: true }, '2026-10-30': { evening: true } },
    reading: { '2026': { '259': true, '262': true }, '2025': { '1': true } },
  };
  const merged = roundTrip(DEVICE_A, deviceB);

  test('기도: 어느 쪽이든 체크했으면 체크, 한쪽에만 있는 날도 남는다', () => {
    assert.deepEqual(merged.checks, {
      '2026-10-30': { evening: true },
      '2026-11-01': { evening: true },
      '2026-11-02': { morning: true, midday: true, evening: true },
    });
  });

  test('통독: 일차를 합친다, 다른 해 기록도 남는다', () => {
    assert.deepEqual(merged.reading, {
      '2025': { '1': true },
      '2026': { '259': true, '260': true, '261': true, '262': true },
    });
  });

  test('이름: 가진 순서를 지키고 새 이름은 뒤에', () => {
    assert.deepEqual(merged.people, ['별', '하늘', '바다']);
  });

  test('설정: 파일 쪽을 따른다', () => {
    assert.deepEqual(merged.settings, DEVICE_A.settings);
  });

  test('파일에 체크가 없어도 기기의 체크를 지우지 않는다', () => {
    const parsed = parseBackup(JSON.stringify({ app: '매일, 함께', format: 1 }));
    assert.ok(parsed.ok);
    assert.deepEqual(mergeSnapshot(deviceB, parsed.data).reading, deviceB.reading);
  });
});

describe('파일 검사', () => {
  test('다른 파일·깨진 파일·새 형식은 거절', () => {
    assert.deepEqual(parseBackup('{'), { ok: false, reason: '기록 파일을 읽을 수 없습니다.' });
    assert.equal(parseBackup('{"hello":1}').ok, false);
    assert.equal(parseBackup('[]').ok, false);
    const newer = parseBackup(JSON.stringify({ app: '매일, 함께', format: 2 }));
    assert.ok(!newer.ok);
    assert.match(newer.reason, /새 버전/);
  });

  test('아는 모양만 담는다', () => {
    const parsed = parseBackup(
      JSON.stringify({
        app: '매일, 함께',
        format: 1,
        settings: { fontScale: 5, theme: 'neon', mode: 'together', showHenry: 'yes', lastLeader: '  하늘 ', extra: 1 },
        people: ['  하늘 ', '하늘', '', 3, 'x'.repeat(21), '바다'],
        checks: { '2026-02-30': { evening: true }, '2026-11-02': { evening: true, night: true, morning: false }, bad: 1 },
        reading: { '2026': { '0': true, '12': true, '13': false, abc: true }, '26': { '1': true } },
      }),
    );
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.data.settings, { fontScale: 28 / 18, mode: 'together', lastLeader: '하늘' });
    assert.deepEqual(parsed.data.people, ['하늘', '바다']);
    assert.deepEqual(parsed.data.checks, { '2026-11-02': { evening: true } });
    assert.deepEqual(parsed.data.reading, { '2026': { '12': true } });
  });

  test('인도자가 이름 목록에 없으면 비운다', () => {
    const parsed = parseBackup(JSON.stringify({ app: '매일, 함께', format: 1, settings: { lastLeader: '없는사람' } }));
    assert.ok(parsed.ok);
    assert.equal(mergeSnapshot(EMPTY, parsed.data).settings.lastLeader, null);
  });
});

describe('요약', () => {
  test('기도한 날 수, 읽은 일차 수, 이름 수', () => {
    assert.deepEqual(summarize(DEVICE_A), { prayerDays: 2, readDays: 3, people: 2 });
  });

  test('새로 더해진 양은 가져오기 전후의 차이(같은 파일을 다시 넣으면 0)', () => {
    const once = roundTrip(DEVICE_A, EMPTY);
    assert.deepEqual(countAdded(summarize(EMPTY), summarize(once)), { prayerDays: 2, readDays: 3, people: 2 });
    assert.deepEqual(countAdded(summarize(once), summarize(roundTrip(DEVICE_A, once))), { prayerDays: 0, readDays: 0, people: 0 });
  });
});

describe('이름', () => {
  test('이름이 많아도 빠뜨리지 않는다(합집합)', () => {
    const many = Array.from({ length: 60 }, (_, i) => `이름${i + 1}`);
    assert.equal(roundTrip({ ...EMPTY, people: many }, EMPTY).people.length, 60);
  });
});
