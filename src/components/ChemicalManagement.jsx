import { Icon } from "./Common";

export default function ChemicalManagement({
  addChemical,
  chemicalColors,
  chemicals,
  deleteChemical,
  newChemicalColor,
  newChemicalName,
  setNewChemicalColor,
  setNewChemicalName,
  tasks,
}) {
  return (
    <section className="chemical-management">
      <header className="chemical-page-header">
        <div>
          <p className="eyebrow">DANH MỤC HỆ THỐNG</p>
          <h1>Hóa chất</h1>
          <p className="subtitle">Tạo danh mục hóa chất dùng chung để lựa chọn khi lập công việc nhập hàng.</p>
        </div>
      </header>

      <div className="chemical-page-content">
        <section className="chemical-create-panel">
          <h2>Thêm hóa chất</h2>
          <p>Đặt tên và chọn màu nhận diện cho hóa chất trong hệ thống.</p>
          <label className="field">
            <span>Tên hóa chất</span>
            <input
              autoFocus
              onChange={(event) => setNewChemicalName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addChemical();
                }
              }}
              placeholder="Ví dụ: Axit sulfuric"
              value={newChemicalName}
            />
          </label>
          <div className="chemical-color-field">
            <small>Màu hiển thị</small>
            <div className="chemical-color-options">
              {chemicalColors.map((color) => (
                <button
                  aria-label={`Chọn màu ${color}`}
                  aria-pressed={newChemicalColor === color}
                  className={newChemicalColor === color ? "selected" : ""}
                  key={color}
                  onClick={() => setNewChemicalColor(color)}
                  style={{ backgroundColor: color }}
                  type="button"
                />
              ))}
            </div>
          </div>
          <button className="primary-button chemical-create-button" disabled={!newChemicalName.trim()} onClick={addChemical} type="button">
            <Icon name="plus" size={15} />Thêm hóa chất
          </button>
        </section>

        <section className="chemical-list-panel">
          <div className="chemical-list-header">
            <div>
              <h2>Danh sách hóa chất</h2>
              <p>{chemicals.length} hóa chất trong hệ thống</p>
            </div>
          </div>
          {chemicals.length > 0 ? (
            <div className="chemical-system-list">
              {chemicals.map((chemical) => {
                const taskCount = tasks.filter((task) => task.chemicals.includes(chemical.id)).length;

                return (
                  <article className="chemical-system-item" key={chemical.id}>
                    <i className="chemical-system-color" style={{ backgroundColor: chemical.color }} />
                    <div>
                      <strong>{chemical.name}</strong>
                      <span>{taskCount} công việc đang sử dụng</span>
                    </div>
                    <button
                      aria-label={`Xóa hóa chất ${chemical.name}`}
                      className="chemical-delete-button"
                      disabled={taskCount > 0}
                      onClick={() => deleteChemical(chemical.id)}
                      title={taskCount > 0 ? "Không thể xóa hóa chất đang được sử dụng" : `Xóa ${chemical.name}`}
                      type="button"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="chemical-system-empty">
              <Icon name="flask" size={28} />
              <strong>Chưa có hóa chất</strong>
              <span>Thêm hóa chất đầu tiên để sử dụng trong bảng công việc.</span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
