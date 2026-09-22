"use client";

import { useMemo } from "react";
import { useDoc } from "@/firebase/firestore/use-doc";
import { useUser, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import type { User } from "@/lib/types";

/**
 * Hook to get complete user data from Firestore
 * Includes role, permissions, subscription, etc.
 * @returns User data from Firestore
 */
export function useUserData() {
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  // Memoize the document reference to prevent unnecessary re-subscriptions
  const userRef = useMemo(() => {
    return authUser ? doc(firestore, "users", authUser.uid) : null;
  }, [authUser?.uid, firestore]);

  const { data: userData, isLoading, error } = useDoc<User>(userRef);

  return {
    user: userData,
    isLoading,
    error,
    isAuthenticated: !!authUser,
  };
}
