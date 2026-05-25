import OpenAI from 'openai';

let client: OpenAI;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export interface ParsedItem {
  name: string;
  listName: string;
  quantity: number;
}

export async function parseShoppingText(
  text: string,
  availableLists: string[]
): Promise<ParsedItem[]> {
  const openai = getClient();

  const prompt = `אתה עוזר חכם שמפענח טקסט עברי ומחלק אותו לפריטי קניות ברשימות המתאימות.

רשימות הקניות הזמינות: ${availableLists.join(', ')}

הנחיות:
1. נתח את הטקסט וחלץ פריטי קניות.
2. אם הפריט מוזכר עם חנות/מקום מסוים (למשל "חיתולים מהפארם", "גבינה מהסופר") - הכנס אותו לרשימה המתאימה.
3. אם לא מוזכר מקום ספציפי, הכנס לרשימה הכי הגיונית (למשל מוצרי מזון ל"סופר", תרופות/קוסמטיקה ל"פארם", ציוד ל"טמבוריה" או "מקס").
4. אם לא ברור - הכנס ל"סופר".
5. שמור על שם הפריט בעברית, ללא ציון החנות (לא "חיתולים מהפארם" אלא "חיתולים").
6. אם מוזכרת כמות - שמור עליה.

החזר JSON תקני בלבד (ללא הסברים), במבנה הבא:
[
  { "name": "שם הפריט", "listName": "שם הרשימה", "quantity": מספר }
]

טקסט לניתוח: "${text}"`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content ?? '{"items":[]}';

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Failed to parse OpenAI response as JSON');
  }

  let items: unknown[];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (
    parsed !== null &&
    typeof parsed === 'object' &&
    'items' in parsed &&
    Array.isArray((parsed as { items: unknown[] }).items)
  ) {
    items = (parsed as { items: unknown[] }).items;
  } else {
    items = [];
  }

  return items
    .filter(
      (item): item is ParsedItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ParsedItem).name === 'string' &&
        typeof (item as ParsedItem).listName === 'string'
    )
    .map((item) => ({
      name: (item as ParsedItem).name.trim(),
      listName: (item as ParsedItem).listName.trim(),
      quantity: typeof (item as ParsedItem).quantity === 'number' ? (item as ParsedItem).quantity : 1,
    }));
}
