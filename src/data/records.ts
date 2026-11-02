// 체크 하나를 기록에 넣거나 빼는 순수 함수. 메모리에도, 기기에 이미 있는 기록에도 같은 함수로 적용한다.
// 기기 쪽에는 "읽고 → 이 체크만 바꾸고 → 쓰기"로 남기므로, 다른 탭이 남긴 날짜를 지우지 않는다.
import type { DateKey } from '../core/date.ts';
import type { OfficeId } from '../core/office.ts';
import type { Checks, Reading } from './store.ts';

export function withCheck(checks: Checks | undefined, date: DateKey, office: OfficeId, done: boolean): Checks {
  const next: Checks = { ...checks };
  const day = { ...next[date] };
  if (done) day[office] = true;
  else delete day[office];
  if (Object.keys(day).length) next[date] = day;
  else delete next[date];
  return next;
}

export function withRead(reading: Reading | undefined, year: string, day: number, done: boolean): Reading {
  const next: Reading = { ...reading };
  const days = { ...next[year] };
  if (done) days[day] = true;
  else delete days[day];
  next[year] = days;
  return next;
}
