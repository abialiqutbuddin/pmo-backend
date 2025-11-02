import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ReactDto } from './dto/react.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { CreateTaskFromMessageDto } from './dto/create-task-from-message.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AddParticipantDto } from './dto/add-participant.dto';
export declare class ChatController {
    private readonly chat;
    private readonly prisma;
    constructor(chat: ChatService, prisma: PrismaService);
    createConv(user: any, dto: CreateConversationDto): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        title: string | null;
        createdAt: Date;
        eventId: string;
        departmentId: string | null;
        issueId: string | null;
    }>;
    list(eventId: string, user: any): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        title: string | null;
        updatedAt: Date;
        departmentId: string | null;
        issueId: string | null;
    }[]>;
    send(user: any, dto: SendMessageDto): Promise<{
        id: string;
        createdAt: Date;
        body: string | null;
        conversationId: string;
        authorId: string;
        parentId: string | null;
    }>;
    react(user: any, dto: ReactDto): Promise<{
        action: string;
        id: string;
    } | {
        action: string;
        id?: undefined;
    }>;
    read(user: any, dto: MarkReadDto): Promise<{
        ok: boolean;
        at: string;
    }>;
    createTaskFromMessage(user: any, dto: CreateTaskFromMessageDto): Promise<{
        id: string;
        title: string;
        departmentId: string;
        status: import("@prisma/client").$Enums.TaskStatus;
    } | {
        error: string;
    }>;
    createDirect(user: any, body: {
        eventId: string;
        userId: string;
    }): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        title: string | null;
        updatedAt: Date;
        eventId: string;
    }>;
    listParticipants(conversationId: string, user: any): Promise<{
        role: string;
        user: {
            id: string;
            email: string;
            fullName: string;
            itsId: string | null;
            profileImage: string | null;
        };
        userId: string;
    }[]>;
    addParticipants(conversationId: string, dto: AddParticipantDto, user: any): Promise<{
        added: number;
    }>;
    listMessages(conversationId: string, user: any, limit?: string, before?: string): Promise<{
        items: {
            attachments: {
                id: string;
                originalName: string;
                mimeType: string;
                size: number;
                objectKey: string | null;
            }[];
            id: string;
            createdAt: Date;
            body: string | null;
            conversationId: string;
            authorId: string;
            parentId: string | null;
        }[];
        nextCursor: string | null;
    }>;
}
