import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabaseAdmin';
import OwnerQuickStatus from '@/components/owner-quick-status';
import PublishedBusinessBlocks from '@/components/published-business-blocks';
import PublicSocialLinks from '@/components/public-social-links';
import AnalyticsTracker from '@/components/analytics-tracker';
import { loadPublishedPageConfig } from '@/lib/published-page-config';

export const dynamic = 'force-dynamic';
const DAY_NAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
type Hours={day_of_week:number;opens_at:string|null;closes_at:string|null;is_closed:boolean};
type Update={kind:string;headline:string;detail:string|null;reason:string|null;closes_at:string|null;created_at:string;source:string|null};
function pretty(t:string|null){if(!t)return '';const[h,m]=t.split(':');let n=parseInt(h,10);const mer=n>=12?'PM':'AM';if(n===0)n=12;else if(n>12)n-=12;return `${n}:${m} ${mer}`}
function mins(t:string|null){if(!t)return null;const[h,m]=t.split(':');return parseInt(h,10)*60+parseInt(m,10)}
function rowLabel(r:Hours|undefined){return !r?'-':r.is_closed?'Closed':`${pretty(r.opens_at)} - ${pretty(r.closes_at)}`}
function Icon({name}:{name:string}){const p:Record<string,string>={clock:'M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',cup:'M4 8h13v5a5 5 0 01-5 5H9a5 5 0 01-5-5V8zM17 9h2a2 2 0 010 4h-2'};return <svg viewBox="0 0 24 24" width="24" height="24" fill="none"><path d={p[name]??p.clock} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>}

export default async function LiveStatus({params}:{params:Promise<{slug:string}>}){
 const{slug}=await params;
 const admin=getAdminClient();
 const{data:business}=await admin.from('businesses').select('id,user_id,name,tagline,avatar_url,header_url,timezone').eq('slug',slug.toLowerCase()).maybeSingle();
 if(!business)notFound();
 const[{data:hoursRows},{data:updateRows},pageConfig]=await Promise.all([
  admin.from('business_hours').select('day_of_week,opens_at,closes_at,is_closed').eq('business_id',business.id),
  admin.from('status_updates').select('kind,headline,detail,reason,closes_at,created_at,source').eq('business_id',business.id).eq('status','active').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(4),
  loadPublishedPageConfig(business.user_id),
 ]);
 const hours:Hours[]=hoursRows??[];
 const updates:Update[]=updateRows??[];
 const avatar=typeof business.avatar_url==='string'&&business.avatar_url.startsWith('storage:')?`/api/assets?businessId=${business.id}&kind=avatar`:business.avatar_url;
 const background=typeof business.header_url==='string'&&business.header_url.startsWith('storage:')?`/api/assets?businessId=${business.id}&kind=header`:business.header_url;
 const timezone=business.timezone||'America/Chicago';
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const weekday=parts.find(p=>p.type==='weekday')?.value??'Sun';
 const today=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(weekday);
 const todayRow=hours.find(h=>h.day_of_week===today)??null;
 const nowMins=Number(parts.find(p=>p.type==='hour')?.value??0)*60+Number(parts.find(p=>p.type==='minute')?.value??0);
 const lead=updates[0]??null;
 const effectiveClose=updates.find(u=>u.closes_at)?.closes_at??todayRow?.closes_at??null;
 const closedAllDay=!todayRow||todayRow.is_closed||updates.some(u=>u.kind==='closed');
 const openMins=mins(todayRow?.opens_at??null);
 const closeMins=mins(effectiveClose);
 const isOpen=!closedAllDay&&openMins!==null&&closeMins!==null&&nowMins>=openMins&&nowMins<closeMins;
 const changed=Boolean(lead)&&!closedAllDay;
 const dot=closedAllDay?'#C4453F':changed?'#E0921B':'#2E7D5B';
 let big='Closed now',sub='Back tomorrow',accent='';
 if(closedAllDay){big='Closed today';sub=lead?.detail??'Back tomorrow'}
 else if(isOpen){big='Open now';sub='Closes at ';accent=pretty(effectiveClose)}
 else if(openMins!==null&&nowMins<openMins){big='Opens later';sub='Opens at ';accent=pretty(todayRow?.opens_at??null)}
 const bg=pageConfig.bg==='blue'?'#E9EEF5':pageConfig.bg==='lime'?'#E7F7C8':pageConfig.bg==='dark'?'#181817':'#EDE9E2';
 const glass='rounded-[26px] bg-white/75 backdrop-blur-xl border border-white/70';
 const initials=business.name.split(/\s+/).filter(Boolean).slice(0,2).map((part:string)=>part[0]).join('').toUpperCase();
 const tags=pageConfig.tags??[];
 return <div className="min-h-screen flex justify-center" style={{background:bg,fontFamily:'var(--font-poppins)'}}>
  <AnalyticsTracker businessId={business.id}/>
  <div className="relative w-full max-w-[440px] min-h-screen overflow-hidden" style={background?{backgroundImage:`url(${background})`,backgroundSize:'cover',backgroundPosition:'center',backgroundRepeat:'no-repeat'}:{background:bg}}>
   <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/40"/>
   <div className="relative px-4 pb-10">
    <div className="pt-20 text-center text-white">
     {avatar?<img src={avatar} alt={`${business.name} logo`} className="mx-auto h-[96px] w-[96px] rounded-full border border-white/60 bg-white object-cover p-1.5 shadow-[0_14px_40px_rgba(0,0,0,.28)]"/>:<div className="mx-auto grid h-[96px] w-[96px] place-items-center rounded-full border border-white/60 bg-white text-xl font-bold text-black shadow-[0_14px_40px_rgba(0,0,0,.28)]">{initials}</div>}
     <h1 className="mt-4 text-[32px] font-bold tracking-[-.05em] drop-shadow">{business.name}</h1>
     {pageConfig.location&&<p className="mt-1 text-sm font-medium text-white/90">{pageConfig.location}</p>}
     {business.tagline&&<p className="mx-auto mt-2 max-w-[320px] text-sm leading-5 text-white/75">{business.tagline}</p>}
     {tags.length>0&&<div className="mt-3 flex flex-wrap justify-center gap-1.5">{tags.map(tag=><span key={tag} className="rounded-full border border-white/25 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-md">{tag}</span>)}</div>}
    </div>
    <div className={`mt-6 p-4 ${glass}`}><div className="flex items-center gap-4"><span className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-full bg-[#2E7D5B] text-white"><Icon name="cup"/></span><div><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{background:dot}}/><span className="text-[10px] font-bold uppercase tracking-[.16em]" style={{color:dot}}>Live status</span></div><p className="mt-1 text-[30px] font-bold leading-none tracking-[-.04em] text-[#1A1A18]">{big}</p><p className="mt-2 text-sm text-[#5C5952]">{sub}{accent&&<strong style={{color:dot}}>{accent}</strong>}</p></div></div>{lead&&<div className="mt-4 rounded-[18px] bg-[#FBF0DC] p-3 text-sm text-[#805619]"><strong>{lead.headline}</strong>{lead.detail&&<p className="mt-1 opacity-75">{lead.detail}</p>}</div>}</div>
    <PublishedBusinessBlocks businessId={business.id} businessName={business.name} location={pageConfig.location||business.tagline||business.name} config={pageConfig}/>
    <details className={`mt-3 overflow-hidden ${glass}`}><summary className="cursor-pointer list-none px-5 py-4 text-[#1A1A18]"><div className="flex items-center justify-between"><strong>Hours</strong><span className="text-xs text-black/40">Today & weekly</span></div><div className="mt-3 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-white"><Icon name="clock"/></span><div><strong>{todayRow&&!todayRow.is_closed?`${pretty(todayRow.opens_at)} - ${pretty(todayRow.closes_at)}`:'Closed today'}</strong><p className="text-xs text-black/40">{DAY_NAMES[today]}</p></div></div></summary><ul className="border-t border-white/60 px-5 py-4">{DAY_NAMES.map((d,i)=><li key={d} className="flex justify-between py-1 text-xs text-[#6C6A62]"><span>{d}</span><span>{rowLabel(hours.find(h=>h.day_of_week===i))}</span></li>)}</ul></details>
    <PublicSocialLinks businessId={business.id} socials={pageConfig.socials}/>
    <Link href="/" className="mt-7 block text-center text-[10px] uppercase tracking-[.16em] text-white/60">Powered by OpenStatus</Link>
   </div>
   <OwnerQuickStatus businessId={business.id} businessName={business.name}/>
  </div>
 </div>;
}
