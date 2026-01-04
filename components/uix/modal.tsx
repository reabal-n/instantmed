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

/**
 * UIX Modal - HeroUI Pro with glassmorphism design
 * Compatible with existing dialog patterns
 */

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full"
  backdrop?: "transparent" | "opaque" | "blur"
  placement?: "auto" | "top" | "center" | "bottom"
  scrollBehavior?: "inside" | "outside"
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  backdrop = "blur",
  placement = "center",
  scrollBehavior = "inside",
  className,
}: ModalProps) {
  return (
    <HeroModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      backdrop={backdrop}
      placement={placement}
      scrollBehavior={scrollBehavior}
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-md",
        base: "bg-background/95 backdrop-blur-xl border border-default-100 shadow-2xl",
        header: "border-b border-default-100",
        footer: "border-t border-default-100",
      }}
      className={className}
    >
      <ModalContent>
        {children}
      </ModalContent>
    </HeroModal>
  )
}

export { ModalHeader, ModalBody, ModalFooter, useDisclosure }
export { Modal as UIXModal }
