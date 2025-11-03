import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(eventId: string, q?: string) {
    return this.prisma.venue.findMany({
      where: {
        eventId,
        ...(q ? { name: { contains: q} } : {}),
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async create(eventId: string, dto: CreateVenueDto) {
    const name = dto.name.trim();
    if (!name) throw new Error('Invalid name');
    // Upsert to avoid duplicate venue names within the same event
    const existing = await this.prisma.venue.findFirst({ where: { eventId, name } });
    if (existing) return existing;
    return this.prisma.venue.create({ data: { eventId, name }, select: { id: true, name: true } });
  }
}

