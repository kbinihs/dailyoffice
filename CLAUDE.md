# 매일, 함께 — 저장소 규약

교회용 함께 기도·함께 읽기 PWA. 설계의 정본은 `docs/`(prd, design, implementation_plan, rights). 콘텐츠의 정본은 `content/`. 이 파일은 세션마다 어기기 쉬운 규칙만 모았다. 충돌하면 `docs/design.md`가 우선한다.

## 절대 규칙
1. 서버·DB·로그인·집계·분석 도구를 넣지 않는다. 기록은 기기 로컬(IndexedDB)에만 남는다.
2. 모든 가변 본문(요일 기도, 시편, 선교 기도 순환, 절기, 통독 일차)은 **날짜로 계산**한다. 기기 상태나 카운터로 정하지 않는다. 하루 경계는 04:00, 시간대는 Asia/Seoul 고정.
3. 혼자 모드가 원형이다. 함께 모드는 그 위에 글꼴 강조(인도자 줄 굵게)와 안내문을 덧입힌다. 데이터는 하나.
4. 화면 안내·지시문(루브릭)·단추 문구에 가족·부모·자녀·배우자·아이라는 말을 쓰지 않는다. 인도자 / 나머지 / 서로 / 다 함께 / 한 사람이면. 함께 기도하는 사람이 가족이 아닐 수도 있기 때문이다. 기도문·성경·인용 본문 안에서는 써도 된다(예: 성금요일 "주님의 가족", 성탄일 "주님의 자녀").
5. 성경 본문은 개역한글(1961)만 쓴다. 역본을 섞지 않는다. 예외는 주기도문(새주기도문) 하나. 다른 역본(개역개정·새번역)은 저작권이 있어 본문을 싣지 않고, 말씀 화면에서 대한성서공회 성경 읽기 페이지로 가는 링크로만 연결한다(`src/reading/versions.ts`).
6. 기도문 한글 본문은 `content/elements.json`의 `ko`가 정본이다. 코드에 기도문을 하드코딩하지 않는다. 번역을 고칠 때는 `content/translation-notes.md`를 따른다.
7. 의존성은 `vite`, `vite-plugin-pwa`, `idb-keyval`, `typescript`, `@material/web` 다섯 개를 넘기지 않는다. 프레임워크 없이 DOM 직접(웹 컴포넌트는 `@material/web`의 정식 컴포넌트만, labs 제외). 필요하면 먼저 `docs/design.md` 10절을 고치고 넣는다.
8. 접기·펼치기(details/accordion) UI를 쓰지 않는다. 기도 화면은 스크롤 하나로 끝까지.
9. 기도 화면에 경고색·순위·연속 실패 문구를 두지 않는다. 절기 색(전례색)은 강조색만 바꾸고 면·본문은 그대로 둔다. 빨강은 성령강림일 하루뿐이다. 새 색을 넣으면 `tests/tones.test.ts`의 명암비 AA를 통과해야 한다.

## 데이터 파일 (읽기 전용으로 다룬다)
- `content/elements.json` 기도 요소 35개(변형 135). `when`: weekday 0=일…6=토 / cycle3 / season / collect. 요소에 `"rotate": "daily"`면 조건 없는 변형이 날마다 차례로 돈다(낮의 기도, 밤기도의 시편·말씀·기도).
- 밤 예식은 밤기도(Compline, 2026-11-03). 182일 시편 통독은 아침 예식에 있다. 예식 순서에서 뺀 요소는 `offices.json` `meta.archived`에 적고 보관한다.
- `content/offices.json` 세 예식의 순서. `season.collect`는 절기 안에서만 렌더.
- `content/seasons.json` 절기 경계와 절기 기도 적용 구간, `tones`(날짜 → 전례색·절기 이름·한 줄 설명, 빈 날 없음). `check`에 2026~2030 검산표.
- `content/psalter-cycle.json` 시편 182일 주기(1년 2독). `dateRule` 참고.
- `content/plan.csv` + `plan-config.json` 통독표(일차 기준, 일요일 제외 주 6일, 매년 1월 1일 시작).
- `content/henry-quotes.json` `slots.home`: 홈의 오늘의 인용. 날마다 다음 편으로 돈다(날 수 % 편 수). 편을 더하거나 빼면 순서가 다시 짜인다. 시간대별 슬롯(morning·midday·evening)과 `elements.json`의 `henry.*` 세 요소는 기도 화면에서 뺐고 보관만 한다.
- 성경 본문은 `public/bible/krv/<code>.json`(커밋함)으로 책 단위 지연 로드. 원천을 바꿀 때만 `npm run bible -- <원천 data 폴더>`로 다시 만든다(원천은 docs/rights.md, 고정 커밋은 `scripts/build-bible.mjs` 머리말).
- `generated/plan.json`은 `plan.csv`에서 자동 생성(dev·build·test 전에 돈다). 손으로 고치지 않는다.

## 명령
- `npm test` — node:test(타입 스트리핑, Node 22.18+). 테스트 러너를 따로 넣지 않는다. 타입 선언은 `tests/node-shim.d.ts`.
- `npm run dev` / `npm run build`(tsc 포함). 날짜를 바꿔 보려면 주소에 `?date=YYYY-MM-DD`.
- 서비스 워커는 빌드에만 있다(`npm run build` 뒤 `npx vite preview`). 같은 포트에서 dev 서버를 다시 띄우기 전에 그 주소의 서비스 워커를 해제한다(남아 있으면 옛 화면을 내준다).
- 기도문 검토: `npm run prayers:export`가 쓰는 기도문만 `docs/기도문.md`로 꺼내고(이미 있으면 덮지 않음), [Bin]이 고친 뒤 `npm run prayers:import -- --dry`로 바뀐 것을 보고 `npm run prayers:import`로 정본에 반영한다(바뀐 편은 `ko_status: 검수`). 반영할 때는 [Bin]의 방향을 그대로 두고 조사·맞춤법·명백히 틀린 표현만 고친다. 문체를 달리한 판을 견줄 때는 같은 구조의 다른 문서를 두고 `--doc <경로>`로 가져온다(예: `docs/기도문-청파.md`).
- 아이콘은 Material Symbols Rounded 선 아이콘 한 결. 새 아이콘을 쓰면 `index.html`의 `icon_names`(알파벳 순)에 더한다. 이모지·채운 아이콘은 쓰지 않는다.

## 날짜 함수 (design.md 4절)
`resolve(date)` → `{ weekday, psalterDay, missionIdx, dayIndex, planDay, season, openingKey, collectId }`. 단위 테스트 필수: 연·월 경계, 04시 경계, 12/31·윤년 시편, 통독 주일·시작 전·276일차 이후, 절기 5년 검산표, 성탄절 해 넘김, 12/24가 주일인 해.

## 작업 방식
- 단계는 `docs/implementation_plan.md` 2~6단계 순서대로. 한 단계의 완료 기준을 채우기 전에 다음 단계로 가지 않는다.
- 콘텐츠 JSON을 고쳐야 하면 코드가 아니라 데이터를 고치고, 왜 고쳤는지 `docs/implementation_plan.md` 끝에 한 줄 남긴다.
- 커밋 메시지는 한국어, 한 줄 요약 + 필요하면 본문.
