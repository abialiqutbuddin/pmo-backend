import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { EventRoleScope } from '@prisma/client';

export class CreateRoleDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(EventRoleScope)
    scope?: EventRoleScope;
}

export class UpdateRoleDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(EventRoleScope)
    scope?: EventRoleScope;

    @IsOptional()
    @IsArray()
    permissions?: { moduleId: string; actions: string[] }[];
}

export class AssignPermissionDto {
    @IsString()
    moduleId: string;

    @IsArray()
    @IsString({ each: true })
    actions: string[]; // ['read', 'create'] etc.
}
