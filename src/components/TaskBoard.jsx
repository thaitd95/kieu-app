import { Avatar, Icon, Priority, TypeIcon } from "./Common";

function TaskCard({ assignTask, chemicals, companies, currentUser, draggedTaskId, members, openTask, setDragTargetId, setDraggedTaskId, task }) {
  const company = companies.find((item) => item.id === task.companyId);

  return (
    <article
      className={`task-card ${task.assignee === currentUser.name ? "task-card-personal" : ""} ${draggedTaskId === task.id ? "dragging" : ""}`}
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
    >
      <div className="task-card-top">
        <div className="task-card-markers">
          <TypeIcon type={task.type} />
          {task.assignee === currentUser.name && <span className="my-task-badge">Việc của tôi</span>}
        </div>
        <button className="task-more" onClick={(event) => event.stopPropagation()}><Icon name="more" size={15} /></button>
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
        {task.labels.slice(0, 2).map((label) => <span key={label}>{label}</span>)}
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
  draggedTaskId,
  dragTargetId,
  filteredTasks,
  members,
  moveTask,
  openTask,
  setColumnDraft,
  setDraggedTaskId,
  setDragTargetId,
  startNewTask,
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
              <button className="plain-icon-button" onClick={() => setColumnDraft({ ...column })}><Icon name="more" size={16} /></button>
            </div>
            <div className="task-list">
              {tasks.map((task) => (
                <TaskCard
                  assignTask={assignTask}
                  chemicals={chemicals}
                  companies={companies}
                  currentUser={currentUser}
                  draggedTaskId={draggedTaskId}
                  key={task.id}
                  members={members}
                  openTask={openTask}
                  setDraggedTaskId={setDraggedTaskId}
                  setDragTargetId={setDragTargetId}
                  task={task}
                />
              ))}
              <button className="add-task-button" onClick={() => startNewTask(column.id)}><Icon name="plus" size={15} />Tạo công việc</button>
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
