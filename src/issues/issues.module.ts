import { Module } from '@nestjs/common';
import { IssuesController } from './issues.controller';
import { IssuesService } from './issues.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [IssuesController],
  providers: [IssuesService, PrismaService],
  exports: [IssuesService],
})
export class IssuesModule {}
