import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  HeatmapPoint,
  QuizGenerationResponse,
  QuizSubmissionResponse,
  RoadmapGenerateResponse,
  UserRoadmapSummary,
  WeeklyPlan,
} from "../lib/types";

export function useGenerateRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { goalTitle: string; skillLevel: string; hoursPerWeek: number }) => {
      const res = await api.post<RoadmapGenerateResponse>("/api/roadmap/generate", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmaps", "history"] });
    },
  });
}

export function useUserRoadmaps() {
  return useQuery({
    queryKey: ["roadmaps", "history"],
    queryFn: async () => {
      const res = await api.get<UserRoadmapSummary[]>("/api/roadmap/history");
      return res.data;
    },
  });
}

export function useHeatmap() {
  return useQuery({
    queryKey: ["progress", "heatmap"],
    queryFn: async () => {
      const res = await api.get<HeatmapPoint[]>("/api/progress/heatmap");
      return res.data;
    },
  });
}

export function useGenerateQuiz() {
  return useMutation({
    mutationFn: async (payload: { roadmapId: string; weekNumber: number; count?: number }) => {
      const res = await api.post<QuizGenerationResponse>("/api/quizzes/generate", payload);
      return res.data;
    },
  });
}

export function useSubmitQuiz() {
  return useMutation({
    mutationFn: async (payload: { roadmapId: string; weekNumber: number; responses: { questionId: string; selectedOption: string; correctOption: string }[] }) => {
      const res = await api.post<QuizSubmissionResponse>("/api/quizzes/submit", payload);
      return res.data;
    },
  });
}

export function useWeeklyPlan(planId: string | null, week: number) {
  return useQuery({
    queryKey: ["weekly-plan", planId, week],
    queryFn: async () => {
      const res = await api.get<WeeklyPlan>(`/api/roadmap/${planId}/weekly-plan`, { params: { week } });
      return res.data;
    },
    enabled: !!planId,
  });
}

export function useUpdateProgress(planId: string | null, week: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const res = await api.patch(`/api/progress/${taskId}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly-plan", planId, week] });
      queryClient.invalidateQueries({ queryKey: ["roadmaps", "history"] });
    },
  });
}
