import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface QuizGenerateResponse {
  taskId: string;
  weekNumber: number;
  theme: string;
  questions: QuizQuestion[];
}

export interface QuizFeedback {
  questionId: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  userAnswer: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizSubmitResponse {
  attemptId: string;
  score: number;
  passed: boolean;
  threshold: number;
  feedback: QuizFeedback[];
  totalQuestions: number;
  correctAnswers: number;
}

export interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  questions: QuizQuestion[];
  answers: Record<string, number>;
  createdAt: string;
}

export function useGenerateQuiz() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await api.post<QuizGenerateResponse>(`/api/quiz/${taskId}/generate`);
      return res.data;
    },
  });
}

export function useSubmitQuiz() {
  return useMutation({
    mutationFn: async (payload: { taskId: string; questions: QuizQuestion[]; answers: Record<string, number> }) => {
      const res = await api.post<QuizSubmitResponse>(`/api/quiz/${payload.taskId}/submit`, {
        questions: payload.questions,
        answers: payload.answers,
      });
      return res.data;
    },
  });
}

export function useQuizAttempts(taskId: string | null) {
  return useQuery({
    queryKey: ["quiz-attempts", taskId],
    queryFn: async () => {
      const res = await api.get<QuizAttempt[]>(`/api/quiz/${taskId}/attempts`);
      return res.data;
    },
    enabled: !!taskId,
  });
}