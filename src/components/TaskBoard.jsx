import { Avatar, Icon, Priority, TypeIcon } from "./Common";
import { priorityColors } from "../data";

function TaskCard({ assignTask, chemicals, companies, currentUser, deleteTask, draggedTaskId, labels, members, openTask, setDragTargetId, setDraggedTaskId, task }) {
  const company = companies.find((item) => item.id === task.companyId);
  const isDone = task.columnId === "done";
  const taskColor = isDone ? "#1f845a" : priorityColors[task.priority];

  return (
    <article
      className={`task-card ${task.assignee === currentUser.name ? "task-card-personal" : ""} ${isDone ? "task-card-done" : ""} ${draggedTaskId === task.id ? "dragging" : ""}`}
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
          <TypeIcon type={task.type} />
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
              <small>Công ty</small>
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
      <label
        className="quick-assignee"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Avatar name={task.assignee} size="tiny" index={members.indexOf(task.assignee)} />
        <select
          aria-label={`Người nhận ${task.key}`}
          draggable="false"
          onChange={(event) => assignTask(task.id, event.target.value)}
          value={task.assignee}
        >
          {members.map((person) => <option key={person}>{person}</option>)}
        </select>
      </label>
      <div className="task-card-footer">
        <span className="task-key">{task.key}</span>
        <div className="task-meta">
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
  columnColors,
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
  setColumnDraft,
  setDraggedTaskId,
  setDragTargetId,
}) {
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
              {["todo", "done"].includes(column.id) ? (
                <span className="fixed-column-label">Cố định</span>
              ) : (
                <button className="plain-icon-button" onClick={() => setColumnDraft({ ...column })}>
                  <Icon name="more" size={16} />
                </button>
              )}
            </div>
            <div className="task-list">
              {tasks.map((task) => (
                <TaskCard
                  assignTask={assignTask}
                  chemicals={chemicals}
                  companies={companies}
                  currentUser={currentUser}
                  deleteTask={deleteTask}
                  draggedTaskId={draggedTaskId}
                  key={task.id}
                  labels={labels}
                  members={members}
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
      <button
        className="add-column-button"
        onClick={() => setColumnDraft({ isNew: true, title: "", color: columnColors[1] })}
      >
        <Icon name="plus" size={17} />Thêm cột
      </button>
    </section>
  );
}
