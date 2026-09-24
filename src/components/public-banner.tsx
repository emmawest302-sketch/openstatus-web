/**
 * The owner's own words, above everything.
 *
 * Hours answer "can I go there now". They cannot say "snow day, delivery
 * only", "closed for a family wedding, back Tuesday", or "kitchen's down but
 * the bar is open" — and those are the days a customer most needs telling.
 *
 * It sits above the cover rather than inside the page so it cannot be missed
 * or scrolled past, and it is plain text on a plain band: a notice that looks
 * designed reads as marketing, and marketing is the thing people skip.
 */

export default function PublicBanner({ text }: { text?: string | null }) {
  const message = text?.trim();
  if (!message) return null;

  return (
    <div
      role="status"
      style={{
        // Full viewport width even inside the page's centred column, so on a
        // desktop it reads as a notice about the shop rather than a card.
        width: '100vw', marginLeft: 'calc(50% - 50vw)',
        background: '#1B1B1F',
        color: '#FFFFFF',
        padding: 'clamp(9px, 2.8cqw, 12px) clamp(14px, 4.4cqw, 20px)',
        paddingTop: 'max(clamp(9px, 2.8cqw, 12px), env(safe-area-inset-top))',
        position: 'relative', zIndex: 3,
      }}
    >
      <p style={{
        margin: '0 auto', maxWidth: 560, textAlign: 'center',
        fontSize: 'clamp(12.5px, 3.5cqw, 14px)', lineHeight: 1.4,
        fontWeight: 550, letterSpacing: '-0.01em',
      }}>
        {message}
      </p>
    </div>
  );
}
