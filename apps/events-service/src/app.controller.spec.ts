import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health endpoint', () => {
    it('should return status ok and valid ISO timestamp', () => {
      const result = appController.health();
      expect(result).toBeDefined();
      expect(result.status).toBe('ok');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });
});
