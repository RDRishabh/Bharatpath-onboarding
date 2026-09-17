"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import {
  closeReview,
  openReview,
  setQueueTab,
} from "@/store/admin/queue/slice";

import {
  selectAdminQueue,
  selectIntegrityItems,
  selectKybItems,
  selectQueueItems,
} from "@/store/admin/queue/selectors";

import type { QueueTab } from "../types";

export function useQueue() {
  const dispatch = useAppDispatch();

  const state = useAppSelector(selectAdminQueue);

  const items = useAppSelector(selectQueueItems);

  const kybItems = useAppSelector(selectKybItems);

  const integrityItems = useAppSelector(
    selectIntegrityItems,
  );

  const setTab = (tab: QueueTab) => {
    dispatch(setQueueTab(tab));
  };

  const openReviewItem = (id: string) => {
    dispatch(openReview(id));
  };

  const closeReviewItem = () => {
    dispatch(closeReview());
  };

  return {
    state,

    tab: state.tab,

    openReviewId: state.openReviewId,

    items,

    kybItems,

    integrityItems,

    kybCount: kybItems.length,

    integrityCount: integrityItems.length,

    setTab,

    openReview: openReviewItem,

    closeReview: closeReviewItem,
  };
}