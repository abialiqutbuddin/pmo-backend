import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
export declare class FeedbackController {
    private readonly feedback;
    constructor(feedback: FeedbackService);
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
