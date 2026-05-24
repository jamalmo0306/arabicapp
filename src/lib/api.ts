import Anthropic from '@anthropic-ai/sdk';

import type { CheckInAnswers, FlashCard, PhraseOfDay } from '@/context/types';
const MODEL = 'claude-sonnet-4-6';

function makeClient(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

async function callClaude(apiKey: string, prompt: string): Promise<string> {
  const message = await makeClient(apiKey).messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}

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
      const text = await callClaude(apiKey, prompt);
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
      const text = await callClaude(apiKey, prompt);
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

export async function generateCheckInResponse(answers: CheckInAnswers, apiKey: string): Promise<string> {
  const prompt = `You are an encouraging Palestinian Arabic language coach. A heritage speaker just completed their weekly check-in. Here is their data:

- Minutes studied this week: ${answers.minutes}
- Pillars completed: ${answers.pillars}
- Anki cards reviewed: ${answers.anki_count}
- New sentence they can say: ${answers.new_sentence}
- What felt boring: ${answers.boring_thing}
- Tutor session happened: ${answers.tutor_happened ? 'Yes' : 'No'}

Write exactly 2 sentences of warm, specific encouragement based on their actual data. Then write exactly 1 concrete suggestion for next week. No generic advice. Speak directly to them. Keep the whole response under 60 words.`;

  return callClaude(apiKey, prompt);
}
