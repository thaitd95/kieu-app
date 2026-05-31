import { Avatar, Icon, TypeIcon } from "./Common";
import { RichTextEditor } from "./RichText";

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
            <label key={label}>
              <input
                checked={taskDraft.labels.includes(label)}
                onChange={() => toggleLabel(label)}
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="catalog-empty">Chưa có nhãn trong hệ thống. Hãy tạo nhãn tại tab Nhãn.</p>
      )}
    </div>
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
            <label className="field">
              <span>Trạng thái</span>
              <div
                className="status-select"
                style={{ "--status-color": selectedTaskColumn?.color || columnColors[0] }}
              >
                <span className="status-dot" />
                <select value={taskDraft.columnId} onChange={(event) => setTaskDraft({ ...taskDraft, columnId: event.target.value })}>
                  {data.columns.map((column) => <option value={column.id} key={column.id}>{column.title}</option>)}
                </select>
              </div>
            </label>
            <h3>Chi tiết</h3>
            <label className="field">
              <span>Loại công việc</span>
              <select value={taskDraft.type} onChange={(event) => setTaskDraft({ ...taskDraft, type: event.target.value })}>
                <option value="task">Task</option><option value="story">Story</option><option value="bug">Bug</option>
              </select>
            </label>
            <div className="field">
              <span>
                Người phụ trách
                {taskDraft.assignee === currentUser.name && <small className="personal-field-label">Việc của tôi</small>}
              </span>
              <select value={taskDraft.assignee} onChange={(event) => setTaskDraft({ ...taskDraft, assignee: event.target.value })}>
                {members.map((person) => <option key={person}>{person}</option>)}
              </select>
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
            <label className="field">
              <span>Công ty</span>
              <select value={taskDraft.companyId} onChange={(event) => setTaskDraft({ ...taskDraft, companyId: event.target.value })}>
                <option value="">Chưa chọn công ty</option>
                {data.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
              {data.companies.length === 0 && <small className="catalog-guidance">Hãy tạo công ty tại tab Công ty.</small>}
            </label>
            <ChemicalMultiSelect
              items={data.chemicals}
              setTaskDraft={setTaskDraft}
              taskDraft={taskDraft}
            />
            <label className="field">
              <span>Độ ưu tiên</span>
              <select value={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.value })}>
                <option value="highest">Cao nhất</option><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option>
              </select>
            </label>
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
