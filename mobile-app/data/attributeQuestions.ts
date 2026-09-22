/**
 * BharatPath — Attribute Evaluation Questions & Psychometric Scoring Engine
 * Production data layer for 24-question work-style assessment.
 */

import questionsData from './attributeQuestions.json';

export type DimensionKey = 'consistency' | 'detail' | 'people' | 'ambiguity';

export interface AttributeQuestion {
  id: number;
  category: string;
  dimension: DimensionKey;
  prompt: string;
}

export interface LikertOption {
  id: string;
  label: string;
  score: number; // 1 to 5
}

export const LIKERT_OPTIONS: LikertOption[] = [
  { id: 'strongly_disagree', label: 'Strongly disagree', score: 1 },
  { id: 'disagree', label: 'Disagree', score: 2 },
  { id: 'neither', label: 'Neither', score: 3 },
  { id: 'agree', label: 'Agree', score: 4 },
  { id: 'strongly_agree', label: 'Strongly agree', score: 5 },
];

export const ATTRIBUTE_QUESTIONS: AttributeQuestion[] = questionsData as AttributeQuestion[];

export interface DimensionResult {
  score: number;
  maxScore: number;
  percentage: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AttributeResult {
  typeTitle: string;
  description: string;
  date: string;
  dimensions: {
    consistency: DimensionResult;
    detail: DimensionResult;
    people: DimensionResult;
    ambiguity: DimensionResult;
  };
  recommendedRoles: string[];
}

function getLevel(percentage: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (percentage >= 70) return 'HIGH';
  if (percentage >= 45) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculates candidate's attribute report scores and archetype from their answers.
 * @param answers Map of question ID (1..24) to Likert score (1..5)
 */
export function calculateAttributeScores(
  answers: Record<number, number>
): AttributeResult {
  const totals: Record<DimensionKey, { sum: number; count: number }> = {
    consistency: { sum: 0, count: 0 },
    detail: { sum: 0, count: 0 },
    people: { sum: 0, count: 0 },
    ambiguity: { sum: 0, count: 0 },
  };

  ATTRIBUTE_QUESTIONS.forEach((q) => {
    const score = answers[q.id] ?? 4; // Default to 'Agree' (4) if untouched
    totals[q.dimension].sum += score;
    totals[q.dimension].count += 1;
  });

  const dimensions: Record<DimensionKey, DimensionResult> = {
    consistency: {
      score: totals.consistency.sum,
      maxScore: totals.consistency.count * 5,
      percentage: Math.round(
        ((totals.consistency.sum - totals.consistency.count) /
          (totals.consistency.count * 4)) *
          100
      ),
      level: 'HIGH',
    },
    detail: {
      score: totals.detail.sum,
      maxScore: totals.detail.count * 5,
      percentage: Math.round(
        ((totals.detail.sum - totals.detail.count) /
          (totals.detail.count * 4)) *
          100
      ),
      level: 'HIGH',
    },
    people: {
      score: totals.people.sum,
      maxScore: totals.people.count * 5,
      percentage: Math.round(
        ((totals.people.sum - totals.people.count) /
          (totals.people.count * 4)) *
          100
      ),
      level: 'MEDIUM',
    },
    ambiguity: {
      score: totals.ambiguity.sum,
      maxScore: totals.ambiguity.count * 5,
      percentage: Math.round(
        ((totals.ambiguity.sum - totals.ambiguity.count) /
          (totals.ambiguity.count * 4)) *
          100
      ),
      level: 'LOW',
    },
  };

  dimensions.consistency.level = getLevel(dimensions.consistency.percentage);
  dimensions.detail.level = getLevel(dimensions.detail.percentage);
  dimensions.people.level = getLevel(dimensions.people.percentage);
  dimensions.ambiguity.level = getLevel(dimensions.ambiguity.percentage);

  // Archetype resolution
  let typeTitle = 'Steady builder';
  let description =
    'You plan first, work in order, and prefer clear instructions over improvising on the spot.';
  let recommendedRoles = [
    'Quality control',
    'Lab analysis',
    'Documentation',
    'Inventory',
  ];

  if (dimensions.ambiguity.level === 'HIGH' && dimensions.people.level === 'HIGH') {
    typeTitle = 'Dynamic Collaborator';
    description =
      'You thrive in fast-paced team environments, adapt swiftly to changing goals, and motivate peers.';
    recommendedRoles = ['Field Operations', 'Customer Success', 'Project Coordination', 'Growth Associate'];
  } else if (dimensions.detail.level === 'HIGH' && dimensions.consistency.level === 'HIGH') {
    typeTitle = 'Steady builder';
    description =
      'You plan first, work in order, and prefer clear instructions over improvising on the spot.';
    recommendedRoles = ['Quality control', 'Lab analysis', 'Documentation', 'Inventory'];
  } else if (dimensions.ambiguity.level === 'HIGH') {
    typeTitle = 'Agile Problem Solver';
    description =
      'You are comfortable with open-ended tasks and enjoy discovering efficient paths to achieve objectives.';
    recommendedRoles = ['Technical Support', 'Operations Trainee', 'Product Testing', 'Field Research'];
  }

  const today = new Date();
  const dateFormatted = today
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    .toUpperCase();

  return {
    typeTitle,
    description,
    date: dateFormatted,
    dimensions,
    recommendedRoles,
  };
}
