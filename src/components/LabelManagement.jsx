import { useState } from "react";
import { Icon } from "./Common";

export default function LabelManagement({ addLabel, deleteLabel, labels, renameLabel, tasks }) {
  const [newLabelName, setNewLabelName] = useState("");
  const [editingLabel, setEditingLabel] = useState("");
  const [editingName, setEditingName] = useState("");

  function createLabel() {
    if (addLabel(newLabelName)) setNewLabelName("");
  }

  function startEditing(label) {
    setEditingLabel(label);
    setEditingName(label);
  }

  function saveEditing() {
    if (renameLabel(editingLabel, editingName)) {
      setEditingLabel("");
      setEditingName("");
    }
  }

  return (
    <section className="chemical-management">
      <header className="chemical-page-header">
        <div>
          <p className="eyebrow">DANH MỤC HỆ THỐNG</p>
          <h1>Nhãn</h1>
          <p className="subtitle">Quản lý danh mục nhãn dùng chung để phân loại công việc.</p>
        </div>
      </header>

      <div className="chemical-page-content">
        <section className="chemical-create-panel">
          <h2>Thêm nhãn</h2>
          <p>Tạo nhãn trước khi lựa chọn trong chi tiết công việc.</p>
          <label className="field">
            <span>Tên nhãn</span>
            <input
              autoFocus
              onChange={(event) => setNewLabelName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  createLabel();
                }
              }}
              placeholder="Ví dụ: Hàng ưu tiên"
              value={newLabelName}
            />
          </label>
          <button className="primary-button chemical-create-button" disabled={!newLabelName.trim()} onClick={createLabel} type="button">
            <Icon name="plus" size={15} />Thêm nhãn
          </button>
        </section>

        <section className="chemical-list-panel">
          <div className="chemical-list-header">
            <div>
              <h2>Danh sách nhãn</h2>
              <p>{labels.length} nhãn trong hệ thống</p>
            </div>
          </div>
          {labels.length > 0 ? (
            <div className="label-system-list">
              {labels.map((label) => {
                const taskCount = tasks.filter((task) => task.labels.includes(label)).length;
                const isEditing = editingLabel === label;

                return (
                  <article className="label-system-item" key={label}>
                    {isEditing ? (
                      <input
                        autoFocus
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveEditing();
                          if (event.key === "Escape") setEditingLabel("");
                        }}
                        value={editingName}
                      />
                    ) : (
                      <strong>{label}</strong>
                    )}
                    <span>{taskCount} công việc đang sử dụng</span>
                    <div className="label-system-actions">
                      {isEditing ? (
                        <>
                          <button className="company-edit-button" disabled={!editingName.trim()} onClick={saveEditing} title="Lưu tên nhãn" type="button">
                            <Icon name="check" size={14} />
                          </button>
                          <button className="company-edit-button" onClick={() => setEditingLabel("")} title="Hủy chỉnh sửa" type="button">
                            <Icon name="close" size={14} />
                          </button>
                        </>
                      ) : (
                        <button className="company-edit-button" onClick={() => startEditing(label)} title={`Sửa ${label}`} type="button">
                          <Icon name="edit" size={14} />
                        </button>
                      )}
                      <button
                        className="chemical-delete-button"
                        disabled={taskCount > 0}
                        onClick={() => deleteLabel(label)}
                        title={taskCount > 0 ? "Không thể xóa nhãn đang được sử dụng" : `Xóa ${label}`}
                        type="button"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="chemical-system-empty">
              <Icon name="tag" size={28} />
              <strong>Chưa có nhãn</strong>
              <span>Thêm nhãn đầu tiên để sử dụng trong bảng công việc.</span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
