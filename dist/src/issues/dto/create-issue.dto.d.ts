import { IssueSeverity } from '@prisma/client';
export declare class CreateIssueDto {
    title: string;
    description?: string;
    severity?: IssueSeverity;
}
