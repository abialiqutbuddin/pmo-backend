import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventGuard } from '../common/guards/event.guard';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('events/:eventId/feedback')
@UseGuards(JwtAuthGuard, EventGuard)
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get()
  list(@Param('eventId') eventId: string) {
    return this.feedback.list(eventId);
  }

  @Post()
  create(@Param('eventId') eventId: string, @Body() dto: CreateFeedbackDto) {
    return this.feedback.create(eventId, dto);
  }
}

