// 성경 66권. code는 plan.csv refs와 elements.json ref가 쓰는 약어, 파일 이름은 bible/krv/<code>.json.

export interface Book {
  code: string;
  ko: string;
  chapters: number;
}

export const BOOKS: readonly Book[] = [
  { code: 'Gen', ko: '창세기', chapters: 50 },
  { code: 'Exod', ko: '출애굽기', chapters: 40 },
  { code: 'Lev', ko: '레위기', chapters: 27 },
  { code: 'Num', ko: '민수기', chapters: 36 },
  { code: 'Deut', ko: '신명기', chapters: 34 },
  { code: 'Josh', ko: '여호수아', chapters: 24 },
  { code: 'Judg', ko: '사사기', chapters: 21 },
  { code: 'Ruth', ko: '룻기', chapters: 4 },
  { code: '1Sam', ko: '사무엘상', chapters: 31 },
  { code: '2Sam', ko: '사무엘하', chapters: 24 },
  { code: '1Kgs', ko: '열왕기상', chapters: 22 },
  { code: '2Kgs', ko: '열왕기하', chapters: 25 },
  { code: '1Chr', ko: '역대상', chapters: 29 },
  { code: '2Chr', ko: '역대하', chapters: 36 },
  { code: 'Ezra', ko: '에스라', chapters: 10 },
  { code: 'Neh', ko: '느헤미야', chapters: 13 },
  { code: 'Esth', ko: '에스더', chapters: 10 },
  { code: 'Job', ko: '욥기', chapters: 42 },
  { code: 'Ps', ko: '시편', chapters: 150 },
  { code: 'Prov', ko: '잠언', chapters: 31 },
  { code: 'Eccl', ko: '전도서', chapters: 12 },
  { code: 'Song', ko: '아가', chapters: 8 },
  { code: 'Isa', ko: '이사야', chapters: 66 },
  { code: 'Jer', ko: '예레미야', chapters: 52 },
  { code: 'Lam', ko: '예레미야애가', chapters: 5 },
  { code: 'Ezek', ko: '에스겔', chapters: 48 },
  { code: 'Dan', ko: '다니엘', chapters: 12 },
  { code: 'Hos', ko: '호세아', chapters: 14 },
  { code: 'Joel', ko: '요엘', chapters: 3 },
  { code: 'Amos', ko: '아모스', chapters: 9 },
  { code: 'Obad', ko: '오바댜', chapters: 1 },
  { code: 'Jonah', ko: '요나', chapters: 4 },
  { code: 'Mic', ko: '미가', chapters: 7 },
  { code: 'Nah', ko: '나훔', chapters: 3 },
  { code: 'Hab', ko: '하박국', chapters: 3 },
  { code: 'Zeph', ko: '스바냐', chapters: 3 },
  { code: 'Hag', ko: '학개', chapters: 2 },
  { code: 'Zech', ko: '스가랴', chapters: 14 },
  { code: 'Mal', ko: '말라기', chapters: 4 },
  { code: 'Matt', ko: '마태복음', chapters: 28 },
  { code: 'Mark', ko: '마가복음', chapters: 16 },
  { code: 'Luke', ko: '누가복음', chapters: 24 },
  { code: 'John', ko: '요한복음', chapters: 21 },
  { code: 'Acts', ko: '사도행전', chapters: 28 },
  { code: 'Rom', ko: '로마서', chapters: 16 },
  { code: '1Cor', ko: '고린도전서', chapters: 16 },
  { code: '2Cor', ko: '고린도후서', chapters: 13 },
  { code: 'Gal', ko: '갈라디아서', chapters: 6 },
  { code: 'Eph', ko: '에베소서', chapters: 6 },
  { code: 'Phil', ko: '빌립보서', chapters: 4 },
  { code: 'Col', ko: '골로새서', chapters: 4 },
  { code: '1Thess', ko: '데살로니가전서', chapters: 5 },
  { code: '2Thess', ko: '데살로니가후서', chapters: 3 },
  { code: '1Tim', ko: '디모데전서', chapters: 6 },
  { code: '2Tim', ko: '디모데후서', chapters: 4 },
  { code: 'Titus', ko: '디도서', chapters: 3 },
  { code: 'Phlm', ko: '빌레몬서', chapters: 1 },
  { code: 'Heb', ko: '히브리서', chapters: 13 },
  { code: 'Jas', ko: '야고보서', chapters: 5 },
  { code: '1Pet', ko: '베드로전서', chapters: 5 },
  { code: '2Pet', ko: '베드로후서', chapters: 3 },
  { code: '1John', ko: '요한일서', chapters: 5 },
  { code: '2John', ko: '요한이서', chapters: 1 },
  { code: '3John', ko: '요한삼서', chapters: 1 },
  { code: 'Jude', ko: '유다서', chapters: 1 },
  { code: 'Rev', ko: '요한계시록', chapters: 22 },
];

const byCode = new Map(BOOKS.map((b) => [b.code, b]));

export function bookOf(code: string): Book | undefined {
  return byCode.get(code);
}
