import { Avatar, Icon } from "./Common";

export function Sidebar({ activeView, currentUser, members, setActiveView }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon"><Icon name="logo" size={21} /></span>
        <span>Taskflow</span>
      </div>
      <nav className="sidebar-nav">
        <button className={`nav-item ${activeView === "board" ? "active" : ""}`} onClick={() => setActiveView("board")}><Icon name="board" />Bảng công việc</button>
        <button className={`nav-item ${activeView === "chemicals" ? "active" : ""}`} onClick={() => setActiveView("chemicals")}><Icon name="flask" />Hóa chất</button>
        <button className={`nav-item ${activeView === "companies" ? "active" : ""}`} onClick={() => setActiveView("companies")}><Icon name="building" />Công ty</button>
        <button className={`nav-item ${activeView === "labels" ? "active" : ""}`} onClick={() => setActiveView("labels")}><Icon name="tag" />Nhãn</button>
        <a className="nav-item" href="#"><Icon name="timeline" />Lộ trình</a>
        <a className="nav-item" href="#"><Icon name="report" />Báo cáo</a>
        <a className="nav-item" href="#"><Icon name="setting" />Cài đặt dự án</a>
      </nav>
      <div className="sidebar-project">
        <p>DỰ ÁN</p>
        <div className="project-chip">
          <span className="project-symbol">TF</span>
          <span><strong>Taskflow Web</strong><small>Software project</small></span>
        </div>
      </div>
      <div className="sidebar-footer">
        <Avatar name={currentUser.name} index={members.indexOf(currentUser.name)} />
        <span><strong>{currentUser.name}</strong><small>{currentUser.role}</small></span>
        <Icon name="more" size={16} />
      </div>
    </aside>
  );
}

export function Topbar({ currentUser, members, search, setSearch }) {
  return (
    <header className="topbar">
      <div className="breadcrumbs"><span>Dự án</span><Icon name="chevron" size={14} /><strong>Taskflow Web</strong></div>
      <div className="topbar-actions">
        <label className="search-box"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kiếm" /></label>
        <button className="icon-button"><Icon name="grid" size={18} /></button>
        <button className="icon-button has-notification"><Icon name="comment" size={18} /></button>
        <Avatar name={currentUser.name} size="small" index={members.indexOf(currentUser.name)} />
      </div>
    </header>
  );
}

export function BoardHeader({ startNewTask }) {
  return (
    <section className="board-header">
      <div>
        <p className="eyebrow">TASKFLOW WEB</p>
        <h1>Bảng công việc</h1>
        <p className="subtitle">Theo dõi tiến độ nhập hóa chất từ các công ty.</p>
      </div>
      <button className="primary-button" onClick={() => startNewTask()}><Icon name="plus" size={17} />Tạo công việc</button>
    </section>
  );
}
