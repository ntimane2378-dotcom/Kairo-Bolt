import type { MarketAsset, PriceAlert, WatchlistItem, ChatMessage, AssetType, Prediction, PredictionRecord } from '@/types';
import { supabase } from './supabase';
import { fetchCryptoByid } from './crypto-api';
import { fetchStockBySymbol } from './stock-api';

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as WatchlistItem[];
}

export async function addToWatchlist(asset: MarketAsset): Promise<void> {
  const { error } = await supabase.from('watchlist').insert({
    asset_id: asset.id,
    asset_type: asset.type,
    symbol: asset.symbol,
    name: asset.name,
    image: asset.image,
  });
  if (error) throw error;
}

export async function removeFromWatchlist(id: string): Promise<void> {
  const { error } = await supabase.from('watchlist').delete().eq('id', id);
  if (error) throw error;
}

export async function isInWatchlist(assetId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('watchlist')
    .select('id')
    .eq('asset_id', assetId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function getPriceAlerts(): Promise<PriceAlert[]> {
  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PriceAlert[];
}

export async function createPriceAlert(
  asset: MarketAsset,
  targetPrice: number,
  direction: 'above' | 'below'
): Promise<void> {
  const { error } = await supabase.from('price_alerts').insert({
    asset_id: asset.id,
    asset_type: asset.type,
    symbol: asset.symbol,
    name: asset.name,
    target_price: targetPrice,
    direction,
    current_price: asset.currentPrice,
  });
  if (error) throw error;
}

export async function deletePriceAlert(id: string): Promise<void> {
  const { error } = await supabase.from('price_alerts').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleAlertActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('price_alerts').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function checkAlerts(currentAssets: MarketAsset[]): Promise<PriceAlert[]> {
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('active', true)
    .eq('triggered', false);
  if (error) return [];

  const triggered: PriceAlert[] = [];
  for (const alert of alerts as PriceAlert[]) {
    const asset = currentAssets.find((a) => a.id === alert.asset_id);
    if (!asset) continue;
    const triggeredNow =
      (alert.direction === 'above' && asset.currentPrice >= alert.target_price) ||
      (alert.direction === 'below' && asset.currentPrice <= alert.target_price);
    if (triggeredNow) {
      await supabase.from('price_alerts').update({ triggered: true, active: false }).eq('id', alert.id);
      triggered.push(alert);
    }
  }
  return triggered;
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(50);
  if (error) return [];
  return data as ChatMessage[];
}

export async function saveChatMessage(role: 'user' | 'assistant', content: string): Promise<void> {
  const { error } = await supabase.from('chat_history').insert({ role, content });
  if (error) throw error;
}

export async function clearChatHistory(): Promise<void> {
  const { error } = await supabase.from('chat_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export async function fetchAssetById(id: string, type: AssetType): Promise<MarketAsset | null> {
  if (type === 'crypto') return fetchCryptoByid(id);
  return fetchStockBySymbol(id);
}

export async function savePredictionRecord(
  asset: MarketAsset,
  prediction: Prediction,
  horizonDays = 7,
): Promise<void> {
  const direction = prediction.recommendation.includes('Buy')
    ? 'bullish'
    : prediction.recommendation.includes('Sell')
      ? 'bearish'
      : 'neutral';
  const { error } = await supabase.from('prediction_records').insert({
    asset_id: asset.id,
    asset_type: asset.type,
    symbol: asset.symbol,
    name: asset.name,
    recommendation: prediction.recommendation,
    predicted_direction: direction,
    price_at_prediction: asset.currentPrice,
    horizon_days: horizonDays,
  });
  if (error) throw error;
}

export async function getPredictionRecords(): Promise<PredictionRecord[]> {
  const { data, error } = await supabase
    .from('prediction_records')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PredictionRecord[];
}

export async function evaluateDuePredictions(currentAssets: MarketAsset[]): Promise<void> {
  const { data, error } = await supabase
    .from('prediction_records')
    .select('*')
    .is('evaluated_at', null);
  if (error || !data) return;

  for (const record of data as PredictionRecord[]) {
    const createdAt = new Date(record.created_at).getTime();
    const dueAt = createdAt + record.horizon_days * 86400000;
    if (Date.now() < dueAt) continue;
    const asset = currentAssets.find((item) => item.id === record.asset_id);
    if (!asset || asset.currentPrice <= 0) continue;
    const change = (asset.currentPrice - record.price_at_prediction) / record.price_at_prediction;
    const actualDirection = Math.abs(change) < 0.01 ? 'neutral' : change > 0 ? 'bullish' : 'bearish';
    const outcomeCorrect = record.predicted_direction === actualDirection ||
      (record.predicted_direction === 'neutral' && Math.abs(change) < 0.03);
    await supabase.from('prediction_records').update({
      evaluated_at: new Date().toISOString(),
      evaluated_price: asset.currentPrice,
      outcome_correct: outcomeCorrect,
    }).eq('id', record.id);
  }
}
