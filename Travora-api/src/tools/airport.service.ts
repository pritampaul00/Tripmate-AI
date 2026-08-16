import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

interface AirportResult {
  name: string;
  id: string;
  city: string;
}

@Injectable()
export class AirportService {
  private readonly logger =
    new Logger(AirportService.name);

  private readonly apiKey =
    process.env.SERP_API_KEY!;

  private readonly cache = new Map<
    string,
    AirportResult[]
  >();

  /*
   * Keep the airport list small.
   *
   * For most cities this will be:
   *
   * 1. Primary airport
   * 2. Secondary airport
   * 3. Other relevant local airport
   */
  private readonly MAX_AIRPORTS = 3;

  async getAirports(
    city: string,
  ): Promise<AirportResult[]> {
    const normalizedCity =
      city.trim().toLowerCase();

    if (!normalizedCity) {
      this.logger.warn(
        "[AirportService] Empty city provided",
      );

      return [];
    }

    /*
     * ---------------------------------------------------------
     * Cache
     * ---------------------------------------------------------
     */

    const cached =
      this.cache.get(normalizedCity);

    if (cached) {
      this.logger.log(
        `[AirportService] Using cached airports for ${city}`,
      );

      this.logger.log({
        city,
        airportsFound: cached.length,
        airports: cached.map(
          (airport) => airport.id,
        ),
      });

      return cached;
    }

    try {
      this.logger.log(
        `[AirportService] Searching Google Flights airports for: ${city}`,
      );

      /*
       * -------------------------------------------------------
       * Google Flights autocomplete
       * -------------------------------------------------------
       */

      const { data } =
        await axios.get(
          "https://serpapi.com/search.json",
          {
            params: {
              engine:
                "google_flights_autocomplete",

              q: city,

              gl: "in",

              hl: "en",

              api_key:
                this.apiKey,
            },
          },
        );

      const suggestions =
        Array.isArray(
          data?.suggestions,
        )
          ? data.suggestions
          : [];

      this.logger.log(
        `[AirportService] Autocomplete returned ${suggestions.length} suggestion(s)`,
      );

      /*
       * -------------------------------------------------------
       * IMPORTANT
       *
       * Do NOT flatten airports from every suggestion.
       *
       * A query like "Melbourne" can return:
       *
       * Melbourne, Australia
       * Melbourne, Florida
       * Birmingham
       * Montreal
       * Memphis
       *
       * Flattening everything creates an invalid flight query.
       * -------------------------------------------------------
       */

      if (
        suggestions.length === 0
      ) {
        this.logger.warn(
          `[AirportService] No autocomplete suggestions found for ${city}`,
        );

        return [];
      }

      /*
       * -------------------------------------------------------
       * Select the most relevant suggestion
       * -------------------------------------------------------
       */

      const citySuggestion =
        this.findBestCitySuggestion(
          suggestions,
          normalizedCity,
        );

      if (!citySuggestion) {
        this.logger.warn(
          `[AirportService] Could not identify a relevant airport suggestion for ${city}`,
        );

        return [];
      }

      this.logger.log(
        "[AirportService] Selected airport suggestion",
      );

      this.logger.debug(
        JSON.stringify(
          citySuggestion,
          null,
          2,
        ),
      );

      /*
       * -------------------------------------------------------
       * Extract airports ONLY from the selected suggestion.
       * -------------------------------------------------------
       */

      const rawAirports =
        Array.isArray(
          citySuggestion.airports,
        )
          ? citySuggestion.airports
          : [];

      const airports: AirportResult[] =
        [];

      for (
        const airport of rawAirports
      ) {
        if (
          !airport?.id ||
          !/^[A-Z]{3}$/.test(
            airport.id,
          )
        ) {
          continue;
        }

        airports.push({
          name:
            airport.name ??
            "Unknown Airport",

          id:
            airport.id,

          city:
            airport.city ??
            citySuggestion.name ??
            city,
        });
      }

      /*
       * -------------------------------------------------------
       * Remove duplicate airport IDs.
       * -------------------------------------------------------
       */

      const uniqueAirports =
        Array.from(
          new Map(
            airports.map(
              (airport) => [
                airport.id,
                airport,
              ],
            ),
          ).values(),
        );

      /*
       * -------------------------------------------------------
       * Limit airports.
       *
       * The first airports returned by Google Flights
       * autocomplete are normally the most relevant.
       *
       * Example:
       *
       * Melbourne
       *   MEL
       *   AVV
       *   MEB
       *
       * -------------------------------------------------------
       */

      const relevantAirports =
        uniqueAirports.slice(
          0,
          this.MAX_AIRPORTS,
        );

      /*
       * -------------------------------------------------------
       * Cache final result.
       * -------------------------------------------------------
       */

      this.cache.set(
        normalizedCity,
        relevantAirports,
      );

      /*
       * -------------------------------------------------------
       * Logging
       * -------------------------------------------------------
       */

      this.logger.log({
        city,

        suggestionsFound:
          suggestions.length,

        selectedSuggestion:
          citySuggestion.name,

        airportsFound:
          relevantAirports.length,

        airports:
          relevantAirports.map(
            (airport) =>
              airport.id,
          ),
      });

      return relevantAirports;
    } catch (error: unknown) {
      if (
        axios.isAxiosError(error)
      ) {
        this.logger.error(
          "[AirportService] Google Flights autocomplete failed",
          error.response?.data ??
            error.message,
        );
      } else if (
        error instanceof Error
      ) {
        this.logger.error(
          "[AirportService] Airport lookup failed",
          error.message,
        );
      } else {
        this.logger.error(
          "[AirportService] Airport lookup failed",
          String(error),
        );
      }

      return [];
    }
  }

  /*
   * ---------------------------------------------------------
   * Find the most relevant autocomplete suggestion.
   * ---------------------------------------------------------
   *
   * We score suggestions rather than blindly using every
   * suggestion returned by SerpAPI.
   *
   * Exact city matches receive the highest score.
   * ---------------------------------------------------------
   */

  private findBestCitySuggestion(
    suggestions: any[],
    normalizedCity: string,
  ): any | null {
    let bestSuggestion:
      | any
      | null = null;

    let bestScore = -1;

    for (
      const suggestion of suggestions
    ) {
      const suggestionName =
        String(
          suggestion?.name ??
            "",
        )
          .trim()
          .toLowerCase();

      const suggestionCity =
        String(
          suggestion?.city ??
            "",
        )
          .trim()
          .toLowerCase();

      const suggestionAirports =
        Array.isArray(
          suggestion?.airports,
        )
          ? suggestion.airports
          : [];

      if (
        suggestionAirports.length ===
        0
      ) {
        continue;
      }

      let score = 0;

      /*
       * Exact suggestion name.
       *
       * Example:
       * Melbourne → Melbourne
       */

      if (
        suggestionName ===
        normalizedCity
      ) {
        score += 100;
      }

      /*
       * Exact suggestion city.
       */

      if (
        suggestionCity ===
        normalizedCity
      ) {
        score += 90;
      }

      /*
       * Suggestion starts with the
       * requested city.
       *
       * Useful for values such as:
       * "Melbourne, Australia"
       */

      if (
        suggestionName.startsWith(
          normalizedCity,
        )
      ) {
        score += 50;
      }

      /*
       * Prefer suggestions containing
       * more airport results.
       *
       * This helps select a city-level
       * airport group.
       */

      score += Math.min(
        suggestionAirports.length,
        5,
      );

      if (
        score > bestScore
      ) {
        bestScore = score;

        bestSuggestion =
          suggestion;
      }
    }

    return bestSuggestion;
  }
}