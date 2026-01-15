/**
 * Currency API client using Frankfurter (free, no API key required)
 * Uses European Central Bank data
 */

const API_BASE = 'https://api.frankfurter.app';

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface ConversionResult {
  amount: number;
  from: string;
  to: string;
  result: number;
  rate: number;
  date: string;
}

// All supported currencies
export const SUPPORTED_CURRENCIES = [
  'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CNY', 'CZK', 'DKK',
  'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS', 'INR', 'ISK',
  'JPY', 'KRW', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN',
  'RON', 'SEK', 'SGD', 'THB', 'TRY', 'USD', 'ZAR',
];

export const CURRENCY_NAMES: Record<string, string> = {
  AUD: 'Australian Dollar',
  BGN: 'Bulgarian Lev',
  BRL: 'Brazilian Real',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  CZK: 'Czech Koruna',
  DKK: 'Danish Krone',
  EUR: 'Euro',
  GBP: 'British Pound',
  HKD: 'Hong Kong Dollar',
  HUF: 'Hungarian Forint',
  IDR: 'Indonesian Rupiah',
  ILS: 'Israeli Shekel',
  INR: 'Indian Rupee',
  ISK: 'Icelandic Krona',
  JPY: 'Japanese Yen',
  KRW: 'South Korean Won',
  MXN: 'Mexican Peso',
  MYR: 'Malaysian Ringgit',
  NOK: 'Norwegian Krone',
  NZD: 'New Zealand Dollar',
  PHP: 'Philippine Peso',
  PLN: 'Polish Zloty',
  RON: 'Romanian Leu',
  SEK: 'Swedish Krona',
  SGD: 'Singapore Dollar',
  THB: 'Thai Baht',
  TRY: 'Turkish Lira',
  USD: 'US Dollar',
  ZAR: 'South African Rand',
};

export async function getLatestRates(base: string = 'EUR'): Promise<ExchangeRates> {
  const url = `${API_BASE}/latest?from=${base.toUpperCase()}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Unknown currency: ${base}`);
    }
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    base: data.base,
    date: data.date,
    rates: data.rates,
  };
}

export async function convert(
  amount: number,
  from: string,
  to: string | string[]
): Promise<ConversionResult[]> {
  const fromUpper = from.toUpperCase();
  const toArray = Array.isArray(to) ? to : [to];
  const toUpper = toArray.map(t => t.toUpperCase());

  // Validate currencies
  if (!SUPPORTED_CURRENCIES.includes(fromUpper)) {
    throw new Error(`Unknown currency: ${from}. Use 'uni currency --list' to see supported currencies.`);
  }

  for (const t of toUpper) {
    if (!SUPPORTED_CURRENCIES.includes(t)) {
      throw new Error(`Unknown currency: ${t}. Use 'uni currency --list' to see supported currencies.`);
    }
  }

  const url = `${API_BASE}/latest?amount=${amount}&from=${fromUpper}&to=${toUpper.join(',')}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Conversion failed: ${response.statusText}`);
  }

  const data = await response.json();

  const results: ConversionResult[] = [];
  for (const t of toUpper) {
    const result = data.rates[t];
    results.push({
      amount,
      from: fromUpper,
      to: t,
      result,
      rate: result / amount,
      date: data.date,
    });
  }

  return results;
}

export function isValidCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.includes(code.toUpperCase());
}

export function formatCurrency(amount: number, currency: string): string {
  // Format with appropriate decimal places
  const decimals = ['JPY', 'KRW', 'IDR', 'HUF', 'ISK'].includes(currency.toUpperCase()) ? 0 : 2;

  return amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export interface HistoricalRate {
  date: string;
  rate: number;
}

export async function getHistoricalRates(
  from: string,
  to: string,
  startDate: string,
  endDate: string
): Promise<HistoricalRate[]> {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  const url = `${API_BASE}/${startDate}..${endDate}?from=${fromUpper}&to=${toUpper}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = await response.json();

  // Convert to array of {date, rate}
  const rates: HistoricalRate[] = Object.entries(data.rates)
    .map(([date, rates]) => ({
      date,
      rate: (rates as Record<string, number>)[toUpper],
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return rates;
}

export async function getRatesOnDate(
  date: string,
  base: string = 'EUR'
): Promise<ExchangeRates> {
  const url = `${API_BASE}/${date}?from=${base.toUpperCase()}`;

  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Unknown currency or invalid date: ${base}, ${date}`);
    }
    throw new Error(`API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    base: data.base,
    date: data.date,
    rates: data.rates,
  };
}
