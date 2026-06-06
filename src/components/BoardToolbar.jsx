import { useEffect, useRef } from "react";
import { Icon } from "./Common";
import SelectDropdown from "./SelectDropdown";

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
  const labelFilterRef = useRef(null);
  const selectedChemicalItem = chemicals.find((chemical) => chemical.id === selectedChemical);

  useEffect(() => {
    if (!isLabelFilterOpen) return undefined;

    function handleOutsideClick(event) {
      if (!labelFilterRef.current?.contains(event.target)) {
        setIsLabelFilterOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [isLabelFilterOpen, setIsLabelFilterOpen]);

  return (
    <section className="toolbar">
      <div className="board-search">
        <Icon name="search" size={17} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm công việc..." />
      </div>
      <div className="label-filter" ref={labelFilterRef}>
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
      <div className="toolbar-select">
        <span>Seller</span>
        <SelectDropdown
          ariaLabel="Lọc theo Seller"
          onChange={setSelectedCompany}
          options={[
            { value: "", label: "Tất cả Seller" },
            ...companies.map((company) => ({ value: company.id, label: company.name })),
          ]}
          value={selectedCompany}
        />
      </div>
      <div className={`toolbar-select priority-filter-select ${selectedPriority ? "has-value" : ""}`}>
        <span>Ưu tiên</span>
        <SelectDropdown
          ariaLabel="Lọc theo độ ưu tiên"
          onChange={setSelectedPriority}
          options={[
            { value: "", label: "Tất cả mức" },
            { value: "low", label: "Thấp", color: "#0c66e4" },
            { value: "medium", label: "Trung bình", color: "#7f5f01" },
            { value: "high", label: "Cao", color: "#e06c00" },
            { value: "highest", label: "Cao nhất", color: "#c9372c" },
          ]}
          value={selectedPriority}
        />
      </div>
      <div
        className={`toolbar-select chemical-filter-select ${selectedChemicalItem ? "has-value" : ""}`}
        style={{ "--selected-chemical-color": selectedChemicalItem?.color || "#44546f" }}
      >
        <span>Hóa chất</span>
        <SelectDropdown
          ariaLabel="Lọc theo hóa chất"
          onChange={setSelectedChemical}
          options={[
            { value: "", label: "Tất cả hóa chất" },
            ...chemicals.map((chemical) => ({
              value: chemical.id,
              label: chemical.name,
              color: chemical.color,
            })),
          ]}
          value={selectedChemical}
        />
      </div>
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
