
import { useState, useEffect } from 'react';
import { onSnapshot, Query } from 'firebase/firestore';

export function useCollection<T>(query: Query) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const data: T[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as any);
        });
        setData(data);
        setIsLoading(false);
      },
      (error) => {
        setError(error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [query]);

  return { data, isLoading, error };
}
