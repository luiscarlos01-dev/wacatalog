export function jsonError(
  status: number,
  code: string,
  message: string,
  options?: { fields?: Record<string, string>; headers?: HeadersInit },
): Response {
  return Response.json(
    { code, message, ...(options?.fields ? { fields: options.fields } : {}) },
    { status, headers: options?.headers },
  );
}
