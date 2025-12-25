// src/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationDto {
    userId: string;
    eventId?: string;
    kind: string;
    title: string;
    body?: string;
    link?: string;
}

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateNotificationDto) {
        return this.prisma.notification.create({
            data: {
                userId: dto.userId,
                eventId: dto.eventId,
                kind: dto.kind,
                title: dto.title,
                body: dto.body,
                link: dto.link,
            },
        });
    }

    async listForUser(userId: string, eventId?: string) {
        return this.prisma.notification.findMany({
            where: {
                userId,
                ...(eventId && { eventId }),
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async markAsRead(id: string, userId: string) {
        const notification = await this.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!notification) throw new NotFoundException('Notification not found');

        return this.prisma.notification.update({
            where: { id },
            data: { readAt: new Date() },
        });
    }

    async markAllAsRead(userId: string, eventId?: string) {
        return this.prisma.notification.updateMany({
            where: {
                userId,
                readAt: null,
                ...(eventId && { eventId }),
            },
            data: { readAt: new Date() },
        });
    }

    async getUnreadCount(userId: string, eventId?: string) {
        return this.prisma.notification.count({
            where: {
                userId,
                readAt: null,
                ...(eventId && { eventId }),
            },
        });
    }
}
