// 다른 역본으로 보기(design.md 6.2). 개역개정·새번역은 저작권이 살아 있어 본문을 앱에 싣지 않고,
// 대한성서공회 성경 읽기 페이지의 같은 장으로 연결만 한다(docs/rights.md).
import { BOOKS } from '../core/books.ts';

export type VersionId = 'GAE' | 'SAENEW';

/** 링크를 거는 역본. id는 대한성서공회 주소의 version 값이다. */
export const OTHER_VERSIONS: readonly { id: VersionId; name: string }[] = [
  { id: 'GAE', name: '개역개정' },
  { id: 'SAENEW', name: '새번역' },
];

/**
 * 대한성서공회 책 코드. BOOKS와 같은 순서(창세기 → 요한계시록)이고, 두 역본이 같은 코드를 쓴다.
 * 그쪽 bible.list.js와 견주어 이름·장 수까지 맞는 것을 확인했다(2026-11-03).
 */
const BSK_CODES =
  'gen exo lev num deu jos jdg rut 1sa 2sa 1ki 2ki 1ch 2ch ezr neh est job psa pro ecc sng isa jer lam ezk dan hos jol amo oba jnh mic nam hab zep hag zec mal mat mrk luk jhn act rom 1co 2co gal eph php col 1th 2th 1ti 2ti tit phm heb jas 1pe 2pe 1jn 2jn 3jn jud rev'.split(' ');

/** 그 장을 다른 역본으로 여는 주소 */
export function otherVersionUrl(book: string, chapter: number, version: VersionId): string {
  const i = BOOKS.findIndex((b) => b.code === book);
  if (i < 0) throw new Error(`없는 책입니다: ${book}`);
  return `https://www.bskorea.or.kr/bible/korbibReadpage.php?version=${version}&book=${BSK_CODES[i]}&chap=${chapter}`;
}

export const BSK_BOOK_COUNT = BSK_CODES.length;
