import { currentUser, defaultChemicalColor, defaultLabelColor, defaultMembers, fixedColumns, legacyDefaultMembers } from "./data";
import { sanitizeRichText } from "./richText";

function createChemicalId(name, chemicals) {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "chemical";
  let id = `chemical-${base}`;
  let suffix = 2;

  while (chemicals.some((chemical) => chemical.id === id)) {
    id = `chemical-${base}-${suffix}`;
    suffix += 1;
  }

  return id;
}

function createCompanyId(name, companies) {
  const base =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "company";
  let id = `company-${base}`;
  let suffix = 2;

  while (companies.some((company) => company.id === id)) {
    id = `company-${base}-${suffix}`;
    suffix += 1;
  }

  return id;
}

export function normalizeData(savedData) {
  const savedMembers = savedData.members?.length ? savedData.members : defaultMembers;
  const shouldRemoveLegacyDefaults = savedData.memberListVersion !== 2;
  const members = [
    currentUser.name,
    ...savedMembers.filter(
      (person) =>
        person !== currentUser.name &&
        (!shouldRemoveLegacyDefaults || !legacyDefaultMembers.includes(person)),
    ),
  ];
  const uniqueMembers = [...new Set(members)];
  const companies = [];
  const chemicals = [];
  const labels = [];

  function registerCompany(value) {
    if (!value) return "";

    const rawName = typeof value === "string" ? value : value.name;
    const name = rawName?.trim();
    if (!name) return "";

    const existing = companies.find(
      (company) =>
        company.id === value.id ||
        company.id === value ||
        company.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
    );
    if (existing) return existing.id;

    const company = {
      id: typeof value === "object" && value.id ? value.id : createCompanyId(name, companies),
      name,
      address: (typeof value === "object" && value.address) || "",
      description: sanitizeRichText((typeof value === "object" && value.description) || ""),
    };
    companies.push(company);

    return company.id;
  }

  (savedData.companies || []).forEach(registerCompany);

  function registerChemical(value) {
    if (!value) return "";

    const rawName = typeof value === "string" ? value : value.name;
    const name = rawName?.trim();
    if (!name) return "";

    const existing = chemicals.find(
      (chemical) =>
        chemical.id === value.id ||
        chemical.id === value ||
        chemical.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
    );
    if (existing) return existing.id;

    const chemical = {
      id: typeof value === "object" && value.id ? value.id : createChemicalId(name, chemicals),
      name,
      color: (typeof value === "object" && value.color) || defaultChemicalColor,
    };
    chemicals.push(chemical);

    return chemical.id;
  }

  (savedData.chemicals || []).forEach(registerChemical);

  function registerLabel(value) {
    const name = (typeof value === "string" ? value : value?.name)?.trim();
    if (!name) return "";

    const existing = labels.find(
      (label) => label.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi"),
    );
    if (existing) return existing.name;

    labels.push({
      name,
      color: (typeof value === "object" && value.color) || defaultLabelColor,
    });
    return name;
  }

  (savedData.labels || []).forEach(registerLabel);

  function normalizeTaskChemicals(task) {
    const values = Array.isArray(task.chemicals)
      ? task.chemicals
      : [task.chemical].filter(Boolean);

    return [...new Set(values.map(registerChemical).filter(Boolean))];
  }

  function normalizeTaskLabels(task) {
    const values = Array.isArray(task.labels)
      ? task.labels
      : String(task.labels || "").split(",");

    return [...new Set(values.map(registerLabel).filter(Boolean))];
  }

  function normalizeTaskObjectives(task) {
    if (!Array.isArray(task.objectives)) return [];

    return task.objectives
      .map((objective, index) => ({
        id: objective?.id || `${task.id || "task"}-objective-${index + 1}`,
        text: String(objective?.text || "").trim(),
        completed: Boolean(objective?.completed),
      }))
      .filter((objective) => objective.text);
  }

  const legacyColumnIds = new Set(["backlog", "progress", "review"]);
  const customColumns = (savedData.columns || []).filter(
    (column) =>
      column?.id &&
      column.title?.trim() &&
      !fixedColumns.some((fixedColumn) => fixedColumn.id === column.id) &&
      !legacyColumnIds.has(column.id),
  );
  const columns = [fixedColumns[0], ...customColumns, fixedColumns[1]];
  const columnIds = new Set(columns.map((column) => column.id));

  const tasks = (savedData.tasks || []).map((task) => ({
    ...task,
    key: task.key?.replace(/^TF-/, "KA-"),
    assignee: uniqueMembers.includes(task.assignee) ? task.assignee : currentUser.name,
    columnId: columnIds.has(task.columnId) ? task.columnId : "todo",
    companyId: registerCompany(task.companyId || task.company),
    chemicals: normalizeTaskChemicals(task),
    labels: normalizeTaskLabels(task),
    objectives: normalizeTaskObjectives(task),
    description: sanitizeRichText(task.description),
  }));

  return {
    ...savedData,
    memberListVersion: 2,
    members: uniqueMembers,
    companies,
    chemicals,
    labels,
    columns,
    tasks,
  };
}
