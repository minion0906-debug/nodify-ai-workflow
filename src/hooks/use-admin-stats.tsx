'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, collectionGroup, query, where, getDocs, Timestamp } from 'firebase/firestore';

export interface AdminStats {
  totalUsers: number;
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  executionsToday: number;
  previousMonthUsers: number;
  previousMonthWorkflows: number;
  previousDayExecutions: number;
}

export function useAdminStats() {
  const firestore = useFirestore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchStats() {
      if (!firestore) return;

      try {
        setIsLoading(true);
        setError(null);

        // Calculate date ranges
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const startOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

        // Get all users
        const usersCollection = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersCollection);
        const totalUsers = usersSnapshot.size;

        // Count users created before this month
        const previousMonthUsers = usersSnapshot.docs.filter(doc => {
          const createdAt = doc.data().createdAt?.toDate();
          return createdAt && createdAt < startOfMonth;
        }).length;

        // Get all workflows using collectionGroup
        const workflowsGroup = collectionGroup(firestore, 'workflows');
        const workflowsSnapshot = await getDocs(workflowsGroup);
        const totalWorkflows = workflowsSnapshot.size;

        // Count active workflows
        const activeWorkflows = workflowsSnapshot.docs.filter(doc =>
          doc.data().status === 'active'
        ).length;

        // Count workflows created before this month
        const previousMonthWorkflows = workflowsSnapshot.docs.filter(doc => {
          const createdAt = doc.data().createdAt?.toDate();
          return createdAt && createdAt < startOfMonth;
        }).length;

        // Get all executions using collectionGroup
        const executionsGroup = collectionGroup(firestore, 'executions');
        const executionsSnapshot = await getDocs(executionsGroup);
        const totalExecutions = executionsSnapshot.size;

        // Count executions today
        const executionsToday = executionsSnapshot.docs.filter(doc => {
          const startedAt = doc.data().startedAt?.toDate();
          return startedAt && startedAt >= startOfToday;
        }).length;

        // Count executions yesterday
        const previousDayExecutions = executionsSnapshot.docs.filter(doc => {
          const startedAt = doc.data().startedAt?.toDate();
          return startedAt && startedAt >= startOfYesterday && startedAt < startOfToday;
        }).length;

        setStats({
          totalUsers,
          totalWorkflows,
          activeWorkflows,
          totalExecutions,
          executionsToday,
          previousMonthUsers,
          previousMonthWorkflows,
          previousDayExecutions,
        });
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch admin stats'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [firestore]);

  return { stats, isLoading, error };
}
