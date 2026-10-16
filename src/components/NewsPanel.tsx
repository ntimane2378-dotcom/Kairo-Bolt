import { useMemo } from 'react';
import { ExternalLink, Newspaper, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { NewsItem } from '@/types';

interface NewsPanelProps {
  items: NewsItem[];
  loading: boolean;
  error: string | null;
}

function formatPublishedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const hours = Math.max(0, Math.round((Date.now() - date.getTime()) / 3600000));
  if (hours < 1) return 'Less than 1h ago';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function NewsPanel({ items, loading, error }: NewsPanelProps) {
  const counts = useMemo(() => items.reduce(
    (result, item) => ({ ...result, [item.sentiment]: result[item.sentiment] + 1 }),
    { positive: 0, negative: 0, neutral: 0 },
  ), [items]);

  const tone = counts.positive > counts.negative + 1
    ? { label: 'Positive tone', color: 'text-emerald-400', Icon: TrendingUp }
    : counts.negative > counts.positive + 1
      ? { label: 'Negative tone', color: 'text-red-400', Icon: TrendingDown }
      : { label: 'Mixed tone', color: 'text-amber-400', Icon: Minus };

  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper size={18} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-slate-200">Market context</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Recent headlines are shown as context, not a trading signal.</p>
        </div>
        {!loading && items.length > 0 && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${tone.color}`}>
            <tone.Icon size={14} /> {tone.label}
          </div>
        )}
      </div>

      {loading && <div className="space-y-3 animate-pulse"><div className="h-14 rounded-lg bg-slate-800" /><div className="h-14 rounded-lg bg-slate-800" /><div className="h-14 rounded-lg bg-slate-800" /></div>}
      {!loading && error && <p className="text-sm text-slate-500">News is temporarily unavailable. Technical analysis is still available below.</p>}
      {!loading && !error && items.length === 0 && <p className="text-sm text-slate-500">No recent headlines were found for this asset.</p>}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <a
              key={`${item.link}-${item.publishedAt}`}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 hover:border-slate-600 hover:bg-slate-800/60 transition-colors"
            >
              <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${item.sentiment === 'positive' ? 'bg-emerald-400' : item.sentiment === 'negative' ? 'bg-red-400' : 'bg-slate-500'}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-200 group-hover:text-white leading-snug">{item.title}</span>
                <span className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>{item.publisher}</span><span>•</span><span>{formatPublishedAt(item.publishedAt)}</span>
                </span>
              </span>
              <ExternalLink size={14} className="text-slate-600 group-hover:text-cyan-400 flex-shrink-0 mt-1" />
            </a>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-600">
        <span>Source: Yahoo Finance search news</span>
        <span>{items.length ? `${counts.positive} positive · ${counts.negative} negative · ${counts.neutral} neutral` : 'Live context'}</span>
      </div>
    </section>
  );
}
