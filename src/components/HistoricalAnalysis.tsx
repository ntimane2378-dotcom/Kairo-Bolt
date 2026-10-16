import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, BookOpen, Newspaper, ShieldAlert } from 'lucide-react';
import type { HistoricalDataPoint, NewsItem } from '@/types';
import { formatCurrency, formatPct } from '@/lib/format';

interface HistoricalAnalysisProps {
  history: HistoricalDataPoint[];
  news: NewsItem[];
}

export function HistoricalAnalysis({ history, news }: HistoricalAnalysisProps) {
  const analysis = useMemo(() => {
    if (history.length < 8) return null;
    let largestMove = { start: history[0], end: history[7], change: 0 };
    for (let index = 7; index < history.length; index += 1) {
      const start = history[index - 7];
      const end = history[index];
      const change = (end.price - start.price) / start.price;
      if (Math.abs(change) > Math.abs(largestMove.change)) largestMove = { start, end, change };
    }
    const latest = history[history.length - 1].price;
    const first = history[Math.max(0, history.length - 8)].price;
    const recentChange = (latest - first) / first;
    const positiveNews = news.filter((item) => item.sentiment === 'positive').length;
    const negativeNews = news.filter((item) => item.sentiment === 'negative').length;
    const direction = largestMove.change >= 0 ? 'up' : 'down';
    return { largestMove, recentChange, direction, positiveNews, negativeNews };
  }, [history, news]);

  if (!analysis) return null;
  const moveColor = analysis.direction === 'up' ? 'text-emerald-400' : 'text-red-400';
  const MoveIcon = analysis.direction === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center"><BookOpen size={18} className="text-amber-400" /></div>
        <div><h2 className="text-lg font-semibold text-slate-200">Historical move explainer</h2><p className="text-xs text-slate-500 mt-1">A data-led explanation of where the biggest recent move happened.</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="p-4 rounded-lg bg-slate-800/50"><p className="text-xs text-slate-500">Largest 7-day move</p><p className={`flex items-center gap-1 text-xl font-bold mt-1 ${moveColor}`}><MoveIcon size={18} /> {formatPct(analysis.largestMove.change * 100)}</p><p className="text-xs text-slate-600 mt-1">{new Date(analysis.largestMove.start.timestamp).toLocaleDateString()} to {new Date(analysis.largestMove.end.timestamp).toLocaleDateString()}</p></div>
        <div className="p-4 rounded-lg bg-slate-800/50"><p className="text-xs text-slate-500">Recent 7-day change</p><p className={`text-xl font-bold mt-1 ${analysis.recentChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPct(analysis.recentChange * 100)}</p><p className="text-xs text-slate-600 mt-1">Latest observed price {formatCurrency(history[history.length - 1].price)}</p></div>
        <div className="p-4 rounded-lg bg-slate-800/50"><p className="text-xs text-slate-500">News tone in current feed</p><p className="text-xl font-bold text-slate-200 mt-1">{analysis.positiveNews} / {analysis.negativeNews}</p><p className="text-xs text-slate-600 mt-1">Positive versus negative headlines</p></div>
      </div>

      <div className="space-y-3 text-sm leading-relaxed">
        <div className="flex items-start gap-2 text-slate-300"><MoveIcon size={16} className={`${moveColor} mt-0.5 flex-shrink-0`} /><p>The strongest observed move was <strong className={moveColor}>{analysis.direction}</strong> by {formatPct(Math.abs(analysis.largestMove.change) * 100)} over seven days. That identifies the period to investigate rather than assuming every day had the same cause.</p></div>
        <div className="flex items-start gap-2 text-slate-400"><Newspaper size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" /><p>{analysis.positiveNews || analysis.negativeNews ? `The current headline set contains ${analysis.positiveNews} positive and ${analysis.negativeNews} negative items, which provides context around sentiment.` : 'There is not enough headline sentiment to connect the move to a news theme.'}</p></div>
        <div className="flex items-start gap-2 text-slate-500"><ShieldAlert size={16} className="text-amber-400 mt-0.5 flex-shrink-0" /><p>Price movement and headlines are correlated context, not proof of causation. Use the dated price window, technical indicators, and linked source articles together when reviewing what happened.</p></div>
      </div>
    </section>
  );
}
