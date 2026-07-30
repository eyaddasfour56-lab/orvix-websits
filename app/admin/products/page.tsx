"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type ProductStatus =
  | "available"
  | "coming_soon"
  | "out_of_stock"
  | "hidden";

type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  price: number;
  image: string;
  status: ProductStatus;
  stock_quantity: number;
  low_stock_limit: number;
  show_on_homepage: boolean;
  allow_wishlist: boolean;
  allow_purchase: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type ProductForm = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;
  image: string;
  status: ProductStatus;
  stockQuantity: string;
  lowStockLimit: string;
  showOnHomepage: boolean;
  allowWishlist: boolean;
  allowPurchase: boolean;
  displayOrder: string;
};

const emptyProductForm: ProductForm = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  price: "0",
  image: "/black.png",
  status: "available",
  stockQuantity: "0",
  lowStockLimit: "5",
  showOnHomepage: true,
  allowWishlist: true,
  allowPurchase: true,
  displayOrder: "0",
};

const statusOptions: {
  value: ProductStatus;
  label: string;
}[] = [
  {
    value: "available",
    label: "Available",
  },
  {
    value: "coming_soon",
    label: "Coming Soon",
  },
  {
    value: "out_of_stock",
    label: "Out of Stock",
  },
  {
    value: "hidden",
    label: "Hidden",
  },
];

function formatStatus(status: ProductStatus) {
  return (
    statusOptions.find(
      (option) => option.value === status
    )?.label || status
  );
}

function getStatusClasses(
  status: ProductStatus
) {
  if (status === "available") {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  if (status === "coming_soon") {
    return "border-yellow-500/20 bg-yellow-500/10 text-yellow-300";
  }

  if (status === "out_of_stock") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/5 text-gray-400";
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normaliseProduct(
  product: Product
): Product {
  return {
    ...product,
    price: Number(product.price || 0),
    stock_quantity: Number(
      product.stock_quantity || 0
    ),
    low_stock_limit: Number(
      product.low_stock_limit || 0
    ),
    display_order: Number(
      product.display_order || 0
    ),
    show_on_homepage: Boolean(
      product.show_on_homepage
    ),
    allow_wishlist: Boolean(
      product.allow_wishlist
    ),
    allow_purchase: Boolean(
      product.allow_purchase
    ),
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<
    Product[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<"success" | "error" | "">(
      ""
    );

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [newProduct, setNewProduct] =
    useState<ProductForm>(
      emptyProductForm
    );

  const [creating, setCreating] =
    useState(false);

  const [
    savingProductId,
    setSavingProductId,
  ] = useState<string | null>(null);

  const [
    deletingProductId,
    setDeletingProductId,
  ] = useState<string | null>(null);

  const [filter, setFilter] =
    useState<"all" | ProductStatus>("all");

  async function loadProducts() {
    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        "/api/admin/products",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        throw new Error(
          "Your admin session expired. Return to the dashboard and sign in again."
        );
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not load products."
        );
      }

      const loadedProducts = Array.isArray(
        result.products
      )
        ? result.products.map(
            (product: Product) =>
              normaliseProduct(product)
          )
        : [];

      setProducts(loadedProducts);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load products."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function updateProduct(
    productId: string,
    field: keyof Product,
    value: string | number | boolean
  ) {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId
          ? {
              ...product,
              [field]: value,
            }
          : product
      )
    );
  }

  function updateNewProduct(
    field: keyof ProductForm,
    value: string | boolean
  ) {
    setNewProduct((currentProduct) => ({
      ...currentProduct,
      [field]: value,
    }));
  }

  async function createProduct(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setCreating(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        "/api/admin/products",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: newProduct.name,
            slug: newProduct.slug,
            shortDescription:
              newProduct.shortDescription,
            description:
              newProduct.description,
            price: Number(
              newProduct.price || 0
            ),
            image: newProduct.image,
            status: newProduct.status,
            stockQuantity: Number(
              newProduct.stockQuantity || 0
            ),
            lowStockLimit: Number(
              newProduct.lowStockLimit || 0
            ),
            showOnHomepage:
              newProduct.showOnHomepage,
            allowWishlist:
              newProduct.allowWishlist,
            allowPurchase:
              newProduct.allowPurchase,
            displayOrder: Number(
              newProduct.displayOrder || 0
            ),
          }),
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not create product."
        );
      }

      if (result.product) {
        setProducts((currentProducts) => [
          ...currentProducts,
          normaliseProduct(
            result.product
          ),
        ]);
      }

      setNewProduct(emptyProductForm);
      setShowAddForm(false);

      setMessage(
        "Product created successfully."
      );

      setMessageType("success");

      await loadProducts();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create product."
      );

      setMessageType("error");
    } finally {
      setCreating(false);
    }
  }

  async function saveProduct(
    product: Product
  ) {
    setSavingProductId(product.id);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(
          product.id
        )}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: product.name,
            slug: product.slug,
            shortDescription:
              product.short_description,
            description:
              product.description,
            price: Number(
              product.price || 0
            ),
            image: product.image,
            status: product.status,
            stockQuantity: Number(
              product.stock_quantity || 0
            ),
            lowStockLimit: Number(
              product.low_stock_limit || 0
            ),
            showOnHomepage:
              product.show_on_homepage,
            allowWishlist:
              product.allow_wishlist,
            allowPurchase:
              product.allow_purchase,
            displayOrder: Number(
              product.display_order || 0
            ),
          }),
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not update product."
        );
      }

      if (result.product) {
        setProducts((currentProducts) =>
          currentProducts.map(
            (currentProduct) =>
              currentProduct.id ===
              product.id
                ? normaliseProduct(
                    result.product
                  )
                : currentProduct
          )
        );
      }

      setMessage(
        `${product.name} updated successfully.`
      );

      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update product."
      );

      setMessageType("error");
    } finally {
      setSavingProductId(null);
    }
  }

  async function deleteProduct(
    product: Product
  ) {
    const confirmation = window.prompt(
      `Type DELETE ${product.name} to permanently delete this product.`
    );

    if (
      confirmation !==
      `DELETE ${product.name}`
    ) {
      if (confirmation !== null) {
        setMessage(
          "Product was not deleted because the confirmation text was incorrect."
        );

        setMessageType("error");
      }

      return;
    }

    setDeletingProductId(product.id);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        `/api/admin/products/${encodeURIComponent(
          product.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Could not delete product."
        );
      }

      setProducts((currentProducts) =>
        currentProducts.filter(
          (currentProduct) =>
            currentProduct.id !==
            product.id
        )
      );

      setMessage(
        `${product.name} deleted successfully.`
      );

      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not delete product."
      );

      setMessageType("error");
    } finally {
      setDeletingProductId(null);
    }
  }

  const filteredProducts = useMemo(() => {
    if (filter === "all") {
      return products;
    }

    return products.filter(
      (product) =>
        product.status === filter
    );
  }, [products, filter]);

  const statistics = useMemo(
    () => ({
      total: products.length,

      available: products.filter(
        (product) =>
          product.status === "available"
      ).length,

      comingSoon: products.filter(
        (product) =>
          product.status ===
          "coming_soon"
      ).length,

      outOfStock: products.filter(
        (product) =>
          product.status ===
          "out_of_stock"
      ).length,

      hidden: products.filter(
        (product) =>
          product.status === "hidden"
      ).length,

      totalStock: products.reduce(
        (total, product) =>
          total +
          Number(
            product.stock_quantity || 0
          ),
        0
      ),
    }),
    [products]
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070707] px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />

          <p className="mt-5 text-gray-400">
            Loading products...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
              ORVIX Admin
            </p>

            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Manage Products
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-gray-400">
              Add products, update prices,
              control stock and choose whether
              products are available, coming
              soon, out of stock or hidden.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/admin"
              className="flex items-center justify-center rounded-2xl border border-white/15 px-6 py-4 text-center font-black transition hover:bg-white/10"
            >
              Back to Dashboard
            </Link>

            <button
              type="button"
              onClick={loadProducts}
              className="rounded-2xl border border-white/15 px-6 py-4 font-black transition hover:bg-white/10"
            >
              Refresh Products
            </button>

            <button
              type="button"
              onClick={() =>
                setShowAddForm(
                  (current) => !current
                )
              }
              className="rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-gray-200"
            >
              {showAddForm
                ? "Close Add Form"
                : "Add Product"}
            </button>
          </div>
        </header>

        {message && (
          <p
            className={`mt-6 rounded-2xl border p-4 ${
              messageType === "success"
                ? "border-green-500/20 bg-green-500/10 text-green-300"
                : "border-red-500/20 bg-red-500/10 text-red-300"
            }`}
          >
            {message}
          </p>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Products
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.total}
            </p>
          </div>

          <div className="rounded-3xl border border-green-500/20 bg-green-500/10 p-6">
            <p className="text-green-200">
              Available
            </p>

            <p className="mt-3 text-4xl font-black text-green-300">
              {statistics.available}
            </p>
          </div>

          <div className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6">
            <p className="text-yellow-200">
              Coming Soon
            </p>

            <p className="mt-3 text-4xl font-black text-yellow-300">
              {statistics.comingSoon}
            </p>
          </div>

          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6">
            <p className="text-red-200">
              Out of Stock
            </p>

            <p className="mt-3 text-4xl font-black text-red-300">
              {statistics.outOfStock}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Hidden
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.hidden}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-gray-400">
              Total Stock
            </p>

            <p className="mt-3 text-4xl font-black">
              {statistics.totalStock}
            </p>
          </div>
        </section>

        {showAddForm && (
          <form
            onSubmit={createProduct}
            className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-8"
          >
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
                New Product
              </p>

              <h2 className="mt-3 text-3xl font-black">
                Add Product
              </h2>
            </div>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-black text-gray-300">
                  Product Name
                </label>

                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(event) => {
                    const name =
                      event.target.value;

                    updateNewProduct(
                      "name",
                      name
                    );

                    if (
                      !newProduct.slug ||
                      newProduct.slug ===
                        createSlug(
                          newProduct.name
                        )
                    ) {
                      updateNewProduct(
                        "slug",
                        createSlug(name)
                      );
                    }
                  }}
                  required
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-sm font-black text-gray-300">
                  Product Slug
                </label>

                <input
                  type="text"
                  value={newProduct.slug}
                  onChange={(event) =>
                    updateNewProduct(
                      "slug",
                      createSlug(
                        event.target.value
                      )
                    )
                  }
                  required
                  placeholder="product-name"
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                />

                <p className="mt-2 text-xs text-gray-600">
                  Product URL:
                  /products/
                  {newProduct.slug ||
                    "product-name"}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-black text-gray-300">
                  Short Description
                </label>

                <textarea
                  value={
                    newProduct.shortDescription
                  }
                  onChange={(event) =>
                    updateNewProduct(
                      "shortDescription",
                      event.target.value
                    )
                  }
                  rows={2}
                  className="mt-3 w-full resize-none rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-black text-gray-300">
                  Full Description
                </label>

                <textarea
                  value={
                    newProduct.description
                  }
                  onChange={(event) =>
                    updateNewProduct(
                      "description",
                      event.target.value
                    )
                  }
                  rows={4}
                  className="mt-3 w-full resize-none rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-sm font-black text-gray-300">
                  Price in EGP
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newProduct.price}
                  onChange={(event) =>
                    updateNewProduct(
                      "price",
                      event.target.value
                    )
                  }
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-sm font-black text-gray-300">
                  Image Path
                </label>

                <input
                  type="text"
                  value={newProduct.image}
                  onChange={(event) =>
                    updateNewProduct(
                      "image",
                      event.target.value
                    )
                  }
                  placeholder="/product-image.png"
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-sm font-black text-gray-300">
                  Product Status
                </label>

                <select
                  value={newProduct.status}
                  onChange={(event) =>
                    updateNewProduct(
                      "status",
                      event.target
                        .value as ProductStatus
                    )
                  }
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                >
                  {statusOptions.map(
                    (status) => (
                      <option
                        key={status.value}
                        value={status.value}
                      >
                        {status.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-black text-gray-300">
                  Display Order
                </label>

                <input
                  type="number"
                  step="1"
                  value={
                    newProduct.displayOrder
                  }
                  onChange={(event) =>
                    updateNewProduct(
                      "displayOrder",
                      event.target.value
                    )
                  }
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-sm font-black text-gray-300">
                  Stock Quantity
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    newProduct.stockQuantity
                  }
                  onChange={(event) =>
                    updateNewProduct(
                      "stockQuantity",
                      event.target.value
                    )
                  }
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-sm font-black text-gray-300">
                  Low Stock Limit
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    newProduct.lowStockLimit
                  }
                  onChange={(event) =>
                    updateNewProduct(
                      "lowStockLimit",
                      event.target.value
                    )
                  }
                  className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  key: "showOnHomepage",
                  label: "Show on Homepage",
                  value:
                    newProduct.showOnHomepage,
                },
                {
                  key: "allowWishlist",
                  label: "Allow Wishlist",
                  value:
                    newProduct.allowWishlist,
                },
                {
                  key: "allowPurchase",
                  label: "Allow Purchase",
                  value:
                    newProduct.allowPurchase,
                },
              ].map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4"
                >
                  <span className="font-bold">
                    {option.label}
                  </span>

                  <input
                    type="checkbox"
                    checked={option.value}
                    onChange={(event) =>
                      updateNewProduct(
                        option.key as keyof ProductForm,
                        event.target.checked
                      )
                    }
                    className="h-5 w-5"
                  />
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={
                creating ||
                !newProduct.name.trim() ||
                !newProduct.slug.trim()
              }
              className="mt-7 w-full rounded-2xl bg-white px-6 py-4 font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating
                ? "Creating Product..."
                : "Create Product"}
            </button>
          </form>
        )}

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-2xl font-black">
              All Products
            </h2>

            <div className="flex flex-wrap gap-2">
              {[
                {
                  value: "all",
                  label: "All",
                },
                ...statusOptions,
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setFilter(
                      option.value as
                        | "all"
                        | ProductStatus
                    )
                  }
                  className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                    filter === option.value
                      ? "border-white bg-white text-black"
                      : "border-white/15 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {filteredProducts.length ===
          0 ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <h3 className="text-2xl font-black">
                No products found
              </h3>

              <p className="mt-3 text-gray-400">
                Add a product or change the
                selected filter.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {filteredProducts.map(
                (product) => {
                  const isSaving =
                    savingProductId ===
                    product.id;

                  const isDeleting =
                    deletingProductId ===
                    product.id;

                  return (
                    <article
                      key={product.id}
                      className="rounded-[32px] border border-white/10 bg-white/5 p-5 sm:p-7"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-black">
                            {product.name}
                          </h3>

                          <p className="mt-2 text-sm text-gray-500">
                            /products/
                            {product.slug}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider ${getStatusClasses(
                            product.status
                          )}`}
                        >
                          {formatStatus(
                            product.status
                          )}
                        </span>
                      </div>

                      <div className="mt-7 grid gap-5 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-black text-gray-300">
                            Product Name
                          </label>

                          <input
                            type="text"
                            value={product.name}
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "name",
                                event.target.value
                              )
                            }
                            className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-black text-gray-300">
                            Slug
                          </label>

                          <input
                            type="text"
                            value={product.slug}
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "slug",
                                createSlug(
                                  event.target
                                    .value
                                )
                              )
                            }
                            className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-sm font-black text-gray-300">
                            Short Description
                          </label>

                          <textarea
                            value={
                              product.short_description
                            }
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "short_description",
                                event.target.value
                              )
                            }
                            rows={2}
                            className="mt-3 w-full resize-none rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="text-sm font-black text-gray-300">
                            Full Description
                          </label>

                          <textarea
                            value={
                              product.description
                            }
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "description",
                                event.target.value
                              )
                            }
                            rows={4}
                            className="mt-3 w-full resize-none rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-black text-gray-300">
                            Price in EGP
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={product.price}
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "price",
                                Math.max(
                                  0,
                                  Number(
                                    event.target
                                      .value || 0
                                  )
                                )
                              )
                            }
                            className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-black text-gray-300">
                            Image Path
                          </label>

                          <input
                            type="text"
                            value={product.image}
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "image",
                                event.target.value
                              )
                            }
                            className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-black text-gray-300">
                            Product Status
                          </label>

                          <select
                            value={product.status}
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "status",
                                event.target
                                  .value as ProductStatus
                              )
                            }
                            className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          >
                            {statusOptions.map(
                              (status) => (
                                <option
                                  key={
                                    status.value
                                  }
                                  value={
                                    status.value
                                  }
                                >
                                  {status.label}
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-black text-gray-300">
                            Display Order
                          </label>

                          <input
                            type="number"
                            step="1"
                            value={
                              product.display_order
                            }
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "display_order",
                                Number(
                                  event.target
                                    .value || 0
                                )
                              )
                            }
                            className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-black text-gray-300">
                            Stock Quantity
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              product.stock_quantity
                            }
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "stock_quantity",
                                Math.max(
                                  0,
                                  Number(
                                    event.target
                                      .value || 0
                                  )
                                )
                              )
                            }
                            className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          />

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateProduct(
                                  product.id,
                                  "stock_quantity",
                                  Math.max(
                                    0,
                                    product.stock_quantity -
                                      1
                                  )
                                )
                              }
                              className="rounded-xl border border-white/15 px-4 py-3 font-black transition hover:bg-white/10"
                            >
                              − 1
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                updateProduct(
                                  product.id,
                                  "stock_quantity",
                                  product.stock_quantity +
                                    1
                                )
                              }
                              className="rounded-xl bg-white px-4 py-3 font-black text-black transition hover:bg-gray-200"
                            >
                              + 1
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-black text-gray-300">
                            Low Stock Limit
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              product.low_stock_limit
                            }
                            onChange={(event) =>
                              updateProduct(
                                product.id,
                                "low_stock_limit",
                                Math.max(
                                  0,
                                  Number(
                                    event.target
                                      .value || 0
                                  )
                                )
                              )
                            }
                            className="mt-3 w-full rounded-2xl border border-white/15 bg-black px-4 py-4 text-white outline-none focus:border-white"
                          />
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {[
                          {
                            field:
                              "show_on_homepage",
                            label:
                              "Show on Homepage",
                            value:
                              product.show_on_homepage,
                          },
                          {
                            field:
                              "allow_wishlist",
                            label:
                              "Allow Wishlist",
                            value:
                              product.allow_wishlist,
                          },
                          {
                            field:
                              "allow_purchase",
                            label:
                              "Allow Purchase",
                            value:
                              product.allow_purchase,
                          },
                        ].map((option) => (
                          <label
                            key={option.field}
                            className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-4"
                          >
                            <span className="font-bold">
                              {option.label}
                            </span>

                            <input
                              type="checkbox"
                              checked={
                                option.value
                              }
                              onChange={(
                                event
                              ) =>
                                updateProduct(
                                  product.id,
                                  option.field as keyof Product,
                                  event.target
                                    .checked
                                )
                              }
                              className="h-5 w-5"
                            />
                          </label>
                        ))}
                      </div>

                      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5">
                        <p className="text-xs uppercase tracking-wider text-gray-500">
                          Customer View
                        </p>

                        <p
                          className={`mt-3 text-lg font-black ${
                            product.status ===
                            "available"
                              ? product.stock_quantity <=
                                  product.low_stock_limit
                                ? "text-orange-300"
                                : "text-green-300"
                              : product.status ===
                                  "coming_soon"
                                ? "text-yellow-300"
                                : product.status ===
                                    "out_of_stock"
                                  ? "text-red-300"
                                  : "text-gray-500"
                          }`}
                        >
                          {product.status ===
                          "available"
                            ? product.stock_quantity ===
                              0
                              ? "Available status, but stock is zero"
                              : product.stock_quantity <=
                                  product.low_stock_limit
                                ? `Only ${product.stock_quantity} left`
                                : `${product.stock_quantity} pieces in stock`
                            : formatStatus(
                                product.status
                              )}
                        </p>

                        <p className="mt-3 text-sm text-gray-500">
                          Price:{" "}
                          {Number(
                            product.price
                          ).toLocaleString(
                            "en-GB"
                          )}{" "}
                          EGP
                        </p>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        <Link
                          href={`/products/${encodeURIComponent(
                            product.slug
                          )}`}
                          target="_blank"
                          className="flex items-center justify-center rounded-2xl border border-white/15 px-5 py-4 text-center font-black transition hover:bg-white/10"
                        >
                          Open Product Page
                        </Link>

                        <button
                          type="button"
                          onClick={() =>
                            saveProduct(product)
                          }
                          disabled={
                            isSaving ||
                            isDeleting
                          }
                          className="rounded-2xl bg-white px-5 py-4 font-black text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isSaving
                            ? "Saving..."
                            : "Save Product"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteProduct(
                              product
                            )
                          }
                          disabled={
                            isSaving ||
                            isDeleting
                          }
                          className="rounded-2xl bg-red-600 px-5 py-4 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {isDeleting
                            ? "Deleting..."
                            : "Delete Product"}
                        </button>
                      </div>

                      <p className="mt-4 text-xs text-gray-600">
                        Last updated:{" "}
                        {new Date(
                          product.updated_at
                        ).toLocaleString(
                          "en-GB"
                        )}
                      </p>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}