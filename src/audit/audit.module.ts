import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global() // Make it global so we don't have to import it everywhere, or export it. Global is easier for cross-cutting concerns.
@Module({
    imports: [PrismaModule],
    providers: [AuditService],
    exports: [AuditService],
})
export class AuditModule { }
