// 콘텐츠 JSON과 resolve()가 서로 맞물리는지 본다. 데이터를 고쳤을 때 깨지면 여기서 먼저 드러난다.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import seasonsJson from '../content/seasons.json' with { type: 'json' };
import { parseKey, toKey } from '../src/core/date.ts';
import { parseRefs } from '../src/core/ref.ts';
import { resolve } from '../src/core/resolve.ts';
import {
  type OfficeId,
  WHEN_KEYS,
  element,
  elements,
  discourseTitle,
  homeQuote,
  homeQuotes,
  offices,
  pickVariant,
  planConfig,
  planDays,
  planEntry,
  psalterDays,
  psalterEntry,
} from '../src/data/content.ts';

const OFFICES: OfficeId[] = ['morning', 'midday', 'evening'];
const FIVE_YEARS: string[] = [];
for (let n = parseKey('2026-01-01'); n <= parseKey('2030-12-31'); n++) FIVE_YEARS.push(toKey(n));

describe('데이터 파일끼리', () => {
  test('예식 순서의 요소가 모두 elements.json에 있다', () => {
    for (const office of OFFICES) for (const id of offices[office].order) assert.ok(element(id), id);
  });

  test('when 조건은 정해진 키만 쓴다', () => {
    for (const el of elements) {
      for (const v of el.variants) {
        for (const key of Object.keys(v.when ?? {})) assert.ok((WHEN_KEYS as readonly string[]).includes(key), `${el.id}: ${key}`);
      }
    }
  });

  test('절기 기도 26편이 seasons.json과 elements.json에 똑같이 있다', () => {
    const fromSeasons = seasonsJson.collects.map((c) => c.id).sort();
    const fromElements = element('season.collect').variants.map((v) => v.when?.collect).sort();
    assert.equal(fromSeasons.length, 26);
    assert.deepEqual(fromElements, fromSeasons);
  });

  test('시편 주기는 1~182일이 빠짐없이', () => {
    assert.equal(psalterDays.length, 182);
    psalterDays.forEach((d, i) => assert.equal(d.day, i + 1));
    assert.equal(psalterDays.reduce((n, d) => n + d.verses, 0), 2461);
  });

  test('통독표는 1~totalDays일차가 빠짐없이, 범위를 모두 읽을 수 있다', () => {
    assert.equal(planDays.length, planConfig.totalDays);
    for (const d of planDays) {
      assert.ok(parseRefs(d.refs).length > 0, d.refs);
      assert.ok(parseRefs(d.keyRef).length > 0, d.keyRef);
    }
  });
});

describe('5년 동안 날마다 세 예식이 빈틈없이 정해진다', () => {
  test('모든 요소에 그날 변형이 있다(절기 기도는 절기 안에서만)', () => {
    for (const date of FIVE_YEARS) {
      const r = resolve(date);
      for (const office of OFFICES) {
        for (const id of offices[office].order) {
          const v = pickVariant(element(id), r);
          if (id === 'season.collect') assert.equal(v === null, r.collectId === null, `${date} ${id}`);
          else assert.ok(v, `${date} ${office} ${id}`);
        }
      }
      assert.ok(psalterEntry(r.psalterDay), date);
      if (r.planDay !== null) assert.ok(planEntry(r.planDay), date);
    }
  });

  test('절기에는 절기 여는 말씀, 평상시에는 요일 여는 말씀', () => {
    for (const date of FIVE_YEARS) {
      const r = resolve(date);
      for (const id of ['morning.opening', 'evening.opening']) {
        const when = pickVariant(element(id), r)!.when!;
        if (r.openingKey) assert.equal(when.season, r.openingKey, `${date} ${id}`);
        else assert.equal(when.weekday, r.weekday, `${date} ${id}`);
      }
    }
  });

  test('마침의 알렐루야는 부활절 전체(승천·성령강림 포함)', () => {
    const dismissal = element('common.dismissal');
    for (const date of ['2026-04-05', '2026-05-14', '2026-05-24']) {
      assert.match(pickVariant(dismissal, resolve(date))!.leader_ko!, /알렐루야/);
    }
    for (const date of ['2026-04-04', '2026-05-25', '2026-11-02']) {
      assert.doesNotMatch(pickVariant(dismissal, resolve(date))!.leader_ko!, /알렐루야/);
    }
  });

  test('선교 기도는 사흘마다 돈다', () => {
    const mission = element('evening.mission');
    const seen = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map((d) => pickVariant(mission, resolve(d)));
    assert.equal(new Set(seen.slice(0, 3)).size, 3);
    assert.equal(seen[3], seen[0]);
  });
});

describe('홈의 오늘의 인용(henry-quotes.json slots.home)', () => {
  test('날마다 다음 편으로 넘어가고, 편 수만큼 지나면 모두 한 번씩 나온다(해 넘김 포함)', () => {
    const n = homeQuotes.length;
    assert.ok(n >= 28, `한 달쯤은 겹치지 않게: 지금 ${n}편`);
    const start = parseKey('2026-12-20');
    const seen = Array.from({ length: n }, (_, i) => homeQuote(toKey(start + i)).id);
    assert.equal(new Set(seen).size, n);
    for (let i = 1; i < n; i++) assert.notEqual(seen[i], seen[i - 1]);
    assert.equal(homeQuote(toKey(start + n)).id, seen[0]);
  });

  test('같은 날은 늘 같은 인용', () => {
    assert.equal(homeQuote('2026-11-02').id, homeQuote('2026-11-02').id);
  });

  test('인용마다 강론·한글 본문·개역한글 구절이 있다', () => {
    assert.equal(new Set(homeQuotes.map((q) => q.id)).size, homeQuotes.length);
    for (const q of homeQuotes) {
      assert.ok(q.en && q.ko && q.anchor.ref && q.anchor.label && q.anchor.krv, q.id);
      assert.ok(discourseTitle(q), q.id);
    }
  });

  test('붙인 구절은 개역한글 원문 그대로(일부만 옮긴 것은 그 부분이 원문에 있다)', async () => {
    for (const q of homeQuotes) {
      const [ref] = parseRefs(q.anchor.ref);
      const book = (await import(`../public/bible/krv/${ref.book}.json`, { with: { type: 'json' } })).default;
      const chapter = book.chapters[String(ref.chapter)];
      const text = Object.entries(chapter as Record<string, string>)
        .filter(([v]) => Number(v) >= (ref.from ?? 1) && Number(v) <= (ref.to ?? Infinity))
        .map(([, t]) => t)
        .join(' ');
      for (const part of q.anchor.krv.split(' … ')) assert.ok(text.includes(part), `${q.id} ${q.anchor.ref}: ${part}`);
    }
  });
});

describe('지시문(CLAUDE.md 규칙 4)', () => {
  // 함께 기도하는 사람이 가족이 아닐 수도 있다. 기도문·성경 본문은 원문대로 두고 지시문만 본다.
  test('지시문에 가족을 가리키는 말을 쓰지 않는다', () => {
    for (const e of elements) {
      for (const text of [e.rubric, e.rubric_after]) {
        if (text) assert.doesNotMatch(text, /가족|부모|자녀|배우자|아이/, e.id);
      }
    }
  });
});
