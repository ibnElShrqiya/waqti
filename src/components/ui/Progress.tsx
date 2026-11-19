import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

interface ProgressCommon {
  /** Ratio in [0, 1]. */
  value: number;
  label?: string;
  className?: string;
}

const clamp = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

export interface ProgressBarProps extends ProgressCommon {
  tone?: 'primary' | 'accent' | 'success';
  size?: 'sm' | 'md';
}

const barTones = { primary: 'bg-primary', accent: 'bg-accent', success: 'bg-success' } as const;

export function ProgressBar({ value, label, tone = 'primary', size = 'md', className }: ProgressBarProps) {
  const v = clamp(value);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn('w-full overflow-hidden rounded-full bg-sunken', size === 'sm' ? 'h-1.5' : 'h-2', className)}
    >
      <motion.div
        className={cn('h-full rounded-full', barTones[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${v * 100}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export interface ProgressRingProps extends ProgressCommon {
  size?: number;
  stroke?: number;
  /** Tailwind stroke classes for the track and indicator. */
  trackClassName?: string;
  indicatorClassName?: string;
  children?: ReactNode;
}

/** Circular progress. Starts at 12 o'clock and fills clockwise in LTR, counter-clockwise in RTL. */
export function ProgressRing({
  value,
  label,
  size = 120,
  stroke = 10,
  className,
  trackClassName = 'stroke-sunken',
  indicatorClassName = 'stroke-primary',
  children,
}: ProgressRingProps) {
  const v = clamp(value);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 rtl:-scale-y-100" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={trackClassName} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className={indicatorClassName}
        />
      </svg>
      {children ? <div className="absolute inset-0 grid place-items-center">{children}</div> : null}
    </div>
  );
}
