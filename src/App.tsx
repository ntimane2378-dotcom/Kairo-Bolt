import { useState, useEffect, useCallback } from 'react';
import { LineChart, Sparkles, Bell, Menu, X, BadgeCheck } from 'lucide-react';
import type { MarketAsset, AssetType } from '@/types';
import { Dashboard } from './components/Dashboard';
import { AssetDetail } from './components/AssetDetail';
import { AIAssistant } from './components/AIAssistant';
import { AlertsWatchlist } from './components/AlertsWatchlist';
import { PredictionAccuracy } from './components/PredictionAccuracy';
import { getWatchlist, addToWatchlist, removeFromWatchlist, checkAlerts, evaluateDuePredictions } from './lib/db';
import { fetchTopCryptos } from './lib/crypto-api';
import { fetchTopStocks } from './lib/stock-api';
import { formatCurrency } from './lib/format';

type View = 'dashboard' | 'asset' | 'alerts' | 'accuracy';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allAssets, setAllAssets] = useState<MarketAsset[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<{ symbol: string; direction: string; price: number }[]>([]);

  const loadWatchlistIds = useCallback(async () => {
    try {
      const items = await getWatchlist();
      setWatchlistIds(new Set(items.map((i) => i.asset_id)));
    } catch { /* ignore */ }
  }, []);

  const loadAllAssets = useCallback(async () => {
    try {
      const [cryptos, stocks] = await Promise.all([
        fetchTopCryptos(30).catch(() => [] as MarketAsset[]),
        fetchTopStocks().catch(() => [] as MarketAsset[]),
      ]);
      const nextAssets = [...cryptos, ...stocks];
      setAllAssets(nextAssets);
      await evaluateDuePredictions(nextAssets);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadWatchlistIds();
    loadAllAssets();
  }, [loadWatchlistIds, loadAllAssets, refreshTrigger]);

  useEffect(() => {
    if (allAssets.length === 0) return;
    const interval = setInterval(async () => {
      const triggered = await checkAlerts(allAssets);
      if (triggered.length > 0) {
        setTriggeredAlerts(triggered.map((a) => ({
          symbol: a.symbol,
          direction: a.direction,
          price: a.target_price,
        })));
        setRefreshTrigger((p) => p + 1);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [allAssets]);

  const handleAssetClick = (asset: MarketAsset) => {
    setSelectedAsset(asset);
    setView('asset');
    setMobileNavOpen(false);
  };

  const handleNavigate = (id: string, type: string) => {
    const asset = allAssets.find((a) => a.id === id);
    if (asset) {
      handleAssetClick(asset);
    } else {
      setSelectedAsset({
        id,
        symbol: id.toUpperCase(),
        name: id.toUpperCase(),
        image: '',
        currentPrice: 0,
        marketCap: 0,
        priceChange24h: 0,
        priceChangePercentage24h: 0,
        high24h: 0,
        low24h: 0,
        volume24h: 0,
        type: type as AssetType,
      });
      setView('asset');
    }
  };

  const handleToggleWatchlist = async (asset: MarketAsset) => {
    try {
      if (watchlistIds.has(asset.id)) {
        const items = await getWatchlist();
        const item = items.find((i) => i.asset_id === asset.id);
        if (item) await removeFromWatchlist(item.id);
        setWatchlistIds((prev) => {
          const next = new Set(prev);
          next.delete(asset.id);
          return next;
        });
      } else {
        await addToWatchlist(asset);
        setWatchlistIds((prev) => new Set(prev).add(asset.id));
      }
    } catch { /* ignore */ }
  };

  const navItems = [
    { id: 'dashboard' as View, label: 'Markets', icon: LineChart },
    { id: 'alerts' as View, label: 'Alerts & Watchlist', icon: Bell },
    { id: 'accuracy' as View, label: 'Track Record', icon: BadgeCheck },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/kairo_gold_black_cutout.png" alt="Kairo" className="w-10 h-10 rounded-xl object-cover bg-black" />
            <div>
              <h1 className="font-bold text-slate-100 leading-none">Kairo</h1>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Market Intelligence</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    view === item.id || (item.id === 'dashboard' && view === 'asset')
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={16} /> {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg text-white text-sm font-medium transition-all shadow-lg shadow-blue-950/30"
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-800 text-slate-400"
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <nav className="md:hidden border-t border-slate-800 px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); setMobileNavOpen(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    view === item.id ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon size={16} /> {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {triggeredAlerts.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          {triggeredAlerts.map((a, i) => (
            <div
              key={i}
              className="bg-blue-950/50 border border-blue-500/30 rounded-lg p-3 mb-2 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 text-sm">
                <Bell size={16} className="text-blue-400" />
                <span className="text-slate-200">
                  <strong>{a.symbol}</strong> has {a.direction} {formatCurrency(a.price)}!
                </span>
              </div>
              <button
                onClick={() => setTriggeredAlerts((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {view === 'dashboard' && (
          <Dashboard
            onAssetClick={handleAssetClick}
            watchlistIds={watchlistIds}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}

        {view === 'asset' && selectedAsset && (
          <AssetDetail
            asset={selectedAsset}
            onBack={() => setView('dashboard')}
            onWatchlistChange={loadWatchlistIds}
          />
        )}

        {view === 'alerts' && (
          <AlertsWatchlist
            onAssetClick={handleAssetClick}
            refreshTrigger={refreshTrigger}
          />
        )}

        {view === 'accuracy' && (
          <PredictionAccuracy
            currentAssets={allAssets}
            refreshTrigger={refreshTrigger}
          />
        )}
      </main>

      <AIAssistant
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onNavigate={handleNavigate}
        onAlertCreated={() => setRefreshTrigger((p) => p + 1)}
        onWatchlistChanged={loadWatchlistIds}
      />

      <footer className="border-t border-slate-800 py-4 px-4 sm:px-6 text-center text-xs text-slate-600">
        <p>Kairo — market intelligence for crypto & stocks. Analysis is informational and not financial advice.</p>
      </footer>
    </div>
  );
}

export default App;
