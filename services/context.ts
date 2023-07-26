export interface Context {
  userId: string;
  userEmail: string;
  token: string;
  requestId: string;
  requestHandler: string | null;
  tenantId: string;
}

export interface Header {
  key: string;
  value: string;
}
