import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-[#7C3AED] text-white"
      style={{ fontFamily: 'var(--font-poppins)' }}
    >
      <div className="text-center px-5">
        <p className="text-[10px] font-bold tracking-[.16em] text-black/35">404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.06em]">Page not found.</h1>
        <p className="mt-4 text-sm text-black/50">
          This business page doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-[#232323] px-6 py-3 text-sm font-semibold text-white"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
