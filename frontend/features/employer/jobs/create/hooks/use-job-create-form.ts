"use client";

import { useState } from "react";

import type { CreateJobFormValues } from "../types";
import { validateJob, type JobValidationErrors } from "../schemas/job.schema";

export const INITIAL_JOB_FORM: CreateJobFormValues = {
  title: "",
  employmentType: "Full time",
  location: "",
  description: "",
  skills: [],
  salaryMin: "",
  salaryMax: "",
  minScore: 750,
};

export function useJobCreateForm(
  initialValues: CreateJobFormValues = INITIAL_JOB_FORM,
) {
  const [values, setValues] = useState<CreateJobFormValues>(initialValues);
  const [errors, setErrors] = useState<JobValidationErrors>({});

  const setValue = <K extends keyof CreateJobFormValues>(
    name: K,
    value: CreateJobFormValues[K],
  ) => {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const nextErrors = validateJob(values);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return {
    values,
    errors,
    setValue,
    setErrors,
    validate,
  };
}
