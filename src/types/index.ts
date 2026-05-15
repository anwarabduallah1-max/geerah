export type PriceType = "free" | "borrow" | "for_sale";
export type ItemStatus = "available" | "busy";
export type RequestStatus = "pending" | "accepted" | "delivered";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  trust_score: number;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string;
  image_url: string | null;
  price_type: PriceType;
  price_value: number;
  status: ItemStatus;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface ItemRequest {
  id: string;
  item_id: string;
  requester_id: string;
  courier_id: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface NewsPost {
  id: string;
  author_id: string;
  title: string;
  content: string;
  zone_id: string | null;
  created_at: string;
  updated_at: string;
}
