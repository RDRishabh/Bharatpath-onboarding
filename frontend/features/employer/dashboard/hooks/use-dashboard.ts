"use client";

import { useEffect, useState } from "react";

import { getEmployerDashboard } from "../services/dashboard.service";
import type { EmployerDashboardData } from "../types";

interface UseDashboardResult {
  data: EmployerDashboardData | null;
  isLoading: boolean;
  error: Error | null;
}

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<EmployerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);

        const result = await getEmployerDashboard();

        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to load dashboard"),
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  return {
    data,
    isLoading,
    error,
  };
}