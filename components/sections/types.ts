import type { ReactNode } from "react";

export interface SectionProps {
  className?: string;
  id?: string;
}

export interface SectionHeaderProps {
  pill?: string;
  title: string;
  subtitle?: string;
  highlightWords?: string[];
  align?: "left" | "center";
}

export interface ComparisonItem {
  label: string;
  us: string | boolean;
  them: string | boolean;
}

export interface StatItem {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
}

export interface TimelineStep {
  title: string;
  description: string;
  icon?: ReactNode;
}

export interface FeatureItem {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface ChecklistItem {
  text: string;
  subtext?: string;
}

export interface ProcessStep {
  number: number;
  title: string;
  description: string;
}
