import { UserProfile, ResumeMetadata, CareerScoreData } from '@/types/user';
import { mockCareerScore } from '@/mocks/mockData';

export async function uploadResumeFile(fileUri: string, fileName: string): Promise<ResumeMetadata> {
  // In production, gets presigned S3 PUT ticket from /candidate/resume/uploads
  return {
    fileName,
    fileSize: '412 KB',
    uploadedAt: new Date().toISOString(),
  };
}

export async function parseResumeDocument(_fileMeta: ResumeMetadata): Promise<Partial<UserProfile>> {
  // Integrates backend AI resume parsing endpoint (/candidate/resume/versions/{id})
  return {
    fullName: 'Priya Deshmukh',
    phone: '+91 98923 45642',
    city: 'Pune',
    state: 'Maharashtra',
    education: [
      {
        id: '1',
        degree: 'B.Sc Microbiology',
        institution: 'Fergusson College, Pune',
        yearRange: '2022–2025',
        grade: '68%',
      },
    ],
    skills: [
      { id: '1', name: 'Microbial culturing' },
      { id: '2', name: 'Lab reporting' },
      { id: '3', name: 'MS Excel' },
      { id: '4', name: 'MS Office', isUnclear: false },
    ],
  };
}

export async function calculateReadinessScore(_profile: Partial<UserProfile>): Promise<CareerScoreData> {
  return {
    current: mockCareerScore.current,
    max: mockCareerScore.max,
    label: mockCareerScore.label,
    delta: mockCareerScore.delta,
    band: 1,
    breakdown: {
      education: 72,
      skills: 48,
      experience: 15,
      projects: 55,
      presentation: 66,
    },
  };
}

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<boolean> {
  return true;
}
