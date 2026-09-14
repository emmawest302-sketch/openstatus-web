'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

function Mark() {
  return <svg width="30" height="30" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#050505"/><circle cx="50" cy="50" r="21" fill="#F7F7F3"/><circle cx="50" cy="44" r="7.4" fill="#050505"/><path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#050505"/></svg>;
}

const steps = [
  ['01', 'Business', 'Name, description and your OpenStatus link.'],
  ['02', 'Hours', 'Set the regular week that powers your live status.'],
  ['03', 'Design', 'Add your logo, photography and brand direction.'],
  ['04', 'Connect', 'Connect Meta and add the social links you use.'],
];

export default function NewSetupEntry() {
  const router = useRouter();
  return <main className="relative min-h-screen overflow-hidden bg-[#F5F3ED] px-5 py-6 text-[#111]" style={{fontFamily:'var(--font-poppins)'}}>
    <div className="pointer-events-none absolute -left-40 top-20 h-[430px] w-[430px] rounded-full bg-[#DCE5FF] blur-[100px]" />
    <div className="pointer-events-none absolute -right-32 top-[-90px] h-[390px] w-[390px] rounded-full bg-[#E5FFB8] blur-[100px]" />
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between"><Link href="/" className="flex items-center gap-2.5 text-lg font-bold"><Mark/>OpenStatus</Link><span className="rounded-full border border-black/10 bg-white/55 px-4 py-2 text-[10px] font-semibold uppercase tracking-[.14em] backdrop-blur-xl">Setup</span></header>
    <section className="relative z-10 mx-auto grid min-h-[calc(100vh-90px)] max-w-6xl items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr]">
      <div><span className="inline-flex rounded-full border border-black/10 bg-white/60 px-4 py-2 text-[10px] font-bold tracking-[.15em] backdrop-blur-xl">YOUR BUSINESS. RIGHT NOW.</span><h1 className="mt-7 max-w-[680px] text-[clamp(3.2rem,7vw,6.6rem)] font-semibold leading-[.88] tracking-[-.075em]">Build your<br/><span className="text-black/35">mobile front door.</span></h1><p className="mt-7 max-w-xl text-[17px] leading-7 text-black/55">A live, branded page with the hours, actions, directions and links customers actually need. We’ll get the basics in place first, then you can make every block yours.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={()=>router.push('/setup?step=1')} className="rounded-full bg-black px-6 py-3.5 text-sm font-semibold text-white shadow-xl">Start with your business →</button><Link href="/builder" className="rounded-full border border-black/10 bg-white/65 px-6 py-3.5 text-sm font-semibold backdrop-blur-xl">Go to builder</Link></div></div>
      <div className="rounded-[36px] border border-white/70 bg-white/58 p-4 shadow-[0_30px_100px_rgba(0,0,0,.10)] backdrop-blur-2xl"><div className="rounded-[30px] bg-[#111] p-6 text-white"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/45">Four quick steps</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.05em]">Get live, then refine.</h2></div><div className="space-y-2 p-2 pt-4">{steps.map(([number,title,copy])=><div key={number} className="grid grid-cols-[44px_1fr] gap-3 rounded-[24px] border border-black/[.06] bg-white/72 p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#E5FFB8] text-[10px] font-bold">{number}</span><div><strong className="text-[16px] tracking-[-.02em]">{title}</strong><p className="mt-1 text-[12px] leading-5 text-black/45">{copy}</p></div></div>)}</div><div className="mx-2 mb-2 mt-3 rounded-[24px] bg-[#DCE5FF] p-5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-black/40">Then</p><strong className="mt-1 block text-xl tracking-[-.04em]">Design your page visually.</strong><p className="mt-1 text-xs leading-5 text-black/50">Reorder blocks, choose what shows, add socials and publish when it feels like your business.</p></div></div>
    </section>
  </main>;
}
