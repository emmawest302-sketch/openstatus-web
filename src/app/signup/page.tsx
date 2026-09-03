'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function Keyhole({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <mask id="signup-keyhole">
        <rect width="100" height="100" fill="#fff" />
        <circle cx="50" cy="42" r="13" fill="#000" />
        <path d="M44 52 L56 52 L60 74 L40 74 Z" fill="#000" />
      </mask>
      <circle cx="50" cy="50" r="48" fill="currentColor" mask="url(#signup-keyhole)" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { business_name: businessName.trim() } },
      });
      if (signupError) throw signupError;
      if (data.session) {
        router.push('/setup');
      } else {
        setNotice('Check your email to confirm your account. Then sign in to claim your link.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-[#F4F1E8] text-[#0A0A0A] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative flex min-h-[340px] flex-col justify-between overflow-hidden border-b-2 border-black bg-[#A7E348] p-6 md:p-10 lg:min-h-screen lg:border-b-0 lg:border-r-2 lg:p-14">
        <div className="noise absolute inset-0 opacity-20" />
        <Link href="/" className="relative flex items-center gap-2.5"><Keyhole /><span className="font-bold tracking-[-0.03em]">OPENSTATUS</span></Link>
        <div className="relative mt-16 max-w-xl lg:mt-0">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">Free forever · about five minutes</p>
          <h1 className="mt-4 text-[clamp(3.8rem,7vw,7.5rem)] font-bold uppercase leading-[0.79] tracking-[-0.075em]">Get your<br />live link.</h1>
        </div>
        <div className="relative mt-14 grid grid-cols-3 border-l-2 border-t-2 border-black font-mono text-[9px] font-bold uppercase tracking-[0.12em]">
          {['Claim it', 'Make it yours', 'Connect Instagram'].map((label, index) => <div key={label} className="border-b-2 border-r-2 border-black p-3"><span className="block opacity-45">0{index + 1}</span><span className="mt-2 block">{label}</span></div>)}
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 md:px-10">
        <div className="w-full max-w-md">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black/45">Start free</p>
          <h2 className="mt-3 text-4xl font-bold uppercase leading-[0.9] tracking-[-0.055em] md:text-5xl">Create your account.</h2>
          <p className="mt-4 text-black/55">Your account protects the business page only you can edit.</p>

          <form onSubmit={handleSignup} className="mt-8 space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-bold">Business name</span><input type="text" autoComplete="organization" value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Emma's Coffee" className="w-full border-2 border-black bg-white px-4 py-3.5 outline-none focus:bg-[#A7E348]/20" required /></label>
            <label className="block"><span className="mb-2 block text-sm font-bold">Email</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" className="w-full border-2 border-black bg-white px-4 py-3.5 outline-none focus:bg-[#A7E348]/20" required /></label>
            <label className="block"><span className="mb-2 block text-sm font-bold">Password</span><input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} className="w-full border-2 border-black bg-white px-4 py-3.5 outline-none focus:bg-[#A7E348]/20" required /></label>

            {error ? <p className="border-2 border-black bg-[#F8AE9D] p-4 text-sm" role="alert">{error}</p> : null}
            {notice ? <p className="border-2 border-black bg-[#A7E348] p-4 text-sm" aria-live="polite">{notice}</p> : null}

            <button type="submit" disabled={loading} className="flex min-h-14 w-full items-center justify-between border-2 border-black bg-black px-5 font-bold uppercase text-white hover:bg-[#A7E348] hover:text-black disabled:opacity-40">
              {loading ? 'Creating account...' : 'Create account'} <span>→</span>
            </button>
          </form>

          <p className="mt-6 text-sm text-black/55">Already have a link? <Link href="/login" className="font-bold text-black underline underline-offset-4">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
