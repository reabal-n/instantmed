"use client";
/* eslint-disable @next/next/no-img-element -- Dynamic project images */

import { useState, useRef, forwardRef } from "react";
import { X, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  image: string;
  title: string;
}

interface AnimatedFolderProps {
  title: string;
  projects: Project[];
  className?: string;
}

export function AnimatedFolder({ title, projects, className }: AnimatedFolderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const [hiddenCardId, setHiddenCardId] = useState<string | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleProjectClick = (project: Project, index: number) => {
    const cardEl = cardRefs.current[index];
    if (cardEl) {
      setSourceRect(cardEl.getBoundingClientRect());
    }
    setSelectedIndex(index);
    setHiddenCardId(project.id);
  };

  const handleCloseLightbox = () => {
    setSelectedIndex(null);
    setSourceRect(null);
  };

  const handleCloseComplete = () => {
    setHiddenCardId(null);
  };

  const handleNavigate = (newIndex: number) => {
    setSelectedIndex(newIndex);
    setHiddenCardId(projects[newIndex]?.id || null);
  };

  return (
    <>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center",
          "p-8 rounded-2xl cursor-pointer",
          "bg-card border border-border",
          "transition-all duration-500 ease-out",
          "hover:shadow-2xl hover:shadow-primary/10",
          "hover:border-primary/30",
          "group",
          className,
        )}
        style={{
          minWidth: "280px",
          minHeight: "320px",
          perspective: "1000px",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0 rounded-2xl transition-opacity duration-500"
          style={{
            background: "radial-gradient(circle at 50% 70%, hsl(var(--primary)) 0%, transparent 70%)",
            opacity: isHovered ? 0.08 : 0,
          }}
        />

        <div className="relative flex items-center justify-center mb-4" style={{ height: "160px", width: "200px" }}>
          {/* Folder back */}
          <div
            className="absolute w-32 h-24 bg-primary/60 dark:bg-primary/40 rounded-lg shadow-md"
            style={{
              transformOrigin: "bottom center",
              transform: isHovered ? "rotateX(-15deg)" : "rotateX(0deg)",
              transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              zIndex: 10,
            }}
          />

          {/* Folder tab */}
          <div
            className="absolute w-12 h-4 bg-primary/50 dark:bg-primary/30 rounded-t-md"
            style={{
              top: "calc(50% - 48px - 12px)",
              left: "calc(50% - 64px + 16px)",
              transformOrigin: "bottom center",
              transform: isHovered ? "rotateX(-25deg) translateY(-2px)" : "rotateX(0deg)",
              transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              zIndex: 10,
            }}
          />

          {/* Project cards */}
          <div
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 20,
            }}
          >
            {projects.slice(0, 3).map((project, index) => (
              <ProjectCard
                key={project.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                image={project.image}
                title={project.title}
                delay={index * 80}
                isVisible={isHovered}
                index={index}
                onClick={() => handleProjectClick(project, index)}
                isSelected={hiddenCardId === project.id}
              />
            ))}
          </div>

          {/* Folder front */}
          <div
            className="absolute w-32 h-24 bg-primary/80 dark:bg-primary/60 rounded-lg shadow-lg"
            style={{
              top: "calc(50% - 48px + 4px)",
              transformOrigin: "bottom center",
              transform: isHovered ? "rotateX(25deg) translateY(8px)" : "rotateX(0deg)",
              transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              zIndex: 30,
            }}
          />

          {/* Shine effect */}
          <div
            className="absolute w-32 h-24 rounded-lg overflow-hidden pointer-events-none"
            style={{
              top: "calc(50% - 48px + 4px)",
              background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)",
              transformOrigin: "bottom center",
              transform: isHovered ? "rotateX(25deg) translateY(8px)" : "rotateX(0deg)",
              transition: "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              zIndex: 31,
            }}
          />
        </div>

        <h3
          className="text-lg font-semibold text-foreground mt-4 transition-all duration-300"
          style={{
            transform: isHovered ? "translateY(4px)" : "translateY(0)",
          }}
        >
          {title}
        </h3>

        <p
          className="text-sm text-muted-foreground transition-all duration-300"
          style={{
            opacity: isHovered ? 0.7 : 1,
          }}
        >
          {projects.length} items
        </p>

        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-muted-foreground transition-all duration-300"
          style={{
            opacity: isHovered ? 0 : 0.6,
            transform: isHovered ? "translateY(10px)" : "translateY(0)",
          }}
        >
          <span>Hover to explore</span>
        </div>
      </div>

      <ImageLightbox
        projects={projects.slice(0, 3)}
        currentIndex={selectedIndex ?? 0}
        isOpen={selectedIndex !== null}
        onClose={handleCloseLightbox}
        sourceRect={sourceRect}
        onCloseComplete={handleCloseComplete}
        onNavigate={handleNavigate}
      />
    </>
  );
}

interface ImageLightboxProps {
  projects: Project[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  sourceRect: DOMRect | null;
  onCloseComplete?: () => void;
  onNavigate: (index: number) => void;
}

function ImageLightbox({
  projects,
  currentIndex,
  isOpen: _isOpen,
  onClose,
  sourceRect: _sourceRect,
  onCloseComplete,
  onNavigate,
}: ImageLightboxProps) {
  const [animationPhase, setAnimationPhase] = useState<"initial" | "animating" | "complete">("initial");
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [internalIndex, _setInternalIndex] = useState(currentIndex);
  const [isSliding, _setIsSliding] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalProjects = projects.length;
  const hasNext = internalIndex < totalProjects - 1;
  const hasPrev = internalIndex > 0;

  const currentProject = projects[internalIndex];

  const handleClose = () => {
    setIsClosing(true);
    onClose();
    setTimeout(() => {
      setIsClosing(false);
      setShouldRender(false);
      setAnimationPhase("initial");
      onCloseComplete?.();
    }, 400);
  };

  if (!shouldRender || !currentProject) return null;

  return (
    <div
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8")}
      onClick={handleClose}
      style={{
        opacity: isClosing ? 0 : 1,
        transition: "opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-xl"
        style={{
          opacity: animationPhase === "initial" && !isClosing ? 0 : 1,
          transition: "opacity 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className={cn(
          "absolute top-5 right-5 z-50",
          "w-10 h-10 flex items-center justify-center",
          "rounded-full bg-muted/50 backdrop-blur-md",
          "border border-border",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          "transition-all duration-300 ease-out hover:scale-105 active:scale-95",
        )}
      >
        <X className="w-4 h-4" strokeWidth={2.5} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (hasPrev) onNavigate(internalIndex - 1);
        }}
        disabled={!hasPrev || isSliding}
        className={cn(
          "absolute left-4 md:left-8 z-50",
          "w-12 h-12 flex items-center justify-center",
          "rounded-full bg-muted/50 backdrop-blur-md",
          "border border-border",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          "transition-all duration-300 ease-out hover:scale-110 active:scale-95",
          "disabled:opacity-0 disabled:pointer-events-none",
        )}
      >
        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (hasNext) onNavigate(internalIndex + 1);
        }}
        disabled={!hasNext || isSliding}
        className={cn(
          "absolute right-4 md:right-8 z-50",
          "w-12 h-12 flex items-center justify-center",
          "rounded-full bg-muted/50 backdrop-blur-md",
          "border border-border",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
          "transition-all duration-300 ease-out hover:scale-110 active:scale-95",
          "disabled:opacity-0 disabled:pointer-events-none",
        )}
      >
        <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
      </button>

      <div
        ref={containerRef}
        className="relative z-10 w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn("relative overflow-hidden", "rounded-2xl", "bg-card", "ring-1 ring-border", "shadow-2xl")}
        >
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-400 ease-out"
              style={{
                transform: `translateX(-${internalIndex * 100}%)`,
              }}
            >
              {projects.map((project) => (
                <img
                  key={project.id}
                  src={project.image}
                  alt={project.title}
                  className="w-full h-auto max-h-[70vh] object-contain bg-background shrink-0"
                  style={{ minWidth: "100%" }}
                />
              ))}
            </div>
          </div>

          <div className={cn("px-6 py-5", "bg-card", "border-t border-border")}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-foreground tracking-tight truncate">
                  {currentProject?.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    {projects.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => onNavigate(idx)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          idx === internalIndex
                            ? "bg-foreground scale-110"
                            : "bg-muted-foreground/40 hover:bg-muted-foreground/60",
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                className={cn(
                  "flex items-center gap-2 px-4 py-2",
                  "text-sm font-medium text-muted-foreground",
                  "bg-muted/50 hover:bg-muted",
                  "rounded-lg border border-border",
                  "transition-all duration-200 ease-out",
                  "hover:text-foreground",
                )}
              >
                <span>View</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  image: string;
  title: string;
  delay: number;
  isVisible: boolean;
  index: number;
  onClick: () => void;
  isSelected: boolean;
}

const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(
  ({ image, title, delay, isVisible, index, onClick, isSelected }, ref) => {
    const rotations = [-12, 0, 12];
    const translations = [-55, 0, 55];

    return (
      <div
        ref={ref}
        className={cn(
          "absolute w-20 h-28 rounded-lg overflow-hidden shadow-xl",
          "bg-card border border-border",
          "cursor-pointer hover:ring-2 hover:ring-primary/50",
          isSelected && "opacity-0",
        )}
        style={{
          transform: isVisible
            ? `translateY(-90px) translateX(${translations[index]}px) rotate(${rotations[index]}deg) scale(1)`
            : "translateY(0px) translateX(0px) rotate(0deg) scale(0.5)",
          opacity: isSelected ? 0 : isVisible ? 1 : 0,
          transition: `all 600ms cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
          zIndex: 10 - index,
          left: "-40px",
          top: "-56px",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <img src={image} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-t from-foreground/60 to-transparent" />
        <p className="absolute bottom-1.5 left-1.5 right-1.5 text-xs font-medium text-primary-foreground truncate">
          {title}
        </p>
      </div>
    );
  },
);

ProjectCard.displayName = "ProjectCard";
