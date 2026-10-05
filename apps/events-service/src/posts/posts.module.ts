import { Module } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { PostsController } from "./posts.controller";
import { UserModule } from "../user/user.module";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [UserModule, DatabaseModule],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
