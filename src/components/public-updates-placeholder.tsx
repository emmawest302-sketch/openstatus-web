/**
 * What the builder preview shows in place of the Instagram updates row.
 *
 * The real row reads cached posts from the database on the server, so it
 * cannot render inside the client-side preview. Showing nothing there would
 * be worse than this: the owner switches Updates on, sees no change, and
 * concludes the feature is broken.
 */
export default function PublicUpdatesPlaceholder({ dark = false }: { dark?: boolean }) {
  const ink = dark ? 'rgba(255,255,255,0.88)' : '#0A0A0A';
  const muted = dark ? 'rgba(255,255,255,0.55)' : 'rgba(21,21,21,0.48)';
  return (
    <div style={{
      borderRadius: 20,
      background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.82)',
      border: dark ? '1px dashed rgba(255,255,255,0.22)' : '1px dashed rgba(10,10,10,0.14)',
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 13,
    }}>
      <span style={{
        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
        display: 'grid', placeItems: 'center', color: muted,
        background: dark ? 'rgba(255,255,255,0.09)' : 'rgba(10,10,10,0.04)',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5"/>
          <circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>
        </svg>
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: ink, letterSpacing: '-0.02em' }}>
          Latest updates
        </span>
        <span style={{ display: 'block', fontSize: 12.5, color: muted, marginTop: 2 }}>
          Your recent Instagram posts appear here on the live page
        </span>
      </span>
    </div>
  );
}
