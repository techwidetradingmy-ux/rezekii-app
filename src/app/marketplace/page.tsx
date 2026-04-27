"use client";

import { useState } from "react";
import Image from "next/image";
import AppShell from "@/components/layout/AppShell";
import RzCard from "@/components/ui/RzCard";
import RzInput from "@/components/ui/RzInput";
import CategoryChip from "@/components/ui/CategoryChip";
import ProductLabel from "@/components/ui/ProductLabel";
import { products } from "@/lib/mock-data";
import { Search, Star, SlidersHorizontal, Sparkles, UtensilsCrossed, Headphones, Shirt, Wind } from "lucide-react";

function CategoryIcon({ category, color }: { category: string; color: string }) {
  const iconProps = { size: 32, color, strokeWidth: 1.5 };
  if (category === "Beauty")  return <Sparkles {...iconProps} />;
  if (category === "Food")    return <UtensilsCrossed {...iconProps} />;
  if (category === "Tech")    return <Headphones {...iconProps} />;
  if (category === "Fashion") return <Shirt {...iconProps} />;
  return <Wind {...iconProps} />;
}

const categoryIconColor: Record<string, string> = {
  Beauty: "#e8005a",
  Food: "#f5a623",
  Tech: "#25f4ee",
  Fashion: "#9aa5b1",
  Home: "#00c073",
};

const categories = ["All", "Beauty", "Food", "Tech", "Fashion", "Home"] as const;
type Category = typeof categories[number];

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.brand.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <AppShell>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-white border-b border-[#d8f0e4] sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[22px] font-[800] text-[#0d1117]">Marketplace</h1>
          <button className="w-9 h-9 rounded-[10px] border border-[#d8f0e4] flex items-center justify-center tap-target">
            <SlidersHorizontal size={16} color="#4a5568" />
          </button>
        </div>
        <RzInput
          placeholder="Search products or brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leadingIcon={<Search size={16} />}
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
        {categories.map((cat) => (
          <CategoryChip
            key={cat}
            label={cat}
            active={activeCategory === cat}
            onClick={() => setActiveCategory(cat)}
          />
        ))}
      </div>

      {/* Count */}
      <div className="px-5 mb-2">
        <p className="text-[12px] text-[#9aa5b1]">
          {filtered.length} products
        </p>
      </div>

      {/* Product Grid */}
      <div className="px-5 pb-4 grid grid-cols-2 gap-3">
        {filtered.map((product) => (
          <RzCard key={product.id} padding={false} className="overflow-hidden tap-target">
            {/* Product Image */}
            <div
              className="w-full aspect-square flex items-center justify-center relative overflow-hidden"
              style={{ background: product.imageColor }}
            >
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 390px) 50vw, 195px"
                />
              ) : (
                <CategoryIcon
                  category={product.category}
                  color={categoryIconColor[product.category] ?? "#9aa5b1"}
                />
              )}
              {product.label && (
                <div className="absolute top-2 left-2">
                  <ProductLabel label={product.label} />
                </div>
              )}
              {product.samplesLeft <= 5 && (
                <div className="absolute top-2 right-2">
                  <span className="text-[9px] font-[700] text-[#e8005a] bg-white/90 px-1.5 py-0.5 rounded-full">
                    {product.samplesLeft} left
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-[10px] text-[#9aa5b1] font-[500] mb-0.5">{product.brand}</p>
              <p className="text-[13px] font-[600] text-[#0d1117] leading-tight mb-2 line-clamp-2">
                {product.name}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-2">
                <Star size={10} color="#f5a623" fill="#f5a623" />
                <span className="text-[11px] font-[600] text-[#0d1117]">{product.rating}</span>
                <span className="text-[10px] text-[#9aa5b1]">({(product.sold / 1000).toFixed(1)}k)</span>
              </div>

              {/* Commission */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#9aa5b1]">Commission</p>
                  <p className="text-[14px] font-[800] text-[#00c073]">
                    RM {product.commissionRM.toFixed(2)}
                  </p>
                </div>
                <span className="text-[11px] font-[700] text-white bg-[#00c073] px-2 py-1 rounded-[8px]">
                  {product.commissionRate}%
                </span>
              </div>
            </div>
          </RzCard>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-5">
          <span className="text-[48px] mb-4">🔍</span>
          <p className="text-[16px] font-[700] text-[#0d1117] mb-1">No products found</p>
          <p className="text-[13px] text-[#9aa5b1] text-center">Try a different search or category</p>
        </div>
      )}
    </AppShell>
  );
}
