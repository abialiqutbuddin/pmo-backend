import { ConversationKind } from '@prisma/client';
export declare class CreateConversationDto {
    eventId: string;
    kind: ConversationKind;
    title?: string;
    departmentId?: string;
    participantUserIds?: string[];
}
