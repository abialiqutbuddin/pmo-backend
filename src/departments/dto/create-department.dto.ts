// src/departments/dto/create-department.dto.ts
import { IsString } from 'class-validator';
export class CreateDepartmentDto {
  @IsString() name!: string;
}
