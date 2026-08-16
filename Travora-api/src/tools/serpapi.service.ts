import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class SerpApiService {
  private readonly logger =
    new Logger(SerpApiService.name);

  private readonly apiKey =
    process.env.SERP_API_KEY!;

  async searchFlights(
    departureId: string,
    arrivalId: string,
    outboundDate: string,
    returnDate: string,
    travelers: number,
  ) {
    try {
      this.logger.log(
        `Searching Google Flights: ${departureId} -> ${arrivalId}`,
      );

      this.logger.log({
        outboundDate,
        returnDate,
        travelers,
      });

      const { data } =
        await axios.get(
          "https://serpapi.com/search.json",
          {
            params: {
              engine: "google_flights",

              departure_id:
                departureId,

              arrival_id:
                arrivalId,

              outbound_date:
                outboundDate,

              return_date:
                returnDate,

              // Round trip
              type: 1,

              adults: travelers,

              currency: "USD",

              hl: "en",

              gl: "us",

              api_key:
                this.apiKey,
            },
          },
        );

      if (data?.error) {
        this.logger.error(
          `Google Flights error: ${data.error}`,
        );

        return [];
      }

      const offers = [
        ...(data.best_flights ?? []),
        ...(data.other_flights ?? []),
      ];

      this.logger.log(
        `Google Flights returned ${offers.length} offers`,
      );

      return offers;
    } catch (error: unknown) {
      this.logger.error(
        "Google Flights search failed",
      );

      if (axios.isAxiosError(error)) {
        this.logger.error(
          error.response?.data ??
            error.message,
        );
      } else if (
        error instanceof Error
      ) {
        this.logger.error(
          error.message,
        );
      } else {
        this.logger.error(
          String(error),
        );
      }

      return [];
    }
  }
}