"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";

/**
 * "Load more" accumulation over a cursor endpoint.
 *
 * For card/feed surfaces that grow a single list rather than replacing a page.
 * `fetchPage` fetches one page for the given cursor (undefined = first page);
 * the hook resets and reloads whenever `resetKeys` change, and appends each
 * further page onto the accumulated list.
 */
export interface CursorPageResult<TItem> {
  items: TItem[];
  nextCursor: string | null;
}

export interface CursorLoadMore<TItem> {
  items: TItem[];
  /** First-page load. */
  isLoading: boolean;
  isLoadingMore: boolean;
  error: unknown;
  hasMore: boolean;
  loadMore: () => void;
}

export function useCursorLoadMore<TItem>(
  fetchPage: (cursor: string | undefined) => Promise<CursorPageResult<TItem>>,
  resetKeys: readonly unknown[] = [],
): CursorLoadMore<TItem> {
  const [items, setItems] = useState<TItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchInitialPage = useEffectEvent(() => fetchPage(undefined));

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setIsLoading(true);
        setError(null);
        return fetchInitialPage();
      })
      .then((page) => {
        if (cancelled || !page) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setIsLoading(false);
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(cause);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetKeys);

  const loadMore = useCallback(() => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    setError(null);
    setIsLoadingMore(true);
    fetchPage(nextCursor)
      .then((page) => {
        setItems((previous) => [...previous, ...page.items]);
        setNextCursor(page.nextCursor);
        setError(null);
        setIsLoadingMore(false);
      })
      .catch((cause) => {
        setError(cause);
        setIsLoadingMore(false);
      });
  }, [fetchPage, nextCursor, isLoadingMore]);

  return {
    items,
    isLoading,
    isLoadingMore,
    error,
    hasMore: Boolean(nextCursor),
    loadMore,
  };
}
