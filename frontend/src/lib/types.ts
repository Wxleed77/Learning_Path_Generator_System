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

export interface UserRoadmapSummary {
  planId: string;
  goalTitle: string;
  skillLevel: string;
  hoursPerWeek: number;
  totalWeeks: number;
  completedTasks: number;
  totalTasks: number;
  createdAt: string;
  status: string;
}

export interface HeatmapPoint {
  date: string;
  count: number;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctOption: string;
  explanation?: string | null;
}

export interface QuizGenerationResponse {
  roadmapId: string;
  weekNumber: number;
  questions: QuizQuestion[];
}

export interface QuizSubmissionResponse {
  score: number;
  passed: boolean;
  rerouted: boolean;
  message: string;
}
