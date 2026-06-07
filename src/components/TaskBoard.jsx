import { Avatar, Icon } from "./Common";
import { compareTasksByBoardPriority, getTaskDeadlineInfo, getTaskPriority } from "../deadline";
import { formatDisplayDate } from "../dateFormat";
import { getCompletedArchiveInfo } from "../workflow";
import SelectDropdown from "./SelectDropdown";

function TaskCard({
  archiveTask,
  assignTask,
  chemicals,
  column,
  companies,
  currentUser,
  deleteTask,
  draggedTaskId,
  labels,
  members,
  now,
  openTask,
  setDragTargetId,
  setDraggedTaskId,
  task,
}) {
  const company = companies.find((item) => item.id === task.companyId);
  const taskPriority = getTaskPriority(task, now);
  const columnDeadlineInfo = getTaskDeadlineInfo(task, now);
  const isCompleted = task.columnId === "completed";
  const taskColor = isCompleted ? "#22a06b" : taskPriority === "high" ? "#c9372c" : "#0c66e4";

  return (
    <article
      className={`task-card ${task.assignee === currentUser.name ? "task-card-personal" : ""} ${taskPriority === "high" ? "task-card-high-priority" : "task-card-low-priority"} ${isCompleted ? "task-card-completed" : ""} ${draggedTaskId === task.id ? "dragging" : ""}`}
      draggable
      onClick={() => openTask(task)}
      onDragEnd={() => {
        setDraggedTaskId(null);
        setDragTargetId(null);
      }}
      onDragStart={(event) => {
        setDraggedTaskId(task.id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task.id);
      }}
      style={{ "--task-color": taskColor }}
    >
      <div className="task-card-top">
        <div className="task-card-markers">
          {task.assignee === currentUser.name && <span className="my-task-badge">Việc của tôi</span>}
        </div>
        <div className="task-card-actions">
          {isCompleted && archiveTask && (
            <button
              aria-label={`Lưu trữ công việc ${task.key}`}
              className="task-archive"
              onClick={(event) => {
                event.stopPropagation();
                archiveTask(task.id);
              }}
              title="Chuyển sang công việc đã hoàn tất"
              type="button"
            >
              <Icon name="archive" size={14} />
            </button>
          )}
          <button
            aria-label={`Xóa công việc ${task.key}`}
            className="task-more"
            onClick={(event) => {
              event.stopPropagation();
              deleteTask(task);
            }}
            title="Xóa công việc"
            type="button"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
      <h3>{task.title}</h3>
      {(company || task.chemicals.length > 0) && (
        <div className="import-details">
          {company && (
            <span className="company-detail">
              <small>Seller</small>
              <strong>{company.name}</strong>
            </span>
          )}
          {task.chemicals.map((chemicalId) => {
            const chemical = chemicals.find((item) => item.id === chemicalId);
            if (!chemical) return null;

            return (
              <span
                className="chemical-chip"
                key={chemical.id}
                style={{ "--chemical-color": chemical.color }}
              >
                {chemical.name}
              </span>
            );
          })}
        </div>
      )}
      <div className="label-list">
        {task.labels.slice(0, 2).map((label) => {
          const labelColor = labels.find((item) => item.name === label)?.color || "#626f86";
          return <span key={label} style={{ "--label-color": labelColor }}>{label}</span>;
        })}
      </div>
      <div
        className="quick-assignee"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Avatar name={task.assignee} size="tiny" index={members.indexOf(task.assignee)} />
        <SelectDropdown
          ariaLabel={`Người nhận ${task.key}`}
          className="quick-assignee-select"
          onChange={(assignee) => assignTask(task.id, assignee)}
          options={members.map((person) => ({ value: person, label: person }))}
          value={task.assignee}
        />
      </div>
      <div className="task-card-footer">
        <span className="task-key">{task.key}</span>
        <div className="task-meta">
          {columnDeadlineInfo && (
            <span className="deadline-list">
              <span className={`deadline ${columnDeadlineInfo.isHighPriority ? "deadline-overdue" : ""}`}>
                {column.title}: {columnDeadlineInfo.label}
              </span>
            </span>
          )}
          {task.comments.length > 0 && <span className="comment-count"><Icon name="comment" size={13} />{task.comments.length}</span>}
        </div>
      </div>
    </article>
  );
}

export function CompletedArchiveSection({ companies, completedArchiveTasks, now, openTask }) {
  return (
    <section className="completed-archive-section">
      <header className="completed-archive-header">
        <div>
          <p className="eyebrow">LƯU TRỮ</p>
          <h2>Công việc đã hoàn tất</h2>
          <span>
            Công việc đã hoàn thành sau 2 tuần hoặc đã bấm lưu trữ sẽ nằm ở đây.
          </span>
        </div>
        <strong>{completedArchiveTasks.length} công việc</strong>
      </header>
      {completedArchiveTasks.length > 0 ? (
        <div className="completed-archive-list">
          {completedArchiveTasks.map((task) => {
            const company = companies.find((item) => item.id === task.companyId);
            const archiveInfo = getCompletedArchiveInfo(task, now);
            const completedDate = formatDisplayDate(archiveInfo.completedDate);
            const archiveDate = formatDisplayDate(archiveInfo.archivedAt);

            return (
              <button
                className="completed-archive-card"
                key={task.id}
                onClick={() => openTask(task)}
                type="button"
              >
                <span className="completed-archive-key">{task.key}</span>
                <strong>{task.title}</strong>
                <span>{company?.name || "Chưa chọn Seller"}</span>
                <small>
                  {archiveInfo.reason === "manual"
                    ? `Lưu trữ: ${archiveDate || completedDate || "chưa có ngày"}`
                    : `Hoàn thành: ${completedDate || "chưa có ngày"}`}
                </small>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="completed-archive-empty">
          Chưa có công việc nào trong mục đã hoàn tất.
        </p>
      )}
    </section>
  );
}

export default function TaskBoard({
  archiveTask,
  assignTask,
  chemicals,
  companies,
  columns,
  currentUser,
  deleteTask,
  draggedTaskId,
  dragTargetId,
  filteredTasks,
  labels,
  members,
  moveTask,
  now,
  openTask,
  setDraggedTaskId,
  setDragTargetId,
}) {
  return (
    <section className="board">
      {columns.map((column) => {
        const tasks = filteredTasks
          .map((task, index) => ({ index, task }))
          .filter(({ task }) => task.columnId === column.id)
          .sort((first, second) =>
            compareTasksByBoardPriority(first.task, second.task, now, first.index, second.index),
          )
          .map(({ task }) => task);

        return (
          <div
            className={`board-column ${dragTargetId === column.id ? "drag-over" : ""}`}
            key={column.id}
            onDragOver={(event) => {
              event.preventDefault();
              setDragTargetId(column.id);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragTargetId(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedTaskId) moveTask(draggedTaskId, column.id);
              setDraggedTaskId(null);
              setDragTargetId(null);
            }}
          >
            <div className="column-header">
              <div className="column-title">
                <span className="status-dot" style={{ backgroundColor: column.color }} />
                <h2>{column.title}</h2>
                <span className="count">{tasks.length}</span>
              </div>
              <span className="fixed-column-label">Quy trình</span>
            </div>
            <div className="task-list">
              {tasks.map((task) => (
                <TaskCard
                  archiveTask={archiveTask}
                  assignTask={assignTask}
                  chemicals={chemicals}
                  column={column}
                  companies={companies}
                  currentUser={currentUser}
                  deleteTask={deleteTask}
                  draggedTaskId={draggedTaskId}
                  key={task.id}
                  labels={labels}
                  members={members}
                  now={now}
                  openTask={openTask}
                  setDraggedTaskId={setDraggedTaskId}
                  setDragTargetId={setDragTargetId}
                  task={task}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
