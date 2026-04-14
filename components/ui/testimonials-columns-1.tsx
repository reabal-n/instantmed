"use client";
import { BadgeCheck } from "lucide-react";
import Image from "next/image";
import React, { useRef,useState } from "react";

import { Avatar } from "@/components/ui/avatar";

function getInitials(name: string) {
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(" ");
  const first = (parts[0]?.[0] || "").toUpperCase();
  const last = (parts[parts.length - 1]?.[0] || "").toUpperCase();
  return (first + last).slice(0, 2);
}

type Testimonial = {
  text: string;
  image: string;
  name: string;
  role?: string;
  verified?: boolean;
};

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const duration = props.duration || 10;

  return (
    <div
      className={props.className}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex flex-col gap-4 pb-4 animate-testimonial-scroll"
        style={{
          animationDuration: `${duration}s`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name }, i) => (
                <div className="p-5 rounded-2xl border border-border/40 dark:border-border/50 shadow-sm dark:shadow-none max-w-xs w-full bg-white dark:bg-card" key={i}>
                  <div className="text-muted-foreground dark:text-foreground/70 leading-relaxed text-sm">{text}</div>
                  <div className="flex items-center gap-2 mt-4">
                    {image?.startsWith("/") ? (
                      <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0">
                        <Image
                          fill
                          sizes="32px"
                          src={image}
                          alt={name}
                          className="object-cover"
                          loading="lazy"
                        />
                      </div>
                    ) : image?.startsWith("http") ? (
                      <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0">
                        <Image
                          fill
                          sizes="32px"
                          src={image}
                          alt={name}
                          className="object-cover"
                          unoptimized
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <Avatar
                        className="h-8 w-8"
                        fallback={
                          <div className="h-8 w-8 flex items-center justify-center text-xs font-semibold text-primary">
                            {getInitials(name)}
                          </div>
                        }
                      />
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="font-medium tracking-tight leading-4 truncate text-sm">{name}</div>
                    </div>
                    <div className="flex items-center gap-1 text-success shrink-0">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </div>
    </div>
  );
};
