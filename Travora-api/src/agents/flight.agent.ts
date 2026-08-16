import { Injectable, Logger } from "@nestjs/common";

import { TravelState } from "../graph/travel.state";
import { Flight } from "../models/flight.model";
import { AirportService } from "../tools/airport.service";
import { FlightRankingService } from "../tools/flight-ranking.service";
import { SerpApiService } from "../tools/serpapi.service";

@Injectable()
export class FlightAgent {
  private readonly logger =
    new Logger(FlightAgent.name);

  constructor(
    private readonly serpApiService: SerpApiService,
    private readonly airportService: AirportService,
    private readonly flightRankingService: FlightRankingService,
  ) {}

  async invoke(state: TravelState) {
    this.logger.log(
      "✈️ Flight Agent Started",
    );

    /*
     * ---------------------------------------------------------
     * 1. Log incoming TravelState
     * ---------------------------------------------------------
     */

    this.logger.log(
      "[FlightAgent] Incoming state:",
    );

    this.logger.log({
      origin: state.origin,
      destination: state.destination,
      startDate: state.startDate,
      endDate: state.endDate,
      days: state.days,
      travelers: state.travelers,
    });

    /*
     * ---------------------------------------------------------
     * 2. Validate origin and destination
     * ---------------------------------------------------------
     */

    if (
      !state.origin ||
      !state.destination
    ) {
      this.logger.warn(
        "[FlightAgent] Missing origin or destination",
      );

      return {
        flights: [],
      };
    }

    /*
     * ---------------------------------------------------------
     * 3. Validate resolved travel dates
     *
     * The request already contains explicit dates.
     * Do not silently replace them with another date.
     * ---------------------------------------------------------
     */

    const outboundDate =
      state.startDate;

    const returnDate =
      state.endDate;

    if (
      !outboundDate ||
      !returnDate
    ) {
      this.logger.warn(
        "[FlightAgent] Missing resolved travel dates",
      );

      this.logger.warn({
        startDate: state.startDate,
        endDate: state.endDate,
        dates: state.tripRequest?.dates,
      });

      return {
        flights: [],
      };
    }

    /*
     * ---------------------------------------------------------
     * 4. Travelers
     * ---------------------------------------------------------
     */

    const travelers =
      state.travelers ?? 1;

    this.logger.log({
      "[FlightAgent] Search parameters":
        {
          origin:
            state.origin,

          destination:
            state.destination,

          outboundDate,

          returnDate,

          travelers,
        },
    });

    /*
     * ---------------------------------------------------------
     * 5. Resolve origin airports
     * ---------------------------------------------------------
     */

    this.logger.log(
      `[FlightAgent] Resolving origin airport: ${state.origin}`,
    );

    const originAirports =
      await this.airportService.getAirports(
        state.origin,
      );

    this.logger.log(
      `[FlightAgent] Origin airports found: ${originAirports.length}`,
    );

    this.logger.debug(
      JSON.stringify(
        originAirports,
        null,
        2,
      ),
    );

    if (
      originAirports.length === 0
    ) {
      this.logger.warn(
        `[FlightAgent] No airports found for origin: ${state.origin}`,
      );

      return {
        flights: [],
      };
    }

    /*
     * ---------------------------------------------------------
     * 6. Resolve destination airports
     * ---------------------------------------------------------
     */

    this.logger.log(
      `[FlightAgent] Resolving destination airport: ${state.destination}`,
    );

    const destinationAirports =
      await this.airportService.getAirports(
        state.destination,
      );

    this.logger.log(
      `[FlightAgent] Destination airports found: ${destinationAirports.length}`,
    );

    this.logger.debug(
      JSON.stringify(
        destinationAirports,
        null,
        2,
      ),
    );

    if (
      destinationAirports.length === 0
    ) {
      this.logger.warn(
        `[FlightAgent] No airports found for destination: ${state.destination}`,
      );

      return {
        flights: [],
      };
    }

    /*
     * ---------------------------------------------------------
     * 7. Build SerpAPI airport parameters
     * ---------------------------------------------------------
     */

    const departureId =
      originAirports
        .map(
          (airport) =>
            airport.id,
        )
        .filter(Boolean)
        .join(",");

    const arrivalId =
      destinationAirports
        .map(
          (airport) =>
            airport.id,
        )
        .filter(Boolean)
        .join(",");

    this.logger.log(
      "[FlightAgent] Airport parameters:",
    );

    this.logger.log({
      departureId,
      arrivalId,
    });

    if (
      !departureId ||
      !arrivalId
    ) {
      this.logger.warn(
        "[FlightAgent] Could not build valid airport IDs",
      );

      return {
        flights: [],
      };
    }

    /*
     * ---------------------------------------------------------
     * 8. Search SerpAPI
     * ---------------------------------------------------------
     */

    this.logger.log(
      "[FlightAgent] Starting SerpAPI flight search",
    );

    this.logger.log({
      departureId,
      arrivalId,
      outboundDate,
      returnDate,
      travelers,
    });

    let offers: any[] = [];

    try {
      offers =
        await this.serpApiService.searchFlights(
          departureId,
          arrivalId,
          outboundDate,
          returnDate,
          travelers,
        );
    } catch (error) {
      this.logger.error(
        "[FlightAgent] SerpAPI flight search threw an error",
        error instanceof Error
          ? error.stack
          : String(error),
      );

      return {
        flights: [],
      };
    }

    this.logger.log(
      `[FlightAgent] SerpAPI returned ${offers.length} flight offers`,
    );

    /*
     * Log the first raw offer only.
     *
     * This helps us inspect SerpAPI's actual structure
     * without flooding the terminal.
     */

    if (
      offers.length > 0
    ) {
      this.logger.debug(
        "[FlightAgent] First raw flight offer:",
      );

      this.logger.debug(
        JSON.stringify(
          offers[0],
          null,
          2,
        ),
      );
    } else {
      this.logger.warn(
        "[FlightAgent] SerpAPI returned zero flight offers",
      );
    }

    /*
     * ---------------------------------------------------------
     * 9. Convert SerpAPI results into Flight model
     * ---------------------------------------------------------
     */

    let discardedOffers =
      0;

    const formattedFlights: Flight[] =
      offers
        .map(
          (
            offer: any,
          ): Flight | null => {
            const segments =
              offer?.flights;

            /*
             * SerpAPI returned an offer,
             * but it does not have flights.
             */

            if (
              !Array.isArray(
                segments,
              ) ||
              segments.length === 0
            ) {
              discardedOffers++;

              this.logger.debug(
                "[FlightAgent] Discarding offer because flights array is missing or empty",
              );

              return null;
            }

            const firstLeg =
              segments[0];

            const lastLeg =
              segments[
                segments.length - 1
              ];

            /*
             * Missing airport information.
             */

            if (
              !firstLeg
                ?.departure_airport ||
              !lastLeg
                ?.arrival_airport
            ) {
              discardedOffers++;

              this.logger.debug(
                "[FlightAgent] Discarding offer because departure or arrival airport is missing",
              );

              return null;
            }

            return {
              airline:
                firstLeg.airline ??
                "Unknown",

              flightNumber:
                firstLeg.flight_number ??
                "N/A",

              departure:
                firstLeg
                  .departure_airport
                  .id ??
                "N/A",

              arrival:
                lastLeg
                  .arrival_airport
                  .id ??
                "N/A",

              departureTime:
                firstLeg
                  .departure_airport
                  .time ??
                "",

              arrivalTime:
                lastLeg
                  .arrival_airport
                  .time ??
                "",

              price:
                offer.price != null
                  ? `${offer.price} USD`
                  : "Unknown",

              duration:
                typeof
                  offer.total_duration ===
                  "number"
                  ? offer.total_duration
                  : undefined,

              travelClass:
                firstLeg.travel_class ??
                "Economy",

              fareType:
                offer.type,

              stops:
                Math.max(
                  segments.length - 1,
                  0,
                ),

              emissions:
                offer
                  .carbon_emissions
                  ?.this_flight,

              bookingUrl:
                offer.link,

              checkedAt:
                new Date().toISOString()
            };
          },
        )
        .filter(
          (
            flight,
          ): flight is Flight =>
            flight !== null,
        );

    /*
     * ---------------------------------------------------------
     * 10. Log formatting results
     * ---------------------------------------------------------
     */

    this.logger.log({
      "[FlightAgent] Formatting result":
        {
          serpApiOffers:
            offers.length,

          formattedFlights:
            formattedFlights.length,

          discardedOffers,
        },
    });

    /*
     * ---------------------------------------------------------
     * 11. No valid flights after formatting
     * ---------------------------------------------------------
     */

    if (
      formattedFlights.length === 0
    ) {
      this.logger.warn(
        "[FlightAgent] No valid flights remained after formatting",
      );

      return {
        flights: [],
      };
    }

    /*
     * ---------------------------------------------------------
     * 12. Rank flights
     * ---------------------------------------------------------
     */

    this.logger.log(
      `[FlightAgent] Ranking ${formattedFlights.length} flight(s)`,
    );

    const ranking =
      this.flightRankingService.rank(
        formattedFlights,
        state.tripRequest
          ?.preferences
          .flight,
      );

    /*
     * ---------------------------------------------------------
     * 13. Log ranking result
     * ---------------------------------------------------------
     */

    this.logger.log(
      "[FlightAgent] Flight ranking completed",
    );

    this.logger.log({
      rankedFlights:
        ranking.rankedFlights?.length ??
        0,

      bestValue:
        ranking.bestValue
          ?.flightNumber,

      cheapest:
        ranking.cheapest
          ?.flightNumber,

      fastest:
        ranking.fastest
          ?.flightNumber,

      fewestStops:
        ranking.fewestStops
          ?.flightNumber,

      lowestEmissions:
        ranking.lowestEmissions
          ?.flightNumber,
    });

    /*
     * ---------------------------------------------------------
     * 14. Final flight data
     * ---------------------------------------------------------
     */

    this.logger.debug(
      "[FlightAgent] Final ranked flights:",
    );

    this.logger.debug(
      JSON.stringify(
        ranking.rankedFlights,
        null,
        2,
      ),
    );

    this.logger.log(
      `✈️ Flight Agent Finished. Returning ${
        ranking.rankedFlights?.length ??
        0
      } flight(s).`,
    );

    return {
      flights:
        ranking.rankedFlights,

      flightRanking:
        ranking,
    };
  }
}