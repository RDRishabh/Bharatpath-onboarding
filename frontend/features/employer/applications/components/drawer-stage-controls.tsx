import { APPLICATION_STAGES } from "../drawer-data";
import type { ApplicationStage } from "../types";

interface StageProgressProps {
  currentStage: number;
  currentStageLabel: string;
}

export function StageProgress({
  currentStage,
  currentStageLabel,
}: StageProgressProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {APPLICATION_STAGES.map((stage) => {
          const active = Number(stage.value) <= currentStage;

          return (
            <span
              key={stage.value}
              className="h-1 flex-1 rounded-full"
              style={{
                backgroundColor: active ? "#3566b8" : "#e7e9ee",
              }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#687384]">
          Stage {currentStage + 1} of 5
        </span>

        <span className="text-[11px] font-medium text-[#687384]">
          {currentStageLabel}
        </span>
      </div>
    </div>
  );
}

interface StageMoveControlsProps {
  currentStage: number;
  onMoveStage: (stage: ApplicationStage) => void;
}

export function StageMoveControls({
  currentStage,
  onMoveStage,
}: StageMoveControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#687384]">
        Move stage
      </span>

      <div className="flex flex-wrap gap-2">
        {APPLICATION_STAGES.map((stage) => {
          const active = Number(stage.value) === currentStage;

          return (
            <button
              key={stage.value}
              type="button"
              onClick={() => onMoveStage(stage.value)}
              className={`rounded-full px-3 py-2 text-[12px] font-semibold leading-4 transition ${
                active
                  ? "cursor-pointer border border-[#151b2b] bg-[#151b2b] text-white"
                  : "cursor-pointer border border-[#e1e5eb] bg-white text-[#4f5969] hover:bg-[#f3f4f7]"
              }`}
            >
              {stage.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
