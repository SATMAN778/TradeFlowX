// src/hooks/useCanApprove.ts — Role gate for task forms (Blueprint v3)
import { useAuth } from '../context/AuthContext';
import { TASK_ROLES } from '../types/task';

export const useCanApprove = (taskCode: string): boolean => {
  const { activeRole } = useAuth();
  return (TASK_ROLES[taskCode] ?? []).some(r => r === activeRole);
};
