'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function Keyhole({ size = 28 }: { size?: number }) {
  return <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#050505"/><circle cx="50" cy="50" r="21" fill="#F7F7F3"/><circle cx="50" cy="44" r="7.4" fill="#050505"/><path d="M45.2 50.2h9.6l2.2 16.3H43z" fill="#050505"/></svg>;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      if (data.user) {
        const { data: business } = await supabase.from('businesses').select('slug').eq('user_id', data.user.id).maybeSingle();
        router.push(business?.slug ? '/dashboard' : '/setup');
      }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Login failed'); }
    finally { setLoading(false); }
  };

  return <main className="relative min-h-screen overflow-hidden bg-[#F5F3ED] text-[#101010]" style={{fontFamily:'var(--font-poppins)'}}>
    <div className="absolute -right-28 top-16 h-80 w-80 rounded-full bg-[#CBD9FF]/75 blur-3xl" />
    <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#C8FF62]/45 blur-3xl" />
    <div className="absolute right-[18%] bottom-[10%] h-56 w-56 rounded-full bg-[#F8AE9D]/30 blur-3xl" />

    <header className="relative z-10 mx-auto flex w-[min(94%,1180px)] items-center justify-between pt-5">
      <Link href="/" className="flex items-center gap-2.5 font-bold tracking-[-0.04em]"><Keyhole/><span>OpenStatus</span></Link>
      <Link href="/signup" className="rounded-full border border-black/10 bg-white/60 px-5 py-3 text-sm font-semibold backdrop-blur-xl">Create account</Link>
    </header>

    <section className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] w-[min(94%,1180px)] items-center gap-10 py-10 lg:grid-cols-[1.05fr_.95fr]">
      <div className="hidden lg:block">
        <span className="inline-flex rounded-full border border-black/10 bg-white/55 px-3 py-2 text-[10px] font-bold tracking-[0.16em] backdrop-blur-xl">WELCOME BACK</span>
        <h1 className="mt-7 max-w-[650px] text-[clamp(64px,7vw,112px)] font-semibold leading-[0.86] tracking-[-0.075em]">Your business.<br/>Still live.</h1>
        <p className="mt-7 max-w-lg text-lg leading-8 text-black/55">Update your status, edit your page, move blocks around, and see what customers are actually clicking.</p>
        <div className="mt-10 flex gap-2 text-[11px] font-semibold"><span className="rounded-full bg-white/60 px-3 py-2">Live status</span><span className="rounded-full bg-white/60 px-3 py-2">Page builder</span><span className="rounded-full bg-white/60 px-3 py-2">Analytics</span></div>
      </div>

      <div className="mx-auto w-full max-w-[500px] rounded-[34px] border border-white/70 bg-white/72 p-5 shadow-[0_28px_90px_rgba(0,0,0,.10)] backdrop-blur-2xl sm:p-8">
        <span className="text-[10px] font-bold tracking-[0.15em] text-black/40">SIGN IN</span>
        <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em]">Open your dashboard.</h2>
        <p className="mt-3 text-sm leading-6 text-black/50">Manage the live front door to your business.</p>
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <label className="block"><span className="mb-2 block text-xs font-semibold">Email</span><input type="email" autoComplete="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@business.com" className="w-full rounded-[18px] border border-black/10 bg-white/85 px-4 py-4 text-sm outline-none transition focus:border-black/30 focus:ring-4 focus:ring-[#CBD9FF]/40" required/></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold">Password</span><input type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Your password" className="w-full rounded-[18px] border border-black/10 bg-white/85 px-4 py-4 text-sm outline-none transition focus:border-black/30 focus:ring-4 focus:ring-[#CBD9FF]/40" required/></label>
          {error ? <p className="rounded-[16px] bg-[#F8AE9D]/65 p-4 text-sm" role="alert">{error}</p> : null}
          <button type="submit" disabled={loading} className="flex min-h-14 w-full items-center justify-between rounded-full bg-black px-5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-40"><span>{loading?'Signing in...':'Sign in'}</span><span>↗</span></button>
        </form>
        <p className="mt-6 text-sm text-black/50">New to OpenStatus? <Link href="/signup" className="font-semibold text-black">Build your page →</Link></p>
      </div>
    </section>
  </main>;
}
