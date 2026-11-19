import { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  CalendarDays,
  Check,
  CheckSquare,
  List,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
} from 'lucide-react';
import {
  filterTasks,
  isOverdue,
  sortTasks,
  taskAnchorDate,
  type TaskSortDirection,
  type TaskSortField,
} from '@/domain/tasks';
import { PRIORITIES, TASK_STATUSES, type Priority, type Task, type TaskStatus } from '@/domain/types';
import { useCategoriesList, useTaskMutations, useTasksList } from '@/features/tasks/api/useTasks';
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog';
import { TasksCalendarView } from '@/features/tasks/components/TasksCalendarView';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/cn';
import { toast } from '@/stores/toast';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  SegmentedControl,
  Select,
  Skeleton,
  type BadgeTone,
} from '@/components/ui';

type ViewMode = 'list' | 'calendar';

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  urgent: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'neutral',
};

const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  todo: 'neutral',
  in_progress: 'primary',
  completed: 'success',
  deferred: 'warning',
};

export function TasksPage() {
  const { t, fmt } = useI18n();
  const tasksQuery = useTasksList();
  const categoriesQuery = useCategoriesList();
  const mutations = useTaskMutations();

  const [view, setView] = useState<ViewMode>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all' | 'active'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [sortField, setSortField] = useState<TaskSortField>('dueAt');
  const [sortDir, setSortDir] = useState<TaskSortDirection>('asc');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  const categories = categoriesQuery.data ?? [];
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filteredTasks = useMemo(() => {
    const raw = tasksQuery.data ?? [];
    const filtered = filterTasks(raw, {
      search,
      status: statusFilter,
      priority: priorityFilter,
      categoryId: categoryFilter,
      recurringOnly,
    });
    return sortTasks(filtered, sortField, sortDir);
  }, [tasksQuery.data, search, statusFilter, priorityFilter, categoryFilter, recurringOnly, sortField, sortDir]);

  const openCreate = (dateKey?: string) => {
    setEditingTask(null);
    setDefaultDate(dateKey);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setDefaultDate(undefined);
    setDialogOpen(true);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setCategoryFilter('all');
    setRecurringOnly(false);
  };

  const now = new Date();
  const hasFilters =
    search !== '' ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    recurringOnly;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink">{t('tasks.title')}</h1>
            {tasksQuery.data ? (
              <Badge tone="neutral">{t('tasks.countSummary', { count: fmt.number(filteredTasks.length) })}</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ink-muted">{t('tasks.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <SegmentedControl<ViewMode>
            label={t('tasks.title')}
            value={view}
            onChange={setView}
            size="sm"
            options={[
              { value: 'list', label: t('tasks.viewList'), icon: <List /> },
              { value: 'calendar', label: t('tasks.viewCalendar'), icon: <CalendarDays /> },
            ]}
          />
          <Button onClick={() => openCreate()} leadingIcon={<Plus />}>
            {t('tasks.newTask')}
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-3.5 sm:p-4">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('tasks.searchPlaceholder')}
              aria-label={t('tasks.searchPlaceholder')}
              className="h-10 ps-10"
            />
          </div>

          <div className="md:col-span-2">
            <Select
              aria-label={t('tasks.statusLabel')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all' | 'active')}
              className="h-10"
            >
              <option value="all">{t('tasks.allStatuses')}</option>
              <option value="active">{t('tasks.activeOnly')}</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`taskStatus.${s}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <Select
              aria-label={t('priority.label')}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
              className="h-10"
            >
              <option value="all">{t('tasks.allPriorities')}</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`priority.${p}`)}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2">
            <Select
              aria-label={t('tasks.categoryLabel')}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10"
            >
              <option value="all">{t('tasks.allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-1.5 md:col-span-2">
            <Select
              aria-label={t('tasks.sortBy')}
              value={sortField}
              onChange={(e) => setSortField(e.target.value as TaskSortField)}
              className="h-10"
            >
              <option value="dueAt">{t('tasks.sortDue')}</option>
              <option value="priority">{t('tasks.sortPriority')}</option>
              <option value="createdAt">{t('tasks.sortCreated')}</option>
              <option value="title">{t('tasks.sortTitle')}</option>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              aria-label={t('tasks.sortBy')}
              title={t('tasks.sortBy')}
            >
              <ArrowDownUp />
            </Button>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setRecurringOnly((v) => !v)}
            aria-pressed={recurringOnly}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              recurringOnly
                ? 'border-primary/40 bg-primary-soft text-primary dark:text-primary-strong'
                : 'border-line bg-surface-2 text-ink-muted hover:text-ink',
            )}
          >
            <Repeat className="size-3.5" />
            <span>{t('tasks.recurringOnly')}</span>
          </button>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t('tasks.clearFilters')}
            </Button>
          ) : null}
        </div>
      </Card>

      {tasksQuery.isPending ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </Card>
          ))}
        </div>
      ) : tasksQuery.isError ? (
        <ErrorState
          title={t('dashboard.error.title')}
          description={t('dashboard.error.hint')}
          action={<Button onClick={() => void tasksQuery.refetch()}>{t('common.retry')}</Button>}
        />
      ) : view === 'calendar' ? (
        <TasksCalendarView
          tasks={filteredTasks}
          onSelectTask={openEdit}
          onCreateForDate={(dayKey) => openCreate(dayKey)}
        />
      ) : filteredTasks.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            icon={<CheckSquare />}
            title={t('tasks.emptyTitle')}
            description={t('tasks.emptyHint')}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  {t('tasks.clearFilters')}
                </Button>
              ) : (
                <Button onClick={() => openCreate()} leadingIcon={<Plus />}>
                  {t('tasks.newTask')}
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filteredTasks.map((task) => {
            const done = task.status === 'completed';
            const anchor = taskAnchorDate(task);
            const overdue = isOverdue(task, now);
            const category = task.categoryId ? categoryMap.get(task.categoryId) : undefined;
            const subtasks = task.subtasks ?? [];
            const subtasksDone = subtasks.filter((s) => s.completed).length;

            return (
              <li key={task.id}>
                <Card className="flex items-start gap-3.5 p-4 transition-colors hover:border-line-strong">
                  <button
                    type="button"
                    onClick={() => mutations.toggleTask.mutate({ id: task.id, completed: !done })}
                    aria-label={t(done ? 'dashboard.timeline.markUndone' : 'dashboard.timeline.markDone', {
                      title: task.title,
                    })}
                    aria-pressed={done}
                    className={cn(
                      'mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors',
                      done
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-line-strong bg-surface text-transparent hover:border-primary',
                    )}
                  >
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(task)}
                        className={cn(
                          'text-start text-sm font-semibold text-ink hover:underline',
                          done && 'line-through text-ink-subtle',
                        )}
                      >
                        {task.title}
                      </button>
                      <Badge tone={PRIORITY_TONE[task.priority]}>{t(`priority.${task.priority}`)}</Badge>
                      {task.status !== 'todo' ? (
                        <Badge tone={STATUS_TONE[task.status]}>{t(`taskStatus.${task.status}`)}</Badge>
                      ) : null}
                      {category ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-2xs font-medium text-ink-muted">
                          <span className="size-2 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
                          {category.name}
                        </span>
                      ) : null}
                      {task.recurrence ? (
                        <Badge tone="accent">
                          <Repeat aria-hidden />
                          <span>
                            {t(
                              `tasks.recurrence${task.recurrence.frequency.charAt(0).toUpperCase()}${task.recurrence.frequency.slice(1)}` as 'tasks.recurrenceDaily',
                            )}
                          </span>
                        </Badge>
                      ) : null}
                    </div>

                    {task.notes ? (
                      <p className="mt-1 line-clamp-1 text-xs text-ink-muted">{task.notes}</p>
                    ) : null}

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
                      {anchor ? (
                        <span className={cn('tabular', overdue && 'font-medium text-danger')}>
                          {overdue ? `${t('dashboard.upcoming.overdue')} · ` : ''}
                          {fmt.relativeDay(anchor, now)} · {fmt.time(anchor)}
                        </span>
                      ) : null}
                      {task.estimatedMinutes ? (
                        <span className="tabular">{fmt.duration(task.estimatedMinutes)}</span>
                      ) : null}
                      {subtasks.length > 0 ? (
                        <span className="tabular">
                          {t('tasks.subtasksLabel')}: {fmt.number(subtasksDone)}/{fmt.number(subtasks.length)}
                        </span>
                      ) : null}
                      {task.tags.map((tag) => (
                        <span key={tag} className="text-primary dark:text-primary-strong">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('tasks.editTask')}
                      onClick={() => openEdit(task)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('tasks.deleteTask')}
                      className="text-ink-subtle hover:bg-danger-soft hover:text-danger"
                      onClick={() => {
                        void mutations.deleteTask.mutateAsync(task.id).then(() => {
                          toast.success(t('tasks.deleted'));
                        });
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={editingTask ? (tasksQuery.data?.find((x) => x.id === editingTask.id) ?? editingTask) : null}
        categories={categories}
        defaultDate={defaultDate}
      />
    </div>
  );
}
