import { Module } from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";
import { PortfolioController } from "./portfolio.controller";
import { DatabaseModule } from "../database/database.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [DatabaseModule, UserModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
