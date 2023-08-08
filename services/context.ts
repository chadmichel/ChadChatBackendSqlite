export interface Context {
  userId: string;
  userEmail: string;
  token: string;
  requestId: string;
  requestHandler: string | null;
  tenantId: string;
  requestUrl: string;
  fullUrl: string;

  body: any;
  params: any;
  queryParams: any;
}

export interface Header {
  key: string;
  value: string;
}
