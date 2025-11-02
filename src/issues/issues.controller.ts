import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventGuard } from '../common/guards/event.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { ChangeIssueStatusDto } from './dto/change-issue-status.dto';

@Controller('events/:eventId/departments/:departmentId/issues')
@UseGuards(JwtAuthGuard, EventGuard)
export class IssuesController {
  constructor(private readonly issues: IssuesService) {}

  @Get()
  list(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @CurrentUser() user: any,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.issues.list(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, { cursor, take: take ? Number(take) : undefined });
  }

  @Post()
  create(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateIssueDto,
  ) {
    return this.issues.create(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
  }

  @Get(':issueId')
  get(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('issueId') issueId: string,
    @CurrentUser() user: any,
  ) {
    return this.issues.get(eventId, departmentId, issueId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
  }

  @Patch(':issueId')
  update(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('issueId') issueId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateIssueDto,
  ) {
    return this.issues.update(eventId, departmentId, issueId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
  }

  @Patch(':issueId/status')
  changeStatus(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('issueId') issueId: string,
    @CurrentUser() user: any,
    @Body() dto: ChangeIssueStatusDto,
  ) {
    return this.issues.changeStatus(eventId, departmentId, issueId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
  }

  @Delete(':issueId')
  remove(
    @Param('eventId') eventId: string,
    @Param('departmentId') departmentId: string,
    @Param('issueId') issueId: string,
    @CurrentUser() user: any,
  ) {
    return this.issues.remove(eventId, departmentId, issueId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
  }
}
