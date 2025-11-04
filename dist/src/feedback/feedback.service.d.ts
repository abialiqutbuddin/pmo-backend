import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
export declare class FeedbackService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(eventId: string): Promise<{
        email: string | null;
        name: string | null;
        id: string;
        createdAt: Date;
        eventId: string;
        venueId: string | null;
        description: string;
        phone: string | null;
        dateOccurred: Date | null;
    }[]>;
    create(eventId: string, dto: CreateFeedbackDto): Promise<{
        id: string;
    }>;
}
