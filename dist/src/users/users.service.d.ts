import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateUserDto, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        email: string;
        id: string;
        fullName: string;
        createdAt: Date;
        isDisabled: boolean;
        isSuperAdmin: boolean;
    }>;
    list(actor: {
        isSuperAdmin: boolean;
    }): Promise<{
        email: string;
        id: string;
        fullName: string;
        createdAt: Date;
        isDisabled: boolean;
        isSuperAdmin: boolean;
        itsId: string | null;
        profileImage: string | null;
        organization: string | null;
        designation: string | null;
        phoneNumber: string | null;
    }[]>;
    get(id: string, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        email: string;
        id: string;
        fullName: string;
        createdAt: Date;
        isDisabled: boolean;
        isSuperAdmin: boolean;
        itsId: string | null;
        profileImage: string | null;
        organization: string | null;
        designation: string | null;
        phoneNumber: string | null;
    }>;
    update(id: string, dto: UpdateUserDto, actor: {
        id: string;
        isSuperAdmin: boolean;
    }): Promise<{
        email: string;
        id: string;
        fullName: string;
        createdAt: Date;
        isDisabled: boolean;
        isSuperAdmin: boolean;
        itsId: string | null;
        profileImage: string | null;
        organization: string | null;
        designation: string | null;
        phoneNumber: string | null;
    }>;
    delete(id: string, actor: {
        isSuperAdmin: boolean;
    }): Promise<void>;
}
