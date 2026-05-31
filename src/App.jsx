import { useEffect, useMemo, useState } from "react";
import BoardToolbar from "./components/BoardToolbar";
import ChemicalManagement from "./components/ChemicalManagement";
import ColumnModal from "./components/ColumnModal";
import CompanyEditModal from "./components/CompanyEditModal";
import CompanyManagement from "./components/CompanyManagement";
import LabelManagement from "./components/LabelManagement";
import { BoardHeader, Sidebar, Topbar } from "./components/Layout";
import TaskBoard from "./components/TaskBoard";
import TaskModal from "./components/TaskModal";
import { chemicalColors, columnColors, currentUser, defaultChemicalColor, defaultMembers, initialData } from "./data";
import { loadInitialData, saveStoredData } from "./db";
import { normalizeData } from "./model";
import { sanitizeRichText, stripRichText } from "./richText";

function App() {
  const [data, setData] = useState(null);
  const [isDataReady, setIsDataReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState("board");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskDraft, setTaskDraft] = useState(null);
  const [columnDraft, setColumnDraft] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragTargetId, setDragTargetId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [newAssigneeName, setNewAssigneeName] = useState("");
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [isLabelFilterOpen, setIsLabelFilterOpen] = useState(false);
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedChemical, setSelectedChemical] = useState("");
  const [newChemicalName, setNewChemicalName] = useState("");
  const [newChemicalColor, setNewChemicalColor] = useState(defaultChemicalColor);
  const [editingCompanyDraft, setEditingCompanyDraft] = useState(null);

  useEffect(() => {
    let isActive = true;

    loadInitialData(initialData)
      .then((storedData) => {
        if (!isActive) return;
        setData(normalizeData(storedData));
        setIsDataReady(true);
      })
      .catch(() => {
        if (isActive) setStorageError("Không thể mở cơ sở dữ liệu cục bộ IndexedDB.");
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isDataReady || !data) return;

    saveStoredData(data).catch(() => {
      setStorageError("Không thể lưu dữ liệu vào IndexedDB.");
    });
  }, [data, isDataReady]);

  const members = data?.members || defaultMembers;
  const customMembers = members.filter((person) => person !== currentUser.name);
  const availableLabels = useMemo(
    () => [...(data?.labels || [])].sort((first, second) => first.localeCompare(second)),
    [data?.labels],
  );
  const filteredTasks = useMemo(() => {
    if (!data) return [];

    const query = search.trim().toLowerCase();

    return data.tasks.filter((task) => {
      const company = data.companies.find((item) => item.id === task.companyId);
      const chemicalNames = task.chemicals
        .map((chemicalId) => data.chemicals.find((chemical) => chemical.id === chemicalId)?.name || "")
        .join(" ");
      const matchesSearch =
        !query ||
        `${task.title} ${task.key} ${task.assignee} ${company?.name || ""} ${chemicalNames} ${stripRichText(task.description)} ${task.labels.join(" ")}`
          .toLowerCase()
          .includes(query);
      const matchesLabels =
        selectedLabels.length === 0 || selectedLabels.some((label) => task.labels.includes(label));
      const matchesAssignee = !showMyTasks || task.assignee === currentUser.name;
      const matchesCompany = !selectedCompany || task.companyId === selectedCompany;
      const matchesChemical = !selectedChemical || task.chemicals.includes(selectedChemical);

      return matchesSearch && matchesLabels && matchesAssignee && matchesCompany && matchesChemical;
    });
  }, [data?.tasks, data?.chemicals, data?.companies, search, selectedLabels, showMyTasks, selectedCompany, selectedChemical]);

  if (storageError) {
    return <div className="storage-state storage-state-error">{storageError}</div>;
  }

  if (!isDataReady || !data) {
    return <div className="storage-state">Đang tải dữ liệu...</div>;
  }

  function updateData(updater) {
    setData((current) => updater(current));
  }

  function resetTaskInputs() {
    setCommentText("");
    setNewAssigneeName("");
    setNewChemicalName("");
    setNewChemicalColor(defaultChemicalColor);
  }

  function openTask(task) {
    setSelectedTaskId(task.id);
    setTaskDraft({ ...task, labels: [...task.labels] });
    resetTaskInputs();
  }

  function startNewTask(columnId = data.columns[0]?.id) {
    const sequence = Math.max(130, ...data.tasks.map((task) => Number(task.key.split("-")[1]) || 0)) + 1;

    setSelectedTaskId("new");
    setTaskDraft({
      id: `task-${Date.now()}`,
      key: `TF-${sequence}`,
      title: "",
      description: "",
      type: "task",
      priority: "medium",
      assignee: currentUser.name,
      dueDate: "",
      labels: [],
      companyId: "",
      chemicals: [],
      columnId,
      comments: [],
    });
    resetTaskInputs();
  }

  function saveTask() {
    if (!taskDraft.title.trim()) return;

    const normalized = {
      ...taskDraft,
      title: taskDraft.title.trim(),
      description: sanitizeRichText(taskDraft.description),
      labels: [...new Set(taskDraft.labels.filter((label) => data.labels.includes(label)))],
    };

    updateData((current) => ({
      ...current,
      tasks:
        selectedTaskId === "new"
          ? [...current.tasks, normalized]
          : current.tasks.map((task) => (task.id === normalized.id ? normalized : task)),
    }));
    setSelectedTaskId(null);
    setTaskDraft(null);
  }

  function deleteTask() {
    if (!taskDraft || !window.confirm(`Xóa công việc ${taskDraft.key}?`)) return;

    updateData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskDraft.id),
    }));
    setSelectedTaskId(null);
    setTaskDraft(null);
  }

  function saveColumn() {
    if (!columnDraft?.title.trim()) return;

    if (columnDraft.isNew) {
      updateData((current) => ({
        ...current,
        columns: [
          ...current.columns,
          { id: `column-${Date.now()}`, title: columnDraft.title.trim(), color: columnDraft.color },
        ],
      }));
    } else {
      updateData((current) => ({
        ...current,
        columns: current.columns.map((column) =>
          column.id === columnDraft.id
            ? { ...column, title: columnDraft.title.trim(), color: columnDraft.color }
            : column,
        ),
      }));
    }
    setColumnDraft(null);
  }

  function deleteColumn() {
    if (!columnDraft || columnDraft.isNew) return;

    const taskCount = data.tasks.filter((task) => task.columnId === columnDraft.id).length;
    if (taskCount > 0) {
      window.alert("Chỉ có thể xóa cột không chứa công việc. Hãy di chuyển các công việc trước.");
      return;
    }

    updateData((current) => ({
      ...current,
      columns: current.columns.filter((column) => column.id !== columnDraft.id),
    }));
    setColumnDraft(null);
  }

  function moveTask(taskId, columnId) {
    updateData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, columnId } : task)),
    }));
  }

  function assignTask(taskId, assignee) {
    updateData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, assignee } : task)),
    }));
  }

  function addAssignee() {
    const name = newAssigneeName.trim();
    if (!name) return;

    updateData((current) => ({
      ...current,
      members: current.members?.includes(name) ? current.members : [...(current.members || defaultMembers), name],
    }));
    setTaskDraft((current) => ({ ...current, assignee: name }));
    setNewAssigneeName("");
  }

  function removeAssignee(name) {
    if (!customMembers.includes(name) || !window.confirm(`Xóa người phụ trách ${name}?`)) return;

    updateData((current) => ({
      ...current,
      members: (current.members || defaultMembers).filter((person) => person !== name),
      tasks: current.tasks.map((task) =>
        task.assignee === name ? { ...task, assignee: currentUser.name } : task,
      ),
    }));
    setTaskDraft((current) =>
      current?.assignee === name ? { ...current, assignee: currentUser.name } : current,
    );
  }

  function addChemical() {
    const name = newChemicalName.trim();
    if (!name) return;

    const existing = data.chemicals.find(
      (chemical) => chemical.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
    );
    const chemical = existing || {
      id: `chemical-${Date.now()}`,
      name,
      color: newChemicalColor,
    };

    updateData((current) => ({
      ...current,
      chemicals: existing ? current.chemicals : [...current.chemicals, chemical],
    }));
    setNewChemicalName("");
    setNewChemicalColor(defaultChemicalColor);
  }

  function deleteChemical(chemicalId) {
    const chemical = data.chemicals.find((item) => item.id === chemicalId);
    if (!chemical) return;

    const isUsed = data.tasks.some((task) => task.chemicals.includes(chemicalId));
    if (isUsed) {
      window.alert("Không thể xóa hóa chất đang được sử dụng trong công việc.");
      return;
    }
    if (!window.confirm(`Xóa hóa chất ${chemical.name}?`)) return;

    updateData((current) => ({
      ...current,
      chemicals: current.chemicals.filter((item) => item.id !== chemicalId),
    }));
    if (selectedChemical === chemicalId) setSelectedChemical("");
  }

  function saveCompany(draft) {
    const name = draft.name.trim();
    if (!name) return;

    const duplicate = data.companies.find(
      (company) =>
        company.id !== draft.id &&
        company.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
    );
    if (duplicate) {
      window.alert("Tên công ty đã tồn tại trong hệ thống.");
      return;
    }

    const normalized = {
      ...draft,
      id: draft.id || `company-${Date.now()}`,
      name,
      address: draft.address.trim(),
      description: sanitizeRichText(draft.description),
    };

    updateData((current) => ({
      ...current,
      companies: draft.id
        ? current.companies.map((company) => (company.id === normalized.id ? normalized : company))
        : [...current.companies, normalized],
    }));
    setEditingCompanyDraft(null);
  }

  function deleteCompany(companyId) {
    const company = data.companies.find((item) => item.id === companyId);
    if (!company) return;

    const isUsed = data.tasks.some((task) => task.companyId === companyId);
    if (isUsed) {
      window.alert("Không thể xóa công ty đang được sử dụng trong công việc.");
      return;
    }
    if (!window.confirm(`Xóa công ty ${company.name}?`)) return;

    updateData((current) => ({
      ...current,
      companies: current.companies.filter((item) => item.id !== companyId),
    }));
    if (selectedCompany === companyId) setSelectedCompany("");
    if (editingCompanyDraft?.id === companyId) setEditingCompanyDraft(null);
  }

  function addLabel(value) {
    const label = value.trim();
    if (!label) return false;

    const duplicate = data.labels.find(
      (item) => item.toLocaleLowerCase("vi") === label.toLocaleLowerCase("vi"),
    );
    if (duplicate) {
      window.alert("Tên nhãn đã tồn tại trong hệ thống.");
      return false;
    }

    updateData((current) => ({
      ...current,
      labels: [...current.labels, label],
    }));
    return true;
  }

  function renameLabel(currentLabel, value) {
    const nextLabel = value.trim();
    if (!nextLabel) return false;
    if (nextLabel === currentLabel) return true;

    const duplicate = data.labels.find(
      (item) =>
        item !== currentLabel &&
        item.toLocaleLowerCase("vi") === nextLabel.toLocaleLowerCase("vi"),
    );
    if (duplicate) {
      window.alert("Tên nhãn đã tồn tại trong hệ thống.");
      return false;
    }

    updateData((current) => ({
      ...current,
      labels: current.labels.map((label) => (label === currentLabel ? nextLabel : label)),
      tasks: current.tasks.map((task) => ({
        ...task,
        labels: task.labels.map((label) => (label === currentLabel ? nextLabel : label)),
      })),
    }));
    setSelectedLabels((current) =>
      current.map((label) => (label === currentLabel ? nextLabel : label)),
    );
    return true;
  }

  function deleteLabel(label) {
    const isUsed = data.tasks.some((task) => task.labels.includes(label));
    if (isUsed) {
      window.alert("Không thể xóa nhãn đang được sử dụng trong công việc.");
      return;
    }
    if (!window.confirm(`Xóa nhãn ${label}?`)) return;

    updateData((current) => ({
      ...current,
      labels: current.labels.filter((item) => item !== label),
    }));
    setSelectedLabels((current) => current.filter((item) => item !== label));
  }

  function toggleLabelFilter(label) {
    setSelectedLabels((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  function addComment() {
    const text = commentText.trim();
    if (!text) return;

    const comment = {
      id: `comment-${Date.now()}`,
      author: currentUser.name,
      text,
      createdAt: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    };

    setTaskDraft((current) => ({ ...current, comments: [...current.comments, comment] }));
    setCommentText("");
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} currentUser={currentUser} members={members} setActiveView={setActiveView} />
      <main className="main-content">
        <Topbar currentUser={currentUser} members={members} search={search} setSearch={setSearch} />
        {activeView === "board" ? (
          <>
            <BoardHeader startNewTask={startNewTask} />
            <BoardToolbar
              availableLabels={availableLabels}
              chemicals={data.chemicals}
              companies={data.companies}
              isLabelFilterOpen={isLabelFilterOpen}
              search={search}
              selectedChemical={selectedChemical}
              selectedCompany={selectedCompany}
              selectedLabels={selectedLabels}
              setIsLabelFilterOpen={setIsLabelFilterOpen}
              setSearch={setSearch}
              setSelectedChemical={setSelectedChemical}
              setSelectedCompany={setSelectedCompany}
              setSelectedLabels={setSelectedLabels}
              setShowMyTasks={setShowMyTasks}
              showMyTasks={showMyTasks}
              toggleLabelFilter={toggleLabelFilter}
            />
            <TaskBoard
              assignTask={assignTask}
              chemicals={data.chemicals}
              companies={data.companies}
              columnColors={columnColors}
              columns={data.columns}
              currentUser={currentUser}
              draggedTaskId={draggedTaskId}
              dragTargetId={dragTargetId}
              filteredTasks={filteredTasks}
              members={members}
              moveTask={moveTask}
              openTask={openTask}
              setColumnDraft={setColumnDraft}
              setDraggedTaskId={setDraggedTaskId}
              setDragTargetId={setDragTargetId}
              startNewTask={startNewTask}
            />
          </>
        ) : activeView === "chemicals" ? (
          <ChemicalManagement
            addChemical={addChemical}
            chemicalColors={chemicalColors}
            chemicals={data.chemicals}
            deleteChemical={deleteChemical}
            newChemicalColor={newChemicalColor}
            newChemicalName={newChemicalName}
            setNewChemicalColor={setNewChemicalColor}
            setNewChemicalName={setNewChemicalName}
            tasks={data.tasks}
          />
        ) : activeView === "companies" ? (
          <CompanyManagement
            companies={data.companies}
            deleteCompany={deleteCompany}
            setEditingCompanyDraft={setEditingCompanyDraft}
            tasks={data.tasks}
          />
        ) : (
          <LabelManagement
            addLabel={addLabel}
            deleteLabel={deleteLabel}
            labels={data.labels}
            renameLabel={renameLabel}
            tasks={data.tasks}
          />
        )}
      </main>
      <TaskModal
        addAssignee={addAssignee}
        addComment={addComment}
        columnColors={columnColors}
        commentText={commentText}
        currentUser={currentUser}
        customMembers={customMembers}
        data={data}
        deleteTask={deleteTask}
        members={members}
        newAssigneeName={newAssigneeName}
        removeAssignee={removeAssignee}
        saveTask={saveTask}
        selectedTaskId={selectedTaskId}
        setCommentText={setCommentText}
        setNewAssigneeName={setNewAssigneeName}
        setTaskDraft={setTaskDraft}
        taskDraft={taskDraft}
      />
      <ColumnModal
        columnColors={columnColors}
        columnDraft={columnDraft}
        deleteColumn={deleteColumn}
        saveColumn={saveColumn}
        setColumnDraft={setColumnDraft}
      />
      <CompanyEditModal
        companyDraft={editingCompanyDraft}
        saveCompany={saveCompany}
        setCompanyDraft={setEditingCompanyDraft}
      />
    </div>
  );
}

export default App;
