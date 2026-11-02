// 날짜는 'YYYY-MM-DD' 문자열(DateKey)과 1970-01-01부터 센 날 수(day number)로만 다룬다.
// Date 객체의 로컬 시간대에 기대지 않는다. 기준 시간대는 Asia/Seoul 고정(design.md 4절).

/** 기도 날짜. Asia/Seoul 기준, 04:00에 하루가 바뀐다. */
export type DateKey = string;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const SEOUL_OFFSET_H = 9; // 한국은 1988년 이후 서머타임이 없다
const DAY_START_H = 4;

/** 지금 이 순간의 기도 날짜. 새벽 1시는 전날로 본다. */
export function prayerDate(now: Date = new Date()): DateKey {
  const shifted = now.getTime() + (SEOUL_OFFSET_H - DAY_START_H) * HOUR_MS;
  return toKey(Math.floor(shifted / DAY_MS));
}

export function dayNumber(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

export function parseKey(key: DateKey): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`날짜 형식이 아닙니다: ${key}`);
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const n = dayNumber(y, m, d);
  if (toKey(n) !== key) throw new Error(`없는 날짜입니다: ${key}`);
  return n;
}

export function toKey(n: number): DateKey {
  const date = new Date(n * DAY_MS);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function yearOf(n: number): number {
  return new Date(n * DAY_MS).getUTCFullYear();
}

/** 0=일 … 6=토. 1970-01-01은 목요일. */
export function weekdayOf(n: number): number {
  return (((n + 4) % 7) + 7) % 7;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** 1월 1일이 1 */
export function dayOfYear(n: number): number {
  return n - dayNumber(yearOf(n), 1, 1) + 1;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** 2026년 11월 2일 월요일 */
export function formatKo(key: DateKey): string {
  const n = parseKey(key);
  const [y, m, d] = key.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일 ${WEEKDAY_KO[weekdayOf(n)]}요일`;
}

/** 11월 2일 (월) */
export function formatShortKo(key: DateKey): string {
  const n = parseKey(key);
  const [, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일 (${WEEKDAY_KO[weekdayOf(n)]})`;
}

export const WEEKDAYS_KO: readonly string[] = WEEKDAY_KO;
