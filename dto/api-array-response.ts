import { Context } from '../services/context';
import { ListItem } from './list-item';
import { ResponseBase } from './response-base';
import { ResponseGeneric, createGenericResponse } from './response-generic';

export interface ApiArrayResponse<T> extends ResponseBase {
  data: ListItem<T>[];
  total: number;

  isPaged: boolean;
  page: number;
  pageSize: number;
  pageCount: number;

  link: string;

  request: ResponseGeneric;
}

export function createSuccessApiArrayResponse<T>(
  data: ListItem<T>[],
  context: Context
): ApiArrayResponse<T> {
  return {
    data: data,
    total: data.length,
    isPaged: false,
    page: 0,
    pageSize: 0,
    pageCount: 0,
    status: 200,
    error: null,
    message: 'success',
    link: context.fullUrl,
    request: createGenericResponse(context),
  };
}

export function createSuccessApiArrayResponsePaged<T>(
  data: ListItem<T>[],
  page: number,
  pageSize: number,
  pageCount: number,
  context: Context
): ApiArrayResponse<T> {
  return {
    data: data,
    total: data.length,
    isPaged: true,
    page: page,
    pageSize: pageSize,
    pageCount: pageCount,
    status: 200,
    error: null,
    message: 'success',
    link: context.fullUrl,
    request: createGenericResponse(context),
  };
}
