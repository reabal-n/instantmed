"use client"

import { cn } from "@/lib/utils"
import { Clock, Zap, Shield, DollarSign } from "lucide-react"

interface DisplayCardProps {
  className?: string
  icon?: React.ReactNode
  title?: string
  description?: string
  date?: string
  iconClassName?: string
  titleClassName?: string
}

function DisplayCard({
  className,
  icon = <Zap className="size-4 text-blue-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName = "text-blue-500",
  titleClassName = "text-blue-500",
}: DisplayCardProps) {
  return (
    <div
      className={cn(
        "relative flex h-36 w-[22rem] -skew-y-[8deg] select-none flex-col justify-between rounded-xl border-2 bg-muted/70 backdrop-blur-sm px-4 py-3 transition-all duration-700 after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[20rem] after:bg-linear-to-l after:from-background after:to-transparent after:content-[''] hover:border-white/20 hover:bg-muted [&>*]:flex [&>*]:items-center [&>*]:gap-2",
        className
      )}
    >
      <div>
        <span className={cn("relative inline-block rounded-full bg-blue-800 p-1", iconClassName)}>
          {icon}
        </span>
        <p className={cn("text-lg font-medium", titleClassName)}>{title}</p>
      </div>
      <p className="whitespace-nowrap text-lg">{description}</p>
      <p className="text-muted-foreground">{date}</p>
    </div>
  )
}

const comparisonCards: DisplayCardProps[] = [
  {
    icon: <Clock className="size-4 text-emerald-300" />,
    title: "45 min average",
    description: "Most requests done in under an hour",
    date: "InstantMed",
    iconClassName: "bg-emerald-800",
    titleClassName: "text-emerald-400",
    className: "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <Shield className="size-4 text-cyan-300" />,
    title: "AHPRA Doctors",
    description: "Real Australian GPs, not AI chatbots",
    date: "Licensed & Verified",
    iconClassName: "bg-cyan-800",
    titleClassName: "text-cyan-400",
    className: "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
  },
  {
    icon: <DollarSign className="size-4 text-dawn-300" />,
    title: "Pay if approved",
    description: "Full refund if we can&apos;t help you",
    date: "No-risk guarantee",
    iconClassName: "bg-dawn-800",
    titleClassName: "text-dawn-400",
    className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
  },
]

const ComparisonStats = () => {
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div className="container relative z-10">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 
            className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Why Aussies choose{" "}
            <span className="bg-linear-to-r from-primary to-[#4f46e5] bg-clip-text text-transparent">
              InstantMed
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            We&apos;re not just faster—we&apos;re redefining what telehealth should be.
          </p>
        </div>
        
        {/* Display Cards */}
        <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700">
          {comparisonCards.map((cardProps, index) => (
            <DisplayCard key={index} {...cardProps} />
          ))}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-16">
          *Patient satisfaction rate based on post-consultation surveys
        </p>
      </div>
    </section>
  )
}

export { ComparisonStats }
