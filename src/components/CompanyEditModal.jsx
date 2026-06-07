import { useEffect, useState } from "react";
import { Icon } from "./Common";
import { RichTextEditor } from "./RichText";

export default function CompanyEditModal({ companyDraft, saveCompany, setCompanyDraft }) {
  const [isAccountUnlocked, setIsAccountUnlocked] = useState(false);

  useEffect(() => {
    setIsAccountUnlocked(!companyDraft?.id);
  }, [companyDraft?.id]);

  if (!companyDraft) return null;

  const isEditing = Boolean(companyDraft.id);

  return (
    <div className="modal-backdrop" onMouseDown={() => setCompanyDraft(null)}>
      <section className="small-modal company-edit-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">THÔNG TIN SELLER</p>
            <h2>{isEditing ? "Chỉnh sửa Seller" : "Thêm Seller"}</h2>
          </div>
          <button className="modal-icon" onClick={() => setCompanyDraft(null)}><Icon name="close" /></button>
        </header>
        <label className="field">
          <span>Tên Seller</span>
          <input
            autoFocus
            onChange={(event) => setCompanyDraft({ ...companyDraft, name: event.target.value })}
            placeholder="Ví dụ: Seller ABC"
            value={companyDraft.name}
          />
        </label>
        <label className="field">
          <span>Số tài khoản</span>
          <div className="locked-input">
            <input
              onChange={(event) => setCompanyDraft({ ...companyDraft, accountNumber: event.target.value })}
              placeholder="Nhập số tài khoản"
              readOnly={!isAccountUnlocked}
              value={companyDraft.accountNumber}
            />
            {isEditing && (
              <button
                aria-label={isAccountUnlocked ? "Khóa số tài khoản" : "Mở khóa số tài khoản"}
                onClick={() => setIsAccountUnlocked((current) => !current)}
                title={isAccountUnlocked ? "Khóa số tài khoản" : "Mở khóa để chỉnh sửa"}
                type="button"
              >
                <Icon name={isAccountUnlocked ? "unlock" : "lock"} size={15} />
              </button>
            )}
          </div>
        </label>
        <label className="field">
          <span>Địa chỉ office</span>
          <input
            onChange={(event) => setCompanyDraft({ ...companyDraft, officeAddress: event.target.value })}
            placeholder="Nhập địa chỉ office"
            value={companyDraft.officeAddress}
          />
        </label>
        <label className="field">
          <span>Địa chỉ producer</span>
          <input
            onChange={(event) => setCompanyDraft({ ...companyDraft, producerAddress: event.target.value })}
            placeholder="Nhập địa chỉ producer"
            value={companyDraft.producerAddress}
          />
        </label>
        <label className="field">
          <span>Mô tả</span>
          <RichTextEditor
            minHeight={92}
            onChange={(description) => setCompanyDraft({ ...companyDraft, description })}
            placeholder="Thông tin bổ sung về Seller"
            value={companyDraft.description}
          />
        </label>
        <footer>
          <span />
          <button className="secondary-button" onClick={() => setCompanyDraft(null)}>Hủy</button>
          <button className="primary-button" disabled={!companyDraft.name.trim()} onClick={() => saveCompany(companyDraft)}>
            {isEditing ? "Lưu thay đổi" : "Thêm Seller"}
          </button>
        </footer>
      </section>
    </div>
  );
}
