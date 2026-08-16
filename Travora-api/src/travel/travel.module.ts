import { Module } from "@nestjs/common";

import { TravelController } from "./travel.controller";
import { TravelService } from "./travel.service";

import { TravelGraph } from "../graph/travel.graph";

import { FlightAgent } from "../agents/flight.agent";
import { HotelAgent } from "../agents/hotel.agent";
import { ItineraryAgent } from "../agents/itinerary.agent";
import { RecommendationAgent } from "../agents/recommendation.agent";
import { ResponseAgent } from "../agents/response.agent";

import { TravelRequestParser } from "../common/travel-request.parser";
import { TravelDateResolver } from "../common/travel-date.resolver";

import { AirportService } from "../tools/airport.service";
import { SerpApiService } from "../tools/serpapi.service";
import { SerpHotelService } from "../tools/serp-hotel.service";
import { BudgetService } from "../tools/budget.service";
import { CurrencyService } from "../tools/currency.service";
import { FlightRankingService } from "../tools/flight-ranking.service";
import { HotelRankingService } from "../tools/hotel-ranking.service";
import { ItineraryCostService } from "../tools/itinerary-cost.service";
import { ItineraryContentService } from "../tools/itinerary-content.service";
import { DestinationActivityService } from "../tools/destination-activity.service";
import { ActivityPlanningService } from "../tools/activity-planning.service";
import { TripPlanAssembler } from "../tools/trip-plan.assembler";

import { TripFeasibilityNode } from '../graph/nodes/trip-feasibility.node';
import { TripFeasibilityService } from '../tools/trip-feasibility.service';
import { ItineraryPlannerService } from '../tools/itinerary-planner.service';
@Module({
  controllers: [
    TravelController,
  ],

  providers: [
    TravelService,
    TravelGraph,

    // Agents
    FlightAgent,
    HotelAgent,
    RecommendationAgent,
    ItineraryAgent,
    ResponseAgent,

    // Services
    TravelRequestParser,
    TravelDateResolver,
    AirportService,
    SerpApiService,
    SerpHotelService,
    BudgetService,
    CurrencyService,
    FlightRankingService,
    HotelRankingService,
    ItineraryCostService,
    ItineraryContentService,
    DestinationActivityService,
    ActivityPlanningService,
    TripPlanAssembler,
    TripFeasibilityNode,
    TripFeasibilityService,
    ItineraryPlannerService,
  ],
})
export class TravelModule {}