import { createLeadTimeRows, createPaymentRows, REPORT_TYPES } from "../reportData";
import { Icon } from "./Common";

export default function ReportManagement({ data, exportingType, onExportReport }) {
  const reports = [
    {
      type: REPORT_TYPES.leadTime,
      title: "Lead time records",
      description: "Các PO đã hoàn thành và thời gian thực tế giữa các mốc.",
      count: `${createLeadTimeRows(data).length} PO đủ điều kiện`,
    },
    {
      type: REPORT_TYPES.payment,
      title: "Báo cáo thanh toán",
      description: "Các PO chưa thanh toán, đã sắp theo mức độ cần ưu tiên.",
      count: `${createPaymentRows(data).length} PO đang theo dõi`,
    },
  ];

  return (
    <section className="report-management">
      <header className="chemical-page-header">
        <div>
          <p className="eyebrow">BÁO CÁO VẬN HÀNH</p>
          <h1>Báo cáo</h1>
          <p className="subtitle">Xuất dữ liệu lead time và lịch thanh toán thành file Excel.</p>
        </div>
      </header>
      <div className="report-grid">
        {reports.map((report) => (
          <article className="report-card" key={report.type}>
            <span className="report-card-icon"><Icon name="report" size={23} /></span>
            <div>
              <h2>{report.title}</h2>
              <p>{report.description}</p>
              <strong>{report.count}</strong>
            </div>
            <button
              className="primary-button"
              disabled={Boolean(exportingType)}
              onClick={() => onExportReport(report.type)}
              type="button"
            >
              <Icon name="download" size={16} />
              {exportingType === report.type ? "Đang tạo file..." : "Xuất Excel"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
