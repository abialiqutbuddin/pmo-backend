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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const stream_1 = require("stream");
let MediaController = class MediaController {
    async proxyImage(url, res) {
        let u;
        try {
            u = new URL(url);
        }
        catch {
            throw new common_1.BadRequestException('Invalid url');
        }
        if (!/^https?:$/i.test(u.protocol))
            throw new common_1.BadRequestException('Only http(s) protocol allowed');
        const host = u.hostname.toLowerCase();
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1')
            throw new common_1.BadRequestException('Host not allowed');
        const resp = await fetch(u.toString(), { redirect: 'follow' });
        if (!resp.ok) {
            res.status(resp.status).end();
            return;
        }
        const ct = resp.headers.get('content-type') || '';
        if (!ct.startsWith('image/')) {
            throw new common_1.BadRequestException('Not an image');
        }
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        const lm = resp.headers.get('last-modified');
        if (lm)
            res.setHeader('Last-Modified', lm);
        res.setHeader('Content-Type', ct);
        const cl = resp.headers.get('content-length');
        if (cl)
            res.setHeader('Content-Length', cl);
        res.setHeader('Content-Disposition', 'inline');
        const body = resp.body;
        if (body && typeof stream_1.Readable.fromWeb === 'function') {
            stream_1.Readable.fromWeb(body).pipe(res);
        }
        else if (body && typeof body.pipe === 'function') {
            body.pipe(res);
        }
        else {
            const buf = Buffer.from(await resp.arrayBuffer());
            res.end(buf);
        }
    }
    async itsAvatar(itsId, res) {
        const id = (itsId || '').trim();
        if (!/^\d{7,8}$/.test(id))
            throw new common_1.BadRequestException('Invalid ITS id');
        const url = `https://followup.qardanhasana.in/assets/img/mumin_photos/${id}.jpg`;
        return this.proxyImage(url, res);
    }
    async proxy(url, res) {
        if (!url)
            throw new common_1.BadRequestException('url is required');
        return this.proxyImage(url, res);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Get)('avatar/its/:itsId'),
    __param(0, (0, common_1.Param)('itsId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "itsAvatar", null);
__decorate([
    (0, common_1.Get)('proxy'),
    __param(0, (0, common_1.Query)('url')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MediaController.prototype, "proxy", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media')
], MediaController);
//# sourceMappingURL=media.controller.js.map