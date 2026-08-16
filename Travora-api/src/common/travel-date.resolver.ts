import { Injectable } from '@nestjs/common';

export type DateResolutionSource =
  | 'explicit'
  | 'derived-from-start'
  | 'flexible-window'
  | 'missing';

export interface ResolvedTripDates {
  startDate?: string;
  endDate?: string;
  flexible: boolean;
  source: DateResolutionSource;
  searchWindow?: {
    startDate: string;
    endDate: string;
  };
  assumptions: string[];
}

@Injectable()
export class TravelDateResolver {

  resolve(message: string, durationDays?: number, durationNights?: number): ResolvedTripDates {
    const normalized = message.replace(/\s+/g, ' ').trim();
    const explicitRange = this.parseExplicitRange(normalized);

    if (explicitRange) {
      return {
        ...explicitRange,
        assumptions: [],
      };
    }

    const singleStart = this.parseSingleStartDate(normalized);
    const duration = durationDays ?? (durationNights ? durationNights + 1 : undefined);

    if (singleStart && duration && duration > 0) {
      const endDate = this.addDays(singleStart, duration - 1);

      return {
        startDate: singleStart,
        endDate,
        flexible: false,
        source: 'derived-from-start',
        assumptions: [
          `End date was derived from the requested ${duration}-day trip duration.`,
        ],
      };
    }

    const relativeRange = this.parseRelativeExactRange(normalized, duration);

    if (relativeRange) {
      return {
        ...relativeRange,
        flexible: false,
        source: 'derived-from-start',
        assumptions: [
          `Dates were resolved from the relative date expression.`,
        ],
      };
    }

    const flexibleWindow = this.parseFlexibleWindow(normalized, duration);

    if (flexibleWindow) {
      return {
        flexible: true,
        source: 'flexible-window',
        searchWindow: flexibleWindow,
        assumptions: [
          `Dates are flexible. Search within ${flexibleWindow.startDate} to ${flexibleWindow.endDate}.`,
        ],
      };
    }

    const explicitlyFlexible =
      /\bflexible dates?\b|\bany dates?\b|\bcheapest dates?\b|\bwhenever\b/i.test(
        normalized,
      );

    return {
      flexible: explicitlyFlexible,
      source: explicitlyFlexible ? 'flexible-window' : 'missing',
      assumptions: explicitlyFlexible
        ? ['No exact dates were provided. Dates will be treated as flexible.']
        : [],
    };
  }

  private parseExplicitRange(message: string): Omit<ResolvedTripDates, 'assumptions'> | undefined {
    const dates = this.extractConcreteDates(message);

    if (dates.length < 2) {
      return undefined;
    }

    const startDate = dates[0];
    const endDate = dates[1];

    if (endDate < startDate) {
      return undefined;
    }

    return {
      startDate,
      endDate,
      flexible: false,
      source: 'explicit',
    };
  }

  private parseSingleStartDate(message: string): string | undefined {
    const explicitDates = this.extractConcreteDates(message);

    if (explicitDates.length !== 1) {
      return undefined;
    }

    const date = explicitDates[0];

    if (
      /\b(?:from|starting|start(?:ing)?|begin(?:ning)?|on)\b/i.test(message) ||
      /\b\d+\s*(?:day|days|night|nights)\b/i.test(message)
    ) {
      return date;
    }

    return undefined;
  }

  private parseRelativeExactRange(
    message: string,
    durationDays?: number,
  ): { startDate: string; endDate: string } | undefined {
    const now = this.startOfDay(new Date());
    const duration = durationDays && durationDays > 0 ? durationDays : 1;

    if (/\btomorrow\b/i.test(message)) {
      const start = this.addDate(now, 1);
      return {
        startDate: this.formatDate(start),
        endDate: this.formatDate(this.addDate(start, duration - 1)),
      };
    }

    if (/\btoday\b/i.test(message)) {
      return {
        startDate: this.formatDate(now),
        endDate: this.formatDate(this.addDate(now, duration - 1)),
      };
    }

    return undefined;
  }

  private parseFlexibleWindow(
    message: string,
    durationDays?: number,
  ): { startDate: string; endDate: string } | undefined {
    const now = this.startOfDay(new Date());
    const duration = durationDays && durationDays > 0 ? durationDays : 1;

    if (/\bnext\s+month\b/i.test(message)) {
      const first = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
      return this.window(first, last, duration);
    }

    if (/\bthis\s+month\b/i.test(message)) {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return this.window(first, last, duration, true);
    }

    const monthYearMatch = message.match(
      /\b(?:in|during|for)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i,
    );

    if (monthYearMatch) {
      const month = this.monthNumber(monthYearMatch[1]);
      const year = Number(monthYearMatch[2]);
      const first = new Date(year, month - 1, 1);
      const last = new Date(year, month, 0);
      return this.window(first, last, duration, true);
    }

    if (/\btomorrow\b/i.test(message)) {
      const first = this.addDate(now, 1);
      const last = this.addDate(first, duration - 1);
      return {
        startDate: this.formatDate(first),
        endDate: this.formatDate(last),
      };
    }

    if (/\btoday\b/i.test(message)) {
      const last = this.addDate(now, duration - 1);
      return {
        startDate: this.formatDate(now),
        endDate: this.formatDate(last),
      };
    }

    if (/\bnext\s+week\b/i.test(message)) {
      const day = now.getDay();
      const daysUntilMonday = day === 0 ? 1 : 8 - day;
      const first = this.addDate(now, daysUntilMonday);
      const last = this.addDate(first, 6);
      return this.window(first, last, duration);
    }

    if (/\bthis\s+weekend\b/i.test(message) || /\bnext\s+weekend\b/i.test(message)) {
      const day = now.getDay();
      const daysUntilSaturday = day <= 6 ? 6 - day : 0;
      const first = this.addDate(now, daysUntilSaturday + (/\bnext\s+weekend\b/i.test(message) ? 7 : 0));
      const last = this.addDate(first, 1);
      return this.window(first, last, duration);
    }

    return undefined;
  }

  private window(
    rangeStart: Date,
    rangeEnd: Date,
    durationDays: number,
    clampStartToToday = false,
  ): { startDate: string; endDate: string } {
    let start = this.startOfDay(rangeStart);
    const end = this.startOfDay(rangeEnd);

    if (clampStartToToday) {
      const today = this.startOfDay(new Date());
      if (today > start && today <= end) {
        start = today;
      }
    }

    const latestStart = this.addDate(end, -(durationDays - 1));

    return {
      startDate: this.formatDate(start),
      endDate: this.formatDate(latestStart >= start ? latestStart : end),
    };
  }

  private extractConcreteDates(message: string): string[] {
    const candidates: Array<{ date: string; index: number }> = [];

    for (const match of message.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
      const date = this.createValidDate(Number(match[1]), Number(match[2]), Number(match[3]));
      if (date) {
        candidates.push({ date: this.formatDate(date), index: match.index ?? 0 });
      }
    }

    const dayMonthYear =
      /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/gi;

    for (const match of message.matchAll(dayMonthYear)) {
      const date = this.createValidDate(
        Number(match[3]),
        this.monthNumber(match[2]),
        Number(match[1]),
      );
      if (date) {
        candidates.push({ date: this.formatDate(date), index: match.index ?? 0 });
      }
    }

    const monthDayYear =
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b/gi;

    for (const match of message.matchAll(monthDayYear)) {
      const date = this.createValidDate(
        Number(match[3]),
        this.monthNumber(match[1]),
        Number(match[2]),
      );
      if (date) {
        candidates.push({ date: this.formatDate(date), index: match.index ?? 0 });
      }
    }

    const dayMonthWithoutYear =
      /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/gi;

    for (const match of message.matchAll(dayMonthWithoutYear)) {
      const date = this.resolveYearlessDate(
        Number(match[1]),
        this.monthNumber(match[2]),
      );
      if (date) {
        candidates.push({ date: this.formatDate(date), index: match.index ?? 0 });
      }
    }

    const monthDayWithoutYear =
      /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+(\d{1,2})(?!\s*,?\s*20\d{2})\b/gi;

    for (const match of message.matchAll(monthDayWithoutYear)) {
      const date = this.resolveYearlessDate(
        Number(match[2]),
        this.monthNumber(match[1]),
      );
      if (date) {
        candidates.push({ date: this.formatDate(date), index: match.index ?? 0 });
      }
    }

    return candidates
      .sort((a, b) => a.index - b.index)
      .map((candidate) => candidate.date)
      .filter((date, index, values) => values.indexOf(date) === index);
  }

  private resolveYearlessDate(day: number, month: number): Date | undefined {
    const today = this.startOfDay(new Date());
    let year = today.getFullYear();
    let date = this.createValidDate(year, month, day);

    if (!date) {
      return undefined;
    }

    if (date < today) {
      year += 1;
      date = this.createValidDate(year, month, day);
    }

    return date;
  }

  private monthNumber(month: string): number {
    const normalized = month.toLowerCase().replace('.', '');
    const aliases: Record<string, number> = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };

    return aliases[normalized] ?? 0;
  }

  private createValidDate(year: number, month: number, day: number): Date | undefined {
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return undefined;
    }

    return date;
  }

  private addDays(dateString: string, days: number): string {
    return this.formatDate(this.addDate(this.parseDate(dateString), days));
  }

  private addDate(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return this.startOfDay(result);
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}