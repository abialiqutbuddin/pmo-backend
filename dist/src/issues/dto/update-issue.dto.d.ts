import { IssueSeverity } from '@prisma/client';
export declare class UpdateIssueDto {
    title?: string;
    description?: string;
    severity?: IssueSeverity;
}
