"use server";

import { savePushSubscription, deletePushSubscription } from "./push";

export async function subscribePush(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  return savePushSubscription(sub);
}

export async function unsubscribePush(endpoint: string) {
  return deletePushSubscription(endpoint);
}
