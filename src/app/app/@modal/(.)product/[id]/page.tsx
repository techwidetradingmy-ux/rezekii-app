import { ProductWindow } from "@/components/product-window";
import ProductPage from "@/app/app/product/[id]/page";

/** Opening a product from inside the app shows it in a floating window over the current page (owner, 29 Oct 2026). */
export default function ProductInWindow() {
  return (
    <ProductWindow>
      <ProductPage />
    </ProductWindow>
  );
}
