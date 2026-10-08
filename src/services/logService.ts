import { collection, doc, setDoc, onSnapshot, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivityLog } from '../types';

const LOCAL_LOGS_KEY = 'chaiden_activity_logs_v2';

function getLocalLogs(): ActivityLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_LOGS_KEY);
    return raw ? JSON.parse(raw) : [
      {
        logId: 'log_init',
        userId: 'system',
        userEmail: 'system@chaiden.com',
        action: 'System Initialized',
        target: 'The Chai Den Menu Database loaded',
        timestamp: new Date().toISOString(),
      }
    ];
  } catch {
    return [];
  }
}

function saveLocalLogs(logs: ActivityLog[]) {
  try {
    localStorage.setItem(LOCAL_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.error(e);
  }
}

export async function logActivity(
  action: string,
  target: string,
  userEmail: string = 'owner@chaiden.com',
  userId: string = 'user'
): Promise<void> {
  const log: ActivityLog = {
    logId: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userEmail,
    action,
    target,
    timestamp: new Date().toISOString(),
  };

  const current = getLocalLogs();
  saveLocalLogs([log, ...current]);

  try {
    await setDoc(doc(db, 'activityLogs', log.logId), log);
  } catch (err) {
    console.warn('Logging to Firestore fallback to local:', err);
  }
}

export async function clearAllActivityLogs(): Promise<void> {
  saveLocalLogs([]);
  try {
    const snapshot = await getDocs(collection(db, 'activityLogs'));
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn('Clearing activity logs in Firestore fallback to local:', err);
  }
}

export function exportActivityLogsToExcel(logs: ActivityLog[]): void {
  const headers = ['Timestamp', 'Date & Time', 'Action', 'Affected Item / Target', 'Authorized User', 'User ID'];
  const rows = logs.map((log) => [
    `"${log.timestamp}"`,
    `"${new Date(log.timestamp).toLocaleString().replace(/"/g, '""')}"`,
    `"${(log.action || '').replace(/"/g, '""')}"`,
    `"${(log.target || '').replace(/"/g, '""')}"`,
    `"${(log.userEmail || '').replace(/"/g, '""')}"`,
    `"${(log.userId || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `TheChaiDen_Activity_Log_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function subscribeActivityLogs(onData: (logs: ActivityLog[]) => void): () => void {
  onData(getLocalLogs());

  try {
    const unsubscribe = onSnapshot(
      collection(db, 'activityLogs'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ActivityLog[] = [];
          snapshot.forEach((d) => {
            list.push({ logId: d.id, ...d.data() } as ActivityLog);
          });
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          saveLocalLogs(list);
          onData(list);
        } else {
          saveLocalLogs([]);
          onData([]);
        }
      },
      (err) => {
        console.warn('Activity logs listener notice:', err);
        onData(getLocalLogs());
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}
