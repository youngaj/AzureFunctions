export interface LoginPayload {
  email: string;
  password: string;
  scope: string;
}
export interface LoginCredentials {
  email: string;
  uuid: string;
  isNew: boolean;
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
}
