// =============================================================================
// components/ui barrel file
// Re-exports all UI primitives for convenient imports via @/components/ui
// =============================================================================
//
// NOTE: Some component files have overlapping export names (skeleton.tsx,
// spinner.tsx, and loader.tsx all define Spinner/Skeleton variants). When a
// name conflict exists, the primary (most-imported) source wins the unaliased
// name and secondary sources are aliased with a prefix. Consumers that need a
// specific variant should import directly from the source file.
// =============================================================================

// -----------------------------------------------------------------------------
// Forms -- inputs, selects, toggles, validation
// -----------------------------------------------------------------------------
export type { AnimatedSelectProps,SelectOption } from "./animated-select"
export { AnimatedSelect } from "./animated-select"
export type { CheckboxProps } from "./checkbox"
export { Checkbox } from "./checkbox"
export { CinematicSwitch } from "./cinematic-switch"
export { GlassRadioGroup } from "./glass-radio-group"
export type { InputProps } from "./input"
export { Input } from "./input"
export { IOSToggle, SegmentedControl } from "./ios-toggle"
export { Label } from "./label"
export type { ProgressProps } from "./progress"
export { Progress } from "./progress"
export type { RadioGroupProps } from "./radio-group"
export { RadioGroup, RadioGroupItem } from "./radio-group"
export { RadioCard } from "./radio-group-card"
export * from "./select"
export { default as SkyToggle } from "./sky-toggle"
export type { SwitchProps } from "./switch"
export { Switch } from "./switch"
export type { TextareaProps } from "./textarea"
export { Textarea } from "./textarea"

// -----------------------------------------------------------------------------
// Form layout -- sections, steppers, rows
// -----------------------------------------------------------------------------
export {
  FormActions,
  FormDivider,
  FormGroup,
  FormRow,
  FormSection,
  useFormGroupDescribedBy,
} from "./form-section"
export type { Step } from "./form-stepper"
export { CompactStepper,FormStepper, MiniStepper } from "./form-stepper"

// -----------------------------------------------------------------------------
// Buttons
// -----------------------------------------------------------------------------
export type { ButtonProps } from "./button"
export { Button, buttonVariants } from "./button"
export { MagneticButton } from "./magnetic-button"

// -----------------------------------------------------------------------------
// Layout -- cards, containers, pages, separators
// -----------------------------------------------------------------------------
export type { CardProps } from "./card"
export * from "./card"
export type {
  GradientBgMotionProps,
  GradientBgProps,
  GradientContainerProps,
} from "./gradient-bg"
export {
  GradientBg,
  GradientBgMotion,
  gradientBgVariants,
  GradientContainer,
} from "./gradient-bg"
export { PageContent, PageFooter,PageHeader, PageShell } from "./page-shell"
export { ProgressiveDisclosure,ProgressiveSection } from "./progressive-section"
export { SectionPill } from "./section-pill"
export type { SeparatorProps } from "./separator"
export { Separator } from "./separator"
export { GlowCard } from "./spotlight-card"

// -----------------------------------------------------------------------------
// Overlays -- dialogs, popovers, dropdowns, tooltips
// -----------------------------------------------------------------------------
export * from "./alert-dialog"
export { Collapsible, CollapsibleContent,CollapsibleTrigger } from "./collapsible"
export { ContextualHelp, InfoCard } from "./contextual-help"
export * from "./dialog"
export * from "./dropdown-menu"
export { commonHelpText,FieldLabelWithHelp, HelpTooltip } from "./help-tooltip"
export { Popover, PopoverAnchor,PopoverContent, PopoverTrigger } from "./popover"
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"

// -----------------------------------------------------------------------------
// Feedback -- alerts, badges, toasts, empty states
// -----------------------------------------------------------------------------
export type { AlertProps } from "./alert"
export { Alert, AlertDescription, AlertTitle, alertVariants } from "./alert"
export type { BadgeProps } from "./badge"
export { Badge, badgeVariants } from "./badge"
export { Confetti, ConfettiButton } from "./confetti"
export { EmptyState } from "./empty-state"
export { NetworkStatus } from "./error-recovery"
export { Toaster } from "./sonner"

// -----------------------------------------------------------------------------
// Skeletons (primary source: skeleton.tsx)
// -----------------------------------------------------------------------------
export type { SkeletonProps } from "./skeleton"
export {
  FormSkeleton,
  Skeleton,
  SkeletonCard,
  SkeletonDashboard,
  SkeletonForm,
  SkeletonFormSection,
  SkeletonInput,
  SkeletonList,
  SkeletonOnboarding,
  SkeletonPillSelector,
  SkeletonRow,
  SkeletonStepper,
} from "./skeleton"

// -----------------------------------------------------------------------------
// Spinners (primary source: spinner.tsx, unique variants)
// Skeleton.tsx also exports Spinner/ButtonSpinner/SpinnerWithText/LoadingOverlay
// -- import those directly from ./skeleton if needed.
// -----------------------------------------------------------------------------
export {
  ButtonSpinner,
  DotsSpinner,
  LoadingOverlay,
  PulseSpinner,
  Spinner,
} from "./spinner"

// -----------------------------------------------------------------------------
// Loaders (loader.tsx -- legacy loading components)
// loader.tsx also exports Skeleton/CardSkeleton -- import those directly
// from ./loader if needed.
// -----------------------------------------------------------------------------
export {
  FullPageLoader,
  Loader,
  LoaderWithText,
  PremiumLoader,
  RequestListSkeleton,
} from "./loader"

// -----------------------------------------------------------------------------
// Data display -- tables, tabs, stats, avatars, accordion
// -----------------------------------------------------------------------------
export { Accordion, AccordionContent,AccordionItem, AccordionTrigger } from "./accordion"
export type { AvatarProps } from "./avatar"
export { Avatar, AvatarFallback,AvatarImage } from "./avatar"
export { AvatarPicker } from "./avatar-picker"
export { Stats } from "./statistics-card"
export * from "./table"
export { Tabs, TabsContent,TabsList, TabsTrigger } from "./tabs"

// -----------------------------------------------------------------------------
// Navigation -- mobile nav
// -----------------------------------------------------------------------------
export type { AnimatedMobileMenuProps,MenuItemData } from "./animated-mobile-menu"
export { AnimatedMobileMenu,MenuToggle } from "./animated-mobile-menu"
export { DoctorMobileNav, MobileNav } from "./mobile-nav"

// -----------------------------------------------------------------------------
// Typography & text
// -----------------------------------------------------------------------------
export { AnimatedText } from "./animated-underline-text-one"
export { SafeHtml, SafeHtmlProse } from "./safe-html"

// -----------------------------------------------------------------------------
// Motion -- animation utilities
// -----------------------------------------------------------------------------
export { BlurFade } from "./blur-fade"
export { LottieAnimation } from "./lottie-animation"
export { scrollRevealConfig, useReducedMotion,useScrollReveal } from "./motion"

// -----------------------------------------------------------------------------
// Marketing -- testimonials, FAQ
// -----------------------------------------------------------------------------
export type { FAQGroup,FAQItem } from "./faq-list"
export { FAQList } from "./faq-list"
export { TestimonialsColumn } from "./testimonials-columns-1"
export { TestimonialsColumnsWrapper } from "./testimonials-columns-wrapper"

// -----------------------------------------------------------------------------
// Specialized -- address autocomplete
// -----------------------------------------------------------------------------
export type { AddressComponents } from "./address-autocomplete"
export { AddressAutocomplete } from "./address-autocomplete"
