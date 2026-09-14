import type { OpenStatusBlock } from '@/lib/openstatus-page-config';

type PublicActionBlockProps = {
  block: OpenStatusBlock;
};

export default function PublicActionBlock({ block }: PublicActionBlockProps) {
  const wide = block.id === 'website';
  const tone = block.tone === 'dark'
    ? 'bg-black text-white'
    : block.tone === 'glass'
      ? 'border border-white/70 bg-white/65 text-black backdrop-blur-xl'
      : 'bg-white text-black';

  return (
    <div className={`${wide ? 'col-span-2' : ''} ${tone} flex min-h-[126px] flex-col justify-between rounded-[24px] p-4`}>
      <span className="text-[8px] font-bold uppercase tracking-[.14em] opacity-45">{block.id}</span>
      <div className="flex items-end justify-between gap-3">
        <div>
          <strong className="block text-[18px] tracking-[-.04em]">{block.title}</strong>
          <span className="mt-1 block text-[9px] opacity-55">{block.sub}</span>
        </div>
        <span aria-hidden="true">{block.icon || '↗'}</span>
      </div>
    </div>
  );
}
