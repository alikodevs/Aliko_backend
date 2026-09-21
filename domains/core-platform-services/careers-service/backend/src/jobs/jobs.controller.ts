import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JobsService } from './jobs.service';

@Controller()
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @MessagePattern({ cmd: 'create_job' })
  async createJob(@Payload() data: { jobData: any; userId: string }) {
    return this.jobsService.createJob(data.jobData, data.userId);
  }

  @MessagePattern({ cmd: 'get_all_jobs' })
  async getAllJobs(@Payload() filters: any) {
    return this.jobsService.findAllJobs(filters);
  }

  @MessagePattern({ cmd: 'get_job_by_id' })
  async getJobById(@Payload() id: number) {
    return this.jobsService.findOneJob(id);
  }

  @MessagePattern({ cmd: 'update_job' })
  async updateJob(@Payload() data: { id: number; jobData: any; userId: string }) {
    return this.jobsService.updateJob(data.id, data.jobData, data.userId);
  }

  @MessagePattern({ cmd: 'delete_job' })
  async deleteJob(@Payload() data: { id: number; userId: string; isAdmin: boolean }) {
    return this.jobsService.deleteJob(data.id, data.userId, data.isAdmin);
  }

  @MessagePattern({ cmd: 'apply_job' })
  async applyJob(@Payload() data: { jobId: number; user: any; applicationData: any }) {
    return this.jobsService.applyToJob(data.jobId, data.user, data.applicationData);
  }

  @MessagePattern({ cmd: 'get_job_applications' })
  async getJobApplications(@Payload() jobId: number) {
    return this.jobsService.getApplicationsForJob(jobId);
  }
}
