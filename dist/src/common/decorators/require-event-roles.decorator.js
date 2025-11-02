"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequireEventRoles = exports.REQUIRE_EVENT_ROLES = void 0;
const common_1 = require("@nestjs/common");
exports.REQUIRE_EVENT_ROLES = 'REQUIRE_EVENT_ROLES';
const RequireEventRoles = (...roles) => (0, common_1.SetMetadata)(exports.REQUIRE_EVENT_ROLES, roles);
exports.RequireEventRoles = RequireEventRoles;
//# sourceMappingURL=require-event-roles.decorator.js.map