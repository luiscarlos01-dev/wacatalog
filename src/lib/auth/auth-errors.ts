import { isAuthError, isAuthRetryableFetchError } from "@supabase/supabase-js";

export type AuthErrorCode =
  | "invalid_credentials"
  | "unauthenticated"
  | "unauthorized"
  | "invalid_recovery_link"
  | "service_unavailable";

type AuthErrorDefinition = {
  status: 401 | 403 | 422 | 500;
  message: string;
};

const definitions: Record<AuthErrorCode, AuthErrorDefinition> = {
  invalid_credentials: {
    status: 401,
    message: "Não foi possível entrar. Confira seu email e senha e tente novamente.",
  },
  unauthenticated: {
    status: 401,
    message: "Sua sessão terminou. Entre novamente para continuar.",
  },
  unauthorized: {
    status: 403,
    message: "Você não tem acesso a esta área.",
  },
  invalid_recovery_link: {
    status: 422,
    message: "Este link de recuperação é inválido ou já expirou.",
  },
  service_unavailable: {
    status: 500,
    message: "Não foi possível concluir agora. Tente novamente mais tarde.",
  },
};

export function getAuthErrorDefinition(code: AuthErrorCode): AuthErrorDefinition {
  return definitions[code];
}

export function toAuthErrorResponse(code: AuthErrorCode, headers?: HeadersInit): Response {
  const definition = getAuthErrorDefinition(code);

  return Response.json(
    { code, message: definition.message },
    {
      headers,
      status: definition.status,
    },
  );
}

export function mapProviderAuthError(error: unknown): AuthErrorCode {
  if (isAuthRetryableFetchError(error)) {
    return "service_unavailable";
  }

  if (!isAuthError(error) || !error.status || error.status === 429 || error.status >= 500) {
    return "service_unavailable";
  }

  return "invalid_credentials";
}

export function mapRecoveryError(): AuthErrorCode {
  return "service_unavailable";
}
