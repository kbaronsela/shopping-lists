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

// Words that should stick to the previous item word (not treated as new items)
const MODIFIERS = new Set([
  'צהוב', 'צהובה', 'לבן', 'לבנה', 'אדום', 'אדומה', 'ירוק', 'ירוקה',
  'כחול', 'כחולה', 'שחור', 'שחורה', 'סגול', 'סגולה', 'כתום', 'כתומה',
  'גדול', 'גדולה', 'קטן', 'קטנה', 'בינוני', 'בינונית',
  'דל', 'מלא', 'מלאה', 'חצי',
  'קשה', 'רך', 'רכה', 'טרי', 'טרייה', 'יבש', 'יבשה',
  'קפוא', 'קפואה', 'מבושל', 'מבושלת',
  'מתוק', 'מתוקה', 'חמוץ', 'חמוצה', 'מלוח', 'מלוחה',
  'שמן', 'רזה', 'עשיר', 'עשירה', 'פריך', 'פריכה',
  'מעושן', 'מעושנת', 'טחון', 'טחונה',
  'זית', 'קוקוס', 'תירס', 'חמניות', 'דקל', // common compound-noun seconds
]);

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

function parseQuantity(text: string): { quantity: number; cleaned: string } {
  const leadingNum = text.match(/^(\d+)\s+(.+)/);
  if (leadingNum) return { quantity: parseInt(leadingNum[1]), cleaned: leadingNum[2].trim() };

  const trailingNum = text.match(/^(.+?)\s*[x×*]\s*(\d+)$/i);
  if (trailingNum) return { quantity: parseInt(trailingNum[2]), cleaned: trailingNum[1].trim() };

  for (const [word, value] of Object.entries(HEBREW_NUMBERS)) {
    const re = new RegExp(`^${word}\\s+(.+)`, 'i');
    const match = text.match(re);
    if (match) return { quantity: value, cleaned: match[1].trim() };
  }

  for (const [word, value] of Object.entries(HEBREW_NUMBERS)) {
    const re = new RegExp(`^(.+?)\\s+${word}$`, 'i');
    const match = text.match(re);
    if (match) return { quantity: value, cleaned: match[1].trim() };
  }

  return { quantity: 1, cleaned: text };
}

/**
 * Split a sub-phrase (already split by comma and ו) into individual items.
 * Groups modifiers/adjectives with the preceding noun, but treats
 * consecutive standalone nouns as separate items.
 *
 * Examples:
 *   "גזר עגבניות"   → ["גזר", "עגבניות"]      (two separate items)
 *   "גבינה צהובה"   → ["גבינה צהובה"]          (noun + adjective = one item)
 *   "שמן זית"       → ["שמן זית"]               ("זית" is in MODIFIERS)
 *   "2 חלב"         → ["2 חלב"]                 (quantity sticks to next word)
 *   "שתיים חלב"     → ["שתיים חלב"]             (Hebrew number sticks to next word)
 */
function splitByWords(phrase: string): string[] {
  const tokens = phrase.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return tokens;

  const groups: string[] = [];
  let current = '';

  for (const token of tokens) {
    if (!current) {
      current = token;
    } else if (
      MODIFIERS.has(token) ||
      token.includes('%') ||
      /^[\d]/.test(token) // digit suffix like "5g"
    ) {
      // Modifier/adjective/numeric-suffix → append to current item
      current += ' ' + token;
    } else if (/^\d+$/.test(current) || HEBREW_NUMBERS[current] !== undefined) {
      // Current token is a pure quantity prefix → stick next word to it
      current += ' ' + token;
    } else {
      // Standalone noun → new item
      groups.push(current);
      current = token;
    }
  }
  if (current) groups.push(current);
  return groups.filter((g) => g.trim().length > 0);
}

export function parseShoppingText(
  text: string,
  availableLists: string[]
): ParsedItem[] {
  const defaultList = availableLists[0] ?? 'סופר';
  const items: ParsedItem[] = [];

  // Step 1: split by comma / newline / semicolon
  const phrases = text
    .split(/[,،;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  for (const phrase of phrases) {
    // Detect the list for the entire phrase (handles "ברגים ודיבלים מהטמבוריה")
    const phraseList = detectList(phrase, availableLists) ?? defaultList;

    // Step 2: split by "ו" conjunction
    const vavSplit = phrase
      .split(/(?<=\S)\s+ו(?=[^ו\s])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Step 3: for each vav-segment, further split by spaces (handles "גזר עגבניות")
    const subItems = vavSplit.flatMap((seg) => splitByWords(seg));

    for (const sub of subItems) {
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
