import { Injectable } from '@nestjs/common';
import { START, END, StateGraph,} from '@langchain/langgraph';

import { TravelState, TravelStateAnnotation } from './travel.state';

import { FlightAgent } from '../agents/flight.agent';
import { HotelAgent } from '../agents/hotel.agent';
import { RecommendationAgent } from '../agents/recommendation.agent';
import { ItineraryAgent } from '../agents/itinerary.agent';
import { ResponseAgent } from '../agents/response.agent';

import { TripFeasibilityNode } from './nodes/trip-feasibility.node';

@Injectable()
export class TravelGraph {
  private graph;

  constructor(
    private readonly flightAgent: FlightAgent,
    private readonly hotelAgent: HotelAgent,
    private readonly recommendationAgent: RecommendationAgent,
    private readonly itineraryAgent: ItineraryAgent,
    private readonly tripFeasibilityNode: TripFeasibilityNode,
    private readonly responseAgent: ResponseAgent,
  ) {
    this.graph = new StateGraph(
      TravelStateAnnotation,
    )

      .addNode(
        'flightNode',
        (state: TravelState) =>
          this.flightAgent.invoke(state),
      )

      .addNode(
        'hotelNode',
        (state: TravelState) =>
          this.hotelAgent.invoke(state),
      )

      .addNode(
        'recommendationNode',
        (state: TravelState) =>
          this.recommendationAgent.invoke(state),
      )

      .addNode(
        'itineraryNode',
        (state: TravelState) =>
          this.itineraryAgent.invoke(state),
      )

      .addNode(
        'tripFeasibilityNode',
        (state: TravelState) =>
          this.tripFeasibilityNode.invoke(state),
      )

      .addNode(
        'responseNode',
        (state: TravelState) =>
          this.responseAgent.invoke(state),
      )

      .addEdge(
        START,
        'flightNode',
      )

      .addEdge(
        'flightNode',
        'hotelNode',
      )

      .addEdge(
        'hotelNode',
        'recommendationNode',
      )

      .addEdge(
        'recommendationNode',
        'itineraryNode',
      )

      .addEdge(
        'itineraryNode',
        'tripFeasibilityNode',
      )

      .addEdge(
        'tripFeasibilityNode',
        'responseNode',
      )

      .addEdge(
        'responseNode',
        END,
      )

      .compile();
  }

  async invoke(state: TravelState) {
    return this.graph.invoke(state);
  }
}