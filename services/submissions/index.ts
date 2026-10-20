import { ApiRequestOptions, apiRequest } from "@/services/shared/api";
import type { SubmissionBounds } from "@/lib/submissionBounds";

export interface SubmissionPin {
  id: string;
  lat: number;
  lng: number;
}

export interface Submission extends SubmissionPin {
  description: string;
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

export function getSubmissions(bounds: SubmissionBounds, options?: ApiRequestOptions) {
  const query = new URLSearchParams({
    west: String(bounds.west),
    south: String(bounds.south),
    east: String(bounds.east),
    north: String(bounds.north),
  });
  return apiRequest<SubmissionPin[]>(`/api/submissions?${query}`, options);
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
