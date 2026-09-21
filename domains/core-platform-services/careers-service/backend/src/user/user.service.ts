import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

export type AuthenticatedUser = {
  firebaseId: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  globalRole?: string;
  status: string;
  activeRole?: string;
  careersUser?: {
    id: string;
    role: string;
    status: string;
    resumeUrl?: string;
    experienceYears?: number;
    skills?: string[];
  };
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject('AUTH_SERVICE') private authClient: ClientProxy,
    private prisma: PrismaService,
  ) { }

  async getUserById(userId: string) {
    try {
      const payload = { firebaseId: userId };
      const user = await firstValueFrom(
        this.authClient.send({ cmd: 'get_user_profile' }, payload),
      );
      return user;
    } catch (error) {
      this.logger.error(`Failed to fetch user ${userId}`, error);
      return null;
    }
  }
}
