import { normalizeData } from "./model.js";
import {
  createWorkflowActualDates,
  createWorkflowDueDates,
  createWorkflowObjectiveMap,
  serializeWorkflowObjectiveMap,
  workflowColumns,
} from "./workflow.js";
import { getAuthDisplayName, supabase } from "./utils/supabase.js";

function assertResult(result) {
  if (result.error) throw result.error;
  return result.data;
}

function createId() {
  return crypto.randomUUID();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value || "",
  );
}

function formatCommentDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) return "";

  return String(value).slice(0, 10);
}

function toCreatedAtTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? `${value}T00:00:00.000Z` : undefined;
}

function mapCompany(row) {
  return {
    id: row.id,
    name: row.name,
    accountNumber: row.account_number,
    officeAddress: row.office_address,
    producerAddress: row.producer_address,
    description: row.description_html,
  };
}

function mapChemical(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

function mapLabel(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
  };
}

function mapMember(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.display_name,
  };
}

function createMemberNameMap(members = []) {
  return new Map(
    members
      .map((member) => [member.id, member.display_name || member.name || ""])
      .filter(([, name]) => name),
  );
}

function createLabelNameMap(labels = []) {
  return new Map(labels.map((label) => [label.id, label.name]));
}

function createTaskObjectiveMap(objectiveRows = []) {
  return new Map(
    objectiveRows.map((row) => [
      row.task_id,
      row.objectives && typeof row.objectives === "object" ? row.objectives : {},
    ]),
  );
}

function createTaskWorkflowStepMap(stepRows = []) {
  return new Map(
    stepRows.map((row) => [
      row.task_id,
      row.steps && typeof row.steps === "object" ? row.steps : {},
    ]),
  );
}

function createWorkflowStepPayload(task) {
  return Object.fromEntries(
    workflowColumns.map((column) => [
      column.id,
      {
        due_on: task.columnDueDates?.[column.id] || "",
        actual_on: task.columnActualDates?.[column.id] || "",
      },
    ]),
  );
}

function mapTasks(taskRows, relationRows, memberSource, labelSource) {
  const {
    taskChemicalRows,
    taskLabelRows,
    stepRows,
    objectiveRows,
    commentRows,
  } = relationRows;
  const memberNames = createMemberNameMap(memberSource);
  const labelNames = createLabelNameMap(labelSource);
  const taskChemicals = new Map();
  const taskLabels = new Map();
  const taskSteps = createTaskWorkflowStepMap(stepRows);
  const taskObjectiveRows = createTaskObjectiveMap(objectiveRows);
  const taskComments = new Map();

  taskChemicalRows.forEach((row) => {
    const values = taskChemicals.get(row.task_id) || [];
    values.push(row.chemical_id);
    taskChemicals.set(row.task_id, values);
  });

  taskLabelRows.forEach((row) => {
    const values = taskLabels.get(row.task_id) || [];
    const labelName = labelNames.get(row.label_id);
    if (labelName) values.push(labelName);
    taskLabels.set(row.task_id, values);
  });

  commentRows.forEach((row) => {
    const values = taskComments.get(row.task_id) || [];
    values.push({
      id: row.id,
      author: memberNames.get(row.author_member_id) || row.author_name,
      text: row.body,
      createdAt: formatCommentDate(row.created_at),
    });
    taskComments.set(row.task_id, values);
  });

  return taskRows.map((task) => {
    const steps = taskSteps.get(task.id) || {};
    const objectivesByColumn = createWorkflowObjectiveMap(
      task.current_column_code,
      [],
      taskObjectiveRows.get(task.id),
    );

    return {
      id: task.id,
      key: task.task_key,
      createdAt: formatDateOnly(task.created_at),
      title: task.title,
      description: task.description_html,
      assignee: memberNames.get(task.assignee_member_id) || "",
      poNumber: task.po_number,
      quantity: task.quantity_text,
      amount: task.amount_text,
      ex: task.incoterm,
      paymentMethod: task.payment_method,
      shippingMethod: task.shipping_method,
      companyId: task.company_id || "",
      chemicals: taskChemicals.get(task.id) || [],
      labels: taskLabels.get(task.id) || [],
      columnId: task.current_column_code,
      columnDueDates: createWorkflowDueDates(
        Object.fromEntries(Object.entries(steps).map(([code, step]) => [code, step.due_on || ""])),
      ),
      columnActualDates: createWorkflowActualDates(
        Object.fromEntries(Object.entries(steps).map(([code, step]) => [code, step.actual_on || ""])),
      ),
      completedArchivedAt: task.completed_archived_on || "",
      objectives: objectivesByColumn[task.current_column_code] || [],
      objectivesByColumn,
      comments: taskComments.get(task.id) || [],
    };
  });
}

export async function loadSharedData() {
  const [
    membersResult,
    companiesResult,
    chemicalsResult,
    labelsResult,
    columnsResult,
    tasksResult,
    taskChemicalsResult,
    taskLabelsResult,
    stepsResult,
    objectivesResult,
    commentsResult,
  ] = await Promise.all([
    supabase.from("members").select("*").order("created_at"),
    supabase.from("companies").select("*").order("created_at"),
    supabase.from("chemicals").select("*").order("created_at"),
    supabase.from("labels").select("*").order("created_at"),
    supabase.from("workflow_columns").select("*").order("position"),
    supabase.from("tasks").select("*").order("created_at"),
    supabase.from("task_chemicals").select("*"),
    supabase.from("task_labels").select("*"),
    supabase.from("task_workflow_steps").select("*"),
    supabase.from("task_objectives").select("*"),
    supabase
      .from("task_comments")
      .select("*")
      .order("created_at"),
  ]);

  const memberRows = assertResult(membersResult);
  const companyRows = assertResult(companiesResult);
  const chemicalRows = assertResult(chemicalsResult);
  const labelRows = assertResult(labelsResult);
  const columnRows = assertResult(columnsResult);
  const taskRows = assertResult(tasksResult);
  const taskChemicalRows = assertResult(taskChemicalsResult);
  const taskLabelRows = assertResult(taskLabelsResult);
  const stepRows = assertResult(stepsResult);
  const objectiveRows = assertResult(objectivesResult);
  const commentRows = assertResult(commentsResult);

  return {
    memberListVersion: 2,
    members: memberRows.map((member) => member.display_name),
    memberRecords: memberRows.map(mapMember),
    companies: companyRows.map(mapCompany),
    chemicals: chemicalRows.map(mapChemical),
    labels: labelRows.map(mapLabel),
    columns: columnRows.map((column) => ({
      id: column.code,
      title: column.title,
      color: column.color,
    })),
    tasks: mapTasks(
      taskRows,
      { taskChemicalRows, taskLabelRows, stepRows, objectiveRows, commentRows },
      memberRows,
      labelRows,
    ),
  };
}

export async function loadSharedTasks(dataContext) {
  const [
    tasksResult,
    taskChemicalsResult,
    taskLabelsResult,
    stepsResult,
    objectivesResult,
    commentsResult,
  ] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at"),
    supabase.from("task_chemicals").select("*"),
    supabase.from("task_labels").select("*"),
    supabase.from("task_workflow_steps").select("*"),
    supabase.from("task_objectives").select("*"),
    supabase
      .from("task_comments")
      .select("*")
      .order("created_at"),
  ]);

  return mapTasks(
    assertResult(tasksResult),
    {
      taskChemicalRows: assertResult(taskChemicalsResult),
      taskLabelRows: assertResult(taskLabelsResult),
      stepRows: assertResult(stepsResult),
      objectiveRows: assertResult(objectivesResult),
      commentRows: assertResult(commentsResult),
    },
    dataContext?.memberRecords || [],
    dataContext?.labels || [],
  );
}

export async function loadSharedCompanies() {
  return assertResult(
    await supabase.from("companies").select("*").order("created_at"),
  ).map(mapCompany);
}

export async function loadSharedChemicals() {
  return assertResult(
    await supabase.from("chemicals").select("*").order("created_at"),
  ).map(mapChemical);
}

export async function loadSharedLabels() {
  return assertResult(
    await supabase.from("labels").select("*").order("created_at"),
  ).map(mapLabel);
}

export async function saveMemberRecord(name) {
  const row = assertResult(
    await supabase
      .from("members")
      .insert({
        display_name: name,
      })
      .select("*")
      .single(),
  );

  return {
    id: row.id,
    userId: row.user_id,
    name: row.display_name,
  };
}

export async function removeMemberRecord(memberId, replacementMemberId) {
  assertResult(
    await supabase
      .from("tasks")
      .update({ assignee_member_id: replacementMemberId })
      .eq("assignee_member_id", memberId),
  );
  assertResult(
    await supabase
      .from("members")
      .delete()
      .eq("id", memberId),
  );
}

export async function saveCompanyRecord(company) {
  const id = isUuid(company.id) ? company.id : createId();
  const row = assertResult(
    await supabase
      .from("companies")
      .upsert({
        id,
        name: company.name,
        account_number: company.accountNumber,
        office_address: company.officeAddress,
        producer_address: company.producerAddress,
        description_html: company.description,
      })
      .select("*")
      .single(),
  );

  return mapCompany(row);
}

export async function deleteCompanyRecord(companyId) {
  assertResult(
    await supabase.from("companies").delete().eq("id", companyId),
  );
}

export async function saveChemicalRecord(chemical) {
  const id = isUuid(chemical.id) ? chemical.id : createId();
  const row = assertResult(
    await supabase
      .from("chemicals")
      .upsert({
        id,
        name: chemical.name,
        color: chemical.color,
      })
      .select("*")
      .single(),
  );

  return mapChemical(row);
}

export async function deleteChemicalRecord(chemicalId) {
  assertResult(
    await supabase.from("chemicals").delete().eq("id", chemicalId),
  );
}

export async function saveLabelRecord(label) {
  const id = isUuid(label.id) ? label.id : createId();
  const row = assertResult(
    await supabase
      .from("labels")
      .upsert({
        id,
        name: label.name,
        color: label.color,
      })
      .select("*")
      .single(),
  );

  return mapLabel(row);
}

export async function deleteLabelRecord(labelId) {
  assertResult(
    await supabase.from("labels").delete().eq("id", labelId),
  );
}

function getMemberId(data, name) {
  return data.memberRecords?.find((member) => member.name === name)?.id || null;
}

function getLabelId(data, name) {
  return data.labels.find((label) => label.name === name)?.id || null;
}

export async function saveTaskRecord(data, task) {
  const id = isUuid(task.id) ? task.id : createId();
  const objectivesByColumn = createWorkflowObjectiveMap(
    task.columnId,
    task.objectives,
    task.objectivesByColumn,
  );
  const savedTask = {
    ...task,
    id,
    objectives: objectivesByColumn[task.columnId] || [],
    objectivesByColumn,
  };

  assertResult(
    await supabase.from("tasks").upsert({
      id,
      task_key: task.key,
      created_at: toCreatedAtTimestamp(task.createdAt),
      title: task.title,
      description_html: task.description,
      assignee_member_id: getMemberId(data, task.assignee),
      po_number: task.poNumber,
      quantity_text: task.quantity,
      amount_text: task.amount,
      incoterm: task.ex,
      payment_method: task.paymentMethod,
      shipping_method: task.shippingMethod,
      company_id: task.companyId || null,
      current_column_code: task.columnId,
      completed_archived_on: task.completedArchivedAt || null,
    }),
  );

  const childTables = [
    "task_chemicals",
    "task_labels",
  ];
  const deleteResults = await Promise.all(
    childTables.map((table) =>
      supabase.from(table).delete().eq("task_id", id),
    ),
  );
  deleteResults.forEach(assertResult);

  const inserts = [];
  if (task.chemicals.length) {
    inserts.push(
      supabase.from("task_chemicals").insert(
        task.chemicals.map((chemicalId) => ({
          task_id: id,
          chemical_id: chemicalId,
        })),
      ),
    );
  }

  const labelIds = task.labels.map((name) => getLabelId(data, name)).filter(Boolean);
  if (labelIds.length) {
    inserts.push(
      supabase.from("task_labels").insert(
        labelIds.map((labelId) => ({
          task_id: id,
          label_id: labelId,
        })),
      ),
    );
  }

  inserts.push(
    supabase
      .from("task_workflow_steps")
      .upsert(
        {
          task_id: id,
          steps: createWorkflowStepPayload(task),
        },
        { onConflict: "task_id" },
      ),
  );

  inserts.push(
    supabase
      .from("task_objectives")
      .upsert(
        {
          task_id: id,
          objectives: serializeWorkflowObjectiveMap(objectivesByColumn),
        },
        { onConflict: "task_id" },
      ),
  );

  if (task.comments.length) {
    inserts.push(
      supabase.from("task_comments").upsert(
        task.comments.map((comment) => ({
          id: isUuid(comment.id) ? comment.id : createId(),
          task_id: id,
          author_member_id: getMemberId(data, comment.author),
          author_name: comment.author,
          body: comment.text,
        })),
        { onConflict: "id" },
      ),
    );
  }

  const insertResults = await Promise.all(inserts);
  insertResults.forEach(assertResult);
  return savedTask;
}

export async function deleteTaskRecord(taskId) {
  assertResult(
    await supabase.from("tasks").delete().eq("id", taskId),
  );
}

export async function saveCommentRecord(data, taskId, comment) {
  const id = isUuid(comment.id) ? comment.id : createId();
  const row = assertResult(
    await supabase
      .from("task_comments")
      .insert({
        id,
        task_id: taskId,
        author_member_id: getMemberId(data, comment.author),
        author_name: comment.author,
        body: comment.text,
      })
      .select("*")
      .single(),
  );

  return {
    ...comment,
    id: row.id,
    createdAt: formatCommentDate(row.created_at),
  };
}

function prepareImportData(rawData, user) {
  const normalized = normalizeData(rawData);
  const signedInName = getAuthDisplayName(user);
  const companyIds = new Map();
  const chemicalIds = new Map();

  const companies = normalized.companies.map((company) => {
    const id = isUuid(company.id) ? company.id : createId();
    companyIds.set(company.id, id);
    return { ...company, id };
  });
  const chemicals = normalized.chemicals.map((chemical) => {
    const id = isUuid(chemical.id) ? chemical.id : createId();
    chemicalIds.set(chemical.id, id);
    return { ...chemical, id };
  });
  const labels = normalized.labels.map((label) => ({
    ...label,
    id: isUuid(label.id) ? label.id : createId(),
  }));
  const members = [
    signedInName,
    ...normalized.members.filter((name) => name !== signedInName),
  ];

  return {
    ...normalized,
    members,
    companies,
    chemicals,
    labels,
    tasks: normalized.tasks.map((task) => ({
      ...task,
      id: isUuid(task.id) ? task.id : createId(),
      companyId: companyIds.get(task.companyId) || "",
      chemicals: task.chemicals.map((id) => chemicalIds.get(id)).filter(Boolean),
      comments: task.comments.map((comment) => ({
        ...comment,
        id: isUuid(comment.id) ? comment.id : createId(),
      })),
    })),
  };
}

export async function replaceSharedData(rawData, user) {
  const prepared = prepareImportData(rawData, user);
  const current = await loadSharedData();
  const currentMember = current.memberRecords.find((member) => member.userId === user.id);

  assertResult(await supabase.from("tasks").delete().not("id", "is", null));
  assertResult(await supabase.from("companies").delete().not("id", "is", null));
  assertResult(await supabase.from("chemicals").delete().not("id", "is", null));
  assertResult(await supabase.from("labels").delete().not("id", "is", null));
  assertResult(
    await supabase
      .from("members")
      .delete()
      .is("user_id", null),
  );

  const memberRecords = currentMember
    ? [{ ...currentMember, name: getAuthDisplayName(user) }]
    : [];
  for (const name of prepared.members) {
    if (memberRecords.some((member) => member.name === name)) continue;
    memberRecords.push(await saveMemberRecord(name));
  }

  const data = { ...prepared, memberRecords };
  for (const company of data.companies) {
    await saveCompanyRecord(company);
  }
  for (const chemical of data.chemicals) {
    await saveChemicalRecord(chemical);
  }
  for (const label of data.labels) {
    await saveLabelRecord(label);
  }
  for (const task of data.tasks) {
    await saveTaskRecord(data, task);
  }

  assertResult(
    await supabase
      .from("app_state")
      .update({ data_initialized: true })
      .eq("singleton", true),
  );

  return loadSharedData();
}
