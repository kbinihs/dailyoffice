// 체크 하나를 기기의 기록에 적용하는 함수. 다른 탭·창이 남긴 기록을 지우지 않아야 한다.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { withCheck, withRead } from '../src/data/records.ts';
import type { Checks, Reading } from '../src/data/store.ts';

describe('기도 체크', () => {
  test('기기에 이 탭이 모르는 날의 체크가 있어도 지우지 않는다', () => {
    const onDevice: Checks = { '2026-11-01': { evening: true } };
    assert.deepEqual(withCheck(onDevice, '2026-11-02', 'midday', true), {
      '2026-11-01': { evening: true },
      '2026-11-02': { midday: true },
    });
  });

  test('같은 날 다른 시간대 체크도 지키고, 해제하면 그 시간대만 빠진다', () => {
    const onDevice: Checks = { '2026-11-02': { morning: true, evening: true } };
    assert.deepEqual(withCheck(onDevice, '2026-11-02', 'evening', false), { '2026-11-02': { morning: true } });
    assert.deepEqual(withCheck({ '2026-11-02': { evening: true } }, '2026-11-02', 'evening', false), {});
  });

  test('기기에 아무것도 없을 때', () => {
    assert.deepEqual(withCheck(undefined, '2026-11-02', 'morning', true), { '2026-11-02': { morning: true } });
  });

  test('원래 객체는 바꾸지 않는다', () => {
    const onDevice: Checks = { '2026-11-01': { evening: true } };
    withCheck(onDevice, '2026-11-01', 'morning', true);
    assert.deepEqual(onDevice, { '2026-11-01': { evening: true } });
  });
});

describe('통독 체크', () => {
  test('다른 일차·다른 해의 기록을 지우지 않는다', () => {
    const onDevice: Reading = { '2025': { '1': true }, '2026': { '260': true } };
    assert.deepEqual(withRead(onDevice, '2026', 262, true), {
      '2025': { '1': true },
      '2026': { '260': true, '262': true },
    });
    assert.deepEqual(withRead(onDevice, '2026', 260, false), { '2025': { '1': true }, '2026': {} });
  });
});
