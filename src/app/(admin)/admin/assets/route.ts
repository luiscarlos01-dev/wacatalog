import { z } from "zod";

import { toAuthErrorResponse } from "@/lib/auth/auth-errors";
import { createAsset } from "@/lib/assets/create-asset";
import { jsonError } from "@/lib/http/api-error";
import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { getServerSupabaseClientWithHeaders } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RAW_UPLOADS_BUCKET = "asset-uploads";

const bodySchema = z.object({
  storagePath: z.string().min(1),
  kind: z.enum(["product", "banner"]),
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
    return jsonError(
      400,
      "bad_request",
      "Envie a referência do arquivo enviado e o tipo do asset.",
      {
        headers: responseHeaders,
      },
    );
  }

  const { storagePath, kind } = parsed.data;

  // ADR-0009: the browser already uploaded the raw file directly to Storage
  // (bypassing the Vercel Function body limit); this download is an
  // outbound call, not subject to that limit. `supabase` is the caller's
  // own authenticated client, so Storage RLS — the same policy for every
  // operation — is what actually enforces `storagePath` belongs to this
  // admin's own store.
  const download = await supabase.storage.from(RAW_UPLOADS_BUCKET).download(storagePath);

  if (download.error || !download.data) {
    return jsonError(404, "not_found", "O arquivo enviado não foi encontrado.", {
      headers: responseHeaders,
    });
  }

  try {
    const buffer = Buffer.from(await download.data.arrayBuffer());

    const result = await createAsset(supabase, {
      storeId: authorization.value.storeId,
      kind,
      buffer,
    });

    if (!result.ok) {
      if (result.kind === "too_large") {
        return jsonError(413, "payload_too_large", "O arquivo excede o limite de 10 MB.", {
          headers: responseHeaders,
        });
      }

      if (result.kind === "invalid_format") {
        return jsonError(
          415,
          "unsupported_media_type",
          "Formato de imagem não aceito. Envie um arquivo JPEG, PNG, WebP, HEIC ou HEIF.",
          { headers: responseHeaders },
        );
      }

      return jsonError(
        500,
        "service_unavailable",
        "Não foi possível concluir agora. Tente novamente mais tarde.",
        {
          headers: responseHeaders,
        },
      );
    }

    return Response.json(result.asset, { headers: responseHeaders, status: 201 });
  } finally {
    // ADR-0009 rule 4: the raw upload is never retained after processing,
    // success or failure.
    await supabase.storage.from(RAW_UPLOADS_BUCKET).remove([storagePath]);
  }
}
