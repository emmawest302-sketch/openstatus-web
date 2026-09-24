import Link from 'next/link';

/**
 * The frame for the two legal pages.
 *
 * These were linked from the homepage footer and did not exist — every visitor
 * who tapped Terms or Privacy got a 404, which for a product asking small
 * businesses to connect their Google account is not a good look.
 *
 * The text below is a plain-English starting point, not legal advice, and it
 * says so. Replace it with something a lawyer has read.
 */
export default function LegalShell({ title, updated, children }: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main style={{ minHeight: '100dvh', background: '#F7F7F5', padding: '0 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 0 80px' }}>
        <Link href="/" style={{
          fontSize: 13, fontWeight: 650, color: '#0A0A0A', textDecoration: 'none',
        }}>
          ← OpenStatus
        </Link>

        <h1 style={{
          fontSize: 34, fontWeight: 800, letterSpacing: '-0.035em',
          color: '#0A0A0A', margin: '28px 0 6px', lineHeight: 1.1,
        }}>
          {title}
        </h1>
        <p style={{ fontSize: 13, color: '#9A9A97', margin: 0 }}>Last updated {updated}</p>

        <div style={{ marginTop: 28, fontSize: 15, lineHeight: 1.65, color: '#3F3F3F' }}>
          {children}
        </div>

        <p style={{
          marginTop: 40, padding: '14px 16px', borderRadius: 14,
          background: '#FFFBEB', border: '1px solid #FDE68A',
          fontSize: 13, lineHeight: 1.5, color: '#92400E',
        }}>
          This is a plain-English summary written to be honest and readable. It is
          not legal advice and has not been reviewed by a lawyer. Questions:{' '}
          <a href="mailto:info@openstatus.co" style={{ color: '#92400E' }}>info@openstatus.co</a>.
        </p>
      </div>
    </main>
  );
}

export const H = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 17, fontWeight: 750, color: '#0A0A0A', margin: '28px 0 8px', letterSpacing: '-0.02em' }}>
    {children}
  </h2>
);

export const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: '0 0 12px' }}>{children}</p>
);
