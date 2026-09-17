"use client";

import {
  Armchair,
  ChevronRight,
  FlaskConical,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { selectPortal } from "@/store/common/selectors/tenant.selectors";

import {
  PORTAL_TYPES,
  PortalType,
} from "@/config/portal";

import {
  selectCreditPack,
  selectEmployerCreditBalance,
  selectEmployerCreditPacks,
  selectSelectedCreditPack,
  selectSelectedCreditPackId,
  addCredits,
} from "@/store/employer/billing";

import { NotificationCenter } from "@/features/notifications";

import { CreditsButton } from "@/features/employer/billing/components/credits-button";
import { BuyCreditsModal } from "@/features/employer/billing/components/buy-credits-modal";

import { useHeaderContent } from "./header-context";

interface PortalHeaderProps {
  portal: "college" | "employer" | "student" | "admin";

  /**
   * Called when the DEMO STATE control is clicked.
   *
   * The actual demo-state panel is controlled by
   * the parent Portal/Admin layout.
   */
  onDemoStateClick?: () => void;
}

const PORTAL_BADGE_LABEL: Record<PortalType, string> = {
  [PORTAL_TYPES.COLLEGE]: "DEMO STATE",
  [PORTAL_TYPES.STUDENT]: "DEMO STATE",
  [PORTAL_TYPES.EMPLOYER]: "DEMO STATE",
  [PORTAL_TYPES.ADMIN]: "DEMO STATE",
};

export function PortalHeader({
  portal: currentPortal,
  onDemoStateClick,
}: PortalHeaderProps) {
  /*
   * ==========================================
   * HEADER CONTENT
   * ==========================================
   */

  const {
    title,
    subtitle,
    badge,
    stat,
    action,
  } = useHeaderContent();

  /*
   * ==========================================
   * ROUTER
   * ==========================================
   */

  const pathname = usePathname();
  const router = useRouter();

  /*
   * ==========================================
   * CURRENT PORTAL
   * ==========================================
   */

  const reduxPortal = useAppSelector(selectPortal);

  const portal =
    currentPortal ?? reduxPortal;

  /*
   * ==========================================
   * REDUX
   * ==========================================
   */

  const dispatch = useAppDispatch();

  /*
   * ==========================================
   * EMPLOYER BILLING
   * ==========================================
   */

  const creditBalance = useAppSelector(
    selectEmployerCreditBalance,
  );

  const creditPacks = useAppSelector(
    selectEmployerCreditPacks,
  );

  const selectedPackId = useAppSelector(
    selectSelectedCreditPackId,
  );

  const selectedPack = useAppSelector(
    selectSelectedCreditPack,
  );

  /*
   * ==========================================
   * BUY CREDITS MODAL
   * ==========================================
   */

  const [isBuyCreditsOpen, setIsBuyCreditsOpen] =
    useState(false);

  /*
   * ==========================================
   * PORTAL CHECK
   * ==========================================
   */

  const isEmployer =
    portal === PORTAL_TYPES.EMPLOYER;

  const isAdmin =
    portal === PORTAL_TYPES.ADMIN;

  /*
   * ==========================================
   * ADMIN KYB
   *
   * The KYB control is intentionally part of
   * the shared header so it appears on every
   * Admin page.
   *
   * ==========================================
   */

  /*
   * Default to Manual so the header matches
   * the current Admin demo state.
   *
   * Replace this with your admin Redux selector
   * once the admin settings slice exposes
   * kybMode globally.
   */
  const [adminKybMode] = useState<
    "manual" | "auto"
  >("manual");

  const adminKybModeLabel =
    adminKybMode === "auto"
      ? "Automatic"
      : "Manual";

  /*
   * ==========================================
   * ADMIN KYB SETTINGS NAVIGATION
   * ==========================================
   */

  const handleOpenKybSettings = () => {
    router.push("/admin/settings");
  };

  /*
   * ==========================================
   * JOBS PAGE CHECK
   *
   * Create Job is shown only for Employer Jobs.
   * ==========================================
   */

  const isEmployerJobsPage =
    isEmployer &&
    pathname === "/employer/jobs";

  /*
   * ==========================================
   * RESOLVED BADGE
   * ==========================================
   */

  const resolvedBadge = badge ?? {
    icon: FlaskConical,
    label:
      portal &&
      portal in PORTAL_BADGE_LABEL
        ? PORTAL_BADGE_LABEL[
            portal as PortalType
          ]
        : "DEMO STATE",
  };

  /*
   * ==========================================
   * CREDITS HANDLERS
   * ==========================================
   */

  const handleOpenCredits = () => {
    setIsBuyCreditsOpen(true);
  };

  const handleCloseCredits = () => {
    setIsBuyCreditsOpen(false);
  };

  const handleSelectPack = (
    packId: string,
  ) => {
    dispatch(selectCreditPack(packId));
  };

  /*
   * ==========================================
   * PAYMENT
   * ==========================================
   */

  const handlePay = () => {
    if (!selectedPack) {
      return;
    }

    dispatch(
      addCredits(selectedPack.credits),
    );

    setIsBuyCreditsOpen(false);
  };

  /*
   * ==========================================
   * CREATE JOB
   * ==========================================
   */

  const handleCreateJob = () => {
    router.push("/employer/jobs/create");
  };

  return (
    <>
      <header
        className="
          flex
          min-h-[64px]
          shrink-0
          items-center
          gap-[12px]
          border-b
          border-[#e7e9ee]
          bg-white
          px-[16px]
          py-[10px]
        "
        style={{
          fontFamily:
            "'General Sans', sans-serif",
        }}
      >
        {/* ==========================================
            TITLE + SUBTITLE
            ========================================== */}

        <div
          className="
            flex
            min-w-0
            flex-1
            flex-col
            gap-[2px]
          "
        >
          <h1
            className="
              m-0
              truncate
              text-[18px]
              font-[700]
              leading-[23px]
              tracking-[-0.01em]
              text-[#151b2b]
            "
            style={{
              fontFamily:
                "'General Sans', sans-serif",
              fontWeight: 700,
            }}
          >
            {title}
          </h1>

          <span
            className="
              truncate
              whitespace-nowrap
              text-[12px]
              font-[400]
              leading-[17px]
              text-[#5D6673]
            "
            style={{
              fontFamily:
                "'General Sans', sans-serif",
              fontWeight: 400,
            }}
          >
            {subtitle}
          </span>
        </div>

        {/* ==========================================
            DEMO STATE
            ========================================== */}

        <button
          type="button"
          onClick={onDemoStateClick}
          aria-label="Open demo state options"
          aria-expanded={Boolean(onDemoStateClick)}
          className="
            hidden
            shrink-0
            items-center
            gap-[6px]
            rounded-[8px]
            px-[6px]
            py-[7px]
            text-[#5d6673]
            transition-colors
            hover:bg-[#f5f7fa]
            hover:text-[#151b2b]
            sm:flex
          "
        >
          {resolvedBadge.icon && (
            <resolvedBadge.icon
              size={14}
              strokeWidth={2}
              className="shrink-0"
            />
          )}

          <span
            className="
              text-[11px]
              font-[600]
              leading-[14px]
              tracking-[0.04em]
            "
          >
            {resolvedBadge.label}
          </span>
        </button>

        {/* ==========================================
            ADMIN KYB APPROVAL MODE
            ========================================== */}

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenKybSettings}
            aria-label="KYB approval mode — open settings"
            title="Change KYB approval mode in Settings"
            className="
              hidden
              h-[36px]
              shrink-0
              items-center
              gap-[8px]
              rounded-[10px]
              border
              border-[#e5e7ec]
              bg-white
              px-[10px]
              transition-colors
              hover:border-[rgba(47,93,168,0.3)]
              hover:bg-[#f4f7fc]
              sm:flex
            "
          >
            {/* Shield icon */}

            <span
              className="
                grid
                h-[24px]
                w-[24px]
                shrink-0
                place-items-center
                rounded-[8px]
                bg-[#edf2fa]
              "
            >
              <ShieldCheck
                size={14}
                strokeWidth={2.4}
                className="text-[#2f5da8]"
              />
            </span>

            {/* KYB + mode */}

            <span
              className="
                flex
                items-center
                gap-[6px]
                whitespace-nowrap
              "
            >
              <span
                className="
                  text-[12px]
                  font-[500]
                  leading-[16px]
                  text-[#5d6673]
                "
              >
                KYB
              </span>

              <span
                className="
                  h-[3px]
                  w-[5px]
                  shrink-0
                  rounded-full
                  bg-[#e5e7ec]
                "
              />

              <span
                className="
                  text-[12px]
                  font-[600]
                  leading-[16px]
                  text-[#151b2b]
                "
              >
                {adminKybModeLabel}
              </span>
            </span>

            <ChevronRight
              size={12}
              strokeWidth={2}
              className="shrink-0 text-[#777f90]"
            />
          </button>
        )}

        {/* ==========================================
            EMPLOYER CREDITS
            ========================================== */}

        {isEmployer && (
          <CreditsButton
            credits={creditBalance}
            onClick={handleOpenCredits}
          />
        )}

        {/* ==========================================
            COLLEGE / STUDENT STAT
            ========================================== */}

        {!isEmployer && !isAdmin && stat && (
          <button
            type="button"
            aria-label="Seats used — open billing"
            title={`${stat.label} — open Seats & payment to add more before you run out`}
            className="
              flex
              h-[40px]
              shrink-0
              cursor-pointer
              items-center
              gap-[10px]
              rounded-xl
              border
              border-[#e5e7ec]
              bg-white
              px-[10px]
              pl-[6px]
              transition-colors
              hover:border-[#cfd3dc]
              hover:bg-[#f8fafc]
            "
          >
            <span
              className="
                grid
                h-[28px]
                w-[28px]
                shrink-0
                place-items-center
                rounded-[8px]
                bg-[#edf2fa]
              "
            >
              <Armchair
                size={15}
                strokeWidth={2.2}
                className="text-[#2c62c4]"
              />
            </span>

            <span
              className="
                flex
                min-w-0
                flex-col
                gap-[3px]
              "
            >
              <span
                className="
                  whitespace-nowrap
                  text-[13px]
                  font-[700]
                  leading-[16px]
                  text-[#151b2b]
                "
              >
                {stat.label}
              </span>

              {typeof stat.progress ===
                "number" && (
                <span
                  className="
                    block
                    h-[3.5px]
                    w-[96px]
                    overflow-hidden
                    rounded-full
                    bg-[#e5e7ec]
                  "
                >
                  <span
                    className="
                      block
                      h-full
                      rounded-full
                      bg-[#2c62c4]
                    "
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          stat.progress,
                        ),
                      )}%`,
                    }}
                  />
                </span>
              )}
            </span>

            <ChevronRight
              size={14}
              strokeWidth={2}
              className="shrink-0 text-[#777f90]"
            />
          </button>
        )}

        {/* ==========================================
            OTHER PAGE ACTION
            ========================================== */}

        {action && (
          <div
            className="
              flex
              shrink-0
              items-center
            "
          >
            {action}
          </div>
        )}

        {/* ==========================================
            NOTIFICATIONS
            ========================================== */}

        <NotificationCenter />

        {/* ==========================================
            CREATE JOB
            ONLY ON EMPLOYER JOBS PAGE
            ========================================== */}

        {isEmployerJobsPage && (
          <button
            type="button"
            onClick={handleCreateJob}
            className="
              inline-flex
              h-[36px]
              shrink-0
              items-center
              gap-[7px]
              rounded-[8px]
              bg-[#5B4FCF]
              px-[14px]
              text-[13px]
              font-[600]
              text-white
              transition-colors
              hover:bg-[#5044C0]
              active:bg-[#483cb2]
            "
          >
            Create job
          </button>
        )}
      </header>

      {/* ==========================================
          EMPLOYER BUY CREDITS MODAL
          ========================================== */}

      {isEmployer && (
        <BuyCreditsModal
          open={isBuyCreditsOpen}
          packs={creditPacks}
          selectedPackId={selectedPackId}
          onSelectPack={handleSelectPack}
          onClose={handleCloseCredits}
          onPay={handlePay}
        />
      )}
    </>
  );
}