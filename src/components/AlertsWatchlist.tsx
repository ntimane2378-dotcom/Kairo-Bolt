import { useState, useEffect, useCallback } from 'react';
import { Bell, Star, Trash2, Loader2, RefreshCw, TrendingUp, TrendingDown, Pause, Play, CheckCircle2 } from 'lucide-react';
import type { PriceAlert, WatchlistItem, MarketAsset } from '@/types';
import {
  getPriceAlerts, deletePriceAlert, toggleAlertActive,
  getWatchlist, removeFromWatchlist,
} from '@/lib/db';
import { formatCurrency } from '@/lib/format';

interface AlertsWatchlistProps {
  onAssetClick: (asset: MarketAsset) => void;
  refreshTrigger: number;
}

type Tab = 'alerts' | 'watchlist';

export function AlertsWatchlist({ onAssetClick, refreshTrigger }: AlertsWatchlistProps) {
  const [tab, setTab] = useState<Tab>('alerts');
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [a, w] = await Promise.all([getPriceAlerts(), getWatchlist()]);
      setAlerts(a);
      setWatchlist(w);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData, refreshTrigger]);

  const handleDeleteAlert = async (id: string) => {
    await deletePriceAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleToggleAlert = async (id: string, active: boolean) => {
    await toggleAlertActive(id, active);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, active } : a));
  };

  const handleRemoveFromWatchlist = async (id: string) => {
    await removeFromWatchlist(id);
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Alerts & Watchlist</h1>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors text-sm"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="flex gap-1 bg-slate-900/80 border border-slate-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('alerts')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'alerts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bell size={16} /> Alerts
          {alerts.length > 0 && (
            <span className={`text-xs px-1.5 rounded-full ${tab === 'alerts' ? 'bg-blue-800' : 'bg-slate-700'}`}>
              {alerts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('watchlist')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'watchlist' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star size={16} /> Watchlist
          {watchlist.length > 0 && (
            <span className={`text-xs px-1.5 rounded-full ${tab === 'watchlist' ? 'bg-blue-800' : 'bg-slate-700'}`}>
              {watchlist.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'alerts' && (
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Bell size={48} className="mb-4 opacity-50" />
              <p className="mb-2">No price alerts yet</p>
              <p className="text-sm text-slate-600">Use the AI assistant or visit any asset to set alerts</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-slate-900/80 border rounded-xl p-4 flex items-center justify-between transition-all ${
                  alert.triggered ? 'border-blue-500/40 bg-blue-950/20' :
                  alert.active ? 'border-slate-800' : 'border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    alert.direction === 'above' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                  }`}>
                    {alert.direction === 'above' ? <TrendingUp size={18} className="text-emerald-400" /> : <TrendingDown size={18} className="text-red-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{alert.symbol}</span>
                      {alert.triggered && <CheckCircle2 size={16} className="text-blue-400" />}
                    </div>
                    <p className="text-sm text-slate-500">
                      {alert.triggered ? 'Triggered' : alert.active ? 'Active' : 'Paused'} —
                      {' '}Notify when {alert.direction} {formatCurrency(alert.target_price)}
                    </p>
                    {alert.current_price && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Set when price was {formatCurrency(alert.current_price)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!alert.triggered && (
                    <button
                      onClick={() => handleToggleAlert(alert.id, !alert.active)}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
                      title={alert.active ? 'Pause' : 'Resume'}
                    >
                      {alert.active ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-2 rounded-lg hover:bg-red-950/50 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'watchlist' && (
        <div className="space-y-3">
          {watchlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Star size={48} className="mb-4 opacity-50" />
              <p className="mb-2">Your watchlist is empty</p>
              <p className="text-sm text-slate-600">Add assets from the dashboard or ask the AI assistant</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlist.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all cursor-pointer group"
                  onClick={() => onAssetClick({
                    id: item.asset_id,
                    symbol: item.symbol,
                    name: item.name,
                    image: item.image || '',
                    currentPrice: 0,
                    marketCap: 0,
                    priceChange24h: 0,
                    priceChangePercentage24h: 0,
                    high24h: 0,
                    low24h: 0,
                    volume24h: 0,
                    type: item.asset_type,
                  })}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-10 h-10 rounded-full bg-slate-800" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                          {item.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-100">{item.symbol}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${item.asset_type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {item.asset_type === 'crypto' ? 'CRYPTO' : 'STOCK'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{item.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveFromWatchlist(item.id); }}
                      className="p-2 rounded-lg hover:bg-red-950/50 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
