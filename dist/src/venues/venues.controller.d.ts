import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
export declare class VenuesController {
    private readonly venues;
    constructor(venues: VenuesService);
    list(eventId: string, q?: string): Promise<{
        name: string;
        id: string;
    }[]>;
    create(eventId: string, dto: CreateVenueDto): Promise<{
        name: string;
        id: string;
    }>;
}
