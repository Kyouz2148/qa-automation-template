import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'member']).or(z.string()),
});

export const LoginResponseSchema = z.object({
  token: z.string().min(10),
  user: UserSchema,
});

export const MeResponseSchema = z.object({
  user: UserSchema,
});

export const ErrorResponseSchema = z.object({
  error: z.string().min(1),
});

export type User = z.infer<typeof UserSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
