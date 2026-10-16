import { useState, useEffect, useMemo } from 'react';
import { Search, TrendingUp, BarChart3, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { MarketAsset } from '@/types';
import { fetchTopCryptos } from '@/lib/crypto-api';
import { fetchTopStocks } from '@/lib/stock-api';
import { AssetCard } from './AssetCard';

interface DashboardProps {
  onAssetClick: (asset: MarketAsset) => void;
  watchlistIds: Set<string>;
  onToggleWatchlist: (asset: MarketAsset) => void;
}

type TabType = 'all' | 'crypto' | 'stock';
type SortType = 'market_cap' | 'price_change' | 'volume';

export function Dashboard({ onAssetClick, watchlistIds, onToggleWatchlist }: DashboardProps) {
  const [assets, setAssets] = useState<MarketAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>('all');
  const [sort, setSort] = useState<SortType>('market_cap');
  const [search, setSearch] = useState('');

  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cryptos, stocks] = await Promise.all([
        fetchTopCryptos(30),
        fetchTopStocks(),
      ]);
      setAssets([...cryptos, ...stocks]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssets(); }, []);

  const filteredAssets = useMemo(() => {
    let result = assets;
    if (tab === 'crypto') result = result.filter((a) => a.type === 'crypto');
    else if (tab === 'stock') result = result.filter((a) => a.type === 'stock');
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      if (sort === 'market_cap') return b.marketCap - a.marketCap;
      if (sort === 'price_change') return b.priceChangePercentage24h - a.priceChangePercentage24h;
      return b.volume24h - a.volume24h;
    });
    return result;
  }, [assets, tab, search, sort]);

  const topGainers = useMemo(() =>
    [...assets].sort((a, b) => b.priceChangePercentage24h - a.priceChangePercentage24h).slice(0, 5),
    [assets]
  );

  const topLosers = useMemo(() =>
    [...assets].sort((a, b) => a.priceChangePercentage24h - b.priceChangePercentage24h).slice(0, 5),
    [assets]
  );

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
        <button onClick={loadAssets} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Market Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time crypto & stock market data with AI predictions</p>
        </div>
        <button
          onClick={loadAssets}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors text-sm"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-emerald-400" size={18} />
            <h3 className="font-semibold text-slate-200">Top Gainers (24h)</h3>
          </div>
          <div className="space-y-2">
            {topGainers.map((a) => (
              <div
                key={`gainer-${a.id}`}
                onClick={() => onAssetClick(a)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                {a.image ? (
                  <img src={a.image} alt={a.name} className="w-6 h-6 rounded-full bg-slate-800" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{a.symbol.slice(0, 2)}</div>
                )}
                  <span className="text-sm text-slate-300">{a.symbol}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-slate-300 tabular-nums">${a.currentPrice.toLocaleString()}</span>
                  <span className="ml-2 text-sm text-emerald-400 tabular-nums">+{a.priceChangePercentage24h.toFixed(2)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-red-400 rotate-180" size={18} />
            <h3 className="font-semibold text-slate-200">Top Losers (24h)</h3>
          </div>
          <div className="space-y-2">
            {topLosers.map((a) => (
              <div
                key={`loser-${a.id}`}
                onClick={() => onAssetClick(a)}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                {a.image ? (
                  <img src={a.image} alt={a.name} className="w-6 h-6 rounded-full bg-slate-800" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">{a.symbol.slice(0, 2)}</div>
                )}
                  <span className="text-sm text-slate-300">{a.symbol}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-slate-300 tabular-nums">${a.currentPrice.toLocaleString()}</span>
                  <span className="ml-2 text-sm text-red-400 tabular-nums">{a.priceChangePercentage24h.toFixed(2)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-slate-900/80 border border-slate-800 rounded-lg p-1">
          {(['all', 'crypto', 'stock'] as TabType[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'all' ? 'All Markets' : t}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-600 w-48 sm:w-56"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-600"
          >
            <option value="market_cap">Market Cap</option>
            <option value="price_change">Price Change</option>
            <option value="volume">Volume</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredAssets.map((asset) => (
          <AssetCard
            key={`${asset.type}-${asset.id}`}
            asset={asset}
            onClick={() => onAssetClick(asset)}
            inWatchlist={watchlistIds.has(asset.id)}
            onToggleWatchlist={() => onToggleWatchlist(asset)}
          />
        ))}
      </div>

      {filteredAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <BarChart3 size={48} className="mb-4 opacity-50" />
          <p>No assets found matching your search.</p>
        </div>
      )}
    </div>
  );
}
