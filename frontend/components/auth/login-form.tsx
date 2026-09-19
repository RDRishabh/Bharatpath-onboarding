"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  loginSchema,
  LoginFormValues,
} from "@/features/auth/schemas/login.schema";
import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/common/slices/auth.slice";
import { setTenant } from "@/store/common/slices/tenant.slice";
import { PORTAL_TYPES } from "@/config/portal";

export function LoginForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [showPassword, setShowPassword] =
    useState(false);

  const [serverError, setServerError] =
    useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (
    values: LoginFormValues,
  ) => {
    setServerError("");

    try {
      /*
       * Temporary bypass login.
       *
       * No API call for now.
       * Every login is treated as a College user and
       * routed straight to the college portal.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 500),
      );

      dispatch(
        setUser({
          id: "mock-college-user",
          email: values.email,
          name: "College Admin",
          role: "COLLEGE",
          tenantSlug: "development",
        }),
      );

      dispatch(
        setTenant({
          portal: PORTAL_TYPES.COLLEGE,
          tenantId: null,
          tenantSlug: "development",
          tenantName: "Development College",
        }),
      );

      router.push("/college");
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Unable to login. Please try again.",
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#151b2b] text-lg font-bold text-white">
            B
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-[#151b2b]">
            Welcome to BharatPath
          </h1>

          <p className="mt-2 text-sm text-[#777f90]">
            Sign in to continue to your portal
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-[#e5e7ec] bg-white p-6 shadow-sm sm:p-8"
        >
          {serverError && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-[#303747]"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("email")}
              className="h-11 w-full rounded-lg border border-[#dfe2e8] bg-white px-3 text-sm outline-none transition placeholder:text-[#a0a6b1] focus:border-[#5b4fcf] focus:ring-2 focus:ring-[#5b4fcf]/10"
            />

            {errors.email && (
              <p className="mt-1.5 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="mt-5">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-[#303747]"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                placeholder="Enter your password"
                {...register("password")}
                className="h-11 w-full rounded-lg border border-[#dfe2e8] bg-white px-3 pr-11 text-sm outline-none transition placeholder:text-[#a0a6b1] focus:border-[#5b4fcf] focus:ring-2 focus:ring-[#5b4fcf]/10"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (value) => !value,
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a91a0]"
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>

            {errors.password && (
              <p className="mt-1.5 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="mt-3 text-right">
            <button
              type="button"
              className="text-xs font-medium text-[#5b4fcf] hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#151b2b] text-sm font-semibold text-white transition hover:bg-[#20283c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {isSubmitting
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}