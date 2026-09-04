import { supabase } from '../supabase';
import { UserProfile, ResumeMetadata, CareerScoreData } from '@/types/user';
import { mockCareerScore } from '@/mocks/mockData';

export async function uploadResumeFile(fileUri: string, fileName: string): Promise<ResumeMetadata> {
  // In production, uploads to Supabase Storage bucket 'resumes'
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const filePath = `resumes/${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage
      .from('user-resumes')
      .upload(filePath, blob);

    if (error) {
      console.warn('Storage upload warning:', error.message);
    }

    return {
      fileName,
      fileSize: `${(blob.size / 1024).toFixed(0)} KB`,
      uploadedAt: new Date().toISOString(),
      fileUrl: data?.path ? supabase.storage.from('user-resumes').getPublicUrl(data.path).data.publicUrl : undefined,
    };
  } catch {
    // Return structured meta on local preview
    return {
      fileName,
      fileSize: '412 KB',
      uploadedAt: new Date().toISOString(),
    };
  }
}

export async function parseResumeDocument(_fileMeta: ResumeMetadata): Promise<Partial<UserProfile>> {
  // Simulates or integrates backend AI resume parsing endpoint
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
  const { error } = await supabase.from('profiles').upsert(profile);
  if (error) {
    console.warn('Save profile error:', error.message);
    return false;
  }
  return true;
}
