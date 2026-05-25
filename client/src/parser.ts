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

function parseQuantity(text: string): { quantity: number; cleaned: string } {
  const leadingNum = text.match(/^(\d+)\s+(.+)/);
  if (leadingNum) return { quantity: parseInt(leadingNum[1]), cleaned: leadingNum[2].trim() };
  const trailingNum = text.match(/^(.+?)\s*[x×*]\s*(\d+)$/i);
  if (trailingNum) return { quantity: parseInt(trailingNum[2]), cleaned: trailingNum[1].trim() };
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
