# רשימות קניות 🛒

אפליקציית PWA לניהול רשימות קניות — פרונטאנד בלבד, ללא שרת.

## טכנולוגיות

- **קליינט**: React + Vite + TypeScript + TailwindCSS + PWA
- **מסד נתונים**: Supabase (PostgreSQL בענן, חינמי)
- **פענוח טקסט**: מילות מפתח בעברית, ישירות בדפדפן
- **Speech-to-Text**: Web Speech API (מובנה, תמיכה בעברית)

---

## הגדרה ראשונית

### שלב 1 — צור פרויקט Supabase

1. היכנס ל-[supabase.com](https://supabase.com) וצור חשבון חינמי
2. צור פרויקט חדש (בחר סיסמה ואזור)
3. המתן ~2 דקות עד שהפרויקט מוכן

### שלב 2 — צור את הטבלאות

ב-Supabase לך ל: **SQL Editor** → **New query** והדבק:

```sql
-- טבלת רשימות
CREATE TABLE lists (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת פריטים
CREATE TABLE items (
  id BIGSERIAL PRIMARY KEY,
  list_id BIGINT REFERENCES lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- הרשאות גישה ציבורית (לאפליקציה אישית)
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all" ON lists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all" ON items FOR ALL USING (true) WITH CHECK (true);

-- רשימות ברירת מחדל
INSERT INTO lists (name) VALUES ('סופר'), ('טמבוריה'), ('פארם'), ('מקס');
```

לחץ **Run**.

### שלב 3 — העתק את פרטי ה-API

ב-Supabase לך ל: **Project Settings → API**

העתק:
- **Project URL** (נראה כך: `https://xxxx.supabase.co`)
- **anon public** key

### שלב 4 — הגדר משתני סביבה

```bash
cd client
copy .env.example .env
```

ערוך את `client/.env`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### שלב 5 — התקנה והפעלה

```bash
cd client
npm install
npm run dev
```

האפליקציה תיפתח על `http://localhost:5173/shopping-lists/`

---

## פרסום על GitHub Pages (חינמי)

### אוטומטי עם GitHub Actions

צור את הקובץ `.github/workflows/deploy.yml` (כבר קיים בפרויקט).

לאחר מכן הוסף את משתני הסביבה ב-GitHub:
1. לך ל-Repository → **Settings → Secrets and variables → Actions**
2. הוסף שני secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

בכל `git push` לענף `main` — האפליקציה תפורסם אוטומטית!

הכתובת תהיה: `https://kbaronsela.github.io/shopping-lists/`

---

## שימוש

### פענוח אוטומטי לפי מילות מפתח

| ביטוי בטקסט | → רשימה |
|---|---|
| "מהפארם", "פארמסיה" | פארם |
| "מהסופר", "שופרסל", "רמי לוי" | סופר |
| "טמבוריה", "טמבור" | טמבוריה |
| "מקס", "מקסטוק" | מקס |
| ללא ציון | סופר (ברירת מחדל) |

### דוגמאות

- `"חיתולים מהפארם ומוצרלה מהסופר"` → 2 פריטים בשתי רשימות
- `"חלב, ביצים, לחם"` → 3 פריטים ב"סופר"
- `"ממקס מדפים ומברגים"` → 2 פריטים ב"מקס"
