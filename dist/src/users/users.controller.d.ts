import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    create(user: any, dto: CreateUserDto): Promise<{
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
    list(user: any): Promise<{
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
    get(id: string, user: any): Promise<{
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
    update(id: string, dto: UpdateUserDto, user: any): Promise<{
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
    remove(id: string, user: any): Promise<{
        ok: boolean;
    }>;
}
