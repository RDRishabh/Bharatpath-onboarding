"use client";

import React, {
  forwardRef,
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/common/loading/skeleton";

/* =========================================================
   1. TABLE CONTAINER (Card wrapper)
========================================================= */
export interface TableContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
}

export const TableContainer = forwardRef<HTMLDivElement, TableContainerProps>(
  ({ children, className = "", header, footer, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-[16px] border border-[#e7e9ee] bg-white shadow-2xs overflow-hidden ${className}`}
        style={{ fontFamily: "'General Sans', sans-serif" }}
        {...props}
      >
        {header}
        <div
          className="overflow-x-auto bp-scrollbar"
          style={{ containerType: "inline-size" }}
        >
          {children}
        </div>
        {footer}
      </div>
    );
  },
);
TableContainer.displayName = "TableContainer";

/* =========================================================
   2. BASE TABLE
========================================================= */
export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  className?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <table
        ref={ref}
        className={`w-full text-left border-collapse ${className}`}
        {...props}
      />
    );
  },
);
Table.displayName = "Table";

/* =========================================================
   3. TABLE HEADER (thead)
========================================================= */
export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", ...props }, ref) => {
  return (
    <thead
      ref={ref}
      className={`border-b border-[#e7e9ee] bg-[#fafbfc] ${className}`}
      {...props}
    />
  );
});
TableHeader.displayName = "TableHeader";

/* =========================================================
   4. TABLE BODY (tbody)
========================================================= */
export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", ...props }, ref) => {
  return (
    <tbody
      ref={ref}
      className={`divide-y divide-[#f0f2f5] ${className}`}
      {...props}
    />
  );
});
TableBody.displayName = "TableBody";

/* =========================================================
   5. TABLE FOOTER (tfoot)
========================================================= */
export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className = "", ...props }, ref) => {
  return (
    <tfoot
      ref={ref}
      className={`border-t border-[#e7e9ee] bg-white font-medium ${className}`}
      {...props}
    />
  );
});
TableFooter.displayName = "TableFooter";

/* =========================================================
   6. TABLE ROW (tr)
========================================================= */
export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className = "", ...props }, ref) => {
  return (
    <tr
      ref={ref}
      className={`transition-colors hover:bg-[#fafbfc]/70 group ${className}`}
      {...props}
    />
  );
});
TableRow.displayName = "TableRow";

/* =========================================================
   7. TABLE HEAD CELL (th)
========================================================= */
export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className = "", ...props }, ref) => {
  return (
    <th
      ref={ref}
      className={`px-6 py-3.5 text-[11px] font-bold tracking-wider uppercase text-[#6c7482] whitespace-nowrap ${className}`}
      {...props}
    />
  );
});
TableHead.displayName = "TableHead";

/* =========================================================
   8. TABLE CELL (td)
========================================================= */
export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className = "", ...props }, ref) => {
  return (
    <td
      ref={ref}
      className={`px-5 py-3 text-[13px] text-[#151b2b] align-middle ${className}`}
      {...props}
    />
  );
});
TableCell.displayName = "TableCell";

/* =========================================================
   9. EMPTY STATE
========================================================= */
export interface TableEmptyProps {
  colSpan: number;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
}

export function TableEmpty({
  colSpan,
  title = "No data found",
  subtitle = "There are no records matching your current filter.",
  loading = false,
  className = "",
}: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        {/* sticky + 100cqw (container query width of the scroll viewport,
            see containerType on the scroll wrapper) keeps this centered in
            the visible viewport instead of the full, possibly wider, table */}
        <div
          className={`sticky left-0 flex w-[100cqw] flex-col items-center py-14 text-center ${className}`}
        >
          {loading && (
            <Loader2
              size={22}
              strokeWidth={2}
              className="mb-3 animate-spin text-[#777f90]"
            />
          )}
          <p className="text-[14px] font-semibold text-[#303747]">{title}</p>
          {subtitle && (
            <p className="mt-1 text-[12px] text-[#777f90]">{subtitle}</p>
          )}
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   10. TABLE PAGINATION
========================================================= */
export interface TablePaginationProps {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemLabel?: string;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function TablePagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = "items",
  className = "",
}: Readonly<TablePaginationProps>) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const startDisplay = totalCount === 0 ? 0 : startIndex + 1;
  const endDisplay = Math.min(startIndex + pageSize, totalCount);

  return (
    <div
      className={`flex items-center justify-between border-t border-[#e7e9ee] px-6 py-3 bg-white ${className}`}
      style={{ fontFamily: "'General Sans', sans-serif" }}
    >
      {/* SHOWING X–Y of Z label */}
      <span className="text-[13px] text-[#777f90]">
        Showing {startDisplay}–{endDisplay} of {totalCount}
        {itemLabel ? ` ${itemLabel}` : ""}
      </span>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-[#777f90]">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Rows per page"
            className="h-8 rounded-[8px] border border-[#e2e5eb] bg-white px-2 text-[13px] font-semibold text-[#151b2b] outline-none focus:border-[#8f86df] focus:ring-2 focus:ring-[#5b4fcf]/10"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {/* PAGINATION CONTROLS: < [2] of 2 > */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
          {/* PREV */}
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            aria-label="Previous page"
            className="grid h-7 w-7 place-items-center rounded-[8px] border border-[#e2e5eb] text-[#5d6673] hover:bg-[#f8f9fb] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft size={14} />
          </button>

          {/* CURRENT PAGE BOX + "of N" */}
          <div className="flex items-center gap-[6px]">
            <span className="grid h-7 min-w-[28px] place-items-center rounded-[8px] border border-[#e2e5eb] px-2 text-[13px] font-semibold text-[#151b2b] select-none bg-white">
              {currentPage}
            </span>
            <span className="text-[13px] text-[#777f90] select-none whitespace-nowrap">
              of {totalPages}
            </span>
          </div>

          {/* NEXT */}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            aria-label="Next page"
            className="grid h-7 w-7 place-items-center rounded-[8px] border border-[#e2e5eb] text-[#5d6673] hover:bg-[#f8f9fb] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight size={14} />
          </button>
          </div>
        )}
      </div>
    </div>
  );
}



/* =========================================================
   11. DATA TABLE (Generic High-Level Reusable Table)
========================================================= */
export interface ColumnDef<T> {
  id?: string;
  header: ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T, index: number) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor?: (row: T, index: number) => string | number;
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  emptyTitle?: string;
  emptySubtitle?: string;
  isLoading?: boolean;
  /** Number of skeleton rows shown while loading. Defaults to pageSize. */
  skeletonRows?: number;
  itemLabel?: string;
  className?: string;
  header?: ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor = (_, i) => i,
  totalCount,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  emptyTitle,
  emptySubtitle,
  isLoading = false,
  skeletonRows,
  itemLabel = "items",
  className = "",
  header,
}: Readonly<DataTableProps<T>>) {
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const page = onPageChange ? currentPage : localPage;
  const setPage = onPageChange ?? setLocalPage;
  const effectivePageSize = onPageSizeChange ? pageSize : localPageSize;
  const total = totalCount ?? data.length;
  const totalPages = Math.max(1, Math.ceil(total / effectivePageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, setPage, totalPages]);

  function handlePageSizeChange(nextPageSize: number) {
    if (onPageSizeChange) {
      onPageSizeChange(nextPageSize);
    } else {
      setLocalPageSize(nextPageSize);
    }
    setPage(1);
  }

  const startIndex = (page - 1) * effectivePageSize;
  const rowsToDisplay = onPageChange
    ? data
    : data.slice(startIndex, startIndex + effectivePageSize);

  const skeletonRowCount = skeletonRows ?? Math.min(effectivePageSize, 6);

  const columnKey = (col: ColumnDef<T>, fallback: number) =>
    col.id ?? (col.accessorKey ? String(col.accessorKey) : `col-${fallback}`);

  let bodyContent: ReactNode;
  if (isLoading && rowsToDisplay.length === 0) {
    bodyContent = Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
      <TableRow key={`skeleton-row-${rowIdx}`}>
        {columns.map((col, colIdx) => (
          <TableCell key={columnKey(col, colIdx)} className={col.cellClassName}>
            <Skeleton
              height={12}
              radius={6}
              width={colIdx === 0 ? "55%" : "72%"}
            />
          </TableCell>
        ))}
      </TableRow>
    ));
  } else if (rowsToDisplay.length > 0) {
    bodyContent = rowsToDisplay.map((row, rowIdx) => (
      <TableRow key={keyExtractor(row, rowIdx)}>
        {columns.map((col, colIdx) => {
          let content: ReactNode = null;
          if (col.cell) {
            content = col.cell(row, rowIdx);
          } else if (col.accessorKey) {
            content = String(row[col.accessorKey] ?? "");
          }

          return (
            <TableCell key={columnKey(col, colIdx)} className={col.cellClassName}>
              {content}
            </TableCell>
          );
        })}
      </TableRow>
    ));
  } else {
    bodyContent = (
      <TableEmpty
        colSpan={columns.length}
        title={emptyTitle}
        subtitle={emptySubtitle}
        loading={isLoading}
      />
    );
  }

  return (
    <TableContainer
      className={className}
      header={header}
      footer={
        <TablePagination
          currentPage={page}
          totalCount={total}
          pageSize={effectivePageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          itemLabel={itemLabel}
        />
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, idx) => (
              <TableHead
                key={col.id ?? String(col.accessorKey) ?? idx}
                className={col.headerClassName}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {bodyContent}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
