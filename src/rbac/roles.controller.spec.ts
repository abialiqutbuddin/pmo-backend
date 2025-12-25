import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RbacService } from './rbac.service';

describe('RolesController', () => {
  let controller: RolesController;
  const mockRbacService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: RbacService, useValue: mockRbacService }
      ]
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
