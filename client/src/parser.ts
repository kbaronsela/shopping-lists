export interface ParsedItem {
  name: string;
  listName: string;
  quantity: number;
}

// Keywords that indicate which list an item belongs to
const LIST_KEYWORDS: Record<string, string[]> = {
  פארם: ['פארם', 'פרמסיה', 'פארמסיה', 'בית מרקחת', 'סופר-פארם', 'סופרפארם'],
  סופר: ['סופר', 'שופרסל', 'רמי לוי', 'יינות ביתן', 'מגה', 'ויקטורי', 'חצי חינם', 'קארפור'],
  טמבוריה: ['טמבוריה', 'טמבור'],
  מקס: ['מקס', 'מקסטוק', 'מקס סטוק'],
};

// Hebrew prepositions used before place names: מה, מ, ב, ל, אל
const PREP_PATTERN = '[מבל]ה?';

function detectList(text: string, availableLists: string[]): string {
  const lower = text.toLowerCase();

  for (const [listName, keywords] of Object.entries(LIST_KEYWORDS)) {
    if (!availableLists.includes(listName)) continue;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return listName;
    }
  }

  // Also match available list names directly (e.g. user added a custom list "איקאה")
  for (const listName of availableLists) {
    if (lower.includes(listName.toLowerCase())) return listName;
  }

  // Default to first list (סופר)
  return availableLists[0] ?? 'סופר';
}

function cleanItemName(text: string, availableLists: string[]): string {
  let result = text;

  // Remove list keywords with optional preposition: "מהפארם", "מפארם", "בפארם"
  for (const keywords of Object.values(LIST_KEYWORDS)) {
    for (const kw of keywords) {
      result = result.replace(new RegExp(`${PREP_PATTERN}${kw}`, 'gi'), '');
      result = result.replace(new RegExp(kw, 'gi'), '');
    }
  }

  // Remove available list names with optional prepositions
  for (const listName of availableLists) {
    result = result.replace(
      new RegExp(`${PREP_PATTERN}${listName}`, 'gi'),
      ''
    );
    result = result.replace(new RegExp(listName, 'gi'), '');
  }

  // Remove common filler words
  const fillers = ['תביא', 'תקני', 'לקחת', 'קני', 'לקנות', 'צריך', 'צריכה', 'גם'];
  for (const filler of fillers) {
    result = result.replace(new RegExp(`\\b${filler}\\b`, 'gi'), '');
  }

  return result.trim().replace(/\s+/g, ' ');
}

function parseQuantity(text: string): { quantity: number; cleaned: string } {
  // Match patterns like "2 חלב", "חלב x2", "חלב ×3"
  const leadingNum = text.match(/^(\d+)\s+(.+)/);
  if (leadingNum) {
    return { quantity: parseInt(leadingNum[1]), cleaned: leadingNum[2].trim() };
  }
  const trailingNum = text.match(/^(.+?)\s*[x×*]\s*(\d+)$/i);
  if (trailingNum) {
    return { quantity: parseInt(trailingNum[2]), cleaned: trailingNum[1].trim() };
  }
  return { quantity: 1, cleaned: text };
}

function splitIntoSegments(text: string): string[] {
  return (
    text
      // Split on commas, newlines, semicolons
      .split(/[,،;\n]+/)
      // Further split on "ו" conjunction between items (e.g. "חלב וביצים")
      // Only split if "ו" is followed by a non-ו character and preceded by a space
      .flatMap((chunk) => chunk.split(/(?<=\S)\s+ו(?=[^ו\s])/))
      .map((s) => s.trim())
      .filter((s) => s.length > 1)
  );
}

export function parseShoppingText(
  text: string,
  availableLists: string[]
): ParsedItem[] {
  const segments = splitIntoSegments(text);
  const items: ParsedItem[] = [];

  for (const segment of segments) {
    const listName = detectList(segment, availableLists);
    const cleaned = cleanItemName(segment, availableLists);

    if (!cleaned) continue;

    const { quantity, cleaned: finalName } = parseQuantity(cleaned);

    if (finalName.length < 1) continue;

    items.push({ name: finalName, listName, quantity });
  }

  return items;
}
