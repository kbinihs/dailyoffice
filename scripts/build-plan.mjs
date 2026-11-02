// content/plan.csv + plan-config.json → generated/plan.json
// dev·build·test 전에 자동으로 돈다. 통독표가 바뀌면 CSV만 교체한다(prd 4절).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { BOOKS } from '../src/core/books.ts';
import { parseRefs } from '../src/core/ref.ts';

const root = new URL('../', import.meta.url);
const config = JSON.parse(readFileSync(new URL('content/plan-config.json', root), 'utf8'));
const csv = readFileSync(new URL(`content/${config.planFile}`, root), 'utf8').replace(/^﻿/, '');

const [header, ...rows] = parseCsv(csv);
const HEADER = ['일차', '범위', '핵심장', 'refs', 'key_ref'];
if (header.join(',') !== HEADER.join(',')) fail(`머리글이 다릅니다: ${header.join(',')} (기대: ${HEADER.join(',')})`);

const days = rows.map((cells, i) => {
  const [day, label, key, refs, keyRef] = cells;
  const n = Number(day);
  if (n !== i + 1) fail(`${i + 2}행: 일차가 ${i + 1}이어야 하는데 "${day}"입니다`);
  try {
    const chapters = parseRefs(refs).map((p) => `${p.book} ${p.chapter}`);
    for (const p of parseRefs(keyRef)) {
      if (!chapters.includes(`${p.book} ${p.chapter}`)) fail(`${n}일차: 핵심장 ${keyRef}이 범위 ${refs} 밖입니다`);
    }
  } catch (e) {
    fail(`${n}일차: ${e.message}`);
  }
  return { day: n, label, key, refs, keyRef };
});

if (days.length !== config.totalDays) fail(`일차 수 ${days.length} ≠ plan-config totalDays ${config.totalDays}`);

// 성경 전체 통독표라면 1,189장이 순서대로 한 번씩 들어 있어야 한다. 아니면 경고만 한다.
const read = days.flatMap((d) => parseRefs(d.refs).map((p) => `${p.book} ${p.chapter}`));
const bible = BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => `${b.code} ${i + 1}`));
const first = bible.findIndex((c, i) => read[i] !== c);
if (first !== -1 || read.length !== bible.length) {
  console.warn(`plan: 성경 전체 순서와 다릅니다(${read.length}장, 첫 차이: ${read[first] ?? '끝'} ≠ ${bible[first] ?? '끝'})`);
}

mkdirSync(new URL('generated/', root), { recursive: true });
const out = { planId: config.planId, days };
writeFileSync(new URL('generated/plan.json', root), JSON.stringify(out, null, 1) + '\n');
console.log(`plan: ${days.length}일차, ${read.length}장 → generated/plan.json`);

function parseCsv(text) {
  const records = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') cell += text[++i];
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') (row.push(cell), (cell = ''));
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c !== '')) records.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c !== '')) records.push(row);
  return records;
}

function fail(message) {
  console.error(`plan: ${message}`);
  process.exit(1);
}
