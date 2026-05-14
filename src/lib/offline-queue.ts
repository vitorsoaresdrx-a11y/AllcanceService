const QUEUE_KEY = 'ALLCANCE_offline_sales';

export interface PendingSale {
  id: string;
  payload: unknown;
  created_at: string;
  attempts: number;
}

export function getQueue(): PendingSale[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addToQueue(sale: Omit<PendingSale, 'attempts'>) {
  const queue = getQueue();
  if (queue.find(s => s.id === sale.id)) return;
  queue.push({ ...sale, attempts: 0 });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string) {
  const queue = getQueue().filter(s => s.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getQueueCount(): number {
  return getQueue().length;
}
