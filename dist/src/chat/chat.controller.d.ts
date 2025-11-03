import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ReactDto } from './dto/react.dto';
import { MarkReadDto } from './dto/mark-read.dto';
import { CreateTaskFromMessageDto } from './dto/create-task-from-message.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AddParticipantDto } from './dto/add-participant.dto';
import { ChatGateway } from './chat.gateway';
export declare class ChatController {
    private readonly chat;
    private readonly prisma;
    private readonly gateway;
    constructor(chat: ChatService, prisma: PrismaService, gateway: ChatGateway);
    createConv(user: any, dto: CreateConversationDto): Promise<{
        id: string;
        createdAt: Date;
        departmentId: string | null;
        eventId: string;
        title: string | null;
        issueId: string | null;
        kind: import("@prisma/client").$Enums.ConversationKind;
    }>;
    list(eventId: string, user: any): Promise<any[]>;
    send(user: any, dto: SendMessageDto): Promise<{
        id: string;
        createdAt: Date;
        conversationId: string;
        body: string | null;
        parentId: string | null;
        authorId: string;
        author: {
            email: string;
            id: string;
            fullName: string;
            itsId: string | null;
            profileImage: string | null;
        };
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
        departmentId: string;
        title: string;
        status: import("@prisma/client").$Enums.TaskStatus;
    } | {
        error: string;
    }>;
    createDirect(user: any, body: {
        eventId: string;
        userId: string;
    }): Promise<{
        id: string;
        eventId: string;
        title: string | null;
        updatedAt: Date;
        kind: import("@prisma/client").$Enums.ConversationKind;
    }>;
    listParticipants(conversationId: string, user: any): Promise<{
        user: {
            email: string;
            id: string;
            fullName: string;
            itsId: string | null;
            profileImage: string | null;
        };
        userId: string;
        role: string;
        lastReadAt: Date | null;
    }[]>;
    addParticipants(conversationId: string, dto: AddParticipantDto, user: any): Promise<{
        added: number;
        messageId?: undefined;
    } | {
        added: number;
        messageId: string;
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
            isSystem: boolean;
            id: string;
            createdAt: Date;
            conversationId: string;
            body: string | null;
            parentId: string | null;
            authorId: string;
            author: {
                email: string;
                id: string;
                fullName: string;
                itsId: string | null;
                profileImage: string | null;
            };
        }[];
        nextCursor: string | null;
    }>;
    readers(messageId: string, user: any): Promise<{
        userId: string;
        fullName: string;
        email: string;
        itsId: string | null;
        profileImage: string | null;
        readAt: Date | null;
    }[]>;
    removeParticipant(conversationId: string, userId: string, user: any): Promise<{
        ok: boolean;
        messageId?: undefined;
    } | {
        ok: boolean;
        messageId: string;
    }>;
    updateParticipant(conversationId: string, userId: string, body: {
        role?: string;
    }, user: any): Promise<{
        ok: boolean;
    }>;
}
