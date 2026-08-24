import { z } from "zod";

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto.").max(160, "O nome é longo demais."),
  sku: z
    .string()
    .trim()
    .min(1, "Informe um SKU válido ou deixe em branco.")
    .max(80, "O SKU é longo demais.")
    .nullish()
    .transform((value) => value ?? null),
  description: z.string().max(2000, "A descrição é longa demais."),
  imageAssetId: z.uuid("Selecione uma imagem válida."),
  quantityAvailable: z
    .number()
    .int("A quantidade deve ser um número inteiro.")
    .min(0, "A quantidade deve ser maior ou igual a zero."),
  isVisible: z.boolean().optional().default(false),
  isOrderable: z.boolean().optional().default(false),
});

export type ProductInputPayload = z.infer<typeof productInputSchema>;
