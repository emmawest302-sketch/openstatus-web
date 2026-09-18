#!/usr/bin/env python3
"""
Insert IntCard, IntegrationsPanel, SettingsPanel before the main export marker,
then replace the two IIFEs in the render with proper component JSX.
"""
import sys

FILE = '/sessions/rcw-01dupmtdmdjxrzfjfoswgquy/mnt/GitHub/openstatus-web/src/components/builder-client.tsx'

with open(FILE, 'r') as f:
    content = f.read()

# ── 1. Build the three new top-level components ──────────────────────────────
NEW_COMPONENTS = r'''
// ── IntCard (standalone component — must not be nested in render) ────────────
function IntCard({cardKey,icon,name,desc,connected,url,onSave,onClear,placeholder,expandedKey,setExpandedKey}:{
  cardKey:string;icon:React.ReactNode;name:string;desc:string;connected:boolean;url?:string;
  onSave:(url:string)=>void;onClear?:()=>void;placeholder:string;
  expandedKey:string|null;setExpandedKey:(k:string|null)=>void;
}){
  const isExpanded=expandedKey===cardKey;
  const [localVal,setLocalVal]=React.useState(url??'');
  React.useEffect(()=>{if(isExpanded)setLocalVal(url??'');},[isExpanded,url]);
  return(
    <div className={`rounded-2xl border bg-white mb-2 transition-colors ${isExpanded?'border-[#0A0A0A]':'border-[#DEDEDC] hover:border-[#C0C0C0]'}`}>
      <div className="flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] flex items-center justify-center flex-shrink-0 overflow-hidden">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-[#0A0A0A] leading-tight">{name}</p>
          {connected&&url?(
            <p className="text-[10px] text-emerald-600 truncate max-w-[160px]">✓ {url.replace(/^https?:\/\//,'')}</p>
          ):(
            <p className="text-[10px] text-[#ACACAC]">{desc}</p>
          )}
        </div>
        {connected?(
          <button onClick={()=>{setExpandedKey(isExpanded?null:cardKey);}} className="flex-shrink-0 text-[10px] font-bold text-[#0A0A0A] border border-[#DEDEDC] rounded-full px-3 py-1 hover:border-[#0A0A0A] transition-colors">{isExpanded?'Cancel':'Edit'}</button>
        ):(
          <button onClick={()=>setExpandedKey(isExpanded?null:cardKey)} className="flex-shrink-0 text-[10px] font-bold text-white bg-[#0A0A0A] rounded-full px-3 py-1 hover:bg-[#292929] transition-colors">Add</button>
        )}
      </div>
      {isExpanded&&(
        <div className="px-3 pb-3 flex flex-col gap-2">
          <input
            autoFocus
            type="url"
            value={localVal}
            onChange={e=>setLocalVal(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-[#DEDEDC] bg-[#F7F7F5] px-3 py-2 text-[12px] outline-none focus:border-[#0A0A0A] transition-colors"
            onKeyDown={e=>{if(e.key==='Enter'&&localVal.trim()){onSave(localVal.trim());setExpandedKey(null);}if(e.key==='Escape')setExpandedKey(null);}}
          />
          <div className="flex gap-2">
            <button
              disabled={!localVal.trim()}
              onClick={()=>{if(localVal.trim()){onSave(localVal.trim());setExpandedKey(null);}}}
              className="flex-1 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold py-2 hover:bg-[#292929] transition-colors disabled:opacity-40">Save</button>
            {connected&&onClear&&(
              <button onClick={()=>{onClear();setExpandedKey(null);}} className="rounded-xl border border-[#DEDEDC] text-[#858585] text-[12px] font-bold px-4 py-2 hover:border-[#0A0A0A] hover:text-[#0A0A0A] transition-colors">Remove</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── IntegrationsPanel (top-level component — hooks always called) ─────────────
function IntegrationsPanel({allBlocks,updateBlock,setConfig,setGooglePhotos,localBusiness,setLocalBusiness,googleFetchDone}:{
  allBlocks:OpenStatusBlock[];
  updateBlock:(id:string,partial:Partial<OpenStatusBlock>)=>void;
  setConfig:React.Dispatch<React.SetStateAction<OpenStatusPageConfig>>;
  setGooglePhotos:React.Dispatch<React.SetStateAction<string[]>>;
  localBusiness:Business|null;
  setLocalBusiness:React.Dispatch<React.SetStateAction<Business|null>>;
  googleFetchDone:boolean;
}){
  const orderBlock=allBlocks.find(b=>b.id==='order');
  const bookBlock=allBlocks.find(b=>b.id==='book');
  const [expandedKey,setExpandedKey]=React.useState<string|null>(null);
  return(
    <div className="px-5 py-5 overflow-y-auto h-full">
      {/* Intro */}
      <div className="mb-5 rounded-2xl bg-[#F7F7F5] border border-[#DEDEDC] px-4 py-3">
        <p className="text-[12px] font-bold text-[#0A0A0A] mb-1">Connect your platforms</p>
        <p className="text-[11px] text-[#858585] leading-relaxed">Tap <strong className="text-[#0A0A0A]">Add</strong> next to any platform, paste your link, and hit <strong className="text-[#0A0A0A]">Save</strong>. That&#39;s it — your page updates automatically when you save.</p>
      </div>
      {/* Google Business */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Business Profile</p>
        <IntCard
          cardKey="google-business"
          icon={<svg viewBox="0 0 24 24" width="22" height="22"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
          name="Google Business"
          desc="Paste your Google Maps URL to import"
          placeholder="https://maps.google.com/maps/place/..."
          connected={googleFetchDone||!!(allBlocks.find(b=>b.id==='location')?.googleUrl)}
          url={allBlocks.find(b=>b.id==='location')?.googleUrl}
          expandedKey={expandedKey}
          setExpandedKey={setExpandedKey}
          onSave={async(url)=>{
            updateBlock('location',{googleUrl:url});
            try{
              const r=await fetch(`/api/google/rating?url=${encodeURIComponent(url)}`);
              const d=await r.json();
              if(r.ok&&!d.error){
                updateBlock('location',{reviewStars:d.rating,reviewCount:d.reviewCount,sub:d.address??allBlocks.find(b=>b.id==='location')?.sub??'',...(d.lat!==undefined?{lat:d.lat,lng:d.lng}:{}),...(d.reviews?{reviews:d.reviews}:{}),...(d.photoUrl?{coverPhoto:d.photoUrl}:{})});
                if(d.weeklyHours) setConfig(c=>({...c,weeklyHours:d.weeklyHours}));
                if(d.photos?.length) setGooglePhotos(d.photos);
                if(d.photos?.length&&localBusiness?.id&&!localBusiness.avatar_url){await supabase.from('businesses').update({avatar_url:d.photos[0]}).eq('id',localBusiness.id);setLocalBusiness(b=>b?({...b,avatar_url:d.photos[0]}):b);}
              }
            }catch(e){}
          }}
          onClear={()=>updateBlock('location',{googleUrl:''})}
        />
      </div>

      {/* Online Ordering */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Online Ordering</p>
        {ORDER_PROVIDERS.filter(p=>p.key!=='other').map(provider=>{
          const connected=!!(orderBlock?.on && orderBlock?.provider===provider.key && orderBlock?.url);
          return(
            <IntCard
              key={provider.key}
              cardKey={`order-${provider.key}`}
              icon={<BlockIcon id={provider.key} size={22}/>}
              name={provider.label}
              desc={`Paste your ${provider.label} link`}
              placeholder={`https://www.${provider.key}.com/...`}
              connected={connected}
              url={connected?orderBlock?.url:undefined}
              expandedKey={expandedKey}
              setExpandedKey={setExpandedKey}
              onSave={(url)=>updateBlock('order',{on:true,provider:provider.key,url})}
              onClear={()=>updateBlock('order',{on:false,url:'',provider:''})}
            />
          );
        })}
      </div>

      {/* Reservations & Booking */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Reservations &amp; Booking</p>
        {BOOK_PROVIDERS.filter(p=>p.key!=='other').map(provider=>{
          const connected=!!(bookBlock?.on && bookBlock?.provider===provider.key && bookBlock?.url);
          return(
            <IntCard
              key={provider.key}
              cardKey={`book-${provider.key}`}
              icon={<BlockIcon id={provider.key} size={22}/>}
              name={provider.label}
              desc={`Paste your ${provider.label} link`}
              placeholder={`https://www.${provider.key}.com/...`}
              connected={connected}
              url={connected?bookBlock?.url:undefined}
              expandedKey={expandedKey}
              setExpandedKey={setExpandedKey}
              onSave={(url)=>updateBlock('book',{on:true,provider:provider.key,url})}
              onClear={()=>updateBlock('book',{on:false,url:'',provider:''})}
            />
          );
        })}
      </div>

      {/* Reviews */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Reviews</p>
        {([
          {key:'yelp',       name:'Yelp',          icon:<IconYelp size={22}/>,        field:'yelpUrl' as const,        ph:'https://www.yelp.com/biz/...'},
          {key:'google-rev', name:'Google Reviews', icon:<IconGoogle size={22}/>,      field:'googleUrl' as const,       ph:'https://maps.google.com/...'},
          {key:'tripadvisor',name:'TripAdvisor',    icon:<IconTripAdvisor size={22}/>, field:'tripAdvisorUrl' as const,  ph:'https://www.tripadvisor.com/...'},
        ] as {key:string;name:string;icon:React.ReactNode;field:'yelpUrl'|'googleUrl'|'tripAdvisorUrl';ph:string}[]).map(r=>{
          const locB=allBlocks.find(b=>b.id==='location');
          const url=locB?.[r.field]??'';
          const connected=!!(url&&url.trim());
          return(
            <IntCard
              key={r.key}
              cardKey={`rev-${r.key}`}
              icon={r.icon}
              name={r.name}
              desc={`Paste your ${r.name} listing URL`}
              placeholder={r.ph}
              connected={connected}
              url={url||undefined}
              expandedKey={expandedKey}
              setExpandedKey={setExpandedKey}
              onSave={(v)=>updateBlock('location',{[r.field]:v})}
              onClear={()=>updateBlock('location',{[r.field]:''})}
            />
          );
        })}
      </div>

      {/* QR Code */}
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">QR Code</p>
        {localBusiness?.slug?(
          <div className="rounded-2xl border border-[#DEDEDC] bg-white p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#F7F7F5] flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zM16 16h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold text-[#0A0A0A] leading-tight">QR Code</p>
                <p className="text-[10px] text-[#ACACAC]">Print or share for easy access</p>
              </div>
            </div>
            <p className="text-[11px] text-[#858585] mb-3">Your unique page link:</p>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F7F7F5] border border-[#DEDEDC] mb-3">
              <span className="text-[11px] text-[#0A0A0A] flex-1 truncate">forothers.us/{localBusiness.slug}</span>
              <button
                onClick={()=>navigator.clipboard.writeText(`https://forothers.us/${localBusiness.slug}`)}
                className="flex-shrink-0 text-[10px] font-bold text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors">Copy</button>
            </div>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://forothers.us/'+localBusiness.slug)}`}
              download={`${localBusiness.slug}-qr.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold py-2.5 hover:bg-[#292929] transition-colors">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download QR code
            </a>
          </div>
        ):(
          <div className="rounded-2xl border border-[#DEDEDC] bg-[#F7F7F5] p-4 text-center">
            <p className="text-[12px] text-[#858585]">Save your page first to get your QR code.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SettingsPanel (top-level component — hooks always called) ─────────────────
function SettingsPanel({localBusiness,setLocalBusiness,config,setConfig,allBlocks,updateBlock}:{
  localBusiness:Business|null;
  setLocalBusiness:React.Dispatch<React.SetStateAction<Business|null>>;
  config:OpenStatusPageConfig;
  setConfig:React.Dispatch<React.SetStateAction<OpenStatusPageConfig>>;
  allBlocks:OpenStatusBlock[];
  updateBlock:(id:string,partial:Partial<OpenStatusBlock>)=>void;
}){
  const BIZ_CATS=['Coffee Shop / Café','Restaurant','Bar','Bakery','Food Truck','Retail / Boutique','Salon / Beauty','Fitness','Spa / Wellness','Services','Events / Entertainment','Non-profit','Pop-up','Market','Other'];
  const [settingsName,setSettingsName]=React.useState(localBusiness?.name??'');
  const [settingsCat,setSettingsCat]=React.useState(localBusiness?.category??'');
  const [settingsDesc,setSettingsDesc]=React.useState(localBusiness?.tagline??'');
  const [settingsLocation,setSettingsLocation]=React.useState(config.location??'');
  const [settingsPhone,setSettingsPhone]=React.useState(allBlocks.find(b=>b.id==='call')?.url?.replace('tel:','')?? '');
  const [settingsWebsite,setSettingsWebsite]=React.useState(allBlocks.find(b=>b.id==='website')?.url??'');
  const [bizSaving,setBizSaving]=React.useState(false);
  const [bizSaved,setBizSaved]=React.useState(false);
  const [bizErr,setBizErr]=React.useState('');
  const [userEmail,setUserEmail]=React.useState('');
  const [newPw,setNewPw]=React.useState('');
  const [pwSaving,setPwSaving]=React.useState(false);
  const [pwMsg,setPwMsg]=React.useState('');
  const [showDeleteConfirm,setShowDeleteConfirm]=React.useState(false);
  const [deleteText,setDeleteText]=React.useState('');

  React.useEffect(()=>{
    supabase.auth.getUser().then(({data})=>setUserEmail(data.user?.email??''));
  },[]);

  async function saveBiz(){
    if(!localBusiness?.id)return;
    setBizSaving(true);setBizErr('');
    const{error}=await supabase.from('businesses').update({
      name:settingsName.trim()||localBusiness.name,
      category:settingsCat,
      tagline:settingsDesc.trim(),
    }).eq('id',localBusiness.id);
    if(error){setBizErr(error.message);setBizSaving(false);return;}
    setLocalBusiness(b=>b?({...b,name:settingsName.trim()||b.name,category:settingsCat,tagline:settingsDesc.trim()}):b);
    setConfig(c=>({...c,location:settingsLocation}));
    if(settingsPhone.trim()) updateBlock('call',{url:`tel:${settingsPhone.trim()}`,on:true});
    if(settingsWebsite.trim()) updateBlock('website',{url:settingsWebsite.trim(),on:true});
    setBizSaving(false);setBizSaved(true);setTimeout(()=>setBizSaved(false),2500);
  }

  async function changePw(){
    if(!newPw.trim()||newPw.length<8){setPwMsg('Password must be at least 8 characters.');return;}
    setPwSaving(true);setPwMsg('');
    const{error}=await supabase.auth.updateUser({password:newPw});
    setPwSaving(false);
    if(error){setPwMsg(error.message);}else{setPwMsg('Password updated!');setNewPw('');}
  }

  async function handleLogout(){
    await supabase.auth.signOut();
    window.location.href='/';
  }

  const SettingField=({label,children}:{label:string;children:React.ReactNode})=>(
    <div>
      <p className="text-[11px] font-bold text-[#858585] uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
  const inputCls="w-full bg-white border border-[#DEDEDC] rounded-xl px-3 py-2.5 text-[13px] text-[#111] placeholder:text-[#C0C0C0] focus:outline-none focus:border-[#0A0A0A] transition-colors";

  return(
    <div className="px-5 py-5 overflow-y-auto h-full space-y-6">

      {/* ── Business Info ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Business Info</p>
        <div className="rounded-2xl border border-[#DEDEDC] bg-white p-4 space-y-4">
          <SettingField label="Business name">
            <input className={inputCls} value={settingsName} onChange={e=>setSettingsName(e.target.value)} placeholder="Your business name"/>
          </SettingField>
          <SettingField label="Category">
            <select className={inputCls} value={settingsCat} onChange={e=>setSettingsCat(e.target.value)}>
              <option value="">Select a category…</option>
              {BIZ_CATS.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </SettingField>
          <SettingField label="Description">
            <textarea className={`${inputCls} resize-none`} rows={3} value={settingsDesc} onChange={e=>setSettingsDesc(e.target.value)} placeholder="A short description of your business…"/>
          </SettingField>
          <SettingField label="Location">
            <input className={inputCls} value={settingsLocation} onChange={e=>setSettingsLocation(e.target.value)} placeholder="123 Main St, Austin TX"/>
          </SettingField>
          <SettingField label="Phone">
            <input className={inputCls} type="tel" value={settingsPhone} onChange={e=>setSettingsPhone(e.target.value)} placeholder="+1 (555) 000-0000"/>
          </SettingField>
          <SettingField label="Website">
            <input className={inputCls} type="url" value={settingsWebsite} onChange={e=>setSettingsWebsite(e.target.value)} placeholder="https://yoursite.com"/>
          </SettingField>
          {bizErr&&<p className="text-[11px] text-red-500">{bizErr}</p>}
          <button onClick={saveBiz} disabled={bizSaving} className="w-full rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold py-2.5 hover:bg-[#292929] transition-colors disabled:opacity-40">
            {bizSaving?'Saving…':bizSaved?'✓ Saved':'Save changes'}
          </button>
        </div>
      </div>

      {/* ── Subscription ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Subscription</p>
        <div className="rounded-2xl border border-[#DEDEDC] bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-[#0A0A0A]">Free plan</p>
              <p className="text-[11px] text-[#858585] mt-0.5">Your page is live and free forever.</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">Active</span>
          </div>
        </div>
      </div>

      {/* ── Account ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Account</p>
        <div className="rounded-2xl border border-[#DEDEDC] bg-white p-4 space-y-4">
          <SettingField label="Email">
            <p className="text-[13px] text-[#6B6B6B] py-1">{userEmail||'—'}</p>
          </SettingField>
          <SettingField label="Change password">
            <div className="flex gap-2">
              <input className={`${inputCls} flex-1`} type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);setPwMsg('');}} placeholder="New password (8+ chars)"/>
              <button onClick={changePw} disabled={pwSaving||!newPw} className="flex-shrink-0 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-bold px-4 hover:bg-[#292929] transition-colors disabled:opacity-40">
                {pwSaving?'…':'Save'}
              </button>
            </div>
            {pwMsg&&<p className={`text-[11px] mt-1.5 ${pwMsg.startsWith('Password updated')?'text-emerald-600':'text-red-500'}`}>{pwMsg}</p>}
          </SettingField>
        </div>
      </div>

      {/* ── Support ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Support</p>
        <a href="mailto:info@openstatus.co" className="flex items-center gap-3 rounded-2xl border border-[#DEDEDC] bg-white p-4 hover:border-[#0A0A0A] transition-colors group">
          <div className="w-9 h-9 rounded-xl bg-[#F7F7F5] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div>
            <p className="text-[12px] font-bold text-[#0A0A0A]">Email support</p>
            <p className="text-[11px] text-[#858585]">info@openstatus.co</p>
          </div>
          <svg className="ml-auto text-[#C0C0C0] group-hover:text-[#0A0A0A] transition-colors" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>

      {/* ── Log out ── */}
      <div>
        <button onClick={handleLogout} className="w-full rounded-2xl border border-[#DEDEDC] bg-white p-4 text-[13px] font-bold text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors text-left flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#F7F7F5] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </div>
          Log out
        </button>
      </div>

      {/* ── Delete account ── */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] text-black/35 uppercase mb-3">Danger zone</p>
        {!showDeleteConfirm?(
          <button onClick={()=>setShowDeleteConfirm(true)} className="w-full rounded-2xl border border-[#FECACA] bg-white p-4 text-[13px] font-bold text-red-500 hover:border-red-400 hover:bg-red-50 transition-colors text-left">
            Delete account
          </button>
        ):(
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 space-y-3">
            <p className="text-[12px] font-bold text-red-700">Are you sure? This can&#39;t be undone.</p>
            <p className="text-[11px] text-red-600">Type <strong>DELETE</strong> to confirm.</p>
            <input className="w-full rounded-xl border border-red-300 bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-red-500" value={deleteText} onChange={e=>setDeleteText(e.target.value)} placeholder="DELETE"/>
            <div className="flex gap-2">
              <button disabled={deleteText!=='DELETE'} onClick={async()=>{
                const{data:s}=await supabase.auth.getSession();
                const token=s.session?.access_token;
                if(!token)return;
                await fetch('/api/account/delete',{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
                await supabase.auth.signOut();
                window.location.href='/';
              }} className="flex-1 rounded-xl bg-red-600 text-white text-[12px] font-bold py-2.5 hover:bg-red-700 transition-colors disabled:opacity-40">Delete my account</button>
              <button onClick={()=>{setShowDeleteConfirm(false);setDeleteText('');}} className="rounded-xl border border-[#DEDEDC] text-[#6B6B6B] text-[12px] font-bold px-4 hover:border-[#0A0A0A] transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="pb-4"/>
    </div>
  );
}

'''

# ── 2. Insert new components just before the main export marker ───────────────
INSERTION_MARKER = '// ── main export ────────────────────────────────────────────────────────────────'
if INSERTION_MARKER not in content:
    print('ERROR: main export marker not found', file=sys.stderr)
    sys.exit(1)

# Only insert if not already there
if 'function IntegrationsPanel(' not in content:
    content = content.replace(INSERTION_MARKER, NEW_COMPONENTS + INSERTION_MARKER)
    print('✓ Inserted IntCard, IntegrationsPanel, SettingsPanel')
else:
    print('⚠ Components already present — skipping insertion')

# ── 3. Replace integrations IIFE with component tag ──────────────────────────
lines = content.split('\n')

# Find the integrations IIFE start line
int_start = None
for i, line in enumerate(lines):
    if "sidebarTab==='integrations'&&(()=>{" in line:
        int_start = i
        break

if int_start is None:
    print('ERROR: integrations IIFE start not found', file=sys.stderr)
    sys.exit(1)

# Find matching })() for the integrations IIFE
# We need to find where the IIFE ends. The pattern is })()}
# Count braces starting from int_start
depth = 0
int_end = None
for i in range(int_start, len(lines)):
    line = lines[i]
    depth += line.count('{') - line.count('}')
    # The IIFE ends with })()}  on its own line-ish
    if i > int_start and '})()}' in line and depth <= 0:
        int_end = i
        break

if int_end is None:
    # Try alternate: look for the })() pattern
    for i in range(int_start + 1, len(lines)):
        if '})()}' in lines[i]:
            int_end = i
            break

if int_end is None:
    print(f'ERROR: integrations IIFE end not found (started at line {int_start+1})', file=sys.stderr)
    sys.exit(1)

print(f'Integrations IIFE: lines {int_start+1}–{int_end+1}')

INT_REPLACEMENT = '            {sidebarTab===\'integrations\'&&<IntegrationsPanel allBlocks={allBlocks} updateBlock={updateBlock} setConfig={setConfig} setGooglePhotos={setGooglePhotos} localBusiness={localBusiness} setLocalBusiness={setLocalBusiness} googleFetchDone={googleFetchDone}/>}'

lines[int_start:int_end+1] = [INT_REPLACEMENT]
print('✓ Replaced integrations IIFE with <IntegrationsPanel/>')

# ── 4. Replace settings IIFE with component tag ───────────────────────────────
# Re-find after replacement (line numbers shifted)
set_start = None
for i, line in enumerate(lines):
    if "sidebarTab==='settings'&&(()=>{" in line:
        set_start = i
        break

if set_start is None:
    print('ERROR: settings IIFE start not found', file=sys.stderr)
    sys.exit(1)

depth = 0
set_end = None
for i in range(set_start, len(lines)):
    line = lines[i]
    depth += line.count('{') - line.count('}')
    if i > set_start and '})()}' in line and depth <= 0:
        set_end = i
        break

if set_end is None:
    for i in range(set_start + 1, len(lines)):
        if '})()}' in lines[i]:
            set_end = i
            break

if set_end is None:
    print(f'ERROR: settings IIFE end not found (started at line {set_start+1})', file=sys.stderr)
    sys.exit(1)

print(f'Settings IIFE: lines {set_start+1}–{set_end+1}')

SET_REPLACEMENT = '            {sidebarTab===\'settings\'&&<SettingsPanel localBusiness={localBusiness} setLocalBusiness={setLocalBusiness} config={config} setConfig={setConfig} allBlocks={allBlocks} updateBlock={updateBlock}/>}'

lines[set_start:set_end+1] = [SET_REPLACEMENT]
print('✓ Replaced settings IIFE with <SettingsPanel/>')

# ── 5. Write back ─────────────────────────────────────────────────────────────
content = '\n'.join(lines)
with open(FILE, 'w') as f:
    f.write(content)

print('✓ File written successfully')
print(f'  Final line count: {len(lines)}')
