import { Icon } from "./Common";

export default function ColumnModal({ columnColors, columnDraft, deleteColumn, saveColumn, setColumnDraft }) {
  if (!columnDraft) return null;

  return (
    <div className="modal-backdrop" onMouseDown={() => setColumnDraft(null)}>
      <section className="small-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">TRẠNG THÁI CÔNG VIỆC</p><h2>{columnDraft.isNew ? "Thêm cột mới" : "Chỉnh sửa cột"}</h2></div><button className="modal-icon" onClick={() => setColumnDraft(null)}><Icon name="close" /></button></header>
        <label className="field">
          <span>Tên cột</span>
          <input autoFocus value={columnDraft.title} onChange={(event) => setColumnDraft({ ...columnDraft, title: event.target.value })} placeholder="Ví dụ: Kiểm thử" />
        </label>
        <div className="color-field">
          <span>Màu hiển thị <small>Chọn màu nhận diện cho trạng thái</small></span>
          <div className="color-options">
            {columnColors.map((color) => (
              <button
                aria-label={`Chọn màu ${color}`}
                aria-pressed={columnDraft.color === color}
                className={columnDraft.color === color ? "selected" : ""}
                key={color}
                onClick={() => setColumnDraft({ ...columnDraft, color })}
                style={{ backgroundColor: color }}
                title={color}
                type="button"
              >
                {columnDraft.color === color && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>
        <footer>
          {!columnDraft.isNew && <button className="delete-button" onClick={deleteColumn}><Icon name="trash" size={15} />Xóa cột</button>}
          <span />
          <button className="secondary-button" onClick={() => setColumnDraft(null)}>Hủy</button>
          <button className="primary-button" disabled={!columnDraft.title.trim()} onClick={saveColumn}>Lưu</button>
        </footer>
      </section>
    </div>
  );
}
