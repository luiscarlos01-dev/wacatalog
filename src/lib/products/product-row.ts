export const PRODUCT_COLUMNS =
  "id, name, sku, description, image_asset_id, quantity_available, is_visible, is_orderable, is_active, created_at, updated_at";

export type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  description: string;
  image_asset_id: string;
  quantity_available: number;
  is_visible: boolean;
  is_orderable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminProduct = {
  id: string;
  name: string;
  sku: string | null;
  description: string;
  imageAssetId: string;
  quantityAvailable: number;
  isVisible: boolean;
  isOrderable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toAdminProduct(row: ProductRow): AdminProduct {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    description: row.description,
    imageAssetId: row.image_asset_id,
    quantityAvailable: row.quantity_available,
    isVisible: row.is_visible,
    isOrderable: row.is_orderable,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
