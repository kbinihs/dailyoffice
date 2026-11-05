// 예식 하나를 화면에 그릴 블록 목록으로 바꾼다. DOM을 모르는 순수 함수라 테스트에서 바로 검사한다.
// 혼자 모드가 원형이다. 함께 모드에서 달라지는 것은 축복 꼴 하나뿐이고, 나머지(굵게·라벨·안내)는 그리는 쪽이 덧입힌다.
import type { OfficeId } from '../core/office.ts';
import { type Passage, parseRefs } from '../core/ref.ts';
import type { Resolved } from '../core/resolve.ts';
import type { Verse } from '../data/bible.ts';
import {
  type Element,
  type Role,
  type Variant,
  element,
  offices,
  pickVariant,
  psalterEntry,
  psalterPassages,
} from '../data/content.ts';
import type { BlessingForm, Mode } from '../data/store.ts';

export type Who = 'leader' | 'people';

export interface Line {
  who: Who;
  text: string;
  verse?: number;
}

interface Base {
  id: string;
  title: string;
  role: Role;
}

export type Block =
  | (Base & {
      kind: 'text';
      /** 요일 기도 제목, 절기 기도의 주일 이름 */
      subtitle?: string;
      rubric?: string;
      rubricAfter?: string;
      text: string;
      /** 성경 출처 표기: 요한복음 8:12, 민수기 6:24-26을 따라 */
      source?: string;
      /** 함께 모드의 축복: 고를 수 있는 꼴과 지금 꼴 */
      forms?: BlessingForm[];
      form?: BlessingForm;
    })
  | (Base & { kind: 'lines'; lines: Line[] })
  | (Base & { kind: 'psalter'; rubric?: string; label: string; passages: Passage[] });

export interface OfficeOptions {
  mode: Mode;
  blessingForm: BlessingForm;
}

export function buildOffice(office: OfficeId, r: Resolved, opts: OfficeOptions): Block[] {
  const blocks: Block[] = [];
  for (const id of offices[office].order) {
    const el = element(id);
    const base = { id, title: el.title, role: el.role };

    if (el.type === 'psalter') {
      // 182일 주기(psalter-cycle.json), 또는 밤기도처럼 정해진 시편 몇 편이 도는 것(변형마다 ref)
      const v = el.variants[0].ref ? pickVariant(el, r) : null;
      if (v?.ref) {
        blocks.push({ ...base, kind: 'psalter', rubric: el.rubric, label: required(v.label, id), passages: parseRefs(v.ref) });
      } else {
        const entry = psalterEntry(r.psalterDay);
        blocks.push({ ...base, kind: 'psalter', rubric: el.rubric, label: entry.label, passages: psalterPassages(entry) });
      }
      continue;
    }

    const v = chooseVariant(el, r, opts);
    if (!v) continue; // 절기 밖의 절기 기도

    if (el.type === 'versicle') {
      // 주고받음: 줄마다 짝을 짓는다(인도자 1줄 → 나머지 1줄 → 인도자 2줄 → …)
      const leader = required(v.leader_ko, id).split('\n');
      const people = required(v.people_ko, id).split('\n');
      if (leader.length !== people.length) throw new Error(`주고받음의 줄 수가 다릅니다: ${id}`);
      blocks.push({
        ...base,
        kind: 'lines',
        lines: leader.flatMap((text, i): Line[] => [
          { who: 'leader', text },
          { who: 'people', text: people[i] },
        ]),
      });
      continue;
    }

    const forms = el.variants.map((x) => x.form).filter((f): f is BlessingForm => f !== undefined);
    blocks.push({
      ...base,
      kind: 'text',
      subtitle: v.title_ko ?? v.title,
      rubric: el.rubric,
      rubricAfter: el.rubric_after,
      text: required(v.ko ?? v.krv, id),
      source: v.label,
      ...(forms.length && opts.mode === 'together' ? { forms, form: v.form as BlessingForm } : {}),
    });
  }
  return blocks;
}

/** 교독: 그날 분량의 첫 절부터 인도자, 나머지가 번갈아. 106:34처럼 짝수 절에서 시작해도 인도자가 먼저 읽는다. */
export function alternate(verses: Verse[]): Line[] {
  return verses.map((v, i) => ({ who: i % 2 === 0 ? 'leader' : 'people', text: v.text, verse: v.verse }));
}

function chooseVariant(el: Element, r: Resolved, opts: OfficeOptions): Variant | null {
  if (el.variants.some((v) => v.form)) {
    // 축복: 혼자면 2인칭을 받는 말씀으로, 함께면 고른 꼴(design.md 2절)
    const form: BlessingForm = opts.mode === 'together' ? opts.blessingForm : '2인칭';
    return el.variants.find((v) => v.form === form) ?? el.variants[0];
  }
  return pickVariant(el, r);
}

function required(text: string | undefined, id: string): string {
  if (!text) throw new Error(`elements.json에 본문이 없습니다: ${id}`);
  return text;
}
