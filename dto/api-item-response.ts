import { Context } from '../services/context';
import { ApiResponse } from './api-resposne';
import { ResponseGeneric, createGenericResponse } from './response-generic';

export interface ApiItemResponse extends ApiResponse {
  id: string;
  data: any;
  request: ResponseGeneric;
}

export function createSuccessApiItemReponse(
  data: any,
  id: string,
  context: Context
): ApiItemResponse {
  return {
    status: 200,
    error: null,
    message: 'Success',
    id: id,
    data: data,
    request: createGenericResponse(context),
  };
}
