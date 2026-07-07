import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { RoadmapGenerateResponse, WeeklyPlan } from "../lib/types";

export function useGenerateRoadmap() {
  return useMutation({
    mutationFn: async (payload: { goalTitle: string; skillLevel: string; hoursPerWeek: number }) => {
      const res = await api.post<RoadmapGenerateResponse>("/api/roadmap/generate", payload);
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
    },
  });
}
