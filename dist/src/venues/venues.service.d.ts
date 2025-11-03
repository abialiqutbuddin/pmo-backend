import { PrismaService } from '../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
export declare class VenuesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(eventId: string, q?: string): Promise<{
        name: string;
        id: string;
    }[]>;
    create(eventId: string, dto: CreateVenueDto): Promise<{
        name: string;
        id: string;
    }>;
}
