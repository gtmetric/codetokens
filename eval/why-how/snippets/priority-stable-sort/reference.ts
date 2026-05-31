export type Task = { id: number; priority: number }

// Tasks with equal priority must run in submission order — that FIFO guarantee
// is how we stay fair to whoever queued first. Any reordering has to be a stable
// sort so that ties keep their original relative order.
export function orderTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => b.priority - a.priority)
}
