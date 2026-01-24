
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { UserDoc } from '@/lib/v2/types';

export function useCourierById(courierUid: string | null) {
  const [courier, setCourier] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courierUid) {
      setCourier(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', courierUid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setCourier(snapshot.data() as UserDoc);
      } else {
        setCourier(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courierUid]);

  return { courier, loading };
}
