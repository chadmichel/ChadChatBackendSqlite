import { Context } from '../services/context';
import { ListItem } from './list-item';
import { ResponseBase } from './response-base';
import { ResponseGeneric, createGenericResponse } from './response-generic';

export interface ApiArrayResponse<T> extends ResponseBase {
  items: ListItem<T>[];
  total: number;

  isPaged?: boolean;
  page?: number;
  pageSize?: number;
  pageCount?: number;

  isRange?: boolean;
  top?: number;
  limit?: number;

  link: string;

  request: ResponseGeneric;
}

export function createSuccessApiArrayResponse<T>(
  data: ListItem<T>[],
  context: Context
): ApiArrayResponse<T> {
  return {
    items: data,
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
    items: data,
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

export function createSuccessApiArrayResponseRange<T>(
  data: ListItem<T>[],
  top: number,
  limit: number,
  context: Context
): ApiArrayResponse<T> {
  return {
    items: data,
    total: data.length,
    isRange: true,
    top: top,
    limit: limit,
    status: 200,
    error: null,
    message: 'success',
    link: context.fullUrl,
    request: createGenericResponse(context),
  };
}

export function createErrorApiArrayResponse<T>(
  context: Context
): ApiArrayResponse<T> {
  return {
    items: [],
    total: 0,
    status: 500,
    error: 'error',
    message: 'error',
    link: context.fullUrl,
    request: createGenericResponse(context),
  };
}
