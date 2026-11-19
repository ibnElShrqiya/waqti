import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-premium active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-fg shadow-xs hover:bg-primary/90',
  secondary: 'bg-primary-soft text-primary hover:bg-primary-soft/70 dark:text-primary-strong',
  outline: 'border border-line bg-surface text-ink shadow-xs hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-ink-muted hover:bg-sunken/70 hover:text-ink',
  accent: 'bg-accent text-accent-fg shadow-xs hover:bg-accent/90',
  danger: 'bg-danger text-white shadow-xs hover:bg-danger/90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-lg px-3 text-xs [&_svg]:size-3.5',
  md: 'h-10 rounded-xl px-4 text-sm [&_svg]:size-4',
  lg: 'h-12 rounded-xl px-5 text-[0.9375rem] [&_svg]:size-[1.125rem]',
  icon: 'size-10 rounded-xl [&_svg]:size-[1.125rem]',
  'icon-sm': 'size-8 rounded-lg [&_svg]:size-4',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, loading, leadingIcon, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : leadingIcon}
      {children}
    </button>
  );
});

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
}

/** A router link styled as a button. */
export function ButtonLink({ variant, size, leadingIcon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonStyles({ variant, size, className })} {...props}>
      {leadingIcon}
      {children}
    </Link>
  );
}
