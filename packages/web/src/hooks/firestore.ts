import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  type QueryConstraint,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export function useCollection<T extends DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): { data: (T & { id: string })[]; loading: boolean } {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  // QueryConstraint objects (where/orderBy/etc.) carry their field/op/value as
  // plain enumerable properties, so JSON.stringify actually distinguishes
  // different queries — unlike keying on constraint.type alone, which is the
  // same string ("where") for every filter regardless of field or value and
  // would silently skip re-subscribing when a filter's value changes.
  const key = JSON.stringify(constraints);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, collectionName), ...constraints);
    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })));
        setLoading(false);
      },
      (err) => {
        console.error(`useCollection(${collectionName}) snapshot error:`, err);
        setLoading(false);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, key]);

  return { data, loading };
}

export function useDocument<T extends DocumentData>(
  collectionName: string,
  id: string | undefined
): { data: (T & { id: string }) | null; loading: boolean } {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(doc(db, collectionName, id), (snap) => {
      setData(snap.exists() ? ({ ...(snap.data() as T), id: snap.id }) : null);
      setLoading(false);
    });
  }, [collectionName, id]);

  return { data, loading };
}
