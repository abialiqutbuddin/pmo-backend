"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZonesController = void 0;
const common_1 = require("@nestjs/common");
const zones_service_1 = require("./zones.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const event_guard_1 = require("../common/guards/event.guard");
const create_zone_dto_1 = require("./dto/create-zone.dto");
const role_guard_1 = require("../common/guards/role.guard");
const require_event_roles_decorator_1 = require("../common/decorators/require-event-roles.decorator");
const client_1 = require("@prisma/client");
let ZonesController = class ZonesController {
    zones;
    constructor(zones) {
        this.zones = zones;
    }
    list(eventId) {
        return this.zones.list(eventId);
    }
    create(eventId, dto) {
        return this.zones.create(eventId, dto);
    }
    update(eventId, zoneId, body) {
        return this.zones.update(eventId, zoneId, body || {});
    }
    toggle(eventId, enabled) {
        return this.zones.setZonesEnabled(eventId, enabled !== 'false');
    }
    listZoneDepartments(eventId, zoneId) {
        return this.zones.listZoneDepartments(eventId, zoneId);
    }
    setZoneDepartments(eventId, zoneId, body) {
        return this.zones.setZoneDepartments(eventId, zoneId, Array.isArray(body?.departmentIds) ? body.departmentIds : []);
    }
    listZonalTemplates(eventId) {
        return this.zones.listZonalTemplates(eventId);
    }
    createZonalTemplate(eventId, body) {
        return this.zones.createZonalTemplate(eventId, String(body?.name || ''));
    }
    updateZonalTemplate(eventId, zdeptId, body) {
        return this.zones.updateZonalTemplate(eventId, zdeptId, String(body?.name || ''));
    }
    removeZonalTemplate(eventId, zdeptId) {
        return this.zones.removeZonalTemplate(eventId, zdeptId);
    }
    listZoneZonalDepts(eventId, zoneId) {
        return this.zones.listZoneZonalDepts(eventId, zoneId);
    }
    listPOCs(eventId, zoneId) {
        return this.zones.listPOCs(eventId, zoneId);
    }
    addPOC(eventId, zoneId, body) {
        return this.zones.addPOC(eventId, zoneId, String(body?.userId || ''));
    }
    removePOC(eventId, zoneId, userId) {
        return this.zones.removePOC(eventId, zoneId, userId);
    }
    listZoneDeptMembers(eventId, zoneId, deptId) {
        return this.zones.listZoneDeptMembers(eventId, zoneId, deptId);
    }
    addZoneDeptMember(eventId, zoneId, deptId, body) {
        return this.zones.addZoneDeptMember(eventId, zoneId, deptId, String(body?.userId || ''), String(body?.role || 'DEPT_MEMBER'));
    }
    updateZoneDeptMember(eventId, zoneId, deptId, userId, body) {
        return this.zones.updateZoneDeptMember(eventId, zoneId, deptId, userId, String(body?.role || 'DEPT_MEMBER'));
    }
    removeZoneDeptMember(eventId, zoneId, deptId, userId) {
        return this.zones.removeZoneDeptMember(eventId, zoneId, deptId, userId);
    }
    listAssignments(eventId, zoneId) {
        return this.zones.listAssignments(eventId, zoneId);
    }
    addAssignment(eventId, zoneId, body) {
        return this.zones.addAssignment(eventId, zoneId, String(body?.userId || ''), String(body?.role || 'MEMBER'));
    }
    updateAssignment(eventId, zoneId, userId, body) {
        return this.zones.updateAssignment(eventId, zoneId, userId, String(body?.role || 'MEMBER'));
    }
    removeAssignment(eventId, zoneId, userId) {
        return this.zones.removeAssignment(eventId, zoneId, userId);
    }
};
exports.ZonesController = ZonesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_zone_dto_1.CreateZoneDto]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':zoneId'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)('/toggle'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Query)('enabled')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "toggle", null);
__decorate([
    (0, common_1.Get)(':zoneId/departments'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "listZoneDepartments", null);
__decorate([
    (0, common_1.Post)(':zoneId/departments'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "setZoneDepartments", null);
__decorate([
    (0, common_1.Get)('zonal-departments'),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "listZonalTemplates", null);
__decorate([
    (0, common_1.Post)('zonal-departments'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "createZonalTemplate", null);
__decorate([
    (0, common_1.Patch)('zonal-departments/:zdeptId'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zdeptId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "updateZonalTemplate", null);
__decorate([
    (0, common_1.Delete)('zonal-departments/:zdeptId'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zdeptId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "removeZonalTemplate", null);
__decorate([
    (0, common_1.Get)(':zoneId/zonal-departments'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "listZoneZonalDepts", null);
__decorate([
    (0, common_1.Get)(':zoneId/pocs'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "listPOCs", null);
__decorate([
    (0, common_1.Post)(':zoneId/pocs'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "addPOC", null);
__decorate([
    (0, common_1.Delete)(':zoneId/pocs/:userId'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "removePOC", null);
__decorate([
    (0, common_1.Get)(':zoneId/departments/:deptId/members'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Param)('deptId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "listZoneDeptMembers", null);
__decorate([
    (0, common_1.Post)(':zoneId/departments/:deptId/members'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Param)('deptId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "addZoneDeptMember", null);
__decorate([
    (0, common_1.Patch)(':zoneId/departments/:deptId/members/:userId'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Param)('deptId')),
    __param(3, (0, common_1.Param)('userId')),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "updateZoneDeptMember", null);
__decorate([
    (0, common_1.Delete)(':zoneId/departments/:deptId/members/:userId'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Param)('deptId')),
    __param(3, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "removeZoneDeptMember", null);
__decorate([
    (0, common_1.Get)(':zoneId/assignments'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "listAssignments", null);
__decorate([
    (0, common_1.Post)(':zoneId/assignments'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "addAssignment", null);
__decorate([
    (0, common_1.Patch)(':zoneId/assignments/:userId'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Param)('userId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "updateAssignment", null);
__decorate([
    (0, common_1.Delete)(':zoneId/assignments/:userId'),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('zoneId')),
    __param(2, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ZonesController.prototype, "removeAssignment", null);
exports.ZonesController = ZonesController = __decorate([
    (0, common_1.Controller)('events/:eventId/zones'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, event_guard_1.EventGuard, role_guard_1.RoleGuard),
    __metadata("design:paramtypes", [zones_service_1.ZonesService])
], ZonesController);
//# sourceMappingURL=zones.controller.js.map