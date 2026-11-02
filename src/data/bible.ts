// 성경 로더. 책 단위 JSON(bible/krv/<code>.json)을 처음 필요할 때 한 번만 불러온다.
import { type Passage, parseRefs } from '../core/ref.ts';

export interface BookText {
  book: string;
  /** { "1": { "1": "태초에 …" } } */
  chapters: Record<string, Record<string, string>>;
}

export interface Verse {
  verse: number;
  text: string;
}

export interface PassageText extends Passage {
  verses: Verse[];
}

const cache = new Map<string, Promise<BookText>>();
/** 다 받아 둔 책. 다시 그릴 때 기다리지 않고 바로 넣는다(화면이 줄었다 늘며 튀지 않게). */
const loaded = new Map<string, BookText>();

export function loadBook(code: string): Promise<BookText> {
  let pending = cache.get(code);
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}bible/krv/${code}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`성경 본문을 불러오지 못했습니다: ${code} (${res.status})`);
        return res.json() as Promise<BookText>;
      })
      .then((book) => {
        loaded.set(code, book);
        return book;
      });
    // 실패한 요청은 남겨 두지 않는다. 다음에 다시 시도한다.
    pending.catch(() => cache.delete(code));
    cache.set(code, pending);
  }
  return pending;
}

export async function loadPassages(refs: string | Passage[]): Promise<PassageText[]> {
  const passages = typeof refs === 'string' ? parseRefs(refs) : refs;
  const codes = [...new Set(passages.map((p) => p.book))];
  const books = new Map(await Promise.all(codes.map(async (c) => [c, await loadBook(c)] as const)));
  return passages.map((p) => ({ ...p, verses: versesOf(books.get(p.book)!, p) }));
}

/** 책을 이미 받아 두었으면 바로 돌려준다. 아니면 null */
export function peekPassages(passages: Passage[]): PassageText[] | null {
  if (!passages.every((p) => loaded.has(p.book))) return null;
  return passages.map((p) => ({ ...p, verses: versesOf(loaded.get(p.book)!, p) }));
}

export function versesOf(book: BookText, p: Passage): Verse[] {
  const chapter = book.chapters[String(p.chapter)];
  const missing = () => new Error(`본문에 없는 범위입니다: ${p.book} ${p.chapter}:${p.from ?? ''}-${p.to ?? ''}`);
  if (!chapter) throw missing();
  if (p.to !== undefined && !(String(p.to) in chapter)) throw missing();
  const from = p.from ?? 1;
  const to = p.to ?? Infinity;
  // 정수 키는 오름차순으로 순회된다.
  const verses = Object.entries(chapter)
    .map(([v, text]) => ({ verse: Number(v), text }))
    .filter((v) => v.verse >= from && v.verse <= to);
  if (verses.length === 0) throw missing();
  return verses;
}
