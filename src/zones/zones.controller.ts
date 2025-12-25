import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { EventGuard } from '../common/guards/event.guard';
import { CreateZoneDto } from './dto/create-zone.dto';
// import { RoleGuard } from '../common/guards/role.guard';
// import { RequireEventRoles } from '../common/decorators/require-event-roles.decorator';
import { RequirePermission } from '../common/guards/permissions.guard';

@Controller('events/:eventId/zones')
@UseGuards(JwtAuthGuard)
export class ZonesController {
  constructor(private readonly zones: ZonesService) { }

  @Get()
  @RequirePermission('events', 'read')
  list(@Param('eventId') eventId: string) {
    return this.zones.list(eventId);
  }

  @Post()
  @RequirePermission('events', 'manage')
  create(@Param('eventId') eventId: string, @Body() dto: CreateZoneDto) {
    return this.zones.create(eventId, dto);
  }

  @Patch(':zoneId')
  @RequirePermission('events', 'manage')
  update(@Param('eventId') eventId: string, @Param('zoneId') zoneId: string, @Body() body: { name?: string; enabled?: boolean }) {
    return this.zones.update(eventId, zoneId, body || {});
  }

  @Patch('/toggle')
  @RequirePermission('events', 'manage')
  toggle(@Param('eventId') eventId: string, @Query('enabled') enabled: string) {
    return this.zones.setZonesEnabled(eventId, enabled !== 'false');
  }

  @Get(':zoneId/departments')
  @RequirePermission('events', 'read')
  listZoneDepartments(@Param('eventId') eventId: string, @Param('zoneId') zoneId: string) {
    return this.zones.listZoneDepartments(eventId, zoneId);
  }

  @Post(':zoneId/departments')
  @RequirePermission('events', 'manage')
  setZoneDepartments(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
    @Body() body: { departmentIds: string[] },
  ) {
    return this.zones.setZoneDepartments(eventId, zoneId, Array.isArray(body?.departmentIds) ? body.departmentIds : []);
  }

  // Zonal department templates (apply to all zones)
  @Get('zonal-departments')
  @RequirePermission('events', 'read')
  listZonalTemplates(@Param('eventId') eventId: string) {
    return this.zones.listZonalTemplates(eventId);
  }

  @Post('zonal-departments')
  @RequirePermission('events', 'manage')
  createZonalTemplate(@Param('eventId') eventId: string, @Body() body: { name: string }) {
    return this.zones.createZonalTemplate(eventId, String(body?.name || ''));
  }

  @Patch('zonal-departments/:zdeptId')
  @RequirePermission('events', 'manage')
  updateZonalTemplate(@Param('eventId') eventId: string, @Param('zdeptId') zdeptId: string, @Body() body: { name: string }) {
    return this.zones.updateZonalTemplate(eventId, zdeptId, String(body?.name || ''));
  }

  @Delete('zonal-departments/:zdeptId')
  @RequirePermission('events', 'manage')
  removeZonalTemplate(@Param('eventId') eventId: string, @Param('zdeptId') zdeptId: string) {
    return this.zones.removeZonalTemplate(eventId, zdeptId);
  }

  // Per-zone mapped zonal departments
  @Get(':zoneId/zonal-departments')
  @RequirePermission('events', 'read')
  listZoneZonalDepts(@Param('eventId') eventId: string, @Param('zoneId') zoneId: string) {
    return this.zones.listZoneZonalDepts(eventId, zoneId);
  }

  // ---- Zone POCs ----
  @Get(':zoneId/pocs')
  @RequirePermission('events', 'read')
  listPOCs(@Param('eventId') eventId: string, @Param('zoneId') zoneId: string) {
    return this.zones.listPOCs(eventId, zoneId);
  }

  @Post(':zoneId/pocs')
  @RequirePermission('events', 'manage')
  addPOC(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
    @Body() body: { userId: string },
  ) {
    return this.zones.addPOC(eventId, zoneId, String(body?.userId || ''));
  }

  @Delete(':zoneId/pocs/:userId')
  @RequirePermission('events', 'manage')
  removePOC(@Param('eventId') eventId: string, @Param('zoneId') zoneId: string, @Param('userId') userId: string) {
    return this.zones.removePOC(eventId, zoneId, userId);
  }

  // ---- Zone-department members (heads/members in a zone) ----
  @Get(':zoneId/departments/:deptId/members')
  @RequirePermission('events', 'read')
  listZoneDeptMembers(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
    @Param('deptId') deptId: string,
  ) {
    return this.zones.listZoneDeptMembers(eventId, zoneId, deptId);
  }

  @Post(':zoneId/departments/:deptId/members')
  @RequirePermission('events', 'manage')
  addZoneDeptMember(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
    @Param('deptId') deptId: string,
    @Body() body: { userId: string; role: string },
  ) {
    return this.zones.addZoneDeptMember(eventId, zoneId, deptId, String(body?.userId || ''), String(body?.role || 'DEPT_MEMBER'));
  }

  @Patch(':zoneId/departments/:deptId/members/:userId')
  @RequirePermission('events', 'manage')
  updateZoneDeptMember(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
    @Param('deptId') deptId: string,
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    return this.zones.updateZoneDeptMember(eventId, zoneId, deptId, userId, String(body?.role || 'DEPT_MEMBER'));
  }

  @Delete(':zoneId/departments/:deptId/members/:userId')
  @RequirePermission('events', 'manage')
  removeZoneDeptMember(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
    @Param('deptId') deptId: string,
    @Param('userId') userId: string,
  ) {
    return this.zones.removeZoneDeptMember(eventId, zoneId, deptId, userId);
  }

  // ---- Generic zone assignments (HEAD/POC/MEMBER) ----
  @Get(':zoneId/assignments')
  @RequirePermission('events', 'read')
  listAssignments(@Param('eventId') eventId: string, @Param('zoneId') zoneId: string) {
    return this.zones.listAssignments(eventId, zoneId);
  }

  @Post(':zoneId/assignments')
  @RequirePermission('events', 'manage')
  addAssignment(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
    @Body() body: { userId: string; role: string },
  ) {
    return this.zones.addAssignment(eventId, zoneId, String(body?.userId || ''), String(body?.role || 'MEMBER'));
  }

  @Patch(':zoneId/assignments/:userId')
  @RequirePermission('events', 'manage')
  updateAssignment(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
    @Param('userId') userId: string,
    @Body() body: { role: string },
  ) {
    return this.zones.updateAssignment(eventId, zoneId, userId, String(body?.role || 'MEMBER'));
  }

  @Delete(':zoneId/assignments/:userId')
  @RequirePermission('events', 'manage')
  removeAssignment(
    @Param('eventId') eventId: string,
    @Param('zoneId') zoneId: string,
    @Param('userId') userId: string,
  ) {
    return this.zones.removeAssignment(eventId, zoneId, userId);
  }
}
