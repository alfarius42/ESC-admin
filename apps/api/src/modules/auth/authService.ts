import { compare } from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../../config/environment.js";
import { findUserByEmail, type AuthUser } from "./authRepository.js";

type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  role: "admin";
};

type AuthTokenPayload = JwtPayload & {
  sub: string;
  email: string;
  role: "admin";
  displayName: string;
};

export type LoginResult = {
  token: string;
  expiresAt: string;
  user: PublicUser;
};

function toPublicUser(user: AuthUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role
  };
}

export async function loginWithCredentials(
  email: string,
  password: string
): Promise<LoginResult | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return issueToken(user);
}

function issueToken(user: AuthUser): LoginResult {
  const signOptions: SignOptions = {
    subject: user.id,
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
  };

  const token = jwt.sign(
    {
      email: user.email,
      role: user.role,
      displayName: user.displayName
    },
    env.jwtSecret,
    signOptions
  );

  const decoded = jwt.decode(token) as JwtPayload | null;
  const expiresAt =
    decoded?.exp && Number.isFinite(decoded.exp)
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    token,
    expiresAt,
    user: toPublicUser(user)
  };
}

export function verifyAuthToken(token: string): PublicUser | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    return {
      id: payload.sub,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role
    };
  } catch {
    return null;
  }
}
