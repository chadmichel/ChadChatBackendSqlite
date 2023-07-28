import { Context } from '../services/context';
import { ApiResponse } from './api-resposne';
import { ResponseGeneric, createGenericResponse } from './response-generic';

export interface ApiInsertResponse extends ApiResponse {
  id: string;
  request: ResponseGeneric;
}

export function createSuccessApiInsertReponse(
  id: string,
  context: Context
): ApiInsertResponse {
  return {
    status: 200,
    error: null,
    message: 'Success',
    id: id,
    request: createGenericResponse(context),
  };
}
