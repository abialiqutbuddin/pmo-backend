// src/departments/dto/update-department.dto.ts
import { IsOptional, IsString } from 'class-validator';
export class UpdateDepartmentDto {
  @IsOptional() @IsString() name?: string;
}
