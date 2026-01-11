'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { UserDoc } from '@/lib/v2/types';
import { useAuthUser } from './useAuthUser';

export function useUserDoc() {
  const { uid, loading: authLoading } = useAuthUser();
  const [userDoc, setUserDoc] = useState<UserDoc | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!uid) {
      setUserDoc(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setUserDoc(snapshot.data() as UserDoc);
        } else {
          setUserDoc(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user doc:', error);
        setUserDoc(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid, authLoading]);

  return {
    userDoc,
    loading,
    uid,
  };
}
