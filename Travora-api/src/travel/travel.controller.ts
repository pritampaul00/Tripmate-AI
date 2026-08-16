import { Body, Controller, Get, Post } from '@nestjs/common';
import { TravelService } from './travel.service';
import { TravelRequestDto } from './dto/travel-request.dto';

@Controller('travel')
export class TravelController {
  constructor(private readonly travelService: TravelService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'Travora Travel API',
    };
  }

  @Post()
  async planTrip(@Body() body: TravelRequestDto) {
    return this.travelService.planTrip(body);
  }
}