// src/hooks/useTaskSubmit.ts — Task completion hook for all 18 HT forms (Blueprint v3)
import { useCallback } from 'react';
import { tasksSvc } from '../lib/sdk';
import { useAuditWrite } from './useAuditWrite';

export const useTaskSubmit = () => {
  const writeAudit = useAuditWrite();

  const submitTask = useCallback(async (
    taskId: string,
    outcome: string,
    formData: Record<string, unknown>,
    meta: { caseId: string; taskCode: string; stageId: string }
  ) => {
    // Complete the task via Action Center SDK
    try {
      // 1. Fetch task details to resolve the folder ID and task type dynamically
      const details = await tasksSvc.getById(Number(taskId));
      const taskData = (details as any)?.Data || (details as any)?.data || details;
      const folderId = taskData.FolderId || taskData.folderId;
      const taskType = taskData.Type || taskData.type || 'AppTask';

      // 2. Complete the task using the correct SDK options and folder ID
      await tasksSvc.complete({
        type: taskType as any,
        taskId: Number(taskId),
        action: outcome,
        data: formData
      }, folderId);
    } catch (err) {
      console.error('[useTaskSubmit] tasks.complete failed:', err);
      throw err;
    }

    // Write supplemental audit entry to Data Fabric
    await writeAudit({
      caseId: meta.caseId,
      actionType: 'TASK_COMPLETED',
      stageId:    meta.stageId,
      taskCode:   meta.taskCode,
      decision:   outcome,
    });
  }, [writeAudit]);

  return { submitTask };
};
