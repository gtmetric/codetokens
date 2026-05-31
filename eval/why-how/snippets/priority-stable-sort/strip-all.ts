export type Task = { id: number; priority: number }

export function orderTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.priority - b.priority)
}
