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
exports.FeedbackController = void 0;
const common_1 = require("@nestjs/common");
const feedback_service_1 = require("./feedback.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const event_guard_1 = require("../common/guards/event.guard");
const create_feedback_dto_1 = require("./dto/create-feedback.dto");
let FeedbackController = class FeedbackController {
    feedback;
    constructor(feedback) {
        this.feedback = feedback;
    }
    list(eventId) {
        return this.feedback.list(eventId);
    }
    create(eventId, dto) {
        return this.feedback.create(eventId, dto);
    }
};
exports.FeedbackController = FeedbackController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('eventId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('eventId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_feedback_dto_1.CreateFeedbackDto]),
    __metadata("design:returntype", void 0)
], FeedbackController.prototype, "create", null);
exports.FeedbackController = FeedbackController = __decorate([
    (0, common_1.Controller)('events/:eventId/feedback'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, event_guard_1.EventGuard),
    __metadata("design:paramtypes", [feedback_service_1.FeedbackService])
], FeedbackController);
//# sourceMappingURL=feedback.controller.js.map