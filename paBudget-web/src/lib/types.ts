export type Area = { id: string; name: string; slug: string; city: string; lat: number; lng: number };
export type Category = { id: string; name: string; slug: string };
export type Tag = { id: string; name: string; slug: string; type: 'VIBE' | 'FEATURE' };
export type Meta = { areas: Area[]; categories: Category[]; tags: Tag[] };

export type PlaceSummary = {
  id: string; name: string; slug: string; category: string; area: string; areaSlug: string;
  priceLevel: number; avgSpendPpNgwee: number | null; isFeatured: boolean; menuUpdatedAt: string | null;
  lat: number; lng: number; thumb: string | null; tags: string[]; openNow: boolean | null;
  distanceM: number | null; rating: number | null; ratingCount: number;
};
export type PlaceList = { total: number; items: PlaceSummary[] };

export type MenuItem = { id: string; name: string; description: string | null; priceNgwee: number; lastConfirmedAt: string; image: string | null };
export type PlaceDetail = Omit<PlaceSummary, 'tags' | 'thumb' | 'distanceM' | 'category' | 'area'> & {
  description: string | null; address: string | null; category: string; categorySlug: string; area: string;
  phone: string | null; whatsapp: string | null; closedPermanently: boolean; menuAddedBy: string | null;
  hours: { weekday: number; opensAt: string; closesAt: string }[];
  tags: { slug: string; name: string; type: string }[];
  images: { id: string; width: number; height: number; thumb: string; medium: string; full: string; by: string | null }[];
  menu: { id: string; name: string; items: MenuItem[] }[];
  deals?: { id: string; title: string; priceNgwee: number; endsAt: string }[];
};
export type Review = {
  id: string; rating: number; body: string | null; amountPaidNgwee: number | null; groupSize: number | null;
  itemsOrdered: string | null; vibeTags: string[]; author: string; createdAt: string; ownerReply: string | null;
  images: { thumb: string; medium: string; full: string }[];
};

export type User = { id: string; name: string; email: string | null; phone: string | null; role: 'USER' | 'OWNER' | 'ADMIN'; homeAreaId: string | null; defaultBudgetNgwee: number | null };
export type AuthResult = { accessToken: string; refreshToken: string; expiresIn: number; user: User };

export type MySubmission = { id: string; type: string; status: string; placeId: string | null; rejectReason: string | null; createdAt: string; summary: string | null };
export type DraftMenu = { sections: { name: string; items: { name: string; description?: string; priceNgwee: number }[] }[] };

export type AdminSubmission = {
  id: string; type: string; status: string; payload: Record<string, any>; aiScore: number | null; aiReasons: string[] | null;
  createdAt: string; rejectReason: string | null; spotCheck: boolean; placeId: string | null; placeName: string | null;
  user: { id: string; name: string; trustLevel: string; approved: number; rejected: number };
  images: { id: string; thumb?: string; medium?: string; full?: string }[];
};

// ---- AI planner ----
export type PlannerFilters = {
  budgetNgwee: number | null; groupSize: number; areaSlug: string | null; tags: string[];
  day: string | null; time: string | null; occasion: string | null;
};
export type BundleItem = { itemId: string; name: string; priceNgwee: number; qty: number; role: string };
export type PlanOption = {
  placeId: string; slug: string; name: string; area: string; category: string; thumb: string | null; rating: number | null; tags: string[];
  reason: string; bundle: { id: string; kind: string; items: BundleItem[]; totalNgwee: number }; overBudgetNgwee: number; recentBillPpNgwee: number | null;
};
export type PlannerReply = { filters: PlannerFilters; message: string; needs?: 'budget'; notes: string[]; options: PlanOption[]; remaining: number };
export type SavedPlan = {
  id: string; title: string; budgetNgwee: number; groupSize: number; shareToken: string; createdAt: string; by: string; totalNgwee: number;
  stops: { placeId: string; slug: string; name: string; area: string; status: string; thumb: string | null; totalNgwee: number; items: BundleItem[] }[];
};

// ---- community ----
export type LeaderRow = { rank: number; name: string; points: number; badges: number; isMe: boolean };
export type BadgeRow = { id: string; name: string; rule: string; earnedAt: string | null };

// ---- owner ----
export type OwnerPlaceRow = { id: string; name: string; slug: string; area: string; status: string; views30d: number };
export type OwnerPlace = {
  id: string; name: string; slug: string; status: string; description: string | null; address: string | null; phone: string | null; whatsapp: string | null;
  avgSpendPpNgwee: number | null; hours: { weekday: number; opensAt: string; closesAt: string }[]; tagSlugs: string[];
  images: { id: string; thumb?: string; medium?: string }[];
  menu: { name: string; items: { id: string; name: string; description: string | null; priceNgwee: number; isAvailable: boolean }[] }[];
  deals: { id: string; title: string; priceNgwee: number; startsAt: string; endsAt: string }[];
};
export type OwnerStats = { days: number; totals: Record<string, number>; series: { date: string; views: number }[] };
export type Takedown = { id: string; targetType: string; targetId: string | null; reason: string; contactName: string; contactEmail: string; status: string; dueAt: string; createdAt: string; overdue: boolean; note: string | null };
