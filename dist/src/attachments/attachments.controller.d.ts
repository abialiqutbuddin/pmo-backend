import { AttachmentsService } from './attachments.service';
import express from 'express';
export declare class AttachmentsController {
    private readonly attachments;
    constructor(attachments: AttachmentsService);
    upload(eventId: string, file: Express.Multer.File, entityType: string, entityId: string, user: any): Promise<{
        id: string;
        objectKey: string;
        mimeType: string;
    }>;
    download(id: string, res: express.Response): Promise<void>;
    list(eventId: string, entityType: string, entityId: string): Promise<{
        id: string;
        objectKey: string;
        originalName: string;
        mimeType: string;
        size: number;
        createdAt: Date;
    }[]>;
    remove(eventId: string, id: string): Promise<{
        ok: boolean;
    }>;
}
