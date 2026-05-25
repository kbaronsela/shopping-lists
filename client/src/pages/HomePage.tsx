import { useState, useRef, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import ItemPreviewModal from '../components/ItemPreviewModal';
import { confirmItems, fetchLists, ConfirmEntry } from '../api';
import { parseShoppingText } from '../parser';
import { ProcessedItem, List } from '../types';

type RecordingState = 'idle' | 'recording';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

export default function HomePage() {
  const [text, setText] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewItems, setPreviewItems] = useState<ProcessedItem[] | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Text that existed before recording started — kept separate so we can
  // rebuild "baseText + sessionTranscript" on every interim event without duplication
  const baseTextRef = useRef('');
  const sessionFinalRef = useRef('');
  const isRecordingRef = useRef(false); // stable ref to avoid stale closure in onend

  const hasSpeechRecognition =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    textareaRef.current?.focus();
    fetchLists()
      .then(setLists)
      .catch(() => setError('שגיאה בטעינת הרשימות'));
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecordingState('idle');
    setInterimText('');
  }, []);

  function startRecording() {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    baseTextRef.current = text;
    sessionFinalRef.current = '';
    isRecordingRef.current = true;

    function createAndStart() {
      if (!isRecordingRef.current) return;

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'he-IL';
      recognition.continuous = false;   // one utterance at a time — no accumulation bug
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // With continuous=false there is always exactly one result
        const result = event.results[0];
        const transcript = result[0].transcript.trim();

        if (result.isFinal) {
          if (transcript) {
            sessionFinalRef.current += (sessionFinalRef.current ? ' ' : '') + transcript;
          }
          const combined = [baseTextRef.current, sessionFinalRef.current]
            .filter(Boolean)
            .join(' ');
          setText(combined);
          setInterimText('');
        } else {
          setInterimText(transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech') {
          // Silence — restart quietly
          if (isRecordingRef.current) createAndStart();
          return;
        }
        isRecordingRef.current = false;
        setError('שגיאה בהקלטה: ' + event.error);
        setRecordingState('idle');
      };

      recognition.onend = () => {
        setInterimText('');
        // Auto-restart so recording feels continuous
        if (isRecordingRef.current) createAndStart();
      };

      recognitionRef.current = recognition;
      recognition.start();
    }

    createAndStart();
    setRecordingState('recording');
    setError('');
  }

  function toggleRecording() {
    if (recordingState === 'recording') stopRecording();
    else startRecording();
  }

  function handleSave() {
    const combined = (text + (interimText ? ' ' + interimText : '')).trim();
    if (!combined) {
      setError('אנא הכנס טקסט או הקלט הודעה');
      return;
    }
    if (recordingState === 'recording') stopRecording();

    const listNames = lists.map((l) => l.name);
    const parsed = parseShoppingText(combined, listNames);

    if (parsed.length === 0) {
      setError('לא זוהו פריטים לקניה. נסה לנסח מחדש.');
      return;
    }

    const processedItems: ProcessedItem[] = parsed.map((item) => {
      const list = lists.find(
        (l) => l.name.toLowerCase() === item.listName.toLowerCase()
      );
      const existing = list?.items.find(
        (i) => i.name.toLowerCase() === item.name.toLowerCase()
      );
      return {
        ...item,
        resolvedListId: list?.id ?? null,
        resolvedListName: list?.name ?? item.listName,
        isDuplicate: !!existing,
        existingItem: existing,
      };
    });

    setPreviewItems(processedItems);
    setError('');
  }

  async function handleConfirm(entries: ConfirmEntry[]) {
    setPreviewItems(null);
    setIsLoading(true);
    setError('');
    try {
      const { results } = await confirmItems(entries);
      const added = results.filter((r) => r.action === 'added').length;
      const increased = results.filter((r) => r.action === 'increased').length;
      const skipped = results.filter((r) => r.action === 'skipped').length;

      const parts = [];
      if (added > 0) parts.push(`${added} פריטים נוספו`);
      if (increased > 0) parts.push(`${increased} כמויות עודכנו`);
      if (skipped > 0) parts.push(`${skipped} דולגו`);

      setSuccess(parts.join(', ') + ' ✓');
      setText('');

      // Refresh lists to reflect new items
      const updated = await fetchLists();
      setLists(updated);

      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setIsLoading(false);
    }
  }

  const displayText = text + (interimText ? (text ? ' ' : '') + interimText : '');

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">מה צריך לקנות?</h2>
          <p className="text-slate-500">כתוב או הקלט — אני אדאג לארגן</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-6">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={displayText}
                onChange={(e) => {
                  if (recordingState !== 'recording') setText(e.target.value);
                }}
                readOnly={recordingState === 'recording'}
                placeholder={
                  recordingState === 'recording'
                    ? '🎙 מקשיב...'
                    : 'לדוגמה: "תביא חיתולים מהפארם, מוצרלה מהסופר ומברשת שיניים"'
                }
                rows={5}
                className={`w-full resize-none text-slate-800 text-base leading-relaxed placeholder:text-slate-300 outline-none transition-all ${
                  recordingState === 'recording' ? 'bg-red-50' : 'bg-slate-50'
                } rounded-2xl p-4 border-2 ${
                  recordingState === 'recording'
                    ? 'border-red-300 focus:border-red-400'
                    : 'border-slate-200 focus:border-indigo-300'
                }`}
              />
              {recordingState === 'recording' && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-600 font-medium">הקלטה</span>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium fade-in">
                {success}
              </div>
            )}
          </div>

          <div className="px-6 pb-6 flex gap-3">
            {hasSpeechRecognition && (
              <button
                onClick={toggleRecording}
                disabled={isLoading}
                className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-medium transition-all active:scale-95 border-2 ${
                  recordingState === 'recording'
                    ? 'bg-red-500 border-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200'
                    : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
                aria-label={recordingState === 'recording' ? 'עצור הקלטה' : 'התחל הקלטה'}
              >
                {recordingState === 'recording' ? (
                  <>
                    <span className="text-xl">⏹</span>
                    <span className="hidden sm:inline">עצור</span>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🎙</span>
                    <span className="hidden sm:inline">הקלט</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isLoading || (!text.trim() && !interimText.trim())}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:bg-slate-300 text-white font-semibold text-base transition-all shadow-lg shadow-indigo-200 hover:shadow-xl disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>שומר...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>שמור</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {['סופר 🛒', 'טמבוריה 🔧', 'פארם 💊', 'מקס 🏬'].map((label) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-100 p-3 text-center text-sm font-medium text-slate-500 shadow-sm"
            >
              {label}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          ניתן לומר למשל: "חלב וביצים מהסופר, משחת שיניים מהפארם"
        </p>
      </main>

      {previewItems && (
        <ItemPreviewModal
          items={previewItems}
          lists={lists}
          onConfirm={handleConfirm}
          onCancel={() => setPreviewItems(null)}
        />
      )}
    </>
  );
}
