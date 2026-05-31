import { Icon } from "./Common";

export default function BoardToolbar({
  availableLabels,
  chemicals,
  companies,
  isLabelFilterOpen,
  search,
  selectedChemical,
  selectedCompany,
  selectedLabels,
  selectedPriority,
  setIsLabelFilterOpen,
  setSearch,
  setSelectedChemical,
  setSelectedCompany,
  setSelectedLabels,
  setSelectedPriority,
  setShowMyTasks,
  showMyTasks,
  toggleLabelFilter,
}) {
  const selectedChemicalItem = chemicals.find((chemical) => chemical.id === selectedChemical);

  return (
    <section className="toolbar">
      <div className="board-search">
        <Icon name="search" size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm công việc..." />
      </div>
      <div className="label-filter">
        <button
          aria-expanded={isLabelFilterOpen}
          className={`toolbar-button ${selectedLabels.length > 0 ? "active" : ""}`}
          onClick={() => setIsLabelFilterOpen((current) => !current)}
          type="button"
        >
          <Icon name="filter" size={16} />
          Bộ lọc
          {selectedLabels.length > 0 && <span className="filter-count">{selectedLabels.length}</span>}
        </button>
        {isLabelFilterOpen && (
          <div className="label-filter-menu">
            <div className="label-filter-header">
              <strong>Lọc theo nhãn</strong>
              {selectedLabels.length > 0 && (
                <button onClick={() => setSelectedLabels([])} type="button">Xóa lọc</button>
              )}
            </div>
            {availableLabels.length > 0 ? (
              <div className="label-filter-options">
                {availableLabels.map((label) => (
                  <label key={label.name}>
                    <input
                      checked={selectedLabels.includes(label.name)}
                      onChange={() => toggleLabelFilter(label.name)}
                      type="checkbox"
                    />
                    <i className="label-color-dot" style={{ backgroundColor: label.color }} />
                    <span>{label.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="label-filter-empty">Chưa có nhãn nào.</p>
            )}
          </div>
        )}
      </div>
      <label className="toolbar-select">
        <span>Công ty</span>
        <select value={selectedCompany} onChange={(event) => setSelectedCompany(event.target.value)}>
          <option value="">Tất cả công ty</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </label>
      <label className={`toolbar-select priority-filter-select ${selectedPriority ? "has-value" : ""}`}>
        <span>Ưu tiên</span>
        <select value={selectedPriority} onChange={(event) => setSelectedPriority(event.target.value)}>
          <option value="">Tất cả mức</option>
          <option value="low">Thấp</option>
          <option value="medium">Trung bình</option>
          <option value="high">Cao</option>
          <option value="highest">Cao nhất</option>
        </select>
      </label>
      <label
        className={`toolbar-select chemical-filter-select ${selectedChemicalItem ? "has-value" : ""}`}
        style={{ "--selected-chemical-color": selectedChemicalItem?.color || "#44546f" }}
      >
        <span>Hóa chất</span>
        {selectedChemicalItem && <i className="toolbar-chemical-dot" />}
        <select value={selectedChemical} onChange={(event) => setSelectedChemical(event.target.value)}>
          <option value="">Tất cả hóa chất</option>
          {chemicals.map((chemical) => (
            <option key={chemical.id} style={{ color: chemical.color }} value={chemical.id}>
              {chemical.name}
            </option>
          ))}
        </select>
      </label>
      <button
        aria-pressed={showMyTasks}
        className={`toolbar-button ${showMyTasks ? "active" : ""}`}
        onClick={() => setShowMyTasks((current) => !current)}
        type="button"
      >
        Công việc của tôi
      </button>
      <button className="toolbar-button icon-only"><Icon name="more" size={17} /></button>
    </section>
  );
}
