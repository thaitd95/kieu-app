import { Icon } from "./Common";
import { RichTextContent } from "./RichText";

export default function CompanyManagement({
  companies,
  deleteCompany,
  setEditingCompanyDraft,
  tasks,
}) {
  return (
    <section className="chemical-management">
      <header className="chemical-page-header">
        <div>
          <p className="eyebrow">DANH MỤC HỆ THỐNG</p>
          <h1>Công ty</h1>
          <p className="subtitle">Quản lý thông tin công ty cung cấp hóa chất dùng trong bảng công việc.</p>
        </div>
      </header>

      <div className="company-page-content">
        <section className="chemical-list-panel">
          <div className="chemical-list-header">
            <div>
              <h2>Danh sách công ty</h2>
              <p>{companies.length} công ty trong hệ thống</p>
            </div>
            <button className="primary-button" onClick={() => setEditingCompanyDraft({ name: "", address: "", description: "" })} type="button">
              <Icon name="plus" size={15} />Thêm công ty
            </button>
          </div>
          {companies.length > 0 ? (
            <div className="company-system-list">
              {companies.map((company) => {
                const taskCount = tasks.filter((task) => task.companyId === company.id).length;

                return (
                  <article className="company-system-item" key={company.id}>
                    <div className="company-system-main">
                      <div>
                        <strong>{company.name}</strong>
                        <span>{company.address || "Chưa có địa chỉ"}</span>
                      </div>
                      <RichTextContent className="company-system-description" fallback="Chưa có mô tả." value={company.description} />
                    </div>
                    <div className="company-system-footer">
                      <span>{taskCount} công việc đang sử dụng</span>
                      <div>
                        <button className="company-edit-button" onClick={() => setEditingCompanyDraft({ ...company })} title={`Sửa ${company.name}`} type="button">
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          className="chemical-delete-button"
                          disabled={taskCount > 0}
                          onClick={() => deleteCompany(company.id)}
                          title={taskCount > 0 ? "Không thể xóa công ty đang được sử dụng" : `Xóa ${company.name}`}
                          type="button"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="chemical-system-empty">
              <Icon name="building" size={28} />
              <strong>Chưa có công ty</strong>
              <span>Thêm công ty đầu tiên để sử dụng trong bảng công việc.</span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
