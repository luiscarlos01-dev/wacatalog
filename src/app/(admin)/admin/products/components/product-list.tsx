"use client";

import { useState } from "react";

import { ProductThumbnail } from "@/components/product-thumbnail";
import { ImportUpload } from "@/app/(admin)/admin/catalog-imports/components/import-upload";
import { deleteProduct } from "@/features/products/delete-product";
import { saveProduct } from "@/features/products/save-product";
import { setProductLifecycle } from "@/features/products/set-product-lifecycle";
import type { AdminProduct } from "@/lib/products/product-row";

import { DeleteProductDialog } from "./delete-product-dialog";
import { ProductForm } from "./product-form";

type ProductListProps = {
  initialProducts: AdminProduct[];
  storeId: string;
};

export function ProductList({ initialProducts, storeId }: ProductListProps) {
  const [products, setProducts] = useState(initialProducts);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});
  const [deletingProduct, setDeletingProduct] = useState<AdminProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  function replaceProduct(product: AdminProduct) {
    setProducts((current) => current.map((item) => (item.id === product.id ? product : item)));
  }

  function handleCreated(product: AdminProduct) {
    setProducts((current) => [...current, product]);
    setIsCreating(false);
  }

  function handleImported(createdProducts: AdminProduct[]) {
    setProducts((current) => [...current, ...createdProducts]);
  }

  function handleEdited(product: AdminProduct) {
    replaceProduct(product);
    setEditingProductId(null);
  }

  async function handleToggle(product: AdminProduct, field: "isVisible" | "isOrderable") {
    setTogglingProductId(product.id);
    setToggleErrors((current) => ({ ...current, [product.id]: "" }));

    const result = await saveProduct(
      {
        name: product.name,
        sku: product.sku,
        description: product.description,
        imageAssetId: product.imageAssetId,
        quantityAvailable: product.quantityAvailable,
        isVisible: field === "isVisible" ? !product.isVisible : product.isVisible,
        isOrderable: field === "isOrderable" ? !product.isOrderable : product.isOrderable,
      },
      product.id,
    );

    setTogglingProductId(null);

    if (!result.ok) {
      setToggleErrors((current) => ({
        ...current,
        [product.id]: "Não foi possível salvar agora. Tente novamente.",
      }));
      return;
    }

    replaceProduct(result.product);
  }

  async function handleLifecycle(product: AdminProduct, action: "deactivate" | "reactivate") {
    setTogglingProductId(product.id);
    setToggleErrors((current) => ({ ...current, [product.id]: "" }));

    const result = await setProductLifecycle(product.id, action);

    setTogglingProductId(null);

    if (!result.ok) {
      setToggleErrors((current) => ({
        ...current,
        [product.id]: "Não foi possível salvar agora. Tente novamente.",
      }));
      return;
    }

    replaceProduct(result.product);
  }

  async function handleConfirmDelete() {
    if (!deletingProduct) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(undefined);
    const result = await deleteProduct(deletingProduct.id);
    setIsDeleting(false);

    if (!result.ok) {
      setDeleteError("Não foi possível excluir agora. Tente novamente.");
      return;
    }

    setProducts((current) => current.filter((item) => item.id !== deletingProduct.id));
    setDeletingProduct(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-950" id="admin-products-list-heading">
          Produtos cadastrados
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-indigo-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-600"
            onClick={() => {
              setEditingProductId(null);
              setIsImporting(false);
              setIsCreating((current) => !current);
            }}
            type="button"
          >
            {isCreating ? "Cancelar cadastro" : "Novo produto"}
          </button>
          <button
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600"
            onClick={() => {
              setEditingProductId(null);
              setIsCreating(false);
              setIsImporting((current) => !current);
            }}
            type="button"
          >
            {isImporting ? "Cancelar importação" : "Importar catálogo (PDF)"}
          </button>
        </div>
      </div>

      {isCreating ? (
        // Only one <ProductForm> renders at a time (id="product-name" etc. are
        // not row-scoped), so opening it closes any in-progress row edit.
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <ProductForm
            onCancel={() => setIsCreating(false)}
            onSaved={handleCreated}
            storeId={storeId}
          />
        </div>
      ) : null}

      {isImporting ? (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <ImportUpload
            onCancel={() => setIsImporting(false)}
            onProductsCreated={handleImported}
            storeId={storeId}
          />
        </div>
      ) : null}

      {products.length === 0 ? (
        <p className="rounded-3xl bg-white p-8 text-center leading-7 text-slate-600 shadow-sm">
          Nenhum produto cadastrado ainda. Use &quot;Novo produto&quot; para começar seu catálogo.
        </p>
      ) : (
        // Named so this list of persisted products is distinguishable from
        // the create/edit form's own live catalog preview: `ProductCard`
        // renders an <li>, which browsers still expose with role "listitem"
        // even outside a <ul>/<ol> — tests asserting a product is *not* in
        // this list must scope to this one, not the whole page.
        <ul aria-labelledby="admin-products-list-heading" className="space-y-3">
          {products.map((product) =>
            // Not a <li> while editing: `ProductForm`'s own live catalog
            // preview renders a `ProductCard` (also an <li>), and nesting it
            // inside this item's own <li> produced an invalid, ambiguous
            // listitem-in-listitem (browsers still expose role "listitem" on
            // the inner one regardless of context). Matches how the "create"
            // panel above is already rendered outside any <li>.
            editingProductId === product.id ? (
              <div className="rounded-2xl bg-white p-5 shadow-sm" key={product.id}>
                <ProductForm
                  onCancel={() => setEditingProductId(null)}
                  onSaved={handleEdited}
                  product={product}
                  storeId={storeId}
                />
              </div>
            ) : (
              <li className="rounded-2xl bg-white p-5 shadow-sm" key={product.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <ProductThumbnail
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      imageUrl={product.imageUrl}
                      productName={product.name}
                    />
                    <div>
                      <p className="font-semibold text-slate-950">{product.name}</p>
                      {product.sku ? (
                        <p className="text-sm text-slate-600">SKU: {product.sku}</p>
                      ) : null}
                      <p className="text-sm text-slate-600">
                        Quantidade disponível: {product.quantityAvailable}
                      </p>
                      <button
                        className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600"
                        onClick={() => {
                          setIsCreating(false);
                          setEditingProductId(product.id);
                        }}
                        type="button"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={
                        product.isActive
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-800 uppercase"
                          : "rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700 uppercase"
                      }
                    >
                      {product.isActive ? "Ativo" : "Desativado"}
                    </span>
                    <ToggleSwitch
                      disabled={togglingProductId === product.id}
                      label="Visível no catálogo"
                      onChange={() => handleToggle(product, "isVisible")}
                      value={product.isVisible}
                    />
                    <ToggleSwitch
                      disabled={togglingProductId === product.id}
                      label="Disponível para pedido"
                      onChange={() => handleToggle(product, "isOrderable")}
                      value={product.isOrderable}
                    />
                    <button
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
                      disabled={togglingProductId === product.id}
                      onClick={() =>
                        handleLifecycle(product, product.isActive ? "deactivate" : "reactivate")
                      }
                      type="button"
                    >
                      {product.isActive ? "Desativar" : "Reativar"}
                    </button>
                    {!product.isActive ? (
                      <p className="max-w-48 text-right text-xs text-slate-600">
                        Reativar desliga visibilidade e disponibilidade; você precisará
                        reconfigurá-las.
                      </p>
                    ) : null}
                    <button
                      className="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-600"
                      onClick={() => {
                        setDeleteError(undefined);
                        setDeletingProduct(product);
                      }}
                      type="button"
                    >
                      Excluir
                    </button>
                    {toggleErrors[product.id] ? (
                      <p className="text-sm text-red-700" role="alert">
                        {toggleErrors[product.id]}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {deletingProduct ? (
        <DeleteProductDialog
          isDeleting={isDeleting}
          onCancel={() => setDeletingProduct(null)}
          onConfirm={handleConfirmDelete}
          productName={deletingProduct.name}
        />
      ) : null}
      {deleteError ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {deleteError}
        </p>
      ) : null}
    </div>
  );
}

function ToggleSwitch({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: () => void;
  value: boolean;
}) {
  return (
    <button
      aria-checked={value}
      className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-600 disabled:cursor-wait disabled:opacity-60"
      disabled={disabled}
      onClick={onChange}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={
          value
            ? "inline-block h-4 w-4 rounded-full bg-emerald-600"
            : "inline-block h-4 w-4 rounded-full bg-slate-400"
        }
      />
      {label}: {value ? "Ligado" : "Desligado"}
    </button>
  );
}
