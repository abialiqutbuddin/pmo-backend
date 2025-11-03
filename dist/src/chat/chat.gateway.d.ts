import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly jwt;
    private readonly chat;
    private readonly prisma;
    server: Server;
    private readonly logger;
    constructor(jwt: JwtService, chat: ChatService, prisma: PrismaService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    onJoin(data: {
        conversationId: string;
    }, client: Socket): Promise<void>;
    onLeave(data: {
        conversationId: string;
    }, client: Socket): Promise<void>;
    onMessage(body: {
        conversationId: string;
        body?: string;
        parentId?: string;
    }, client: Socket): Promise<any>;
    kickFromConversation(conversationId: string, userId: string): Promise<void>;
    onAttachmentUploaded(body: {
        messageId: string;
    }, client: Socket): Promise<{
        count: number;
    } | undefined>;
    onReact(body: {
        messageId: string;
        emoji: string;
    }, client: Socket): Promise<{
        action: string;
        id: string;
    } | {
        action: string;
        id?: undefined;
    }>;
    onRead(body: {
        conversationId: string;
    }, client: Socket): Promise<{
        ok: boolean;
        at: string;
    }>;
}
