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
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const tasks_service_1 = require("./tasks.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const event_guard_1 = require("../common/guards/event.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_task_dto_1 = require("./dto/create-task.dto");
const update_task_dto_1 = require("./dto/update-task.dto");
const change_task_status_dto_1 = require("./dto/change-task-status.dto");
const add_dependency_dto_1 = require("./dto/dependencies/add-dependency.dto");
const remove_dependency_dto_1 = require("./dto/dependencies/remove-dependency.dto");
let TasksController = class TasksController {
    tasks;
    constructor(tasks) {
        this.tasks = tasks;
    }
    list(eventId, departmentId, user, cursor, take, assigneeId, zoneId, zonalDeptRowId) {
        return this.tasks.list(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, { cursor, take: take ? Number(take) : undefined, assigneeId: assigneeId || undefined, zoneId: zoneId || undefined, zonalDeptRowId: zonalDeptRowId || undefined });
    }
    create(eventId, departmentId, user, dto) {
        return this.tasks.create(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
    }
    get(eventId, departmentId, taskId, user) {
        return this.tasks.get(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    update(eventId, departmentId, taskId, user, dto) {
        return this.tasks.update(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
    }
    changeStatus(eventId, departmentId, taskId, user, dto) {
        return this.tasks.changeStatus(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
    }
    remove(eventId, departmentId, taskId, user) {
        return this.tasks.remove(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    deps(eventId, departmentId, taskId, user) {
        return this.tasks.listDependencies(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    addDep(eventId, departmentId, taskId, user, dto) {
        return this.tasks.addDependency(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
    }
    removeDep(eventId, departmentId, taskId, user, dto) {
        return this.tasks.removeDependency(eventId, departmentId, taskId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Query)('cursor')),
    __param(4, (0, common_1.Query)('take')),
    __param(5, (0, common_1.Query)('assigneeId')),
    __param(6, (0, common_1.Query)('zoneId')),
    __param(7, (0, common_1.Query)('zonalDeptRowId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, create_task_dto_1.CreateTaskDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':taskId'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':taskId'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, update_task_dto_1.UpdateTaskDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':taskId/status'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, change_task_status_dto_1.ChangeTaskStatusDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "changeStatus", null);
__decorate([
    (0, common_1.Delete)(':taskId'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':taskId/dependencies'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "deps", null);
__decorate([
    (0, common_1.Post)(':taskId/dependencies'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, add_dependency_dto_1.AddDependencyDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "addDep", null);
__decorate([
    (0, common_1.Delete)(':taskId/dependencies'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('taskId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, remove_dependency_dto_1.RemoveDependencyDto]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "removeDep", null);
exports.TasksController = TasksController = __decorate([
    (0, common_1.Controller)('events/:eventId/departments/:departmentId/tasks'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, event_guard_1.EventGuard),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map