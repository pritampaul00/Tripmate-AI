import { Injectable, Logger } from '@nestjs/common';

import { Flight } from '../models/flight.model';
import { FlightRanking, RankedFlight } from '../models/flight-ranking.model';
import { TripPreferences } from '../models/trip-request.model';

@Injectable()
export class FlightRankingService {
  private readonly logger = new Logger(FlightRankingService.name);

  rank(
    flights: Flight[],
    preferences?: TripPreferences['flight'],
  ): FlightRanking {
    const warnings: string[] = [];
    const originalCount = flights.length;

    if (flights.length === 0) {
      return {
        bestValue: null,
        cheapest: null,
        fastest: null,
        fewestStops: null,
        lowestEmissions: null,
        rankedFlights: [],
        filteredCount: 0,
        originalCount: 0,
        warnings: ['No flight offers were returned.'],
      };
    }

    let eligible = flights.filter((flight) => {
      if (
        preferences?.cabin &&
        flight.travelClass &&
        flight.travelClass.toLowerCase() !==
          preferences.cabin.toLowerCase()
      ) {
        return false;
      }

      if (
        preferences?.maxStops !== undefined &&
        flight.stops !== undefined &&
        flight.stops > preferences.maxStops
      ) {
        return false;
      }

      return true;
    });

    if (eligible.length === 0) {
      eligible = [...flights];

      warnings.push(
        'No flight matched all requested flight preferences. Showing the closest available options instead.',
      );
    }

    const prices = eligible
      .map((flight) => this.parsePrice(flight.price))
      .filter((price): price is number => price !== null);

    const durations = eligible
      .map((flight) => flight.duration)
      .filter(
        (duration): duration is number =>
          typeof duration === 'number' &&
          Number.isFinite(duration),
      );

    const stops = eligible
      .map((flight) => flight.stops)
      .filter(
        (value): value is number =>
          typeof value === 'number' &&
          Number.isFinite(value),
      );

    const emissions = eligible
      .map((flight) => this.parseNumber(flight.emissions))
      .filter((value): value is number => value !== null);

    const rankedFlights = eligible
      .map((flight) => {
        const price = this.parsePrice(flight.price);
        const duration = flight.duration;
        const stopCount = flight.stops;
        const emissionValue = this.parseNumber(flight.emissions);

        const priceScore = this.inverseScore(price, prices);
        const durationScore = this.inverseScore(
          duration,
          durations,
        );
        const stopsScore = this.inverseScore(
          stopCount,
          stops,
        );
        const scheduleScore = this.scheduleScore(flight);

        const score = this.round(
          priceScore * 0.45 +
            durationScore * 0.25 +
            stopsScore * 0.15 +
            scheduleScore * 0.15,
        );

        return {
          ...flight,
          score,
          tags: [] as RankedFlight['tags'],
        } satisfies RankedFlight;
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        const aPrice =
          this.parsePrice(a.price) ??
          Number.POSITIVE_INFINITY;

        const bPrice =
          this.parsePrice(b.price) ??
          Number.POSITIVE_INFINITY;

        return aPrice - bPrice;
      });

    const cheapest = this.minByPrice(rankedFlights);
    const fastest = this.minByDuration(rankedFlights);
    const fewestStops = this.minByStops(rankedFlights);
    const lowestEmissions =
      this.minByEmissions(rankedFlights);

    const bestValue = rankedFlights[0] ?? null;

    const categoryMap = new Map<
      string,
      Set<RankedFlight['tags'][number]>
    >();

    const addTag = (
      flight: RankedFlight | null,
      tag: RankedFlight['tags'][number],
    ) => {
      if (!flight) return;

      const key = this.flightKey(flight);

      if (!categoryMap.has(key)) {
        categoryMap.set(key, new Set());
      }

      categoryMap.get(key)!.add(tag);
    };

    addTag(bestValue, 'best-value');
    addTag(cheapest, 'cheapest');
    addTag(fastest, 'fastest');
    addTag(fewestStops, 'fewest-stops');
    addTag(lowestEmissions, 'lowest-emissions');

    for (const flight of rankedFlights) {
      flight.tags = Array.from(
        categoryMap.get(this.flightKey(flight)) ?? [],
      );
    }

    if (prices.length === 0) {
      warnings.push(
        'Some or all flight offers did not include a usable price and were ranked without price information.',
      );
    }

    if (emissions.length === 0) {
      warnings.push(
        'No usable emissions data was available for the returned flight offers.',
      );
    }

    this.logger.log({
      originalCount,
      filteredCount: eligible.length,
      bestValue: bestValue?.flightNumber,
      cheapest: cheapest?.flightNumber,
      fastest: fastest?.flightNumber,
      fewestStops: fewestStops?.flightNumber,
      lowestEmissions: lowestEmissions?.flightNumber,
    });

    return {
      bestValue,
      cheapest,
      fastest,
      fewestStops,
      lowestEmissions,
      rankedFlights,
      filteredCount: eligible.length,
      originalCount,
      warnings,
    };
  }

  private minByPrice(
    flights: RankedFlight[],
  ): RankedFlight | null {
    return this.minBy(
      flights,
      (flight) => this.parsePrice(flight.price),
    );
  }

  private minByDuration(
    flights: RankedFlight[],
  ): RankedFlight | null {
    return this.minBy(
      flights,
      (flight) => flight.duration ?? null,
    );
  }

  private minByStops(
    flights: RankedFlight[],
  ): RankedFlight | null {
    return this.minBy(
      flights,
      (flight) => flight.stops ?? null,
    );
  }

  private minByEmissions(
    flights: RankedFlight[],
  ): RankedFlight | null {
    return this.minBy(
      flights,
      (flight) => this.parseNumber(flight.emissions),
    );
  }

  private minBy(
    flights: RankedFlight[],
    getter: (flight: RankedFlight) => number | null,
  ): RankedFlight | null {
    let best: RankedFlight | null = null;
    let bestValue = Number.POSITIVE_INFINITY;

    for (const flight of flights) {
      const value = getter(flight);

      if (
        value === null ||
        !Number.isFinite(value)
      ) {
        continue;
      }

      if (value < bestValue) {
        bestValue = value;
        best = flight;
      }
    }

    return best;
  }

  private inverseScore(
    value: number | undefined | null,
    values: number[],
  ): number {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(value)
    ) {
      return 50;
    }

    if (values.length <= 1) {
      return 100;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (max === min) {
      return 100;
    }

    return ((max - value) / (max - min)) * 100;
  }

  private scheduleScore(
    flight: Flight,
  ): number {
    const departureHour = this.extractHour(
      flight.departureTime,
    );

    const arrivalHour = this.extractHour(
      flight.arrivalTime,
    );

    const departureScore = this.hourScore(
      departureHour,
      6,
      22,
    );

    const arrivalScore = this.hourScore(
      arrivalHour,
      7,
      22,
    );

    return (
      departureScore * 0.45 +
      arrivalScore * 0.55
    );
  }

  private hourScore(
    hour: number | null,
    preferredStart: number,
    preferredEnd: number,
  ): number {
    if (hour === null) {
      return 50;
    }

    if (
      hour >= preferredStart &&
      hour <= preferredEnd
    ) {
      return 100;
    }

    if (hour >= 5 && hour <= 23) {
      return 75;
    }

    return 55;
  }

  private extractHour(
    value?: string,
  ): number | null {
    if (!value) {
      return null;
    }

    const match = value.match(
      /(?:T|\s)(\d{1,2}):\d{2}/,
    );

    if (!match) {
      return null;
    }

    const hour = Number(match[1]);

    return Number.isFinite(hour) &&
      hour >= 0 &&
      hour <= 23
      ? hour
      : null;
  }

  private parsePrice(
    value: unknown,
  ): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value)
        ? value
        : null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    if (/unknown|n\/a|not available/i.test(value)) {
      return null;
    }

    const cleaned = value
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '');

    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  private parseNumber(
    value: unknown,
  ): number | null {
    if (typeof value === 'number') {
      return Number.isFinite(value)
        ? value
        : null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    if (/unknown|n\/a|not available/i.test(value)) {
      return null;
    }

    const cleaned = value
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '');

    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  private flightKey(
    flight: Flight,
  ): string {
    return [
      flight.airline,
      flight.flightNumber,
      flight.departureTime,
      flight.arrivalTime,
      flight.price,
    ].join('|');
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}