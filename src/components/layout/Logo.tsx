import { cn } from '@/lib/cn';

/** WAQTI mark: a clock hand inside a gold progress arc — time, organized. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn('size-9 shrink-0', className)}>
      <rect width="40" height="40" rx="11" className="fill-brand-emerald dark:fill-[#1B3D35]" />
      <circle cx="20" cy="20" r="10.5" stroke="#F5F2EA" strokeOpacity="0.16" strokeWidth="2.75" />
      <path
        d="M20 9.5a10.5 10.5 0 1 1-9.4 5.8"
        stroke="#D1AD70"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
      <path d="M20 14v6l3.75 2.5" stroke="#F5F2EA" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ name, collapsed, className }: { name: string; collapsed?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      {!collapsed ? (
        <span className="font-display text-lg font-bold tracking-[0.08em] text-ink rtl:tracking-normal">{name}</span>
      ) : null}
    </span>
  );
}
