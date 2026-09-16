import { apiClient } from "@/lib/api/client";
import {
  LoginRequest,
  LoginResponse,
} from "../types";

export const authService = {
  async login(
    payload: LoginRequest,
  ): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>(
      "/api/auth/login",
      payload,
    );
  },

  async logout(): Promise<void> {
    await apiClient.post("/api/auth/logout");
  },

  async me(): Promise<LoginResponse> {
    return apiClient.get<LoginResponse>(
      "/api/auth/me",
    );
  },
};