import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';

// Loads data with loading/error state. `reload()` refetches without clearing the data.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(() => fnRef.current())
      .then((data) => alive && setState({ loading: false, data, error: null }))
      .catch((error) => alive && setState((s) => ({ loading: false, data: s.data, error })));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

let syllabusCache = null;
export function useSyllabus() {
  const [subjects, setSubjects] = useState(syllabusCache || []);
  useEffect(() => {
    if (syllabusCache) return;
    api.getSyllabus().then((s) => { syllabusCache = s; setSubjects(s); });
  }, []);
  const topics = subjects.flatMap((s) => (s.topics || []).map((t) => ({ ...t, subjectId: s.id })));
  return {
    ready: subjects.length > 0,
    subjects,
    topics,
    subject: (id) => subjects.find((s) => s.id === id),
    topic: (id) => topics.find((t) => t.id === id),
  };
}

export const TYPES = {
  study: { label: 'مطالعه', icon: 'book' },
  test: { label: 'تست', icon: 'exam' },
  review: { label: 'مرور', icon: 'refresh' },
  practice: { label: 'تمرین عملی', icon: 'brush' },
};

export const DIFFICULTY = { easy: 'آسان', medium: 'متوسط', hard: 'سخت', mixed: 'ترکیبی' };

// File → downscaled JPEG data URL (keeps demo storage small)
export function fileToDataURL(file, maxSide = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
