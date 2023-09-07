import { Context } from '../services/context';
import { ApiResponse } from './api-resposne';
import { Errors } from './errors';
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

export function createErrorApiItemReponse(
  error: string,
  id: string,
  context: Context
): ApiItemResponse {
  return {
    status: 500,
    error: error,
    message: 'Error',
    id: id,
    data: null,
    request: createGenericResponse(context),
  };
}

export function createErrorNotFoundApiItemReponse(
  error: string,
  id: string,
  context: Context
): ApiItemResponse {
  return {
    status: 404,
    error: error,
    message: Errors.notFound,
    id: id,
    data: null,
    request: createGenericResponse(context),
  };
}
