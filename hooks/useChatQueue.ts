import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "logicopilot_chat_queue";

export interface QueuedMessage {
  id: string;
  convId: number;
  content: string;
  timestamp: number;
}

export async function enqueueMessage(convId: number, content: string, localId: string): Promise<QueuedMessage> {
  const item: QueuedMessage = { id: localId, convId, content, timestamp: Date.now() };
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: QueuedMessage[] = raw ? (JSON.parse(raw) as QueuedMessage[]) : [];
    queue.push(item);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
  return item;
}

export async function getQueueForConv(convId: number): Promise<QueuedMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: QueuedMessage[] = raw ? (JSON.parse(raw) as QueuedMessage[]) : [];
    return queue.filter((q) => q.convId === convId);
  } catch {
    return [];
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const queue: QueuedMessage[] = raw ? (JSON.parse(raw) as QueuedMessage[]) : [];
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.filter((q) => q.id !== id)));
  } catch {}
}
