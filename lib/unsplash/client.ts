const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = "https://api.unsplash.com";

export interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    html: string;
    download: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
}

export interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

async function unsplashFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error("NEXT_PUBLIC_UNSPLASH_ACCESS_KEY is not configured");
  }

  const url = new URL(`${UNSPLASH_API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error(`Unsplash API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Search for photos on Unsplash
 * @param query - Search query (e.g., "healthcare", "doctor patient")
 * @param options - Optional parameters
 */
export async function searchPhotos(
  query: string,
  options?: {
    page?: number;
    perPage?: number;
    orientation?: "landscape" | "portrait" | "squarish";
  }
): Promise<UnsplashSearchResponse> {
  const params: Record<string, string> = {
    query,
    page: String(options?.page ?? 1),
    per_page: String(options?.perPage ?? 10),
  };

  if (options?.orientation) {
    params.orientation = options.orientation;
  }

  return unsplashFetch<UnsplashSearchResponse>("/search/photos", params);
}

/**
 * Get a random photo from Unsplash
 * @param options - Optional filters
 */
export async function getRandomPhoto(options?: {
  query?: string;
  orientation?: "landscape" | "portrait" | "squarish";
  count?: number;
}): Promise<UnsplashPhoto | UnsplashPhoto[]> {
  const params: Record<string, string> = {};

  if (options?.query) params.query = options.query;
  if (options?.orientation) params.orientation = options.orientation;
  if (options?.count) params.count = String(options.count);

  return unsplashFetch<UnsplashPhoto | UnsplashPhoto[]>("/photos/random", params);
}

/**
 * Get a specific photo by ID
 */
export async function getPhoto(id: string): Promise<UnsplashPhoto> {
  return unsplashFetch<UnsplashPhoto>(`/photos/${id}`);
}

/**
 * Build optimized image URL with Unsplash parameters
 * @param photo - Unsplash photo object
 * @param options - Image transformation options
 */
export function buildImageUrl(
  photo: UnsplashPhoto,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    fit?: "crop" | "clamp" | "fill" | "scale-down";
  }
): string {
  const url = new URL(photo.urls.raw);

  if (options?.width) url.searchParams.set("w", String(options.width));
  if (options?.height) url.searchParams.set("h", String(options.height));
  if (options?.quality) url.searchParams.set("q", String(options.quality));
  if (options?.fit) url.searchParams.set("fit", options.fit);

  // Default optimizations
  url.searchParams.set("auto", "format");

  return url.toString();
}

/**
 * Generate attribution text for Unsplash (required by API terms)
 */
export function getAttribution(photo: UnsplashPhoto): {
  text: string;
  photographerUrl: string;
  unsplashUrl: string;
} {
  return {
    text: `Photo by ${photo.user.name} on Unsplash`,
    photographerUrl: `${photo.user.links.html}?utm_source=instantmed&utm_medium=referral`,
    unsplashUrl: `${photo.links.html}?utm_source=instantmed&utm_medium=referral`,
  };
}
