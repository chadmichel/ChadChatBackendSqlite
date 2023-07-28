import { Context } from '../services/context';
import os from 'os';

export interface ResponseGeneric {
  requestId: string;
  requestUrl: string;
  tenantId: string;
  machine: string;
}

export function createGenericResponse(context: Context): ResponseGeneric {
  return {
    requestId: context.requestId,
    requestUrl: context.requestUrl,
    tenantId: context.tenantId,
    machine: os.hostname(),
  };
}
