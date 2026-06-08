import { normalizeData } from "./model.js";
import {
  createWorkflowActualDates,
  createWorkflowDueDates,
  createWorkflowStartedDates,
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

function mapCompany(row) {
  return {
    id: row.id,
    legacyId: row.legacy_id || "",
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
    legacyId: row.legacy_id || "",
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
    role: row.role,
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
  const taskSteps = new Map();
  const taskObjectives = new Map();
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

  stepRows.forEach((row) => {
    const values = taskSteps.get(row.task_id) || {};
    values[row.column_code] = row;
    taskSteps.set(row.task_id, values);
  });

  objectiveRows.forEach((row) => {
    const values = taskObjectives.get(row.task_id) || [];
    values.push({
      id: row.objective_code,
      text: row.text,
      optional: row.is_optional,
      commentable: row.is_commentable,
      completed: row.is_completed,
      comment: row.comment,
    });
    taskObjectives.set(row.task_id, values);
  });

  commentRows.forEach((row) => {
    const values = taskComments.get(row.task_id) || [];
    values.push({
      id: row.id,
      legacyId: row.legacy_id || "",
      author: memberNames.get(row.author_member_id) || row.author_name,
      text: row.body,
      createdAt: row.legacy_created_at_text || formatCommentDate(row.created_at),
    });
    taskComments.set(row.task_id, values);
  });

  return taskRows.map((task) => {
    const steps = taskSteps.get(task.id) || {};

    return {
      id: task.id,
      legacyId: task.legacy_id || "",
      key: task.task_key,
      createdAt: task.created_on || "",
      title: task.title,
      description: task.description_html,
      type: task.task_type,
      priority: task.priority,
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
      columnStartedDates: createWorkflowStartedDates(
        Object.fromEntries(Object.entries(steps).map(([code, step]) => [code, step.started_on || ""])),
      ),
      completedArchivedAt: task.completed_archived_on || "",
      objectives: taskObjectives.get(task.id) || [],
      comments: taskComments.get(task.id) || [],
    };
  });
}

export async function loadWorkspaceData(workspaceId) {
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
    supabase.from("workspace_members").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("companies").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("chemicals").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("labels").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("workflow_columns").select("*").eq("workspace_id", workspaceId).order("position"),
    supabase.from("tasks").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("task_chemicals").select("*").eq("workspace_id", workspaceId),
    supabase.from("task_labels").select("*").eq("workspace_id", workspaceId),
    supabase.from("task_workflow_steps").select("*").eq("workspace_id", workspaceId),
    supabase
      .from("task_objectives")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("position"),
    supabase
      .from("task_comments")
      .select("*")
      .eq("workspace_id", workspaceId)
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

export async function loadWorkspaceTasks(workspaceId, dataContext) {
  const [
    tasksResult,
    taskChemicalsResult,
    taskLabelsResult,
    stepsResult,
    objectivesResult,
    commentsResult,
  ] = await Promise.all([
    supabase.from("tasks").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("task_chemicals").select("*").eq("workspace_id", workspaceId),
    supabase.from("task_labels").select("*").eq("workspace_id", workspaceId),
    supabase.from("task_workflow_steps").select("*").eq("workspace_id", workspaceId),
    supabase
      .from("task_objectives")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("position"),
    supabase
      .from("task_comments")
      .select("*")
      .eq("workspace_id", workspaceId)
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

export async function loadWorkspaceCompanies(workspaceId) {
  return assertResult(
    await supabase.from("companies").select("*").eq("workspace_id", workspaceId).order("created_at"),
  ).map(mapCompany);
}

export async function loadWorkspaceChemicals(workspaceId) {
  return assertResult(
    await supabase.from("chemicals").select("*").eq("workspace_id", workspaceId).order("created_at"),
  ).map(mapChemical);
}

export async function loadWorkspaceLabels(workspaceId) {
  return assertResult(
    await supabase.from("labels").select("*").eq("workspace_id", workspaceId).order("created_at"),
  ).map(mapLabel);
}

export async function saveWorkspaceMember(workspaceId, name) {
  const row = assertResult(
    await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        display_name: name,
        role: "member",
      })
      .select("*")
      .single(),
  );

  return {
    id: row.id,
    userId: row.user_id,
    name: row.display_name,
    role: row.role,
  };
}

export async function removeWorkspaceMember(workspaceId, memberId, replacementMemberId) {
  assertResult(
    await supabase
      .from("tasks")
      .update({ assignee_member_id: replacementMemberId })
      .eq("workspace_id", workspaceId)
      .eq("assignee_member_id", memberId),
  );
  assertResult(
    await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", memberId),
  );
}

export async function saveCompanyRecord(workspaceId, company) {
  const id = isUuid(company.id) ? company.id : createId();
  const row = assertResult(
    await supabase
      .from("companies")
      .upsert({
        id,
        workspace_id: workspaceId,
        legacy_id: company.legacyId || (!isUuid(company.id) ? company.id : null),
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

export async function deleteCompanyRecord(workspaceId, companyId) {
  assertResult(
    await supabase.from("companies").delete().eq("workspace_id", workspaceId).eq("id", companyId),
  );
}

export async function saveChemicalRecord(workspaceId, chemical) {
  const id = isUuid(chemical.id) ? chemical.id : createId();
  const row = assertResult(
    await supabase
      .from("chemicals")
      .upsert({
        id,
        workspace_id: workspaceId,
        legacy_id: chemical.legacyId || (!isUuid(chemical.id) ? chemical.id : null),
        name: chemical.name,
        color: chemical.color,
      })
      .select("*")
      .single(),
  );

  return mapChemical(row);
}

export async function deleteChemicalRecord(workspaceId, chemicalId) {
  assertResult(
    await supabase.from("chemicals").delete().eq("workspace_id", workspaceId).eq("id", chemicalId),
  );
}

export async function saveLabelRecord(workspaceId, label) {
  const id = isUuid(label.id) ? label.id : createId();
  const row = assertResult(
    await supabase
      .from("labels")
      .upsert({
        id,
        workspace_id: workspaceId,
        name: label.name,
        color: label.color,
      })
      .select("*")
      .single(),
  );

  return mapLabel(row);
}

export async function deleteLabelRecord(workspaceId, labelId) {
  assertResult(
    await supabase.from("labels").delete().eq("workspace_id", workspaceId).eq("id", labelId),
  );
}

function getMemberId(data, name) {
  return data.memberRecords?.find((member) => member.name === name)?.id || null;
}

function getLabelId(data, name) {
  return data.labels.find((label) => label.name === name)?.id || null;
}

export async function saveTaskRecord(workspaceId, data, task) {
  const id = isUuid(task.id) ? task.id : createId();
  const savedTask = { ...task, id };

  assertResult(
    await supabase.from("tasks").upsert({
      id,
      workspace_id: workspaceId,
      legacy_id: task.legacyId || (!isUuid(task.id) ? task.id : null),
      task_key: task.key,
      created_on: task.createdAt || null,
      title: task.title,
      description_html: task.description,
      task_type: task.type || "task",
      priority: task.priority,
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
    "task_workflow_steps",
    "task_objectives",
    "task_comments",
  ];
  const deleteResults = await Promise.all(
    childTables.map((table) =>
      supabase.from(table).delete().eq("workspace_id", workspaceId).eq("task_id", id),
    ),
  );
  deleteResults.forEach(assertResult);

  const inserts = [];
  if (task.chemicals.length) {
    inserts.push(
      supabase.from("task_chemicals").insert(
        task.chemicals.map((chemicalId) => ({
          workspace_id: workspaceId,
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
          workspace_id: workspaceId,
          task_id: id,
          label_id: labelId,
        })),
      ),
    );
  }

  inserts.push(
    supabase.from("task_workflow_steps").insert(
      workflowColumns.map((column) => ({
        workspace_id: workspaceId,
        task_id: id,
        column_code: column.id,
        due_on: task.columnDueDates?.[column.id] || null,
        started_on: task.columnStartedDates?.[column.id] || null,
        actual_on: task.columnActualDates?.[column.id] || null,
      })),
    ),
  );

  if (task.objectives.length) {
    inserts.push(
      supabase.from("task_objectives").insert(
        task.objectives.map((objective, position) => ({
          workspace_id: workspaceId,
          task_id: id,
          column_code: task.columnId,
          objective_code: objective.id,
          text: objective.text,
          is_optional: Boolean(objective.optional),
          is_commentable: Boolean(objective.commentable),
          is_completed: Boolean(objective.completed),
          comment: objective.comment || "",
          position,
        })),
      ),
    );
  }

  if (task.comments.length) {
    inserts.push(
      supabase.from("task_comments").insert(
        task.comments.map((comment) => ({
          id: isUuid(comment.id) ? comment.id : createId(),
          workspace_id: workspaceId,
          task_id: id,
          legacy_id: comment.legacyId || (!isUuid(comment.id) ? comment.id : null),
          author_member_id: getMemberId(data, comment.author),
          author_name: comment.author,
          body: comment.text,
          legacy_created_at_text: comment.createdAt,
        })),
      ),
    );
  }

  const insertResults = await Promise.all(inserts);
  insertResults.forEach(assertResult);
  return savedTask;
}

export async function deleteTaskRecord(workspaceId, taskId) {
  assertResult(
    await supabase.from("tasks").delete().eq("workspace_id", workspaceId).eq("id", taskId),
  );
}

export async function saveCommentRecord(workspaceId, data, taskId, comment) {
  const id = isUuid(comment.id) ? comment.id : createId();
  const row = assertResult(
    await supabase
      .from("task_comments")
      .insert({
        id,
        workspace_id: workspaceId,
        task_id: taskId,
        legacy_id: comment.legacyId || (!isUuid(comment.id) ? comment.id : null),
        author_member_id: getMemberId(data, comment.author),
        author_name: comment.author,
        body: comment.text,
        legacy_created_at_text: comment.createdAt,
      })
      .select("*")
      .single(),
  );

  return {
    ...comment,
    id: row.id,
    legacyId: row.legacy_id || "",
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
    return { ...company, id, legacyId: isUuid(company.id) ? company.legacyId : company.id };
  });
  const chemicals = normalized.chemicals.map((chemical) => {
    const id = isUuid(chemical.id) ? chemical.id : createId();
    chemicalIds.set(chemical.id, id);
    return { ...chemical, id, legacyId: isUuid(chemical.id) ? chemical.legacyId : chemical.id };
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
      legacyId: isUuid(task.id) ? task.legacyId : task.id,
      companyId: companyIds.get(task.companyId) || "",
      chemicals: task.chemicals.map((id) => chemicalIds.get(id)).filter(Boolean),
      comments: task.comments.map((comment) => ({
        ...comment,
        id: isUuid(comment.id) ? comment.id : createId(),
        legacyId: isUuid(comment.id) ? comment.legacyId : comment.id,
      })),
    })),
  };
}

export async function replaceWorkspaceData(workspaceId, rawData, user) {
  const prepared = prepareImportData(rawData, user);
  const current = await loadWorkspaceData(workspaceId);
  const owner = current.memberRecords.find((member) => member.userId === user.id);

  assertResult(await supabase.from("tasks").delete().eq("workspace_id", workspaceId));
  assertResult(await supabase.from("companies").delete().eq("workspace_id", workspaceId));
  assertResult(await supabase.from("chemicals").delete().eq("workspace_id", workspaceId));
  assertResult(await supabase.from("labels").delete().eq("workspace_id", workspaceId));
  assertResult(
    await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .is("user_id", null),
  );

  const memberRecords = owner
    ? [{ ...owner, name: getAuthDisplayName(user) }]
    : [];
  for (const name of prepared.members) {
    if (memberRecords.some((member) => member.name === name)) continue;
    memberRecords.push(await saveWorkspaceMember(workspaceId, name));
  }

  const data = { ...prepared, memberRecords };
  for (const company of data.companies) {
    await saveCompanyRecord(workspaceId, company);
  }
  for (const chemical of data.chemicals) {
    await saveChemicalRecord(workspaceId, chemical);
  }
  for (const label of data.labels) {
    await saveLabelRecord(workspaceId, label);
  }
  for (const task of data.tasks) {
    await saveTaskRecord(workspaceId, data, task);
  }

  assertResult(
    await supabase
      .from("workspaces")
      .update({ data_initialized: true })
      .eq("id", workspaceId),
  );

  return loadWorkspaceData(workspaceId);
}
