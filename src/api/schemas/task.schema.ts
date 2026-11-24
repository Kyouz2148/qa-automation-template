import { z } from 'zod';

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high']);
export const TaskStatusSchema = z.enum(['pending', 'done']);

export const TaskSchema = z.object({
  id: z.string().startsWith('tsk_'),
  title: z.string().min(3),
  description: z.string(),
  priority: TaskPrioritySchema,
  status: TaskStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TaskItemResponseSchema = z.object({
  task: TaskSchema,
});

export const TaskListResponseSchema = z.object({
  items: z.array(TaskSchema),
  total: z.number().int().nonnegative(),
});

export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type Task = z.infer<typeof TaskSchema>;

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
}
