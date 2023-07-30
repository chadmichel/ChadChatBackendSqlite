import { Context } from '../services/context';
import { ApiResponse } from './api-resposne';
import { ResponseGeneric, createGenericResponse } from './response-generic';

export interface ApiUpdateResponse extends ApiResponse {
  id: string;
  request: ResponseGeneric;
}

export function createSuccessApiUpdateReponse(
  id: string,
  context: Context
): ApiUpdateResponse {
  return {
    status: 200,
    error: null,
    message: 'Success',
    id: id,
    request: createGenericResponse(context),
  };
}
