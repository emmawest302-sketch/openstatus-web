'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className="grid min-h-screen place-items-center bg-[#0A0A0A] text-white"
      style={{ fontFamily: 'var(--font-poppins)' }}
    >
      <div className="text-center px-5">
        <p className="text-[10px] font-bold tracking-[.16em] text-black/35">ERROR</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em]">Something went wrong.</h1>
        <p className="mt-4 text-sm text-black/50">
          An unexpected error occurred. Try refreshing the page.
        </p>
        <button
          onClick={reset}
          className="mt-8 rounded-full bg-[#232323] px-6 py-3 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
