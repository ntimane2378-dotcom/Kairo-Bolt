import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft, Loader2, AlertCircle, Star, Bell, TrendingUp, TrendingDown,
  Target, Activity, Zap, Brain, ChevronRight,
} from 'lucide-react';
import type { MarketAsset, Prediction, HistoricalDataPoint, NewsItem } from '@/types';
import { formatCurrency, formatPct } from '@/lib/format';
import { fetchCryptoHistory, fetchCryptoByid } from '@/lib/crypto-api';
import { fetchStockHistory, fetchStockBySymbol, fetchAssetNews } from '@/lib/stock-api';
import { generatePrediction } from '@/lib/analysis';
import { isInWatchlist, addToWatchlist, removeFromWatchlist, createPriceAlert, savePredictionRecord } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { PriceChart, ScenarioChart } from './Charts';
import { NewsPanel } from './NewsPanel';
import { HistoricalAnalysis } from './HistoricalAnalysis';

interface AssetDetailProps {
  asset: MarketAsset;
  onBack: () => void;
  onWatchlistChange: () => void;
}

type TimeRange = '1M' | '3M' | '6M' | '1Y';

export function AssetDetail({ asset, onBack, onWatchlistChange }: AssetDetailProps) {
  const [history, setHistory] = useState<HistoricalDataPoint[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>('above');
  const [activeScenario, setActiveScenario] = useState(0);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);

  useEffect(() => {
    isInWatchlist(asset.id).then(setInWatchlist).catch(() => false);
  }, [asset.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNewsLoading(true);
    setNewsError(null);
    try {
      let fullAsset = asset;
      if (asset.currentPrice === 0) {
        if (asset.type === 'crypto') {
          fullAsset = (await fetchCryptoByid(asset.id)) || asset;
        } else {
          fullAsset = (await fetchStockBySymbol(asset.id)) || asset;
        }
      }

      const days = timeRange === '1M' ? 30 : timeRange === '3M' ? 90 : timeRange === '6M' ? 180 : 365;
      let hist: HistoricalDataPoint[];
      if (asset.type === 'crypto') {
        hist = await fetchCryptoHistory(asset.id, days);
      } else {
        hist = await fetchStockHistory(asset.id, timeRange);
      }
      setHistory(hist);

      try {
        const liveNews = await fetchAssetNews(asset.symbol, asset.type, asset.name);
        setNews(liveNews);
      } catch (newsFetchError) {
        setNews([]);
        setNewsError(newsFetchError instanceof Error ? newsFetchError.message : 'Unable to load news');
      } finally {
        setNewsLoading(false);
      }

      if (hist.length > 5) {
        const pred = generatePrediction(hist, fullAsset.currentPrice, fullAsset.name, fullAsset.type);
        setPrediction(pred);
        savePredictionRecord(fullAsset, pred).catch(() => undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setNewsLoading(false);
    }
  }, [asset, timeRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const chartData = useMemo(() => history.map((h) => h.price), [history]);

  const handleToggleWatchlist = async () => {
    try {
      if (inWatchlist) {
        const { data } = await supabase.from('watchlist').select('id').eq('asset_id', asset.id).maybeSingle();
        if (data) await removeFromWatchlist(data.id);
        setInWatchlist(false);
      } else {
        await addToWatchlist(asset);
        setInWatchlist(true);
      }
      onWatchlistChange();
    } catch { /* ignore */ }
  };

  const handleCreateAlert = async () => {
    const price = parseFloat(alertPrice);
    if (!price) return;
    try {
      await createPriceAlert(asset, price, alertDirection);
      setShowAlertModal(false);
      setAlertPrice('');
    } catch { /* ignore */ }
  };

  const recommendationColors: Record<string, string> = {
    'Strong Buy': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Buy': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Hold': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Sell': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Strong Sell': 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const scenarioColors: Record<string, string> = {
    bull: 'border-emerald-500/40 bg-emerald-950/30',
    neutral: 'border-yellow-500/40 bg-yellow-950/30',
    bear: 'border-red-500/40 bg-red-950/30',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="text-red-500" size={40} />
        <p className="text-slate-400">{error}</p>
        <button onClick={onBack} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
      >
        <ArrowLeft size={18} /> Back to Markets
      </button>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {asset.image ? (
              <img src={asset.image} alt={asset.name} className="w-14 h-14 rounded-full bg-slate-800" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg">
                {asset.symbol.slice(0, 2)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-100">{asset.name}</h1>
                <span className={`text-xs px-2 py-1 rounded ${asset.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  {asset.type === 'crypto' ? 'CRYPTO' : 'STOCK'}
                </span>
              </div>
              <p className="text-slate-500 text-sm">{asset.symbol}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAlertModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors text-sm"
            >
              <Bell size={16} /> Set Alert
            </button>
            <button
              onClick={handleToggleWatchlist}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors text-sm"
            >
              <Star size={16} className={inWatchlist ? 'fill-yellow-400 text-yellow-400' : ''} />
              {inWatchlist ? 'In Watchlist' : 'Watchlist'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-3xl font-bold text-slate-100 tabular-nums">{formatCurrency(asset.currentPrice)}</p>
            <div className={`flex items-center gap-1 mt-1 ${asset.priceChangePercentage24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {asset.priceChangePercentage24h >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="tabular-nums">{formatPct(asset.priceChangePercentage24h)}</span>
              <span className="text-slate-500 text-sm ml-1">24h</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 min-w-[300px]">
            <div>
              <p className="text-xs text-slate-500">Market Cap</p>
              <p className="text-sm text-slate-300 tabular-nums">{formatCurrency(asset.marketCap, { compact: true })}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">24h High</p>
              <p className="text-sm text-slate-300 tabular-nums">{formatCurrency(asset.high24h)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">24h Low</p>
              <p className="text-sm text-slate-300 tabular-nums">{formatCurrency(asset.low24h)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Volume</p>
              <p className="text-sm text-slate-300 tabular-nums">{formatCurrency(asset.volume24h, { compact: true })}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <Activity size={18} className="text-blue-400" /> Price History
          </h2>
          <div className="flex gap-1 bg-slate-800/50 rounded-lg p-1">
            {(['1M', '3M', '6M', '1Y'] as TimeRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  timeRange === r ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <PriceChart data={chartData} color="auto" className="w-full h-auto" />
      </div>

      <NewsPanel items={news} loading={newsLoading} error={newsError} />

      <HistoricalAnalysis history={history} news={news} />

      {prediction && (
        <>
          <div className="bg-gradient-to-br from-slate-900/80 to-blue-950/30 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="text-blue-400" size={20} />
              <h2 className="text-lg font-semibold text-slate-200">AI Prediction & Analysis</h2>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-shrink-0 space-y-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${recommendationColors[prediction.recommendation]}`}>
                  <Target size={18} />
                  <span className="font-bold text-lg">{prediction.recommendation}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Confidence Score</p>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${prediction.confidenceScore}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-300 tabular-nums">{prediction.confidenceScore}%</span>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-sm text-slate-300 leading-relaxed">{prediction.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
              {prediction.signals.map((sig) => (
                <div key={sig.name} className={`p-3 rounded-lg border ${
                  sig.signal === 'bullish' ? 'border-emerald-500/20 bg-emerald-950/20' :
                  sig.signal === 'bearish' ? 'border-red-500/20 bg-red-950/20' :
                  'border-slate-700 bg-slate-800/50'
                }`}>
                  <p className="text-xs text-slate-500 mb-1">{sig.name}</p>
                  <p className="text-sm text-slate-300 tabular-nums">{sig.value}</p>
                  <p className={`text-xs mt-1 font-medium ${
                    sig.signal === 'bullish' ? 'text-emerald-400' :
                    sig.signal === 'bearish' ? 'text-red-400' : 'text-yellow-400'
                  }`}>{sig.signal}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-4">
              <Zap size={18} className="text-yellow-400" /> 3 Possible Market Scenarios
            </h2>

            <div className="flex gap-2 mb-4">
              {prediction.scenarios.map((s, i) => (
                <button
                  key={s.type}
                  onClick={() => setActiveScenario(i)}
                  className={`flex-1 p-3 rounded-lg border transition-all text-left ${
                    activeScenario === i ? scenarioColors[s.type] : 'border-slate-800 bg-slate-800/30 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-slate-200">{s.label}</span>
                    <span className={`text-xs font-bold ${
                      s.type === 'bull' ? 'text-emerald-400' : s.type === 'bear' ? 'text-red-400' : 'text-yellow-400'
                    }`}>{s.probability}%</span>
                  </div>
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>1W: {formatPct(s.shortTerm.changePct)}</span>
                    <span>1M: {formatPct(s.midTerm.changePct)}</span>
                    <span>3M: {formatPct(s.longTerm.changePct)}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mb-4">
              <ScenarioChart
                scenarios={prediction.scenarios.map(s => ({
                  shortTerm: s.shortTerm.price,
                  midTerm: s.midTerm.price,
                  longTerm: s.longTerm.price,
                  type: s.type,
                }))}
                currentPrice={asset.currentPrice}
                className="w-full h-auto"
              />
            </div>

            {prediction.scenarios[activeScenario] && (
              <div className={`p-4 rounded-lg border ${scenarioColors[prediction.scenarios[activeScenario].type]}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-200">
                    {prediction.scenarios[activeScenario].label}
                  </h3>
                  <span className={`text-2xl font-bold ${
                    prediction.scenarios[activeScenario].type === 'bull' ? 'text-emerald-400' :
                    prediction.scenarios[activeScenario].type === 'bear' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {prediction.scenarios[activeScenario].probability}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: '1 Week', data: prediction.scenarios[activeScenario].shortTerm },
                    { label: '1 Month', data: prediction.scenarios[activeScenario].midTerm },
                    { label: '3 Months', data: prediction.scenarios[activeScenario].longTerm },
                  ].map(({ label, data }) => (
                    <div key={label} className="text-center p-3 bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-sm font-medium text-slate-200 tabular-nums">{formatCurrency(data.price)}</p>
                      <p className={`text-xs tabular-nums ${data.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatPct(data.changePct)}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                  {prediction.scenarios[activeScenario].rationale}
                </p>

                <div>
                  <p className="text-xs text-slate-500 mb-2">Key Factors:</p>
                  <ul className="space-y-1">
                    {prediction.scenarios[activeScenario].keyFactors.map((factor, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <ChevronRight size={14} className="text-slate-600 mt-0.5 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">Technical Indicators</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'RSI (14)', value: prediction.indicators.rsi.toFixed(2), hint: prediction.indicators.rsi < 30 ? 'Oversold' : prediction.indicators.rsi > 70 ? 'Overbought' : 'Neutral' },
                { label: 'MACD', value: prediction.indicators.macd.toFixed(4), hint: prediction.indicators.macdHistogram > 0 ? 'Bullish' : 'Bearish' },
                { label: 'SMA 20', value: formatCurrency(prediction.indicators.sma20), hint: asset.currentPrice > prediction.indicators.sma20 ? 'Above' : 'Below' },
                { label: 'SMA 50', value: formatCurrency(prediction.indicators.sma50), hint: asset.currentPrice > prediction.indicators.sma50 ? 'Above' : 'Below' },
                { label: 'EMA 12', value: formatCurrency(prediction.indicators.ema12), hint: 'Short-term' },
                { label: 'EMA 26', value: formatCurrency(prediction.indicators.ema26), hint: 'Long-term' },
                { label: 'Bollinger Upper', value: formatCurrency(prediction.indicators.bollingerUpper), hint: 'Resistance' },
                { label: 'Bollinger Lower', value: formatCurrency(prediction.indicators.bollingerLower), hint: 'Support' },
                { label: 'Stochastic', value: prediction.indicators.stochastic.toFixed(2), hint: prediction.indicators.stochastic < 20 ? 'Oversold' : prediction.indicators.stochastic > 80 ? 'Overbought' : 'Neutral' },
                { label: 'ATR', value: prediction.indicators.atr.toFixed(4), hint: 'Volatility' },
                { label: 'BB Middle', value: formatCurrency(prediction.indicators.bollingerMiddle), hint: 'Mean' },
                { label: 'MACD Signal', value: prediction.indicators.macdSignal.toFixed(4), hint: 'Signal Line' },
              ].map((ind) => (
                <div key={ind.label} className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">{ind.label}</p>
                  <p className="text-sm text-slate-200 tabular-nums">{ind.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{ind.hint}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showAlertModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAlertModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Set Price Alert for {asset.symbol}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Direction</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAlertDirection('above')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      alertDirection === 'above' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Above
                  </button>
                  <button
                    onClick={() => setAlertDirection('below')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      alertDirection === 'below' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Below
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">Target Price (USD)</label>
                <input
                  type="number"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(e.target.value)}
                  placeholder={asset.currentPrice.toString()}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-blue-600"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">Current price: {formatCurrency(asset.currentPrice)}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAlertModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAlert}
                  disabled={!alertPrice}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                >
                  Create Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
