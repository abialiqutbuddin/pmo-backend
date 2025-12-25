// src/departments/dto/create-department.dto.ts
import { IsString, IsOptional } from 'class-validator';
export class CreateDepartmentDto {
  @IsString() name!: string;
  @IsOptional() @IsString() parentId?: string;
}
