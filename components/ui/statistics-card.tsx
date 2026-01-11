"use client";

import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import React from "react";
import { cn } from "@/lib/utils";

const css = `
.candy-bg {
    background-color: hsl(var(--muted) / 0.02);
    background-image: linear-gradient(
      135deg,
      hsl(var(--muted)) 25%,
      transparent 25.5%,
      transparent 50%,
      hsl(var(--muted)) 50.5%,
      hsl(var(--muted)) 75%,
      transparent 75.5%,
      transparent
    );
    background-size: 10px 10px;
  }`;

interface StatsProps {
  title?: string;
  description?: string;
  items?: {
    value: number;
    label: string;
    className?: string;
    showToolTip?: boolean;
    delay?: number;
  }[];
}

const Stats = ({ 
  title = "We don&apos;t believe in talk we Deliver Results",
  description = "Experience the difference with our proven track record of success.",
  items = [
    { value: 35, label: "competitor 1", delay: 0.2 },
    { value: 25, label: "competitor 2", delay: 0.4 },
    {
      value: 99,
      label: "Lumen Health",
      className: "bg-primary",
      showToolTip: true,
      delay: 0.6,
    },
    { value: 37, label: "competitor 4", delay: 0.8 },
  ]
}: StatsProps) => {
  return (
    <section className="py-16 md:py-24">
      <style>{css}</style>
      <div className="gradient container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="w-full text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="my-4 tracking-tight text-muted-foreground lg:px-15 lg:text-lg">
            {description}
          </p>
        </div>
        <div className="relative mx-auto mt-12 md:mt-20 flex h-80 md:h-96 max-w-4xl items-center justify-center gap-2">
          {items.map((props, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.2,
                type: "spring",
                damping: 10,
              }}
              className="h-full w-full"
            >
              <BarChart {...props} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Stats };

const BarChart = ({
  value,
  label,
  className = "",
  showToolTip = false,
  delay = 0,
}: {
  value: number;
  label: string;
  className?: string;
  showToolTip?: boolean;
  delay?: number;
}) => {
  return (
    <div className="group relative h-full w-full">
      <div className="candy-bg relative h-full w-full overflow-hidden rounded-[24px] md:rounded-[40px]">
        <motion.div
          initial={{ opacity: 0, y: 100, height: 0 }}
          animate={{ opacity: 1, y: 0, height: `${value}%` }}
          transition={{ duration: 0.5, type: "spring", damping: 20, delay }}
          className={cn(
            "absolute bottom-0 mt-auto w-full rounded-[24px] md:rounded-[40px] bg-muted-foreground/80 dark:bg-muted p-2 md:p-3 text-foreground",
            className,
          )}
        >
          <div className="relative flex h-10 md:h-15 w-full items-center justify-center gap-2 rounded-full bg-background/20 tracking-tighter text-sm md:text-base">
            <NumberFlow value={value} suffix="%" />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 100, height: 0 }}
        animate={{ opacity: 1, y: 0, height: `${value}%` }}
        transition={{ duration: 0.5, type: "spring", damping: 15, delay }}
        className="absolute bottom-0 w-full"
      >
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: showToolTip ? 1 : 0, y: showToolTip ? 0 : 100 }}
          transition={{ duration: 0.5, type: "spring", damping: 15, delay }}
          className={cn(
            "absolute -top-9 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-muted-foreground px-2 py-1 text-xs md:text-sm text-primary-foreground",
            className,
          )}
        >
          <div
            className={cn(
              "absolute -bottom-9 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-muted-foreground transition-all duration-300 ease-in-out",
              className,
            )}
          />
          <svg
            className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2",
              className.includes("bg-primary")
                ? "text-primary"
                : "text-muted-foreground",
            )}
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.83855 8.41381C4.43827 9.45255 5.93756 9.45255 6.53728 8.41381L9.65582 3.01233C10.2555 1.97359 9.50589 0.675159 8.30646 0.675159H2.06937C0.869935 0.675159 0.120287 1.97359 0.720006 3.01233L3.83855 8.41381Z"
              fill="currentColor"
            />
          </svg>
          top rated
        </motion.div>
      </motion.div>
      <p className="mx-auto mt-2 w-fit text-xs md:text-sm tracking-tight text-muted-foreground/80 truncate">
        {label}
      </p>
    </div>
  );
};
