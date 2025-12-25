// src/tasks/task-comments.service.ts
import { ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateCommentDto {
    content: string;
    mentionedUserIds?: string[];
}

import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TaskCommentsService {
    private readonly logger = new Logger(TaskCommentsService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
        private readonly notificationsService: NotificationsService,
    ) { }

    async list(taskId: string) {
        // Verify task exists
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        return this.prisma.taskComment.findMany({
            where: { taskId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        profileImage: true,
                    },
                },
                attachments: true,
                mentions: {
                    include: {
                        mentionedUser: {
                            select: { id: true, fullName: true, email: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async create(
        taskId: string,
        userId: string,
        dto: CreateCommentDto,
    ) {
        // Verify task exists
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException('Task not found');

        // Create comment with mentions
        const comment = await this.prisma.taskComment.create({
            data: {
                taskId,
                userId,
                content: dto.content,
                mentions: dto.mentionedUserIds?.length
                    ? {
                        createMany: {
                            data: dto.mentionedUserIds.map((uid) => ({ mentionedUserId: uid })),
                        },
                    }
                    : undefined,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        profileImage: true,
                    },
                },
                attachments: true,
                mentions: {
                    include: {
                        mentionedUser: {
                            select: { id: true, fullName: true, email: true },
                        },
                    },
                },
            },
        });

        // 🔍 AUDIT LOG (Unified)
        const mentions = dto.mentionedUserIds || [];
        const hasAttachments = dto.content.includes('Attached: ');
        let logDesc = 'Added a comment';
        if (mentions.length) logDesc += ` (Tagged ${mentions.length} users)`;
        if (hasAttachments) logDesc += ` (with attachments)`;

        await this.auditService.log(
            userId,
            task.eventId,
            'COMMENT_ADDED' as any,
            'Task',
            taskId,
            {
                commentId: comment.id,
                content: dto.content,
                mentionedUserIds: mentions.length ? mentions : undefined
            },
            logDesc
        );

        // In-app notifications for mentioned users
        if (mentions.length > 0) {
            const actorName = comment.user.fullName || 'Someone';
            for (const mentionedUserId of mentions) {
                try {
                    await this.notificationsService.create({
                        userId: mentionedUserId,
                        eventId: task.eventId,
                        kind: 'USER_MENTIONED',
                        title: 'You were mentioned',
                        body: `${actorName} mentioned you in a comment on "${task.title}"`,
                        link: `/events/${task.eventId}/tasks/${taskId}`,
                    });
                } catch (e: any) {
                    this.logger.warn(`In-app notification (mention) failed: ${e?.message || e}`);
                }
            }
        }

        return comment;
    }

    async delete(commentId: string, userId: string, isSuperAdmin: boolean) {
        const comment = await this.prisma.taskComment.findUnique({
            where: { id: commentId },
        });
        if (!comment) throw new NotFoundException('Comment not found');

        // Only the author or super admin can delete
        if (comment.userId !== userId && !isSuperAdmin) {
            throw new ForbiddenException('You can only delete your own comments');
        }

        await this.prisma.taskComment.delete({ where: { id: commentId } });
        return { ok: true };
    }

    // Future: Add attachment to comment
    async addAttachment(
        commentId: string,
        userId: string,
        file: { fileName: string; filePath: string; mimeType?: string; size?: number },
    ) {
        const comment = await this.prisma.taskComment.findUnique({
            where: { id: commentId },
        });
        if (!comment) throw new NotFoundException('Comment not found');

        // Only author can add attachments
        if (comment.userId !== userId) {
            throw new ForbiddenException('You can only add attachments to your own comments');
        }

        const attachment = await this.prisma.taskCommentAttachment.create({
            data: {
                commentId,
                fileName: file.fileName,
                filePath: file.filePath,
                mimeType: file.mimeType,
                size: file.size,
            },
        });

        // 🔍 AUDIT LOG: We need eventId. Fetch it via comment->task
        const task = await this.prisma.task.findUnique({ where: { id: comment.taskId }, select: { eventId: true } });
        if (task) {
            this.auditService.log(
                userId,
                task.eventId,
                'FILE_UPLOADED' as any,
                'Task',
                comment.taskId,
                { attachmentId: attachment.id, fileName: file.fileName },
                `Uploaded file "${file.fileName}"`
            );
        }

        return attachment;
    }
}
