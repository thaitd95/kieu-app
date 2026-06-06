import { useEffect, useState } from "react";
import { Avatar, Icon, Priority } from "./Common";
import { priorityColors } from "../data";
import { getDeadlineInfo } from "../deadline";
import SelectDropdown from "./SelectDropdown";

function TaskCard({ assignTask, chemicals, column, companies, currentUser, deleteTask, draggedTaskId, labels, members, now, openTask, setDragTargetId, setDraggedTaskId, task }) {
  const company = companies.find((item) => item.id === task.companyId);
  const taskColor = priorityColors[task.priority];
  const columnDeadlineInfo = getDeadlineInfo(task.columnDueDates?.[task.columnId], now);
  const taskDeadlineInfo = getDeadlineInfo(task.dueDate, now);

  return (
    <article
      className={`task-card ${task.assignee === currentUser.name ? "task-card-personal" : ""} ${task.priority === "low" ? "task-card-low-priority" : ""} ${draggedTaskId === task.id ? "dragging" : ""}`}
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
          {(columnDeadlineInfo || taskDeadlineInfo) && (
            <span className="deadline-list">
              {columnDeadlineInfo && (
                <span className={`deadline ${columnDeadlineInfo.isOverdue ? "deadline-overdue" : ""}`}>
                  {column.title}: {columnDeadlineInfo.label}
                </span>
              )}
              {taskDeadlineInfo && (
                <span className={`deadline deadline-overall ${taskDeadlineInfo.isOverdue ? "deadline-overdue" : ""}`}>
                  Tổng: {taskDeadlineInfo.label}
                </span>
              )}
            </span>
          )}
          {task.comments.length > 0 && <span className="comment-count"><Icon name="comment" size={13} />{task.comments.length}</span>}
          <Priority value={task.priority} />
        </div>
      </div>
    </article>
  );
}

export default function TaskBoard({
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
  openTask,
  setDraggedTaskId,
  setDragTargetId,
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 60 * 1000);

    return () => window.clearInterval(timerId);
  }, []);

  return (
    <section className="board">
      {columns.map((column) => {
        const tasks = filteredTasks.filter((task) => task.columnId === column.id);

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
