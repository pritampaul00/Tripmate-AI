import { Injectable } from '@nestjs/common';

import { TravelRequestDto } from './dto/travel-request.dto';
import { TravelGraph } from '../graph/travel.graph';
import { createInitialState } from '../graph/create-initial-state';
import { TravelRequestParser } from '../common/travel-request.parser';
import { ResponseAgent } from '../agents/response.agent';

@Injectable()
export class TravelService {
  constructor(
    private readonly graph: TravelGraph,
    private readonly parser: TravelRequestParser,
    private readonly responseAgent: ResponseAgent,
  ) {}

  async planTrip(request: TravelRequestDto) {
    const parsed = this.parser.parse(request.message);

    if (parsed.missingFields.length > 0) {
  return {
    status: 'needs_input',
    request: parsed,
    missingFields: parsed.missingFields,
  };
}

    const state = await this.graph.invoke(
      createInitialState(request.message, parsed),
    );

    return this.responseAgent.invoke(state);
  }
}
