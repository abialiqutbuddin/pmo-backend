import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(private readonly prisma: PrismaService) { }

    async log(
        actorId: string,
        eventId: string,
        action: AuditAction,
        entityType: string,
        entityId: string,
        diff?: Record<string, any>,
        description?: string,
    ) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    actorId,
                    eventId,
                    action,
                    entityType,
                    entityId,
                    diffJson: diff ? JSON.stringify(diff) : undefined,
                    description,
                },
            });
            // Also log to console for debugging/backup
            // this.logger.log(`AUDIT: [${action}] by ${actorId} on ${entityType}:${entityId}`);
        } catch (e) {
            this.logger.error(`Failed to create audit log for ${action}`, e);
            // We generally don't want to throw here and block the main action, 
            // but alerting might be good in a real prod env.
        }
    }
    async getHistory(entityType: string, entityId: string) {
        return this.prisma.auditLog.findMany({
            where: { entityType, entityId },
            orderBy: { createdAt: 'desc' },
            include: {
                actor: {
                    select: { id: true, fullName: true, email: true, profileImage: true },
                },
            },
        });
    }
}
