import { Injectable } from '@nestjs/common';

import { TravelRequestParser } from '../common/travel-request.parser';
import { TravelState } from '../graph/travel.state';

@Injectable()
export class RequestParserAgent {
  constructor(private readonly parser: TravelRequestParser) {}

  async invoke(state: TravelState) {
    return {
      tripRequest: this.parser.parse(state.message),
    };
  }
}
