// ============================================
// REZEKII MOCK DATA
// Swap with real TikTok Shop API when credentials are ready
// ============================================

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: "Beauty" | "Food" | "Tech" | "Fashion" | "Home";
  commissionRate: number; // percentage
  priceRM: number;
  commissionRM: number;
  imageColor: string; // placeholder color
  imageUrl?: string;  // Unsplash product photo
  label?: "BEST SELLER" | "HOT SELLING" | "NEW ARRIVAL";
  samplesLeft: number;
  rating: number;
  sold: number;
}

export interface Campaign {
  id: string;
  title: string;
  brand: string;
  description: string;
  status: "Active" | "Pending" | "Completed" | "Rejected";
  commissionRate: number;
  deadline: string;
  gmv: number;
  videos: number;
  slotsLeft: number;
  imageColor: string;
  imageUrl?: string;
  category: string;
}

export interface EarningsDay {
  date: string;
  label: string;
  gmv: number;
  commission: number;
}

export interface Notification {
  id: string;
  type: "approved" | "payout" | "commission" | "campaign" | "sample";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export interface Post {
  id: string;
  title: string;
  views: string;
  gmv: number;
  commission: number;
  platform: "video" | "live";
  imageColor: string;
  imageUrl?: string;
}

// ============================================
// PRODUCTS
// ============================================

export const products: Product[] = [
  {
    id: "p1",
    name: "Hydro Glow Serum 30ml",
    brand: "COSRX",
    category: "Beauty",
    commissionRate: 12,
    priceRM: 89.90,
    commissionRM: 10.79,
    imageColor: "#fde8f0",
    imageUrl: "/images/product-beauty.jpg",
    label: "BEST SELLER",
    samplesLeft: 8,
    rating: 4.9,
    sold: 12400,
  },
  {
    id: "p2",
    name: "Mango Chili Snack Pack",
    brand: "MyRasa",
    category: "Food",
    commissionRate: 8,
    priceRM: 24.90,
    commissionRM: 1.99,
    imageColor: "#fff3d6",
    imageUrl: "/images/product-food.jpg",
    label: "HOT SELLING",
    samplesLeft: 15,
    rating: 4.7,
    sold: 8900,
  },
  {
    id: "p3",
    name: "ANC Wireless Earbuds Pro",
    brand: "Soundcore",
    category: "Tech",
    commissionRate: 6,
    priceRM: 199.00,
    commissionRM: 11.94,
    imageColor: "#e8ecff",
    imageUrl: "/images/product-tech.jpg",
    label: "NEW ARRIVAL",
    samplesLeft: 3,
    rating: 4.8,
    sold: 3200,
  },
  {
    id: "p4",
    name: "Linen Wide Leg Trousers",
    brand: "ZALORA Studio",
    category: "Fashion",
    commissionRate: 15,
    priceRM: 129.00,
    commissionRM: 19.35,
    imageColor: "#f0ede8",
    imageUrl: "/images/product-fashion.jpg",
    label: "HOT SELLING",
    samplesLeft: 6,
    rating: 4.6,
    sold: 5600,
  },
  {
    id: "p5",
    name: "Bamboo Aroma Diffuser",
    brand: "ScentCo",
    category: "Home",
    commissionRate: 10,
    priceRM: 79.00,
    commissionRM: 7.90,
    imageColor: "#e8f5f0",
    imageUrl: "/images/product-home.jpg",
    label: "BEST SELLER",
    samplesLeft: 12,
    rating: 4.8,
    sold: 7800,
  },
  {
    id: "p6",
    name: "Collagen Boost Toner",
    brand: "Skin1004",
    category: "Beauty",
    commissionRate: 11,
    priceRM: 69.00,
    commissionRM: 7.59,
    imageColor: "#fce8fe",
    imageUrl: "/images/product-beauty.jpg",
    samplesLeft: 5,
    rating: 4.7,
    sold: 9100,
  },
  {
    id: "p7",
    name: "Matcha Latte Powder 200g",
    brand: "NaturBrew",
    category: "Food",
    commissionRate: 9,
    priceRM: 39.90,
    commissionRM: 3.59,
    imageColor: "#e8f5e8",
    imageUrl: "/images/product-food.jpg",
    label: "NEW ARRIVAL",
    samplesLeft: 20,
    rating: 4.5,
    sold: 2300,
  },
  {
    id: "p8",
    name: "Smart LED Desk Lamp",
    brand: "Xiaomi",
    category: "Tech",
    commissionRate: 5,
    priceRM: 149.00,
    commissionRM: 7.45,
    imageColor: "#fff8e8",
    imageUrl: "/images/product-tech.jpg",
    samplesLeft: 2,
    rating: 4.9,
    sold: 6700,
  },
];

// ============================================
// CAMPAIGNS
// ============================================

export const campaigns: Campaign[] = [
  {
    id: "c1",
    title: "Ramadan Beauty Haul",
    brand: "COSRX",
    description: "Create authentic review videos of COSRX skincare products. Focus on glow-up results and before/after content.",
    status: "Active",
    commissionRate: 14,
    deadline: "30 Apr 2026",
    gmv: 8450,
    videos: 12,
    slotsLeft: 5,
    imageColor: "#fde8f0",
    imageUrl: "/images/product-beauty.jpg",
    category: "Beauty",
  },
  {
    id: "c2",
    title: "Hari Raya Snacks Fest",
    brand: "MyRasa",
    description: "Showcase our festive snack hampers in your Raya prep content. Unboxing and taste test formats preferred.",
    status: "Active",
    commissionRate: 10,
    deadline: "5 May 2026",
    gmv: 3200,
    videos: 7,
    slotsLeft: 12,
    imageColor: "#fff3d6",
    imageUrl: "/images/product-food.jpg",
    category: "Food",
  },
  {
    id: "c3",
    title: "Tech Lifestyle Summer",
    brand: "Soundcore",
    description: "Feature Soundcore earbuds in your daily lifestyle videos — gym, study, travel. Show how it fits your routine.",
    status: "Pending",
    commissionRate: 8,
    deadline: "15 May 2026",
    gmv: 0,
    videos: 0,
    slotsLeft: 20,
    imageColor: "#e8ecff",
    imageUrl: "/images/product-tech.jpg",
    category: "Tech",
  },
  {
    id: "c4",
    title: "Fashion Forward Q2",
    brand: "ZALORA Studio",
    description: "Style our linen collection in your OOTDs. Mix & match looks for Raya season and beyond.",
    status: "Completed",
    commissionRate: 15,
    deadline: "15 Apr 2026",
    gmv: 22100,
    videos: 31,
    slotsLeft: 0,
    imageColor: "#f0ede8",
    imageUrl: "/images/product-fashion.jpg",
    category: "Fashion",
  },
  {
    id: "c5",
    title: "Home Refresh Collection",
    brand: "ScentCo",
    description: "Show our aroma diffusers transforming your living space. Home tour and room makeover formats work great.",
    status: "Rejected",
    commissionRate: 10,
    deadline: "20 Apr 2026",
    gmv: 0,
    videos: 0,
    slotsLeft: 0,
    imageColor: "#e8f5f0",
    imageUrl: "/images/product-home.jpg",
    category: "Home",
  },
];

// ============================================
// EARNINGS
// ============================================

export const earningsWeek: EarningsDay[] = [
  { date: "2026-04-21", label: "Mon", gmv: 1240, commission: 148.80 },
  { date: "2026-04-22", label: "Tue", gmv: 980,  commission: 117.60 },
  { date: "2026-04-23", label: "Wed", gmv: 2100, commission: 252.00 },
  { date: "2026-04-24", label: "Thu", gmv: 1750, commission: 210.00 },
  { date: "2026-04-25", label: "Fri", gmv: 3200, commission: 384.00 },
  { date: "2026-04-26", label: "Sat", gmv: 4100, commission: 492.00 },
  { date: "2026-04-27", label: "Sun", gmv: 2860, commission: 343.20 },
];

export const earnings30Days: EarningsDay[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date("2026-03-28");
  d.setDate(d.getDate() + i);
  const gmv = Math.round(800 + Math.random() * 3500);
  return {
    date: d.toISOString().split("T")[0],
    label: `${d.getDate()}/${d.getMonth() + 1}`,
    gmv,
    commission: Math.round(gmv * 0.12 * 100) / 100,
  };
});

// ============================================
// POSTS
// ============================================

export const topPosts: Post[] = [
  {
    id: "post1",
    title: "COSRX Serum Review — glowing skin in 7 days!",
    views: "248K",
    gmv: 4200,
    commission: 504,
    platform: "video",
    imageColor: "#fde8f0",
    imageUrl: "/images/product-beauty.jpg",
  },
  {
    id: "post2",
    title: "Hari Raya Snack Haul LIVE",
    views: "89K",
    gmv: 2800,
    commission: 280,
    platform: "live",
    imageColor: "#fff3d6",
    imageUrl: "/images/product-food.jpg",
  },
  {
    id: "post3",
    title: "5 Tech Gadgets Under RM200",
    views: "155K",
    gmv: 1950,
    commission: 117,
    platform: "video",
    imageColor: "#e8ecff",
    imageUrl: "/images/product-tech.jpg",
  },
  {
    id: "post4",
    title: "Unboxing & GRWM ft. ZALORA collab",
    views: "312K",
    gmv: 6800,
    commission: 1020,
    platform: "video",
    imageColor: "#f0ede8",
    imageUrl: "/images/product-fashion.jpg",
  },
];

// ============================================
// NOTIFICATIONS
// ============================================

export const notifications: Notification[] = [
  {
    id: "n1",
    type: "approved",
    title: "Sample Approved!",
    body: "Your sample request for COSRX Hydro Glow Serum has been approved. Expect delivery in 3–5 days.",
    time: "2 min ago",
    read: false,
  },
  {
    id: "n2",
    type: "payout",
    title: "Payout Processed",
    body: "RM 1,245.60 has been transferred to your bank account ending in 4521.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "n3",
    type: "commission",
    title: "New Commission Earned",
    body: "You earned RM 84.00 from 7 sales via your TikTok video posted yesterday.",
    time: "3 hours ago",
    read: false,
  },
  {
    id: "n4",
    type: "campaign",
    title: "Campaign Invitation",
    body: "Soundcore invites you to join the Tech Lifestyle Summer campaign. 8% commission available.",
    time: "Yesterday",
    read: true,
  },
  {
    id: "n5",
    type: "sample",
    title: "Sample Shipped",
    body: "Your MyRasa Mango Chili Snack Pack has been shipped. Tracking: JT1234567890MY",
    time: "Yesterday",
    read: true,
  },
  {
    id: "n6",
    type: "commission",
    title: "Daily Earnings Summary",
    body: "You earned RM 492.00 in commissions today across 3 active campaigns.",
    time: "2 days ago",
    read: true,
  },
  {
    id: "n7",
    type: "campaign",
    title: "Campaign Ending Soon",
    body: "Ramadan Beauty Haul campaign ends in 3 days. Post your final content to maximize earnings!",
    time: "2 days ago",
    read: true,
  },
];

// ============================================
// CREATOR PROFILE
// ============================================

export const creatorProfile = {
  name: "Aisyah Nadirah",
  handle: "@aisyah.creates",
  avatar: null, // placeholder
  level: "Gold Creator",
  levelColor: "#f5a623",
  totalEarnings: 12845.60,
  totalGMV: 142000,
  totalVideos: 87,
  followers: "24.8K",
  avgViews: "82K",
  joinDate: "January 2025",
  tier: "Gold",
  nextTier: "Platinum",
  progressToNextTier: 68, // %
  bankAccount: "Maybank **** 4521",
  email: "aisyah@example.com",
};

// ============================================
// DASHBOARD QUICK STATS
// ============================================

export const dashboardStats = {
  totalEarningsThisMonth: 3247.80,
  earningsDelta: 18.4, // % up from last month
  productsSold: 156,
  activeCampaigns: 2,
  pendingSamples: 3,
};

export const recentActivity = [
  { id: "a1", text: "Commission earned from COSRX video", amount: "+RM 84.00", time: "2h ago", type: "earn" },
  { id: "a2", text: "Sample request approved — ZALORA trousers", amount: null, time: "5h ago", type: "sample" },
  { id: "a3", text: "Payout processed to Maybank", amount: "-RM 1,245.60", time: "Yesterday", type: "payout" },
  { id: "a4", text: "Joined Hari Raya Snacks Fest campaign", amount: null, time: "2 days ago", type: "campaign" },
  { id: "a5", text: "Commission earned from MyRasa live", amount: "+RM 168.00", time: "2 days ago", type: "earn" },
];
