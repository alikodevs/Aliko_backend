import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, of } from 'rxjs';
import { Logger } from '@nestjs/common';
import { catchError, map } from 'rxjs/operators';

export class HttpClientProxy extends ClientProxy {
  private readonly logger = new Logger(HttpClientProxy.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly baseUrl: string,
  ) {
    super();
  }

  async connect(): Promise<any> {
    // No-op for HTTP
    return Promise.resolve();
  }

  async close() {
    // No-op
  }

  send<TResult = any, TInput = any>(pattern: any, data: TInput): any {
    console.log(`[HttpClientProxy] send() called with pattern: ${JSON.stringify(pattern)}`);
    return super.send(pattern, data);
  }

  protected publish(
    requirement: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void,
  ): any {
    const pattern = requirement.pattern;
    const url = this.mapPatternToUrl(pattern);
    const fullUrl = `${this.baseUrl}/${url}`;
    console.log(`[HttpClientProxy] publish pattern: ${JSON.stringify(pattern)} to ${fullUrl}`);

    this.httpService.post(fullUrl, requirement.data)
      .pipe(
        map(res => {
          console.log(`[HttpClientProxy] Raw response status: ${res.status}`);
          return res.data;
        }),
        catchError(err => {
          console.error(`[HttpClientProxy] Error calling ${fullUrl}: ${err.message}`);
          const errorInfo = err.response?.data || { message: err.message, statusCode: err.response?.status || 500 };
          return of({ isError: true, ...errorInfo });
        })
      )
      .subscribe({
        next: result => {
          console.log(`[HttpClientProxy] Result for ${url}: ${result ? 'success' : 'empty'}`);
          if (result && (result as any).isError) {
            const { isError, ...err } = result as any;
            callback({ err });
          } else {
            callback({ response: result, isDisposed: true });
          }
        },
        error: err => {
          // Handled in catchError, but if it leaks:
          callback({ err });
        }
      });
  }

  protected async dispatchEvent(packet: ReadPacket<any>): Promise<any> {
    const url = this.mapPatternToUrl(packet.pattern);
    const fullUrl = `${this.baseUrl}/${url}`;
    await lastValueFrom(this.httpService.post(fullUrl, packet.data));
  }

  private mapPatternToUrl(pattern: any): string {
    const cmd = typeof pattern === 'string' ? pattern : pattern.cmd;
    const mapping: Record<string, string> = {
      'health_check': 'health',
      'register': 'register',
      'create_recruiter': 'create-recruiter',
      'create_contech_user': 'create-contech-user',
      'create_events_user': 'create-events-user',
      'login': 'login',
      'login_google': 'login-google',
      'verify': 'verify',
      'create_session': 'create-session',
      'select_academy_role': 'academy/select-role',
      'apply_teacher_role': 'academy/apply-teacher',
      'get_teacher_applications': 'academy/teacher-applications',
      'approve_teacher_application': 'academy/approve-teacher',
      'reject_teacher_application': 'academy/reject-teacher',
      'switch_role': 'academy/switch-role',
      'get_user_academy_status': 'academy/status',
      'sync_contech_user': 'sync/contech',
      'sync_events_user': 'sync/events',
      'sync_academy_user': 'sync/academy',
      'sync_conshifter_user': 'sync/conshifter',
      'send_contact_email': 'contact/email',
      'update_status': 'user/status',
      'delete_user': 'user',
    };
    return mapping[cmd] || cmd.replace(/_/g, '-');
  }

  // Required for NestJS 11
  unwrap<T>(): T {
    return {} as T;
  }
}
