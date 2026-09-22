'use client';
    
import { useState, useEffect, useMemo } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef - A Firestore DocumentReference. Can be null.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  docRef: DocumentReference<DocumentData> | null | undefined
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!docRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isSubscribed = true;

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (!isSubscribed) return;

        if (snapshot.exists()) {
          const newData = { ...(snapshot.data() as T), id: snapshot.id };

          // Only update if data actually changed (deep comparison)
          setData(prevData => {
            if (!prevData) return newData;

            // Quick reference check first
            if (prevData === newData) return prevData;

            // Check if the stringified version is the same (simple deep comparison)
            const prevStr = JSON.stringify(prevData);
            const newStr = JSON.stringify(newData);

            return prevStr === newStr ? prevData : newData;
          });
        } else {
          setData(null);
        }
        setError(null);
        setIsLoading(false);
      },
      async (error: FirestoreError) => {
        if (!isSubscribed) return;

        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: docRef.path,
        });

        setError(contextualError);
        setData(null);
        setIsLoading(false);

        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [docRef?.path]);

  return { data, isLoading, error };
}