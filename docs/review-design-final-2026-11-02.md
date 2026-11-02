# 최종 검토 — 디자인 (2026-11-02, Fable 검토 → Opus 반영)

> 반영: 1·2·4·6·7·8·10·11·12 전부, 3(위치·마친 상태만, 라벨은 그대로), 5(마친 타일 색만, 이름·아이콘 순서는 [Bin] 요청대로), 9(인도자 고른 이름만 500, 카드·설정 제목은 [Bin] 요청대로 700).

# 「매일, 함께」 디자인 리뷰 — Material 3 관점

검토 대상: `src/style.css`, `index.html`, `src/ui.ts`, `src/main.ts`, `src/splash.ts`, `src/screens/*.ts`, 스크린샷 7장(375×812, 밝게·어둡게).
검토 범위: 시각·타이포·모션·화면 구조. 콘텐츠(기도문·번역)와 데이터 규칙은 건드리지 않는다. 아래 제안은 모두 "주인의 결정(보라 M3, 둥근 모서리, 선 아이콘, 하단 탭 셋, 떨어진 고르는 단추, 보라 굵은 요소 제목, 홈 구성, 제목으로 날아가는 첫 화면)" 안에서 다듬는 것이다.

---

## 1. 총평

뼈대는 이미 M3가 맞다. 색 역할 전체, 64dp 상단 바, 80dp 하단 탭(64×32 표시), 모양·모션 토큰, 선 아이콘 한 벌, 스크롤 하나의 기도 화면, 경고색·통계 없음 — 절제 자체가 구글답다.
아직 "다듬어진 구글 제품"으로 느껴지지 않는 이유는 **겹침**이다. 밝은 모드에서 그림자 + 3단 컨테이너 + 테두리 단추 두 줄 + 본문 한가운데의 FAB가 한꺼번에 보이고, 어두운 모드에서는 그림자가 사라져 두 모드의 결이 다르다.
둘째, 이 팔레트에서는 `primary-container`(#e6deff)와 `secondary-container`(#e6dff9)가 사실상 같은 색이라, 이 둘로 서로 다른 상태(지금/마침, 안 마침/마침)를 구분한 곳이 모두 구분되지 않는다.
셋째, 첫 화면 모션이 2.7초다. 하루 세 번 여는 앱에서는 매일 내는 세금이다.
아래 12가지 중 A 7개는 거의 CSS 몇 줄이고, 고치면 "같은 앱이 한 단계 조용해진" 느낌이 날 것이다.

---

## 2. 제안 (영향 큰 순)

### 1. 카드 그림자를 걷고 컨테이너 단을 정리한다 — **A**

**무엇이, 왜**
홈 밝은 모드에 면이 다섯 가지 겹쳐 보인다: 바탕(surface) → 카드(surface-container-low + 그림자) → 타일(surface-container-high) → 지금 타일(primary-container), 거기에 하단 탭(surface-container). M3는 쉬고 있는 면은 **색조 층(tonal layering)** 으로 구분하고 그림자는 떠 있는 것(FAB, 메뉴, 대화창)에만 쓴다. 지금 `.card`는 "elevated card"인데, elevated는 바탕이 어지러워 분리가 필요할 때 쓰는 변형이고 기본은 filled다. 어두운 모드에서는 그림자가 보이지 않아(6·7번 스크린샷) 밝은 모드만 한 겹 더 있는 셈이고, 설정 화면의 `.setting` 상자는 같은 역할인데 그림자가 없어 홈과 설정이 서로 다른 앱처럼 보인다.
모양도 안팎이 뒤집혀 있다: 카드 12px 안에 타일 16px. M3 shape nesting은 **안쪽 모서리가 바깥보다 작아야** 한다.

**바꿀 것** (`src/style.css`)
```css
.card {
  position: relative;
  background: var(--md-sys-color-surface-container-low);
  border-radius: var(--md-sys-shape-corner-large);   /* 12 → 16 */
  box-shadow: none;                                   /* --elevation-1 제거 */
  padding: 1rem;                                      /* 0.75rem 1rem 1rem → 사방 16 */
}
.setting {
  margin-top: 1rem;                                   /* 0.75 → 1 */
  border-radius: var(--md-sys-shape-corner-large);   /* 홈 카드와 같은 상자 */
}
.slot {
  border-radius: var(--md-sys-shape-corner-medium);  /* 16 → 12: 안쪽은 바깥보다 작게 */
}
.home { gap: 1rem; }                                  /* 0.75 → 1: 그림자가 없어진 만큼 사이를 띄운다 */
```
`--elevation-1` 변수는 더 쓰는 곳이 없으면 지운다(md-fab·md-dialog는 제 그림자를 가진다). 결과 사다리: 인용 28 → 카드·설정 16 → 타일·단추 12 → 역할 라벨 8.

**파일** `src/style.css`

---

### 2. 고르는 단추 묶음: 테두리를 걷고 색조로 — **A**

**무엇이, 왜**
기도 화면 맨 위에 테두리 사각형 다섯 개가 두 줄(3칸 + 2칸)로 쌓인다. 두 줄의 칸 너비가 달라 오른쪽 끝이 들쭉날쭉하고, 어두운 모드(7번)에서는 `outline`(#938f99) 테두리가 화면에서 본문 다음으로 밝은 요소가 되어 기도문보다 먼저 눈에 들어온다. 또 고른 칸을 700으로 굵히는데, M3 segmented/toggle button은 고른 칸의 글자 굵기를 바꾸지 않는다(secondary-container 면 + 체크 아이콘으로 충분하다).
M3 Expressive의 connected button group처럼 **안 고른 칸을 테두리 없는 색조 면**으로 두면 선이 사라지고, 칸 너비가 달라도 들쭉날쭉함이 보이지 않는다. 칸마다 떨어진 12px 둥근 사각형이라는 결정은 그대로다.

**바꿀 것** (`src/style.css`)
```css
.seg button {
  border: 1px solid transparent;                      /* 두께는 남겨 크기 변화 없음 */
  background: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
  font: 500 0.875rem/1.25rem var(--font-noto);
}
.seg button[aria-pressed='true'] {
  background: var(--md-sys-color-secondary-container);
  border-color: transparent;
  color: var(--md-sys-color-on-secondary-container);
  font-weight: 500;                                   /* 700 → 500 */
}
/* 함께 모드의 '다 함께'·'서로에게' 블록은 바탕이 surface-container-high라 안 고른 칸이 묻힌다 */
.together .role-together .seg button:not([aria-pressed='true']),
.together .role-mutual .seg button:not([aria-pressed='true']) {
  background: var(--md-sys-color-surface);
}
```
연한 두 색(surface-container-high ↔ secondary-container)이 너무 조용하다고 느끼면, M3 Expressive 기본값대로 고른 칸만 `primary`/`on-primary`로 올리는 길이 있다(그때도 테두리는 두지 않는다). 명암비: on-surface-variant(#48454e) on #ebe6ee ≈ 7.6:1, 어둡게 #c9c5d0 on #2b292f ≈ 9:1.

**파일** `src/style.css`

---

### 3. 마침 FAB: 오른쪽으로, 마친 뒤에는 가라앉게, 라벨은 짧게 — **A**

**무엇이, 왜**
(a) 위치: 확장 FAB가 화면 가운데에 떠서 읽고 있는 줄의 한가운데를 가린다(2·3·7번 스크린샷의 "아버지의 … 마땅히 할"). M3는 FAB를 **bottom-end, 가장자리에서 16dp, 하단 탭 위**에 둔다. 오른쪽에 두면 줄 끝만 가린다.
(b) 상태: `variant = done ? 'secondary' : 'primary'`인데 이 팔레트에서 primary-container(#e6deff)와 secondary-container(#e6dff9)는 같은 색이라 마친 뒤에도 FAB가 그대로다. 체크 아이콘이 `check`→`check_circle`로 바뀌는 것만 남는다. 마친 상태는 더 세게가 아니라 **더 조용하게**(M3 lowered FAB = 강조를 낮출 때) 가는 것이 "결핍감 없음" 원칙과도 맞는다.
(c) 라벨: "기도를 마쳤습니다"(8자)는 375px에서 FAB를 열의 절반 너비로 만든다. 말씀 화면의 "읽었습니다"와 짝을 맞춰 "기도했습니다"로 줄이면 길이도 어조도 나란해진다(design.md 6.1의 문구를 바꾸는 일이라 주인 결정).

**바꿀 것**
`src/style.css`
```css
.fab-bar {
  justify-content: flex-end;
  padding-right: max(1rem, calc((100% - 37.5rem) / 2 + 1rem));  /* 본문 열의 오른쪽 안쪽에 */
}
```
`src/ui.ts` `doneFab()`의 `paint`
```ts
const done = isDone();
fab.variant = done ? 'surface' : 'primary';   // surface = surface-container-high 면, 글자는 primary
fab.lowered = done;                            // 마친 뒤에는 높이도 낮춘다
glyph.textContent = done ? 'check_circle' : 'check';
```
`src/screens/pray.ts` 73행: `'기도를 마쳤습니다'` → `'기도했습니다'`(선택).

**파일** `src/style.css`, `src/ui.ts`, (`src/screens/pray.ts`)

---

### 4. 첫 화면 모션을 1.7초 안으로 줄이고, reduced-motion 버그를 고친다 — **A**

**무엇이, 왜**
지금 순서: 세로 막대 600 → 가로 300+400 → 햇살 500+800(scale 0.6→1, 투명도 0.75까지 올랐다 0.35로) → 이름 900+600 → 한 줄 1200+500, 최소 2000ms 붙잡은 뒤 650ms 날아감 = **약 2.65초**. M3 모션 토큰은 전체 화면 전환도 450–600ms(long)를 넘지 않고, Android 스플래시 지침은 아이콘 애니메이션 1초 이내, 브랜드 연출 때문에 앱을 붙잡지 말라고 한다. 움직이는 생각도 넷(막대·햇살 확대·이름 상승·한 줄)이라 하나로 모이지 않는다. 십자가가 그려지고 이름이 올라와 제목 자리에 앉는다 — 이것이 이야기고, 햇살의 확대·과도(overshoot)는 덧붙은 것이다.
그리고 **버그**: `style.css` 1086–1089행의
```css
.splash.play *,
body.splash-flying .topbar h1 { visibility: hidden; }
```
가 `@media (prefers-reduced-motion: reduce)` 안에 있어, 움직임 줄이기를 켠 사용자에게는 첫 화면이 600ms 동안 **빈 보라 면**으로만 보인다(그 블록의 나머지 규칙은 끝 장면을 보여 주려는 의도였다). 들여쓰기로 보아 두 규칙이 합쳐지며 깨진 것이다.

**바꿀 것**
`src/style.css` — 재생 타이밍
```css
.splash.play .v           { animation: splash-v    400ms        var(--ease-decel) forwards; }
.splash.play .h           { animation: splash-h    300ms 200ms  var(--ease-decel) forwards; }
.splash.play .splash-rays { animation: splash-rays 500ms 350ms  var(--ease-standard) forwards; }
.splash.play .splash-name { animation: splash-rise 400ms 450ms  var(--ease-decel) forwards; }
.splash.play .splash-line { animation: splash-fade 300ms 650ms  var(--ease-standard) forwards; }
@keyframes splash-rays { from { opacity: 0; } to { opacity: 0.35; } }   /* 확대·과도 제거, 투명도만 */
```
(모두 950ms 안에 끝난다.)

`src/style.css` — reduced-motion 블록을 통째로 교체
```css
@media (prefers-reduced-motion: reduce) {
  .splash.play .v, .splash.play .h, .splash.play .splash-rays,
  .splash.play .splash-name, .splash.play .splash-line { animation: none; }
  .splash .v, .splash .h { transform: none; }
  .splash .splash-rays { opacity: 0.35; }
  .splash .splash-name, .splash .splash-line { opacity: 1; transform: none; }
  .splash.lift { transition: none; }
}
```
(`body.splash-flying .topbar h1`은 954행의 전역 규칙으로 이미 충분하다.)

`src/splash.ts`
- 26행 `reduce ? 600 : 2000` → `reduce ? 300 : 1200`
- 79행 `fly`: `{ duration: 500, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)', fill: 'forwards' }` — 제목 자리에 **들어와 앉는** 요소라 M3 emphasized-decelerate.
- 101행 배경: `{ duration: 350, delay: 100, easing: 'linear', fill: 'forwards' }`
- 80행 `fade`: `duration: 150`
- 108행 `wait(900)` → `wait(700)`

합계 ≈ 1.2 + 0.5 = 1.7초. 누르면 건너뛰는 것은 그대로.

**파일** `src/style.css`, `src/splash.ts`

---

### 5. 홈 시간대 타일: '지금'과 '마침'이 같은 색이다 — **A**

**무엇이, 왜**
`.slot.now`는 primary-container, `.slot.done`은 secondary-container — 3번과 같은 이유로 둘이 구분되지 않는다. 마친 타일은 체크 배지 하나로만 알 수 있다. 상태 의미로 보면 **지금 = 초대(색), 마침 = 조용히 물러남(회색)** 이 맞고, 그래야 세 타일 중 눌러야 할 것이 하나만 남는다. 같은 타일 안에서 이름이 위, 아이콘이 아래인 것도 바로 아래 하단 탭(아이콘 위, 이름 아래)과 거꾸로라 눈이 한 번 멈춘다.

**바꿀 것**
`src/style.css`
```css
.slot.done {
  background: var(--md-sys-color-surface-container-highest);
  color: var(--md-sys-color-on-surface-variant);
}
/* .slot.done .badge 는 그대로(primary 색 check_circle). .now.done이면 뒤에 오는 .done이 이겨 조용한 쪽이 된다 */
```
`src/screens/home.ts` 49–50행: 순서를 바꿔 아이콘이 먼저
```ts
h('span', { class: 'glyph' }, icon(GLYPH[office])),
name,
```

**파일** `src/style.css`, `src/screens/home.ts`

---

### 6. '오늘의 말씀' 카드는 카드 전체를 누르게 — **A**

**무엇이, 왜**
같은 홈에서 기도 카드는 80px 타일 셋이 눌리는데, 말씀 카드는 제목 줄의 40px "읽기 >" 텍스트 단추만 눌린다. 누르는 방식이 카드마다 다르면 손이 머뭇거린다. 구글의 홈 성격 화면(Fit·Calendar)은 **카드 자체가 하나의 탭 대상 + 오른쪽 chevron**이다. 단추 하나가 줄어 제목 줄도 조용해지고, `h2`의 `min-height: 2.5rem`도 필요 없어진다.

**바꿀 것**
`src/screens/home.ts` `readingCard()`
```ts
const card = pressable(
  h('a', { class: 'card card-link', href: '#/read', 'aria-label': `오늘의 말씀, ${line} ${meta}` },
    h('div', { class: 'card-head' }, h('h2', null, '오늘의 말씀'), icon('chevron_right')),
    h('p', { class: 'card-reading' }, line),
    h('p', { class: 'card-meta' }, meta),
  ),
);
return card;   // md-text-button '읽기' 제거
```
`src/style.css`
```css
a.card-link { display: block; color: inherit; text-decoration: none;
  --md-focus-ring-shape: var(--md-sys-shape-corner-large); }
.card-head md-icon { color: var(--md-sys-color-on-surface-variant); }
.card h2 { min-height: 0; }          /* 2.5rem 삭제 */
```
`.card-head md-text-button` 규칙은 지운다.

**파일** `src/screens/home.ts`, `src/style.css`

---

### 7. 설정: 글 크기 한 가지로, 텍스트 단추 왼쪽 맞춤 — **A**

**무엇이, 왜**
"설치" 칸의 첫 문장(`install.ts` 51·58·90행의 `p`)에만 `.note`가 없어 본문 16px로 찍히고, 그 아래 설명은 14px이다(5번 스크린샷). 같은 칸 안에서 크기가 두 가지면 위계가 아니라 실수로 읽힌다. iOS의 `.steps`도 16px/28px로 또 다르다. 설정 칸의 글은 **body-medium(14/20) 한 가지**, 첫 문장은 크기가 아니라 색(on-surface vs on-surface-variant)으로 앞세운다.
또 "이 기기의 기록 모두 지우기" 텍스트 단추는 제 안쪽 여백(12px) 때문에 위 글줄보다 들어가 있다. 홈 `.card-head md-text-button { margin-right: -0.75rem }`과 같은 수법으로 왼쪽을 맞춘다.

**바꿀 것** (`src/style.css`)
```css
.setting p { font: 400 0.875rem/1.25rem var(--font-nanum); }   /* .setting .label 은 더 구체적이라 그대로 */
.steps { margin: 0 0 0.5rem; padding-left: 1.25rem; font: 400 0.875rem/1.25rem var(--font-nanum); }
.steps li + li { margin-top: 0.25rem; }
.actions > md-text-button:first-child { margin-left: -0.75rem; }
```
(코드 쪽을 고치고 싶으면 `install.ts`의 세 `p`에 `class: 'note'`를 주되 색은 on-surface로 남긴다. CSS 쪽이 더 안전하다.)

**파일** `src/style.css`

---

### 8. 글자 단계와 간격을 4dp 격자에 맞춘다 — **B**

**무엇이, 왜**
몇 군데가 격자를 벗어나 있거나 화면마다 다르다. 눈에 띄지는 않지만 "정돈된" 느낌을 만드는 것이 이런 숫자다.
- 인용 20px/34px(1.7) → M3 headline-small 24/32·title-large 22/28 사이. 20/32로.
- 인용 머리말 11px(label-small)은 큰 카드의 overline으로는 너무 작다 → 12/16(label-medium).
- `.today-line`·`.read-title`·`.read-rest` 24/34 → 24/32(headline-small).
- 기도 요소 제목 아래 여백 10px(0.625rem) vs 말씀 장 제목 12px → 둘 다 12.
- 시편 줄 간격 4px(`.office .line`) vs 성경 절 6px(`.scripture .verse`) → 둘 다 8.
- 첫 요소가 상단 바 바로 아래 4px에서 시작(`.home`·`.pray-controls` padding-top 0.25rem) → 8.

**바꿀 것** (`src/style.css`)
```css
.quote blockquote { font: 400 1.25rem/2rem var(--font-noto); }
.quote-eyebrow { font: 500 0.75rem/1rem var(--font-noto); margin-bottom: 0.5rem; }
.today-line, .read-title, .read-rest { font: 400 1.5rem/2rem var(--font-noto); }
.office h2 { margin: 0 0 0.75rem; }
.office .line, .scripture .verse { margin: 0 0 0.5rem; }
.home, .pray-controls { padding-top: 0.5rem; }
```

**파일** `src/style.css`

---

### 9. 굵게(700)는 M3가 정한 자리에만 — **B**

**무엇이, 왜**
한 화면에 700이 많다: 카드 제목, 설정 칸 제목, 고른 단추(2번에서 해결), 인도자 목록의 고른 이름, 하단 탭 활성 라벨, 읽은 날. Noto Sans KR 700은 라틴 700보다 훨씬 검게 보여 홈이 구글 앱보다 무겁다. M3에서 700을 쓰는 곳은 하단 탭 활성 라벨(label-medium prominent)뿐이고 제목은 500이다. 기도·말씀의 보라 요소 제목(700)은 주인 결정이라 그대로 둔다. 카드·설정 제목은 design.md 8절이 "굵게"라고 했는데, Noto Sans KR에서는 500도 본문 400과 분명히 구분되므로 500을 "굵게"로 보는 것이 구글 쪽 해석이다 — 주인이 정한다.

**바꿀 것** (`src/style.css`)
```css
.card h2, .setting h2 { font: 500 1.125rem/1.5rem var(--font-noto); }
.pick[aria-pressed='true'] { font-weight: 500; }      /* 면 + 체크 아이콘이 이미 말한다 */
/* 유지: .navbar a[aria-current='page'] 700 (M3 스펙), .calendar .read 700 (색만으로 구분하지 않기) */
```

**파일** `src/style.css`

---

### 10. 진도 달력: 안 읽은 날의 고리를 뺀다 — **B**

**무엇이, 왜**
11월 달력에 테두리 원이 18개 그려져 있어(4번) 화면에서 가장 바쁜 부분이 "아무 일도 없는 날"이다. M3 date picker는 **오늘만 테두리, 고른 날만 채움**이고 나머지는 숫자만 둔다. 누를 수 있다는 것은 글자 굵기·색과 아래 안내문("날짜를 누르면 …")이 말해 주고, `aria-label`은 그대로다. 읽은 날은 면 + 점 + 굵기 그대로라 색만으로 구분하지 않는 원칙도 지켜진다.

**바꿀 것** (`src/style.css`)
```css
.calendar a.cell:not(.read) { border: 0; font-weight: 500; }   /* 통독일: 고리 없이 500 */
/* .calendar .off (쉬는 날·통독 밖): 400 + 50% 그대로 → 굵기로도 구분된다 */
```

**파일** `src/style.css`

---

### 11. 탭 전환에 짧은 fade-through — **B**

**무엇이, 왜**
하단 탭을 누르면 화면이 `replaceChildren`로 즉시 바뀐다. M3는 최상위 목적지 전환에 fade-through(나가는 것 90ms, 들어오는 것 210ms)를 권하고, 구글 앱의 "부드럽다"는 인상은 대부분 이 200ms에서 온다. 들어오는 쪽만 해도 충분하다.

**바꿀 것** (`src/main.ts` `render()` 안, `screens[route](root, …)` 바로 뒤)
```ts
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 210, easing: 'cubic-bezier(0.05, 0.7, 0.1, 1)' });
}
```
첫 그리기는 첫 화면 모션이 덮고 있어 보이지 않으므로 따로 가를 필요 없다.

**파일** `src/main.ts`

---

### 12. 작은 마무리: theme-color와 십자가 색 — **B**

**무엇이, 왜**
- `index.html`의 `theme-color` 메타 두 개는 OS 설정만 따른다. 설정에서 "어둡게"를 강제하면 앱은 어둡고 브라우저 상태 표시줄은 밝은 채로 남아 가장자리가 갈라진다.
- `--app-cross`가 밝게에서 #051142(팔레트 밖의 남색)다. 제목 글자(#1c1b20)와도, 보라와도 아니다. 두 모드 모두 `primary`로 두면 제목 옆 작은 브랜드 악센트가 되고(어둡게는 #c9beff), 첫 화면의 막대 색이 거기로 날아가므로 코드 변경은 없다.

**바꿀 것**
`src/display.ts` `applyDisplay()` 끝에
```ts
const dark = s.theme === 'dark' || (s.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
for (const m of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
  m.removeAttribute('media');
  m.content = dark ? '#141318' : '#fdf8ff';
}
```
`src/main.ts`(ready 안): `matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDisplay);`
`src/style.css`: `:root`와 두 어둡게 블록의 `--app-cross` → `var(--md-sys-color-primary)`.

**파일** `src/display.ts`, `src/main.ts`, `src/style.css`

---

## 3. 그대로 둘 것

- **색 체계**: #403966에서 계산한 M3 역할 전체와 두 어둡게 블록이 완전하고, 어두운 모드의 인용 카드(primary-container/on-primary-container)는 정석이다. 명암비도 검산한 곳 모두 AA 이상.
- **상단 바**: 64dp, title-large 400, 스크롤하면 surface-container, 설정 아이콘 가장자리 4dp — 스펙 그대로.
- **하단 탭**: 80dp, 64×32 알약 표시, label-medium, 활성 700 — 스펙 그대로. 위 모서리 28px은 "각진 모서리 없음"의 일관된 표현으로 읽힌다.
- **기도·말씀 본문**: 나눔고딕 18px/1.78, 보라 굵은 요소 제목 한 단계 위, 위첨자 절 번호, 오른쪽 맞춤 출처 — 소리 내어 읽는 글의 조판으로 알맞다. 함께 모드가 굵기·면만 덧입히는 구조도 좋다.
- **스크롤 하나의 기도 화면**, 밀린 날을 접지 않고 화면으로 나눈 것, 진도를 숫자 하나 + 달력으로 끝낸 것.
- **접근성 바탕**: 직접 만든 누르는 것마다 md-ripple·md-focus-ring, `aria-pressed`, 역할의 sr 텍스트, 읽은 날의 면+점+굵기.
- **첫 화면**: 누르면 건너뛰기, 이름이 제목 자리에 정확히 앉는 계산(글자 상자 기준). 4번은 길이와 버그만 손본다.
- **설치·저장 안내**: 경고색 없이 surface-container 한 줄로 처리한 것. 경고색·순위·연속 문구가 없는 것이 이 앱의 가장 구글다운 점이다.
- 아이콘 한 벌(Rounded, FILL 0), 이모지 없음, 의존성 다섯 개.
