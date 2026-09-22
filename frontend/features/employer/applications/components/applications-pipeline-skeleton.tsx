import { Skeleton } from "@/components/common/loading";

import { APPLICATION_COLUMNS } from "../data";

const SKELETON_CARDS = ["first", "second", "third"] as const;

/** Loading placeholder that mirrors the Kanban pipeline, not a data table. */
export function ApplicationsPipelineSkeleton() {
  return (
    <div className="h-full min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
      <div className="flex h-full min-w-max gap-3">
        {APPLICATION_COLUMNS.map((column) => (
          <section
            key={column.id}
            aria-label={`Loading ${column.label} applications`}
            className="flex h-full min-h-0 w-52 shrink-0 flex-col overflow-hidden rounded-[11px] border border-[#e1e5eb] bg-[#f5f7f9]"
          >
            <div className="flex items-center gap-2 px-3 py-3">
              <Skeleton width={76} height={11} radius={5} />
              <Skeleton width={18} height={18} circle />
            </div>

            <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
              {SKELETON_CARDS.map((card) => (
                <div
                  key={`${column.id}-${card}`}
                  className="flex w-full flex-col gap-2 rounded-[10px] border border-[#e1e5eb] bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <Skeleton width={26} height={26} radius={8} />
                    <Skeleton className="flex-1" height={12} radius={6} />
                    <Skeleton width={52} height={22} radius={999} />
                  </div>
                  <Skeleton width="82%" height={10} radius={5} />
                  <Skeleton width="58%" height={10} radius={5} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
