import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ReactDto } from './dto/react.dto';
import { MarkReadDto } from './dto/mark-read.dto';
export declare class ChatService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureEventMember(eventId: string, userId: string, isSuperAdmin: boolean): Promise<void>;
    createConversation(dto: CreateConversationDto, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        title: string | null;
        createdAt: Date;
        eventId: string;
        departmentId: string | null;
        issueId: string | null;
    }>;
    listConversations(eventId: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        title: string | null;
        updatedAt: Date;
        departmentId: string | null;
        issueId: string | null;
    }[]>;
    sendMessage(dto: SendMessageDto, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        body: string | null;
        conversationId: string;
        authorId: string;
        parentId: string | null;
    }>;
    addReaction(dto: ReactDto, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        action: string;
        id: string;
    } | {
        action: string;
        id?: undefined;
    }>;
    markRead(dto: MarkReadDto, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        ok: boolean;
        at: string;
    }>;
    private ensureParticipant;
    addParticipants(conversationId: string, userIds: string[], actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        added: number;
    }>;
    listParticipants(conversationId: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
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
    getOrCreateDirect(eventId: string, otherUserId: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        kind: import("@prisma/client").$Enums.ConversationKind;
        title: string | null;
        updatedAt: Date;
        eventId: string;
    }>;
    listMessages(conversationId: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }, limit?: number, before?: string): Promise<{
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
