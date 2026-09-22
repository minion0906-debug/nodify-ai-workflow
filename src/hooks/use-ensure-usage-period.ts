"use client";

import { useEffect, useMemo } from "react";
import { useUser, useFirestore } from "@/firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { useUserData } from "./use-user-data";

function isSameBillingMonth(lastReset?: any) {
  try {
    if (!lastReset) return false;
    const d = lastReset?.toDate ? lastReset.toDate() : new Date(lastReset);
    const now = new Date();
    return d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth();
  } catch {
    return false;
  }
}

export function useEnsureUsagePeriod() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { user: userData } = useUserData();

  const userRef = useMemo(() => {
    return authUser ? doc(firestore, "users", authUser.uid) : null;
  }, [authUser?.uid, firestore]);

  useEffect(() => {
    if (!authUser || !firestore || !userRef) return;
    const lastReset = userData?.usage?.lastResetDate;
    if (isSameBillingMonth(lastReset)) return;

    // Reset monthly counters at first mount in a new billing month
    runTransaction(firestore, async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists()) return;
      const data: any = snap.data();
      const lr = data?.usage?.lastResetDate;
      if (isSameBillingMonth(lr)) return; // another client already reset
      tx.update(userRef, {
        'usage.executionsThisMonth': 0,
        'usage.apiCallsThisMonth': 0,
        'usage.lastResetDate': serverTimestamp(),
      });
    }).catch(() => {});
  }, [authUser, firestore, userRef, userData?.usage?.lastResetDate]);
}

