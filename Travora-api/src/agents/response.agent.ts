import { Injectable, Logger } from '@nestjs/common';

import { TravelState } from '../graph/travel.state';
import { TripPlanAssembler } from '../tools/trip-plan.assembler';

@Injectable()
export class ResponseAgent {
  private readonly logger =
    new Logger(ResponseAgent.name);

  constructor(
    private readonly tripPlanAssembler: TripPlanAssembler,
  ) {}

  async invoke(state: TravelState) {
    this.logger.log(
      '📦 Building frontend-ready TripPlan',
    );

    return this.tripPlanAssembler.assemble(
      state,
    );
  }
}