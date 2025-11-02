import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AddDeptMemberDto } from './dto/add-dept-member.dto';
import { UpdateDeptMemberDto } from './dto/update-dept-member.dto';
export declare class DepartmentsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private static readonly ADMIN_ROLES;
    private static readonly DEPT_SCOPED;
    private assertAdmin;
    private assertMember;
    list(eventId: string, viewer: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        name: string;
        id: string;
    }[]>;
    create(eventId: string, dto: CreateDepartmentDto, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        name: string;
        id: string;
    }>;
    update(eventId: string, departmentId: string, dto: UpdateDepartmentDto, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        name: string;
        id: string;
    }>;
    remove(eventId: string, departmentId: string, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        ok: boolean;
    }>;
    listMembers(eventId: string, departmentId: string, viewer: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
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
    addMember(eventId: string, departmentId: string, dto: AddDeptMemberDto, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }>;
    updateMember(eventId: string, departmentId: string, userId: string, dto: UpdateDeptMemberDto, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        id: string;
        userId: string;
        role: import("@prisma/client").$Enums.EventRole;
        departmentId: string | null;
    }>;
    removeMember(eventId: string, departmentId: string, userId: string, actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        ok: boolean;
    }>;
    listAssignable(eventId: string, departmentId: string, viewer: {
        userId: string;
        isSuperAdmin: boolean;
    }, q?: string): Promise<{
        userId: string;
        fullName: string;
        email: string;
    }[]>;
    bulkAddMembers(eventId: string, departmentId: string, items: {
        userId: string;
        role: 'DEPT_HEAD' | 'DEPT_MEMBER' | 'OBSERVER';
    }[], actor: {
        userId: string;
        isSuperAdmin: boolean;
    }): Promise<{
        added: number;
    }>;
}
