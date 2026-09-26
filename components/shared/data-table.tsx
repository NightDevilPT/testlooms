"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaginationInfo } from "@/lib/response-service/types";
import { cn } from "cn";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (item: T, index: number) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (item: T) => string;

  // Server-Side API Pagination Support (Matches TestLoom API PaginationInfo envelope)
  pagination?: PaginationInfo | null;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  // Client-Side Fallback Pagination Settings
  pageSize?: number;
  pageSizeOptions?: number[];

  // Toolbar Slots (Search, Filters, Header Actions)
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  debounceMs?: number;
  filterSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;

  // Empty & Loading UI States
  emptyTitle?: string;
  emptyDescription?: string;
  isLoading?: boolean;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records...",
  debounceMs = 300,
  filterSlot,
  actionSlot,
  emptyTitle = "No records found",
  emptyDescription = "There are no entries to display at this time.",
  isLoading = false,
  className,
}: DataTableProps<T>) {
  // Client-side fallback pagination state when server-side `pagination` prop is not passed
  const [clientPage, setClientPage] = useState(1);
  const [clientPageSize, setClientPageSize] = useState(initialPageSize);

  // Local state for smooth un-lagged search typing response
  const [inputValue, setInputValue] = useState(searchQuery ?? "");

  const isServerPaginated = Boolean(pagination);

  // Sync internal input value if parent searchQuery prop changes externally
  useEffect(() => {
    setInputValue(searchQuery ?? "");
  }, [searchQuery]);

  // Debounce search callback: wait `debounceMs` (default 300ms) after user stops typing
  useEffect(() => {
    if (onSearchChange === undefined) return;
    if (inputValue === (searchQuery ?? "")) return;

    const timer = setTimeout(() => {
      onSearchChange(inputValue);
      if (!isServerPaginated) setClientPage(1);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [inputValue, searchQuery, onSearchChange, isServerPaginated, debounceMs]);

  // Computed values depending on Server vs Client pagination mode
  const currentPage = isServerPaginated ? pagination!.page : clientPage;
  const pageSize = isServerPaginated ? pagination!.pageSize : clientPageSize;
  const totalItems = isServerPaginated ? pagination!.totalItems : data.length;
  const totalPages = isServerPaginated
    ? Math.max(1, pagination!.totalPages)
    : Math.max(1, Math.ceil(data.length / clientPageSize));

  const hasPrevious = isServerPaginated ? pagination!.hasPrevious : currentPage > 1;
  const hasNext = isServerPaginated ? pagination!.hasNext : currentPage < totalPages;

  // Displayed data: server mode uses data directly, client mode slices locally
  const displayedData = useMemo(() => {
    if (isServerPaginated) {
      return data;
    }
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, isServerPaginated, currentPage, pageSize]);

  // Page range calculations
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Pagination Event Handlers
  const handleNext = () => {
    if (!hasNext || isLoading) return;
    const nextPage = currentPage + 1;
    if (isServerPaginated) {
      onPageChange?.(nextPage);
    } else {
      setClientPage(nextPage);
    }
  };

  const handlePrevious = () => {
    if (!hasPrevious || isLoading) return;
    const prevPage = currentPage - 1;
    if (isServerPaginated) {
      onPageChange?.(prevPage);
    } else {
      setClientPage(prevPage);
    }
  };

  const handleFirst = () => {
    if (currentPage <= 1 || isLoading) return;
    if (isServerPaginated) {
      onPageChange?.(1);
    } else {
      setClientPage(1);
    }
  };

  const handleLast = () => {
    if (currentPage >= totalPages || isLoading) return;
    if (isServerPaginated) {
      onPageChange?.(totalPages);
    } else {
      setClientPage(totalPages);
    }
  };

  const handleSizeChange = (val: string | null) => {
    if (!val) return;
    const newSize = Number(val);
    if (isServerPaginated) {
      onPageSizeChange?.(newSize);
    } else {
      setClientPageSize(newSize);
      setClientPage(1);
    }
  };

  // Helper algorithm to generate page number buttons with ellipsis (1 2 3 ... 7 8 9)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }

    if (currentPage >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  }, [currentPage, totalPages]);

  return (
    <Card className={cn("overflow-hidden border-border shadow-xl flex flex-col w-full p-0", className)}>
      {/* Top Toolbar (Search, Custom Filters, Action Buttons) */}
      {(onSearchChange !== undefined || filterSlot || actionSlot) && (
        <div className="p-4 border-b border-border flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {onSearchChange !== undefined && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="pl-9 pr-8 text-sm"
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputValue("");
                      onSearchChange?.("");
                      if (!isServerPaginated) setClientPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-xs transition-colors"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {filterSlot}
          </div>

          {actionSlot && <div className="flex items-center gap-2 w-full md:w-auto justify-end">{actionSlot}</div>}
        </div>
      )}

      {/* Main Table View */}
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    "py-3.5 px-4",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right"
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-foreground">Loading data...</p>
                </td>
              </tr>
            ) : displayedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-14 text-muted-foreground">
                  <Inbox className="h-9 w-9 mx-auto mb-2 text-muted-foreground/60" />
                  <p className="font-semibold text-foreground text-sm">{emptyTitle}</p>
                  <p className="text-xs mt-1 text-muted-foreground">{emptyDescription}</p>
                </td>
              </tr>
            ) : (
              displayedData.map((item, index) => (
                <tr key={rowKey(item)} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "py-3.5 px-4",
                        col.align === "center" && "text-center",
                        col.align === "right" && "text-right"
                      )}
                    >
                      {col.cell(item, (currentPage - 1) * pageSize + index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom API-Matched Pagination Controls */}
      <div className="p-4 border-t border-border flex flex-col lg:flex-row items-center justify-between gap-4 bg-muted/10 text-xs text-muted-foreground">
        {/* Item Range Metadata */}
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-foreground font-semibold">{startItem}</strong> to{" "}
            <strong className="text-foreground font-semibold">{endItem}</strong> of{" "}
            <strong className="text-foreground font-semibold">{totalItems}</strong> entries
          </span>

          <div className="hidden sm:flex items-center gap-1.5 border-l border-border pl-3">
            <span>Per page:</span>
            <Select value={String(pageSize)} onValueChange={handleSizeChange}>
              <SelectTrigger className="h-7 w-16 text-xs bg-background border-border">
                <SelectValue placeholder={String(pageSize)} />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Page Navigation Controls: Page X of Y      <<  <  1 2 3 ... 7 8 9  >  >> */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <span className="font-medium text-foreground text-xs whitespace-nowrap">
            Page <strong className="font-bold">{currentPage}</strong> of <strong className="font-bold">{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1">
            {/* First Page (<<) */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleFirst}
              disabled={!hasPrevious || currentPage <= 1 || isLoading}
              title="First Page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Previous Page (<) */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handlePrevious}
              disabled={!hasPrevious || currentPage <= 1 || isLoading}
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Dynamic Page Number Buttons (1, 2, 3, ..., 7, 8, 9) */}
            <div className="flex items-center gap-1">
              {pageNumbers.map((p, idx) => {
                if (typeof p === "string") {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground select-none">
                      ...
                    </span>
                  );
                }

                const isCurrent = p === currentPage;
                return (
                  <Button
                    key={`page-${p}`}
                    type="button"
                    variant={isCurrent ? "default" : "outline"}
                    size="icon"
                    className={cn(
                      "h-8 w-8 text-xs font-medium transition-all",
                      isCurrent && "font-bold shadow-xs"
                    )}
                    onClick={() => {
                      if (isLoading) return;
                      if (isServerPaginated) {
                        onPageChange?.(p);
                      } else {
                        setClientPage(p);
                      }
                    }}
                    disabled={isLoading}
                  >
                    {p}
                  </Button>
                );
              })}
            </div>

            {/* Next Page (>) */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleNext}
              disabled={!hasNext || currentPage >= totalPages || isLoading}
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Last Page (>>) */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleLast}
              disabled={!hasNext || currentPage >= totalPages || isLoading}
              title="Last Page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default DataTable;
