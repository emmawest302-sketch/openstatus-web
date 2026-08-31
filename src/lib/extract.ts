import Anthropic from '@anthropic-ai/sdk';

// The whole product in one question. Everything below serves it.
const THE_QUESTION =
  "Could this information materially affect someone's decision to visit this business today?";

export type Extraction = {
  matters: boolean;
  kind:
    | 'hours_change'
    | 'closed'
    | 'sold_out'
    | 'location'
    | 'service_unavailable'
    | 'access'
    | 'other'
    | 'none';
  headline: string | null;
  detail: string | null;
  reason: string | null;
  closes_at: string | null;
  effective_date: string | null;
  expires_at: string | null;
  confidence: number;
  why: string;
};

const SYSTEM = [
  "You decide what a local business's customers cannot afford to miss.",
  '',
  'For every caption, ask exactly one question:',
  '"' + THE_QUESTION + '"',
  '',
  'If the answer is no, return matters: false. Be picky. Most posts do not',
  'matter. Saying nothing is much better than surfacing something trivial,',
  'because every false positive trains customers to ignore the page.',
  '',
  'THINGS THAT MATTER',
  '- closing early, opening late, closed today, unusual hours',
  '- sold out of something customers come for',
  '- location change (food trucks, pop-ups, markets)',
  '- cancelled event or class',
  '- weather affecting the visit',
  '- private event or buyout',
  '- a service unavailable (kitchen closed, no wifi, card reader down, cash only)',
  '- entrance, parking or access changed',
  '- reservations or walk-ins changed',
  '- temporary outage of anything customers rely on',
  '',
  'THINGS THAT DO NOT MATTER',
  '- staff photos and introductions',
  '- new merch, product photography',
  '- motivational quotes, "Happy Sunday"',
  '- giveaways and competitions',
  '- ordinary marketing posts and reels',
  '- a new menu item, unless it replaces something',
  '- anything about an event that has already happened',
  '',
  'RULES',
  '- Never invent a time, item or place that is not in the caption.',
  '- If the caption is about a future day rather than today, set effective_date',
  '  to that date and expires_at to the end of that day.',
  '- If you cannot tell when something stops being true, set expires_at to the',
  '  end of today. A stale notice is worse than none.',
  '- Sarcasm, jokes and hypotheticals do not matter. If a caption reads as a',
  '  joke, return matters: false.',
  '- headline: at most 5 words, sentence case, plain language read at a glance.',
  '  Not "Status: modified hours" but "Closing early today".',
  '- detail: the specific fact. The time, the item, the place. One short line.',
  '- reason: only if the caption gives one. Weather, staffing, repairs.',
  '- confidence: your certainty this both matters and is parsed correctly.',
  '  Below 0.75 it is held for human review instead of published.',
  '',
  'Reply with JSON only. No prose, no markdown fences.',
  '',
  '{"matters": boolean, "kind": string, "headline": string|null,',
  ' "detail": string|null, "reason": string|null, "closes_at": "HH:MM"|null,',
  ' "effective_date": "YYYY-MM-DD"|null,',
  ' "expires_at": "YYYY-MM-DDTHH:MM:SSZ"|null,',
  ' "confidence": number, "why": string}',
].join('\n');

const EMPTY: Extraction = {
  matters: false,
  kind: 'none',
  headline: null,
  detail: null,
  reason: null,
  closes_at: null,
  effective_date: null,
  expires_at: null,
  confidence: 0,
  why: 'empty caption',
};

function endOfDay(d: Date): Date {
  const end = new Date(d);
  end.setUTCHours(23, 59, 59, 0);
  return end;
}

export const AUTO_PUBLISH_THRESHOLD = 0.75;

export async function extractFromCaption(opts: {
  caption: string;
  postedAt: string;
  businessName: string;
  timezone: string;
}): Promise<Extraction> {
  const caption = (opts.caption ?? '').trim();
  if (!caption) return EMPTY;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Missing ANTHROPIC_API_KEY');

  const client = new Anthropic({ apiKey: key });
  const posted = new Date(opts.postedAt);

  const context = [
    'Business: ' + opts.businessName,
    'Timezone: ' + opts.timezone,
    'Posted at: ' + posted.toISOString(),
    'Today is: ' + posted.toISOString().slice(0, 10),
    '',
    'Caption:',
    caption,
  ].join('\n');

  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: SYSTEM,
    messages: [{ role: 'user', content: context }],
  });

  const text = res.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('')
    .replace(/```json|```/g, '')
    .trim();

  let parsed: Partial<Extraction>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ...EMPTY, why: 'could not parse model output' };
  }

  if (!parsed.matters) {
    return {
      ...EMPTY,
      why: typeof parsed.why === 'string' ? parsed.why : 'not customer relevant',
    };
  }

  // Safety rail: if the model says something matters but gives no expiry,
  // close it off at the end of the day it was posted.
  let expires = parsed.expires_at ? new Date(parsed.expires_at) : null;
  if (!expires || Number.isNaN(expires.getTime())) {
    expires = endOfDay(posted);
  }
  const ceiling = new Date(posted.getTime() + 7 * 86400000);
  if (expires > ceiling) expires = ceiling;

  return {
    matters: true,
    kind: (parsed.kind as Extraction['kind']) ?? 'other',
    headline: parsed.headline ?? null,
    detail: parsed.detail ?? null,
    reason: parsed.reason ?? null,
    closes_at: parsed.closes_at ?? null,
    effective_date: parsed.effective_date ?? null,
    expires_at: expires.toISOString(),
    confidence:
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0,
    why: typeof parsed.why === 'string' ? parsed.why : '',
  };
}
