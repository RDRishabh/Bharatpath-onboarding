"use client";

import { useState } from "react";
import {
  ListFilter,
  Pencil,
  Plus,
  Upload,
} from "lucide-react";

import { ErrorState } from "@/components/ui";
import { usePageHeader } from "@/components/layout/header-context";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-value";
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
  sortOrder: "0",
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
  const [cursorHistory, setCursorHistory] = useState([""]);
  // Back to page one when the settled search changes, not on each keystroke:
  // resetting the cursor early would refetch the old search's first page.
  const [pagedSearch, setPagedSearch] = useState(debouncedSearch);
  if (pagedSearch !== debouncedSearch) {
    setPagedSearch(debouncedSearch);
    setCursorHistory([""]);
  }
  const [editor, setEditor] = useState<{
    optionId: string | null;
    form: FilterFormState;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<unknown>(null);
  const cursor = cursorHistory.at(-1) || undefined;

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetAdminSearchFiltersQuery({
    kind,
    q: debouncedSearch || undefined,
    includeInactive,
    cursor,
    limit: 50,
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

  function resetPage() {
    setCursorHistory([""]);
  }

  function chooseKind(nextKind: SearchFilterKind) {
    setKind(nextKind);
    setEditor(null);
    setImportOpen(false);
    setFormError(null);
    setRequestError(null);
    resetPage();
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

  async function toggleActive(option: SearchFilterOption) {
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
    } catch (mutationError) {
      setRequestError(mutationError);
    }
  }

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
              setImportOpen((current) => !current);
              setEditor(null);
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
            placeholder={`Search ${kind === "SKILL" ? "skills" : "cities"} or aliases`}
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[#8a92a0]"
          />
        </label>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-[#e2e5eb] bg-white px-3 text-[12px] font-semibold text-[#566176]">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => {
              setIncludeInactive(event.target.checked);
              resetPage();
            }}
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
      {requestError ? (
        <ErrorState
          error={requestError}
          fallback="The search filter change could not be saved."
        />
      ) : null}
      {formError ? <ErrorState message={formError} /> : null}

      {editor ? (
        <FilterEditor
          kind={kind}
          form={editor.form}
          isEditing={Boolean(editor.optionId)}
          isSaving={isSaving}
          onChange={(form) =>
            setEditor((current) =>
              current ? { ...current, form } : current,
            )
          }
          onCancel={() => {
            setEditor(null);
            setFormError(null);
            setRequestError(null);
          }}
          onSave={() => void saveEditor()}
        />
      ) : null}

      {importOpen ? (
        <section className="rounded-xl border border-[#dfe4ec] bg-white p-4">
          <h2 className="text-[14px] font-semibold text-[#172033]">
            Bulk import {kind === "SKILL" ? "skills" : "cities"}
          </h2>
          <p className="mt-1 text-[12px] text-[#687182]">
            {kind === "SKILL"
              ? "One per line: Label | alias one, alias two"
              : "One per line: Label | state code | alias one, alias two"}
          </p>
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
              onClick={() => {
                setImportOpen(false);
                setFormError(null);
                setRequestError(null);
              }}
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
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#e2e5eb] bg-white">
        <div className="flex items-center justify-between border-b border-[#e9ebef] px-4 py-3">
          <div>
            <h2 className="text-[14px] font-semibold text-[#172033]">
              {kind === "SKILL" ? "Skill options" : "City options"}
            </h2>
            <p className="text-[11px] text-[#7b8494]">
              Catalogue {data?.catalogue_version ?? "loading"}
            </p>
          </div>
          {isFetching && !isLoading ? (
            <span className="text-[11px] text-[#7b8494]">Refreshing...</span>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-184 text-left">
            <thead className="bg-[#f8f9fb] text-[11px] uppercase tracking-wide text-[#687182]">
              <tr>
                <th className="px-4 py-3 font-semibold">Label</th>
                <th className="px-4 py-3 font-semibold">Aliases</th>
                {kind === "CITY" ? (
                  <th className="px-4 py-3 font-semibold">State</th>
                ) : null}
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Featured</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef0f3]">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={kind === "CITY" ? 7 : 6}
                    className="px-4 py-10 text-center text-[12px] text-[#7b8494]"
                  >
                    Loading search filters...
                  </td>
                </tr>
              ) : null}
              {!isLoading && data?.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={kind === "CITY" ? 7 : 6}
                    className="px-4 py-10 text-center text-[12px] text-[#7b8494]"
                  >
                    No search filters match this view.
                  </td>
                </tr>
              ) : null}
              {!isLoading &&
                data?.items.map((option) => (
                  <tr key={option.id} className="text-[12px] text-[#273142]">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{option.label}</p>
                      <p className="mt-0.5 text-[10px] text-[#8a92a0]">
                        {option.key}
                      </p>
                    </td>
                    <td className="max-w-80 px-4 py-3 text-[#687182]">
                      {option.aliases.length
                        ? option.aliases.join(", ")
                        : "—"}
                    </td>
                    {kind === "CITY" ? (
                      <td className="px-4 py-3">{option.state_code}</td>
                    ) : null}
                    <td className="px-4 py-3">{option.sort_order}</td>
                    <td className="px-4 py-3">
                      {option.featured ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3">
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
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditor({
                              optionId: option.id,
                              form: formFor(option),
                            });
                            setImportOpen(false);
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
                          disabled={updateState.isLoading}
                          onClick={() => void toggleActive(option)}
                          className="rounded-lg border border-[#d9dee7] px-2 py-1.5 font-semibold text-[#43516a] hover:bg-[#f7f8fa] disabled:opacity-50"
                        >
                          {option.active ? "Switch off" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#e9ebef] px-4 py-3 text-[12px] text-[#687182]">
          <span>Page {cursorHistory.length}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={cursorHistory.length === 1 || isFetching}
              onClick={() =>
                setCursorHistory((current) => current.slice(0, -1))
              }
              className="rounded-lg border border-[#d9dee7] px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!data?.next_cursor || isFetching}
              onClick={() => {
                if (data?.next_cursor) {
                  setCursorHistory((current) => [
                    ...current,
                    data.next_cursor ?? "",
                  ]);
                }
              }}
              className="rounded-lg border border-[#d9dee7] px-3 py-1.5 font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FilterEditor({
  kind,
  form,
  isEditing,
  isSaving,
  onChange,
  onCancel,
  onSave,
}: {
  kind: SearchFilterKind;
  form: FilterFormState;
  isEditing: boolean;
  isSaving: boolean;
  onChange: (form: FilterFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-xl border border-[#dfe4ec] bg-white p-4">
      <h2 className="text-[14px] font-semibold text-[#172033]">
        {isEditing ? "Edit" : "Add"} {kind === "SKILL" ? "skill" : "city"}
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Label">
          <input
            value={form.label}
            maxLength={100}
            onChange={(event) =>
              onChange({ ...form, label: event.target.value })
            }
            className="h-9 w-full rounded-lg border border-[#dfe4ec] px-3 text-[12px] outline-none focus:border-[#315c9f]"
          />
        </Field>
        {kind === "CITY" ? (
          <Field label="State code">
            <input
              value={form.stateCode}
              maxLength={2}
              onChange={(event) =>
                onChange({
                  ...form,
                  stateCode: event.target.value.toUpperCase(),
                })
              }
              className="h-9 w-full rounded-lg border border-[#dfe4ec] px-3 text-[12px] uppercase outline-none focus:border-[#315c9f]"
            />
          </Field>
        ) : null}
        <Field label="Aliases (comma separated)">
          <input
            value={form.aliases}
            onChange={(event) =>
              onChange({ ...form, aliases: event.target.value })
            }
            className="h-9 w-full rounded-lg border border-[#dfe4ec] px-3 text-[12px] outline-none focus:border-[#315c9f]"
          />
        </Field>
        <Field label="Sort order">
          <input
            type="number"
            min={0}
            max={10_000}
            value={form.sortOrder}
            onChange={(event) =>
              onChange({ ...form, sortOrder: event.target.value })
            }
            className="h-9 w-full rounded-lg border border-[#dfe4ec] px-3 text-[12px] outline-none focus:border-[#315c9f]"
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
    </section>
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
