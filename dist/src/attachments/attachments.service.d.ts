import { PrismaService } from '../prisma/prisma.service';
export declare class AttachmentsService {
    private readonly prisma;
    private root;
    private maxBytes;
    constructor(prisma: PrismaService);
    uploadAttachment(buffer: Buffer, originalName: string, entityType: string, entityId: string, eventId: string, userId: string): Promise<{
        id: string;
        objectKey: string;
        mimeType: string;
    }>;
    resolvePath(id: string): Promise<string>;
    listForEntity(input: {
        eventId: string;
        entityType: string;
        entityId: string;
    }): Promise<{
        id: string;
        objectKey: string;
        originalName: string;
        mimeType: string;
        size: number;
        createdAt: Date;
    }[]>;
    delete(id: string, alsoRemoveFile?: boolean): Promise<{
        ok: boolean;
    }>;
    deleteForEvent(eventId: string, id: string, alsoRemoveFile?: boolean): Promise<{
        ok: boolean;
    }>;
}
