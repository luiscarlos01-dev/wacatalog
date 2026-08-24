import { z } from "zod";

import { toAuthErrorResponse } from "@/lib/auth/auth-errors";
import { createAsset } from "@/lib/assets/create-asset";
import { jsonError } from "@/lib/http/api-error";
import { getAuthenticatedStore } from "@/lib/auth/get-authenticated-store";
import { getServerSupabaseClientWithHeaders } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const kindSchema = z.enum(["product", "banner"]);

export async function POST(request: Request) {
  const { supabase, responseHeaders } = await getServerSupabaseClientWithHeaders();
  const authorization = await getAuthenticatedStore(undefined, supabase);

  if (!authorization.ok) {
    return toAuthErrorResponse(authorization.code, responseHeaders);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "bad_request", "A requisição está mal formada.", {
      headers: responseHeaders,
    });
  }

  const file = formData.get("file");
  const kindResult = kindSchema.safeParse(formData.get("kind"));

  if (!(file instanceof File) || !kindResult.success) {
    return jsonError(400, "bad_request", "Envie um arquivo de imagem e o tipo do asset.", {
      headers: responseHeaders,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await createAsset(supabase, {
    storeId: authorization.value.storeId,
    kind: kindResult.data,
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
}
