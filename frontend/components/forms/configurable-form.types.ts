import type { ReactNode } from "react";

export type FormValues = object;

export type FormErrors<TValues> = Partial<
  Record<keyof TValues & string, string>
>;

export type FieldType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "range";

export interface FormOption {
  label: string;
  value: string;
}

export interface FormFieldConfig<TValues> {
  name: keyof TValues & string;

  label: string;

  type: FieldType;

  placeholder?: string;

  required?: boolean;

  min?: number;

  max?: number;

  step?: number;

  options?: FormOption[];

  description?: string;

  className?: string;

  colSpan?: 1 | 2;

  validate?: (
    value: unknown,
    values: TValues,
  ) => string | undefined;

  render?: (context: {
    value: unknown;
    error?: string;
    setValue: (value: unknown) => void;
  }) => ReactNode;
}

export interface ConfigurableFormProps<TValues> {
  values: TValues;

  fields: Array<FormFieldConfig<TValues>>;

  errors?: FormErrors<TValues>;

  onChange: (
    name: keyof TValues & string,
    value: unknown,
  ) => void;

  onSubmit: (values: TValues) => void;

  validate?: (
    values: TValues,
  ) => FormErrors<TValues>;

  onBlur?: (
    name: keyof TValues & string,
  ) => void;

  submitLabel?: string;

  children?: ReactNode;

  disabled?: boolean;

  className?: string;
}