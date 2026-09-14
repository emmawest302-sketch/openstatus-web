import Link from 'next/link';

const cards = [
  { title: 'Order now', sub: 'Pickup available', badge: 'Square', style: 'from-[#D5A56F] to-[#714A34] text-white' },
  { title: 'View menu', sub: 'Breakfast + lunch', badge: 'Menu', style: 'from-[#E9D39A] to-[#718052] text-[#182015]' },
  { title: 'Join waitlist', sub: 'About 15 min', badge: 'Waitlist', style: 'from-[#2B2B2B] to-[#111111] text-white' },
  { title: 'Catering', sub: 'Office + events', badge: 'Website', style: 'from-[#DDA174] to-[#6A774A] text-white' },
  { title: 'Gift cards', sub: 'Send breakfast', badge: 'Shop', style: 'from-[#F0D77C] to-[#D3B24C] text-[#201D11]' },
];

function Arrow() { return <span aria-hidden="true">↗</span>; }

function MapBlock() {
  return (
    <a href="https://www.google.com/maps/search/?api=1&query=Franklin%2C%20Tennessee" target="_blank" rel="noreferrer" className="relative col-span-2 min-h-[190px] overflow-hidden rounded-[24px] bg-[#E7E2D7] text-[#1A1A18]">
      <div className="absolute inset-0 opacity-90" style={{ backgroundImage: 'linear-gradient(28deg, transparent 45%, rgba(255,255,255,.95) 46%, rgba(255,255,255,.95) 51%, transparent 52%), linear-gradient(108deg, transparent 36%, rgba(255,255,255,.82) 37%, rgba(255,255,255,.82) 42%, transparent 43%), linear-gradient(165deg, transparent 55%, rgba(255,255,255,.7) 56%, rgba(255,255,255,.7) 60%, transparent 61%)' }} />
      <div className="absolute left-[18%] top-[28%] h-16 w-24 rounded-full bg-[#CAD9B8]/75 blur-[1px]" />
      <div className="absolute bottom-[12%] right-[9%] h-20 w-28 rounded-full bg-[#C8D8B4]/65" />
      <div className="absolute left-[58%] top-[42%] h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#263829] shadow-[0_8px_22px_rgba(0,0,0,.25)]">
        <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      </div>
      <div className="absolute inset-x-3 bottom-3 flex items-end justify-between rounded-[18px] border border-white/70 bg-white/88 p-4 shadow-lg backdrop-blur-xl">
        <div><span className="text-[8px] font-bold uppercase tracking-[0.14em] text-black/40">Directions</span><strong className="mt-1 block text-[17px] tracking-[-0.04em]">Breakfast Haus</strong><span className="mt-0.5 block text-[10px] text-black/50">Franklin, Tennessee</span></div>
        <span className="rounded-full bg-[#171717] px-3 py-2 text-[9px] font-bold text-white">Open maps ↗</span>
      </div>
    </a>
  );
}

export default function BreakfastHausPage() {
  return (
    <main className="min-h-screen bg-[#DDD8CE] py-0 text-[#181818] md:py-10" style={{ fontFamily: 'var(--font-poppins)' }}>
      <div className="mx-auto min-h-screen w-full max-w-[470px] overflow-hidden bg-[#F6F2E9] shadow-[0_30px_100px_rgba(0,0,0,0.16)] md:min-h-0 md:rounded-[42px]">
        <section className="relative flex h-[410px] flex-col justify-between overflow-hidden px-5 py-5 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,#efd5a1_0_9%,transparent_24%),radial-gradient(circle_at_65%_42%,#c57b4f_0_10%,transparent_28%),radial-gradient(circle_at_72%_70%,#6c7d51_0_12%,transparent_30%),linear-gradient(145deg,#6e412f,#d0a06e_38%,#31402f)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/15 to-black/60" />
          <div className="relative z-10 flex items-center justify-between"><div className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-xs font-extrabold text-[#263829] shadow-lg">BH</div><button className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-white/15 text-lg backdrop-blur-xl" aria-label="More options">•••</button></div>
          <div className="relative z-10 pb-5"><p className="text-[10px] font-bold tracking-[0.18em] text-white/70">BREAKFAST · BRUNCH · COFFEE</p><h1 className="mt-2 text-[44px] font-bold leading-[0.95] tracking-[-0.06em]">Breakfast Haus</h1><p className="mt-3 max-w-[330px] text-[14px] leading-6 text-white/80">Bright mornings, strong coffee, really good breakfast.</p></div>
        </section>

        <section className="relative z-20 mx-3.5 -mt-7 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.12)] backdrop-blur-2xl" aria-label="Live business status">
          <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-[9px] font-bold tracking-[0.16em] text-[#3D7150]"><span className="h-2 w-2 rounded-full bg-[#55B979] shadow-[0_0_0_4px_rgba(85,185,121,0.13)]" /> LIVE STATUS</p><h2 className="mt-2 text-[31px] font-bold tracking-[-0.05em]">Open now</h2><p className="mt-1 text-[13px] text-black/55">Closes at 3:00 PM</p></div><span className="rounded-full border border-black/10 px-2.5 py-1.5 text-[8px] font-bold tracking-[0.12em]">LIVE</span></div>
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#F1ECE3] px-3 py-2 text-[10px] font-medium">Breakfast served all day</span><span className="rounded-full bg-[#F1ECE3] px-3 py-2 text-[10px] font-medium">Pickup available</span></div>
        </section>

        <section className="grid grid-cols-2 gap-2 px-3.5 pt-3" id="links"><a className="flex min-h-14 items-center justify-between rounded-[18px] bg-[#171717] px-4 text-[12px] font-bold text-white" href="#menu"><span>Order breakfast</span><Arrow /></a><a className="flex min-h-14 items-center justify-between rounded-[18px] bg-white px-4 text-[12px] font-bold" href="#menu"><span>See today&apos;s menu</span><Arrow /></a></section>

        <section className="grid grid-cols-2 gap-2.5 px-3.5 pt-2.5">
          {cards.slice(0,2).map((card) => <a key={card.title} href="#footer" className={`flex min-h-[166px] flex-col justify-between rounded-[24px] bg-gradient-to-br p-3.5 ${card.style}`}><span className="w-fit rounded-full bg-white/75 px-2.5 py-1.5 text-[8px] font-bold text-black">{card.badge}</span><div className="flex items-end justify-between gap-3"><div><strong className="block text-[18px] font-bold tracking-[-0.04em]">{card.title}</strong><span className="mt-1 block text-[9px] opacity-65">{card.sub}</span></div><Arrow /></div></a>)}
          <MapBlock />
          {cards.slice(2).map((card) => <a key={card.title} href="#footer" className={`flex min-h-[166px] flex-col justify-between rounded-[24px] bg-gradient-to-br p-3.5 ${card.style}`}><span className="w-fit rounded-full bg-white/75 px-2.5 py-1.5 text-[8px] font-bold text-black">{card.badge}</span><div className="flex items-end justify-between gap-3"><div><strong className="block text-[18px] font-bold tracking-[-0.04em]">{card.title}</strong><span className="mt-1 block text-[9px] opacity-65">{card.sub}</span></div><Arrow /></div></a>)}
        </section>

        <section className="mx-3.5 mt-2.5 rounded-[26px] bg-white p-5" id="menu"><div className="flex items-center justify-between text-[9px] text-black/45"><span className="font-bold tracking-[0.12em]">TODAY&apos;S MENU</span><span>Updated this morning</span></div>{[['Haus Breakfast','eggs, crispy potatoes, sourdough','$15'],['Lemon Ricotta Pancakes','berries, whipped ricotta, maple','$14'],['Breakfast Sandwich','egg, cheddar, bacon, brioche','$11']].map(([name,desc,price]) => <div key={name} className="flex items-start justify-between border-b border-black/8 py-4"><div><strong className="block text-[13px]">{name}</strong><span className="mt-1 block text-[10px] text-black/45">{desc}</span></div><b className="text-[12px]">{price}</b></div>)}<a className="mt-4 flex items-center justify-between text-[11px] font-bold" href="#footer">View full menu <Arrow /></a></section>
        <a className="mx-3.5 mt-2.5 flex items-center justify-between rounded-[22px] bg-[#263829] px-5 py-4 text-white" href="#footer"><div><span className="block text-[8px] font-bold tracking-[0.14em] text-white/50">OUR FULL WEBSITE</span><strong className="mt-1 block text-[13px]">Visit breakfasthaus.com</strong></div><Arrow /></a>
        <footer className="px-5 pb-8 pt-8" id="footer"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#263829] text-[10px] font-extrabold text-white">BH</span><div><strong className="block text-[13px]">Breakfast Haus</strong><span className="block text-[10px] text-black/45">Franklin, Tennessee</span></div></div><div className="mt-5 flex gap-4 text-[10px] text-black/50"><span>Instagram</span><span>Call</span><span>Website</span></div><Link href="/" className="mt-7 block text-center text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35">Powered by OpenStatus</Link></footer>
      </div>
    </main>
  );
}
