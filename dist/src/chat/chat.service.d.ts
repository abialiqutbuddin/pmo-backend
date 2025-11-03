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
        createdAt: Date;
        departmentId: string | null;
        eventId: string;
        title: string | null;
        issueId: string | null;
        kind: import("@prisma/client").$Enums.ConversationKind;
    }>;
    listConversations(eventId: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<any[]>;
    sendMessage(dto: SendMessageDto, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
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
        messageId?: undefined;
    } | {
        added: number;
        messageId: string;
    }>;
    removeParticipant(conversationId: string, userId: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        ok: boolean;
        messageId?: undefined;
    } | {
        ok: boolean;
        messageId: string;
    }>;
    updateParticipantRole(conversationId: string, userId: string, role: string | undefined, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        ok: boolean;
    }>;
    listParticipants(conversationId: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
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
    getOrCreateDirect(eventId: string, otherUserId: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        eventId: string;
        title: string | null;
        updatedAt: Date;
        kind: import("@prisma/client").$Enums.ConversationKind;
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
    messageReaders(messageId: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        userId: string;
        fullName: string;
        email: string;
        itsId: string | null;
        profileImage: string | null;
        readAt: Date | null;
    }[]>;
}
