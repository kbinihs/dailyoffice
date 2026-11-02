// 성경 범위 파서. 'Gen 1-3; Ps 23', 'Lev 26-27; Num 1-3', 'Heb 4:14,16', 'John 1:1-2:5'
// 결과는 장 단위로 편다. from·to가 없으면 그 장 전체, to만 없으면 그 장 끝까지.
import { bookOf } from './books.ts';

export interface Passage {
  book: string;
  chapter: number;
  from?: number;
  to?: number;
}

const GROUP = /^\s*([1-3]?[A-Za-z]+)\s+(.+?)\s*$/;
const SPEC = /^(\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?$/;

export function parseRefs(refs: string): Passage[] {
  return refs.split(';').flatMap(parseGroup);
}

function parseGroup(group: string): Passage[] {
  const match = GROUP.exec(group);
  if (!match) throw new Error(`성경 범위를 읽을 수 없습니다: "${group.trim()}"`);
  const [, code, body] = match;
  const book = bookOf(code);
  if (!book) throw new Error(`없는 책 약어입니다: ${code}`);

  const out: Passage[] = [];
  // 'Heb 4:14,16'처럼 쉼표 뒤에 장 없이 절만 오면 앞 장을 잇는다.
  let verseChapter: number | null = null;
  for (const raw of body.split(',')) {
    const spec = raw.trim();
    const m = SPEC.exec(spec);
    if (!m) throw new Error(`성경 범위를 읽을 수 없습니다: "${group.trim()}"`);
    const [a, b, c, d] = m.slice(1).map((x) => (x === undefined ? undefined : Number(x)));

    if (verseChapter !== null && b === undefined && d === undefined) {
      // 같은 장의 절: '16' 또는 '16-18'
      out.push(verses(verseChapter, a!, c ?? a!));
      continue;
    }
    if (b === undefined) {
      // 장: '3' 또는 '1-5'
      const last = c ?? a!;
      if (d !== undefined || last < a!) throw new Error(`성경 범위가 거꾸로입니다: "${group.trim()}"`);
      for (let ch = a!; ch <= last; ch++) out.push({ book: book.code, chapter: ch });
      verseChapter = null;
    } else if (d === undefined) {
      // 한 장 안의 절: '13:13' 또는 '6:24-26'
      out.push(verses(a!, b, c ?? b));
      verseChapter = a!;
    } else {
      // 장을 넘는 절: '1:1-2:5'
      if (c! <= a!) throw new Error(`성경 범위가 거꾸로입니다: "${group.trim()}"`);
      out.push({ book: book.code, chapter: a!, from: b });
      for (let ch = a! + 1; ch < c!; ch++) out.push({ book: book.code, chapter: ch });
      out.push({ book: book.code, chapter: c!, from: 1, to: d });
      verseChapter = c!;
    }
  }
  for (const p of out) {
    if (p.chapter < 1 || p.chapter > book.chapters) {
      throw new Error(`${book.ko}에는 ${p.chapter}장이 없습니다: "${group.trim()}"`);
    }
  }
  return out;

  function verses(chapter: number, from: number, to: number): Passage {
    if (from < 1 || to < from) throw new Error(`성경 범위가 거꾸로입니다: "${group.trim()}"`);
    return { book: book!.code, chapter, from, to };
  }
}
