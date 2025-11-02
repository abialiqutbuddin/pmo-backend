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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const require_event_roles_decorator_1 = require("../decorators/require-event-roles.decorator");
let RoleGuard = class RoleGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const roles = this.reflector.getAllAndOverride(require_event_roles_decorator_1.REQUIRE_EVENT_ROLES, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (!roles || roles.length === 0)
            return true;
        const user = req.user;
        if (user?.isSuperAdmin)
            return true;
        const membership = req.eventMembership;
        if (!membership)
            throw new common_1.ForbiddenException();
        if (!roles.includes(membership.role)) {
            throw new common_1.ForbiddenException('Insufficient role');
        }
        return true;
    }
};
exports.RoleGuard = RoleGuard;
exports.RoleGuard = RoleGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RoleGuard);
//# sourceMappingURL=role.guard.js.map