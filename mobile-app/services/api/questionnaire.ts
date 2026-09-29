import { ApiError, apiRequest } from './client';

export type QuestionType = 'SINGLE' | 'MULTI' | 'NUMBER' | 'BOOLEAN' | 'TEXT';
export type QuestionnaireAnswer = string | string[] | number | boolean | null;

export interface QuestionnaireOption {
  code: string;
  label: string;
}

export interface QuestionnaireQuestion {
  code: string;
  key: string;
  prompt: string;
  type: QuestionType;
  options: QuestionnaireOption[];
  required: boolean;
  help_text: string | null;
}

export interface QuestionnaireSection {
  code: string;
  questions: QuestionnaireQuestion[];
}

export interface QuestionnaireView {
  bank_version: string;
  sections: QuestionnaireSection[];
  answers: Record<string, QuestionnaireAnswer>;
  submitted: boolean;
  submitted_at: string | null;
  updated_at: string | null;
}

export interface QuestionnaireReportItem {
  code: string;
  prompt: string;
  answered: boolean;
  display: string[];
}

export interface QuestionnaireReportSection {
  code: string;
  answered: number;
  total: number;
  items: QuestionnaireReportItem[];
}

export interface QuestionnaireReport {
  bank_version: string;
  submitted_at: string;
  sections: QuestionnaireReportSection[];
}

export async function getQuestionnaire(): Promise<QuestionnaireView> {
  return apiRequest<QuestionnaireView>('/candidate/questionnaire');
}

/** The backend merges these keys; omitted answers stay unchanged. */
export async function saveQuestionnaireAnswers(
  answers: Record<string, QuestionnaireAnswer>
): Promise<QuestionnaireView> {
  return apiRequest<QuestionnaireView>('/candidate/questionnaire/answers', {
    method: 'PUT',
    body: { answers },
  });
}

export async function submitQuestionnaire(): Promise<QuestionnaireView> {
  return apiRequest<QuestionnaireView>('/candidate/questionnaire/submit', {
    method: 'POST',
  });
}

export async function getQuestionnaireReport(): Promise<QuestionnaireReport> {
  return apiRequest<QuestionnaireReport>('/candidate/questionnaire/report');
}

const SECTION_LABELS: Record<string, string> = {
  availability: 'Availability',
  location: 'Location preferences',
  languages: 'Languages',
  work_context: 'Work context',
};

export function questionnaireSectionLabel(code: string): string {
  return SECTION_LABELS[code] || code.replace(/_/g, ' ');
}

export function questionnaireErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 402 || error.code === 'subscription_required') {
      return 'An active membership is required to use the questionnaire.';
    }
    if (error.code === 'questionnaire_not_submitted') {
      return 'Submit your answers before opening the report.';
    }
    if (error.code === 'questionnaire_answers_invalid') {
      const issues = error.problem.params?.issues;
      if (Array.isArray(issues) && issues.length > 0) {
        return `Some answers could not be saved: ${issues
          .map((issue: { question?: string }) => issue.question)
          .filter(Boolean)
          .join(', ')}.`;
      }
    }
    return error.problem.title || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
