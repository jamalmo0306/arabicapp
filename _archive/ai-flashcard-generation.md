# AI Flashcard Generation — Archived

Removed in favour of the manual JSON import flow. Preserved here for reuse in other projects.

## api.ts additions

```ts
const HAIKU  = 'claude-haiku-4-5-20251001';
const SONNET = 'claude-sonnet-4-6';

export async function generateFlashcards(topic: string, apiKey: string): Promise<FlashCard[]> {
  const prompt = `You are a Palestinian Arabic language tutor. Generate 10 phrase chunks for a heritage speaker learning conversational Palestinian/Levantine Arabic.

Topic: ${topic}

For each phrase return a JSON object with these four fields:
- arabic_script: the phrase in Arabic script
- transliteration: romanized Palestinian pronunciation
- english_meaning: natural English translation
- example_situation: one sentence describing when a real person would say this

Rules:
- Focus on phrases a real person says in daily life, not textbook sentences
- Palestinian/Levantine dialect only — not MSA
- Keep phrases 2–6 words, not full paragraphs
- Return a JSON array only. No preamble, no markdown, no explanation.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const text = await callClaude(apiKey, prompt, HAIKU);
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const cards = JSON.parse(cleaned) as FlashCard[];
      if (!Array.isArray(cards) || cards.length === 0) throw new Error('Empty array');
      return cards;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  throw new Error('Failed to generate flashcards');
}

export async function generatePhraseOfDay(apiKey: string): Promise<PhraseOfDay> {
  const prompt = `You are a Palestinian Arabic language tutor. Generate one short phrase a Palestinian person says in daily life.

Return a JSON object with exactly these three fields:
- arabic_script: the phrase in Arabic script
- transliteration: romanized Palestinian pronunciation
- english_meaning: natural English translation

Palestinian/Levantine dialect only. Keep it 2–5 words. Return JSON only, no markdown, no explanation.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const text = await callClaude(apiKey, prompt, HAIKU);
      const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
      const phrase = JSON.parse(cleaned) as PhraseOfDay;
      if (!phrase.arabic_script) throw new Error('Invalid phrase');
      return phrase;
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
  throw new Error('Failed to generate phrase of the day');
}
```

## app-context.tsx — generateBatch + triggerWeeklyGeneration

```ts
// State:
const [generatingBatch, setGeneratingBatch] = useState(false);
const [newBatchReady, setNewBatchReady] = useState(false);

// In loadState(), after loading cards:
const key = effectiveApiKey(s.api_key);
const needsGeneration =
  key &&
  cards.length === 0 &&
  (!s.last_batch_date || s.last_batch_date < currentWeekStart);
if (needsGeneration) generateBatch(s.current_week, key);

async function generateBatch(weekNumber: number, apiKey: string) {
  setGeneratingBatch(true);
  try {
    const { generateFlashcards } = await import('@/lib/api');
    const fallbackTopic = (weekNumber === 11 || weekNumber === 12)
      ? await getMostUnknownTopic()
      : null;
    const topic = getTopicForWeek(weekNumber, fallbackTopic);
    const cards = await generateFlashcards(topic, apiKey);
    await insertArchiveCards(weekNumber, topic, cards);
    await updateSettings({ last_batch_date: toDateString() });
    const stored = await getArchiveCardsForWeek(weekNumber);
    const toSet: FlashcardArchiveEntry[] = stored.length > 0
      ? stored
      : cards.map((c, i) => ({
          id: i + 1, week_number: weekNumber, topic, ...c,
          status: 'unknown' as const, created_at: new Date().toISOString(),
        }));
    setCurrentWeekCards(toSet);
    setSettings(prev => ({ ...prev, last_batch_date: toDateString() }));
    setNewBatchReady(true);
  } catch (e) {
    console.error('Weekly batch generation failed:', e);
    await updateSettings({ last_batch_date: null });
  } finally {
    setGeneratingBatch(false);
  }
}

const triggerWeeklyGeneration = useCallback(async () => {
  const s = await getSettings();
  const key = effectiveApiKey(s.api_key);
  if (!key) return;
  const cards = await getArchiveCardsForWeek(s.current_week);
  if (cards.length > 0) { setCurrentWeekCards(cards); return; }
  await generateBatch(s.current_week, key);
}, []);

const dismissNewBatch = useCallback(() => setNewBatchReady(false), []);
```

## Topic rotation (FLASHCARD_TOPICS)

Weeks 1–10 use a fixed topic array from `src/data/flashcard-topics.ts`.
Weeks 11–12 use the topic with the most `status='unknown'` cards (`getMostUnknownTopic()`).

```ts
function getTopicForWeek(weekNumber: number, fallbackTopic: string | null): string {
  const idx = ((weekNumber - 1) % 10);
  if ((weekNumber === 11 || weekNumber === 12) && fallbackTopic) return fallbackTopic;
  return FLASHCARD_TOPICS[idx] as string;
}
```
