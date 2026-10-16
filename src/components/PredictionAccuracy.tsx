import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, CircleHelp, Loader2, RefreshCw, Target, TrendingDown, TrendingUp } from 'lucide-react';
import type { PredictionRecord } from '@/types';
import { getPredictionRecords, evaluateDuePredictions } from '@/lib/db';
import { formatCurrency, formatPct } from '@/lib/format';
import type { MarketAsset } from '@/types';

interface PredictionAccuracyProps {
  currentAssets: MarketAsset[];
  refreshTrigger: number;
}

export function PredictionAccuracy({ currentAssets, refreshTrigger }: PredictionAccuracyProps) {
  const [records, setRecords] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await evaluateDuePredictions(currentAssets);
      setRecords(await getPredictionRecords());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load prediction history');
    } finally {
      setLoading(false);
    }
  }, [currentAssets]);

  useEffect(() => { loadRecords(); }, [loadRecords, refreshTrigger]);

  const evaluated = useMemo(() => records.filter((record) => record.outcome_correct !== null), [records]);
  const correct = evaluated.filter((record) => record.outcome_correct).length;
  const accuracy = evaluated.length ? Math.round((correct / evaluated.length) * 100) : null;
  const pending = records.length - evaluated.length;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Prediction Track Record</h1>
          <p className="text-sm text-slate-500 mt-1">A transparent scorecard of Kairo’s directional calls.</p>
        </div>
        <button onClick={loadRecords} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition-colors">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><BadgeCheck size={16} className="text-cyan-400" /> Verified accuracy</div>
          <p className="text-3xl font-bold text-slate-100 mt-3">{accuracy === null ? '—' : `${accuracy}%`}</p>
          <p className="text-xs text-slate-600 mt-1">{evaluated.length ? `${correct} correct of ${evaluated.length}` : 'Waiting for the first seven-day reviews'}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Target size={16} className="text-blue-400" /> Calls recorded</div>
          <p className="text-3xl font-bold text-slate-100 mt-3">{records.length}</p>
          <p className="text-xs text-slate-600 mt-1">Every new asset analysis creates a seven-day call</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><CircleHelp size={16} className="text-amber-400" /> In review</div>
          <p className="text-3xl font-bold text-slate-100 mt-3">{pending}</p>
          <p className="text-xs text-slate-600 mt-1">These calls need more time before scoring</p>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-3 text-sm text-red-300">{error}</div>}

      <div className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-5 text-sm text-slate-400 leading-relaxed">
        <p className="font-medium text-slate-200 mb-1">How Kairo scores itself</p>
        <p>Each call predicts a direction over seven days. A move above 1% is bullish, below -1% is bearish, and anything between is treated as neutral. Neutral calls receive credit when the move stays within 3%. This is a directional research metric, not a promise of returns.</p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800"><h2 className="font-semibold text-slate-200">Reviewed predictions</h2></div>
        {evaluated.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No predictions have reached their review date yet. Open an asset and Kairo will begin building the record.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {evaluated.slice(0, 20).map((record) => {
              const move = record.evaluated_price && record.price_at_prediction
                ? (record.evaluated_price - record.price_at_prediction) / record.price_at_prediction * 100
                : 0;
              return (
                <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${record.outcome_correct ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {move >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
                    </div>
                    <div><p className="font-medium text-slate-200">{record.symbol} <span className="text-slate-500 font-normal">· {record.recommendation}</span></p><p className="text-xs text-slate-500">{new Date(record.created_at).toLocaleDateString()} · {record.outcome_correct ? 'Correct call' : 'Missed call'}</p></div>
                  </div>
                  <div className="text-left sm:text-right"><p className={`font-medium tabular-nums ${move >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatPct(move)}</p><p className="text-xs text-slate-600">{formatCurrency(record.price_at_prediction)} → {record.evaluated_price ? formatCurrency(record.evaluated_price) : '—'}</p></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
