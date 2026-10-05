declare module 'passport-jwt' {
  import { Strategy as PassportStrategy } from 'passport-strategy';
  export class Strategy extends PassportStrategy {
    constructor(options: any, verify: (payload: any, done: (err: any, user?: any, info?: any) => void) => void);
  }
  export namespace ExtractJwt {
    export function fromAuthHeaderAsBearerToken(): (req: any) => string | null;
    export function fromHeader(header_name: string): (req: any) => string | null;
    export function fromBodyField(field_name: string): (req: any) => string | null;
    export function fromUrlQueryParameter(param_name: string): (req: any) => string | null;
    export function fromExtractors(extractors: Array<(req: any) => string | null>): (req: any) => string | null;
  }
}
