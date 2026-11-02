// 시간대. 하루 경계(04:00)와는 따로 정한다(design.md 1절, 4절).
export type OfficeId = 'morning' | 'midday' | 'evening';

export const OFFICE_IDS: readonly OfficeId[] = ['morning', 'midday', 'evening'];

const HOUR_MS = 3_600_000;
const SEOUL_OFFSET_H = 9;

/** 지금 서울 시각으로 고른 시간대: 05–11 아침, 11–17 낮, 그 외 밤 */
export function officeAt(now: Date = new Date()): OfficeId {
  const hour = new Date(now.getTime() + SEOUL_OFFSET_H * HOUR_MS).getUTCHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'midday';
  return 'evening';
}
