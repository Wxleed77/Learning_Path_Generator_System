import { create } from "zustand";

interface PlanState {
  planId: string | null;
  totalWeeks: number;
  goalTitle: string;
  skillLevel: string;
  hoursPerWeek: number;
  setPlan: (p: { planId: string; totalWeeks: number; goalTitle: string; skillLevel: string; hoursPerWeek: number }) => void;
}

function get(key: string, fallback = "") {
  return localStorage.getItem(key) ?? fallback;
}

export const usePlanStore = create<PlanState>((set) => ({
  planId: localStorage.getItem("plan_id"),
  totalWeeks: Number(get("total_weeks", "0")),
  goalTitle: get("goal_title"),
  skillLevel: get("skill_level", "beginner"),
  hoursPerWeek: Number(get("hours_per_week", "0")),
  setPlan: ({ planId, totalWeeks, goalTitle, skillLevel, hoursPerWeek }) => {
    localStorage.setItem("plan_id", planId);
    localStorage.setItem("total_weeks", String(totalWeeks));
    localStorage.setItem("goal_title", goalTitle);
    localStorage.setItem("skill_level", skillLevel);
    localStorage.setItem("hours_per_week", String(hoursPerWeek));
    set({ planId, totalWeeks, goalTitle, skillLevel, hoursPerWeek });
  },
}));
