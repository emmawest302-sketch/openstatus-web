'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function Keyhole({ size = 28 }: { size?: number }) { return <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#050505"/><circle cx="50" cy="50" r="21" fill="#F7F7F3"/><circle cx="50" cy="44" r="7.4" fill="#050505"/><path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#050505"/></svg>; }

function MetaLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [businessName,setBusinessName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [loading,setLoading]=useState(false); const [metaLoading,setMetaLoading]=useState(false); const [error,setError]=useState(''); const [notice,setNotice]=useState('');

  const handleSignup=async(event:React.FormEvent)=>{event.preventDefault();setLoading(true);setError('');setNotice('');try{const{data,error:signupError}=await supabase.auth.signUp({email,password,options:{data:{business_name:businessName.trim()}}});if(signupError)throw signupError;if(data.session)router.push('/setup/new');else setNotice('Check your email to confirm your account. Then sign in to build your page.');}catch(caught){setError(caught instanceof Error?caught.message:'Signup failed');}finally{setLoading(false);}};

  const handleMetaSignIn = async () => {
    setMetaLoading(true); setError('');
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) throw oauthError;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Meta sign-in failed');
      setMetaLoading(false);
    }
  };

  const field='w-full rounded-[18px] border border-black/10 bg-white/85 px-4 py-4 text-sm outline-none transition focus:border-black/30 focus:ring-4 focus:ring-[#C8FF62]/25';
  return <main className="relative min-h-screen overflow-hidden bg-[#F5F3ED] text-[#101010]" style={{fontFamily:'var(--font-poppins)'}}><div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-[#C8FF62]/55 blur-3xl"/><div className="absolute right-[-80px] top-[18%] h-96 w-96 rounded-full bg-[#CBD9FF]/70 blur-3xl"/><div className="absolute bottom-[-80px] left-[38%] h-72 w-72 rounded-full bg-[#F8AE9D]/35 blur-3xl"/>
  <header className="relative z-10 mx-auto flex w-[min(94%,1180px)] items-center justify-between pt-5"><Link href="/" className="flex items-center gap-2.5 font-bold tracking-[-0.04em]"><Keyhole/><span>OpenStatus</span></Link><Link href="/login" className="rounded-full border border-black/10 bg-white/60 px-5 py-3 text-sm font-semibold backdrop-blur-xl">Log in</Link></header>
  <section className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] w-[min(94%,1180px)] items-center gap-10 py-10 lg:grid-cols-[1.05fr_.95fr]">
    <div className="hidden lg:block"><span className="inline-flex rounded-full border border-black/10 bg-white/55 px-3 py-2 text-[10px] font-bold tracking-[0.16em] backdrop-blur-xl">THE LINK IN BIO FOR SMALL BUSINESS</span><h1 className="mt-7 max-w-[700px] text-[clamp(64px,7vw,112px)] font-semibold leading-[0.86] tracking-[-0.075em]">Build your<br/><span className="text-black/35">mobile front door.</span></h1><p className="mt-7 max-w-lg text-lg leading-8 text-black/55">Live hours, directions, ordering, booking, socials and your website — one beautiful page that feels like your business.</p><div className="mt-10 grid max-w-[560px] grid-cols-4 gap-2">{['Business','Hours','Design','Connect'].map((label,index)=><div key={label} className="rounded-[20px] border border-white/70 bg-white/55 p-4 backdrop-blur-xl"><span className="text-[9px] font-bold text-black/30">0{index+1}</span><strong className="mt-4 block text-[11px]">{label}</strong></div>)}</div></div>

    <div className="mx-auto w-full max-w-[500px] rounded-[34px] border border-white/70 bg-white/72 p-5 shadow-[0_28px_90px_rgba(0,0,0,.10)] backdrop-blur-2xl sm:p-8">
      <span className="text-[10px] font-bold tracking-[0.15em] text-black/40">START BUILDING</span>
      <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em]">Create your OpenStatus.</h2>
      <p className="mt-3 text-sm leading-6 text-black/50">Start with your business. We&apos;ll help you shape the page next.</p>

      {/* Meta sign-up — fastest path */}
      <button
        onClick={handleMetaSignIn}
        disabled={metaLoading || loading}
        className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-full border border-[#1877F2]/25 bg-[#1877F2]/8 px-5 py-3.5 text-sm font-semibold text-[#1877F2] transition hover:bg-[#1877F2]/14 disabled:opacity-40"
      >
        <MetaLogo />
        {metaLoading ? 'Opening Meta…' : 'Continue with Meta'}
      </button>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-black/10" />
        <span className="text-[10px] font-bold tracking-[.12em] text-black/30">OR</span>
        <div className="h-px flex-1 bg-black/10" />
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <label className="block"><span className="mb-2 block text-xs font-semibold">Business name</span><input type="text" autoComplete="organization" value={businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="Breakfast Haus" className={field} required/></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold">Email</span><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@business.com" className={field} required/></label>
        <label className="block"><span className="mb-2 block text-xs font-semibold">Password</span><input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} className={field} required/></label>
        {error?<p className="rounded-[16px] bg-[#F8AE9D]/65 p-4 text-sm" role="alert">{error}</p>:null}
        {notice?<p className="rounded-[16px] bg-[#C8FF62]/55 p-4 text-sm" aria-live="polite">{notice}</p>:null}
        <button type="submit" disabled={loading} className="flex min-h-14 w-full items-center justify-between rounded-full bg-black px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-40"><span>{loading?'Creating account...':'Create account'}</span><span>↗</span></button>
      </form>
      <p className="mt-6 text-sm text-black/50">Already have an OpenStatus? <Link href="/login" className="font-semibold text-black">Sign in →</Link></p>
    </div>
  </section></main>;
}
