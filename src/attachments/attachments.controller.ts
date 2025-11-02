import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    UseGuards,
    UploadedFile,
    UseInterceptors,
    Res,
    BadRequestException,
    Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventGuard } from '../common/guards/event.guard';
import { AttachmentsService } from './attachments.service';
import express from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('events/:eventId/attachments')
@UseGuards(JwtAuthGuard, EventGuard)
export class AttachmentsController {
    constructor(private readonly attachments: AttachmentsService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: memoryStorage(),
        limits: { fileSize: 50 * 1024 * 1024 },
    }))
    async upload(
        @Param('eventId') eventId: string,
        @UploadedFile() file: Express.Multer.File,
        @Body('entityType') entityType: string,
        @Body('entityId') entityId: string,
        @CurrentUser() user: any,
    ) {
        return this.attachments.uploadAttachment(
            file.buffer,
            file.originalname,
            entityType,
            entityId,
            eventId,
            user.sub,
        );
    }

    @Get(':id')
    async download(@Param('id') id: string, @Res() res: express.Response) {
        const path = await this.attachments.resolvePath(id);
        res.setHeader('X-Accel-Redirect', `/protected/${path}`);
        res.status(200).end();
    }

    // NEW: list attachments for an entity in this event
    @Get()
    async list(
        @Param('eventId') eventId: string,
        @Query('entityType') entityType: string,
        @Query('entityId') entityId: string,
    ) {
        if (!entityType || !entityId) {
            throw new BadRequestException('entityType and entityId are required');
        }
        return this.attachments.listForEntity({ eventId, entityType, entityId });
    }
}
