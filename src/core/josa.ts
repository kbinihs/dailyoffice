// 앞 글자 받침에 따라 조사를 고른다. "히브리서 7~9를", "레위기 26~민 3을", "오늘은"
type Pair = '을/를' | '은/는' | '이/가' | '과/와';

/** 숫자를 읽었을 때 받침이 있는 것: 영 일 삼 육 칠 팔 */
const DIGITS_WITH_FINAL = '013678';

export function josa(word: string, pair: Pair): string {
  const [withFinal, withoutFinal] = pair.split('/');
  const last = word.trim().at(-1) ?? '';
  const code = last.charCodeAt(0);
  let final = false;
  if (code >= 0xac00 && code <= 0xd7a3) final = (code - 0xac00) % 28 !== 0;
  else if (/\d/.test(last)) final = DIGITS_WITH_FINAL.includes(last);
  return word + (final ? withFinal : withoutFinal);
}
