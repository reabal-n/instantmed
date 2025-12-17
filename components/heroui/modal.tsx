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
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-sm",
        base: "bg-background border border-default-100",
        header: "border-b border-default-100",
        footer: "border-t border-default-100",
      }}
    >
      <ModalContent>
        {children}
      </ModalContent>
    </HeroModal>
  )
}

export { ModalHeader, ModalBody, ModalFooter, useDisclosure }
