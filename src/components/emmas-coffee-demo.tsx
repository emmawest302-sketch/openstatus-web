import Image from 'next/image';
import Link from 'next/link';

const weeklyHours = [
  { day: 'Monday', hours: '7:00 AM–6:00 PM' },
  { day: 'Tuesday', hours: '7:00 AM–6:00 PM' },
  { day: 'Wednesday', hours: '7:00 AM–6:00 PM' },
  { day: 'Thursday', hours: '7:00 AM–6:00 PM' },
  { day: 'Friday', hours: '7:00 AM–6:00 PM' },
  { day: 'Saturday', hours: '8:00 AM–4:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
];

function DemoIcon() {
  const paths = {
    clock: 'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  };
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true">
      <path d={paths.clock} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function EmmasCoffeeDemo({ phone = false }: { phone?: boolean }) {
  const content = (
    <div className="relative min-h-full overflow-hidden bg-[#EDE9E2] text-[#1A1A18]">
      <div className="relative h-[270px]">
        <Image src="/emmas-coffee-cover.jpg" alt="Iced coffee and a pastry on the counter at the fictional Emma's Coffee" fill sizes={phone ? '390px' : '440px'} className="object-cover" priority={!phone} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-[#EDE9E2]" />
        <div className="absolute inset-x-4 bottom-5 flex items-end gap-3">
          <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[20px] border-4 border-white bg-white px-1 shadow-lg" aria-label="EMMA'S logo">
            <span className="text-center text-[13px] font-black tracking-[-0.04em] text-black">EMMA&rsquo;S</span>
          </div>
          <div className="min-w-0 pb-1">
            <p className="truncate text-[26px] font-bold leading-none tracking-[-0.03em]">Emma&rsquo;s Coffee</p>
            <p className="mt-1 truncate text-sm text-black/60">Coffee + pastries · Columbia, TN</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-8">
        <section className="rounded-[26px] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2E7D5B] text-white"><DemoIcon /></span>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[#2E7D5B]"><span className="h-2 w-2 rounded-full bg-[#2E7D5B]" /> Live status</div>
              <p className="mt-1 text-[28px] font-bold leading-none tracking-[-0.03em]">Open now</p>
              <p className="mt-1 text-sm text-black/60">Closing early at 4:00 PM</p>
            </div>
          </div>
          <div className="mt-4 rounded-[18px] bg-[#FBF0DC] px-4 py-3">
            <p className="font-medium text-[#8A5A11]">Closing early today</p>
            <p className="text-sm text-[#9A7434]">Updated by Emma&rsquo;s Coffee 8 minutes ago</p>
          </div>
        </section>

        <details open className="overflow-hidden rounded-[22px] border border-white/70 bg-white/75 backdrop-blur-xl">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between px-4">
            <span className="flex items-center gap-3"><span className="text-[#2E7D5B]"><DemoIcon /></span><span className="font-medium">Today &amp; weekly hours</span></span>
            <span className="text-right text-sm text-black/50"><span className="block">7:00 AM–4:00 PM</span><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A7434]">Changed today</span></span>
          </summary>
          <div className="border-t border-black/10 px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black/40">Usual hours</p>
            <ul className="space-y-1.5">
              {weeklyHours.map((row) => (
                <li key={row.day} className="flex justify-between text-sm text-black/60">
                  <span>{row.day}</span><span>{row.hours}</span>
                </li>
              ))}
            </ul>
          </div>
        </details>

        <p className="pt-2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-black/35">Fictional business demo · Powered by OpenStatus</p>
      </div>
    </div>
  );

  if (!phone) {
    return (
      <main className="min-h-screen bg-[#111] px-0 py-0 sm:px-5 sm:py-8">
        <div className="mx-auto min-h-screen w-full max-w-[440px] overflow-hidden bg-[#EDE9E2] sm:min-h-0 sm:rounded-[32px] sm:border-2 sm:border-white/30">{content}</div>
      </main>
    );
  }

  return (
    <div className="relative mx-auto w-full max-w-[390px] rounded-[54px] border-[10px] border-black bg-black p-1 shadow-[18px_24px_0_rgba(0,0,0,0.2)]">
      <div className="pointer-events-none absolute left-1/2 top-3 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />
      <div className="max-h-[720px] overflow-y-auto rounded-[40px] bg-[#EDE9E2] [scrollbar-width:none]">{content}</div>
      <Link href="/emmas-coffee" className="absolute inset-x-14 bottom-4 z-30 rounded-full border border-white/20 bg-black/85 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.12em] text-white backdrop-blur-md hover:bg-[#A7E348] hover:text-black">
        Open full demo ↗
      </Link>
    </div>
  );
}
