import { Injectable } from '@nestjs/common';

import { BudgetCurrency } from '../models/trip-request.model';

export interface CurrencyConversion {
  amount: number;
  currency: BudgetCurrency;
  rateFromUsd: number;
  source: 'configured' | 'fallback';
}

/**
 * Centralized FX conversion for planning estimates.
 *
 * Flight and hotel providers currently return prices in USD, so the
 * budget engine normalizes all costs to USD first and converts the final
 * presentation amount into the user's requested currency.
 *
 * Configure live/provider-backed rates through environment variables when
 * available. The fallback rates are deliberately treated as planning rates,
 * not live market rates.
 */
@Injectable()
export class CurrencyService {
  private readonly fallbackRates: Record<BudgetCurrency, number> = {
    USD: 1,
    INR: 86,
    EUR: 0.86,
    GBP: 0.75,
    JPY: 150,
    KRW: 1380,
  };

  convertFromUsd(amountUsd: number, currency: BudgetCurrency): CurrencyConversion {
    const rate = this.getUsdRate(currency);

    return {
      amount: this.round(amountUsd * rate),
      currency,
      rateFromUsd: rate,
      source: this.isConfigured(currency) ? 'configured' : 'fallback',
    };
  }

  convertToUsd(amount: number, currency: BudgetCurrency): number {
    const rate = this.getUsdRate(currency);
    return this.round(amount / rate);
  }

  getUsdRate(currency: BudgetCurrency): number {
    if (currency === 'USD') return 1;

    const key = `TRAVORA_USD_TO_${currency}`;
    const configured = Number(process.env[key]);

    if (Number.isFinite(configured) && configured > 0) {
      return configured;
    }

    return this.fallbackRates[currency];
  }

  isConfigured(currency: BudgetCurrency): boolean {
    if (currency === 'USD') return true;

    const value = Number(process.env[`TRAVORA_USD_TO_${currency}`]);
    return Number.isFinite(value) && value > 0;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
