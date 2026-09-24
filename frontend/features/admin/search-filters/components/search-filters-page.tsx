"use client";

import { useState } from "react";
import {
  ListFilter,
  Pencil,
  Plus,
  Upload,
} from "lucide-react";

import {
  ConfirmModal,
  DataTable,
  ErrorState,
  Modal,
  type ColumnDef,
} from "@/components/ui";
import { usePageHeader } from "@/components/layout/header-context";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-value";
import { useCursorPagination } from "@/lib/pagination/use-cursor-pagination";
import {
  useCreateAdminSearchFilterMutation,
  useGetAdminSearchFiltersQuery,
  useImportAdminSearchFiltersMutation,
  useUpdateAdminSearchFilterMutation,
  type CreateSearchFilterOption,
  type SearchFilterKind,
  type SearchFilterOption,
} from "@/store/api/admin-api";
import { showAdminFeedback } from "@/store/admin";
import { useAppDispatch } from "@/store/hooks";

interface FilterFormState {
  label: string;
  aliases: string;
  stateCode: string;
  featured: boolean;
  sortOrder: string;
}

const EMPTY_FORM: FilterFormState = {
  label: "",
  aliases: "",
  stateCode: "",
  featured: false,
  sortOrder: "",
};

function formFor(option: SearchFilterOption): FilterFormState {
  return {
    label: option.label,
    aliases: option.aliases.join(", "),
    stateCode: option.state_code ?? "",
    featured: option.featured,
    sortOrder: String(option.sort_order),
  };
}

function formPayload(
  kind: SearchFilterKind,
  form: FilterFormState,
): { value?: CreateSearchFilterOption; error?: string } {
  const label = form.label.trim();
  const aliases = Array.from(
    new Set(
      form.aliases
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean),
    ),
  );
  const sortOrder = Number(form.sortOrder);
  const stateCode = form.stateCode.trim().toUpperCase();

  if (!label) {
    return { error: "Enter a label." };
  }
  if (aliases.length > 10) {
    return { error: "An option can have at most 10 aliases." };
  }
  if (
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 10_000
  ) {
    return { error: "Sort order must be a whole number from 0 to 10,000." };
  }
  if (kind === "CITY" && !/^[A-Z]{2}$/.test(stateCode)) {
    return { error: "A city needs a two-letter state code." };
  }

  return {
    value: {
      kind,
      label,
      aliases,
      state_code: kind === "CITY" ? stateCode : null,
      featured: form.featured,
      sort_order: sortOrder,
    },
  };
}

function importPayload(
  kind: SearchFilterKind,
  source: string,
): { value?: CreateSearchFilterOption[]; error?: string } {
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { error: "Enter at least one option." };
  }
  if (lines.length > 500) {
    return { error: "One import can contain at most 500 options." };
  }

  const items: CreateSearchFilterOption[] = [];
  for (const [index, line] of lines.entries()) {
    const parts = line.split("|").map((part) => part.trim());
    const label = parts[0];
    const stateCode = kind === "CITY" ? parts[1]?.toUpperCase() : undefined;
    const aliasesSource = kind === "CITY" ? parts[2] : parts[1];
    const aliases = (aliasesSource ?? "")
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean);

    if (!label) {
      return { error: `Line ${index + 1} needs a label.` };
    }
    if (aliases.length > 10) {
      return { error: `Line ${index + 1} has more than 10 aliases.` };
    }
    if (kind === "CITY" && !/^[A-Z]{2}$/.test(stateCode ?? "")) {
      return {
        error: `Line ${index + 1} needs a two-letter state code.`,
      };
    }

    items.push({
      kind,
      label,
      aliases,
      state_code: kind === "CITY" ? stateCode : null,
      featured: false,
      sort_order: 0,
    });
  }

  return { value: items };
}

export function SearchFiltersPage() {
  usePageHeader(
    "Search filters",
    "Curate the skills and cities employers can select when searching",
  );

  const dispatch = useAppDispatch();
  const [kind, setKind] = useState<SearchFilterKind>("SKILL");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedSearch(search);
  const [includeInactive, setIncludeInactive] = useState(false);
  const pagination = useCursorPagination(
    [kind, debouncedSearch, includeInactive],
    10,
  );
  const [editor, setEditor] = useState<{
    optionId: string | null;
    form: FilterFormState;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingToggle, setPendingToggle] =
    useState<SearchFilterOption | null>(null);
  const [importText, setImportText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<unknown>(null);

  const {
    currentData,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetAdminSearchFiltersQuery({
    kind,
    q: debouncedSearch || undefined,
    includeInactive,
    cursor: pagination.cursor,
    limit: pagination.pageSize,
  });
  const [createOption, createState] =
    useCreateAdminSearchFilterMutation();
  const [importOptions, importState] =
    useImportAdminSearchFiltersMutation();
  const [updateOption, updateState] =
    useUpdateAdminSearchFilterMutation();
  const isSaving =
    createState.isLoading ||
    importState.isLoading ||
    updateState.isLoading;

  function chooseKind(nextKind: SearchFilterKind) {
    setKind(nextKind);
    if (nextKind !== kind) {
      setSearch("");
    }
    setEditor(null);
    setImportOpen(false);
    setPendingToggle(null);
    setFormError(null);
    setRequestError(null);
  }

  async function saveEditor() {
    if (!editor) {
      return;
    }

    const parsed = formPayload(kind, editor.form);
    if (!parsed.value) {
      setFormError(parsed.error ?? "Check the form values.");
      return;
    }

    setFormError(null);
    setRequestError(null);
    try {
      if (editor.optionId) {
        await updateOption({
          optionId: editor.optionId,
          changes: {
            label: parsed.value.label,
            aliases: parsed.value.aliases,
            state_code: parsed.value.state_code,
            featured: parsed.value.featured,
            sort_order: parsed.value.sort_order,
          },
        }).unwrap();
        dispatch(showAdminFeedback("Search filter updated."));
      } else {
        await createOption(parsed.value).unwrap();
        dispatch(showAdminFeedback("Search filter created."));
      }
      setEditor(null);
    } catch (mutationError) {
      setRequestError(mutationError);
    }
  }

  async function saveImport() {
    const parsed = importPayload(kind, importText);
    if (!parsed.value) {
      setFormError(parsed.error ?? "Check the import values.");
      return;
    }

    setFormError(null);
    setRequestError(null);
    try {
      const result = await importOptions(parsed.value).unwrap();
      dispatch(
        showAdminFeedback(
          `${result.items.length} search filter${result.items.length === 1 ? "" : "s"} imported.`,
        ),
      );
      setImportOpen(false);
      setImportText("");
    } catch (mutationError) {
      setRequestError(mutationError);
    }
  }

  async function confirmToggleActive() {
    if (!pendingToggle) {
      return;
    }

    const option = pendingToggle;
    setRequestError(null);
    try {
      await updateOption({
        optionId: option.id,
        changes: { active: !option.active },
      }).unwrap();
      dispatch(
        showAdminFeedback(
          option.active
            ? "Search filter switched off."
            : "Search filter reactivated.",
        ),
      );
      setPendingToggle(null);
    } catch (mutationError) {
      setRequestError(mutationError);
    }
  }

  function closeActionDialog() {
    if (isSaving) {
      return;
    }
    setEditor(null);
    setImportOpen(false);
    setPendingToggle(null);
    setFormError(null);
    setRequestError(null);
  }

  const columns: ColumnDef<SearchFilterOption>[] = [
    {
      id: "label",
      header: "Label",
      headerClassName: "min-w-[220px]",
      cellClassName: "min-w-[220px]",
      cell: (option) => (
        <div>
          <p className="font-semibold">{option.label}</p>
          <p className="mt-0.5 text-[10px] text-[#8a92a0]">{option.key}</p>
        </div>
      ),
    },
    {
      id: "aliases",
      header: "Aliases",
      headerClassName: "min-w-[280px]",
      cellClassName: "min-w-[280px] max-w-[360px] text-[#687182]",
      cell: (option) =>
        option.aliases.length ? option.aliases.join(", ") : "—",
    },
    ...(kind === "CITY"
      ? [
          {
            id: "state",
            header: "State",
            headerClassName: "min-w-[90px]",
            cellClassName: "min-w-[90px]",
            cell: (option: SearchFilterOption) => option.state_code ?? "—",
          },
        ]
      : []),
    {
      id: "featured",
      header: "Featured",
      headerClassName: "min-w-[100px]",
      cellClassName: "min-w-[100px]",
      cell: (option) => (option.featured ? "Yes" : "No"),
    },
    {
      id: "status",
      header: "Status",
      headerClassName: "min-w-[110px]",
      cellClassName: "min-w-[110px]",
      cell: (option) => (
        <span
          className={[
            "rounded-full px-2 py-1 text-[10px] font-semibold",
            option.active
              ? "bg-[#e8f5ed] text-[#267044]"
              : "bg-[#f0f1f4] text-[#687182]",
          ].join(" ")}
        >
          {option.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      headerClassName: "min-w-[190px] text-right",
      cellClassName: "min-w-[190px]",
      cell: (option) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setEditor({
                optionId: option.id,
                form: formFor(option),
              });
              setImportOpen(false);
              setPendingToggle(null);
              setFormError(null);
              setRequestError(null);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[#d9dee7] px-2 py-1.5 font-semibold text-[#43516a] hover:bg-[#f7f8fa]"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setPendingToggle(option);
              setEditor(null);
              setImportOpen(false);
              setFormError(null);
              setRequestError(null);
            }}
            className="rounded-lg border border-[#d9dee7] px-2 py-1.5 font-semibold text-[#43516a] hover:bg-[#f7f8fa] disabled:opacity-50"
          >
            {option.active ? "Switch off" : "Reactivate"}
          </button>
        </div>
      ),
    },
  ];
  const paginationProps = {
    currentPage: pagination.currentPage,
    hasNextPage: Boolean(currentData?.next_cursor),
    onNextPage: () => pagination.goToNextPage(currentData?.next_cursor),
    onPreviousPage: pagination.goToPreviousPage,
    onPageSizeChange: pagination.setPageSize,
  };
  const tableLoading = isLoading || (isFetching && !currentData);
  const searchPlaceholder =
    kind === "SKILL"
      ? "Search by skill name or alias"
      : "Search by city name or alias";

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e9ee]">
        <div className="flex items-center gap-1">
          {(["SKILL", "CITY"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => chooseKind(value)}
              className={[
                "relative px-4 py-3 text-[13px] font-semibold",
                kind === value
                  ? "text-[#172033]"
                  : "text-[#687182] hover:text-[#172033]",
              ].join(" ")}
            >
              {value === "SKILL" ? "Skills" : "Cities"}
              {kind === value ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#315c9f]" />
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pb-2">
          <button
            type="button"
            onClick={() => {
              setImportOpen(true);
              setEditor(null);
              setPendingToggle(null);
              setFormError(null);
              setRequestError(null);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d9dee7] bg-white px-3 text-[12px] font-semibold text-[#43516a] hover:bg-[#f7f8fa]"
          >
            <Upload className="h-4 w-4" />
            Bulk import
          </button>
          <button
            type="button"
            onClick={() => {
              setEditor({ optionId: null, form: EMPTY_FORM });
              setImportOpen(false);
              setPendingToggle(null);
              setFormError(null);
              setRequestError(null);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#315c9f] px-3 text-[12px] font-semibold text-white hover:bg-[#284f89]"
          >
            <Plus className="h-4 w-4" />
            Add {kind === "SKILL" ? "skill" : "city"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-9 min-w-64 flex-1 items-center gap-2 rounded-lg border border-[#e2e5eb] bg-white px-3 focus-within:border-[#315c9f]">
          <ListFilter className="h-4 w-4 text-[#687182]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-[#172033] outline-none placeholder:text-[#8a92a0]"
          />
        </label>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-[#e2e5eb] bg-white px-3 text-[12px] font-semibold text-[#566176]">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => setIncludeInactive(event.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {error ? (
        <ErrorState
          error={error}
          fallback="Search filters could not be loaded."
          onRetry={() => void refetch()}
        />
      ) : null}

      {editor ? (
        <Modal
          open
          title={`${editor.optionId ? "Edit" : "Add"} ${
            kind === "SKILL" ? "skill" : "city"
          }`}
          description="Changes are applied to the options employers can choose in candidate search."
          onClose={closeActionDialog}
          closeDisabled={isSaving}
          panelClassName="max-w-[640px]"
        >
          {requestError ? (
            <ErrorState
              error={requestError}
              fallback="The search filter change could not be saved."
              className="mb-4"
            />
          ) : null}
          {formError ? <ErrorState message={formError} className="mb-4" /> : null}
          <FilterEditor
            kind={kind}
            form={editor.form}
            isSaving={isSaving}
            onChange={(form) =>
              setEditor((current) =>
                current ? { ...current, form } : current,
              )
            }
            onCancel={closeActionDialog}
            onSave={() => void saveEditor()}
          />
        </Modal>
      ) : null}

      {importOpen ? (
        <Modal
          open
          title={`Bulk import ${kind === "SKILL" ? "skills" : "cities"}`}
          description={
            kind === "SKILL"
              ? "One per line: Label | alias one, alias two"
              : "One per line: Label | state code | alias one, alias two"
          }
          onClose={closeActionDialog}
          closeDisabled={isSaving}
          panelClassName="max-w-[640px]"
        >
          {requestError ? (
            <ErrorState
              error={requestError}
              fallback="The search filters could not be imported."
              className="mb-4"
            />
          ) : null}
          {formError ? <ErrorState message={formError} className="mb-4" /> : null}
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={7}
            placeholder={
              kind === "SKILL"
                ? "Microsoft Excel | Excel, MS Excel"
                : "Bengaluru | KA | Bangalore"
            }
            className="mt-3 w-full rounded-lg border border-[#dfe4ec] p-3 font-mono text-[12px] outline-none focus:border-[#315c9f]"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeActionDialog}
              disabled={isSaving}
              className="rounded-lg border border-[#d9dee7] px-3 py-2 text-[12px] font-semibold text-[#566176]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void saveImport()}
              className="rounded-lg bg-[#315c9f] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {isSaving ? "Importing..." : "Import"}
            </button>
          </div>
        </Modal>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#e2e5eb] bg-white">
        <div className="flex items-center justify-between border-b border-[#e9ebef] px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[#172033]">
              {kind === "SKILL" ? "Skill options" : "City options"}
            </h2>
          </div>
          {isFetching && !isLoading ? (
            <span className="text-[11px] text-[#7b8494]">Refreshing...</span>
          ) : null}
        </div>

        <DataTable<SearchFilterOption>
          data={currentData?.items ?? []}
          columns={columns}
          keyExtractor={(option) => option.id}
          isLoading={tableLoading}
          skeletonRows={10}
          emptyTitle="No search filters match this view."
          emptySubtitle=""
          paginationMode="cursor"
          pageSize={pagination.pageSize}
          itemLabel="options"
          className="rounded-none border-0 shadow-none"
          {...paginationProps}
        />
      </section>

      <ConfirmModal
        open={pendingToggle !== null}
        title={
          pendingToggle?.active
            ? "Switch off search filter?"
            : "Reactivate search filter?"
        }
        description={
          pendingToggle
            ? pendingToggle.active
              ? `"${pendingToggle.label}" will stop appearing in employer filter suggestions.`
              : `"${pendingToggle.label}" will be available in employer filter suggestions again.`
            : ""
        }
        confirmLabel={pendingToggle?.active ? "Switch off" : "Reactivate"}
        cancelLabel="Cancel"
        confirmLoading={updateState.isLoading}
        onConfirm={() => void confirmToggleActive()}
        onClose={closeActionDialog}
      >
        {requestError ? (
          <ErrorState
            error={requestError}
            fallback="The search filter status could not be changed."
          />
        ) : null}
      </ConfirmModal>
    </div>
  );
}

function FilterEditor({
  kind,
  form,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: {
  kind: SearchFilterKind;
  form: FilterFormState;
  isSaving: boolean;
  onChange: (form: FilterFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Label">
          <input
            value={form.label}
            maxLength={100}
            placeholder={
              kind === "SKILL" ? "e.g. Data Analysis" : "e.g. Bengaluru"
            }
            onChange={(event) =>
              onChange({ ...form, label: event.target.value })
            }
            className="h-9 w-full rounded-lg border border-[#dfe4ec] px-3 text-[12px] outline-none placeholder:text-[#a0a7b4] focus:border-[#315c9f]"
          />
        </Field>
        {kind === "CITY" ? (
          <Field label="State code">
            <input
              value={form.stateCode}
              maxLength={2}
              placeholder="e.g. KA"
              onChange={(event) =>
                onChange({
                  ...form,
                  stateCode: event.target.value.toUpperCase(),
                })
              }
              className="h-9 w-full rounded-lg border border-[#dfe4ec] px-3 text-[12px] uppercase outline-none placeholder:text-[#a0a7b4] focus:border-[#315c9f]"
            />
          </Field>
        ) : null}
        <Field label="Aliases (comma separated)">
          <input
            value={form.aliases}
            placeholder={
              kind === "SKILL"
                ? "e.g. Excel, MS Excel"
                : "e.g. Bangalore, Bengaluru Urban"
            }
            onChange={(event) =>
              onChange({ ...form, aliases: event.target.value })
            }
            className="h-9 w-full rounded-lg border border-[#dfe4ec] px-3 text-[12px] outline-none placeholder:text-[#a0a7b4] focus:border-[#315c9f]"
          />
        </Field>
        <Field label="Sort order">
          <input
            type="number"
            min={0}
            max={10_000}
            value={form.sortOrder}
            placeholder="e.g. 0"
            onChange={(event) =>
              onChange({ ...form, sortOrder: event.target.value })
            }
            className="h-9 w-full rounded-lg border border-[#dfe4ec] px-3 text-[12px] outline-none placeholder:text-[#a0a7b4] focus:border-[#315c9f]"
          />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#566176]">
        <input
          type="checkbox"
          checked={form.featured}
          onChange={(event) =>
            onChange({ ...form, featured: event.target.checked })
          }
        />
        Show in the employer panel before typing
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#d9dee7] px-3 py-2 text-[12px] font-semibold text-[#566176]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={onSave}
          className="rounded-lg bg-[#315c9f] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#687182]">
      {label}
      {children}
    </label>
  );
}
