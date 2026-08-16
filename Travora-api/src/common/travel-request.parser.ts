import { Injectable } from '@nestjs/common';

import { ResolvedTripDates, TravelDateResolver } from './travel-date.resolver';
import { BudgetCurrency, TripRequest, TravelStyle } from '../models/trip-request.model';

@Injectable()
export class TravelRequestParser {
  constructor(private readonly dateResolver: TravelDateResolver = new TravelDateResolver()) {}

  parse(message: string): TripRequest {
    const rawMessage = message?.trim() ?? '';
    const normalized = rawMessage.replace(/\s+/g, ' ').trim();

    const destination = this.parseDestination(normalized);
    const origin = this.parseOrigin(normalized);
    const duration = this.parseDuration(normalized);
    const budget = this.parseBudget(normalized);
    const travelers = this.parseTravelers(normalized);
    const travelStyle = this.parseTravelStyle(normalized);
    // const dates = this.parseDates(
    //   normalized,
    //   duration.durationDays,
    //   duration.durationNights,
    // );

const parsedDates = this.parseDates(
  normalized,
  duration.durationDays,
  duration.durationNights,
);

const dates: TripRequest['dates'] =
  !parsedDates.startDate && !parsedDates.endDate
    ? {
        ...parsedDates,
        flexible: true,
        source: 'missing',
        assumptions: [
          'No exact travel dates were provided. Planning will use flexible dates.',
        ],
      }
    : parsedDates;

    const preferences = {
      interests: this.parseInterests(normalized),
      flight: this.parseFlightPreferences(normalized),
      accommodation: this.parseAccommodationPreference(normalized),
    };

    // const missingFields: TripRequest['missingFields'] = [];

    // if (!origin) {
    //   missingFields.push('origin');
    // }

    // if (!destination) {
    //   missingFields.push('destination');
    // }

    // if (!dates.startDate || !dates.endDate) {
    //   missingFields.push('dates');
    // }

    const missingFields: TripRequest['missingFields'] = [];

if (!origin) {
  missingFields.push('origin');
}

if (!destination) {
  missingFields.push('destination');
}

    const assumptions: string[] = [];

    assumptions.push(...dates.assumptions);


    if (
      travelers.total === 1 &&
      !/\bcouple\b|\bfor two\b|\b\d+\s*(?:people|persons|travelers?|travellers?|adults?)\b/i.test(
        normalized,
      )
    ) {
      assumptions.push('No traveler count was specified. Assuming 1 adult.');
    }

    return {
      rawMessage,
      origin,
      destination,
      durationDays: duration.durationDays,
      durationNights: duration.durationNights,
      travelers,
      budget,
      dates,
      travelStyle,
      preferences,
      missingFields,
      assumptions,
    };
  }

  private parseDestination(message: string): string | undefined {
    const patterns = [
      /\b(?:trip|travel|holiday|vacation|journey)\s+to\s+(.+?)(?=\s+from\b|\s+for\b|\s+with\b|\s+on\b|\s+starting\b|\s+between\b|\s+under\b|\s+max\b|\s+with\s+a\s+budget\b|$)/i,
      /\b(?:visit|go\s+to)\s+(.+?)(?=\s+from\b|\s+for\b|\s+with\b|\s+on\b|\s+starting\b|\s+between\b|\s+under\b|\s+max\b|\s+with\s+a\s+budget\b|$)/i,
      /\b\d+\s*(?:day|days|night|nights)\s+(?:trip\s+)?in\s+(.+?)(?=\s+from\b|\s+for\b|\s+with\b|\s+under\b|\s+max\b|$)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      const value = match?.[1]?.trim();

      if (value) {
        return this.cleanPlaceName(value);
      }
    }

    return undefined;
  }

  private parseOrigin(message: string): string | undefined {
    const match = message.match(
      /\bfrom\s+([A-Za-z][A-Za-z.'\- ]*?)(?=\s+from\b|\s+to\b|\s+for\b|\s+with\b|\s+on\b|\s+starting\b|\s+between\b|\s+with\s+a\s+budget\b|\s+under\b|\s+max\b|\s+20\d{2}-|$)/i,
    );

    if (!match?.[1]) {
      return undefined;
    }

    return this.cleanPlaceName(match[1]);
  }

  private parseDuration(message: string): {
    durationDays?: number;
    durationNights?: number;
  } {
    const dayMatch = message.match(/\b(\d+)\s*(?:day|days)\b/i);
    const nightMatch = message.match(/\b(\d+)\s*(?:night|nights)\b/i);

    const days = dayMatch ? Number(dayMatch[1]) : undefined;
    const nights = nightMatch ? Number(nightMatch[1]) : undefined;

    if (days && days > 0 && days <= 365) {
      return {
        durationDays: days,
        durationNights: nights,
      };
    }

    if (nights && nights > 0 && nights <= 365) {
      return {
        durationDays: nights + 1,
        durationNights: nights,
      };
    }

    return {};
  }

  private parseBudget(message: string): TripRequest['budget'] {
    const budgetPattern = message.match(
      /\b(?:budget|spend)\s*(?:of|is|:)?\s*(?:(USD|INR|EUR|GBP|JPY|KRW)\s*)?([₹$€£¥]?\s*[\d,.]+\s*(?:lakh|lac|million|k|m)?)(?:\s*(USD|INR|EUR|GBP|JPY|KRW))?/i,
    );

    const symbolMatch = message.match(
      /([₹$€£¥])\s*([\d,.]+\s*(?:lakh|lac|million|k|m)?)/i,
    );

    const genericAmountMatch = message.match(
      /\b(\d[\d,.]*)\s*(USD|INR|EUR|GBP|JPY|KRW)\b/i,
    );

    const rawAmount =
      budgetPattern?.[2] ?? symbolMatch?.[2] ?? genericAmountMatch?.[1];
    const explicitCurrency =
      budgetPattern?.[1] ?? budgetPattern?.[3] ?? genericAmountMatch?.[2];
    const symbol = symbolMatch?.[1];

    if (!rawAmount) {
      return undefined;
    }

    const amount = this.parseAmount(rawAmount);

    if (!amount || amount <= 0) {
      return undefined;
    }

    return {
      amount,
      currency: this.resolveCurrency(explicitCurrency, symbol),
    };
  }

  private parseTravelers(message: string): TripRequest['travelers'] {
    let adults = 1;
    let children = 0;
    let infants = 0;

    if (/\bcouple\b|\bfor two\b|\btwo of us\b/i.test(message)) {
      adults = 2;
    }

    const adultsMatch = message.match(/\b(\d+)\s*(?:adult|adults)\b/i);

    if (adultsMatch) {
      adults = Number(adultsMatch[1]);
    }

    const childrenMatch = message.match(
      /\b(\d+)\s*(?:child|children|kids?)\b/i,
    );

    if (childrenMatch) {
      children = Number(childrenMatch[1]);
    }

    const infantsMatch = message.match(
      /\b(\d+)\s*(?:infant|infants|baby|babies)\b/i,
    );

    if (infantsMatch) {
      infants = Number(infantsMatch[1]);
    }

    const groupMatch = message.match(
      /\b(?:for|with)\s+(\d+)\s*(?:people|persons|travelers?|travellers?)\b/i,
    );

    if (groupMatch) {
      adults = Number(groupMatch[1]);
      children = 0;
      infants = 0;
    }

    const totalMatch = message.match(
      /\b(\d+)\s*(?:people|persons|travelers?|travellers?)\b/i,
    );

    if (totalMatch && !groupMatch) {
      adults = Number(totalMatch[1]);
      children = 0;
      infants = 0;
    }

    adults = Math.max(1, adults);
    children = Math.max(0, children);
    infants = Math.max(0, infants);

    return {
      adults,
      children,
      infants,
      total: adults + children + infants,
    };
  }

  private parseTravelStyle(message: string): TravelStyle | undefined {
    const styles: Array<[RegExp, TravelStyle]> = [
      [/\bcouple\b|\bromantic\b/i, 'Couple'],
      [/\bfamily\b/i, 'Family'],
      [/\bfriends?\b|\bgroup\b/i, 'Friends'],
      [/\bbusiness\b|\bwork trip\b/i, 'Business'],
      [/\bbackpack(?:ing|er)?\b/i, 'Backpacking'],
      [/\badventure\b/i, 'Adventure'],
      [/\bluxury\b|\bluxurious\b/i, 'Luxury'],
      [
        /\bbudget\s+(?:trip|travel|vacation|holiday)\b|\bcheap\b|\baffordable\b/i,
        'Budget',
      ],
    ];

    for (const [pattern, style] of styles) {
      if (pattern.test(message)) {
        return style;
      }
    }

    return undefined;
  }

  private parseDates(message: string, durationDays?: number, durationNights?: number): ResolvedTripDates {
    return this.dateResolver.resolve(message, durationDays, durationNights);
  }

  private parseInterests(message: string): string[] {
    const knownInterests = [
      'food',
      'nightlife',
      'shopping',
      'anime',
      'manga',
      'history',
      'culture',
      'museums',
      'beaches',
      'nature',
      'hiking',
      'photography',
      'football',
      'architecture',
      'theme parks',
      'temples',
      'street food',
    ];

    return knownInterests.filter((interest) =>
      new RegExp(`\\b${interest.replace(/ /g, '\\s+')}\\b`, 'i').test(message),
    );
  }

  private parseFlightPreferences(
    message: string,
  ): TripRequest['preferences']['flight'] {
    const cabin = /\bpremium economy\b/i.test(message)
      ? 'Premium Economy'
      : /\bbusiness class\b/i.test(message)
        ? 'Business'
        : /\bfirst class\b/i.test(message)
          ? 'First'
          : /\beconomy\b/i.test(message)
            ? 'Economy'
            : undefined;

    const maxStopsMatch = message.match(
      /\b(?:at most|max(?:imum)?|no more than)\s+(\d+)\s*stops?\b/i,
    );

    return cabin || maxStopsMatch
      ? {
          cabin,
          maxStops: maxStopsMatch ? Number(maxStopsMatch[1]) : undefined,
        }
      : undefined;
  }

  private parseAccommodationPreference(
    message: string,
  ): TripRequest['preferences']['accommodation'] {
    const category =
      /\b(?:budget\s+(?:hotel|stay|accommodation)|cheap\s+(?:hotel|stay|accommodation)|hostel|capsule)\b/i.test(
        message,
      )
        ? 'Budget'
        : /\b(?:luxury|5[- ]star|five[- ]star)\b/i.test(message)
          ? 'Luxury'
          : /\b(?:mid[- ]range|3[- ]star|4[- ]star)\b/i.test(message)
            ? 'Mid-range'
            : undefined;

    return category ? { category } : undefined;
  }

  private parseAmount(value: string): number {
    const normalized = value
      .toLowerCase()
      .replace(/,/g, '')
      .replace(/\s+/g, '')
      .trim();

    const numberMatch = normalized.match(/[\d.]+/);

    if (!numberMatch) {
      return 0;
    }

    const number = Number(numberMatch[0]);

    if (!Number.isFinite(number)) {
      return 0;
    }

    if (/lakh|lac/.test(normalized)) {
      return number * 100_000;
    }

    if (/million|m$/.test(normalized)) {
      return number * 1_000_000;
    }

    if (/k$/.test(normalized)) {
      return number * 1_000;
    }

    return number;
  }

  private resolveCurrency(
    explicitCurrency?: string,
    symbol?: string,
  ): BudgetCurrency {
    const normalized = explicitCurrency?.toUpperCase();

    if (
      normalized === 'USD' ||
      normalized === 'INR' ||
      normalized === 'EUR' ||
      normalized === 'GBP' ||
      normalized === 'JPY' ||
      normalized === 'KRW'
    ) {
      return normalized;
    }

    switch (symbol) {
      case '₹':
        return 'INR';
      case '€':
        return 'EUR';
      case '£':
        return 'GBP';
      case '¥':
        return 'JPY';
      case '$':
      default:
        return 'USD';
    }
  }


  private cleanPlaceName(value: string): string {
    return value
      .replace(/[.,!?]+$/, '')
      .replace(
        /\s+(?:with|for)\s+(?:a\s+)?(?:budget|two|three|four|five)\b.*$/i,
        '',
      )
      .trim();
  }
}
