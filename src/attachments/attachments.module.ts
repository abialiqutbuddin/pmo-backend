import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService, PrismaService],
  exports: [AttachmentsService],
})
export class AttachmentsModule { }