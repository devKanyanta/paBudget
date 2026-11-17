/** The paBudget wordmark from the brand kit. Use `on-dark` over Forest or other dark grounds. */
export function Logo({ variant = 'primary', className = 'h-7' }: { variant?: 'primary' | 'on-dark' | 'mono-white'; className?: string }) {
  const file = { primary: 'paBudget-logo-primary', 'on-dark': 'paBudget-logo-on-dark', 'mono-white': 'paBudget-logo-mono-white' }[variant];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/brand/${file}.svg`} alt="paBudget" className={`w-auto ${className}`} />;
}
