const surfaces = [
  ['Your Instagram bio', 'One link that never needs changing'],
  ['Your own website', 'A live status block above your hours'],
  ['Your status page', 'Shareable, QR-able, always current'],
  ['Your regulars', 'A text when something actually changes'],
];


const freeFeatures = [
  ['Your own status page', 'openstatus.co/yourbusiness'],
  ['Connect Instagram', 'We watch your posts for what matters'],
  ['Unlimited automatic updates', 'Closing early, closed today, opening late'],
  ['Automatic expiry', 'Back to normal on its own, every time'],
  ['Regular hours', 'Always shown, always current'],
  ['Quick links', 'Menu, order, directions, reserve and more'],
  ['Website embed', 'The same live status on your own site'],
  ['Manual override', 'Set or correct anything yourself'],
];


const proFeatures = [
  ['Who is checking', 'How many people, and when'],
  ['What they tapped', 'Directions, menu, order, website'],
  ['Change performance', 'How many people saw a closure notice'],
  ['Trends over time', 'Busiest days, busiest hours'],
  ['SMS alerts', 'Text your opted-in customers when things change'],
  ['Subscriber list', 'See and manage who has opted in'],
  ['More customisation', 'Match the page to your brand'],
];


function Keyhole({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="kh">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
