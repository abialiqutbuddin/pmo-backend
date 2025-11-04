import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async list(eventId: string) {
    return this.prisma.feedback.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        eventId: true,
        venueId: true,
        name: true,
        email: true,
        phone: true,
        description: true,
        dateOccurred: true,
        createdAt: true,
      },
    });
  }

  async create(eventId: string, dto: CreateFeedbackDto) {
    return this.prisma.feedback.create({
      data: {
        eventId,
        venueId: dto.venueId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        description: dto.description,
        dateOccurred: dto.dateOccurred ? new Date(dto.dateOccurred) : undefined,
      },
      select: { id: true },
    });
  }
}

