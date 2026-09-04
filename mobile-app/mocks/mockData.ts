/**
 * Mock data for the BharatPath foundation preview.
 * This layer keeps sample data out of components, ready for future API integration.
 */

import { StatusChipType } from '@/components/StatusChip';

export interface MockJob {
  id: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  salary: string;
  matchScore: number;
  status: StatusChipType;
  skills: string[];
  postedDaysAgo: number;
}

export const mockJobs: MockJob[] = [
  {
    id: 'JOB-2026-0142',
    title: 'Senior Backend Engineer',
    company: 'Razorpay',
    location: 'Bengaluru',
    experience: '4–6 yrs',
    salary: '₹28–42 LPA',
    matchScore: 847,
    status: 'MATCH',
    skills: ['Go', 'PostgreSQL', 'Kubernetes', 'gRPC'],
    postedDaysAgo: 2,
  },
  {
    id: 'JOB-2026-0138',
    title: 'Product Designer',
    company: 'Zerodha',
    location: 'Bengaluru',
    experience: '3–5 yrs',
    salary: '₹22–35 LPA',
    matchScore: 792,
    status: 'SHORT',
    skills: ['Figma', 'Design Systems', 'Prototyping'],
    postedDaysAgo: 5,
  },
  {
    id: 'JOB-2026-0129',
    title: 'Frontend Engineer',
    company: 'Swiggy',
    location: 'Remote',
    experience: '2–4 yrs',
    salary: '₹18–28 LPA',
    matchScore: 731,
    status: 'INTERVIEW',
    skills: ['React', 'TypeScript', 'Next.js'],
    postedDaysAgo: 8,
  },
];

export const mockSkills: string[] = [
  'React',
  'TypeScript',
  'Node.js',
  'PostgreSQL',
  'AWS',
  'Docker',
  'GraphQL',
  'Python',
];

export const mockCareerScore = {
  current: 706,
  max: 999,
  label: 'Career readiness',
  delta: '+24 this week',
};

export const mockProgressSteps = [
  { label: 'Profile', completed: true },
  { label: 'Assessment', completed: true },
  { label: 'Interview prep', completed: false },
  { label: 'Applications', completed: false },
];

export const mockNote = {
  text: 'Your profile strength improved by 12 points after adding your Razorpay internship. Keep your experience descriptions under 3 lines for better scanability.',
  variant: 'info' as const,
};

export const mockCTA = {
  title: 'Complete your career assessment',
  subtitle: 'Unlock your full readiness score',
  ctaLabel: 'Start assessment',
};

export const mockCompanyMonograms = [
  { name: 'Razorpay', initials: 'RP' },
  { name: 'Zerodha', initials: 'ZD' },
  { name: 'Swiggy', initials: 'SW' },
  { name: 'PhonePe', initials: 'PP' },
];
