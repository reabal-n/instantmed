"use client";
import React from "react";
import { motion } from "motion/react";
import Image from "next/image";

type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
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
        className="flex flex-col gap-6 pb-6 bg-background"
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              {props.testimonials.map(({ text, image, name, role }, i) => (
                <div className="p-10 rounded-3xl border shadow-lg shadow-primary/10 max-w-xs w-full bg-card" key={i}>
                  <div className="text-muted-foreground leading-relaxed">{text}</div>
                  <div className="flex items-center gap-2 mt-5">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden shrink-0">
                      {image.startsWith('/') ? (
                        <Image
                          fill
                          src={image}
                          alt={name}
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <img
                          width={40}
                          height={40}
                          src={image}
                          alt={name}
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to dicebear if image fails to load
                            const target = e.target as HTMLImageElement;
                            if (!target.src.includes('dicebear')) {
                              target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/[^a-zA-Z0-9]/g, '')}`;
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="font-medium tracking-tight leading-5 truncate">{name}</div>
                      <div className="leading-5 opacity-60 tracking-tight text-sm truncate">{role}</div>
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

