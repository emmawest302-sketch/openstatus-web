'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import SocialLinksEditor from '@/components/social-links-editor';
import {
  defaultOpenStatusBlocks,
  normalizeOpenStatusPageConfig,
  type OpenStatusBlock,
  type OpenStatusPageConfig,
  type OpenStatusSocial,
} from '@/lib/openstatus-page-config';

type Business={id:string;name:string;tagline:string|null;slug:string|null;avatar_url:string|null;header_url:string|null};
type BlockTemplate={id:string;title:string;sub:string;icon:string;tone:string};

const BLOCK_LIBRARY:BlockTemplate[]=[
 {id:'call',title:'Call',sub:'Tap to call us',icon:'☎',tone:'light'},
 {id:'gift-cards',title:'Gift Cards',sub:'Buy a gift card',icon:'◇',tone:'glass'},
 {id:'catering',title:'Catering',sub:'Catering & large orders',icon:'↗',tone:'light'},
 {id:'shop',title:'Shop',sub:'Shop online',icon:'↗',tone:'dark'},
 {id:'events',title:'Events',sub:'See upcoming events',icon:'◫',tone:'light'},
 {id:'careers',title:'Careers',sub:'Join our team',icon:'＋',tone:'glass'},
 {id:'email',title:'Email',sub:'Send us a message',icon:'✉',tone:'light'},
 {id:'custom',title:'Custom Link',sub:'Anything your customers need',icon:'↗',tone:'light'},
];

const placeholders:Record<string,string>={order:'squareup.com/store/your-business',menu:'yourbusiness.com/menu',map:'123 Main St, Franklin, TN',book:'calendly.com/your-business',website:'yourbusiness.com',call:'tel:+16155551234',email:'mailto:hello@yourbusiness.com'};
const socialMark=(label:string)=>({Instagram:'IG',Facebook:'f',TikTok:'♪',YouTube:'▶',LinkedIn:'in',Pinterest:'P',X:'X',Threads:'@'} as Record<string,string>)[label]||label.slice(0,2);

function Mark(){return <svg viewBox="0 0 100 100" width="27" height="27" aria-hidden="true"><circle cx="50" cy="50" r="48"/><circle cx="50" cy="50" r="21" fill="#F7F7F3"/><circle cx="50" cy="44" r="7.4"/><path d="M45.2 50.2h9.6l2.2 16.3H43z"/></svg>}

export default function BuilderClient(){
 const router=useRouter();
 const[business,setBusiness]=useState<Business|null>(null);
 const[blocks,setBlocks]=useState<OpenStatusBlock[]>(defaultOpenStatusBlocks);
 const[bg,setBg]=useState('warm');
 const[socials,setSocials]=useState<OpenStatusSocial[]>([]);
 const[loading,setLoading]=useState(true);
 const[saving,setSaving]=useState(false);
 const[saved,setSaved]=useState(false);
 const[error,setError]=useState('');
 const[showLibrary,setShowLibrary]=useState(false);

 useEffect(()=>{void(async()=>{
  const{data:userData}=await supabase.auth.getUser();
  if(!userData.user){router.replace('/login');return}
  const config=normalizeOpenStatusPageConfig(userData.user.user_metadata?.openstatus_page);
  setBlocks(config.blocks);setBg(config.bg);setSocials(config.socials);
  const{data:b}=await supabase.from('businesses').select('id,name,tagline,slug,avatar_url,header_url').eq('user_id',userData.user.id).maybeSingle();
  if(!b){router.replace('/setup');return}
  setBusiness(b);setLoading(false);
 })()},[router]);

 const dirty=()=>setSaved(false);
 const move=(i:number,d:number)=>{const j=i+d;if(j<0||j>=blocks.length)return;const next=[...blocks];[next[i],next[j]]=[next[j],next[i]];setBlocks(next);dirty()};
 const toggle=(id:string)=>{setBlocks(v=>v.map(b=>b.id===id?{...b,on:!b.on}:b));dirty()};
 const edit=(id:string,key:'title'|'sub'|'url',value:string)=>{setBlocks(v=>v.map(b=>b.id===id?{...b,[key]:value}:b));dirty()};
 const remove=(id:string)=>{setBlocks(v=>v.filter(b=>b.id!==id));dirty()};
 const addBlock=(template:BlockTemplate)=>{let id=template.id;let n=2;while(blocks.some(b=>b.id===id))id=`${template.id}-${n++}`;setBlocks([...blocks,{...template,id,on:true,url:''}]);setShowLibrary(false);dirty()};
 const changeSocials=(next:OpenStatusSocial[])=>{setSocials(next);dirty()};
 const save=async()=>{setSaving(true);setError('');const config:OpenStatusPageConfig={blocks,bg,socials};const{error:e}=await supabase.auth.updateUser({data:{openstatus_page:config}});setSaving(false);if(e){setError(e.message);return}setSaved(true)};

 const logo=business?.avatar_url?.startsWith('storage:')?`/api/assets?businessId=${business.id}&kind=avatar`:business?.avatar_url||'';
 const cover=business?.header_url?.startsWith('storage:')?`/api/assets?businessId=${business.id}&kind=header`:business?.header_url||'';
 if(loading)return <main className="grid min-h-screen place-items-center bg-[#F5F3ED]" style={{fontFamily:'var(--font-poppins)'}}>Loading your page builder…</main>;

 return <main className="min-h-screen bg-[#F5F3ED] text-[#101010]" style={{fontFamily:'var(--font-poppins)'}}>
  <header className="sticky top-0 z-30 border-b border-black/8 bg-[#F5F3ED]/85 backdrop-blur-2xl"><div className="mx-auto flex w-[min(96%,1440px)] items-center justify-between py-4"><Link href="/" className="flex items-center gap-2 font-bold tracking-[-.04em]"><Mark/>OpenStatus</Link><div className="flex items-center gap-2">{business?.slug?<Link href={`/${business.slug}`} target="_blank" className="rounded-full px-4 py-2.5 text-xs font-semibold">View live ↗</Link>:null}<Link href="/dashboard" className="rounded-full px-4 py-2.5 text-xs font-semibold">Dashboard</Link><button onClick={save} disabled={saving} className="rounded-full bg-black px-5 py-3 text-xs font-bold text-white disabled:opacity-40">{saving?'Publishing…':saved?'Published ✓':'Publish changes'}</button></div></div></header>
  <div className="mx-auto grid w-[min(96%,1440px)] gap-5 py-5 lg:grid-cols-[240px_minmax(420px,1fr)_420px]">
   <aside className="rounded-[28px] border border-black/8 bg-white/65 p-4"><span className="text-[9px] font-bold tracking-[.14em] text-black/35">PAGE BUILDER</span><nav className="mt-4 space-y-1">{['Page','Status','Socials','Analytics','Settings'].map((x,i)=><button key={x} className={`flex w-full items-center justify-between rounded-[16px] px-3 py-3 text-left text-sm font-semibold ${i===0?'bg-black text-white':'hover:bg-black/5'}`}><span>{x}</span><span className="opacity-40">›</span></button>)}</nav><div className="mt-8 rounded-[20px] bg-[#CBD9FF]/45 p-4"><strong className="text-sm">Your link</strong><span className="mt-1 block break-all text-xs text-black/45">openstatus.co/{business?.slug||'yourbusiness'}</span></div></aside>

   <section className="rounded-[30px] border border-black/8 bg-white/55 p-5 md:p-7"><div className="flex items-end justify-between gap-4"><div><span className="text-[9px] font-bold tracking-[.14em] text-black/35">{business?.name?.toUpperCase()}</span><h1 className="mt-2 text-4xl font-semibold tracking-[-.055em]">Build the front door.</h1><p className="mt-2 text-xs text-black/40">Everything here publishes directly to your customer-facing page.</p></div><button onClick={()=>setShowLibrary(true)} className="shrink-0 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-bold shadow-sm">＋ Add block</button></div>
    <div className="mt-7 rounded-[24px] bg-[#F5F3ED] p-4"><div className="flex items-center justify-between"><div><strong className="text-sm">Background</strong><span className="mt-1 block text-xs text-black/40">Choose the page mood</span></div><div className="flex gap-1">{['warm','blue','lime','dark'].map(x=><button key={x} onClick={()=>{setBg(x);dirty()}} className={`h-8 w-8 rounded-full border-2 ${bg===x?'border-black':'border-white'} ${x==='warm'?'bg-[#E8D5BF]':x==='blue'?'bg-[#CBD9FF]':x==='lime'?'bg-[#C8FF62]':'bg-[#222]'}`} aria-label={x}/>)}</div></div></div>
    <div className="mt-4 space-y-3">{blocks.map((b,i)=><div key={b.id} className={`rounded-[22px] border border-black/8 bg-white p-4 ${!b.on?'opacity-50':''}`}><div className="flex items-center gap-3"><span className="text-black/25">⋮⋮</span><div className={`grid h-11 w-11 place-items-center rounded-[14px] ${b.tone==='dark'?'bg-black text-white':b.tone==='map'?'bg-[#DCE5D0]':'bg-[#F2EFE8]'}`}>{b.icon}</div><div className="flex-1"><strong className="text-sm">{b.title}</strong><span className="ml-2 text-[9px] uppercase text-black/30">{b.id}</span></div><button onClick={()=>move(i,-1)} className="h-8 w-8 rounded-full bg-black/5 text-xs">↑</button><button onClick={()=>move(i,1)} className="h-8 w-8 rounded-full bg-black/5 text-xs">↓</button><button onClick={()=>toggle(b.id)} className={`h-8 rounded-full px-3 text-[9px] font-bold ${b.on?'bg-[#C8FF62]/65':'bg-black/5'}`}>{b.on?'ON':'OFF'}</button><button onClick={()=>remove(b.id)} className="h-8 w-8 rounded-full bg-black/5 text-xs">×</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={b.title} onChange={e=>edit(b.id,'title',e.target.value)} className="rounded-[14px] bg-[#F5F3ED] px-3 py-2.5 text-xs outline-none"/><input value={b.sub} onChange={e=>edit(b.id,'sub',e.target.value)} className="rounded-[14px] bg-[#F5F3ED] px-3 py-2.5 text-xs outline-none"/></div><label className="mt-2 block"><span className="mb-1 block text-[9px] font-bold uppercase tracking-[.1em] text-black/30">{b.id==='map'?'Business address':'Destination URL'}</span><input value={b.url||''} onChange={e=>edit(b.id,'url',e.target.value)} placeholder={placeholders[b.id]||'https://...'} className="w-full rounded-[14px] border border-black/8 bg-white px-3 py-3 text-xs outline-none focus:ring-4 focus:ring-[#CBD9FF]/40"/></label></div>)}</div>
    <SocialLinksEditor socials={socials} onChange={changeSocials}/>
    {error?<p className="mt-5 rounded-[16px] bg-[#F8AE9D]/65 p-4 text-sm">{error}</p>:null}
   </section>

   <aside className="rounded-[30px] bg-[#E8E4DA] p-5"><div className="mb-3 flex justify-between text-[9px] font-bold tracking-[.13em] text-black/35"><span>LIVE PREVIEW</span><span>Mobile</span></div><div className={`mx-auto max-w-[360px] overflow-hidden rounded-[42px] border-[8px] border-black shadow-[0_28px_70px_rgba(0,0,0,.22)] ${bg==='warm'?'bg-[#E8D5BF]':bg==='blue'?'bg-[#CBD9FF]':bg==='lime'?'bg-[#DFFFA8]':'bg-[#333] text-white'}`}><div className="relative h-52 bg-gradient-to-br from-[#D1A171] via-[#8B6B4E] to-[#46533C]">{cover?<img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover"/>:null}<div className="absolute inset-0 bg-black/30"/><div className="absolute inset-x-5 bottom-5 text-white">{logo?<img src={logo} alt="" className="mb-3 h-11 w-11 rounded-full bg-white object-cover"/>:<div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-white text-[10px] font-extrabold text-[#263829]">{business?.name?.slice(0,2).toUpperCase()}</div>}<strong className="block text-2xl tracking-[-.05em]">{business?.name}</strong><span className="text-[11px] text-white/70">{business?.tagline||'Your location or tagline'}</span></div></div><div className="p-3"><div className="rounded-[22px] bg-white/85 p-4 text-black backdrop-blur-xl"><span className="text-[8px] font-bold tracking-[.13em] text-[#3F7C55]">● LIVE STATUS</span><strong className="mt-2 block text-2xl tracking-[-.05em]">Open now</strong><span className="text-[10px] text-black/45">Live from your hours</span></div><div className="mt-2 grid grid-cols-2 gap-2">{blocks.filter(b=>b.on).map(b=><div key={b.id} className={`${b.id==='map'?'col-span-2 min-h-28 bg-[#DCE5D0]':'min-h-20'} flex flex-col justify-between rounded-[18px] ${b.tone==='dark'?'bg-black text-white':'bg-white/85 text-black'} p-3`}><span className="text-[8px] opacity-45">{b.url?'LINKED':'NEEDS LINK'}</span><div className="flex justify-between text-[11px] font-bold"><span>{b.title}</span><span>{b.icon}</span></div></div>)}</div><div className="mt-3 flex justify-center gap-2 pb-2">{socials.filter(s=>s.on&&s.url.trim()).map(s=><span key={s.id} className="grid h-7 min-w-7 place-items-center rounded-full bg-white/80 px-2 text-[8px] font-bold text-black">{socialMark(s.label)}</span>)}</div></div></div></aside>
  </div>

  {showLibrary?<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm sm:items-center" onMouseDown={()=>setShowLibrary(false)}><div className="w-full max-w-2xl rounded-[32px] border border-white/70 bg-[#F7F5EF]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,.25)] backdrop-blur-2xl" onMouseDown={e=>e.stopPropagation()}><div className="flex items-start justify-between"><div><span className="text-[9px] font-bold uppercase tracking-[.14em] text-black/35">BLOCK LIBRARY</span><h2 className="mt-2 text-3xl font-semibold tracking-[-.05em]">What should customers be able to do?</h2></div><button onClick={()=>setShowLibrary(false)} className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-lg">×</button></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{BLOCK_LIBRARY.map(item=><button key={item.id} onClick={()=>addBlock(item)} className="flex items-center gap-3 rounded-[22px] border border-black/8 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${item.tone==='dark'?'bg-black text-white':'bg-[#EEEAE2]'}`}>{item.icon}</span><span><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs text-black/40">{item.sub}</span></span><span className="ml-auto text-black/25">＋</span></button>)}</div></div></div>:null}
 </main>;
}
