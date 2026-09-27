import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // Predefined Status & Action Color Variants
        success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        cyan: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        click: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        type: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        select: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        assert: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        scroll: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
        upload: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        keypress: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
