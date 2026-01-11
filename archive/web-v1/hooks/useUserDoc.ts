'use client';

import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/firestore';
import { UserDoc } from '@gosenderr/shared';

export function useUserDoc(uid: string | null | undefined) {
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Clean up any existing subscription first
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!uid) {
      setUserDoc(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, 'users', uid);
    
    unsubscribeRef.current = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setUserDoc(snapshot.data() as UserDoc);
        } else {
          setUserDoc(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error subscribing to user doc:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [uid]);

  return { userDoc, loading, error };
}
