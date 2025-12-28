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

@Controller('events/:eventId/tasks') // NEW: Central controller
@UseGuards(JwtAuthGuard, EventGuard)
export class CentralTasksController {
  constructor(private readonly tasks: TasksService) { }

  @Get()
  listAll(
    @Param('eventId') eventId: string,
    @Query('departmentIds') departmentIds: string, // Comma separated
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    const deptIds = departmentIds ? departmentIds.split(',').filter(Boolean) : undefined;
    return this.tasks.list(
      eventId,
      deptIds,
      { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager },
      { cursor, take: take ? Number(take) : undefined, assigneeId: assigneeId || undefined, zoneId: zoneId || undefined },
    );
  }
}

@Controller('events/:eventId/departments/:departmentId/tasks')
@UseGuards(JwtAuthGuard, EventGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) { }

  @Get()
  list(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string, // Kept for backward compatibility if inside /departments/:departmentId/tasks route
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('zoneId') zoneId?: string,
    @Query('zonalDeptRowId') zonalDeptRowId?: string,
  ) {
    return this.tasks.list(
      eventId,
      departmentId ? [departmentId] : undefined, // Convert single to array
      { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager },
      { cursor, take: take ? Number(take) : undefined, assigneeId: assigneeId || undefined, zoneId: zoneId || undefined, zonalDeptRowId: zonalDeptRowId || undefined },
    );
  }

  @Post()
  create(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager }, dto);
  }

  @Get('search')
  search(
    @Param('eventId') eventId: string,
    @Query('q') query: string,
    @Query('targetDeptId') targetDeptId?: string,
  ) {
    return this.tasks.searchTasks(eventId, query || '', targetDeptId);
  }

  @Get(':taskId')
  get(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasks.get(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager });
  }

  @Patch(':taskId')
  update(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager }, dto);
  }

  @Patch(':taskId/status')
  changeStatus(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
    @Body() dto: ChangeTaskStatusDto,
  ) {
    return this.tasks.changeStatus(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager }, dto);
  }

  @Delete(':taskId')
  remove(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasks.remove(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager });
  }

  @Get(':taskId/activity')
  activity(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasks.getActivity(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager });
  }

  /* ---- Dependencies ---- */
  @Get(':taskId/dependencies')
  deps(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.tasks.listDependencies(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager });
  }

  @Post(':taskId/dependencies')
  addDep(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
    @Body() dto: AddDependencyDto,
  ) {
    return this.tasks.addDependency(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager }, dto);
  }

  @Delete(':taskId/dependencies')
  removeDep(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
    @Body() dto: RemoveDependencyDto,
  ) {
    return this.tasks.removeDependency(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin, isTenantManager: user.isTenantManager }, dto);
  }
}
