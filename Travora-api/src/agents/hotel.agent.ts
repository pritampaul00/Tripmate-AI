import { Injectable, Logger } from "@nestjs/common";

import { TravelState } from "../graph/travel.state";
import { SerpHotelService } from "../tools/serp-hotel.service";
import { HotelRankingService } from "../tools/hotel-ranking.service";

@Injectable()
export class HotelAgent {
  private readonly logger =
    new Logger(HotelAgent.name);

  constructor(
    private readonly serpHotelService: SerpHotelService,
    private readonly hotelRankingService: HotelRankingService,
  ) { }

  async invoke(state: TravelState) {
    this.logger.log(
      "🏨 Hotel Agent Started",
    );

    this.logger.log({
      destination: state.destination,
      startDate: state.startDate,
      endDate: state.endDate,
      days: state.days,
      travelers: state.travelers,
      travelStyle: state.travelStyle,
    });

    if (!state.destination) {
      this.logger.warn(
        "Missing destination",
      );

      return {
        hotels: [],
      };
    }

    let checkInDate = state.startDate;
    let checkOutDate = state.endDate;

    if (!checkInDate || !checkOutDate) {
      const today = new Date();

      const start = new Date(today);
      start.setDate(start.getDate() + 30);

      const end = new Date(start);
      end.setDate(
        start.getDate() + (state.days ?? 5) - 1,
      );

      checkInDate = start.toISOString().split('T')[0];
      checkOutDate = end.toISOString().split('T')[0];

      this.logger.log(
        `No exact dates provided. Using flexible planning window: ${checkInDate} → ${checkOutDate}`,
      );
    }

    // const checkInDate =
    //   state.startDate;

    // const checkOutDate =
    //   state.endDate;

    this.logger.log(
      `Searching hotels in ${state.destination} (${checkInDate} → ${checkOutDate})`,
    );

    try {
      const hotels =
        await this.serpHotelService.searchHotels(
          state.destination,
          checkInDate,
          checkOutDate,
          // state.startDate,
          // state.endDate,
          state.travelers ?? 1,
        );
      if (
        !hotels ||
        hotels.length === 0
      ) {
        this.logger.warn(
          "No hotels returned",
        );

        return {
          hotels: [],
        };
      }

      this.logger.log(
        `Found ${hotels.length} hotel(s)`,
      );

      const hotelRanking = this.hotelRankingService.rank(
        hotels,
        state.tripRequest?.preferences.accommodation,
        state.tripRequest?.travelStyle,
      );

      this.logger.debug(
        JSON.stringify(hotelRanking, null, 2),
      );

      return {
        hotels,
        hotelRanking,
      };

      // return {
      //   hotels: hotelRanking.rankedHotels,
      //   hotelRanking,
      // };
    } catch (error) {
      this.logger.error(
        "Hotel search failed",
        error instanceof Error
          ? error.stack
          : String(error),
      );

      return {
        hotels: [],
      };
    }
  }
}