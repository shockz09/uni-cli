/**
 * Yahoo Finance API wrapper
 *
 * Uses yahoo-finance2 for real-time stock/crypto data.
 * No API key required.
 */

import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  dayLow: number;
  dayHigh: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  marketCap?: number;
  currency: string;
}

export interface StockInfo {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  avgVolume?: number;
  description?: string;
}

export interface HistoryEntry {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Get current quote for a symbol
 */
export async function getQuote(symbol: string): Promise<Quote> {
  const quote = await yahooFinance.quote(symbol.toUpperCase());

  if (!quote || !quote.regularMarketPrice) {
    throw new Error(`Symbol '${symbol.toUpperCase()}' not found`);
  }

  return {
    symbol: quote.symbol,
    name: quote.shortName || quote.longName || quote.symbol,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange || 0,
    changePercent: quote.regularMarketChangePercent || 0,
    volume: quote.regularMarketVolume || 0,
    dayLow: quote.regularMarketDayLow || 0,
    dayHigh: quote.regularMarketDayHigh || 0,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
    marketCap: quote.marketCap,
    currency: quote.currency || 'USD',
  };
}

/**
 * Get detailed info for a symbol
 */
export async function getInfo(symbol: string): Promise<StockInfo> {
  const result = await yahooFinance.quoteSummary(symbol.toUpperCase(), {
    modules: ['summaryProfile', 'summaryDetail', 'price'],
  });

  const profile = result.summaryProfile;
  const detail = result.summaryDetail;
  const price = result.price;

  return {
    symbol: price?.symbol || symbol.toUpperCase(),
    name: price?.shortName || price?.longName || symbol,
    sector: profile?.sector,
    industry: profile?.industry,
    marketCap: price?.marketCap,
    peRatio: detail?.trailingPE,
    dividendYield: detail?.dividendYield,
    fiftyTwoWeekHigh: detail?.fiftyTwoWeekHigh || 0,
    fiftyTwoWeekLow: detail?.fiftyTwoWeekLow || 0,
    avgVolume: detail?.averageVolume,
    description: profile?.longBusinessSummary,
  };
}

/**
 * Get price history
 */
export async function getHistory(
  symbol: string,
  period: string = '1mo'
): Promise<HistoryEntry[]> {
  const periodMap: Record<string, string> = {
    '1d': '1d',
    '5d': '5d',
    '1w': '5d',
    '1mo': '1mo',
    '3mo': '3mo',
    '6mo': '6mo',
    '1y': '1y',
    '5y': '5y',
  };

  const p = periodMap[period] || '1mo';

  const result = await yahooFinance.chart(symbol.toUpperCase(), {
    period1: getStartDate(p),
    period2: new Date(),
  });

  if (!result.quotes || result.quotes.length === 0) {
    throw new Error(`No history found for '${symbol.toUpperCase()}'`);
  }

  return result.quotes.map((q) => ({
    date: new Date(q.date),
    open: q.open || 0,
    high: q.high || 0,
    low: q.low || 0,
    close: q.close || 0,
    volume: q.volume || 0,
  }));
}

function getStartDate(period: string): Date {
  const now = new Date();
  switch (period) {
    case '1d':
      return new Date(now.setDate(now.getDate() - 1));
    case '5d':
      return new Date(now.setDate(now.getDate() - 5));
    case '1mo':
      return new Date(now.setMonth(now.getMonth() - 1));
    case '3mo':
      return new Date(now.setMonth(now.getMonth() - 3));
    case '6mo':
      return new Date(now.setMonth(now.getMonth() - 6));
    case '1y':
      return new Date(now.setFullYear(now.getFullYear() - 1));
    case '5y':
      return new Date(now.setFullYear(now.getFullYear() - 5));
    default:
      return new Date(now.setMonth(now.getMonth() - 1));
  }
}

/**
 * Format large numbers (1000000 -> 1M)
 */
export function formatNumber(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

/**
 * Format price change with color indicator
 */
export function formatChange(change: number, percent: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}$${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
}

/**
 * Popular symbols for list command
 */
export const POPULAR = {
  stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'JPM', 'V', 'WMT'],
  crypto: ['BTC-USD', 'ETH-USD', 'BNB-USD', 'SOL-USD', 'XRP-USD', 'DOGE-USD', 'ADA-USD'],
  indices: ['^GSPC', '^DJI', '^IXIC', '^RUT', '^VIX'],
};
