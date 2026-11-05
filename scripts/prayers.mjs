// 기도문만 모아 읽고 고치기 쉬운 문서(docs/기도문.md)로 꺼내고, 고친 것을 정본(content/elements.json)에 되돌린다.
//   node scripts/prayers.mjs export [--force]   정본 → 문서(이미 있으면 덮지 않는다)
//   node scripts/prayers.mjs import [--dry]     문서 → 정본(바뀐 것만, --dry면 보여 주기만)
//   --doc <경로>                                 docs/기도문.md 대신 다른 문서로(문체를 달리한 판을 견줄 때)
// 성경 본문(개역한글)과 주기도문(새주기도문)은 고정이라 꺼내지 않는다. 예식 순서에 없는 보관 요소도 꺼내지 않는다.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const ELEMENTS = new URL('content/elements.json', root);
const OFFICES = new URL('content/offices.json', root);
const docArg = process.argv.indexOf('--doc');
const DOC = docArg > 0 && process.argv[docArg + 1] ? new URL(process.argv[docArg + 1], `${root.href}`) : new URL('docs/기도문.md', root);

const WEEKDAYS = ['주일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const SEASONS = { easter: '부활절기', advent: '대림절', christmas: '성탄절', lent: '사순절', holyweek: '고난주간' };
const OFFICE_NAMES = { morning: '아침', midday: '낮', evening: '밤' };
/** 기도문으로 꺼내는 요소: 기도, 주고받음, 성경을 기도 꼴로 바꾼 것. 성경 구절 그대로인 주고받음은 뺀다. */
const SKIP = new Set(['common.lordsPrayer', 'compline.responsory']);
const isPrayer = (e) => !SKIP.has(e.id) && ['prayer', 'versicle', 'scripture-adapted'].includes(e.type);

const readJson = (url) => {
  const raw = readFileSync(url, 'utf8');
  return { raw, data: JSON.parse(raw) };
};

/** 예식 순서대로, 처음 나오는 예식에 한 번씩. 절기 기도(26편)는 길어서 맨 뒤에 따로 둔다. */
function prayerElements(elements, offices) {
  const seen = new Set(['season.collect']);
  const out = [];
  for (const office of ['morning', 'midday', 'evening']) {
    for (const id of offices[office].order) {
      const e = elements.find((x) => x.id === id);
      if (!e || seen.has(id) || !isPrayer(e)) continue;
      seen.add(id);
      out.push({ section: OFFICE_NAMES[office], e });
    }
  }
  const season = elements.find((x) => x.id === 'season.collect');
  if (season) out.push({ section: '절기 기도(절기 동안 아침에, 주마다)', e: season });
  return out;
}

function variantLabel(e, v, i) {
  const parts = [];
  if (v.when?.weekday !== undefined) parts.push(WEEKDAYS[v.when.weekday]);
  if (v.when?.season) parts.push(SEASONS[v.when.season] ?? v.when.season);
  if (v.when?.collect) parts.push(v.title_ko ?? v.title ?? v.when.collect);
  else if (v.title_ko) parts.push(v.title_ko);
  if (!v.when && !v.form && e.rotate !== 'daily' && e.variants.some((x) => x.when)) parts.push('평소');
  if (v.form) parts.push(v.form === '2인칭' ? '서로에게' : '우리에게');
  if (e.rotate === 'daily' && !v.when) {
    const pool = e.variants.filter((x) => !x.when);
    parts.push(`날마다 차례로 ${pool.indexOf(v) + 1}/${pool.length}`);
  }
  if (!parts.length && e.variants.length > 1) parts.push(`${i + 1}`);
  return parts.join(' · ');
}

const isVersicle = (v) => v.leader_ko !== undefined;

function exportDoc() {
  if (existsSync(DOC) && !process.argv.includes('--force')) {
    console.error('docs/기도문.md가 이미 있습니다. 고친 내용을 잃지 않게 덮지 않습니다(덮으려면 --force).');
    process.exit(1);
  }
  const { data } = readJson(ELEMENTS);
  const offices = readJson(OFFICES).data;
  const out = [
    '# 매일, 함께 — 기도문 모음',
    '',
    '앱의 세 예식(아침·낮·밤)에 쓰는 기도문을 순서대로 모았습니다. 한글 기도문을 고친 뒤 알려 주시면 앱에 반영합니다.',
    '',
    '- 한글 줄만 고쳐 주세요. `###`로 시작하는 제목 줄(끝의 `{…}` 표시)과 `>`로 시작하는 영어 원문 줄은 그대로 두세요.',
    '- 줄바꿈은 소리 내어 읽을 때 숨 쉬는 자리입니다. 줄을 나누거나 합쳐도 됩니다.',
    '- 주고받는 기도는 `인도자:` `나머지:`를 줄 앞에 그대로 두세요.',
    '- 성경 본문(개역한글)과 주기도문은 고정이라 여기 없습니다. 시므온의 노래는 앞뒤 후렴만 고치고 가운데 성경 구절은 두세요.',
    '- 정본은 `content/elements.json`입니다. 이 문서는 고치기 위한 사본입니다.',
  ];
  let current = '';
  for (const { section, e } of prayerElements(data.elements, offices)) {
    if (section !== current) {
      current = section;
      out.push('', `## ${section}`);
    }
    e.variants.forEach((v, i) => {
      if (!v.ko && !isVersicle(v)) return;
      const label = variantLabel(e, v, i);
      const title = e.id === 'season.collect' ? label : `${e.title}${label ? ` · ${label}` : ''}`;
      out.push('', `### ${title} {${e.id}#${i}}`);
      const en = isVersicle(v) ? [v.leader_en, v.people_en].filter(Boolean).join(' / ') : v.en;
      if (en) out.push(`> ${en}`);
      out.push('');
      if (isVersicle(v)) {
        const leader = v.leader_ko.split('\n');
        const people = v.people_ko.split('\n');
        leader.forEach((line, k) => out.push(`인도자: ${line}`, `나머지: ${people[k]}`));
      } else {
        out.push(v.ko);
      }
    });
  }
  writeFileSync(DOC, out.join('\n') + '\n');
  console.log('docs/기도문.md를 만들었습니다.');
}

/** 문서를 { "id#i": 줄 목록 }으로 */
function parseDoc(text) {
  const blocks = new Map();
  let key = null;
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const head = /\{([\w.]+#\d+)\}\s*$/.exec(line);
    if (line.startsWith('### ') && head) {
      key = head[1];
      blocks.set(key, []);
    } else if (line.startsWith('## ') || line.startsWith('# ')) {
      key = null;
    } else if (key && !line.startsWith('>')) {
      blocks.get(key).push(line);
    }
  }
  for (const [k, lines] of blocks) {
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines.at(-1).trim()) lines.pop();
    blocks.set(k, lines.map((l) => l.trimEnd()));
  }
  return blocks;
}

function importDoc() {
  const dry = process.argv.includes('--dry');
  const { raw, data } = readJson(ELEMENTS);
  const blocks = parseDoc(readFileSync(DOC, 'utf8'));
  const changes = [];
  for (const [key, lines] of blocks) {
    const [id, idx] = key.split('#');
    const e = data.elements.find((x) => x.id === id);
    const v = e?.variants[Number(idx)];
    if (!v) throw new Error(`정본에 없는 기도입니다: {${key}}`);
    if (isVersicle(v)) {
      const leader = [];
      const people = [];
      for (const line of lines.filter((l) => l.trim())) {
        const m = /^(인도자|나머지):\s*(.*)$/.exec(line.trim());
        if (!m) throw new Error(`{${key}} 주고받는 줄은 "인도자:" 또는 "나머지:"로 시작해야 합니다: ${line}`);
        (m[1] === '인도자' ? leader : people).push(m[2]);
      }
      if (leader.length !== people.length) throw new Error(`{${key}} 인도자와 나머지 줄 수가 다릅니다`);
      const next = { leader_ko: leader.join('\n'), people_ko: people.join('\n') };
      if (next.leader_ko !== v.leader_ko || next.people_ko !== v.people_ko) {
        changes.push({ key, title: e.title, before: `${v.leader_ko} / ${v.people_ko}`, after: `${next.leader_ko} / ${next.people_ko}` });
        Object.assign(v, next);
        v.ko_status = '검수';
      }
    } else {
      const ko = lines.join('\n');
      if (!ko.trim()) throw new Error(`{${key}} 본문이 비었습니다`);
      if (v.krv && e.type === 'scripture-adapted' && e.id === 'compline.nunc') {
        // 가운데 성경 구절은 고치지 않는다
        const verses = ko.replace(/\s+/g, ' ');
        if (!verses.includes(v.krv)) console.warn(`주의: {${key}} 시므온의 노래 성경 구절이 개역한글과 달라졌습니다.`);
      }
      if (ko !== v.ko) {
        changes.push({ key, title: e.title, before: v.ko, after: ko });
        v.ko = ko;
        v.ko_status = '검수';
      }
    }
  }
  if (!changes.length) {
    console.log('바뀐 기도문이 없습니다.');
    return;
  }
  for (const c of changes) console.log(`\n── ${c.title} {${c.key}}\n- ${c.before.replace(/\n/g, '\n- ')}\n+ ${c.after.replace(/\n/g, '\n+ ')}`);
  console.log(`\n바뀐 기도 ${changes.length}편${dry ? ' (보기만, 정본은 그대로)' : ' → content/elements.json에 반영'}`);
  if (!dry) {
    const indent = /\n( +)"/.exec(raw)?.[1].length ?? 1;
    writeFileSync(ELEMENTS, JSON.stringify(data, null, indent) + (raw.endsWith('\n') ? '\n' : ''));
  }
}

const cmd = process.argv[2];
if (cmd === 'export') exportDoc();
else if (cmd === 'import') importDoc();
else {
  console.error('쓰는 법: node scripts/prayers.mjs export [--force] | import [--dry]');
  process.exit(1);
}
