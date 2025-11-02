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
exports.EventsController = void 0;
const common_1 = require("@nestjs/common");
const events_service_1 = require("./events.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_event_dto_1 = require("./dto/create-event.dto");
const update_event_dto_1 = require("./dto/update-event.dto");
const event_guard_1 = require("../common/guards/event.guard");
const role_guard_1 = require("../common/guards/role.guard");
const require_event_roles_decorator_1 = require("../common/decorators/require-event-roles.decorator");
const client_1 = require("@prisma/client");
const add_member_dto_1 = require("./dto/add-member.dto");
const update_member_dto_1 = require("./dto/update-member.dto");
let EventsController = class EventsController {
    events;
    constructor(events) {
        this.events = events;
    }
    createEvent(user, dto) {
        return this.events.create(dto, { id: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    listEvents(user) {
        return this.events.listForUser({ userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    getEvent(eventId, user) {
        return this.events.get(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    updateEvent(eventId, dto, user) {
        return this.events.update(eventId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    async deleteEvent(eventId, user) {
        return this.events.remove(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    listMembers(eventId, user) {
        return this.events.listMembers(eventId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    addMember(eventId, dto, user) {
        return this.events.addMember(eventId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    updateMember(eventId, userId, dto, user) {
        return this.events.updateMember(eventId, userId, dto, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    async removeMember(eventId, userId, user) {
        return this.events.removeMember(eventId, userId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
};
exports.EventsController = EventsController;
__decorate([
    (0, common_1.Post)('events'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_event_dto_1.CreateEventDto]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "createEvent", null);
__decorate([
    (0, common_1.Get)('events'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "listEvents", null);
__decorate([
    (0, common_1.Get)('events/:eventId'),
    (0, common_1.UseGuards)(event_guard_1.EventGuard),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "getEvent", null);
__decorate([
    (0, common_1.Patch)('events/:eventId'),
    (0, common_1.UseGuards)(event_guard_1.EventGuard, role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_event_dto_1.UpdateEventDto, Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "updateEvent", null);
__decorate([
    (0, common_1.Delete)('events/:eventId'),
    (0, common_1.UseGuards)(event_guard_1.EventGuard, role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "deleteEvent", null);
__decorate([
    (0, common_1.Get)('events/:eventId/members'),
    (0, common_1.UseGuards)(event_guard_1.EventGuard),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "listMembers", null);
__decorate([
    (0, common_1.Post)('events/:eventId/members'),
    (0, common_1.UseGuards)(event_guard_1.EventGuard, role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, add_member_dto_1.AddMemberDto, Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "addMember", null);
__decorate([
    (0, common_1.Patch)('events/:eventId/members/:userId'),
    (0, common_1.UseGuards)(event_guard_1.EventGuard, role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_member_dto_1.UpdateMemberDto, Object]),
    __metadata("design:returntype", void 0)
], EventsController.prototype, "updateMember", null);
__decorate([
    (0, common_1.Delete)('events/:eventId/members/:userId'),
    (0, common_1.UseGuards)(event_guard_1.EventGuard, role_guard_1.RoleGuard),
    (0, require_event_roles_decorator_1.RequireEventRoles)(client_1.EventRole.OWNER, client_1.EventRole.PMO_ADMIN),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EventsController.prototype, "removeMember", null);
exports.EventsController = EventsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsController);
//# sourceMappingURL=events.controller.js.map