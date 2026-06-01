import { useEffect, useState } from "react";
import { Avatar, Icon, TypeIcon } from "./Common";
import { RichTextEditor } from "./RichText";
import SelectDropdown from "./SelectDropdown";

function ChemicalMultiSelect({ items, setTaskDraft, taskDraft }) {
  function toggleChemical(chemicalId) {
    setTaskDraft((current) => ({
      ...current,
      chemicals: current.chemicals.includes(chemicalId)
        ? current.chemicals.filter((item) => item !== chemicalId)
        : [...current.chemicals, chemicalId],
    }));
  }

  return (
    <div className="field">
      <span>Hóa chất <small>có thể chọn nhiều loại</small></span>
      {items.length > 0 ? (
        <div className="chemical-options">
          {items.map((chemical) => (
            <label key={chemical.id}>
              <input
                checked={taskDraft.chemicals.includes(chemical.id)}
                onChange={() => toggleChemical(chemical.id)}
                type="checkbox"
              />
              <i className="chemical-color-dot" style={{ backgroundColor: chemical.color }} />
              <span>{chemical.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="catalog-empty">Chưa có hóa chất trong hệ thống. Hãy tạo hóa chất tại tab Hóa chất.</p>
      )}
    </div>
  );
}

function LabelMultiSelect({ items, setTaskDraft, taskDraft }) {
  function toggleLabel(label) {
    setTaskDraft((current) => ({
      ...current,
      labels: current.labels.includes(label)
        ? current.labels.filter((item) => item !== label)
        : [...current.labels, label],
    }));
  }

  return (
    <div className="field">
      <span>Nhãn <small>có thể chọn nhiều nhãn</small></span>
      {items.length > 0 ? (
        <div className="chemical-options label-options">
          {items.map((label) => (
            <label key={label.name}>
              <input
                checked={taskDraft.labels.includes(label.name)}
                onChange={() => toggleLabel(label.name)}
                type="checkbox"
              />
              <i className="chemical-color-dot" style={{ backgroundColor: label.color }} />
              <span>{label.name}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="catalog-empty">Chưa có nhãn trong hệ thống. Hãy tạo nhãn tại tab Nhãn.</p>
      )}
    </div>
  );
}

function ObjectiveChecklist({ setTaskDraft, taskDraft }) {
  const [newObjectiveText, setNewObjectiveText] = useState("");
  const completedCount = taskDraft.objectives.filter((objective) => objective.completed).length;

  useEffect(() => {
    setNewObjectiveText("");
  }, [taskDraft.id]);

  function addObjective() {
    const text = newObjectiveText.trim();
    if (!text) return;

    setTaskDraft((current) => ({
      ...current,
      objectives: [
        ...current.objectives,
        {
          id: `${current.id}-objective-${Date.now()}-${current.objectives.length + 1}`,
          text,
          completed: false,
        },
      ],
    }));
    setNewObjectiveText("");
  }

  function updateObjective(objectiveId, changes) {
    setTaskDraft((current) => ({
      ...current,
      objectives: current.objectives.map((objective) =>
        objective.id === objectiveId ? { ...objective, ...changes } : objective,
      ),
    }));
  }

  function deleteObjective(objectiveId) {
    setTaskDraft((current) => ({
      ...current,
      objectives: current.objectives.filter((objective) => objective.id !== objectiveId),
    }));
  }

  return (
    <section className="objective-checklist">
      <div className="objective-checklist-header">
        <h3 className="section-title">Chỉ tiêu công việc</h3>
        <span>{completedCount}/{taskDraft.objectives.length} hoàn thành</span>
      </div>
      {taskDraft.objectives.length > 0 ? (
        <div className="objective-list">
          {taskDraft.objectives.map((objective) => (
            <div className={`objective-item ${objective.completed ? "completed" : ""}`} key={objective.id}>
              <input
                aria-label={`Đánh dấu chỉ tiêu ${objective.text}`}
                checked={objective.completed}
                onChange={(event) => updateObjective(objective.id, { completed: event.target.checked })}
                type="checkbox"
              />
              <input
                aria-label="Nội dung chỉ tiêu"
                onChange={(event) => updateObjective(objective.id, { text: event.target.value })}
                type="text"
                value={objective.text}
              />
              <button
                aria-label={`Xóa chỉ tiêu ${objective.text}`}
                onClick={() => deleteObjective(objective.id)}
                title="Xóa chỉ tiêu"
                type="button"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="objective-empty">Chưa có chỉ tiêu nào cho công việc này.</p>
      )}
      <div className="objective-add">
        <input
          onChange={(event) => setNewObjectiveText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addObjective();
            }
          }}
          placeholder="Thêm chỉ tiêu mới"
          type="text"
          value={newObjectiveText}
        />
        <button disabled={!newObjectiveText.trim()} onClick={addObjective} type="button">
          <Icon name="plus" size={14} />Thêm
        </button>
      </div>
    </section>
  );
}

export default function TaskModal({
  addAssignee,
  addComment,
  columnColors,
  commentText,
  currentUser,
  customMembers,
  data,
  deleteTask,
  members,
  newAssigneeName,
  removeAssignee,
  saveTask,
  selectedTaskId,
  setCommentText,
  setNewAssigneeName,
  setTaskDraft,
  taskDraft,
}) {
  if (!taskDraft) return null;

  const selectedTaskColumn = data.columns.find((column) => column.id === taskDraft.columnId);

  return (
    <div className="modal-backdrop" onMouseDown={() => setTaskDraft(null)}>
      <section className="task-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="task-modal-header">
          <div className="issue-path"><TypeIcon type={taskDraft.type} /><span>{taskDraft.key}</span><Icon name="chevron" size={13} /><span>{selectedTaskId === "new" ? "Tạo công việc" : "Chi tiết công việc"}</span></div>
          <div className="modal-header-actions">
            {selectedTaskId !== "new" && <button className="modal-icon danger-hover" onClick={deleteTask} title="Xóa công việc"><Icon name="trash" size={17} /></button>}
            <button className="modal-icon" onClick={() => setTaskDraft(null)}><Icon name="close" size={19} /></button>
          </div>
        </header>
        <div className="task-modal-body">
          <div className="task-main">
            <input
              autoFocus={selectedTaskId === "new"}
              className="title-input"
              onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })}
              placeholder="Ví dụ: Nhập Axit sulfuric từ Công ty ABC"
              value={taskDraft.title}
            />
            <div className="quick-actions">
              <button><Icon name="edit" size={15} />Chỉnh sửa</button>
              <button><Icon name="comment" size={15} />Thêm ghi chú</button>
            </div>
            <h3 className="section-title">Mô tả</h3>
            <RichTextEditor
              onChange={(description) => setTaskDraft({ ...taskDraft, description })}
              placeholder="Thêm mô tả chi tiết..."
              value={taskDraft.description}
            />
            <ObjectiveChecklist setTaskDraft={setTaskDraft} taskDraft={taskDraft} />
            <div className="activity-header">
              <h3 className="section-title">Hoạt động</h3>
              <button className="sort-button">Mới nhất <Icon name="down" size={13} /></button>
            </div>
            <div className="comment-compose">
              <Avatar name={currentUser.name} size="small" index={members.indexOf(currentUser.name)} />
              <div className="comment-box">
                <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Thêm ghi chú..." rows="2" />
                <div className="comment-compose-footer">
                  <span>Ghi chú sẽ hiển thị với mọi thành viên</span>
                  <button onClick={addComment}>Thêm</button>
                </div>
              </div>
            </div>
            <div className="comment-list">
              {[...taskDraft.comments].reverse().map((comment) => (
                <div className="comment" key={comment.id}>
                  <Avatar name={comment.author} size="small" index={members.indexOf(comment.author)} />
                  <div>
                    <p className="comment-author"><strong>{comment.author}</strong><span>{comment.createdAt}</span></p>
                    <p className="comment-text">{comment.text}</p>
                    <button className="comment-action">Phản hồi</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="task-details">
            <div className="field">
              <span>Trạng thái</span>
              <SelectDropdown
                ariaLabel="Trạng thái công việc"
                className="status-select"
                onChange={(columnId) => setTaskDraft({ ...taskDraft, columnId })}
                options={data.columns.map((column) => ({
                  value: column.id,
                  label: column.title,
                  color: column.color,
                }))}
                style={{ "--status-color": selectedTaskColumn?.color || columnColors[0] }}
                value={taskDraft.columnId}
              />
            </div>
            <h3>Chi tiết</h3>
            <div className="field">
              <span>Loại công việc</span>
              <SelectDropdown
                ariaLabel="Loại công việc"
                onChange={(type) => setTaskDraft({ ...taskDraft, type })}
                options={[
                  { value: "task", label: "Task", color: "#0c66e4" },
                  { value: "story", label: "Story", color: "#22a06b" },
                  { value: "bug", label: "Bug", color: "#c9372c" },
                ]}
                value={taskDraft.type}
              />
            </div>
            <div className="field">
              <span>
                Người phụ trách
                {taskDraft.assignee === currentUser.name && <small className="personal-field-label">Việc của tôi</small>}
              </span>
              <SelectDropdown
                ariaLabel="Người phụ trách"
                onChange={(assignee) => setTaskDraft({ ...taskDraft, assignee })}
                options={members.map((person) => ({ value: person, label: person }))}
                value={taskDraft.assignee}
              />
              <div className="add-assignee">
                <input
                  onChange={(event) => setNewAssigneeName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addAssignee();
                    }
                  }}
                  placeholder="Thêm người nhận mới"
                  value={newAssigneeName}
                />
                <button disabled={!newAssigneeName.trim()} onClick={addAssignee} type="button">
                  <Icon name="plus" size={14} />Thêm
                </button>
              </div>
              {customMembers.length > 0 && (
                <div className="custom-assignee-list">
                  {customMembers.map((person) => (
                    <span key={person}>
                      {person}
                      <button
                        aria-label={`Xóa người phụ trách ${person}`}
                        onClick={() => removeAssignee(person)}
                        title={`Xóa ${person}`}
                        type="button"
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="field">
              <span>Công ty</span>
              <SelectDropdown
                ariaLabel="Công ty"
                onChange={(companyId) => setTaskDraft({ ...taskDraft, companyId })}
                options={[
                  { value: "", label: "Chưa chọn công ty" },
                  ...data.companies.map((company) => ({ value: company.id, label: company.name })),
                ]}
                value={taskDraft.companyId}
              />
              {data.companies.length === 0 && <small className="catalog-guidance">Hãy tạo công ty tại tab Công ty.</small>}
            </div>
            <ChemicalMultiSelect
              items={data.chemicals}
              setTaskDraft={setTaskDraft}
              taskDraft={taskDraft}
            />
            <div className="field">
              <span>Độ ưu tiên</span>
              <SelectDropdown
                ariaLabel="Độ ưu tiên"
                onChange={(priority) => setTaskDraft({ ...taskDraft, priority })}
                options={[
                  { value: "highest", label: "Cao nhất", color: "#c9372c" },
                  { value: "high", label: "Cao", color: "#e06c00" },
                  { value: "medium", label: "Trung bình", color: "#7f5f01" },
                  { value: "low", label: "Thấp", color: "#0c66e4" },
                ]}
                value={taskDraft.priority}
              />
            </div>
            <label className="field">
              <span>Ngày hết hạn</span>
              <input type="date" value={taskDraft.dueDate} onChange={(event) => setTaskDraft({ ...taskDraft, dueDate: event.target.value })} />
            </label>
            <LabelMultiSelect items={data.labels} setTaskDraft={setTaskDraft} taskDraft={taskDraft} />
          </aside>
        </div>
        <footer className="task-modal-footer">
          <button className="secondary-button" onClick={() => setTaskDraft(null)}>Hủy</button>
          <button className="primary-button" disabled={!taskDraft.title.trim()} onClick={saveTask}>{selectedTaskId === "new" ? "Tạo công việc" : "Lưu thay đổi"}</button>
        </footer>
      </section>
    </div>
  );
}
