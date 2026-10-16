export function formatCurrency(value: number, opts?: { compact?: boolean; decimals?: number }): string {
  if (value === null || value === undefined || isNaN(value)) return '—';

  const compact = opts?.compact ?? false;
  const decimals = opts?.decimals ?? (value < 1 ? 6 : value < 100 ? 2 : 2);

  if (compact) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  }

  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })}`;
}

export function formatNumber(value: number, compact = false): string {
  if (value === null || value === undefined || isNaN(value)) return '—';

  if (compact) {
    if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
