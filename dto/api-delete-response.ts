import { Context } from '../services/context';
import { ApiResponse } from './api-resposne';
import { ResponseGeneric, createGenericResponse } from './response-generic';

export interface ApiDeleteResponse extends ApiResponse {
  id: string;
  request: ResponseGeneric;
}

export function createSuccessApiDeleteReponse(
  id: string,
  context: Context
): ApiDeleteResponse {
  return {
    status: 200,
    error: null,
    message: 'Success',
    id: id,
    request: createGenericResponse(context),
  };
}
