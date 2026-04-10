// src/components/reveal-wrapper.tsx
"use client";
import { useRef } from "react";
import type { ElementType, ReactNode } from "react";
import { useScrollReveal, type ScrollRevealOptions } from "@/hooks/use-scroll-reveal";

interface RevealWrapperProps extends ScrollRevealOptions {
  children: ReactNode;
  /** HTML element to render as. Default: "div" */
  as?: ElementType;
  className?: string;
}

/**
 * Thin client wrapper for server component pages.
 * Passes server-rendered children through and applies scroll-reveal.
 *
 * Usage in a Server Component:
 *   <RevealWrapper as="header" className="mb-8 ...">
 *     <h1>...</h1>
 *   </RevealWrapper>
 */
export function RevealWrapper({
  children,
  as: Tag = "div",
  className,
  ...revealOptions
}: RevealWrapperProps) {
  const ref = useRef<HTMLElement>(null);
  useScrollReveal(ref, revealOptions);
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
