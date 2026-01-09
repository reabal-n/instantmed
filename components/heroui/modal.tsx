"use client"

import * as React from "react"
import {
  Modal as HeroModal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react"
import { cn } from "@/lib/utils"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full"
  backdrop?: "transparent" | "opaque" | "blur"
  placement?: "auto" | "top" | "center" | "bottom"
  scrollBehavior?: "inside" | "outside"
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  backdrop = "blur",
  placement = "center",
  scrollBehavior = "inside",
}: ModalProps) {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      backdrop={backdrop}
      placement={placement}
      scrollBehavior={scrollBehavior}
      // Soft Pop Glass styling
      classNames={{
        // Glass backdrop
        backdrop: cn(
          "bg-black/40",
          "backdrop-blur-sm",
        ),
        // Elevated glass surface for modal
        base: cn(
          "bg-white/85 dark:bg-gray-900/80",
          "backdrop-blur-2xl",
          "border border-white/50 dark:border-white/15",
          // Geometry: rounded-3xl for modals
          "rounded-3xl",
          // Elevated glow shadow
          "shadow-[0_25px_60px_rgba(0,0,0,0.15)]",
          "dark:shadow-[0_25px_60px_rgba(0,0,0,0.4)]",
        ),
        header: cn(
          "border-b border-white/20 dark:border-white/10",
          "pb-4",
        ),
        body: "py-6",
        footer: cn(
          "border-t border-white/20 dark:border-white/10",
          "pt-4",
        ),
        closeButton: cn(
          "hover:bg-white/50 dark:hover:bg-white/10",
          "transition-colors duration-200",
          "rounded-full",
        ),
      }}
      // Spring physics motion (Linear style)
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 400,
              damping: 30,
            },
          },
          exit: {
            y: 20,
            opacity: 0,
            scale: 0.95,
            transition: {
              duration: 0.2,
              ease: "easeOut",
            },
          },
        },
      }}
    >
      <ModalContent>
        {children}
      </ModalContent>
    </HeroModal>
  )
}

export { ModalHeader, ModalBody, ModalFooter, useDisclosure }
