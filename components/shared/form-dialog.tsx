"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  footerActions?: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitVariant?: "default" | "destructive" | "secondary" | "outline";
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  showCloseButton?: boolean;
}

const maxWidthClasses: Record<string, string> = {
  sm: "max-w-sm sm:max-w-sm",
  md: "max-w-md sm:max-w-md",
  lg: "max-w-lg sm:max-w-lg",
  xl: "max-w-xl sm:max-w-xl",
  "2xl": "max-w-2xl sm:max-w-2xl",
  "3xl": "max-w-3xl sm:max-w-3xl",
  "4xl": "max-w-4xl sm:max-w-4xl",
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  onSubmit,
  footerActions,
  submitLabel = "Save Changes",
  cancelLabel = "Cancel",
  isSubmitting = false,
  submitDisabled = false,
  submitVariant = "default",
  maxWidth = "2xl",
  showCloseButton = true,
}: FormDialogProps) {
  const widthClass = maxWidthClasses[maxWidth] || maxWidthClasses["2xl"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={`${widthClass} p-0 gap-0 overflow-hidden border-border bg-card text-card-foreground shadow-2xl rounded-2xl flex flex-col max-h-[85vh]`}
      >
        {/* Fixed Header */}
        <DialogHeader className="p-6 border-b border-border bg-muted/20 shrink-0 flex flex-col gap-1">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            {icon}
            <span>{title}</span>
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">{children}</div>
          </ScrollArea>

          {/* Pinned Action Footer */}
          <DialogFooter className="m-0 p-4 px-6 border-t border-border bg-muted/20 flex items-center justify-end gap-2 shrink-0">
            {footerActions ? (
              footerActions
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="submit"
                  variant={submitVariant}
                  disabled={isSubmitting || submitDisabled}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    submitLabel
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default FormDialog;
