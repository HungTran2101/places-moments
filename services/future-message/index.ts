import { ApiRequestOptions, apiRequest } from "@/services/shared/api";

export type UnlockCondition = "after_days:30" | "after_days:90" | "after_days:365" | "random";

export interface FutureMessage {
  id: string;
  author_uuid: string;
  message: string;
  unlock_condition: UnlockCondition;
  created_at: string;
  updated_at: string;
}

export interface CreateFutureMessagePayload {
  author_uuid: string;
  message: string;
  unlock_condition: UnlockCondition;
}

export function listFutureMessages(authorUuid: string, options?: ApiRequestOptions) {
  return apiRequest<FutureMessage[]>("/api/future-message", {
    ...options,
    headers: {
      "x-author-uuid": authorUuid,
    },
  });
}

export function createFutureMessage(payload: CreateFutureMessagePayload, options?: ApiRequestOptions) {
  return apiRequest<FutureMessage>("/api/future-message", {
    ...options,
    method: "POST",
    body: payload,
  });
}
