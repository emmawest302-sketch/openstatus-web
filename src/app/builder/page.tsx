'use client';

import Link from 'next/link';
import { useState } from 'react';

const initialBlocks=[
 {id:'order',title:'Order',sub:'Pickup available',icon:'↗',on:true,tone:'dark'},
 {id:'menu',title:'Menu',sub:'See today’s menu',icon:'☰',on:true,tone:'light'},
 {id:'map',title:'Directions',sub:'Open maps',icon:'⌖',on:true,tone:'map'},
 {id:'book',title:'Book',sub:'Appointments',icon:'＋',on:true,tone:'glass'},
 {id:'website',title:'Website',sub:'Visit full website',icon:'↗',on:true,tone:'light'},
];

type Block=typeof initialBlocks[number];

function Mark(){return <svg viewBox="0 0 100 100" width="27" height="27"><circle cx="50" cy="50" r="48"/><circle cx="50" cy="50" r="21" fill="#F7F7F3"/><circle cx="50" cy="44" r="7.4"/><path d="M45.2 50.2h9.6l2.2 16.3H43z"/></svg>}

export default function BuilderPage(){
 const[blocks,setBlocks]=useState(initialBlocks);const[bg,setBg]=useState('warm');const[socials,setSocials]=useState(['Instagram','Facebook']);
 const move=(i:number,d:number)=>{const j=i+d;if(j<0||j>=blocks.length)return;const n=[...blocks];[n[i],n[j]]=[n[j],n[i]];setBlocks(n)};
 const toggle=(id:string)=>setBlocks(blocks.map(b=>b.id===id?{...b,on:!b.on}:b));
 const addSocial=()=>{const next=['TikTok','YouTube','LinkedIn','Pinterest'].find(s=>!socials.includes(s));if(next)setSocials([...socials,next])};
 return <main className="min-h-screen bg-[#F5F3ED] text-[#101010]" style={{fontFamily:'var(--font-poppins)'}}>
  <header className="sticky top-0 z-30 border-b border-black/8 bg-[#F5F3ED]/85 backdrop-blur-2xl"><div className="mx-auto flex w-[min(96%,1440px)] items-center justify-between py-4"><Link href="/" className="flex items-center gap-2 font-bold tracking-[-.04em]"><Mark/>OpenStatus</Link><div className="flex items-center gap-2"><Link href="/dashboard" className="rounded-full px-4 py-2.5 text-xs font-semibold">Dashboard</Link><button className="rounded-full bg-black px-5 py-3 text-xs font-bold text-white">Publish changes</button></div></div></header>
  <div className="mx-auto grid w-[min(96%,1440px)] gap-5 py-5 lg:grid-cols-[240px_minmax(420px,1fr)_420px]">
   <aside className="rounded-[28px] border border-black/8 bg-white/65 p-4"><span className="text-[9px] font-bold tracking-[.14em] text-black/35">PAGE BUILDER</span><nav className="mt-4 space-y-1">{['Page','Status','Socials','Analytics','Settings'].map((x,i)=><button key={x} className={`flex w-full items-center justify-between rounded-[16px] px-3 py-3 text-left text-sm font-semibold ${i===0?'bg-black text-white':'hover:bg-black/5'}`}><span>{x}</span><span className="opacity-40">›</span></button>)}</nav><div className="mt-8 rounded-[20px] bg-[#CBD9FF]/45 p-4"><strong className="text-sm">Your link</strong><span className="mt-1 block text-xs text-black/45">openstatus.co/yourbusiness</span><button className="mt-3 text-xs font-bold">Copy link</button></div></aside>

   <section className="rounded-[30px] border border-black/8 bg-white/55 p-5 md:p-7"><div className="flex items-end justify-between"><div><span className="text-[9px] font-bold tracking-[.14em] text-black/35">YOUR PAGE</span><h1 className="mt-2 text-4xl font-semibold tracking-[-.055em]">Build the front door.</h1></div><button className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold">＋ Add block</button></div>
    <div className="mt-7 rounded-[24px] bg-[#F5F3ED] p-4"><div className="flex items-center justify-between"><div><strong className="text-sm">Background</strong><span className="mt-1 block text-xs text-black/40">Photo, color or soft gradient</span></div><div className="flex gap-1">{['warm','blue','lime','dark'].map(x=><button key={x} onClick={()=>setBg(x)} className={`h-8 w-8 rounded-full border-2 ${bg===x?'border-black':'border-white'} ${x==='warm'?'bg-[#E8D5BF]':x==='blue'?'bg-[#CBD9FF]':x==='lime'?'bg-[#C8FF62]':'bg-[#222]'}`} aria-label={x}/>)}</div></div></div>
    <div className="mt-4 space-y-2">{blocks.map((b,i)=><div key={b.id} className={`flex items-center gap-3 rounded-[20px] border border-black/8 bg-white p-3 ${!b.on?'opacity-45':''}`}><span className="cursor-grab text-black/25">⋮⋮</span><div className={`grid h-12 w-12 place-items-center rounded-[14px] ${b.tone==='dark'?'bg-black text-white':b.tone==='map'?'bg-[#DCE5D0]':'bg-[#F2EFE8]'}`}>{b.icon}</div><div className="min-w-0 flex-1"><strong className="block text-sm">{b.title}</strong><span className="block truncate text-xs text-black/40">{b.sub}</span></div><div className="flex gap-1"><button onClick={()=>move(i,-1)} className="h-8 w-8 rounded-full bg-black/5 text-xs">↑</button><button onClick={()=>move(i,1)} className="h-8 w-8 rounded-full bg-black/5 text-xs">↓</button><button onClick={()=>toggle(b.id)} className={`h-8 rounded-full px-3 text-[9px] font-bold ${b.on?'bg-[#C8FF62]/65':'bg-black/5'}`}>{b.on?'ON':'OFF'}</button></div></div>)}</div>
    <div className="mt-7 border-t border-black/8 pt-6"><div className="flex items-center justify-between"><div><strong className="text-sm">Social icons</strong><span className="mt-1 block text-xs text-black/40">Add links without extra integrations.</span></div><button onClick={addSocial} className="rounded-full bg-black/5 px-3 py-2 text-xs font-bold">＋ Add</button></div><div className="mt-3 flex flex-wrap gap-2">{socials.map(s=><span key={s} className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold">{s} ×</span>)}</div></div>
   </section>

   <aside className="rounded-[30px] bg-[#E8E4DA] p-5"><div className="mb-3 flex justify-between text-[9px] font-bold tracking-[.13em] text-black/35"><span>LIVE PREVIEW</span><span>Mobile</span></div><div className={`mx-auto max-w-[360px] overflow-hidden rounded-[42px] border-[8px] border-black shadow-[0_28px_70px_rgba(0,0,0,.22)] ${bg==='warm'?'bg-[#E8D5BF]':bg==='blue'?'bg-[#CBD9FF]':bg==='lime'?'bg-[#DFFFA8]':'bg-[#333] text-white'}`}><div className="relative h-52 bg-gradient-to-br from-[#D1A171] via-[#8B6B4E] to-[#46533C]"><div className="absolute inset-0 bg-black/25"/><div className="absolute inset-x-5 bottom-5 text-white"><div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-white text-[10px] font-extrabold text-[#263829]">BH</div><strong className="block text-2xl tracking-[-.05em]">Breakfast Haus</strong><span className="text-[11px] text-white/70">Franklin, Tennessee</span></div></div><div className="p-3"><div className="rounded-[22px] bg-white/85 p-4 text-black backdrop-blur-xl"><span className="text-[8px] font-bold tracking-[.13em] text-[#3F7C55]">● LIVE STATUS</span><strong className="mt-2 block text-2xl tracking-[-.05em]">Open now</strong><span className="text-[10px] text-black/45">Closes at 3:00 PM</span></div><div className="mt-2 grid grid-cols-2 gap-2">{blocks.filter(b=>b.on).map(b=><div key={b.id} className={`${b.id==='map'?'col-span-2 min-h-28 bg-[#DCE5D0]':'min-h-20'} flex flex-col justify-between rounded-[18px] ${b.tone==='dark'?'bg-black text-white':'bg-white/85 text-black'} p-3`}><span className="text-[8px] opacity-45">{b.id==='map'?'MAP':'BLOCK'}</span><div className="flex justify-between text-[11px] font-bold"><span>{b.title}</span><span>{b.icon}</span></div></div>)}</div><div className="mt-3 flex justify-center gap-3 pb-2 text-[9px]">{socials.map(s=><span key={s}>{s.slice(0,2)}</span>)}</div></div></div></aside>
  </div>
 </main>
}
