import {useEffect, useState} from 'react';
import {validateData, type Dataset} from './data';
import {fetchSheet} from './sheet';

export const sheetPollInterval = 60_000;
type SheetStatus = {state: 'disabled' | 'checking' | 'connected' | 'stale'; lastChecked: Date | null; message?: string};

export function useHospitalData() {
  const [registry, setRegistry] = useState<Dataset | null>(null);
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<SheetStatus>({state: 'disabled', lastChecked: null});

  useEffect(() => {
    const controller = new AbortController();
    const url = (import.meta.env.VITE_GOOGLE_SHEET_CSV_URL || '').trim();
    let busy = false;
    let baseline: Dataset;
    let timer: ReturnType<typeof setInterval> | undefined;
    let latestSignature = '';
    let lastAttempt = 0;
    const refresh = async () => {
      if (busy || controller.signal.aborted || document.visibilityState === 'hidden') return;
      busy = true;
      lastAttempt = Date.now();
      setSheet(previous => ({...previous, state: 'checking'}));
      try {
        const next = await fetchSheet(url, baseline, {signal: controller.signal});
        if (controller.signal.aborted) return;
        const signature = JSON.stringify(next);
        if (signature !== latestSignature) {
          setData(next);
          latestSignature = signature;
        }
        setSheet({state: 'connected', lastChecked: new Date()});
      } catch (failure) {
        if (!controller.signal.aborted) {
          setSheet(previous => ({...previous, state: 'stale', message: failure instanceof Error ? failure.message : 'Could not read the sheet'}));
        }
      } finally {
        busy = false;
      }
    };
    const resume = () => {
      if (Date.now() - lastAttempt >= sheetPollInterval) void refresh();
    };
    const load = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/hospitals.json`, {signal: controller.signal});
        if (!response.ok) throw new Error('Could not load hospital data');
        baseline = validateData(await response.json());
        if (controller.signal.aborted) return;
        latestSignature = JSON.stringify(baseline);
        setRegistry(baseline);
        setData(baseline);
        if (url) {
          void refresh();
          timer = setInterval(() => void refresh(), sheetPollInterval);
          document.addEventListener('visibilitychange', resume);
          window.addEventListener('focus', resume);
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not load hospital data');
      }
    };
    void load();
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
    };
  }, []);

  return {data, registry, error, sheet};
}
