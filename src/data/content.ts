// 콘텐츠 로더. content/의 JSON은 번들에 들어간다(성경 본문만 따로 지연 로드, bible.ts).
// 본문을 고칠 때는 이 코드가 아니라 content/의 JSON을 고친다.
import elementsJson from '../../content/elements.json' with { type: 'json' };
import officesJson from '../../content/offices.json' with { type: 'json' };
import seasonsJson from '../../content/seasons.json' with { type: 'json' };
import psalterJson from '../../content/psalter-cycle.json' with { type: 'json' };
import planConfigJson from '../../content/plan-config.json' with { type: 'json' };
import henryJson from '../../content/henry-quotes.json' with { type: 'json' };
import planJson from '../../generated/plan.json' with { type: 'json' };
import { type DateKey, parseKey } from '../core/date.ts';
import type { OfficeId } from '../core/office.ts';
import type { Passage } from '../core/ref.ts';
import type { Resolved } from '../core/resolve.ts';

export type { OfficeId };
export type Role = 'leader' | 'together' | 'mutual' | 'antiphonal' | 'versicle' | 'none';

export interface When {
  weekday?: number;
  cycle3?: number;
  season?: string;
  collect?: string;
}

export interface Variant {
  when?: When;
  /** 기도문 한글 본문(정본) */
  ko?: string;
  en?: string;
  title?: string;
  title_ko?: string;
  /** 성경 범위와 개역한글 본문 */
  ref?: string;
  label?: string;
  krv?: string;
  /** 주고받음(versicle) */
  leader_ko?: string;
  people_ko?: string;
  /** 축복: 2인칭 | 1인칭 복수 */
  form?: string;
  /** 다른 파일에서 오는 본문(psalter) */
  from?: string;
  source?: string;
}

export interface Element {
  id: string;
  title: string;
  role: Role;
  type: string;
  /** 본문 앞에 두는 지시문 */
  rubric?: string;
  /** 본문 뒤에 두는 지시문(침묵 등) */
  rubric_after?: string;
  variants: Variant[];
}

export interface Office {
  name: string;
  minutes: string;
  order: string[];
}

export interface PsalterDay {
  day: number;
  label: string;
  refs: { ps: number; from: number; to: number }[];
  verses: number;
}

/** 홈의 오늘의 인용(매튜 헨리)과 그가 붙든 구절(개역한글) */
export interface HomeQuote {
  id: string;
  /** 『Directions for Daily Communion with God』의 몇째 강론인가(1 시작·2 보냄·3 닫음) */
  discourse: number;
  ko: string;
  en: string;
  anchor: { ref: string; label: string; krv: string };
}

export interface PlanDay {
  day: number;
  /** 통독표 표기 그대로: 창세기 1~5 */
  label: string;
  /** 핵심장: 3장 */
  key: string;
  refs: string;
  keyRef: string;
}

export const elements = elementsJson.elements as Element[];
export const offices = officesJson as unknown as Record<OfficeId, Office>;
export const psalterDays = psalterJson.days as PsalterDay[];
export const planDays = planJson.days as PlanDay[];
export const planConfig = planConfigJson;
export const homeQuotes = henryJson.slots.home.quotes as HomeQuote[];
const homeDiscourses: Record<string, string> = henryJson.slots.home.discourses_ko;

const elementById = new Map(elements.map((e) => [e.id, e]));

export function element(id: string): Element {
  const el = elementById.get(id);
  if (!el) throw new Error(`elements.json에 없는 요소입니다: ${id}`);
  return el;
}

/**
 * 그날 쓸 변형을 고른다. 맞는 변형이 없으면 null(절기 밖의 절기 기도).
 * 우선순위: 여는 말씀 키(부활·승천·성령강림) > 절기 > 요일·순환·절기 기도 > 조건 없음.
 */
export function pickVariant(el: Element, r: Resolved): Variant | null {
  let best: Variant | null = null;
  let bestScore = -1;
  for (const v of el.variants) {
    const score = matchScore(v.when, r);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

export const WHEN_KEYS = ['weekday', 'cycle3', 'season', 'collect'] as const;

function matchScore(when: When | undefined, r: Resolved): number {
  if (!when) return 0;
  if (when.season !== undefined) return when.season === r.openingKey ? 3 : when.season === r.season ? 2 : -1;
  if (when.weekday !== undefined) return when.weekday === r.weekday ? 1 : -1;
  if (when.cycle3 !== undefined) return when.cycle3 === r.missionIdx ? 1 : -1;
  if (when.collect !== undefined) return when.collect === r.collectId ? 1 : -1;
  return -1;
}

export function psalterEntry(day: number): PsalterDay {
  const entry = psalterDays[day - 1];
  if (entry?.day !== day) throw new Error(`psalter-cycle.json에 ${day}일이 없습니다`);
  return entry;
}

export function psalterPassages(entry: PsalterDay): Passage[] {
  return entry.refs.map((r) => ({ book: 'Ps', chapter: r.ps, from: r.from, to: r.to }));
}

export function planEntry(day: number): PlanDay {
  const entry = planDays[day - 1];
  if (entry?.day !== day) throw new Error(`plan.json에 ${day}일차가 없습니다`);
  return entry;
}

export function seasonName(id: string): string {
  return seasonsJson.seasons.find((s) => s.id === id)?.name ?? id;
}

/**
 * 그날 홈의 인용(henry-quotes.json slots.home.rule). 날마다 다음 편으로 넘어가 한 바퀴 돈다.
 * 1970-01-01부터 센 날 수로 고르므로 해가 바뀌어도 이어지고, 같은 날은 어느 기기에서나 같다.
 */
export function homeQuote(date: DateKey): HomeQuote {
  return homeQuotes[parseKey(date) % homeQuotes.length];
}

/** 인용이 나온 강론의 한글 이름: "하루를 하나님과 함께 시작하는 법" */
export function discourseTitle(quote: HomeQuote): string {
  const title = homeDiscourses[String(quote.discourse)];
  if (!title) throw new Error(`henry-quotes.json slots.home.discourses_ko에 ${quote.discourse}가 없습니다`);
  return title;
}
