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
        const notification = await this.prisma.notification.create({
            data: {
                userId: dto.userId,
                eventId: dto.eventId,
                kind: dto.kind,
                title: dto.title,
                body: dto.body,
                link: dto.link,
            },
            include: { user: { select: { fcmToken: true } } }
        });

        // Send Push Notification if user has token
        if (notification.user?.fcmToken) {
            this.sendPush(notification.user.fcmToken, dto);
        }

        return notification;
    }

    private async sendPush(token: string, dto: CreateNotificationDto) {
        const NOTIFICATIONS_SERVICE_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3001';
        const NOTIFICATIONS_API_KEY = process.env.NOTIFICATIONS_API_KEY || 'dev-key-123';

        try {
            const axios = require('axios');
            await axios.post(
                `${NOTIFICATIONS_SERVICE_URL}/notifications/send`,
                {
                    channel: 'PUSH',
                    profile: 'FCM',
                    recipient: token,
                    data: {
                        title: dto.title,
                        body: dto.body || 'New notification',
                        // System notifications usually don't need collapseKey grouping unless specific
                        data: {
                            type: 'system',
                            kind: dto.kind,
                            link: dto.link,
                            eventId: dto.eventId
                        }
                    }
                },
                {
                    headers: { 'x-api-key': NOTIFICATIONS_API_KEY },
                    timeout: 5000
                }
            );
            console.log(`[System Push] Sent to ${dto.userId}`);
        } catch (e) {
            console.error(`[System Push] Failed to send to ${dto.userId}:`, e.message);
        }
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
