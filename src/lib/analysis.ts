import type { HistoricalDataPoint, TechnicalIndicators, Scenario, Prediction } from '@/types';

function sma(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] ?? 0;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let emaVal = prices[0];
  for (let i = 1; i < prices.length; i++) {
    emaVal = prices[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

function rsi(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macd(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = emaArray(prices, 12);
  const ema26 = emaArray(prices, 26);
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  const signalLine = emaArray(macdLine, 9);
  const macdVal = macdLine[macdLine.length - 1] ?? 0;
  const signalVal = signalLine[signalLine.length - 1] ?? 0;
  return {
    macd: macdVal,
    signal: signalVal,
    histogram: macdVal - signalVal,
  };
}

function emaArray(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [prices[0]];
  for (let i = 1; i < prices.length; i++) {
    result.push(prices[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function bollingerBands(prices: number[], period = 20, stdDev = 2): { upper: number; middle: number; lower: number } {
  if (prices.length < period) {
    const last = prices[prices.length - 1] ?? 0;
    return { upper: last, middle: last, lower: last };
  }
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - middle) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return {
    upper: middle + stdDev * sd,
    middle,
    lower: middle - stdDev * sd,
  };
}

function stochastic(prices: number[], period = 14): number {
  if (prices.length < period) return 50;
  const slice = prices.slice(-period);
  const highest = Math.max(...slice);
  const lowest = Math.min(...slice);
  if (highest === lowest) return 50;
  const current = prices[prices.length - 1];
  return ((current - lowest) / (highest - lowest)) * 100;
}

function atr(prices: number[], period = 14): number {
  if (prices.length < 2) return 0;
  const trueRanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    trueRanges.push(Math.abs(prices[i] - prices[i - 1]));
  }
  const slice = trueRanges.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / Math.min(slice.length, period);
}

export function calculateIndicators(history: HistoricalDataPoint[]): TechnicalIndicators {
  const prices = history.map((h) => h.price);
  const m = macd(prices);
  const bb = bollingerBands(prices);
  return {
    rsi: rsi(prices),
    macd: m.macd,
    macdSignal: m.signal,
    macdHistogram: m.histogram,
    sma20: sma(prices, 20),
    sma50: sma(prices, 50),
    ema12: ema(prices, 12),
    ema26: ema(prices, 26),
    bollingerUpper: bb.upper,
    bollingerMiddle: bb.middle,
    bollingerLower: bb.lower,
    stochastic: stochastic(prices),
    atr: atr(prices),
    volume: history[history.length - 1]?.price ?? 0,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function generatePrediction(
  history: HistoricalDataPoint[],
  currentPrice: number,
  assetName: string,
  assetType: 'crypto' | 'stock'
): Prediction {
  const indicators = calculateIndicators(history);
  const prices = history.map((h) => h.price);
  const recentPrices = prices.slice(-30);
  const trend = recentPrices.length > 1 ? (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0] : 0;

  const signals: Prediction['signals'] = [
    {
      name: 'RSI (14)',
      value: indicators.rsi.toFixed(1),
      signal: indicators.rsi < 30 ? 'bullish' : indicators.rsi > 70 ? 'bearish' : 'neutral',
    },
    {
      name: 'MACD',
      value: indicators.macdHistogram.toFixed(4),
      signal: indicators.macdHistogram > 0 ? 'bullish' : indicators.macdHistogram < 0 ? 'bearish' : 'neutral',
    },
    {
      name: 'SMA 20 vs 50',
      value: `$${indicators.sma20.toFixed(2)} / $${indicators.sma50.toFixed(2)}`,
      signal: indicators.sma20 > indicators.sma50 ? 'bullish' : 'bearish',
    },
    {
      name: 'Bollinger Bands',
      value: `${((currentPrice - indicators.bollingerLower) / (indicators.bollingerUpper - indicators.bollingerLower) * 100).toFixed(0)}%`,
      signal: currentPrice <= indicators.bollingerLower ? 'bullish' : currentPrice >= indicators.bollingerUpper ? 'bearish' : 'neutral',
    },
    {
      name: 'Stochastic',
      value: indicators.stochastic.toFixed(1),
      signal: indicators.stochastic < 20 ? 'bullish' : indicators.stochastic > 80 ? 'bearish' : 'neutral',
    },
    {
      name: 'EMA 12 vs 26',
      value: `$${indicators.ema12.toFixed(2)} / $${indicators.ema26.toFixed(2)}`,
      signal: indicators.ema12 > indicators.ema26 ? 'bullish' : 'bearish',
    },
  ];

  const bullishCount = signals.filter((s) => s.signal === 'bullish').length;
  const bearishCount = signals.filter((s) => s.signal === 'bearish').length;
  const totalSignals = signals.length;
  const bullScore = bullishCount / totalSignals;
  const bearScore = bearishCount / totalSignals;
  const confidenceScore = Math.round(Math.abs(bullScore - bearScore) * 100);

  let recommendation: Prediction['recommendation'];
  const netScore = bullScore - bearScore;
  if (netScore > 0.5) recommendation = 'Strong Buy';
  else if (netScore > 0.15) recommendation = 'Buy';
  else if (netScore > -0.15) recommendation = 'Hold';
  else if (netScore > -0.5) recommendation = 'Sell';
  else recommendation = 'Strong Sell';

  const volatility = indicators.atr / currentPrice;
  const baseVol = assetType === 'crypto' ? Math.max(volatility, 0.03) : Math.max(volatility, 0.01);

  const bullProb = clamp(0.33 + netScore * 0.35, 0.05, 0.75);
  const bearProb = clamp(0.33 - netScore * 0.35, 0.05, 0.75);
  const neutralProb = clamp(1 - bullProb - bearProb, 0.1, 0.6);

  const bullShort = currentPrice * (1 + baseVol * 1.5);
  const bullMid = currentPrice * (1 + baseVol * 3.5);
  const bullLong = currentPrice * (1 + baseVol * 7);

  const neutralShort = currentPrice * (1 + baseVol * 0.3 * (Math.random() > 0.5 ? 1 : -1));
  const neutralMid = currentPrice * (1 + baseVol * 0.5 * (Math.random() > 0.5 ? 1 : -1));
  const neutralLong = currentPrice * (1 + baseVol * 0.8 * (Math.random() > 0.5 ? 1 : -1));

  const bearShort = currentPrice * (1 - baseVol * 1.5);
  const bearMid = currentPrice * (1 - baseVol * 3.5);
  const bearLong = currentPrice * (1 - baseVol * 7);

  const scenarios: [Scenario, Scenario, Scenario] = [
    {
      type: 'bull',
      label: 'Bullish Scenario',
      probability: Math.round(bullProb * 100),
      shortTerm: { price: bullShort, changePct: ((bullShort - currentPrice) / currentPrice) * 100 },
      midTerm: { price: bullMid, changePct: ((bullMid - currentPrice) / currentPrice) * 100 },
      longTerm: { price: bullLong, changePct: ((bullLong - currentPrice) / currentPrice) * 100 },
      rationale: `Momentum indicators favor upside movement. RSI at ${indicators.rsi.toFixed(0)} suggests room for growth before overbought conditions. MACD histogram positive with EMA crossover supporting upward trend. Volume and price action indicate accumulation by market participants.`,
      keyFactors: [
        indicators.rsi < 45 ? 'RSI below 50 indicates room for upside before overbought' : 'RSI in neutral zone, breakout could trigger strong move',
        indicators.macdHistogram > 0 ? 'MACD histogram positive — bullish momentum building' : 'MACD approaching crossover — watch for bullish signal',
        indicators.sma20 > indicators.sma50 ? 'Golden cross pattern (SMA20 > SMA50) supports uptrend' : 'SMA convergence may precede breakout',
        indicators.stochastic < 50 ? 'Stochastic in lower range — oversold bounce likely' : 'Stochastic momentum building',
      ],
    },
    {
      type: 'neutral',
      label: 'Neutral Scenario',
      probability: Math.round(neutralProb * 100),
      shortTerm: { price: neutralShort, changePct: ((neutralShort - currentPrice) / currentPrice) * 100 },
      midTerm: { price: neutralMid, changePct: ((neutralMid - currentPrice) / currentPrice) * 100 },
      longTerm: { price: neutralLong, changePct: ((neutralLong - currentPrice) / currentPrice) * 100 },
      rationale: `Mixed signals across indicators suggest consolidation phase. Price trading within Bollinger Band range with no decisive breakout. Market indecision likely to persist until a catalyst emerges. Sideways trading with minor fluctuations expected.`,
      keyFactors: [
        'Conflicting indicator signals — neither bulls nor bears have clear control',
        `Price near Bollinger middle band at $${indicators.bollingerMiddle.toFixed(2)} suggests equilibrium`,
        'Volume patterns indicate lack of conviction from either side',
        `ATR of ${indicators.atr.toFixed(2)} shows normal volatility range — no extreme moves expected`,
      ],
    },
    {
      type: 'bear',
      label: 'Bearish Scenario',
      probability: Math.round(bearProb * 100),
      shortTerm: { price: bearShort, changePct: ((bearShort - currentPrice) / currentPrice) * 100 },
      midTerm: { price: bearMid, changePct: ((bearMid - currentPrice) / currentPrice) * 100 },
      longTerm: { price: bearLong, changePct: ((bearLong - currentPrice) / currentPrice) * 100 },
      rationale: `Technical indicators show signs of weakness. RSI at ${indicators.rsi.toFixed(0)} approaching overbought territory with potential for correction. MACD histogram negative and Bollinger Band position suggests limited upside. Risk management advised.`,
      keyFactors: [
        indicators.rsi > 55 ? 'RSI elevated — overbought correction risk increasing' : 'RSI declining from recent highs — momentum fading',
        indicators.macdHistogram < 0 ? 'MACD histogram negative — bearish momentum confirmed' : 'MACD showing weakness — bearish crossover imminent',
        indicators.sma20 < indicators.sma50 ? 'Death cross pattern (SMA20 < SMA50) confirms downtrend' : 'SMA divergence warns of potential trend reversal',
        indicators.stochastic > 50 ? 'Stochastic in upper range — overbought pullback likely' : 'Stochastic losing momentum',
      ],
    },
  ];

  const summary = `${assetName} is currently showing ${recommendation === 'Strong Buy' || recommendation === 'Buy' ? 'bullish' : recommendation === 'Strong Sell' || recommendation === 'Sell' ? 'bearish' : 'neutral'} technical signals. ` +
    `With ${bullishCount} bullish and ${bearishCount} bearish indicators out of ${totalSignals}, the overall sentiment leans ${netScore > 0 ? 'positive' : netScore < 0 ? 'negative' : 'neutral'}. ` +
    `The 30-day trend shows a ${trend > 0 ? 'gain' : 'loss'} of ${Math.abs(trend * 100).toFixed(1)}%. ` +
    `Key support at $${indicators.bollingerLower.toFixed(2)} and resistance at $${indicators.bollingerUpper.toFixed(2)}.`;

  return {
    summary,
    recommendation,
    confidenceScore,
    indicators,
    scenarios,
    signals,
  };
}
