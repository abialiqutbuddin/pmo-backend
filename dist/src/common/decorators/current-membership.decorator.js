"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentMembership = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentMembership = (0, common_1.createParamDecorator)((_, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return req.eventMembership;
});
//# sourceMappingURL=current-membership.decorator.js.map