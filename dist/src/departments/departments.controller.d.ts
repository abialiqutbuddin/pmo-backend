import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AddDeptMemberDto } from './dto/add-dept-member.dto';
import { UpdateDeptMemberDto } from './dto/update-dept-member.dto';
export declare class DepartmentsController {
    private readonly depts;
    constructor(depts: DepartmentsService);
    list(eventId: string, user: any): Promise<{
        name: string;
        id: string;
    }[]>;
    create(eventId: string, dto: CreateDepartmentDto, user: any): Promise<{
        name: string;
        id: string;
    }>;
    update(eventId: string, departmentId: string, dto: UpdateDepartmentDto, user: any): Promise<{
        name: string;
        id: string;
    }>;
    remove(eventId: string, departmentId: string, user: any): Promise<{
        ok: boolean;
    }>;
    listMembers(eventId: string, departmentId: string, user: any): Promise<{
        user: {
            email: string;
            id: string;
            fullName: string;
            itsId: string | null;
            profileImage: string | null;
        };
        id: string;
        createdAt: Date;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }[]>;
    addMember(eventId: string, departmentId: string, dto: AddDeptMemberDto, user: any): Promise<{
        id: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }>;
    updateMember(eventId: string, departmentId: string, userId: string, dto: UpdateDeptMemberDto, user: any): Promise<{
        id: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }>;
    removeMember(eventId: string, departmentId: string, userId: string, user: any): Promise<{
        ok: boolean;
    }>;
    listAssignable(eventId: string, departmentId: string, q: string | undefined, user: any): Promise<{
        userId: string;
        fullName: string;
        email: string;
    }[]>;
    bulkAdd(eventId: string, departmentId: string, body: {
        items: {
            userId: string;
            role: 'DEPT_HEAD' | 'DEPT_MEMBER' | 'OBSERVER';
        }[];
    }, user: any): Promise<{
        added: number;
    }>;
}
