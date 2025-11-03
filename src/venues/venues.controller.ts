import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventGuard } from '../common/guards/event.guard';
import { CreateVenueDto } from './dto/create-venue.dto';

@Controller('events/:eventId/venues')
@UseGuards(JwtAuthGuard, EventGuard)
export class VenuesController {
  constructor(private readonly venues: VenuesService) {}

  @Get()
  list(@Param('eventId') eventId: string, @Query('q') q?: string) {
    return this.venues.list(eventId, q);
  }

  @Post()
  create(@Param('eventId') eventId: string, @Body() dto: CreateVenueDto) {
    return this.venues.create(eventId, dto);
  }
}
