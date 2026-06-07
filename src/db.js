const DB_NAME = "taskflow-local-db";
const DB_VERSION = 1;
const STORE_NAME = "app-state";
const DATA_KEY = "taskflow-board-v4";
const OBSOLETE_DATA_KEYS = ["taskflow-board", "taskflow-board-v2", "taskflow-board-v3"];
const LEGACY_STORAGE_KEY = "taskflow-board-v1";

let databasePromise;

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return databasePromise;
}

function waitForTransaction(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function loadStoredData() {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const request = transaction.objectStore(STORE_NAME).get(DATA_KEY);
  const record = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return record?.value || null;
}

export async function saveStoredData(value) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put({
    id: DATA_KEY,
    updatedAt: new Date().toISOString(),
    value,
  });
  await waitForTransaction(transaction);
}

async function deleteStoredDataKeys(keys) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  keys.forEach((key) => store.delete(key));
  await waitForTransaction(transaction);
}

export async function loadInitialData(fallbackData) {
  const storedData = await loadStoredData();
  if (storedData) return storedData;

  let initialValue = fallbackData;
  let legacyValue = null;

  try {
    legacyValue = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyValue) initialValue = JSON.parse(legacyValue);
  } catch {
    legacyValue = null;
  }

  await saveStoredData(initialValue);
  await deleteStoredDataKeys(OBSOLETE_DATA_KEYS);

  if (legacyValue) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // IndexedDB already has the imported data, so an undeletable legacy copy is harmless.
    }
  }

  return initialValue;
}
