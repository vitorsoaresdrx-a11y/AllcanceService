import { useState } from "react";

const ITEMS_PER_PAGE = 30;

export function usePagination<T>(items: T[], perPage = ITEMS_PER_PAGE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginatedItems = items.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

  return {
    items: paginatedItems,
    page: safeCurrentPage,
    totalPages,
    totalItems: items.length,
    setPage,
    hasNext: safeCurrentPage < totalPages,
    hasPrev: safeCurrentPage > 1,
    next: () => setPage((p) => Math.min(p + 1, totalPages)),
    prev: () => setPage((p) => Math.max(p - 1, 1)),
    reset: () => setPage(1),
  };
}
