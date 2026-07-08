import { create } from "zustand";

interface PlanState {
  planId: string | null;
  totalWeeks: number;
  goalTitle: string;
  skillLevel: string;
  hoursPerWeek: number;
  setPlan: (p: { planId: string; totalWeeks: number; goalTitle: string; skillLevel: string; hoursPerWeek: number }) => void;
  clear: () => void;
}

function get(key: string, fallback = "") {
  return localStorage.getItem(key) ?? fallback;
}

function hasActiveSession() {
  return Boolean(localStorage.getItem("access_token"));
}

function clearPersistedPlan() {
  localStorage.removeItem("plan_id");
  localStorage.removeItem("total_weeks");
  localStorage.removeItem("goal_title");
  localStorage.removeItem("skill_level");
  localStorage.removeItem("hours_per_week");
}

export const usePlanStore = create<PlanState>((set) => ({
  planId: hasActiveSession() ? localStorage.getItem("plan_id") : null,
  totalWeeks: hasActiveSession() ? Number(get("total_weeks", "0")) : 0,
  goalTitle: hasActiveSession() ? get("goal_title") : "",
  skillLevel: hasActiveSession() ? get("skill_level", "beginner") : "beginner",
  hoursPerWeek: hasActiveSession() ? Number(get("hours_per_week", "0")) : 0,
  setPlan: ({ planId, totalWeeks, goalTitle, skillLevel, hoursPerWeek }) => {
    localStorage.setItem("plan_id", planId);
    localStorage.setItem("total_weeks", String(totalWeeks));
    localStorage.setItem("goal_title", goalTitle);
    localStorage.setItem("skill_level", skillLevel);
    localStorage.setItem("hours_per_week", String(hoursPerWeek));
    set({ planId, totalWeeks, goalTitle, skillLevel, hoursPerWeek });
  },
  clear: () => {
    clearPersistedPlan();
    set({ planId: null, totalWeeks: 0, goalTitle: "", skillLevel: "beginner", hoursPerWeek: 0 });
  },
}));
