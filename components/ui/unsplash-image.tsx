"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  searchPhotos,
  buildImageUrl,
  getAttribution,
  type UnsplashPhoto,
} from "@/lib/unsplash/client";

interface UnsplashImageProps {
  query: string;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  showAttribution?: boolean;
  orientation?: "landscape" | "portrait" | "squarish";
  fallbackSrc?: string;
  photoIndex?: number;
}

export function UnsplashImage({
  query,
  alt,
  width = 800,
  height = 600,
  fill = false,
  priority = false,
  className,
  containerClassName,
  showAttribution = true,
  orientation = "landscape",
  fallbackSrc = "/placeholder.svg",
  photoIndex = 0,
}: UnsplashImageProps) {
  const [photo, setPhoto] = useState<UnsplashPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchPhoto() {
      try {
        setLoading(true);
        setError(false);

        const result = await searchPhotos(query, {
          perPage: Math.max(photoIndex + 1, 5),
          orientation,
        });

        if (mounted && result.results.length > 0) {
          const selectedPhoto = result.results[photoIndex] || result.results[0];
          setPhoto(selectedPhoto);
        } else if (mounted) {
          setError(true);
        }
      } catch (_err) {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchPhoto();

    return () => {
      mounted = false;
    };
  }, [query, orientation, photoIndex]);

  if (loading) {
    return (
      <div
        className={cn(
          "animate-pulse bg-muted rounded-lg",
          containerClassName
        )}
        style={fill ? undefined : { width, height }}
      />
    );
  }

  if (error || !photo) {
    return (
      <div className={cn("relative", containerClassName)}>
        <Image
          src={fallbackSrc}
          alt={alt || query}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          fill={fill}
          className={cn("object-cover", className)}
        />
      </div>
    );
  }

  const attribution = getAttribution(photo);
  const imageUrl = buildImageUrl(photo, {
    width: width * 2,
    height: height * 2,
    quality: 80,
    fit: "crop",
  });

  return (
    <div className={cn("relative group", containerClassName)}>
      <Image
        src={imageUrl}
        alt={photo.alt_description || alt || query}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        className={cn("object-cover", className)}
        placeholder="blur"
        blurDataURL={photo.blur_hash ? `data:image/svg+xml;base64,${photo.blur_hash}` : undefined}
      />
      {showAttribution && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-white/90">
            Photo by{" "}
            <a
              href={attribution.photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              {photo.user.name}
            </a>{" "}
            on{" "}
            <a
              href={attribution.unsplashUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Unsplash
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

interface StaticUnsplashImageProps {
  photo: UnsplashPhoto;
  alt?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  showAttribution?: boolean;
}

export function StaticUnsplashImage({
  photo,
  alt,
  width = 800,
  height = 600,
  fill = false,
  priority = false,
  className,
  containerClassName,
  showAttribution = true,
}: StaticUnsplashImageProps) {
  const attribution = getAttribution(photo);
  const imageUrl = buildImageUrl(photo, {
    width: width * 2,
    height: height * 2,
    quality: 80,
    fit: "crop",
  });

  return (
    <div className={cn("relative group", containerClassName)}>
      <Image
        src={imageUrl}
        alt={photo.alt_description || alt || ""}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        className={cn("object-cover", className)}
      />
      {showAttribution && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-xs text-white/90">
            Photo by{" "}
            <a
              href={attribution.photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              {photo.user.name}
            </a>{" "}
            on{" "}
            <a
              href={attribution.unsplashUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white"
            >
              Unsplash
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
