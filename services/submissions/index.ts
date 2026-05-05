import { ApiRequestOptions, apiRequest } from "@/services/shared/api";

export interface Submission {
  id: string;
  description: string;
  lat: number;
  lng: number;
  weather_summary: string | null;
  weather_code?: string | number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSubmissionPayload {
  description: string;
  lat: number;
  lng: number;
  author_uuid: string;
}

export interface UpdateSubmissionPayload {
  description?: string;
  author_uuid: string;
}

export function getSubmissions(options?: ApiRequestOptions) {
  return apiRequest<Submission[]>("/api/submissions", options);
}

export function getSubmissionById(id: string, options?: ApiRequestOptions) {
  return apiRequest<Submission>(`/api/submissions/${id}`, options);
}

export function createSubmission(payload: CreateSubmissionPayload, options?: ApiRequestOptions) {
  return apiRequest<Submission>("/api/submissions", {
    ...options,
    method: "POST",
    body: payload,
  });
}

export function updateSubmission(
  id: string,
  payload: UpdateSubmissionPayload,
  options?: ApiRequestOptions
) {
  return apiRequest<Submission>(`/api/submissions/${id}`, {
    ...options,
    method: "PATCH",
    body: payload,
  });
}

export function deleteSubmission(id: string, authorUuid: string, options?: ApiRequestOptions) {
  return apiRequest<null>(`/api/submissions/${id}`, {
    ...options,
    method: "DELETE",
    headers: {
      "x-author-uuid": authorUuid,
    },
  });
}
