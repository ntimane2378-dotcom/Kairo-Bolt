import type { MarketAsset, HistoricalDataPoint } from '@/types';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

interface CoinGeckoMarketResponse {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  circulating_supply: number;
  sparkline_in_7d?: { price: number[] };
}

export async function fetchTopCryptos(limit = 50): Promise<MarketAsset[]> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true&price_change_percentage=24h`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  const data: CoinGeckoMarketResponse[] = await res.json();
  return data.map((c) => ({
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    image: c.image,
    currentPrice: c.current_price,
    marketCap: c.market_cap,
    priceChange24h: c.price_change_24h,
    priceChangePercentage24h: c.price_change_percentage_24h,
    high24h: c.high_24h,
    low24h: c.low_24h,
    volume24h: c.total_volume,
    circulatingSupply: c.circulating_supply,
    type: 'crypto' as const,
    sparkline: c.sparkline_in_7d?.price,
  }));
}

export async function fetchCryptoByid(id: string): Promise<MarketAsset | null> {
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${id}&sparkline=true&price_change_percentage=24h`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  const data: CoinGeckoMarketResponse[] = await res.json();
  if (data.length === 0) return null;
  const c = data[0];
  return {
    id: c.id,
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    image: c.image,
    currentPrice: c.current_price,
    marketCap: c.market_cap,
    priceChange24h: c.price_change_24h,
    priceChangePercentage24h: c.price_change_percentage_24h,
    high24h: c.high_24h,
    low24h: c.low_24h,
    volume24h: c.total_volume,
    circulatingSupply: c.circulating_supply,
    type: 'crypto' as const,
    sparkline: c.sparkline_in_7d?.price,
  };
}

export async function fetchCryptoHistory(id: string, days = 90): Promise<HistoricalDataPoint[]> {
  const url = `${COINGECKO_BASE}/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  const data = await res.json();
  return (data.prices as [number, number][]).map(([timestamp, price]) => ({ timestamp, price }));
}

export async function searchCryptos(query: string): Promise<MarketAsset[]> {
  if (!query.trim()) return [];
  const url = `${COINGECKO_BASE}/search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  const data = await res.json();
  return (data.coins as { id: string; symbol: string; name: string; large: string; market_cap_rank: number }[])
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.large,
      currentPrice: 0,
      marketCap: 0,
      priceChange24h: 0,
      priceChangePercentage24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      type: 'crypto' as const,
    }));
}
