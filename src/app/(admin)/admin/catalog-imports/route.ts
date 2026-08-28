import { z } from "zod";

import { toAuthErrorResponse } from "@/lib/auth/auth-errors";
import { jsonError } from "@/lib/http/api-error";
import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { getServerSupabaseClientWithHeaders } from "@/lib/supabase/server";
import { extractPdfCandidates } from "@/lib/catalog-import/extract-pdf-candidates";
import { flagDuplicateSkus } from "@/lib/catalog-import/flag-duplicate-skus";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  storagePath: z.string().min(1),
});

export async function POST(request: Request) {
  const { supabase, responseHeaders } = await getServerSupabaseClientWithHeaders();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
    return toAuthErrorResponse(authorization.code, responseHeaders);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "bad_request", "A requisição está mal formada.", {
      headers: responseHeaders,
    });
  }

  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(400, "bad_request", "Envie a referência do arquivo enviado.", {
      headers: responseHeaders,
    });
  }

  const extraction = await extractPdfCandidates(supabase, parsed.data.storagePath);

  if (!extraction.ok) {
    if (extraction.kind === "not_found") {
      return jsonError(404, "not_found", "O arquivo enviado não foi encontrado.", {
        headers: responseHeaders,
      });
    }

    if (extraction.kind === "too_large") {
      return jsonError(413, "payload_too_large", "O arquivo excede o limite de 50 MB.", {
        headers: responseHeaders,
      });
    }

    if (extraction.kind === "unsupported_format") {
      return jsonError(415, "unsupported_media_type", "O arquivo enviado não é um PDF.", {
        headers: responseHeaders,
      });
    }

    if (extraction.kind === "corrupted") {
      return jsonError(422, "validation_error", "Não foi possível ler este arquivo PDF.", {
        headers: responseHeaders,
      });
    }

    if (extraction.kind === "too_many_pages") {
      return jsonError(422, "validation_error", "O PDF excede o limite de 300 páginas.", {
        headers: responseHeaders,
      });
    }

    if (extraction.kind === "timeout") {
      return jsonError(
        422,
        "validation_error",
        "Não foi possível processar este PDF a tempo. Tente um arquivo menor.",
        { headers: responseHeaders },
      );
    }

    return jsonError(
      500,
      "service_unavailable",
      "Não foi possível concluir agora. Tente novamente mais tarde.",
      { headers: responseHeaders },
    );
  }

  const flagged = await flagDuplicateSkus(
    supabase,
    authorization.value.storeId,
    extraction.candidates,
  );

  if (!flagged.ok) {
    return jsonError(
      500,
      "service_unavailable",
      "Não foi possível concluir agora. Tente novamente mais tarde.",
      { headers: responseHeaders },
    );
  }

  return Response.json(
    { candidates: flagged.candidates },
    { headers: responseHeaders, status: 200 },
  );
}
