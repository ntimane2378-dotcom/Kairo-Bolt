import type { MarketAsset } from '@/types';
import {
  createPriceAlert,
  addToWatchlist,
  removeFromWatchlist,
  getPriceAlerts,
  getWatchlist,
} from './db';
import { fetchTopCryptos, fetchCryptoByid, searchCryptos } from './crypto-api';
import { fetchTopStocks, fetchStockBySymbol, searchStocks } from './stock-api';

export interface AIResponse {
  text: string;
  action?: {
    type: 'alert_created' | 'alert_deleted' | 'watchlist_added' | 'watchlist_removed' | 'navigate';
    payload?: unknown;
  };
  suggestions?: string[];
}

interface ParsedCommand {
  intent: string;
  assetQuery?: string;
  price?: number;
  direction?: 'above' | 'below';
}

function parseCommand(input: string): ParsedCommand {
  const lower = input.toLowerCase();

  if (/\b(alert|notify|warn|tell me when)\b/.test(lower)) {
    const belowMatch = lower.match(/\b(below|under|drops? to|falls? to|dips? to)\b/);
    const direction = belowMatch ? 'below' : 'above';

    const priceMatch = input.match(/\$?([\d,]+\.?\d*)/);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : undefined;

    const withoutPrice = input.replace(/\$?[\d,]+\.?\d*/g, '');
    const assetQuery = withoutPrice
      .replace(/\b(set|create|add|make|an?|price|alert|notify|warn|tell me when|the|at|above|over|exceeds?|crosses?|below|under|drops? to|falls? to|dips? to|reaches?|hits?|goes?|for|of|on|in\b)/gi, '')
      .trim();

    return { intent: 'set_alert', assetQuery, price, direction };
  }

  if (/\b(remove|delete|cancel|clear)\b.*\balert\b/.test(lower)) {
    return { intent: 'delete_alert' };
  }

  if (/\b(add|put|include|save)\b.*\b(to|in)?\s*(my\s*)?(watchlist|favorites?|watch list)\b/.test(lower)) {
    const assetMatch = input.match(/(?:add|put|include|save)\s+(.+?)\s+(?:to|in)\s+(?:my\s+)?(?:watchlist|favorites?|watch list)/i);
    return { intent: 'add_to_watchlist', assetQuery: assetMatch?.[1]?.trim() };
  }

  if (/\b(remove|delete|take)\b.*\b(from|in)?\s*(my\s*)?(watchlist|favorites?|watch list)\b/.test(lower)) {
    const assetMatch = input.match(/(?:remove|delete|take)\s+(.+?)\s+(?:from|in)\s+(?:my\s+)?(?:watchlist|favorites?|watch list)/i);
    return { intent: 'remove_from_watchlist', assetQuery: assetMatch?.[1]?.trim() };
  }

  if (/\b(show|list|view|display|what.?s|what are)\b.*\b(alerts?|notifications?)\b/.test(lower)) {
    return { intent: 'show_alerts' };
  }

  if (/\b(show|list|view|display|what.?s|what are)\b.*\b(watchlist|favorites?|watch list|watching)\b/.test(lower)) {
    return { intent: 'show_watchlist' };
  }

  if (/\b(show|tell me about|analyze|look at|view|open|check|predict)\b/.test(lower)) {
    const assetMatch = input.match(/(?:show|tell me about|analyze|look at|view|open|check|predict(?:ion)?\s+for)\s+(.+)/i);
    return { intent: 'navigate_to_asset', assetQuery: assetMatch?.[1]?.trim() };
  }

  if (/\b(hi|hello|hey|help|what can you do)\b/.test(lower)) {
    return { intent: 'greeting' };
  }

  if (/\b(market|overview|trending|top)\b/.test(lower)) {
    return { intent: 'market_overview' };
  }

  return { intent: 'unknown' };
}

async function findAsset(query: string): Promise<MarketAsset | null> {
  if (!query) return null;

  const cryptoResults = await searchCryptos(query).catch(() => []);
  if (cryptoResults.length > 0) {
    const match = cryptoResults[0];
    const full = await fetchCryptoByid(match.id).catch(() => null);
    if (full) return full;
    return match;
  }

  const stockResults = await searchStocks(query).catch(() => []);
  if (stockResults.length > 0) {
    const match = stockResults[0];
    const full = await fetchStockBySymbol(match.id).catch(() => null);
    if (full) return full;
    return match;
  }

  return null;
}

export async function processAICommand(input: string): Promise<AIResponse> {
  const cmd = parseCommand(input);

  switch (cmd.intent) {
    case 'greeting':
      return {
        text: "Hello! I'm your market analysis assistant. I can help you with:\n\n• Setting price alerts (e.g., 'Alert me when Bitcoin drops below $60,000')\n• Adding assets to your watchlist (e.g., 'Add Ethereum to my watchlist')\n• Analyzing specific assets (e.g., 'Analyze AAPL')\n• Viewing your alerts and watchlist\n\nWhat would you like to do?",
        suggestions: ['Show market overview', 'Analyze Bitcoin', 'Show my alerts', 'Add NVDA to watchlist'],
      };

    case 'set_alert': {
      if (!cmd.assetQuery) {
        return {
          text: "I'd be happy to set a price alert for you. Please specify which asset and target price. For example: 'Alert me when Bitcoin drops below $60,000'.",
          suggestions: ['Alert me when BTC goes above $100,000', 'Alert me when AAPL drops below $170'],
        };
      }

      if (!cmd.price) {
        return {
          text: `I found ${cmd.assetQuery} but I need a target price. For example: 'Alert me when ${cmd.assetQuery} goes ${cmd.direction ?? 'above'} $X'.`,
        };
      }

      const asset = await findAsset(cmd.assetQuery);
      if (!asset) {
        return {
          text: `I couldn't find an asset matching "${cmd.assetQuery}". Try searching with the ticker symbol (e.g., BTC, AAPL) or full name (e.g., Bitcoin, Apple).`,
        };
      }

      try {
        await createPriceAlert(asset, cmd.price, cmd.direction ?? 'above');
        return {
          text: `Price alert set! I'll notify you when ${asset.name} (${asset.symbol}) ${cmd.direction ?? 'above'} $${cmd.price.toLocaleString()}. Current price is $${asset.currentPrice.toLocaleString()}.`,
          action: { type: 'alert_created' },
          suggestions: ['Show my alerts', `Analyze ${asset.symbol}`, `Add ${asset.symbol} to watchlist`],
        };
      } catch {
        return { text: `I had trouble setting that alert. Please try again.` };
      }
    }

    case 'delete_alert': {
      try {
        const alerts = await getPriceAlerts();
        if (alerts.length === 0) {
          return { text: "You don't have any price alerts to delete." };
        }
        const alertList = alerts.map((a, i) => `${i + 1}. ${a.symbol} ${a.direction} $${a.target_price}`).join('\n');
        return {
          text: `Here are your alerts:\n\n${alertList}\n\nWhich one would you like to remove? You can say "delete alert 1" or specify the asset.`,
        };
      } catch {
        return { text: "I couldn't retrieve your alerts right now." };
      }
    }

    case 'add_to_watchlist': {
      if (!cmd.assetQuery) {
        return {
          text: "Which asset would you like to add to your watchlist? For example: 'Add Solana to my watchlist'.",
        };
      }

      const asset = await findAsset(cmd.assetQuery);
      if (!asset) {
        return { text: `I couldn't find an asset matching "${cmd.assetQuery}". Try using the ticker symbol or full name.` };
      }

      try {
        await addToWatchlist(asset);
        return {
          text: `Added ${asset.name} (${asset.symbol}) to your watchlist. You can find it in the Watchlist tab.`,
          action: { type: 'watchlist_added' },
          suggestions: [`Analyze ${asset.symbol}`, `Set alert for ${asset.symbol}`],
        };
      } catch {
        return { text: `I had trouble adding that to your watchlist. It might already be there.` };
      }
    }

    case 'remove_from_watchlist': {
      if (!cmd.assetQuery) {
        return { text: "Which asset would you like to remove from your watchlist?" };
      }
      try {
        const watchlist = await getWatchlist();
        const item = watchlist.find(
          (w) => w.symbol.toLowerCase() === cmd.assetQuery!.toLowerCase() ||
                 w.name.toLowerCase().includes(cmd.assetQuery!.toLowerCase())
        );
        if (!item) {
          return { text: `I couldn't find "${cmd.assetQuery}" in your watchlist.` };
        }
        await removeFromWatchlist(item.id);
        return {
          text: `Removed ${item.name} (${item.symbol}) from your watchlist.`,
          action: { type: 'watchlist_removed' },
        };
      } catch {
        return { text: `I had trouble removing that from your watchlist.` };
      }
    }

    case 'show_alerts': {
      try {
        const alerts = await getPriceAlerts();
        if (alerts.length === 0) {
          return {
            text: "You don't have any price alerts yet. Would you like to set one?",
            suggestions: ['Alert me when BTC goes above $100,000', 'Alert me when ETH drops below $2,500'],
          };
        }
        const alertList = alerts.map((a) => {
          const status = a.triggered ? ' (triggered)' : a.active ? ' (active)' : ' (paused)';
          return `• ${a.symbol} — ${a.direction} $${a.target_price.toLocaleString()}${status}`;
        }).join('\n');
        return {
          text: `You have ${alerts.length} price alert${alerts.length > 1 ? 's' : ''}:\n\n${alertList}`,
          suggestions: ['Set a new alert', 'Clear all alerts'],
        };
      } catch {
        return { text: "I couldn't retrieve your alerts right now." };
      }
    }

    case 'show_watchlist': {
      try {
        const watchlist = await getWatchlist();
        if (watchlist.length === 0) {
          return {
            text: "Your watchlist is empty. Would you like to add some assets?",
            suggestions: ['Add Bitcoin to watchlist', 'Add AAPL to watchlist'],
          };
        }
        const list = watchlist.map((w) => `• ${w.symbol} — ${w.name}`).join('\n');
        return {
          text: `Your watchlist has ${watchlist.length} asset${watchlist.length > 1 ? 's' : ''}:\n\n${list}`,
        };
      } catch {
        return { text: "I couldn't retrieve your watchlist right now." };
      }
    }

    case 'navigate_to_asset': {
      if (!cmd.assetQuery) {
        return { text: "Which asset would you like me to analyze?" };
      }
      const asset = await findAsset(cmd.assetQuery);
      if (!asset) {
        return { text: `I couldn't find an asset matching "${cmd.assetQuery}". Try using the ticker symbol or full name.` };
      }
      return {
        text: `Opening detailed analysis for ${asset.name} (${asset.symbol})...`,
        action: { type: 'navigate', payload: { id: asset.id, type: asset.type } },
      };
    }

    case 'market_overview':
      return {
        text: "Here's a quick market overview. You can see trending cryptocurrencies and stocks on the main dashboard. Click on any asset for detailed analysis with predictions and scenarios.",
        suggestions: ['Analyze Bitcoin', 'Analyze AAPL', 'Show top cryptos'],
      };

    default:
      return {
        text: "I'm not sure what you mean, but I can help with price alerts, watchlist management, and asset analysis. Try asking me something like 'Alert me when Bitcoin drops below $60,000' or 'Analyze Tesla'.",
        suggestions: ['Show market overview', 'Analyze Bitcoin', 'Show my alerts', 'Add ETH to watchlist'],
      };
  }
}

export async function getMarketContext(): Promise<string> {
  const cryptos = await fetchTopCryptos(5).catch(() => []);
  const stocks = await fetchTopStocks().catch(() => []);
  const top5 = [...cryptos.slice(0, 3), ...stocks.slice(0, 2)];
  if (top5.length === 0) return '';
  return top5.map(a => `${a.symbol}: $${a.currentPrice.toLocaleString()} (${a.priceChangePercentage24h >= 0 ? '+' : ''}${a.priceChangePercentage24h.toFixed(2)}%)`).join(' | ');
}
