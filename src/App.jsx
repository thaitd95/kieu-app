import { useEffect, useMemo, useRef, useState } from "react";
import AuthScreen from "./components/AuthScreen";
import BoardToolbar from "./components/BoardToolbar";
import ChemicalManagement from "./components/ChemicalManagement";
import CompanyEditModal from "./components/CompanyEditModal";
import CompanyManagement from "./components/CompanyManagement";
import LabelManagement from "./components/LabelManagement";
import { BoardHeader, Sidebar, Topbar } from "./components/Layout";
import ReportManagement from "./components/ReportManagement";
import TaskBoard, { CompletedArchiveSection } from "./components/TaskBoard";
import TaskModal from "./components/TaskModal";
import { chemicalColors, columnColors, currentUser as defaultCurrentUser, defaultChemicalColor, defaultLabelColor, defaultMembers, initialData, labelColors } from "./data";
import { loadInitialData } from "./db";
import { getTaskPriority } from "./deadline";
import { normalizePaymentMethod, normalizeShippingMethod, paymentMethods, shippingMethods } from "./reportData";
import { sanitizeRichText, stripRichText } from "./richText";
import { ensureAppUser, getAuthDisplayName, signOut, supabase, supabaseConfigError } from "./utils/supabase";
import { archiveCompletedTask as archiveWorkflowCompletedTask, createWorkflowActualDates, createWorkflowDueDates, createWorkflowObjectives, createWorkflowStartedDates, DEFAULT_WORKFLOW_COLUMN_ID, getLocalDateString, getWorkflowMoveBlockReason, isTaskInCompletedArchive, moveTaskToWorkflowColumn } from "./workflow";
import {
  deleteChemicalRecord,
  deleteCompanyRecord,
  deleteLabelRecord,
  deleteTaskRecord,
  loadSharedChemicals,
  loadSharedCompanies,
  loadSharedData,
  loadSharedLabels,
  loadSharedTasks,
  removeMemberRecord,
  replaceSharedData,
  saveChemicalRecord,
  saveCommentRecord,
  saveCompanyRecord,
  saveLabelRecord,
  saveTaskRecord,
  saveMemberRecord,
} from "./sharedData";

function App() {
  const [session, setSession] = useState(undefined);
  const [appState, setAppState] = useState(null);
  const [authError, setAuthError] = useState("");
  const [data, setData] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isDataReady, setIsDataReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState("board");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskDraft, setTaskDraft] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragTargetId, setDragTargetId] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [newAssigneeName, setNewAssigneeName] = useState("");
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [isLabelFilterOpen, setIsLabelFilterOpen] = useState(false);
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedChemical, setSelectedChemical] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [newChemicalName, setNewChemicalName] = useState("");
  const [newChemicalColor, setNewChemicalColor] = useState(defaultChemicalColor);
  const [editingCompanyDraft, setEditingCompanyDraft] = useState(null);
  const [exportingReportType, setExportingReportType] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("kieu-assistant-theme") || "light");
  const previousViewRef = useRef(activeView);
  const refreshRequestRef = useRef(0);
  const dataRef = useRef(data);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (!currentSession) {
        setAppState(null);
        setData(null);
        setIsDataReady(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    let isActive = true;
    setAuthError("");

    ensureAppUser(session.user)
      .then((currentAppState) => {
        if (isActive) setAppState(currentAppState);
      })
      .catch((error) => {
        if (isActive) setAuthError(`Không thể khởi tạo dữ liệu Supabase. ${error.message}`);
      });

    return () => {
      isActive = false;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user || !appState) return;

    let isActive = true;
    setStorageError("");

    async function loadData() {
      let sharedData;
      if (appState.data_initialized) {
        sharedData = await loadSharedData();
      } else {
        const storedData = await loadInitialData(initialData);
        sharedData = await replaceSharedData(storedData, session.user);
        setAppState((current) => ({ ...current, data_initialized: true }));
      }

      if (!isActive) return;
      setData(sharedData);
      setIsDataReady(true);
    }

    loadData().catch((error) => {
      if (isActive) setStorageError(`Không thể tải dữ liệu Supabase. ${error.message}`);
    });

    return () => {
      isActive = false;
    };
  }, [session?.user?.id, appState?.data_initialized]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("kieu-assistant-theme", theme);
  }, [theme]);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (previousViewRef.current === activeView) return;
    previousViewRef.current = activeView;
    if (!isDataReady) return;
    if (activeView === "reports") {
      refreshRequestRef.current += 1;
      setIsRefreshing(false);
      setRefreshError("");
      return;
    }

    const currentData = dataRef.current;
    if (!currentData) return;

    const refreshByView = {
      board: () =>
        loadSharedTasks(currentData).then((tasks) => (current) => ({
          ...current,
          tasks,
        })),
      completedArchive: () =>
        loadSharedTasks(currentData).then((tasks) => (current) => ({
          ...current,
          tasks,
        })),
      chemicals: () =>
        loadSharedChemicals().then((chemicals) => (current) => ({
          ...current,
          chemicals,
        })),
      companies: () =>
        loadSharedCompanies().then((companies) => (current) => ({
          ...current,
          companies,
        })),
      labels: () =>
        loadSharedLabels().then((labels) => (current) => ({
          ...current,
          labels,
        })),
    };

    const refreshActiveView = refreshByView[activeView];
    if (!refreshActiveView) return;

    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;
    setIsRefreshing(true);
    setRefreshError("");

    refreshActiveView()
      .then((applyRefresh) => {
        if (refreshRequestRef.current === requestId) {
          setData((current) => (current ? applyRefresh(current) : current));
        }
      })
      .catch((error) => {
        if (refreshRequestRef.current === requestId) {
          setRefreshError(`Không thể đồng bộ dữ liệu Supabase. ${error.message}`);
        }
      })
      .finally(() => {
        if (refreshRequestRef.current === requestId) setIsRefreshing(false);
      });
  }, [activeView, isDataReady]);

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTime(Date.now()), 60 * 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const currentUser = useMemo(
    () => ({
      name:
        data?.memberRecords?.find((member) => member.userId === session?.user?.id)?.name ||
        (session?.user ? getAuthDisplayName(session.user) : defaultCurrentUser.name),
      role: "Thành viên",
    }),
    [data?.memberRecords, session?.user],
  );
  const members = data?.members || defaultMembers;
  const customMembers = members.filter((person) => person !== currentUser.name);
  const availableLabels = useMemo(
    () => [...(data?.labels || [])].sort((first, second) => first.name.localeCompare(second.name)),
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
        `${task.title} ${task.key} ${task.assignee} ${company?.name || ""} ${task.poNumber || ""} ${task.quantity || ""} ${task.amount || ""} ${task.ex || ""} ${task.paymentMethod || ""} ${task.shippingMethod || ""} ${chemicalNames} ${stripRichText(task.description)} ${task.labels.join(" ")}`
          .toLowerCase()
          .includes(query);
      const matchesLabels =
        selectedLabels.length === 0 || selectedLabels.some((label) => task.labels.includes(label));
      const matchesAssignee = !showMyTasks || task.assignee === currentUser.name;
      const matchesCompany = !selectedCompany || task.companyId === selectedCompany;
      const matchesChemical = !selectedChemical || task.chemicals.includes(selectedChemical);
      const matchesPriority =
        !selectedPriority || getTaskPriority(task, currentTime) === selectedPriority;

      return matchesSearch && matchesLabels && matchesAssignee && matchesCompany && matchesChemical && matchesPriority;
    });
  }, [data?.tasks, data?.chemicals, data?.companies, currentTime, search, selectedLabels, showMyTasks, selectedCompany, selectedChemical, selectedPriority]);
  const activeBoardTasks = useMemo(
    () => filteredTasks.filter((task) => !isTaskInCompletedArchive(task, currentTime)),
    [currentTime, filteredTasks],
  );
  const completedArchiveTasks = useMemo(
    () =>
      filteredTasks
        .filter((task) => isTaskInCompletedArchive(task, currentTime))
        .sort((first, second) =>
          String(second.completedArchivedAt || second.columnActualDates?.completed || "").localeCompare(
            String(first.completedArchivedAt || first.columnActualDates?.completed || ""),
          )),
    [currentTime, filteredTasks],
  );

  if (session === undefined) {
    if (supabaseConfigError) {
      return <div className="storage-state storage-state-error">{supabaseConfigError}</div>;
    }

    return (
      <div className="storage-state">
        <span className="loading-spinner loading-spinner-large" />
        <span>Đang kiểm tra đăng nhập...</span>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (authError || storageError) {
    return <div className="storage-state storage-state-error">{authError || storageError}</div>;
  }

  if (!appState || !isDataReady || !data) {
    return (
      <div className="storage-state">
        <span className="loading-spinner loading-spinner-large" />
        <span>Đang tải dữ liệu...</span>
      </div>
    );
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      setAuthError(`Không thể đăng xuất. ${error.message}`);
    }
  }

  function updateData(updater) {
    setData((current) => updater(current));
  }

  function showDataError(error) {
    window.alert(`Không thể lưu dữ liệu lên Supabase. ${error.message}`);
  }

  function resetTaskInputs() {
    setCommentText("");
    setNewAssigneeName("");
    setNewChemicalName("");
    setNewChemicalColor(defaultChemicalColor);
  }

  function openTask(task) {
    setSelectedTaskId(task.id);
    setTaskDraft({
      ...task,
      labels: [...task.labels],
      objectives: [...task.objectives],
      columnDueDates: createWorkflowDueDates(task.columnDueDates),
      columnActualDates: createWorkflowActualDates(task.columnActualDates),
      columnStartedDates: createWorkflowStartedDates(task.columnStartedDates),
    });
    resetTaskInputs();
  }

  function startNewTask() {
    const sequence = Math.max(130, ...data.tasks.map((task) => Number(task.key.split("-")[1]) || 0)) + 1;

    setSelectedTaskId("new");
    setTaskDraft({
      id: crypto.randomUUID(),
      key: `KA-${sequence}`,
      createdAt: getLocalDateString(),
      title: "",
      description: "",
      type: "task",
      priority: "low",
      assignee: currentUser.name,
      poNumber: "",
      quantity: "",
      amount: "",
      ex: "",
      paymentMethod: paymentMethods[0].value,
      shippingMethod: shippingMethods.find((method) => method.value === "sea")?.value || shippingMethods[0].value,
      columnDueDates: createWorkflowDueDates(),
      columnActualDates: createWorkflowActualDates(),
      columnStartedDates: createWorkflowStartedDates({
        [DEFAULT_WORKFLOW_COLUMN_ID]: getLocalDateString(),
      }),
      completedArchivedAt: "",
      labels: [],
      objectives: createWorkflowObjectives(DEFAULT_WORKFLOW_COLUMN_ID),
      companyId: "",
      chemicals: [],
      columnId: DEFAULT_WORKFLOW_COLUMN_ID,
      comments: [],
    });
    resetTaskInputs();
  }

  async function saveTask() {
    if (!taskDraft.title.trim()) return;

    const normalized = {
      ...taskDraft,
      title: taskDraft.title.trim(),
      description: sanitizeRichText(taskDraft.description),
      createdAt: /^\d{4}-\d{2}-\d{2}$/.test(taskDraft.createdAt || "")
        ? taskDraft.createdAt
        : getLocalDateString(),
      poNumber: String(taskDraft.poNumber || "").trim(),
      quantity: String(taskDraft.quantity || "").trim(),
      amount: String(taskDraft.amount || "").trim(),
      ex: String(taskDraft.ex || "").trim(),
      paymentMethod: normalizePaymentMethod(taskDraft.paymentMethod),
      shippingMethod: normalizeShippingMethod(taskDraft.shippingMethod),
      columnDueDates: createWorkflowDueDates(taskDraft.columnDueDates),
      columnActualDates: createWorkflowActualDates(taskDraft.columnActualDates),
      columnStartedDates: createWorkflowStartedDates(taskDraft.columnStartedDates),
      completedArchivedAt:
        taskDraft.columnId === "completed" && /^\d{4}-\d{2}-\d{2}$/.test(taskDraft.completedArchivedAt || "")
          ? taskDraft.completedArchivedAt
          : "",
      priority: getTaskPriority(taskDraft),
      labels: [...new Set(taskDraft.labels.filter((label) => data.labels.some((item) => item.name === label)))],
      objectives: taskDraft.objectives
        .map((objective) => ({ ...objective, text: objective.text.trim() }))
        .filter((objective) => objective.text),
    };

    try {
      const savedTask = await saveTaskRecord(data, normalized);
      updateData((current) => ({
        ...current,
        tasks:
          selectedTaskId === "new"
            ? [...current.tasks, savedTask]
            : current.tasks.map((task) => (task.id === savedTask.id ? savedTask : task)),
      }));
      setSelectedTaskId(null);
      setTaskDraft(null);
    } catch (error) {
      showDataError(error);
    }
  }

  async function deleteTask() {
    if (!taskDraft || !window.confirm(`Xóa công việc ${taskDraft.key}?`)) return;

    try {
      await deleteTaskRecord(taskDraft.id);
      updateData((current) => ({
        ...current,
        tasks: current.tasks.filter((task) => task.id !== taskDraft.id),
      }));
      setSelectedTaskId(null);
      setTaskDraft(null);
    } catch (error) {
      showDataError(error);
    }
  }

  async function deleteTaskFromBoard(task) {
    if (!window.confirm(`Xóa công việc ${task.key}?`)) return;
    try {
      await deleteTaskRecord(task.id);
      updateData((current) => ({
        ...current,
        tasks: current.tasks.filter((item) => item.id !== task.id),
      }));
    } catch (error) {
      showDataError(error);
    }
  }

  async function moveTask(taskId, columnId) {
    const task = data.tasks.find((item) => item.id === taskId);
    const blockReason = getWorkflowMoveBlockReason(task, columnId);
    if (blockReason) {
      window.alert(blockReason);
      return;
    }

    const movedTask = moveTaskToWorkflowColumn(task, columnId);
    try {
      await saveTaskRecord(data, movedTask);
      updateData((current) => ({
        ...current,
        tasks: current.tasks.map((item) => (item.id === taskId ? movedTask : item)),
      }));
    } catch (error) {
      showDataError(error);
    }
  }

  async function archiveCompletedTask(taskId) {
    const task = data.tasks.find((item) => item.id === taskId);
    const archivedTask = archiveWorkflowCompletedTask(task, currentTime);
    try {
      await saveTaskRecord(data, archivedTask);
      updateData((current) => ({
        ...current,
        tasks: current.tasks.map((item) => (item.id === taskId ? archivedTask : item)),
      }));
    } catch (error) {
      showDataError(error);
    }
  }

  async function assignTask(taskId, assignee) {
    const task = data.tasks.find((item) => item.id === taskId);
    const assignedTask = { ...task, assignee };
    try {
      await saveTaskRecord(data, assignedTask);
      updateData((current) => ({
        ...current,
        tasks: current.tasks.map((item) => (item.id === taskId ? assignedTask : item)),
      }));
    } catch (error) {
      showDataError(error);
    }
  }

  async function addAssignee() {
    const name = newAssigneeName.trim();
    if (!name) return;

    try {
      const member =
        data.memberRecords.find((item) => item.name === name) ||
        await saveMemberRecord(name);
      updateData((current) => ({
        ...current,
        members: current.members.includes(name) ? current.members : [...current.members, name],
        memberRecords: current.memberRecords.some((item) => item.id === member.id)
          ? current.memberRecords
          : [...current.memberRecords, member],
      }));
      setTaskDraft((current) => ({ ...current, assignee: name }));
      setNewAssigneeName("");
    } catch (error) {
      showDataError(error);
    }
  }

  async function removeAssignee(name) {
    if (!customMembers.includes(name) || !window.confirm(`Xóa người phụ trách ${name}?`)) return;

    const member = data.memberRecords.find((item) => item.name === name);
    const currentMember = data.memberRecords.find((item) => item.name === currentUser.name);
    if (!member || !currentMember) return;

    try {
      await removeMemberRecord(member.id, currentMember.id);
      updateData((current) => ({
        ...current,
        members: current.members.filter((person) => person !== name),
        memberRecords: current.memberRecords.filter((item) => item.id !== member.id),
        tasks: current.tasks.map((task) =>
          task.assignee === name ? { ...task, assignee: currentUser.name } : task,
        ),
      }));
      setTaskDraft((current) =>
        current?.assignee === name ? { ...current, assignee: currentUser.name } : current,
      );
    } catch (error) {
      showDataError(error);
    }
  }

  async function addChemical() {
    const name = newChemicalName.trim();
    if (!name) return;

    const existing = data.chemicals.find(
      (chemical) => chemical.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
    );
    const chemical = existing || {
      id: crypto.randomUUID(),
      name,
      color: newChemicalColor,
    };

    try {
      const savedChemical = existing || await saveChemicalRecord(chemical);
      updateData((current) => ({
        ...current,
        chemicals: existing ? current.chemicals : [...current.chemicals, savedChemical],
      }));
      setNewChemicalName("");
      setNewChemicalColor(defaultChemicalColor);
    } catch (error) {
      showDataError(error);
    }
  }

  async function deleteChemical(chemicalId) {
    const chemical = data.chemicals.find((item) => item.id === chemicalId);
    if (!chemical) return;

    const isUsed = data.tasks.some((task) => task.chemicals.includes(chemicalId));
    if (isUsed) {
      window.alert("Không thể xóa hóa chất đang được sử dụng trong công việc.");
      return;
    }
    if (!window.confirm(`Xóa hóa chất ${chemical.name}?`)) return;

    try {
      await deleteChemicalRecord(chemicalId);
      updateData((current) => ({
        ...current,
        chemicals: current.chemicals.filter((item) => item.id !== chemicalId),
      }));
      if (selectedChemical === chemicalId) setSelectedChemical("");
    } catch (error) {
      showDataError(error);
    }
  }

  async function saveCompany(draft) {
    const name = draft.name.trim();
    if (!name) return;

    const duplicate = data.companies.find(
      (company) =>
        company.id !== draft.id &&
        company.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
    );
    if (duplicate) {
      window.alert("Tên Seller đã tồn tại trong hệ thống.");
      return;
    }

    const normalized = {
      ...draft,
      id: draft.id || crypto.randomUUID(),
      name,
      accountNumber: String(draft.accountNumber || "").trim(),
      officeAddress: String(draft.officeAddress || "").trim(),
      producerAddress: String(draft.producerAddress || "").trim(),
      description: sanitizeRichText(draft.description),
    };

    try {
      const savedCompany = await saveCompanyRecord(normalized);
      updateData((current) => ({
        ...current,
        companies: draft.id
          ? current.companies.map((company) =>
              company.id === savedCompany.id ? savedCompany : company,
            )
          : [...current.companies, savedCompany],
      }));
      setEditingCompanyDraft(null);
    } catch (error) {
      showDataError(error);
    }
  }

  async function deleteCompany(companyId) {
    const company = data.companies.find((item) => item.id === companyId);
    if (!company) return;

    const isUsed = data.tasks.some((task) => task.companyId === companyId);
    if (isUsed) {
      window.alert("Không thể xóa Seller đang được sử dụng trong công việc.");
      return;
    }
    if (!window.confirm(`Xóa Seller ${company.name}?`)) return;

    try {
      await deleteCompanyRecord(companyId);
      updateData((current) => ({
        ...current,
        companies: current.companies.filter((item) => item.id !== companyId),
      }));
      if (selectedCompany === companyId) setSelectedCompany("");
      if (editingCompanyDraft?.id === companyId) setEditingCompanyDraft(null);
    } catch (error) {
      showDataError(error);
    }
  }

  async function addLabel(value, color = defaultLabelColor) {
    const label = value.trim();
    if (!label) return false;

    const duplicate = data.labels.find(
      (item) => item.name.toLocaleLowerCase("vi") === label.toLocaleLowerCase("vi"),
    );
    if (duplicate) {
      window.alert("Tên nhãn đã tồn tại trong hệ thống.");
      return false;
    }

    try {
      const savedLabel = await saveLabelRecord({
        id: crypto.randomUUID(),
        name: label,
        color,
      });
      updateData((current) => ({
        ...current,
        labels: [...current.labels, savedLabel],
      }));
      return true;
    } catch (error) {
      showDataError(error);
      return false;
    }
  }

  async function renameLabel(currentLabel, value, color) {
    const nextLabel = value.trim();
    if (!nextLabel) return false;
    const currentItem = data.labels.find((item) => item.name === currentLabel);
    if (nextLabel === currentLabel && (!color || color === currentItem?.color)) return true;

    const duplicate = data.labels.find(
      (item) =>
        item.name !== currentLabel &&
        item.name.toLocaleLowerCase("vi") === nextLabel.toLocaleLowerCase("vi"),
    );
    if (duplicate) {
      window.alert("Tên nhãn đã tồn tại trong hệ thống.");
      return false;
    }

    try {
      const savedLabel = await saveLabelRecord({
        ...currentItem,
        name: nextLabel,
        color: color || currentItem.color,
      });
      updateData((current) => ({
        ...current,
        labels: current.labels.map((label) =>
          label.id === savedLabel.id ? savedLabel : label,
        ),
        tasks: current.tasks.map((task) => ({
          ...task,
          labels: task.labels.map((label) => (label === currentLabel ? nextLabel : label)),
        })),
      }));
      setSelectedLabels((current) =>
        current.map((label) => (label === currentLabel ? nextLabel : label)),
      );
      return true;
    } catch (error) {
      showDataError(error);
      return false;
    }
  }

  async function deleteLabel(label) {
    const isUsed = data.tasks.some((task) => task.labels.includes(label));
    if (isUsed) {
      window.alert("Không thể xóa nhãn đang được sử dụng trong công việc.");
      return;
    }
    if (!window.confirm(`Xóa nhãn ${label}?`)) return;

    const labelRecord = data.labels.find((item) => item.name === label);
    if (!labelRecord) return;

    try {
      await deleteLabelRecord(labelRecord.id);
      updateData((current) => ({
        ...current,
        labels: current.labels.filter((item) => item.id !== labelRecord.id),
      }));
      setSelectedLabels((current) => current.filter((item) => item !== label));
    } catch (error) {
      showDataError(error);
    }
  }

  function toggleLabelFilter(label) {
    setSelectedLabels((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );
  }

  async function addComment() {
    const text = commentText.trim();
    if (!text) return;

    const comment = {
      id: crypto.randomUUID(),
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

    if (selectedTaskId === "new") {
      setTaskDraft((current) => ({ ...current, comments: [...current.comments, comment] }));
      setCommentText("");
      return;
    }

    try {
      const savedComment = await saveCommentRecord(
        data,
        taskDraft.id,
        comment,
      );
      setTaskDraft((current) => ({
        ...current,
        comments: [...current.comments, savedComment],
      }));
      updateData((current) => ({
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === taskDraft.id
            ? { ...task, comments: [...task.comments, savedComment] }
            : task,
        ),
      }));
      setCommentText("");
    } catch (error) {
      showDataError(error);
    }
  }

  async function exportReport(type) {
    setExportingReportType(type);
    try {
      const { downloadReportWorkbook } = await import("./excelReports");
      await downloadReportWorkbook(data, type);
    } catch (error) {
      window.alert(`Không thể xuất báo cáo Excel. ${error.message}`);
    } finally {
      setExportingReportType("");
    }
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} currentUser={currentUser} members={members} setActiveView={setActiveView} setTheme={setTheme} theme={theme} />
      <main className={`main-content ${isRefreshing && !refreshError ? "main-content-refreshing" : ""}`}>
        <Topbar currentUser={currentUser} members={members} onSignOut={handleSignOut} search={search} setSearch={setSearch} />
        {isRefreshing && !refreshError && (
          <div aria-label="Đang đồng bộ dữ liệu từ Supabase" className="sync-status" role="status">
            <span className="loading-spinner sync-spinner" />
          </div>
        )}
        {refreshError && (
          <div className="sync-status sync-status-error">
            {refreshError}
          </div>
        )}
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
              selectedPriority={selectedPriority}
              setIsLabelFilterOpen={setIsLabelFilterOpen}
              setSearch={setSearch}
              setSelectedChemical={setSelectedChemical}
              setSelectedCompany={setSelectedCompany}
              setSelectedLabels={setSelectedLabels}
              setSelectedPriority={setSelectedPriority}
              setShowMyTasks={setShowMyTasks}
              showMyTasks={showMyTasks}
              toggleLabelFilter={toggleLabelFilter}
            />
            <TaskBoard
              assignTask={assignTask}
              chemicals={data.chemicals}
              companies={data.companies}
              columns={data.columns}
              currentUser={currentUser}
              deleteTask={deleteTaskFromBoard}
              draggedTaskId={draggedTaskId}
              dragTargetId={dragTargetId}
              archiveTask={archiveCompletedTask}
              filteredTasks={activeBoardTasks}
              members={members}
              moveTask={moveTask}
              now={currentTime}
              openTask={openTask}
              labels={data.labels}
              setDraggedTaskId={setDraggedTaskId}
              setDragTargetId={setDragTargetId}
            />
          </>
        ) : activeView === "completedArchive" ? (
          <CompletedArchiveSection
            companies={data.companies}
            completedArchiveTasks={completedArchiveTasks}
            now={currentTime}
            openTask={openTask}
          />
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
        ) : activeView === "labels" ? (
          <LabelManagement
            addLabel={addLabel}
            deleteLabel={deleteLabel}
            labels={data.labels}
            labelColors={labelColors}
            renameLabel={renameLabel}
            tasks={data.tasks}
          />
        ) : (
          <ReportManagement
            data={data}
            exportingType={exportingReportType}
            onExportReport={exportReport}
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
      <CompanyEditModal
        companyDraft={editingCompanyDraft}
        saveCompany={saveCompany}
        setCompanyDraft={setEditingCompanyDraft}
      />
    </div>
  );
}

export default App;
