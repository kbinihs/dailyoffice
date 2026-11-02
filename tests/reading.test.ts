import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { josa } from '../src/core/josa.ts';
import { planDate, planDaysBefore, planIndex, planStart } from '../src/core/resolve.ts';
import { planDays } from '../src/data/content.ts';
import { monthCells, readingStatus } from '../src/reading/progress.ts';

describe('통독 일차 ↔ 날짜', () => {
  test('일차의 날짜는 planIndex의 거꾸로', () => {
    assert.equal(planDate(1, '2026-01-01'), '2026-01-01');
    assert.equal(planDate(4, '2026-01-01'), '2026-01-05'); // 1/4 주일을 건넘
    assert.equal(planDate(262, '2026-01-01'), '2026-11-02');
    assert.equal(planDate(276, '2026-01-01'), '2026-11-18');
    assert.equal(planDate(277, '2026-01-01'), null);
    assert.equal(planDate(0, '2026-01-01'), null);
    for (const d of planDays) assert.equal(planIndex(planDate(d.day, '2026-01-01')!), d.day);
  });

  test('시작일은 그해 1월 1일, 정해 두면 그날', () => {
    assert.equal(planStart('2026-11-02'), '2026-01-01');
    assert.equal(planStart('2027-03-01'), '2027-01-01');
    assert.equal(planStart('2026-11-02', { startDate: '2026-03-02', restWeekdays: [0], totalDays: 276 }), '2026-03-02');
  });

  test('어제까지 지나간 일차 수', () => {
    assert.equal(planDaysBefore('2026-01-01'), 0);
    assert.equal(planDaysBefore('2026-01-05'), 3); // 1/1~1/3, 1/4 주일
    assert.equal(planDaysBefore('2026-11-02'), 261);
    assert.equal(planDaysBefore('2026-11-02'), planIndex('2026-11-02')! - 1);
    assert.equal(planDaysBefore('2026-12-31'), 276); // 다 지난 뒤에는 totalDays에서 멈춤
  });
});

describe('밀린 날', () => {
  const read = (...days: number[]) => new Set(days);

  test('사흘 밀림: 처음 체크한 날부터 어제까지 안 읽은 날', () => {
    // 11/2(월, 262일차). 255~258을 읽고 259·260·261을 못 읽었다.
    const s = readingStatus('2026-11-02', read(255, 256, 257, 258));
    assert.equal(s.today, 262);
    assert.equal(s.passed, 261);
    assert.deepEqual(s.missed, [259, 260, 261]);
  });

  test('아무것도 체크하지 않았으면 밀린 날 없음(연중에 시작해도 앞의 날을 들이밀지 않는다)', () => {
    assert.deepEqual(readingStatus('2026-11-02', read()).missed, []);
  });

  test('오늘 것만 읽었으면 밀린 날 없음', () => {
    assert.deepEqual(readingStatus('2026-11-02', read(262)).missed, []);
  });

  test('중간에 빠진 날, 앞서 읽은 날', () => {
    assert.deepEqual(readingStatus('2026-11-02', read(250, 252, 261, 263)).missed, [251, 253, 254, 255, 256, 257, 258, 259, 260]);
  });

  test('주일에는 오늘 범위가 없고, 토요일까지가 지나간 날', () => {
    const s = readingStatus('2026-11-01', read(258));
    assert.equal(s.today, null);
    assert.equal(s.passed, 261);
    assert.deepEqual(s.missed, [259, 260, 261]);
  });

  test('통독표를 마친 뒤에도 밀린 날은 남는다', () => {
    const s = readingStatus('2026-12-20', read(270, 271, 272, 273));
    assert.equal(s.today, null);
    assert.deepEqual(s.missed, [274, 275, 276]);
  });

  test('기록 열쇠는 통독을 시작한 해', () => {
    assert.equal(readingStatus('2026-11-02', read()).year, '2026');
    assert.equal(readingStatus('2027-01-02', read()).year, '2027');
  });

  test('퍼센트는 통독표 전체 중 읽은 비율 하나', () => {
    assert.equal(readingStatus('2026-11-02', read()).percent, 0);
    assert.equal(readingStatus('2026-11-02', new Set(Array.from({ length: 138 }, (_, i) => i + 1))).percent, 50);
    assert.equal(readingStatus('2026-11-02', new Set(Array.from({ length: 276 }, (_, i) => i + 1))).percent, 100);
  });

  test('통독표 밖 일차는 세지 않는다', () => {
    const s = readingStatus('2026-11-02', read(1, 276, 277, 500));
    assert.equal(s.done, 2);
  });
});

describe('한 달 달력', () => {
  test('2026년 11월: 일요일 시작, 주일은 일차 없음', () => {
    const cells = monthCells(2026, 11, new Set([262]));
    assert.equal(cells.length, 30); // 11/1이 일요일이라 앞 빈칸 없음
    assert.deepEqual(cells[0], { date: '2026-11-01', day: null, read: false });
    assert.deepEqual(cells[1], { date: '2026-11-02', day: 262, read: true });
    assert.equal(cells[18]?.day, null); // 11/19부터 통독 기간 밖
  });

  test('1일 앞 빈칸', () => {
    const cells = monthCells(2026, 12, new Set());
    assert.equal(cells.indexOf(cells.find((c) => c !== null)!), 2); // 2026-12-01은 화요일
  });
});

describe('조사', () => {
  test('받침에 따라', () => {
    assert.equal(josa('히브리서 7~9', '을/를'), '히브리서 7~9를');
    assert.equal(josa('레위기 26~민 3', '을/를'), '레위기 26~민 3을');
    assert.equal(josa('요한이서, 요한삼서, 유다서', '을/를'), '요한이서, 요한삼서, 유다서를');
    assert.equal(josa('창세기 1~5', '을/를'), '창세기 1~5를');
    assert.equal(josa('출애굽기 1~10', '을/를'), '출애굽기 1~10을');
    assert.equal(josa('오늘', '은/는'), '오늘은');
    assert.equal(josa('함께 기도', '은/는'), '함께 기도는');
    assert.equal(josa('말씀', '이/가'), '말씀이');
    assert.equal(josa('하루', '이/가'), '하루가');
    assert.equal(josa('시편 23', '과/와'), '시편 23과');
  });
});
