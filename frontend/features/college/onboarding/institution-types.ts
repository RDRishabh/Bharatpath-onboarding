/*
 * The institution types the backend accepts on `POST /college/organisation`
 * (`InstitutionType` in `app/modules/college/schemas.py`). Needed before the
 * account has a college, when `GET /college/onboarding` cannot be called yet.
 * Codes must match the backend; labels are ours.
 */
export const INSTITUTION_TYPES: Array<{ value: string; label: string }> = [
  { value: "UNIVERSITY", label: "University" },
  { value: "DEEMED_UNIVERSITY", label: "Deemed university" },
  { value: "AUTONOMOUS_COLLEGE", label: "Autonomous college" },
  { value: "AFFILIATED_COLLEGE", label: "Affiliated college" },
  { value: "ENGINEERING_COLLEGE", label: "Engineering college" },
  { value: "MANAGEMENT_INSTITUTE", label: "Management institute" },
  { value: "POLYTECHNIC", label: "Polytechnic" },
  { value: "ITI", label: "Industrial Training Institute" },
  { value: "TRAINING_INSTITUTE", label: "Private training institute" },
  { value: "OTHER", label: "Other" },
];
