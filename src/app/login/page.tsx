'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function Keyhole({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="login-keyhole"><rect width="100" height="100" fill="#fff" /><circle cx="50" cy="42" r="13" fill="#000" /><path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" /></mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#login-keyhole)" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      if (data.user) {
        const { data: business } = await supabase.from('businesses').select('slug').eq('user_id', data.user.id).maybeSingle();
        router.push(business?.slug ? '/dashboard' : '/setup');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-[#F4F1E8] text-[#0A0A0A] lg:grid-cols-[0.72fr_1.28fr]">
      <section className="flex min-h-[260px] flex-col justify-between border-b-2 border-black bg-black p-6 text-white md:p-10 lg:min-h-screen lg:border-b-0 lg:border-r-2 lg:p-14">
        <Link href="/" className="flex items-center gap-2.5"><Keyhole /><span className="font-bold tracking-[-0.03em]">OPENSTATUS</span></Link>
        <div className="mt-16 lg:mt-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#A7E348]">Owner access</p>
          <h1 className="mt-4 text-[clamp(3.8rem,7vw,7.5rem)] font-bold uppercase leading-[0.79] tracking-[-0.075em]">Welcome<br />back.</h1>
          <p className="mt-6 max-w-sm text-white/55">Review Instagram suggestions, edit your page, and keep customers current.</p>
        </div>
        <p className="mt-10 hidden font-mono text-[9px] uppercase tracking-[0.16em] text-white/35 lg:block">You approve every public change</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 md:px-10">
        <div className="w-full max-w-md">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">Sign in</p>
          <h2 className="mt-3 text-4xl font-bold uppercase leading-[0.9] tracking-[-0.055em] md:text-5xl">Open your dashboard.</h2>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-bold">Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" className="w-full border-2 border-black bg-white px-4 py-3.5 outline-none focus:bg-[#A7E348]/20" required /></label>
            <label className="block"><span className="mb-2 block text-sm font-bold">Password</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" className="w-full border-2 border-black bg-white px-4 py-3.5 outline-none focus:bg-[#A7E348]/20" required /></label>
            {error ? <p className="border-2 border-black bg-[#F8AE9D] p-4 text-sm" role="alert">{error}</p> : null}
            <button type="submit" disabled={loading} className="flex min-h-14 w-full items-center justify-between border-2 border-black bg-black px-5 font-bold uppercase text-white hover:bg-[#A7E348] hover:text-black disabled:opacity-40">
              {loading ? 'Signing in...' : 'Sign in'} <span>→</span>
            </button>
          </form>

          <p className="mt-6 text-sm text-black/55">No account yet? <Link href="/signup" className="font-bold text-black underline underline-offset-4">Get your free link</Link></p>
        </div>
      </section>
    </main>
  );
}
