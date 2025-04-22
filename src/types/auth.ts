import { Request } from 'express';

export interface AuthUser {
  user: {
    id: number;
    email: string;
    role: string;
    first_name: string;
    last_name: string;
  };
  token: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
} 