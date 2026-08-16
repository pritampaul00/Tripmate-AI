import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";

import { Hotel } from "../models/hotel.model";

@Injectable()
export class SerpHotelService {
  private readonly logger =
    new Logger(SerpHotelService.name);

  private readonly apiKey =
    process.env.SERP_API_KEY!;

  private readonly serpApiUrl =
    "https://serpapi.com/search.json";

  /*
   * =========================================================
   * Search Hotels
   * =========================================================
   *
   * This request searches Google Hotels and returns the
   * lightweight property list.
   *
   * IMPORTANT:
   *
   * We do NOT try to obtain room type or cancellation
   * information from this response.
   *
   * Instead, we capture propertyToken and use it later
   * to request detailed information for the selected hotel.
   */

  async searchHotels(
    destination: string,
    checkInDate: string,
    checkOutDate: string,
    travelers: number,
  ): Promise<Hotel[]> {
    try {
      if (!destination) {
        this.logger.warn(
          "Missing hotel destination",
        );

        return [];
      }

      if (
        !checkInDate ||
        !checkOutDate
      ) {
        this.logger.warn(
          "Missing hotel check-in or check-out date",
        );

        return [];
      }

      if (!this.apiKey) {
        this.logger.error(
          "SERP_API_KEY is not configured",
        );

        return [];
      }

      const adults =
        travelers > 0
          ? travelers
          : 1;

      this.logger.log({
        destination,
        checkInDate,
        checkOutDate,
        travelers: adults,
      });

      const { data } =
        await axios.get(
          this.serpApiUrl,
          {
            params: {
              engine: "google_hotels",

              q: destination,

              check_in_date:
                checkInDate,

              check_out_date:
                checkOutDate,

              adults,

              currency: "USD",

              gl: "us",

              hl: "en",

              api_key:
                this.apiKey,
            },
          },
        );

      const properties =
        Array.isArray(
          data?.properties,
        )
          ? data.properties
          : [];

      this.logger.log(
        `SerpAPI returned ${properties.length} hotel(s)`,
      );

      if (
        properties.length > 0
      ) {
        this.logger.debug(
          `Raw SerpAPI hotel sample:\n${JSON.stringify(
            properties[0],
            null,
            2,
          )}`,
        );
      }

      const checkedAt =
        new Date().toISOString();

      const hotels: Hotel[] =
        properties.map(
          (
            hotel: any,
          ): Hotel => {
            const ratePerNight =
              hotel.rate_per_night ??
              {};

            return {
              name:
                hotel.name ??
                "Unknown Hotel",

              address:
                this.extractAddress(
                  hotel,
                ),

              description:
                this.extractDescription(
                  hotel,
                ),

              website:
                hotel.link ??
                "",

              /*
               * IMPORTANT
               *
               * This token is what lets us retrieve
               * detailed room and cancellation data later.
               */
              propertyToken:
                hotel.property_token,

              price:
                ratePerNight.lowest ??
                hotel.price,

              rating:
                this.numericValue(
                  hotel.overall_rating,
                ),

              reviews:
                this.numericValue(
                  hotel.reviews,
                ),

              amenities:
                this.extractAmenities(
                  hotel,
                ),

              distanceFromCenter:
                this.extractDistanceFromCenter(
                  hotel,
                ),

              /*
               * These are intentionally NOT populated
               * during the initial property search.
               *
               * They will be populated by getHotelDetails()
               * for the recommended hotel.
               */
              roomType:
                undefined,

              cancellationPolicy:
                undefined,

              checkedAt,
            };
          },
        );

      const hotelsWithoutToken =
        hotels.filter(
          (hotel) =>
            !hotel.propertyToken,
        ).length;

      if (
        hotels.length > 0 &&
        hotelsWithoutToken ===
        hotels.length
      ) {
        this.logger.warn(
          "SerpAPI did not return property_token for any hotel.",
        );
      }

      this.logger.debug(
        `Normalized hotel search results:\n${JSON.stringify(
          hotels.slice(0, 5).map(
            (hotel) => ({
              name:
                hotel.name,

              price:
                hotel.price,

              rating:
                hotel.rating,

              reviews:
                hotel.reviews,

              propertyToken:
                hotel.propertyToken,

              address:
                hotel.address,

              amenities:
                hotel.amenities,
            }),
          ),
          null,
          2,
        )}`,
      );

      return hotels;
    } catch (error) {
      if (
        axios.isAxiosError(error)
      ) {
        this.logger.error(
          "SerpAPI hotel search failed",
          error.response?.data ??
          error.message,
        );
      } else {
        this.logger.error(
          "Hotel search failed",
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }

      return [];
    }
  }

  /*
   * =========================================================
   * Get Detailed Hotel Information
   * =========================================================
   *
   * This should be called ONLY for the selected hotel.
   *
   * We intentionally do not call this for all 20 hotels.
   *
   * SerpApi documents property_token as the mechanism for
   * retrieving Google Hotels property details.
   *
   * The detailed response can contain:
   *
   * - rooms
   * - beds
   * - rates
   * - guest count
   * - free cancellation
   * - cancellation deadline
   */

  async getHotelDetails(
    hotel: Hotel,
    checkInDate: string,
    checkOutDate: string,
    travelers: number,
  ): Promise<Hotel> {
    if (
      !hotel.propertyToken
    ) {
      this.logger.warn(
        `Cannot fetch hotel details for "${hotel.name}" because propertyToken is missing.`,
      );

      return hotel;
    }

    if (
      !checkInDate ||
      !checkOutDate
    ) {
      this.logger.warn(
        `Cannot fetch hotel details for "${hotel.name}" because hotel dates are missing.`,
      );

      return hotel;
    }

    if (!this.apiKey) {
      this.logger.error(
        "SERP_API_KEY is not configured",
      );

      return hotel;
    }

    const adults =
      travelers > 0
        ? travelers
        : 1;

    try {
      this.logger.log({
        hotel:
          hotel.name,

        propertyToken:
          hotel.propertyToken,

        checkInDate,

        checkOutDate,

        travelers:
          adults,
      });

      const { data } =
        await axios.get(
          this.serpApiUrl,
          {
            params: {
              engine: "google_hotels",

              q: hotel.name,

              property_token:
                hotel.propertyToken,

              check_in_date:
                checkInDate,

              check_out_date:
                checkOutDate,

              adults,

              currency:
                "USD",

              gl: "us",

              hl: "en",

              api_key:
                this.apiKey,
            },
          },
        );

      /*
       * Keep this log while we are validating the
       * actual SerpAPI response for your selected hotels.
       */
      this.logger.debug(
        `Raw hotel details for ${hotel.name}:\n${JSON.stringify(
          data,
          null,
          2,
        )}`,
      );

      const detailedRoom =
        this.extractDetailedRoom(
          data,
        );

      const cancellation =
        this.extractDetailedCancellation(
          data,
        );

      const detailedAddress =
        this.firstString(
          data?.address,
        );

      const detailedWebsite =
        this.firstString(
          data?.link,
        );

      const detailedDescription =
        this.firstString(
          data?.description,
        );

      const detailedPrice =
        this.firstString(
          data?.rate_per_night
            ?.lowest,
        );

      const detailedAmenities =
        this.toStringArray(
          data?.amenities,
        );

      /*
       * Merge the detailed response into the
       * already-ranked hotel.
       *
       * We preserve the original fields when the
       * detailed endpoint does not provide them.
       */

      const enrichedHotel: Hotel = {
        ...hotel,

        address:
          detailedAddress ??
          hotel.address,

        description:
          detailedDescription ??
          hotel.description,

        website:
          detailedWebsite ??
          hotel.website,

        price:
          detailedPrice ??
          hotel.price,

        amenities:
          detailedAmenities.length >
            0
            ? detailedAmenities
            : hotel.amenities,

        roomType:
          detailedRoom ??
          undefined,

        cancellationPolicy:
          cancellation ??
          undefined,

        checkedAt:
          new Date().toISOString(),
      };

      this.logger.log({
        hotel:
          enrichedHotel.name,

        roomType:
          enrichedHotel.roomType,

        cancellationPolicy:
          enrichedHotel.cancellationPolicy,

        address:
          enrichedHotel.address,

        checkedAt:
          enrichedHotel.checkedAt,
      });

      return enrichedHotel;
    } catch (error) {
      if (
        axios.isAxiosError(error)
      ) {
        this.logger.error(
          `SerpAPI hotel details failed for "${hotel.name}"`,
          error.response?.data ??
          error.message,
        );
      } else {
        this.logger.error(
          `Hotel details failed for "${hotel.name}"`,
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }

      /*
       * Never destroy a valid ranked hotel just because
       * the details request failed.
       */
      return hotel;
    }
  }

  /*
   * =========================================================
   * Detailed Room Extraction
   * =========================================================
   *
   * SerpApi's property details response can expose rooms
   * inside featured_prices.
   */

  private extractDetailedRoom(
    data: any,
  ): string | undefined {
    const featuredPrices =
      Array.isArray(
        data?.featured_prices,
      )
        ? data.featured_prices
        : [];

    for (
      const provider of featuredPrices
    ) {
      if (
        !provider ||
        typeof provider !==
        "object"
      ) {
        continue;
      }

      const rooms =
        Array.isArray(
          provider.rooms,
        )
          ? provider.rooms
          : [];

      for (
        const room of rooms
      ) {
        if (
          !room ||
          typeof room !==
          "object"
        ) {
          continue;
        }

        const roomName =
          this.firstString(
            room.name,
          );

        if (roomName) {
          return roomName;
        }
      }
    }

    /*
     * Some responses may expose room information
     * directly inside prices.
     */

    const prices =
      Array.isArray(
        data?.prices,
      )
        ? data.prices
        : [];

    for (
      const price of prices
    ) {
      if (
        !price ||
        typeof price !==
        "object"
      ) {
        continue;
      }

      const rooms =
        Array.isArray(
          price.rooms,
        )
          ? price.rooms
          : [];

      for (
        const room of rooms
      ) {
        if (
          !room ||
          typeof room !==
          "object"
        ) {
          continue;
        }

        const roomName =
          this.firstString(
            room.name,
          );

        if (roomName) {
          return roomName;
        }
      }
    }

    return undefined;
  }

  /*
   * =========================================================
   * Detailed Cancellation Extraction
   * =========================================================
   */

  private extractDetailedCancellation(
    data: any,
  ): string | undefined {
    const featuredPrices =
      Array.isArray(data?.featured_prices)
        ? data.featured_prices
        : [];

    for (const provider of featuredPrices) {
      const providerCancellation =
        this.extractCancellationFromPrice(
          provider,
        );

      if (providerCancellation) {
        return providerCancellation;
      }

      const rooms =
        Array.isArray(provider?.rooms)
          ? provider.rooms
          : [];

      for (const room of rooms) {
        /*
         * Cancellation information can belong directly
         * to the room.
         */
        const roomCancellation =
          this.extractCancellationFromPrice(
            room,
          );

        if (roomCancellation) {
          return roomCancellation;
        }

        /*
         * Some responses can put cancellation information
         * inside the room's rates.
         */
        const rates =
          Array.isArray(room?.rates)
            ? room.rates
            : [];

        for (const rate of rates) {
          const rateCancellation =
            this.extractCancellationFromPrice(
              rate,
            );

          if (rateCancellation) {
            return rateCancellation;
          }
        }
      }
    }

    /*
     * Fallback for responses that expose prices
     * outside featured_prices.
     */
    const prices =
      Array.isArray(data?.prices)
        ? data.prices
        : [];

    for (const price of prices) {
      const priceCancellation =
        this.extractCancellationFromPrice(
          price,
        );

      if (priceCancellation) {
        return priceCancellation;
      }

      const rooms =
        Array.isArray(price?.rooms)
          ? price.rooms
          : [];

      for (const room of rooms) {
        const roomCancellation =
          this.extractCancellationFromPrice(
            room,
          );

        if (roomCancellation) {
          return roomCancellation;
        }

        const rates =
          Array.isArray(room?.rates)
            ? room.rates
            : [];

        for (const rate of rates) {
          const rateCancellation =
            this.extractCancellationFromPrice(
              rate,
            );

          if (rateCancellation) {
            return rateCancellation;
          }
        }
      }
    }

    return undefined;
  }

  /*
   * =========================================================
   * Cancellation From Rate
   * =========================================================
   */

  private extractCancellationFromPrice(
    value: any,
  ): string | undefined {
    if (
      !value ||
      typeof value !==
      "object"
    ) {
      return undefined;
    }

    /*
     * Explicit free cancellation.
     */

    if (
      value.free_cancellation ===
      true
    ) {
      const date =
        this.firstString(
          value.free_cancellation_until_date,
        );

      const time =
        this.firstString(
          value.free_cancellation_until_time,
        );

      if (date && time) {
        return `Free until ${date} at ${time}`;
      }

      if (date) {
        return `Free until ${date}`;
      }

      return "Free cancellation";
    }

    /*
     * Explicit cancellation text.
     */

    const direct =
      this.firstString(
        value.cancellation_policy,
        value.cancellationPolicy,
        value.cancellation?.text,
        value.cancellation?.policy,
      );

    if (direct) {
      return direct;
    }

    return undefined;
  }

  /*
   * =========================================================
   * Address
   * =========================================================
   */

  private extractAddress(
    hotel: any,
  ): string {
    return (
      this.firstString(
        hotel.address,

        hotel.property_details
          ?.address,

        hotel.location
          ?.address,

        hotel.location
          ?.formatted_address,

        hotel.location
          ?.formattedAddress,
      ) ?? ""
    );
  }

  /*
   * =========================================================
   * Description
   * =========================================================
   */

  private extractDescription(
    hotel: any,
  ): string {
    const description =
      this.firstString(
        hotel.description,

        hotel.snippet,

        hotel.property_details
          ?.description,
      );

    if (description) {
      return description;
    }

    const type =
      this.firstString(
        hotel.type,
      );

    if (
      type &&
      !this.isGenericHotelType(
        type,
      )
    ) {
      return type;
    }

    return "";
  }

  /*
   * =========================================================
   * Amenities
   * =========================================================
   */

  private extractAmenities(
    hotel: any,
  ): string[] | undefined {
    const direct =
      this.toStringArray(
        hotel.amenities,
      );

    if (
      direct.length > 0
    ) {
      return direct;
    }

    const propertyAmenities =
      this.toStringArray(
        hotel.property_details
          ?.amenities,
      );

    if (
      propertyAmenities.length >
      0
    ) {
      return propertyAmenities;
    }

    return undefined;
  }

  /*
   * =========================================================
   * Distance From Center
   * =========================================================
   */

  private extractDistanceFromCenter(
    hotel: any,
  ): string | undefined {
    const direct =
      this.firstString(
        hotel.distance_from_center,

        hotel.distanceFromCenter,

        hotel.distance,

        hotel.location
          ?.distance_from_center,

        hotel.location
          ?.distanceFromCenter,

        hotel.property_details
          ?.distance_from_center,

        hotel.property_details
          ?.distanceFromCenter,
      );

    if (direct) {
      return direct;
    }

    const location =
      hotel.location;

    if (
      location &&
      typeof location ===
      "object"
    ) {
      const nested =
        this.firstString(
          location.center_distance,

          location.centerDistance,

          location.distance_to_center,

          location.distanceToCenter,
        );

      if (nested) {
        return nested;
      }
    }

    return undefined;
  }

  /*
   * =========================================================
   * Numeric Value
   * =========================================================
   */

  private numericValue(
    value: unknown,
  ): number | undefined {
    if (
      typeof value ===
      "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (
      typeof value ===
      "string"
    ) {
      const parsed =
        Number(
          value.replace(
            /,/g,
            "",
          ),
        );

      if (
        Number.isFinite(
          parsed,
        )
      ) {
        return parsed;
      }
    }

    return undefined;
  }

  /*
   * =========================================================
   * String Helper
   * =========================================================
   */

  private firstString(
    ...values: unknown[]
  ): string | undefined {
    for (
      const value of values
    ) {
      if (
        typeof value !==
        "string"
      ) {
        continue;
      }

      const trimmed =
        value.trim();

      if (
        trimmed.length > 0
      ) {
        return trimmed;
      }
    }

    return undefined;
  }

  /*
   * =========================================================
   * Array Helper
   * =========================================================
   */

  private toStringArray(
    value: unknown,
  ): string[] {
    if (
      !Array.isArray(value)
    ) {
      return [];
    }

    return value
      .filter(
        (
          item,
        ): item is string =>
          typeof item ===
          "string" &&
          item.trim().length >
          0,
      )
      .map(
        (item) =>
          item.trim(),
      );
  }

  /*
   * =========================================================
   * Generic Hotel Type
   * =========================================================
   */

  private isGenericHotelType(
    value: string,
  ): boolean {
    const normalized =
      value
        .trim()
        .toLowerCase();

    return (
      normalized ===
      "hotel" ||
      normalized ===
      "lodging" ||
      normalized ===
      "property"
    );
  }
}