import { Injectable, NestMiddleware, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) { }

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'];

    if (!tenantId) {
      // If route is excluded, we wouldn't be here (if handled by consumer.exclude)
      // But double check logic if needed. 
      // For now, assume global enforcement.
      throw new BadRequestException('X-Tenant-ID header is missing');
    }

    const id = Array.isArray(tenantId) ? tenantId[0] : tenantId;

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { id },
          { slug: id } // Treat the header value as slug if it's not a UUID (or both)
        ]
      },
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid Tenant ID');
    }

    // Attach to request
    req['tenant'] = tenant;
    next();
  }
}
