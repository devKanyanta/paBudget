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
};
export type Review = {
  id: string; rating: number; body: string | null; amountPaidNgwee: number | null; groupSize: number | null;
  itemsOrdered: string | null; vibeTags: string[]; author: string; createdAt: string; ownerReply: string | null;
  images: { thumb: string; medium: string; full: string }[];
};

export type User = { id: string; name: string; email: string | null; phone: string | null; role: 'USER' | 'OWNER' | 'ADMIN'; phoneVerified: boolean; homeAreaId: string | null; defaultBudgetNgwee: number | null };
export type AuthResult = { accessToken: string; refreshToken: string; expiresIn: number; user: User };

export type MySubmission = { id: string; type: string; status: string; placeId: string | null; rejectReason: string | null; createdAt: string; summary: string | null };
export type DraftMenu = { sections: { name: string; items: { name: string; description?: string; priceNgwee: number }[] }[] };

export type AdminSubmission = {
  id: string; type: string; status: string; payload: Record<string, any>; aiScore: number | null; aiReasons: string[] | null;
  createdAt: string; rejectReason: string | null; spotCheck: boolean; placeId: string | null; placeName: string | null;
  user: { id: string; name: string; trustLevel: string; approved: number; rejected: number };
  images: { id: string; thumb?: string; medium?: string; full?: string }[];
};
