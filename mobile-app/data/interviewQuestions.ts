/**
 * BharatPath — AI Mock Interview Questions & Evaluation Engine
 * Lab & QC Track Questions, Answering Tips, and Evaluation Metrics.
 */

export interface InterviewQuestion {
  id: number;
  prompt: string;
  shortTitle: string;
  tips: string[];
  suggestedDuration: string; // e.g. "60–90 seconds"
  sampleScore: number;
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 1,
    shortTitle: 'Introduce yourself',
    prompt: "Tell me about yourself and why you're interested in working in quality control.",
    tips: ['1 · Your background', '2 · Relevant skills', '3 · Why this role'],
    suggestedDuration: '60–90 seconds',
    sampleScore: 8,
  },
  {
    id: 2,
    shortTitle: 'A wrong test result',
    prompt: 'Tell me about a time a test result looked wrong. What did you do next?',
    tips: ['1 · What you noticed', '2 · What you checked', '3 · How it ended'],
    suggestedDuration: '60–90 seconds',
    sampleScore: 5,
  },
  {
    id: 3,
    shortTitle: 'Repetitive work',
    prompt: 'QC work involves running the same assays repeatedly. How do you keep your concentration?',
    tips: ['1 · Your approach', '2 · Preventing fatigue', '3 · Spotting drift'],
    suggestedDuration: '60–90 seconds',
    sampleScore: 7,
  },
  {
    id: 4,
    shortTitle: 'Deadline vs calibration',
    prompt: 'A batch deadline is in 2 hours and an instrument calibration is overdue. What do you do?',
    tips: ['1 · Safety vs speed', '2 · Who you inform', '3 · Documentation'],
    suggestedDuration: '60–90 seconds',
    sampleScore: 7,
  },
  {
    id: 5,
    shortTitle: 'Explaining results',
    prompt: 'Describe a situation where you had to explain a technical result to a non-technical coworker.',
    tips: ['1 · The finding', '2 · How you simplified it', '3 · The outcome'],
    suggestedDuration: '60–90 seconds',
    sampleScore: 6,
  },
  {
    id: 6,
    shortTitle: 'Two-year growth',
    prompt: 'Where do you see yourself developing in lab operations over the next two years?',
    tips: ['1 · Core competencies', '2 · Next certifications', '3 · Team value'],
    suggestedDuration: '60–90 seconds',
    sampleScore: 7,
  },
];

export interface InterviewReportData {
  overallScore: number;
  overallVerdict: string;
  summary: string;
  date: string;
  dimensions: {
    communication: { score: number; max: number; percentage: number };
    structure: { score: number; max: number; percentage: number };
    roleKnowledge: { score: number; max: number; percentage: number };
    confidence: { score: number; max: number; percentage: number };
  };
  oneThingToChange: string;
  questionScores: {
    id: number;
    shortTitle: string;
    score: number;
  }[];
}

export const DEFAULT_INTERVIEW_REPORT: InterviewReportData = {
  overallScore: 6.4,
  overallVerdict: 'Clear and calm',
  summary: 'Lab & QC track · 6 answers. Strong delivery, thin on specifics.',
  date: '12 AUG 2026',
  dimensions: {
    communication: { score: 7, max: 10, percentage: 70 },
    structure: { score: 6, max: 10, percentage: 60 },
    roleKnowledge: { score: 5, max: 10, percentage: 50 },
    confidence: { score: 7, max: 10, percentage: 70 },
  },
  oneThingToChange:
    'In question 2 you spent 40 seconds on the problem and 8 on the fix. Flip that around — employers hire for what you did.',
  questionScores: [
    { id: 1, shortTitle: 'Introduce yourself', score: 8 },
    { id: 2, shortTitle: 'A wrong test result', score: 5 },
    { id: 3, shortTitle: 'Repetitive work', score: 7 },
    { id: 4, shortTitle: 'Deadline vs calibration', score: 7 },
    { id: 5, shortTitle: 'Explaining results', score: 6 },
    { id: 6, shortTitle: 'Two-year growth', score: 7 },
  ],
};
