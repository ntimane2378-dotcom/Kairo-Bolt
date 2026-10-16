import type { MarketAsset, HistoricalDataPoint, NewsItem, AssetType } from '@/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface StockQuoteResponse {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number;
  open: number;
  prevClose: number;
  image: string;
}

interface StockHistoryResponse {
  symbol: string;
  history: { timestamp: number; price: number }[];
}

interface NewsResponse {
  items: NewsItem[];
}

async function callStockEdgeFunction(path: string): Promise<Response> {
  const url = `${SUPABASE_URL}/functions/v1/stock-data${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return res;
}

export async function fetchTopStocks(symbols?: string[]): Promise<MarketAsset[]> {
  const defaultSymbols = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM',
    'V', 'JNJ', 'WMT', 'PG', 'MA', 'UNH', 'HD', 'DIS', 'BAC', 'XOM',
    'PFE', 'KO', 'PEP', 'NFLX', 'ADBE', 'CRM', 'INTC', 'CSCO', 'ORCL',
    'ABBV', 'CVX', 'TMO',
  ];
  const syms = symbols ?? defaultSymbols;
  const res = await callStockEdgeFunction(`?symbols=${syms.join(',')}`);
  if (!res.ok) throw new Error(`Stock API error: ${res.status}`);
  const data: StockQuoteResponse[] = await res.json();
  return data.map((s) => ({
    id: s.symbol,
    symbol: s.symbol,
    name: s.name,
    image: s.image,
    currentPrice: s.price,
    marketCap: s.marketCap,
    priceChange24h: s.change,
    priceChangePercentage24h: s.changePercent,
    high24h: s.high,
    low24h: s.low,
    volume24h: s.volume,
    type: 'stock' as const,
  }));
}

export async function fetchStockBySymbol(symbol: string): Promise<MarketAsset | null> {
  const res = await callStockEdgeFunction(`?symbols=${symbol}`);
  if (!res.ok) throw new Error(`Stock API error: ${res.status}`);
  const data: StockQuoteResponse[] = await res.json();
  if (data.length === 0) return null;
  const s = data[0];
  return {
    id: s.symbol,
    symbol: s.symbol,
    name: s.name,
    image: s.image,
    currentPrice: s.price,
    marketCap: s.marketCap,
    priceChange24h: s.change,
    priceChangePercentage24h: s.changePercent,
    high24h: s.high,
    low24h: s.low,
    volume24h: s.volume,
    type: 'stock' as const,
  };
}

export async function fetchStockHistory(symbol: string, range = '3M'): Promise<HistoricalDataPoint[]> {
  const res = await callStockEdgeFunction(`/history?symbol=${symbol}&range=${range}`);
  if (!res.ok) throw new Error(`Stock API error: ${res.status}`);
  const data: StockHistoryResponse = await res.json();
  return data.history;
}

export async function fetchAssetNews(symbol: string, type: AssetType, name?: string): Promise<NewsItem[]> {
  const query = type === 'crypto' ? `${symbol}-USD` : symbol;
  const label = name ? `${symbol} ${name}` : symbol;
  const res = await callStockEdgeFunction(`/news?symbol=${encodeURIComponent(query)}&label=${encodeURIComponent(label)}`);
  if (!res.ok) throw new Error(`News API error: ${res.status}`);
  const data: NewsResponse = await res.json();
  if (!Array.isArray(data.items)) throw new Error('Unexpected news response');
  return data.items;
}

export async function searchStocks(query: string): Promise<MarketAsset[]> {
  if (!query.trim()) return [];
  const res = await callStockEdgeFunction(`/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data: { symbol: string; name: string }[] = await res.json();
  return data.slice(0, 10).map((s) => ({
    id: s.symbol,
    symbol: s.symbol,
    name: s.name,
    image: '',
    currentPrice: 0,
    marketCap: 0,
    priceChange24h: 0,
    priceChangePercentage24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    type: 'stock' as const,
  }));
}
