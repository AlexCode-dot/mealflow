import { httpClient } from '@/src/core/http/httpClient';
import type { AcceptExtractionRequest, ExtractionJob, Recipe } from '@/src/features/recipes/types';

export const extractionApi = {
  start(formData: FormData, locale?: string): Promise<ExtractionJob> {
    const query = locale ? `?locale=${encodeURIComponent(locale)}` : '';
    return httpClient.appApi.upload<ExtractionJob>(`/api/recipes/extract${query}`, formData);
  },

  startText(transcript: string, locale?: string): Promise<ExtractionJob> {
    return httpClient.appApi.post<ExtractionJob>('/api/recipes/extract/text', { transcript, locale });
  },

  get(jobId: string): Promise<ExtractionJob> {
    return httpClient.appApi.get<ExtractionJob>(`/api/recipes/extract/${jobId}`);
  },

  accept(jobId: string, body: AcceptExtractionRequest): Promise<Recipe> {
    return httpClient.appApi.post<Recipe>(`/api/recipes/extract/${jobId}/accept`, body);
  },
};
