/**
 * dbLocal.js
 * Capa de persistencia local IndexedDB para funcionamiento Offline de la App Móvil de Campo.
 */

const DB_NAME = 'CollarNetFieldDB';
const DB_VERSION = 1;
let dbInstance = null;

export async function openDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 1. Almacén para cola de sincronización offline
      if (!db.objectStoreNames.contains('offline_queue')) {
        const queueStore = db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
        queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        queueStore.createIndex('type', 'type', { unique: false });
      }

      // 2. Almacén para caché de datos (animales, collares, potreros)
      if (!db.objectStoreNames.contains('cached_data')) {
        db.createObjectStore('cached_data', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[IndexedDB] Error al abrir la base de datos:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Encola una acción para sincronización posterior
 * @param {string} type - 'VINCULAR_MANGA' | 'REGISTRO_PESAJE' | 'REGISTRO_SANIDAD'
 * @param {object} payload - Datos de la petición
 */
export async function enqueueAction(type, payload, description) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_queue', 'readwrite');
    const store = tx.objectStore('offline_queue');
    const item = {
      type,
      payload,
      description: description || `${type} guardado en campo`,
      timestamp: new Date().toISOString()
    };
    const req = store.add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene todas las acciones pendientes de sincronización
 */
export async function getPendingQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_queue', 'readonly');
    const store = tx.objectStore('offline_queue');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Elimina un elemento de la cola por su ID tras sincronizarlo
 */
export async function removeQueueItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('offline_queue', 'readwrite');
    const store = tx.objectStore('offline_queue');
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Guarda un objeto en la caché local
 */
export async function cacheSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_data', 'readwrite');
    const store = tx.objectStore('cached_data');
    const req = store.put({ key, value, updated_at: new Date().toISOString() });
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene un objeto de la caché local
 */
export async function cacheGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_data', 'readonly');
    const store = tx.objectStore('cached_data');
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}
