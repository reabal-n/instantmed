"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { BadgeCheck } from "lucide-react";

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
  role: string;
  verified?: boolean;
};

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-4 pb-4"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div className="p-5 rounded-2xl border shadow-md shadow-primary/5 max-w-xs w-full bg-card/50 backdrop-blur-sm" key={i}>
                  <div className="text-muted-foreground leading-relaxed text-sm">{text}</div>
                  <div className="flex items-center gap-2 mt-4">
                    {image?.startsWith("/") ? (
                      <div className="relative h-8 w-8 rounded-full overflow-hidden shrink-0">
                        <Image
                          fill
                          src={image}
                          alt={name}
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <Avatar
                        className="h-8 w-8"
                        fallback={
                          <div className="h-8 w-8 flex items-center justify-center text-[11px] font-semibold text-primary">
                            {getInitials(name)}
                          </div>
                        }
                      />
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="font-medium tracking-tight leading-4 truncate text-sm">{name}</div>
                      <div className="leading-4 opacity-60 tracking-tight text-xs truncate">{role}</div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 shrink-0">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-medium">Verified</span>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
};

