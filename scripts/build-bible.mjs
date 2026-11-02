// 개역한글 원천 → public/bible/krv/<code>.json (design.md 5.4)
//
// 원천: github.com/bluesaurel/Korean-Bible-1961-KRV 의 data/*.json
//       커밋 2fdb91e77d323b99bacaa9b61fc18f318b703240 (2026-09-09)으로 변환했다.
// 사용: npm run bible -- <원천 저장소의 data 폴더>
//
// 본문은 고치지 않는다(동일성유지권, docs/rights.md). 모양만 바꾸고 장·절 수를 검사한다.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS } from '../src/core/books.ts';
import { parseRefs } from '../src/core/ref.ts';

const SOURCE_FILES = {
  Gen: 'Genesis', Exod: 'Exodus', Lev: 'Leviticus', Num: 'Numbers', Deut: 'Deuteronomy',
  Josh: 'Joshua', Judg: 'Judges', Ruth: 'Ruth', '1Sam': '1Samuel', '2Sam': '2Samuel',
  '1Kgs': '1Kings', '2Kgs': '2Kings', '1Chr': '1Chronicles', '2Chr': '2Chronicles',
  Ezra: 'Ezra', Neh: 'Nehemiah', Esth: 'Esther', Job: 'Job', Ps: 'Psalms', Prov: 'Proverbs',
  Eccl: 'Ecclesiastes', Song: 'SongofSolomon', Isa: 'Isaiah', Jer: 'Jeremiah',
  Lam: 'Lamentations', Ezek: 'Ezekiel', Dan: 'Daniel', Hos: 'Hosea', Joel: 'Joel',
  Amos: 'Amos', Obad: 'Obadiah', Jonah: 'Jonah', Mic: 'Micah', Nah: 'Nahum',
  Hab: 'Habakkuk', Zeph: 'Zephaniah', Hag: 'Haggai', Zech: 'Zechariah', Mal: 'Malachi',
  Matt: 'Matthew', Mark: 'Mark', Luke: 'Luke', John: 'John', Acts: 'Acts', Rom: 'Romans',
  '1Cor': '1Corinthians', '2Cor': '2Corinthians', Gal: 'Galatians', Eph: 'Ephesians',
  Phil: 'Philippians', Col: 'Colossians', '1Thess': '1Thessalonians',
  '2Thess': '2Thessalonians', '1Tim': '1Timothy', '2Tim': '2Timothy', Titus: 'Titus',
  Phlm: 'Philemon', Heb: 'Hebrews', Jas: 'James', '1Pet': '1Peter', '2Pet': '2Peter',
  '1John': '1John', '2John': '2John', '3John': '3John', Jude: 'Jude', Rev: 'Revelation',
};
const EXPECTED = { chapters: 1189, verses: 31102, psalms: 2461 };

const source = process.argv[2];
if (!source) fail('원천 data 폴더를 인자로 주세요: npm run bible -- <폴더>');

const root = new URL('../', import.meta.url);
const outDir = new URL('public/bible/krv/', root);
mkdirSync(outDir, { recursive: true });

const books = new Map();
let chapterCount = 0;
let verseCount = 0;
for (const book of BOOKS) {
  const raw = JSON.parse(readFileSync(join(source, `${SOURCE_FILES[book.code]}.json`), 'utf8'));
  if (raw.chapters.length !== book.chapters) fail(`${book.ko}: ${raw.chapters.length}장 (기대 ${book.chapters}장)`);
  const chapters = {};
  raw.chapters.forEach((ch, i) => {
    if (ch.chapter !== i + 1) fail(`${book.ko}: ${i + 1}번째 장 번호가 ${ch.chapter}입니다`);
    const verses = {};
    ch.verses.forEach((v, j) => {
      if (v.verse !== j + 1) fail(`${book.ko} ${ch.chapter}장: ${j + 1}번째 절 번호가 ${v.verse}입니다`);
      if (typeof v.text !== 'string' || v.text.trim() === '') fail(`${book.ko} ${ch.chapter}:${v.verse} 본문이 비었습니다`);
      verses[v.verse] = v.text;
      verseCount++;
    });
    chapters[ch.chapter] = verses;
    chapterCount++;
  });
  const out = { book: book.code, chapters };
  books.set(book.code, out);
  writeFileSync(new URL(`${book.code}.json`, outDir), JSON.stringify(out));
}

const psalms = Object.values(books.get('Ps').chapters).reduce((n, ch) => n + Object.keys(ch).length, 0);
if (chapterCount !== EXPECTED.chapters) fail(`전체 ${chapterCount}장 (기대 ${EXPECTED.chapters})`);
if (verseCount !== EXPECTED.verses) fail(`전체 ${verseCount}절 (기대 ${EXPECTED.verses})`);
if (psalms !== EXPECTED.psalms) fail(`시편 ${psalms}절 (기대 ${EXPECTED.psalms})`);
console.log(`bible: ${BOOKS.length}권 ${chapterCount}장 ${verseCount}절 (시편 ${psalms}절) → public/bible/krv/`);

// 콘텐츠가 가리키는 범위가 본문에 모두 있는지 본다.
const json = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const has = (p) => {
  const ch = books.get(p.book).chapters[p.chapter];
  return ch && (p.from === undefined || String(p.from) in ch) && (p.to === undefined || String(p.to) in ch);
};
const missing = [];
for (const d of json('content/psalter-cycle.json').days) {
  for (const r of d.refs) if (!has({ book: 'Ps', chapter: r.ps, from: r.from, to: r.to })) missing.push(`시편 주기 ${d.day}일: ${d.label}`);
}
for (const d of json('generated/plan.json').days) {
  for (const p of parseRefs(d.refs)) if (!has(p)) missing.push(`통독표 ${d.day}일차: ${d.refs}`);
}
// elements.json의 krv 본문을 원천과 대조한다(보고만 한다. 성경을 줄이거나 "우리"로 바꾼 곳은 다를 수 있다).
const differs = [];
let same = 0;
const quoted = [
  ...json('content/elements.json').elements.flatMap((el) => el.variants.map((v) => ({ id: el.id, ...v }))),
  ...Object.entries(json('content/henry-quotes.json').slots).map(([slot, s]) => ({ id: `henry.${slot}`, ...s.anchor })),
];
for (const q of quoted) {
  if (!q.ref) continue;
  const passages = parseRefs(q.ref);
  for (const p of passages) if (!has(p)) missing.push(`${q.id}: ${q.ref}`);
  if (!q.krv) continue;
  const text = passages
    .flatMap((p) => Object.entries(books.get(p.book).chapters[p.chapter]).filter(([n]) => +n >= (p.from ?? 1) && +n <= (p.to ?? Infinity)))
    .map(([, t]) => t)
    .join(' ');
  if (normalize(text) === normalize(q.krv)) same++;
  else differs.push(`  ${q.id} ${q.ref}\n    원천: ${text}\n    콘텐츠: ${q.krv}`);
}
if (missing.length) fail(`본문에 없는 범위:\n  ${missing.join('\n  ')}`);
console.log(`bible: 시편 주기·통독표·기도 요소·헨리 인용 범위 모두 본문에 있음. krv 대조 ${same}건 같음, ${differs.length}건 다름`);
if (differs.length) console.log(differs.join('\n'));

function normalize(s) {
  return s.replace(/\s+/g, '');
}

function fail(message) {
  console.error(`bible: ${message}`);
  process.exit(1);
}
