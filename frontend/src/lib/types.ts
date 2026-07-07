export interface Resource {
  url: string;
  resource_type: string;
}

export interface Task {
  id: string;
  type: "topic" | "project" | "quiz" | "milestone";
  title: string;
  description: string | null;
  difficulty: string | null;
  status: "not_started" | "in_progress" | "completed";
  resources: Resource[];
}

export interface WeeklyPlan {
  week: number;
  theme: string;
  tasks: Task[];
}

export interface RoadmapGenerateResponse {
  planId: string;
  versionId: string;
  totalWeeks: number;
  weeks: { weekNumber: number; theme: string; estimatedHours: number; tasks: Task[] }[];
}
