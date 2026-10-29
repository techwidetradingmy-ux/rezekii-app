import { ProductWindow } from "@/components/product-window";
import AdminProductPage from "@/app/admin/product/[id]/page";

/** Opening a product from inside the app shows it in a floating window over the current page (owner, 29 Oct 2026). */
export default function ProductInWindow() {
  return (
    <ProductWindow>
      <AdminProductPage />
    </ProductWindow>
  );
}
