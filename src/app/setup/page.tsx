'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { normaliseHandle, suggestHandle } from '@/lib/handles';

const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
type Row={open:string;close:string;closed:boolean}; type HandleState='idle'|'checking'|'free'|'taken';
const DEFAULT_ROWS:Row[]=DAYS.map((_,i)=>({open:'09:00',close:'17:00',closed:i===0}));
function Mark(){return <svg width="28" height="28" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#050505"/><circle cx="50" cy="50" r="21" fill="#F7F7F3"/><circle cx="50" cy="44" r="7.4" fill="#050505"/><path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#050505"/></svg>}
function pretty(v:string){const[h,m]=v.split(':');let n=Number(h);const mer=n>=12?'PM':'AM';n=n%12||12;return `${n}:${m} ${mer}`}

export default function SetupPage(){
 const router=useRouter();
 const [step,setStep]=useState(1);
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [businessId,setBusinessId]=useState<string|null>(null);
 const [name,setName]=useState('');
 const [tagline,setTagline]=useState('');
 const [handle,setHandle]=useState('');
 const [initialHandle,setInitialHandle]=useState('');
 const [handleTouched,setHandleTouched]=useState(false);
 const [handleState,setHandleState]=useState<HandleState>('idle');
 const [handleReason,setHandleReason]=useState('');
 const [rows,setRows]=useState<Row[]>(DEFAULT_ROWS);
 const [avatarUrl,setAvatarUrl]=useState('');
 const [headerUrl,setHeaderUrl]=useState('');
 const [uploading,setUploading]=useState<'avatar'|'header'|null>(null);
 const [igHandle,setIgHandle]=useState<string|null>(null);
 const [isFromMeta,setIsFromMeta]=useState(false);

 useEffect(()=>{const q=new URLSearchParams(window.location.search);const s=Number(q.get('step'));if(s>=1&&s<=4)setStep(s);if(q.get('connect')==='ok'){setStep(4);setIgHandle(q.get('handle'))}if(q.get('connect')==='error'||q.get('connect')==='no_instagram'){setStep(4);setError(q.get('reason')||'Meta could not be connected.')}},[]);

 const load=useCallback(async()=>{const{data:u}=await supabase.auth.getUser();if(!u.user){router.replace('/login');return}const fromMeta=u.user.app_metadata?.provider==='facebook'||u.user.app_metadata?.providers?.includes?.('facebook');if(fromMeta)setIsFromMeta(true);const fields='id, name, tagline, slug, avatar_url, header_url, instagram_handle';const{data:existing,error:readError}=await supabase.from('businesses').select(fields).eq('user_id',u.user.id).maybeSingle();let business=existing;if(!business&&!readError){const metaName=u.user.user_metadata?.full_name||u.user.user_metadata?.name||'';const fallback=String(u.user.user_metadata?.business_name||metaName||'My business');const{data:created,error:createError}=await supabase.from('businesses').insert({user_id:u.user.id,name:fallback}).select(fields).single();if(createError){setError(createError.message);setLoading(false);return}business=created}if(readError){setError(readError.message);setLoading(false);return}if(business){setBusinessId(business.id);setName(business.name==='My business'?(u.user.user_metadata?.full_name||u.user.user_metadata?.name||''):business.name);setTagline(business.tagline??'');setAvatarUrl(business.avatar_url??'');setHeaderUrl(business.header_url??'');setIgHandle(business.instagram_handle??null);if(business.slug){setHandle(business.slug);setInitialHandle(business.slug);setHandleTouched(true);setHandleState('free')}const{data:hrs}=await supabase.from('business_hours').select('day_of_week, opens_at, closes_at, is_closed').eq('business_id',business.id);if(hrs?.length){const next=DEFAULT_ROWS.map(r=>({...r}));hrs.forEach(r=>next[r.day_of_week]={open:(r.opens_at??'09:00').slice(0,5),close:(r.closes_at??'17:00').slice(0,5),closed:r.is_closed});setRows(next)}}setLoading(false)},[router]);

 useEffect(()=>{void load()},[load]);

 // Handle validation
 useEffect(()=>{const timer=setTimeout(async()=>{const normalized=normaliseHandle(handle);if(normalized.length<3){setHandleState('idle');return}if(normalized===initialHandle){setHandleState('free');return}setHandleState('checking');try{const res=await fetch(`/api/handle?handle=${encodeURIComponent(normalized)}`);const body=await res.json();if(normaliseHandle(handle)!==body.handle)return;setHandleState(body.available?'free':'taken');setHandleReason(body.reason??'')}catch{setHandleState('idle')}},350);return()=>clearTimeout(timer)},[handle,initialHandle]);


 const saveBasics=async()=>{if(!businessId)return;setSaving(true);setError('');const chosen=normaliseHandle(handle);const{error:e}=await supabase.from('businesses').update({name:name.trim(),tagline:tagline.trim()||null,slug:chosen}).eq('id',businessId);setSaving(false);if(e){setError(e.message.includes('duplicate')?'That address was just taken. Try another.':e.message);return}setInitialHandle(chosen);setStep(2)};
 const saveHours=async()=>{if(!businessId)return;setSaving(true);const payload=rows.map((r,i)=>({business_id:businessId,day_of_week:i,opens_at:r.closed?null:r.open,closes_at:r.closed?null:r.close,is_closed:r.closed}));const{error:e}=await supabase.from('business_hours').upsert(payload,{onConflict:'business_id,day_of_week'});setSaving(false);if(e){setError(e.message);return}setStep(3)};
 const uploadImage=async(file:File,kind:'avatar'|'header')=>{setUploading(kind);setError('');try{const{data:s}=await supabase.auth.getSession();const token=s.session?.access_token;if(!token)throw new Error('Session expired. Sign in again.');const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};const prep=await fetch('/api/assets',{method:'POST',headers,body:JSON.stringify({action:'prepare',kind,contentType:file.type,size:file.size})});const p=await prep.json();if(!prep.ok)throw new Error(p.error??'Could not prepare upload');const{error:ue}=await supabase.storage.from(p.bucket).uploadToSignedUrl(p.path,p.token,file,{contentType:file.type,cacheControl:'3600'});if(ue)throw ue;const complete=await fetch('/api/assets',{method:'POST',headers,body:JSON.stringify({action:'complete',kind,path:p.path})});const c=await complete.json();if(!complete.ok)throw new Error(c.error??'Could not save image');if(kind==='avatar')setAvatarUrl(c.reference);else setHeaderUrl(c.reference)}catch(x){setError(x instanceof Error?x.message:'Upload failed')}finally{setUploading(null)}};
 const saveAppearance=async()=>{if(!businessId)return;setSaving(true);const{error:e}=await supabase.from('businesses').update({avatar_url:avatarUrl.trim()||null,header_url:headerUrl.trim()||null}).eq('id',businessId);setSaving(false);if(e){setError(e.message);return}setStep(4)};
 const connectMeta=async()=>{setSaving(true);setError('');try{const{data:s}=await supabase.auth.getSession();const token=s.session?.access_token;if(!token)throw new Error('Session expired. Sign in again.');const res=await fetch('/api/auth/meta/start',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({returnTo:'setup'})});const body=await res.json();if(!res.ok)throw new Error(body.error??'Could not connect Meta');window.location.href=body.url}catch(x){setError(x instanceof Error?x.message:'Something went wrong');setSaving(false)}};

 const clean=normaliseHandle(handle);const canContinue=Boolean(businessId&&name.trim()&&handleState==='free');
 const avatar=avatarUrl.startsWith('storage:')&&businessId?`/api/assets?businessId=${businessId}&kind=avatar`:avatarUrl;
 const header=headerUrl.startsWith('storage:')&&businessId?`/api/assets?businessId=${businessId}&kind=header`:headerUrl;
 const stepNames=['Business','Hours','Design','Connect'];
 const stepPct=Math.round((step/4)*100);
 const input='w-full rounded-[18px] border border-black/10 bg-white/85 px-4 py-3.5 text-sm outline-none focus:ring-4 focus:ring-[#E5FFB8]/50';

 if(loading)return <main className="grid min-h-screen place-items-center bg-[#F5F3ED]"><p className="text-xs font-semibold">Preparing your OpenStatus...</p></main>;

 return <main className="relative min-h-screen overflow-hidden bg-[#F5F3ED] text-[#111]" style={{fontFamily:'var(--font-poppins)'}}>
  <div className="pointer-events-none absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-[#DCE5FF] blur-[110px]"/>
  <div className="pointer-events-none absolute -right-32 top-0 h-[380px] w-[380px] rounded-full bg-[#E5FFB8] blur-[100px]"/>
  <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
    <Link href="/" className="flex items-center gap-2.5 font-bold"><Mark/>OpenStatus</Link>
    <Link href="/dashboard" className="rounded-full border border-black/10 bg-white/60 px-4 py-2 text-xs font-semibold backdrop-blur-xl">Save & exit</Link>
  </header>
  <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-5 pb-12 pt-4 lg:grid-cols-[1fr_390px]">
  <section className="rounded-[34px] border border-white/70 bg-white/58 p-5 shadow-[0_25px_80px_rgba(0,0,0,.08)] backdrop-blur-2xl sm:p-8">
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">{stepNames.map((s,i)=><button key={s} onClick={()=>i+1<step&&setStep(i+1)} className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition-all ${i+1===step?'bg-black text-white':i+1<step?'bg-black/80 text-white/70 cursor-pointer':'bg-white/60 text-black/30 cursor-default'}`}>{s}</button>)}</div>
        <span className="text-[10px] font-bold text-black/35">{stepPct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/8">
        <div className="h-full rounded-full bg-[#C8FF62] transition-all duration-500" style={{width:`${stepPct}%`}}/>
      </div>
    </div>

    {/* STEP 1: Business + Google import */}
    {step===1&&<div className="mt-10">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-black/35">Step 1 · Business</p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-.06em]">Claim your live link.</h1>
      <p className="mt-3 text-sm leading-6 text-black/50">This is your business&apos;s mobile front door. Keep your real website — OpenStatus gives social visitors the fastest answer.</p>

      <div className="mt-6 space-y-4">
        <label className="block text-xs font-semibold">
          <span className="flex items-center justify-between">Business name{isFromMeta&&name?<span className="text-[9px] font-bold text-[#1877F2]">Imported from Meta ✓</span>:null}</span>
          <input value={name} onChange={e=>{setName(e.target.value);if(!handleTouched)setHandle(suggestHandle(e.target.value))}} placeholder="Breakfast Haus" className={`${input} mt-2`}/>
        </label>
        <label className="block text-xs font-semibold">Description or location<input value={tagline} onChange={e=>setTagline(e.target.value)} placeholder="Breakfast all day · Franklin, TN" className={`${input} mt-2`}/></label>
        <label className="block text-xs font-semibold">Your OpenStatus link
          <div className="mt-2 flex items-center rounded-[18px] border border-black/10 bg-white/85 px-4">
            <span className="text-sm text-black/35">openstatus.co/</span>
            <input value={handle} onChange={e=>{setHandleTouched(true);setHandle(e.target.value)}} className="min-w-0 flex-1 bg-transparent py-3.5 text-sm outline-none"/>
            <span className={`text-[9px] font-bold uppercase ${handleState==='free'?'text-green-700':handleState==='taken'?'text-red-600':'text-black/30'}`}>{handleState==='checking'?'Checking':handleState==='free'?'Available':handleState==='taken'?handleReason||'Taken':''}</span>
          </div>
        </label>
      </div>
      <button onClick={saveBasics} disabled={saving||!canContinue} className="mt-7 flex w-full justify-between rounded-full bg-black px-6 py-4 text-sm font-bold text-white disabled:opacity-30">Continue to hours <span>→</span></button>
    </div>}

    {/* STEP 2: Hours */}
    {step===2&&<div className="mt-10">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-black/35">Step 2 · Hours</p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-.06em]">Set the normal week.</h1>
      <p className="mt-3 text-sm text-black/50">These power your live open/closed status. You can override them anytime for holidays or specials.</p>
      <div className="mt-7 space-y-2">{DAYS.map((d,i)=><div key={d} className="flex items-center gap-3 rounded-[18px] bg-white/80 p-3"><span className="w-10 text-[10px] font-bold">{d.slice(0,3)}</span>{rows[i].closed?<span className="flex-1 text-xs text-black/35">Closed</span>:<><input type="time" value={rows[i].open} onChange={e=>{const n=[...rows];n[i]={...n[i],open:e.target.value};setRows(n)}} className="min-w-0 flex-1 rounded-xl border border-black/10 p-2 text-xs"/><span>–</span><input type="time" value={rows[i].close} onChange={e=>{const n=[...rows];n[i]={...n[i],close:e.target.value};setRows(n)}} className="min-w-0 flex-1 rounded-xl border border-black/10 p-2 text-xs"/></>}<button onClick={()=>{const n=[...rows];n[i]={...n[i],closed:!n[i].closed};setRows(n)}} className="rounded-full border border-black/10 px-3 py-2 text-[9px] font-bold">{rows[i].closed?'Open':'Close'}</button></div>)}</div>
      <button onClick={saveHours} disabled={saving} className="mt-7 flex w-full justify-between rounded-full bg-black px-6 py-4 text-sm font-bold text-white">Save hours <span>→</span></button>
    </div>}

    {/* STEP 3: Design */}
    {step===3&&<div className="mt-10">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-black/35">Step 3 · Design</p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-.06em]">Make it feel like you.</h1>
      <p className="mt-3 text-sm text-black/50">Start with your logo and a strong cover photo. You&apos;ll customize blocks, colors and layout in the builder next.</p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">{(['avatar','header'] as const).map(kind=><label key={kind} className="cursor-pointer rounded-[24px] border border-black/10 bg-white/80 p-4"><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{const f=e.target.files?.[0];if(f)void uploadImage(f,kind);e.target.value=''}}/><span className="text-xs font-bold">{kind==='avatar'?'Logo / profile':'Cover photo'}</span><div className={`mt-4 overflow-hidden bg-[#EEE9DF] ${kind==='avatar'?'h-20 w-20 rounded-full':'h-24 w-full rounded-[18px]'}`}>{(kind==='avatar'?avatar:header)?<img src={kind==='avatar'?avatar:header} className="h-full w-full object-cover" alt=""/>:<div className="grid h-full place-items-center text-[10px] text-black/35">Choose image</div>}</div><span className="mt-3 block text-[10px] text-black/40">{uploading===kind?'Uploading...':'JPG, PNG or WebP'}</span></label>)}</div>
      <button onClick={saveAppearance} disabled={saving||Boolean(uploading)} className="mt-7 flex w-full justify-between rounded-full bg-black px-6 py-4 text-sm font-bold text-white">Continue <span>→</span></button>
    </div>}

    {/* STEP 4: Connect */}
    {step===4&&<div className="mt-10">
      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-black/35">Step 4 · Connect</p>
      <h1 className="mt-3 text-5xl font-semibold tracking-[-.06em]">Connect what you use.</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-black/50">Meta lets us pull in your Instagram presence. Other socials can be added as simple links in your builder.</p>
      <div className="mt-7 rounded-[24px] bg-white/80 p-5"><div className="flex items-center justify-between gap-4"><div><strong className="text-sm">Meta</strong><p className="mt-1 text-xs text-black/40">Connect your eligible Instagram/Facebook business presence.</p></div>{igHandle?<span className="rounded-full bg-[#E5FFB8] px-3 py-2 text-[9px] font-bold">@{igHandle} CONNECTED</span>:<button onClick={connectMeta} disabled={saving} className="rounded-full bg-black px-4 py-2.5 text-xs font-bold text-white">{saving?'Opening Meta...':'Connect Meta'}</button>}</div></div>
      <div className="mt-3 rounded-[24px] bg-[#DCE5FF] p-5"><strong className="text-sm">Other socials</strong><p className="mt-1 text-xs leading-5 text-black/50">Add the links you want displayed as icons. You can toggle and reorder them in the builder.</p></div>
      <button onClick={()=>router.push('/builder')} className="mt-7 flex w-full justify-between rounded-full bg-black px-6 py-4 text-sm font-bold text-white">Open my page builder <span>→</span></button>
    </div>}

    {error&&<p className="mt-5 rounded-[18px] bg-[#F8AE9D]/60 p-4 text-sm">{error}</p>}
  </section>

  <aside className="hidden lg:block">
    <div className="sticky top-6 rounded-[34px] bg-[#111] p-3 shadow-2xl">
      <div className="overflow-hidden rounded-[28px] bg-[#F6F2E9]">
        <div className="relative h-64 bg-gradient-to-br from-[#C89C6B] to-[#33402F]">
          {header&&<img src={header} className="absolute inset-0 h-full w-full object-cover" alt=""/>}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/70"/>
          <div className="absolute bottom-5 left-5 text-white">
            {avatar?<img src={avatar} className="mb-3 h-12 w-12 rounded-full border border-white/50 object-cover" alt=""/>:<div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-white text-black"><Mark/></div>}
            <h2 className="text-3xl font-bold tracking-[-.05em]">{name||'Your business'}</h2>
            <p className="mt-1 text-xs text-white/65">{tagline||'Your description or location'}</p>
          </div>
        </div>
        <div className="p-4">
          <div className="rounded-[22px] bg-white p-4 shadow-sm">
            <span className="text-[9px] font-bold text-green-700">● LIVE STATUS</span>
            <strong className="mt-2 block text-2xl">{rows[new Date().getDay()]?.closed?'Closed today':'Open today'}</strong>
            {!rows[new Date().getDay()]?.closed&&<span className="text-xs text-black/45">{pretty(rows[new Date().getDay()].open)} – {pretty(rows[new Date().getDay()].close)}</span>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-[20px] bg-black p-4 text-white"><span className="text-xs font-bold">Order ↗</span></div>
            <div className="rounded-[20px] bg-white p-4"><span className="text-xs font-bold">Menu ☰</span></div>
          </div>
        </div>
      </div>
    </div>
    <p className="mt-3 text-center text-[10px] text-black/35">openstatus.co/{clean||'yourbusiness'}</p>
  </aside>
  </div>
 </main>;
}
