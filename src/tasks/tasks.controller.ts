import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventGuard } from '../common/guards/event.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ChangeTaskStatusDto } from './dto/change-task-status.dto';
import { AddDependencyDto } from './dto/dependencies/add-dependency.dto';
import { RemoveDependencyDto } from './dto/dependencies/remove-dependency.dto';

@Controller('events/:eventId/departments/:departmentId/tasks')
@UseGuards(JwtAuthGuard, EventGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.tasks.list(
      eventId,
      departmentId,
      { userId: user.sub, isSuperAdmin: user.isSuperAdmin },
      { cursor, take: take ? Number(take) : undefined, assigneeId: assigneeId || undefined },
    );
  }

  @Post()
  create(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
  }

  @Get(':taskId')
  get(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasks.get(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Patch(':taskId')
  update(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
  }

  @Patch(':taskId/status')
  changeStatus(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
    @Body() dto: ChangeTaskStatusDto,
  ) {
    return this.tasks.changeStatus(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
  }

  @Delete(':taskId')
  remove(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasks.remove(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  /* ---- Dependencies ---- */
  @Get(':taskId/dependencies')
  deps(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasks.listDependencies(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Post(':taskId/dependencies')
  addDep(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
    @Body() dto: AddDependencyDto,
  ) {
    return this.tasks.addDependency(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
  }

  @Delete(':taskId/dependencies')
  removeDep(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
    @Body() dto: RemoveDependencyDto,
  ) {
    return this.tasks.removeDependency(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
  }
}
