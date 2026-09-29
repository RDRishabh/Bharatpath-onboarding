/**
 * BharatPath — Job Detail Route
 *
 * Fetches `GET /candidate/jobs/{id}` and renders the merged `JobDetailScreen`
 * (S18). One screen handles all eligibility states; the old `job-short` route
 * is gone. On a successful apply, navigates to `/application-sent` with the
 * employer name.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/tokens';
import { JobDetailScreen } from '@/screens/jobs/JobDetailScreen';
import { BoardJobDetail } from '@/types/job';
import { getJobDetail } from '@/services/api/jobs';
import { ApiError } from '@/services/api/client';
import { listMyApplications } from '@/services/api/applications';

export default function JobDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const jobId = params.id;

  const [job, setJob] = useState<BoardJobDetail | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId) {
      setError('No job id.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [detail, myApps] = await Promise.all([
        getJobDetail(jobId),
        listMyApplications({ limit: 100 }).catch(() => null),
      ]);
      setJob(detail);
      // Determine if the candidate already has an application for this job.
      if (myApps) {
        setAlreadyApplied(myApps.items.some((a) => a.job_id === jobId));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('This job is no longer open.');
      } else {
        setError(
          err instanceof ApiError
            ? err.problem.title
            : 'Could not load this job.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.brandAccent} />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          {error ?? 'Could not load this job.'}
        </Text>
        <Text style={styles.retryLink} onPress={() => router.back()}>
          Back to jobs
        </Text>
      </View>
    );
  }

  return (
    <JobDetailScreen
      job={job}
      alreadyApplied={alreadyApplied}
      onBack={() => router.back()}
      onApplied={(employerName) =>
        router.push({
          pathname: '/application-sent',
          params: { employer: employerName },
        } as any)
      }
      onJobGone={() => router.back()}
      onSubscriptionRequired={() => {
        // Paywall surface is out of scope for this pass; back out for now.
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.offWhite,
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.navy,
    textAlign: 'center',
  },
  retryLink: {
    fontFamily: 'GeneralSans-Semibold',
    fontSize: 14,
    lineHeight: 18,
    color: Colors.brandAccent,
  },
});
