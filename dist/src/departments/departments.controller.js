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
exports.DepartmentsController = void 0;
const common_1 = require("@nestjs/common");
const departments_service_1 = require("./departments.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const event_guard_1 = require("../common/guards/event.guard");
const role_guard_1 = require("../common/guards/role.guard");
const require_event_roles_decorator_1 = require("../common/decorators/require-event-roles.decorator");
const client_1 = require("@prisma/client");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_department_dto_1 = require("./dto/create-department.dto");
const update_department_dto_1 = require("./dto/update-department.dto");
const add_dept_member_dto_1 = require("./dto/add-dept-member.dto");
const update_dept_member_dto_1 = require("./dto/update-dept-member.dto");
let DepartmentsController = class DepartmentsController {
    depts;
    constructor(depts) {
        this.depts = depts;
    }
    list(eventId, user) {
        return this.depts.list(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    create(eventId, dto, user) {
        return this.depts.create(eventId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    update(eventId, departmentId, dto, user) {
        return this.depts.update(eventId, departmentId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    remove(eventId, departmentId, user) {
        return this.depts.remove(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    listMembers(eventId, departmentId, user) {
        return this.depts.listMembers(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    addMember(eventId, departmentId, dto, user) {
        return this.depts.addMember(eventId, departmentId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    updateMember(eventId, departmentId, userId, dto, user) {
        return this.depts.updateMember(eventId, departmentId, userId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    removeMember(eventId, departmentId, userId, user) {
        return this.depts.removeMember(eventId, departmentId, userId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    listAssignable(eventId, departmentId, q, user) {
        return this.depts.listAssignable(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, q);
    }
    bulkAdd(eventId, departmentId, body, user) {
        return this.depts.bulkAddMembers(eventId, departmentId, body.items ?? [], { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
};
exports.DepartmentsController = DepartmentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_department_dto_1.CreateDepartmentDto, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':departmentId'),
    (0, common_1.UseGuards)(role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_department_dto_1.UpdateDepartmentDto, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':departmentId'),
    (0, common_1.UseGuards)(role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':departmentId/members'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "listMembers", null);
__decorate([
    (0, common_1.Post)(':departmentId/members'),
    (0, common_1.UseGuards)(role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, add_dept_member_dto_1.AddDeptMemberDto, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "addMember", null);
__decorate([
    (0, common_1.Patch)(':departmentId/members/:userId'),
    (0, common_1.UseGuards)(role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('userId')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, update_dept_member_dto_1.UpdateDeptMemberDto, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "updateMember", null);
__decorate([
    (0, common_1.Delete)(':departmentId/members/:userId'),
    (0, common_1.UseGuards)(role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('userId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "removeMember", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, event_guard_1.EventGuard),
    (0, common_1.Get)(':departmentId/assignable'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "listAssignable", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, event_guard_1.EventGuard, role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    (0, common_1.Post)(':departmentId/members:bulk'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], DepartmentsController.prototype, "bulkAdd", null);
exports.DepartmentsController = DepartmentsController = __decorate([
    (0, common_1.Controller)('events/:eventId/departments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, event_guard_1.EventGuard),
    __metadata("design:paramtypes", [departments_service_1.DepartmentsService])
], DepartmentsController);
//# sourceMappingURL=departments.controller.js.map