import { Controller, UsePipes, UseFilters, Logger } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { SettingsService } from "./settings.service";
import {
  CreateSiteSettingDto,
  UpdateSiteSettingDto,
} from "./dto/site-setting.dto";
import { JoiValidationPipe } from "../common/pipes/joi-validation.pipe";
import { RpcExceptionFilter } from "../common/filters/rpc-exception.filter";
import {
  CreateSiteSettingSchema,
  SiteSettingKeySchema,
} from "./settings.validation";

@Controller()
@UseFilters(RpcExceptionFilter)
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  @MessagePattern({ cmd: "alikowash_upsert_setting" })
  @UsePipes(new JoiValidationPipe(CreateSiteSettingSchema))
  async upsert(@Payload() dto: CreateSiteSettingDto) {
    return await this.settingsService.upsert(dto);
  }

  @MessagePattern({ cmd: "alikowash_find_all_settings" })
  async findAll() {
    return await this.settingsService.findAll();
  }

  @MessagePattern({ cmd: "alikowash_find_setting_by_key" })
  @UsePipes(new JoiValidationPipe(SiteSettingKeySchema))
  async findOne(@Payload() payload: { key: string }) {
    return await this.settingsService.findByKey(payload.key);
  }

  @MessagePattern({ cmd: "alikowash_remove_setting" })
  @UsePipes(new JoiValidationPipe(SiteSettingKeySchema))
  async remove(@Payload() payload: { key: string }) {
    return await this.settingsService.remove(payload.key);
  }
}
