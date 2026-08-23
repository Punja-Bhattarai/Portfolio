export type Visibility = "public" | "private";
export type AlbumVisibility = "public" | "guest";

export interface Photo {
  id: string;
  album_id: string | null;
  filename: string;
  storage_path: string;
  thumb_path: string;
  title: string;
  description: string | null;
  visibility: Visibility;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  mime_type: string;
  created_at: string;
  updated_at: string;
  // attached by API
  url?: string;
  thumb_url?: string;
  album_name?: string | null;
}

export interface Album {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: AlbumVisibility;
  cover_photo_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  photo_count?: number;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  long_description: string | null;
  technologies: string[];
  features: string[];
  github_url: string | null;
  demo_url: string | null;
  video_url: string | null;
  image_path: string | null;
  category: "project" | "lab";
  status: string;
  featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  image_url?: string;
}

export interface GuestAccess {
  id: string;
  name: string;
  album_ids: string[];
  permissions: { view: boolean; download: boolean };
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface GalleryLink {
  id: string;
  slug: string;
  name: string | null;
  album_id: string | null;
  require_password: boolean;
  download_allowed: boolean;
  expires_at: string | null;
  revoked: boolean;
  view_count: number;
  created_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface GallerySessionInfo {
  authenticated: boolean;
  subject_type?: "guest" | "link";
  name?: string;
  permissions?: { view: boolean; download: boolean };
  expires_at?: string | null;
}

// Editable site content defaults (merged with DB overrides from /api/content)
export interface SocialLink {
  label: string;
  url: string;
}
