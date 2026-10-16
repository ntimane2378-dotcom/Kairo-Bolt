import { useState } from 'react';
import { TrendingUp, TrendingDown, Star } from 'lucide-react';
import type { MarketAsset } from '@/types';
import { formatCurrency, formatPct } from '@/lib/format';
import { Sparkline } from './Charts';

interface AssetCardProps {
  asset: MarketAsset;
  onClick: () => void;
  inWatchlist?: boolean;
  onToggleWatchlist?: () => void;
}

export function AssetCard({ asset, onClick, inWatchlist, onToggleWatchlist }: AssetCardProps) {
  const [imgError, setImgError] = useState(false);
  const isPositive = asset.priceChangePercentage24h >= 0;

  return (
    <div
      onClick={onClick}
      className="group relative bg-slate-900/80 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all duration-200 cursor-pointer hover:bg-slate-800/80 hover:shadow-lg hover:shadow-blue-950/30"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {asset.image && !imgError ? (
            <img
              src={asset.image}
              alt={asset.name}
              className="w-10 h-10 rounded-full bg-slate-800"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
              {asset.symbol.slice(0, 2)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100">{asset.symbol}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${asset.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {asset.type === 'crypto' ? 'CRYPTO' : 'STOCK'}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-[140px]">{asset.name}</p>
          </div>
        </div>
        {onToggleWatchlist && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <Star
              size={16}
              className={inWatchlist ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600 hover:text-slate-400'}
            />
          </button>
        )}
      </div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-lg font-bold text-slate-100 tabular-nums">{formatCurrency(asset.currentPrice)}</p>
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span className="tabular-nums">{formatPct(asset.priceChangePercentage24h)}</span>
          </div>
        </div>
        {asset.sparkline && asset.sparkline.length > 2 && (
          <div className="w-24 h-8">
            <Sparkline data={asset.sparkline} color="auto" className="w-full h-full" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
        <div>
          <p className="text-slate-500">Market Cap</p>
          <p className="text-slate-300 tabular-nums">{formatCurrency(asset.marketCap, { compact: true })}</p>
        </div>
        <div>
          <p className="text-slate-500">24h High</p>
          <p className="text-slate-300 tabular-nums">{formatCurrency(asset.high24h)}</p>
        </div>
        <div>
          <p className="text-slate-500">24h Low</p>
          <p className="text-slate-300 tabular-nums">{formatCurrency(asset.low24h)}</p>
        </div>
      </div>
    </div>
  );
}
