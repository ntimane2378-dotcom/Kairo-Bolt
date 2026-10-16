Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/stock-data", "");

    if (path === "" || path === "/") {
      const symbols = url.searchParams.get("symbols") || "AAPL";
      const symList = symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      const results = await Promise.all(symList.map((s) => fetchStockQuote(s)));
      const valid = results.filter((r) => r !== null);
      return new Response(JSON.stringify(valid), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/history") {
      const symbol = (url.searchParams.get("symbol") || "AAPL").toUpperCase();
      const range = url.searchParams.get("range") || "3M";
      const history = await fetchStockHistoryData(symbol, range);
      return new Response(JSON.stringify({ symbol, history }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/search") {
      const q = url.searchParams.get("q") || "";
      const results = searchStockSymbols(q);
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path === "/news") {
      const symbol = (url.searchParams.get("symbol") || "AAPL").toUpperCase();
      const label = url.searchParams.get("label") || symbol;
      const items = await fetchAssetNews(symbol);
      return new Response(JSON.stringify({ items }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface StockQuote {
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

const STOCK_NAMES: Record<string, string> = {
  AAPL: "Apple Inc.", MSFT: "Microsoft Corp.", GOOGL: "Alphabet Inc.", AMZN: "Amazon.com Inc.",
  NVDA: "NVIDIA Corp.", META: "Meta Platforms Inc.", TSLA: "Tesla Inc.", JPM: "JPMorgan Chase & Co.",
  V: "Visa Inc.", JNJ: "Johnson & Johnson", WMT: "Walmart Inc.", PG: "Procter & Gamble Co.",
  MA: "Mastercard Inc.", UNH: "UnitedHealth Group Inc.", HD: "Home Depot Inc.", DIS: "Walt Disney Co.",
  BAC: "Bank of America Corp.", XOM: "Exxon Mobil Corp.", PFE: "Pfizer Inc.", KO: "Coca-Cola Co.",
  PEP: "PepsiCo Inc.", NFLX: "Netflix Inc.", ADBE: "Adobe Inc.", CRM: "Salesforce Inc.",
  INTC: "Intel Corp.", CSCO: "Cisco Systems Inc.", ORCL: "Oracle Corp.", ABBV: "AbbVie Inc.",
  CVX: "Chevron Corp.", TMO: "Thermo Fisher Scientific", AMD: "Advanced Micro Devices",
  PYPL: "PayPal Holdings", SHOP: "Shopify Inc.", SQ: "Block Inc.", SHOP2: "Snowflake Inc.",
  PLTR: "Palantir Technologies", UBER: "Uber Technologies", ABNB: "Airbnb Inc.",
  ZM: "Zoom Video Communications", DOCU: "DocuSign Inc.", TWTR: "Twitter Inc.",
  SNAP: "Snap Inc.", PINS: "Pinterest Inc.", ROKU: "Roku Inc.", MRNA: "Moderna Inc.",
  NIO: "NIO Inc.", BABA: "Alibaba Group", F: "Ford Motor Co.", GM: "General Motors Co.",
  BA: "Boeing Co.", LMT: "Lockheed Martin Corp.", COST: "Costco Wholesale Corp.",
  NKE: "Nike Inc.", SBUX: "Starbucks Corp.", MCD: "McDonald's Corp.",
  GS: "Goldman Sachs Group", MS: "Morgan Stanley", C: "Citigroup Inc.",
  WFC: "Wells Fargo & Co.", AXA: "American Express Co.", BLK: "BlackRock Inc.",
  SPY: "SPDR S&P 500 ETF", QQQ: "Invesco QQQ Trust", DIA: "SPDR Dow Jones ETF",
};

function deterministicPrice(symbol: string, base: number, offset: number): number {
  let hash = 0;
  const str = symbol + Math.floor(Date.now() / 60000);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const noise = (Math.abs(hash) % 1000) / 1000;
  const wave = Math.sin(Date.now() / 3600000 + symbol.charCodeAt(0)) * 0.015;
  return base * (1 + wave + (noise - 0.5) * 0.01 + offset);
}

const BASE_PRICES: Record<string, number> = {
  AAPL: 182, MSFT: 415, GOOGL: 165, AMZN: 178, NVDA: 880, META: 502, TSLA: 175, JPM: 198,
  V: 275, JNJ: 152, WMT: 62, PG: 165, MA: 460, UNH: 510, HD: 345, DIS: 95, BAC: 38,
  XOM: 118, PFE: 28, KO: 62, PEP: 168, NFLX: 612, ADBE: 525, CRM: 285, INTC: 35,
  CSCO: 52, ORCL: 142, ABBV: 178, CVX: 158, TMO: 580, AMD: 165, PYPL: 65, SHOP: 78,
  UBER: 72, ABNB: 138, MRNA: 115, BABA: 78, F: 11, GM: 42, BA: 178, NKE: 92,
  SBUX: 78, MCD: 285, GS: 445, MS: 95, C: 62, WFC: 58, BLK: 880, COST: 745,
};

async function fetchStockQuote(symbol: string): Promise<StockQuote | null> {
  const name = STOCK_NAMES[symbol] || symbol;
  const base = BASE_PRICES[symbol] || 50 + (symbol.charCodeAt(0) % 100);
  const price = deterministicPrice(symbol, base, 0);
  const prevClose = deterministicPrice(symbol, base, -0.005);
  const change = price - prevClose;
  const changePercent = (change / prevClose) * 100;

  return {
    symbol,
    name,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    high: Math.round(price * 1.02 * 100) / 100,
    low: Math.round(price * 0.98 * 100) / 100,
    volume: Math.floor(Math.abs(symbol.charCodeAt(0)) * 1000000) + Math.floor(Math.random() * 5000000),
    marketCap: Math.round(price * (Math.floor(symbol.charCodeAt(0)) * 10000000)),
    open: Math.round(prevClose * 1.001 * 100) / 100,
    prevClose: Math.round(prevClose * 100) / 100,
    image: "",
  };
}

async function fetchStockHistoryData(symbol: string, range: string): Promise<{ timestamp: number; price: number }[]> {
  const base = BASE_PRICES[symbol] || 50 + (symbol.charCodeAt(0) % 100);
  const days = range === "1M" ? 30 : range === "3M" ? 90 : range === "6M" ? 180 : range === "1Y" ? 365 : 90;
  const history: { timestamp: number; price: number }[] = [];
  const now = Date.now();

  for (let i = days; i >= 0; i--) {
    const timestamp = now - i * 86400000;
    const progress = (days - i) / days;
    const trendWave = Math.sin(progress * Math.PI * 3 + symbol.charCodeAt(0)) * 0.08;
    const noise = Math.sin(i * 1.7 + symbol.charCodeAt(0) * 0.3) * 0.03;
    const price = base * (1 + trendWave + noise + progress * 0.02);
    history.push({ timestamp, price: Math.round(price * 100) / 100 });
  }

  return history;
}

interface YahooNewsItem {
  title?: string;
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
  thumbnail?: { resolutions?: { url?: string }[] };
}

function inferSentiment(title: string): "positive" | "negative" | "neutral" {
  const positive = /surge|soar|rally|gain|growth|beats|beat|upgrade| bullish|record|strong|breakout|approval|adoption|profit/i;
  const negative = /fall|drop|plunge|loss|miss|downgrade|bearish|lawsuit|recall|risk|warning|layoff|fraud|cut/i;
  if (positive.test(title) && !negative.test(title)) return "positive";
  if (negative.test(title) && !positive.test(title)) return "negative";
  return "neutral";
}

async function fetchAssetNews(symbol: string): Promise<{
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  thumbnail?: string;
  sentiment: "positive" | "negative" | "neutral";
}[]> {
  const endpoint = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=8&quotesCount=0`;
  const response = await fetch(endpoint, { headers: { "User-Agent": "Kairo/1.0" } });
  if (!response.ok) throw new Error(`News provider returned ${response.status}`);
  const body = await response.json() as { news?: YahooNewsItem[] };
  return (body.news || []).filter((item) => item.title && item.link).slice(0, 8).map((item) => ({
    title: item.title as string,
    publisher: item.publisher || "Yahoo Finance",
    link: item.link as string,
    publishedAt: new Date((item.providerPublishTime || Date.now() / 1000) * 1000).toISOString(),
    thumbnail: item.thumbnail?.resolutions?.[0]?.url,
    sentiment: inferSentiment(item.title as string),
  }));
}

function searchStockSymbols(query: string): { symbol: string; name: string }[] {
  const q = query.toUpperCase();
  return Object.entries(STOCK_NAMES)
    .filter(([symbol, name]) => symbol.includes(q) || name.toUpperCase().includes(q))
    .slice(0, 10)
    .map(([symbol, name]) => ({ symbol, name }));
}
