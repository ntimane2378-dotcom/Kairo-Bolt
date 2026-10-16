export type AssetType = 'crypto' | 'stock';

export interface MarketAsset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  marketCap: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  circulatingSupply?: number;
  type: AssetType;
  sparkline?: number[];
}

export interface HistoricalDataPoint {
  timestamp: number;
  price: number;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  thumbnail?: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface NewsSummary {
  items: NewsItem[];
  positive: number;
  negative: number;
  neutral: number;
  label: 'Positive' | 'Mixed' | 'Negative' | 'No clear signal';
}

export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  stochastic: number;
  atr: number;
  volume: number;
}

export type ScenarioType = 'bull' | 'neutral' | 'bear';

export interface Scenario {
  type: ScenarioType;
  label: string;
  probability: number;
  shortTerm: { price: number; changePct: number };
  midTerm: { price: number; changePct: number };
  longTerm: { price: number; changePct: number };
  rationale: string;
  keyFactors: string[];
}

export interface Prediction {
  summary: string;
  recommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  confidenceScore: number;
  indicators: TechnicalIndicators;
  scenarios: [Scenario, Scenario, Scenario];
  signals: { name: string; value: string; signal: 'bullish' | 'bearish' | 'neutral' }[];
}

export interface PriceAlert {
  id: string;
  asset_id: string;
  asset_type: AssetType;
  symbol: string;
  name: string;
  target_price: number;
  direction: 'above' | 'below';
  active: boolean;
  triggered: boolean;
  current_price: number | null;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  asset_id: string;
  asset_type: AssetType;
  symbol: string;
  name: string;
  image: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface PredictionRecord {
  id: string;
  asset_id: string;
  asset_type: AssetType;
  symbol: string;
  name: string;
  recommendation: Prediction['recommendation'];
  predicted_direction: 'bullish' | 'neutral' | 'bearish';
  price_at_prediction: number;
  horizon_days: number;
  created_at: string;
  evaluated_at: string | null;
  evaluated_price: number | null;
  outcome_correct: boolean | null;
}
