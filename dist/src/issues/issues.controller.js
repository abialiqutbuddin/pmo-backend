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
exports.IssuesController = void 0;
const common_1 = require("@nestjs/common");
const issues_service_1 = require("./issues.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const event_guard_1 = require("../common/guards/event.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const create_issue_dto_1 = require("./dto/create-issue.dto");
const update_issue_dto_1 = require("./dto/update-issue.dto");
const change_issue_status_dto_1 = require("./dto/change-issue-status.dto");
let IssuesController = class IssuesController {
    issues;
    constructor(issues) {
        this.issues = issues;
    }
    list(eventId, departmentId, user, cursor, take) {
        return this.issues.list(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, { cursor, take: take ? Number(take) : undefined });
    }
    create(eventId, departmentId, user, dto) {
        return this.issues.create(eventId, departmentId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
    }
    get(eventId, departmentId, issueId, user) {
        return this.issues.get(eventId, departmentId, issueId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
    update(eventId, departmentId, issueId, user, dto) {
        return this.issues.update(eventId, departmentId, issueId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
    }
    changeStatus(eventId, departmentId, issueId, user, dto) {
        return this.issues.changeStatus(eventId, departmentId, issueId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin }, dto);
    }
    remove(eventId, departmentId, issueId, user) {
        return this.issues.remove(eventId, departmentId, issueId, { userId: user.sub, isSuperAdmin: user.isSuperAdmin });
    }
};
exports.IssuesController = IssuesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Query)('cursor')),
    __param(4, (0, common_1.Query)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, String, String]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, create_issue_dto_1.CreateIssueDto]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':issueId'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('issueId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':issueId'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('issueId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, update_issue_dto_1.UpdateIssueDto]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':issueId/status'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('issueId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, change_issue_status_dto_1.ChangeIssueStatusDto]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "changeStatus", null);
__decorate([
    (0, common_1.Delete)(':issueId'),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Param)('departmentId')),
    __param(2, (0, common_1.Param)('issueId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], IssuesController.prototype, "remove", null);
exports.IssuesController = IssuesController = __decorate([
    (0, common_1.Controller)('events/:eventId/departments/:departmentId/issues'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, event_guard_1.EventGuard),
    __metadata("design:paramtypes", [issues_service_1.IssuesService])
], IssuesController);
//# sourceMappingURL=issues.controller.js.map