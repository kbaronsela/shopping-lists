export interface ParsedItem {
  name: string;
  listName: string;
  quantity: number;
}

const LIST_KEYWORDS: Record<string, string[]> = {
  פארם: ['פארם', 'פרמסיה', 'פארמסיה', 'בית מרקחת', 'סופר-פארם', 'סופרפארם'],
  סופר: ['סופר', 'שופרסל', 'רמי לוי', 'יינות ביתן', 'מגה', 'ויקטורי', 'חצי חינם', 'קארפור'],
  טמבוריה: ['טמבוריה', 'טמבור'],
  מקס: ['מקס', 'מקסטוק', 'מקס סטוק'],
};

const PREP_PATTERN = '[מבל]ה?';

function detectList(text: string, availableLists: string[]): string | null {
  const lower = text.toLowerCase();
  for (const [listName, keywords] of Object.entries(LIST_KEYWORDS)) {
    if (!availableLists.includes(listName)) continue;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return listName;
    }
  }
  for (const listName of availableLists) {
    if (lower.includes(listName.toLowerCase())) return listName;
  }
  return null;
}

function cleanItemName(text: string, availableLists: string[]): string {
  let result = text;

  for (const keywords of Object.values(LIST_KEYWORDS)) {
    for (const kw of keywords) {
      result = result.replace(new RegExp(`${PREP_PATTERN}${kw}`, 'gi'), '');
      result = result.replace(new RegExp(kw, 'gi'), '');
    }
  }
  for (const listName of availableLists) {
    result = result.replace(new RegExp(`${PREP_PATTERN}${listName}`, 'gi'), '');
    result = result.replace(new RegExp(listName, 'gi'), '');
  }

  const fillers = ['תביא', 'תקני', 'לקחת', 'קני', 'לקנות', 'צריך', 'צריכה', 'גם'];
  for (const filler of fillers) {
    result = result.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '');
  }

  return result.trim().replace(/\s+/g, ' ');
}

const HEBREW_NUMBERS: Record<string, number> = {
  'אחד': 1, 'אחת': 1,
  'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2, 'שתים': 2,
  'שלושה': 3, 'שלוש': 3,
  'ארבעה': 4, 'ארבע': 4,
  'חמישה': 5, 'חמש': 5,
  'שישה': 6, 'שש': 6,
  'שבעה': 7, 'שבע': 7,
  'שמונה': 8,
  'תשעה': 9, 'תשע': 9,
  'עשרה': 10, 'עשר': 10,
};

function parseQuantity(text: string): { quantity: number; cleaned: string } {
  // Digit at start: "2 חלב"
  const leadingNum = text.match(/^(\d+)\s+(.+)/);
  if (leadingNum) return { quantity: parseInt(leadingNum[1]), cleaned: leadingNum[2].trim() };

  // Digit with x at end: "חלב x2"
  const trailingNum = text.match(/^(.+?)\s*[x×*]\s*(\d+)$/i);
  if (trailingNum) return { quantity: parseInt(trailingNum[2]), cleaned: trailingNum[1].trim() };

  // Hebrew number word at start: "שתיים חלב"
  for (const [word, value] of Object.entries(HEBREW_NUMBERS)) {
    const re = new RegExp(`^${word}\\s+(.+)`, 'i');
    const match = text.match(re);
    if (match) return { quantity: value, cleaned: match[1].trim() };
  }

  // Hebrew number word at end: "חלב שתיים"
  for (const [word, value] of Object.entries(HEBREW_NUMBERS)) {
    const re = new RegExp(`^(.+?)\\s+${word}$`, 'i');
    const match = text.match(re);
    if (match) return { quantity: value, cleaned: match[1].trim() };
  }

  return { quantity: 1, cleaned: text };
}

export function parseShoppingText(
  text: string,
  availableLists: string[]
): ParsedItem[] {
  const defaultList = availableLists[0] ?? 'סופר';
  const items: ParsedItem[] = [];

  // Split into top-level phrases by comma, newline, semicolon
  const phrases = text
    .split(/[,،;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  for (const phrase of phrases) {
    // Detect the list for the entire phrase first (handles "ברגים ודיבלים מהטמבוריה")
    const phraseList = detectList(phrase, availableLists) ?? defaultList;

    // Split by "ו" conjunction into individual items
    const subItems = phrase
      .split(/(?<=\S)\s+ו(?=[^ו\s])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const sub of subItems) {
      // Sub-item can override the list if it has its own keyword
      const subList = detectList(sub, availableLists) ?? phraseList;
      const cleaned = cleanItemName(sub, availableLists);
      if (!cleaned) continue;

      const { quantity, cleaned: finalName } = parseQuantity(cleaned);
      if (!finalName) continue;

      items.push({ name: finalName, listName: subList, quantity });
    }
  }

  return items;
}
