import { Module, forwardRef } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RolesController } from './roles.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [forwardRef(() => ChatModule)],
  providers: [RbacService],
  controllers: [RolesController],
  exports: [RbacService],
})
export class RbacModule { }
