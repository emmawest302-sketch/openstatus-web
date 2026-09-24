/**
 * Who is looking, and therefore whether this visit counts.
 *
 * The bug this exists to kill: the decision used to be made inside an async
 * effect, while click handlers were already live. So a tap that happened
 * before `getSession()` resolved was recorded, and the page view — which
 * happened after — was suppressed. An owner opening her own page and tapping
 * around produced the exact reading she saw: 7 actions, 0 views. Numbers that
 * cannot both be true are worse than no numbers.
 *
 * So the audience is decided ONCE and every event waits for that decision.
 * Events emitted before it lands are queued, then either sent or dropped as a
 * set. Nothing is half-counted.
 *
 * Pure and framework-free so the race itself can be tested, which is the only
 * way to be sure a fix for a timing bug is a fix.
 */

export type Audience =
  /** Not decided yet. Events queue. */
  | 'pending'
  /** A customer. Everything counts. */
  | 'visitor'
  /** The owner, a preview, or the builder. Nothing counts. */
  | 'excluded';

export type QueuedEvent = { eventType: string; blockId?: string | null };

/**
 * A queue with a ceiling.
 *
 * Unbounded, a page whose audience never resolves — a hung auth call, an
 * offline device — would grow this forever while the visitor kept tapping.
 * Twenty is far more than any real session emits before the first paint
 * settles, and dropping the overflow is better than a leak.
 */
export const MAX_QUEUED = 20;

export class AudienceGate {
  private audience: Audience = 'pending';
  private queue: QueuedEvent[] = [];

  constructor(private readonly send: (e: QueuedEvent) => void) {}

  get state(): Audience { return this.audience; }
  get queued(): number { return this.queue.length; }

  /**
   * Record an event, or hold it until we know who is looking.
   * Returns what happened, which is what the tests assert on.
   */
  emit(event: QueuedEvent): 'sent' | 'queued' | 'dropped' {
    if (this.audience === 'excluded') return 'dropped';
    if (this.audience === 'visitor') { this.send(event); return 'sent'; }
    if (this.queue.length >= MAX_QUEUED) return 'dropped';
    this.queue.push(event);
    return 'queued';
  }

  /** Decide, once. Everything held either goes out together or is thrown away. */
  resolve(audience: Exclude<Audience, 'pending'>): void {
    this.audience = audience;
    const held = this.queue;
    this.queue = [];
    if (audience === 'visitor') for (const e of held) this.send(e);
  }

  /**
   * Back to undecided — for a client-side navigation to another page, which
   * has its own audience. Without this, a decision made on the owner's own
   * page silently muted the next page they navigated to.
   */
  reset(): void {
    this.audience = 'pending';
    this.queue = [];
  }
}
