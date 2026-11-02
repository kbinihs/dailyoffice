// 통독 진도: 밀린 날과 한 달 달력. 기록(읽은 일차)과 날짜만으로 계산하는 순수 함수.
import { type DateKey, dayNumber, toKey, weekdayOf } from '../core/date.ts';
import { type PlanConfig, planDaysBefore, planIndex, planStart } from '../core/resolve.ts';
import { planConfig } from '../data/content.ts';

export interface ReadingStatus {
  /** 기록의 열쇠: 통독을 시작한 해(PRD 7절 "연도·일차 기준") */
  year: string;
  start: DateKey;
  /** 오늘 일차. 쉬는 날·통독 기간 밖이면 null */
  today: number | null;
  /** 어제까지 지나간 일차 수 */
  passed: number;
  /** 밀린 일차. 처음 체크한 일차부터 센다(연중에 시작한 사람에게 앞의 날을 다 밀린 날로 들이밀지 않는다). */
  missed: number[];
  done: number;
  /** 통독표 전체 중 읽은 비율(0~100) */
  percent: number;
}

export function readingStatus(date: DateKey, read: ReadonlySet<number>, config: PlanConfig = planConfig): ReadingStatus {
  const start = planStart(date, config);
  const passed = planDaysBefore(date, config);
  const missed: number[] = [];
  for (let day = Math.min(...read); day <= passed; day++) if (!read.has(day)) missed.push(day);
  // 손으로 고친 기록 파일 등으로 통독표 밖 일차가 들어와도 세지 않는다.
  const done = [...read].filter((d) => d >= 1 && d <= config.totalDays).length;
  return {
    year: start.slice(0, 4),
    start,
    today: planIndex(date, config),
    passed,
    missed,
    done,
    percent: Math.floor((done / config.totalDays) * 100),
  };
}

export interface DayCell {
  date: DateKey;
  /** 통독 일차. 쉬는 날·기간 밖이면 null */
  day: number | null;
  read: boolean;
}

/** 한 달 달력. 일요일부터 시작하고, 1일 앞의 빈칸은 null. */
export function monthCells(
  year: number,
  month: number,
  read: ReadonlySet<number>,
  config: PlanConfig = planConfig,
): (DayCell | null)[] {
  const first = dayNumber(year, month, 1);
  const next = month === 12 ? dayNumber(year + 1, 1, 1) : dayNumber(year, month + 1, 1);
  const cells: (DayCell | null)[] = Array.from({ length: weekdayOf(first) }, () => null);
  for (let n = first; n < next; n++) {
    const date = toKey(n);
    const day = planIndex(date, config);
    cells.push({ date, day, read: day !== null && read.has(day) });
  }
  return cells;
}
