import { Context } from '../services/context';
import { ResponseBase } from './response-base';
import { ResponseGeneric, createGenericResponse } from './response-generic';

export interface LookupItem {
  id: string;
  text: string;
}

export interface ApiLookupResponse extends ResponseBase {
  items: LookupItem[];

  link: string;

  request: ResponseGeneric;
}

export function createSuccessApiLookupResponse(
  items: LookupItem[],
  context: Context
): ApiLookupResponse {
  return {
    items: items,
    status: 200,
    error: null,
    message: 'success',
    link: context.fullUrl,
    request: createGenericResponse(context),
  };
}
