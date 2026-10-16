/**
 * COWAI CollarNet V2 - Aplicación CAD 3D Interactiva
 * Motor de visualización WebGL con Three.js, despiece paramétrico, planos de corte,
 * cotas tridimensionales e inspector de espacios y holguras para dispositivos.
 */

// =============================================================================
// 1. CONFIGURACIÓN GLOBAL Y ESTADO DE LA APLICACIÓN
// =============================================================================
const STATE = {
  theme: 'dark',
  explodeFactor: 0.0,
  isExploding: false,
  xrayOpacity: 1.0,
  wireframe: false,
  showDimensions: true,
  slicing: {
    enabled: false,
    axis: 'y', // 'x', 'y', 'z'
    value: 0,
    inverted: false
  },
  selectedPartId: null,
  activeTab: 'fit'
};

// Ángulos y cotas del collar Halter COWAI V2
const CAD_CONSTANTS = {
  ang_deg: 32.0,
  ang_rad: (32.0 * Math.PI) / 180.0,
  r_inner: 125.0,
  x_j: 125.0 * Math.sin((32.0 * Math.PI) / 180.0), // 66.24 mm
  z_j: 125.0 * Math.cos((32.0 * Math.PI) / 180.0), // 106.01 mm
  pod_l: 126.0,
  pod_w: 82.0,
  pod_base_h: 26.0,
  lid_h: 9.0,
  conduit_z: 17.0,
  tunnel_t: 3.0,
  tunnel_h: 5.5,
  strap_w: 52.0
};

// =============================================================================
// 2. BASE DE DATOS DE COMPONENTES Y ANÁLISIS DE HOLGURAS (FIT & CLEARANCE)
// =============================================================================
const COMPONENTS_DB = {
  'bateria': {
    name: 'Pack Batería 21700-3P',
    category: 'Energía / Alimentación',
    partId: 'comp_bateria',
    meshKey: 'comp_bateria',
    color: '#1e88e5',
    dim_comp: { x: 72.0, y: 65.4, z: 21.2 },
    dim_cavity: { x: 76.0, y: 70.0, z: 24.0 },
    clearance: { x: 4.0, y: 4.6, z: 2.8 },
    fit_status: 'ok',
    fit_label: 'Ajuste Óptimo (+4.0 mm libre)',
    description: 'Pack de 3 celdas cilíndricas 21700 Li-ion en paralelo (1S3P / 3.7V 15.000 mAh) con placa BMS de protección y cables flexibles 18AWG.',
    notes: 'La cavidad en la cápsula derecha ofrece 4.0 mm de holgura longitudinal y 4.6 mm lateral, permitiendo colocar espuma EVA de 1.5 mm anti-vibración y salida suave de cables sin estrangulamiento.'
  },
  'lilygo': {
    name: 'Placa MCU LilyGO T-A7670X-S3',
    category: 'Electrónica / Telecomunicaciones',
    partId: 'comp_lilygo',
    meshKey: 'comp_lilygo',
    color: '#0d47a1',
    dim_comp: { x: 75.0, y: 44.0, z: 4.8 },
    dim_cavity: { x: 85.0, y: 74.0, z: 15.5 },
    clearance: { x: 10.0, y: 30.0, z: 6.2 },
    fit_status: 'ok',
    fit_label: 'Espacio Muy Holgado (+10 mm X, +30 mm Y)',
    description: 'Placa base IoT con microcontrolador ESP32-S3 Dual-Core, módem celular 4G LTE Cat-1, GPS/GNSS, slot MicroSIM y puerto USB-C.',
    notes: 'Montada sobre 4 postes cilíndricos de 4.5 mm de altura a 44x28 mm entre centros. El margen lateral de +30 mm deja espacio sobrado para el cableado de la antena y conectores JST.'
  },
  'antena': {
    name: 'Antena Cerámica GNSS Patch',
    category: 'Posicionamiento Satelital',
    partId: 'comp_antena',
    meshKey: 'comp_antena',
    color: '#b0bec5',
    dim_comp: { x: 25.0, y: 25.0, z: 5.15 },
    dim_cavity: { x: 26.0, y: 26.0, z: 10.0 },
    clearance: { x: 1.0, y: 1.0, z: 4.85 },
    fit_status: 'ok',
    fit_label: 'Ajuste Antivibración (+1.0 mm)',
    description: 'Parche cerámico GPS/GLONASS de alta ganancia con plano de masa metálico inferior de 26x26 mm.',
    notes: 'Ubicada en una cuna sobreelevada en la cápsula izquierda para orientarse siempre hacia el cielo cuando el animal pasta, maximizando la recepción satelital.'
  },
  'mppt': {
    name: 'Cargador Solar MPPT (CN3791)',
    category: 'Gestión Energética',
    partId: 'comp_mppt',
    meshKey: 'comp_mppt',
    color: '#c62828',
    dim_comp: { x: 20.0, y: 24.0, z: 7.6 },
    dim_cavity: { x: 24.0, y: 26.0, z: 15.0 },
    clearance: { x: 4.0, y: 2.0, z: 7.4 },
    fit_status: 'ok',
    fit_label: 'Ajuste Óptimo (+4.0 mm X, +2.0 mm Y)',
    description: 'Regulador de carga solar con seguimiento de punto de máxima potencia (MPPT) para exprimir los paneles bajo sombra o sol pleno.',
    notes: 'Alojado en su propio compartimento tabicado al lado del pack de batería para aislar térmicamente la zona de carga.'
  },
  'buzzer': {
    name: 'Zumbador Piezoeléctrico',
    category: 'Estímulo Acústico (Geocercas)',
    partId: 'comp_buzzer',
    meshKey: 'comp_buzzer',
    color: '#212121',
    dim_comp: { x: 12.0, y: 12.0, z: 9.5 },
    dim_cavity: { x: 12.4, y: 12.4, z: 12.0 },
    clearance: { x: 0.4, y: 0.4, z: 2.5 },
    fit_status: 'ok',
    fit_label: 'Ajuste Ceñido (+0.4 mm Ø)',
    description: 'Transductor acústico para entrenamiento y geocercas virtuales ganaderas.',
    notes: 'Alineado con un embudo acústico cónico inferior que amplifica la onda sonora y la proyecta hacia abajo hacia el cuello del animal.'
  },
  'solar': {
    name: 'Paneles Solares Monocristalinos (x2)',
    category: 'Cosecha de Energía',
    partId: 'comp_solar',
    meshKey: 'comp_solar',
    color: '#0a192f',
    dim_comp: { x: 55.0, y: 60.0, z: 2.1 },
    dim_cavity: { x: 56.0, y: 61.0, z: 2.2 },
    clearance: { x: 1.0, y: 1.0, z: 0.1 },
    fit_status: 'ok',
    fit_label: 'Encastre Enrasado (Flush-Mount)',
    description: 'Dos paneles solares (uno en cada tapa de cápsula) de alta eficiencia con encapsulado epoxy resistente al impacto y radiación UV.',
    notes: 'Se montan enrasados con el techo de la tapa para evitar que ramas o frotamiento con arbustos puedan arrancarlos.'
  },
  'cincha': {
    name: 'Cincha Ganadera (Opción A Continua)',
    category: 'Sujeción Estructural',
    partId: 'comp_cincha',
    meshKey: 'comp_cincha',
    color: '#ff6d00',
    dim_comp: { x: 387.0, y: 50.0, z: 3.0 },
    dim_cavity: { x: 404.0, y: 52.0, z: 5.5 },
    clearance: { x: 0.0, y: 2.0, z: 2.5 },
    fit_status: 'ok',
    fit_label: 'Túnel Continuo 52 x 5.5 mm',
    description: 'Correa de nylon de alta tenacidad (ancho 38 mm a 50 mm, espesor 3.0 mm) continua a través de las 2 cápsulas y el puente dorsal sin cortes.',
    notes: 'El túnel continuo de 52x5.5 mm en el piso del collar mantiene la cincha completamente independiente del cableado eléctrico, separada por un tabique macizo de 4.5 mm de TPU.'
  },
  'arnes': {
    name: 'Arnés de Cables Inter-Cápsulas',
    category: 'Interconexión Eléctrica',
    partId: 'comp_arnes',
    meshKey: 'comp_arnes',
    color: '#37474f',
    dim_comp: { x: 186.4, y: 7.0, z: 7.0 },
    dim_cavity: { x: 186.4, y: 8.0, z: 8.0 },
    clearance: { x: 0.0, y: 1.0, z: 1.0 },
    fit_status: 'ok',
    fit_label: 'Conducto Estanco Ø8.0 mm (Z=17 mm)',
    description: 'Mazo de 5 conductores (Alimentación V_BAT, GND, Solar+, Bus de datos) con funda exterior de silicona flexible de Ø7.0 mm.',
    notes: 'Discurre a una altura exacta de Z = 17.0 mm (R = 142.0 mm en el arco), entrando directo a las cámaras de electrónica y batería sin rozar la cincha.'
  },
  'puente': {
    name: 'Puente Dorsal Anatómico COWAI',
    category: 'Estructura Flexible (TPU)',
    partId: 'puente_dorsal_cowai',
    meshKey: 'puente_dorsal_cowai',
    color: '#262930',
    dim_comp: { x: 219.3, y: 82.0, z: 63.6 },
    dim_cavity: { x: 219.3, y: 82.0, z: 63.6 },
    clearance: { x: 0, y: 0, z: 0 },
    fit_status: 'ok',
    fit_label: 'Radio Anatómico R=125 mm',
    description: 'Puente elástico de TPU 95A con radio interior de 125 mm y ángulo de caída de 32° que se amolda suavemente a la cruz del bovino.',
    notes: 'Aloja en su interior el túnel continuo de la cincha, el conducto pasacables, y en sus extremos las dos cunas envolventes con cierre de clip snap-fit y cuellos de estanqueidad IP67.'
  },
  'sello_ip67': {
    name: 'Sello IP67 Frontal y Potting',
    category: 'Estanqueidad Hermética',
    partId: 'sello_ip67',
    meshKey: null,
    color: '#00e5ff',
    dim_comp: { x: 12.0, y: 12.0, z: 2.2 },
    dim_cavity: { x: 12.0, y: 12.0, z: 1.8 },
    clearance: { x: 0.0, y: 0.0, z: -0.4 },
    fit_status: 'ok',
    fit_label: '22.2% Compresión Axial (ISO 3601)',
    description: 'Cuello de TPU sobresaliente de 2.2 mm comprimido 0.4 mm dentro de la cajera frontal de ASA de 1.8 mm de profundidad.',
    notes: 'Complementado con una cajera interior de Ø12x1.8 mm para sellador Sikaflex 221 que elimina por completo cualquier capilaridad hacia los circuitos.'
  }
};

// =============================================================================
// 3. INICIALIZACIÓN DE LA ESCENA THREE.JS
// =============================================================================
let scene, camera, renderer, controls;
let container;
let clipPlane;
let meshes = {};
let nodeGroups = {};
let dimensionLinesGroup;
let raycaster, mouse;
let gridHelper;
let materials = {};

function init() {
  container = document.getElementById('canvas-container');

  // 1. Escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x12151b);

  // Niebla suave de profundidad para aspecto técnico
  scene.fog = new THREE.FogExp2(0x12151b, 0.0018);

  // 2. Cámara
  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 1, 3000);
  camera.up.set(0, 0, 1); // Z es vertical en CAD
  camera.position.set(280, -320, 240);

  // 3. Renderizador
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true; // Activar planos de corte interactivos
  container.appendChild(renderer.domElement);

  // 4. Controles Orbitales (CAD Navigation)
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 1400;
  controls.minDistance = 30;
  controls.target.set(0, 0, 95); // Centrado en la cresta del puente
  controls.update();

  // 5. Iluminación de Estudio CAD
  setupLighting();

  // 6. Cuadrícula de Referencia (Plano de Tierra mm)
  setupGrid();

  // 7. Plano de Corte (Clipping Plane)
  clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

  // 8. Grupo para Cotas y Líneas Dimensionales
  dimensionLinesGroup = new THREE.Group();
  scene.add(dimensionLinesGroup);

  // 9. Raycasting para selección interactiva con clic
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // 10. Cargar y Ensamblar Modelos
  buildAssembly();

  // 11. Crear Cotas CAD 3D
  build3DDimensions();

  // 12. Listeners de Eventos UI
  setupUIEventListeners();

  // 13. Inicializar Modo Oscuro / Claro
  initTheme();

  // 14. Loop de Animación
  window.addEventListener('resize', onWindowResize, false);
  renderer.domElement.addEventListener('pointerdown', onCanvasClick, false);

  animate();
}

// -----------------------------------------------------------------------------
// Iluminación
// -----------------------------------------------------------------------------
function setupLighting() {
  // Luz ambiental suave para sombras no opacas
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  // Luz principal de estudio (Key light)
  const keyLight = new THREE.DirectionalLight(0xfff5ea, 0.85);
  keyLight.position.set(250, -250, 400);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 50;
  keyLight.shadow.camera.far = 1000;
  keyLight.shadow.camera.left = -250;
  keyLight.shadow.camera.right = 250;
  keyLight.shadow.camera.top = 250;
  keyLight.shadow.camera.bottom = -250;
  keyLight.shadow.bias = -0.0005;
  scene.add(keyLight);

  // Luz de relleno fría (Fill light)
  const fillLight = new THREE.DirectionalLight(0x90caf9, 0.45);
  fillLight.position.set(-250, 200, 300);
  scene.add(fillLight);

  // Luz de contra (Rim light) para resaltar contornos y materiales TPU/ASA
  const rimLight = new THREE.DirectionalLight(0x00e5ff, 0.40);
  rimLight.position.set(0, 350, -100);
  scene.add(rimLight);
}

// -----------------------------------------------------------------------------
// Rejilla de Suelo de Ingeniería
// -----------------------------------------------------------------------------
function setupGrid() {
  gridHelper = new THREE.GridHelper(600, 60, 0x00e5ff, 0x263238);
  gridHelper.rotation.x = Math.PI / 2; // Colocar en plano X-Y
  gridHelper.position.z = 0;
  scene.add(gridHelper);
}

// =============================================================================
// 4. CREACIÓN Y ENSAMBLAJE DE LAS MALLAS 3D (CAD ASSEMBLY)
// =============================================================================
function createBufferGeometryFromBase64(b64Data) {
  const binary = atob(b64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const floatArray = new Float32Array(bytes.buffer);
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(floatArray, 3));
  geom.computeVertexNormals();
  return geom;
}

function buildAssembly() {
  const models = window.COWAI_MODELS;
  if (!models) {
    console.error("COWAI_MODELS no encontrado en modelos_geometrias.js");
    return;
  }

  // Materiales PBR Paramétricos
  materials = {
    tpu: new THREE.MeshStandardMaterial({
      color: 0x1a1c22,
      roughness: 0.65,
      metalness: 0.08,
      side: THREE.DoubleSide
    }),
    tpuText: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.05,
      side: THREE.DoubleSide
    }),
    asa: new THREE.MeshStandardMaterial({
      color: 0xdae2ec,
      roughness: 0.42,
      metalness: 0.06,
      side: THREE.DoubleSide
    }),
    gasket: new THREE.MeshStandardMaterial({
      color: 0x00e676,
      roughness: 0.35,
      metalness: 0.0,
      side: THREE.DoubleSide
    }),
    battery: new THREE.MeshStandardMaterial({
      color: 0x1e88e5,
      roughness: 0.35,
      metalness: 0.25,
      side: THREE.DoubleSide
    }),
    lilygo: new THREE.MeshStandardMaterial({
      color: 0x0d47a1,
      roughness: 0.38,
      metalness: 0.28,
      side: THREE.DoubleSide
    }),
    antenna: new THREE.MeshStandardMaterial({
      color: 0xb0bec5,
      roughness: 0.50,
      metalness: 0.15,
      side: THREE.DoubleSide
    }),
    mppt: new THREE.MeshStandardMaterial({
      color: 0xc62828,
      roughness: 0.40,
      metalness: 0.20,
      side: THREE.DoubleSide
    }),
    buzzer: new THREE.MeshStandardMaterial({
      color: 0x212121,
      roughness: 0.70,
      metalness: 0.10,
      side: THREE.DoubleSide
    }),
    solar: new THREE.MeshStandardMaterial({
      color: 0x0d2149,
      roughness: 0.18,
      metalness: 0.35,
      side: THREE.DoubleSide
    }),
    strap: new THREE.MeshStandardMaterial({
      color: 0xff6d00, // Naranja alta visibilidad
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide
    }),
    arnes: new THREE.MeshStandardMaterial({
      color: 0x263238, // Funda de silicona negra
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide
    })
  };

  // Crear Geometrías a partir de COWAI_MODELS
  const geoms = {};
  for (let key in models) {
    geoms[key] = createBufferGeometryFromBase64(models[key].data);
  }

  // 1. Grupo Raíz del Ensamble
  const assemblyGroup = new THREE.Group();
  scene.add(assemblyGroup);
  nodeGroups.assembly = assemblyGroup;

  // 2. Puente Dorsal Central y Logo
  const bridgeGroup = new THREE.Group();
  assemblyGroup.add(bridgeGroup);
  nodeGroups.bridge = bridgeGroup;

  const bridgeMesh = new THREE.Mesh(geoms['puente_dorsal_cowai'], materials.tpu);
  bridgeMesh.castShadow = true;
  bridgeMesh.receiveShadow = true;
  bridgeMesh.userData = { id: 'puente', name: 'Puente Dorsal TPU', type: 'structure' };
  bridgeGroup.add(bridgeMesh);
  meshes.bridge = bridgeMesh;

  const badgeMesh = new THREE.Mesh(geoms['puente_texto_cowai'], materials.tpuText);
  badgeMesh.userData = { id: 'texto_cowai', name: 'Emblema y Texto COWAI', type: 'badge' };
  bridgeGroup.add(badgeMesh);
  meshes.badge = badgeMesh;

  // 3. Cincha y Arnés Pasante (Globalmente alineados)
  const strapMesh = new THREE.Mesh(geoms['comp_cincha'], materials.strap);
  strapMesh.castShadow = true;
  strapMesh.userData = { id: 'cincha', name: 'Cincha Ganadera 50mm (Túnel Continuo)' };
  assemblyGroup.add(strapMesh);
  meshes.strap = strapMesh;

  const arnesMesh = new THREE.Mesh(geoms['comp_arnes'], materials.arnes);
  arnesMesh.userData = { id: 'arnes', name: 'Arnés de Cables Inter-Cápsulas (Ø7 mm)' };
  assemblyGroup.add(arnesMesh);
  meshes.arnes = arnesMesh;

  // ---------------------------------------------------------------------------
  // 4. Cápsula Derecha (Batería 21700-3P + MPPT + Buzzer + Panel Solar 2)
  // ---------------------------------------------------------------------------
  const ang = CAD_CONSTANTS.ang_rad;
  const x_j = CAD_CONSTANTS.x_j;
  const z_j = CAD_CONSTANTS.z_j;

  const rightPodGroup = new THREE.Group();
  // Posicionar y rotar el pod derecho según collar_halter_v2.scad
  rightPodGroup.position.set(x_j, 0, z_j);
  rightPodGroup.rotation.y = ang; // Rotación en plano X-Z
  assemblyGroup.add(rightPodGroup);
  nodeGroups.rightPod = rightPodGroup;

  // Subgrupo local centrado en Y = -pod_w/2
  const rightLocal = new THREE.Group();
  rightLocal.position.set(0, -CAD_CONSTANTS.pod_w / 2, 0);
  rightPodGroup.add(rightLocal);
  nodeGroups.rightLocal = rightLocal;

  // Base Derecha ASA
  const rightBaseMesh = new THREE.Mesh(geoms['capsula_derecha_base_bateria_21700'], materials.asa);
  rightBaseMesh.castShadow = true;
  rightBaseMesh.receiveShadow = true;
  rightBaseMesh.userData = { id: 'pod_right_base', name: 'Cápsula Derecha Base (ASA)' };
  rightLocal.add(rightBaseMesh);
  meshes.rightBase = rightBaseMesh;

  // Tapa Derecha ASA (Se eleva en despiece)
  const rightLidGroup = new THREE.Group();
  rightLidGroup.position.set(0, 0, CAD_CONSTANTS.pod_base_h);
  rightLocal.add(rightLidGroup);
  nodeGroups.rightLid = rightLidGroup;

  const rightLidMesh = new THREE.Mesh(geoms['capsula_derecha_tapa_solar'], materials.asa);
  rightLidMesh.castShadow = true;
  rightLidMesh.userData = { id: 'pod_right_lid', name: 'Cápsula Derecha Tapa Solar (ASA)' };
  rightLidGroup.add(rightLidMesh);
  meshes.rightLid = rightLidMesh;

  // Junta Tórica Derecha (IP67)
  const rightGasketGroup = new THREE.Group();
  rightGasketGroup.position.set(0, 0, CAD_CONSTANTS.pod_base_h - 2.8);
  rightLocal.add(rightGasketGroup);
  nodeGroups.rightGasket = rightGasketGroup;

  const rightGasketMesh = new THREE.Mesh(geoms['junta_estanca_tpu_ip67'], materials.gasket);
  rightGasketMesh.userData = { id: 'junta_right', name: 'Junta Tórica Estanca IP67 Derecha' };
  rightGasketGroup.add(rightGasketMesh);
  meshes.rightGasket = rightGasketMesh;

  // Panel Solar Derecho
  const rightSolarGroup = new THREE.Group();
  rightSolarGroup.position.set((CAD_CONSTANTS.pod_l - 55.0) / 2 + 8, (CAD_CONSTANTS.pod_w - 60.0) / 2, CAD_CONSTANTS.pod_base_h + CAD_CONSTANTS.lid_h - 2.0 + 0.2);
  rightLocal.add(rightSolarGroup);
  nodeGroups.rightSolar = rightSolarGroup;

  const rightSolarMesh = new THREE.Mesh(geoms['comp_solar'], materials.solar);
  rightSolarMesh.userData = { id: 'solar', name: 'Panel Solar 2 (55x60 mm)' };
  rightSolarGroup.add(rightSolarMesh);
  meshes.rightSolar = rightSolarMesh;

  // Componentes Internos Derecho (Pack Batería 21700-3P)
  const rightBatGroup = new THREE.Group();
  // Posición CAD: translate([11.5, (pod_w - bat_w)/2, 10.5])
  rightBatGroup.position.set(11.5, (CAD_CONSTANTS.pod_w - 65.4) / 2, 10.5);
  rightLocal.add(rightBatGroup);
  nodeGroups.rightBat = rightBatGroup;

  const batMesh = new THREE.Mesh(geoms['comp_bateria'], materials.battery);
  batMesh.castShadow = true;
  batMesh.userData = { id: 'bateria', name: 'Pack Batería 21700-3P (Li-ion)' };
  rightBatGroup.add(batMesh);
  meshes.battery = batMesh;

  // Cargador Solar MPPT
  const rightMpptGroup = new THREE.Group();
  rightMpptGroup.position.set(73.0 + 16.0, (CAD_CONSTANTS.pod_w - 26.0) / 2, 10.5);
  rightLocal.add(rightMpptGroup);
  nodeGroups.rightMppt = rightMpptGroup;

  const mpptMesh = new THREE.Mesh(geoms['comp_mppt'], materials.mppt);
  mpptMesh.userData = { id: 'mppt', name: 'Módulo Regulador Solar MPPT (CN3791)' };
  rightMpptGroup.add(mpptMesh);
  meshes.mppt = mpptMesh;

  // Buzzer Acústico
  const rightBuzzerGroup = new THREE.Group();
  rightBuzzerGroup.position.set(73.0 + 25.0 + 6.0, 16.0 + 6.0, 10.5);
  rightLocal.add(rightBuzzerGroup);
  nodeGroups.rightBuzzer = rightBuzzerGroup;

  const buzzerMesh = new THREE.Mesh(geoms['comp_buzzer'], materials.buzzer);
  buzzerMesh.userData = { id: 'buzzer', name: 'Zumbador Piezoeléctrico' };
  rightBuzzerGroup.add(buzzerMesh);
  meshes.buzzer = buzzerMesh;

  // ---------------------------------------------------------------------------
  // 5. Cápsula Izquierda (Electrónica LILYGO + Antena GNSS + Panel Solar 1)
  // ---------------------------------------------------------------------------
  const leftPodGroup = new THREE.Group();
  // Simetría en plano X: mirror([1,0,0]) translate([x_j, 0, z_j]) rotate([0, ang, 0])
  leftPodGroup.position.set(-x_j, 0, z_j);
  leftPodGroup.rotation.y = -ang;
  leftPodGroup.scale.set(-1, 1, 1); // Espejo a lo largo de X
  assemblyGroup.add(leftPodGroup);
  nodeGroups.leftPod = leftPodGroup;

  const leftLocal = new THREE.Group();
  leftLocal.position.set(0, -CAD_CONSTANTS.pod_w / 2, 0);
  leftPodGroup.add(leftLocal);
  nodeGroups.leftLocal = leftLocal;

  // Base Izquierda ASA
  const leftBaseMesh = new THREE.Mesh(geoms['capsula_izquierda_base_lilygo'], materials.asa);
  leftBaseMesh.castShadow = true;
  leftBaseMesh.receiveShadow = true;
  leftBaseMesh.userData = { id: 'pod_left_base', name: 'Cápsula Izquierda Base (ASA)' };
  leftLocal.add(leftBaseMesh);
  meshes.leftBase = leftBaseMesh;

  // Tapa Izquierda ASA
  const leftLidGroup = new THREE.Group();
  leftLidGroup.position.set(0, 0, CAD_CONSTANTS.pod_base_h);
  leftLocal.add(leftLidGroup);
  nodeGroups.leftLid = leftLidGroup;

  const leftLidMesh = new THREE.Mesh(geoms['capsula_izquierda_tapa_solar'], materials.asa);
  leftLidMesh.castShadow = true;
  leftLidMesh.userData = { id: 'pod_left_lid', name: 'Cápsula Izquierda Tapa Solar (ASA)' };
  leftLidGroup.add(leftLidMesh);
  meshes.leftLid = leftLidMesh;

  // Junta Tórica Izquierda
  const leftGasketGroup = new THREE.Group();
  leftGasketGroup.position.set(0, 0, CAD_CONSTANTS.pod_base_h - 2.8);
  leftLocal.add(leftGasketGroup);
  nodeGroups.leftGasket = leftGasketGroup;

  const leftGasketMesh = new THREE.Mesh(geoms['junta_estanca_tpu_ip67'], materials.gasket);
  leftGasketMesh.userData = { id: 'junta_left', name: 'Junta Tórica Estanca IP67 Izquierda' };
  leftGasketGroup.add(leftGasketMesh);
  meshes.leftGasket = leftGasketMesh;

  // Panel Solar Izquierdo
  const leftSolarGroup = new THREE.Group();
  leftSolarGroup.position.set((CAD_CONSTANTS.pod_l - 55.0) / 2 + 8, (CAD_CONSTANTS.pod_w - 60.0) / 2, CAD_CONSTANTS.pod_base_h + CAD_CONSTANTS.lid_h - 2.0 + 0.2);
  leftLocal.add(leftSolarGroup);
  nodeGroups.leftSolar = leftSolarGroup;

  const leftSolarMesh = new THREE.Mesh(geoms['comp_solar'], materials.solar);
  leftSolarMesh.userData = { id: 'solar', name: 'Panel Solar 1 (55x60 mm)' };
  leftSolarGroup.add(leftSolarMesh);
  meshes.leftSolar = leftSolarMesh;

  // Placa LILYGO T-A7670X
  const leftLilygoGroup = new THREE.Group();
  leftLilygoGroup.position.set(8.0, 8.0, 15.0);
  leftLocal.add(leftLilygoGroup);
  nodeGroups.leftLilygo = leftLilygoGroup;

  const lilygoMesh = new THREE.Mesh(geoms['comp_lilygo'], materials.lilygo);
  lilygoMesh.castShadow = true;
  lilygoMesh.userData = { id: 'lilygo', name: 'Placa MCU LilyGO T-A7670X-S3' };
  leftLilygoGroup.add(lilygoMesh);
  meshes.lilygo = lilygoMesh;

  // Antena GNSS
  const leftAntennaGroup = new THREE.Group();
  leftAntennaGroup.position.set(CAD_CONSTANTS.pod_l - 42.0 + 2.0, CAD_CONSTANTS.pod_w - 42.0 + 2.0, 10.5);
  leftLocal.add(leftAntennaGroup);
  nodeGroups.leftAntenna = leftAntennaGroup;

  const antennaMesh = new THREE.Mesh(geoms['comp_antena'], materials.antenna);
  antennaMesh.userData = { id: 'antena', name: 'Antena Cerámica GNSS Patch' };
  leftAntennaGroup.add(antennaMesh);
  meshes.antenna = antennaMesh;
}

// =============================================================================
// 5. COTAS DIMENSIONALES 3D (CAD BLUEPRINT OVERLAYS)
// =============================================================================
function create3DDimensionLine(start, end, text, color = 0x00e5ff) {
  const group = new THREE.Group();

  // Línea principal
  const material = new THREE.LineBasicMaterial({ color: color, depthTest: false, transparent: true, opacity: 0.9 });
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  group.add(line);

  // Marcas en extremos (Ticks perpendiculares)
  const dir = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
  const tickLength = 5.0;

  // Vector perpendicular en Z o Y
  const perp = new THREE.Vector3(0, 0, 1);
  if (Math.abs(dir.dot(perp)) > 0.9) perp.set(0, 1, 0);
  const side = new THREE.Vector3().crossVectors(dir, perp).normalize().multiplyScalar(tickLength);

  const tick1Geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3().subVectors(points[0], side),
    new THREE.Vector3().addVectors(points[0], side)
  ]);
  const tick2Geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3().subVectors(points[1], side),
    new THREE.Vector3().addVectors(points[1], side)
  ]);

  group.add(new THREE.Line(tick1Geom, material));
  group.add(new THREE.Line(tick2Geom, material));

  // Etiqueta flotante Sprite de Texto
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;

  ctx.fillStyle = 'rgba(15, 18, 24, 0.85)';
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  if (ctx.roundRect) {
    ctx.roundRect(4, 4, 248, 56, 12);
  } else {
    ctx.rect(4, 4, 248, 56);
  }
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 24px JetBrains Mono, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(30, 8, 1);

  // Posición en punto medio
  const mid = new THREE.Vector3().addVectors(points[0], points[1]).multiplyScalar(0.5);
  mid.add(new THREE.Vector3(0, 0, 6)); // Ligeramente sobreelevado
  sprite.position.copy(mid);
  group.add(sprite);

  return group;
}

function build3DDimensions() {
  dimensionLinesGroup.clear();

  // 1. Cota: Envergadura total del collar (404.5 mm)
  dimensionLinesGroup.add(create3DDimensionLine([-202.2, -60, 40], [202.2, -60, 40], "404.5 mm (Envergadura)", 0x00e5ff));

  // 2. Cota: Radio Interior del Puente (R = 125.0 mm)
  dimensionLinesGroup.add(create3DDimensionLine([0, 0, 0], [0, 0, 125], "R 125.0 mm (Intradós)", 0x2979ff));

  // 3. Cota: Altura de la Cresta del Puente (26.0 mm espesor)
  dimensionLinesGroup.add(create3DDimensionLine([0, 48, 125], [0, 48, 151], "26.0 mm (Cima)", 0xffb300));

  // 4. Cota: Túnel de Cincha Ganadera (52.0 mm x 5.5 mm)
  dimensionLinesGroup.add(create3DDimensionLine([0, -26, 128 + 2.75], [0, 26, 128 + 2.75], "52.0 x 5.5 mm (Túnel Cincha)", 0xff9100));

  // 5. Cota: Eje Pasacables y Tabique Macizo de 4.5 mm
  dimensionLinesGroup.add(create3DDimensionLine([0, 0, 133.5], [0, 0, 138.0], "4.5 mm (Tabique TPU)", 0x00e676));
  dimensionLinesGroup.add(create3DDimensionLine([0, 12, 142.0], [0, 20, 142.0], "Ø8.0 mm (Cables Z=17)", 0x00e5ff));

  // 6. Cota: Cápsula Derecha Externa (126.0 mm x 82.0 mm x 35.0 mm)
  // Localizada en la cápsula derecha
  const x_j = CAD_CONSTANTS.x_j;
  const z_j = CAD_CONSTANTS.z_j;
  const ang = CAD_CONSTANTS.ang_rad;

  const rightPodCenter = new THREE.Vector3(x_j + 63 * Math.cos(ang), 0, z_j - 63 * Math.sin(ang));
  dimensionLinesGroup.add(create3DDimensionLine(
    [x_j, -55, z_j - 10], 
    [x_j + 126 * Math.cos(ang), -55, z_j - 126 * Math.sin(ang) - 10],
    "126.0 mm (Cápsula)",
    0xd500f9
  ));

  // Visibilidad controlada por STATE.showDimensions
  dimensionLinesGroup.visible = STATE.showDimensions;
}

// =============================================================================
// 6. CONTROLADOR DE DESPIECE INTERACTIVO (EXPLODED VIEW)
// =============================================================================
function updateExplosion(val) {
  STATE.explodeFactor = val;

  const f = val;
  const ang = CAD_CONSTANTS.ang_rad;
  const x_j = CAD_CONSTANTS.x_j;
  const z_j = CAD_CONSTANTS.z_j;

  // 1. Desplazamiento exterior de las cápsulas en su ángulo natural de 32°
  const slideDist = f * 55.0; // Se separan 55 mm hacia afuera de las cunas de TPU
  if (nodeGroups.rightPod) {
    nodeGroups.rightPod.position.set(
      x_j + slideDist * Math.cos(ang),
      0,
      z_j - slideDist * Math.sin(ang)
    );
  }
  if (nodeGroups.leftPod) {
    nodeGroups.leftPod.position.set(
      -x_j - slideDist * Math.cos(ang),
      0,
      z_j - slideDist * Math.sin(ang)
    );
  }

  // 2. Elevación de Tapas en Z local (+45 mm)
  if (nodeGroups.rightLid) nodeGroups.rightLid.position.z = CAD_CONSTANTS.pod_base_h + f * 45.0;
  if (nodeGroups.leftLid) nodeGroups.leftLid.position.z = CAD_CONSTANTS.pod_base_h + f * 45.0;

  // 3. Elevación de Juntas Tóricas (+25 mm)
  if (nodeGroups.rightGasket) nodeGroups.rightGasket.position.z = (CAD_CONSTANTS.pod_base_h - 2.8) + f * 25.0;
  if (nodeGroups.leftGasket) nodeGroups.leftGasket.position.z = (CAD_CONSTANTS.pod_base_h - 2.8) + f * 25.0;

  // 4. Elevación de Paneles Solares (+65 mm)
  const baseSolarZ = CAD_CONSTANTS.pod_base_h + CAD_CONSTANTS.lid_h - 2.0 + 0.2;
  if (nodeGroups.rightSolar) nodeGroups.rightSolar.position.z = baseSolarZ + f * 65.0;
  if (nodeGroups.leftSolar) nodeGroups.leftSolar.position.z = baseSolarZ + f * 65.0;

  // 5. Elevación de Componentes Internos (+35 mm para inspección visual)
  if (nodeGroups.rightBat) nodeGroups.rightBat.position.z = 10.5 + f * 35.0;
  if (nodeGroups.rightMppt) nodeGroups.rightMppt.position.z = 10.5 + f * 35.0;
  if (nodeGroups.rightBuzzer) nodeGroups.rightBuzzer.position.z = 10.5 + f * 35.0;
  if (nodeGroups.leftLilygo) nodeGroups.leftLilygo.position.z = 15.0 + f * 35.0;
  if (nodeGroups.leftAntenna) nodeGroups.leftAntenna.position.z = 10.5 + f * 35.0;

  // 6. Elevación del Emblema COWAI sobre la cresta del puente
  if (meshes.badge) meshes.badge.position.z = f * 16.0;

  // Actualizar texto del slider
  const label = document.getElementById('explode-value');
  if (label) label.textContent = Math.round(f * 100) + '%';
}

// =============================================================================
// 7. PLANO DE CORTE TRANSVERSAL DINÁMICO (SECTION SLICING)
// =============================================================================
function updateSlicing() {
  if (!STATE.slicing.enabled) {
    renderer.clippingPlanes = [];
    return;
  }

  const axis = STATE.slicing.axis;
  const val = STATE.slicing.value;
  const sign = STATE.slicing.inverted ? -1 : 1;

  if (axis === 'x') {
    clipPlane.set(new THREE.Vector3(sign, 0, 0), -sign * val);
  } else if (axis === 'y') {
    clipPlane.set(new THREE.Vector3(0, sign, 0), -sign * val);
  } else if (axis === 'z') {
    clipPlane.set(new THREE.Vector3(0, 0, sign), -sign * val);
  }

  renderer.clippingPlanes = [clipPlane];
}

// =============================================================================
// 8. MODO RAYOS X / TRANSPARENCIA
// =============================================================================
function updateXRayOpacity(val) {
  STATE.xrayOpacity = val;
  const isTransparent = val < 0.98;

  const shellMeshes = [
    meshes.bridge,
    meshes.rightBase,
    meshes.rightLid,
    meshes.leftBase,
    meshes.leftLid
  ];

  shellMeshes.forEach(mesh => {
    if (mesh && mesh.material) {
      mesh.material.transparent = isTransparent;
      mesh.material.opacity = val;
      mesh.material.depthWrite = !isTransparent;
      mesh.material.needsUpdate = true;
    }
  });

  const label = document.getElementById('xray-value');
  if (label) label.textContent = Math.round(val * 100) + '%';
}

// =============================================================================
// 9. VISTAS DE CÁMARA PREESTABLECIDAS
// =============================================================================
function setCameraPreset(preset) {
  const duration = 800; // ms
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  let endPos, endTarget;

  switch (preset) {
    case 'iso':
      endPos = new THREE.Vector3(280, -320, 240);
      endTarget = new THREE.Vector3(0, 0, 95);
      break;
    case 'top':
      endPos = new THREE.Vector3(0, 0, 480);
      endTarget = new THREE.Vector3(0, 0, 95);
      break;
    case 'front':
      endPos = new THREE.Vector3(0, -450, 95);
      endTarget = new THREE.Vector3(0, 0, 95);
      break;
    case 'side':
      endPos = new THREE.Vector3(450, 0, 95);
      endTarget = new THREE.Vector3(0, 0, 95);
      break;
    case 'pod_right': // Enfoque en pack 21700
      endPos = new THREE.Vector3(220, -180, 160);
      endTarget = new THREE.Vector3(CAD_CONSTANTS.x_j + 40, 0, CAD_CONSTANTS.z_j - 20);
      selectComponent('bateria');
      break;
    case 'pod_left': // Enfoque en LilyGO
      endPos = new THREE.Vector3(-220, -180, 160);
      endTarget = new THREE.Vector3(-CAD_CONSTANTS.x_j - 40, 0, CAD_CONSTANTS.z_j - 20);
      selectComponent('lilygo');
      break;
    case 'bridge': // Enfoque en el túnel dorsal y sello
      endPos = new THREE.Vector3(0, -180, 170);
      endTarget = new THREE.Vector3(0, 0, 135);
      selectComponent('cincha');
      break;
  }

  const startTime = performance.now();
  function tweenCamera(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1.0);
    const ease = 0.5 - Math.cos(progress * Math.PI) / 2; // Ease in-out

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    controls.update();

    if (progress < 1.0) {
      requestAnimationFrame(tweenCamera);
    }
  }
  requestAnimationFrame(tweenCamera);

  // Actualizar botones de vista activa
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === preset);
  });
}

// =============================================================================
// 10. INTERACCIÓN Y SELECCIÓN DE COMPONENTES (CLICK TO INSPECT)
// =============================================================================
function selectComponent(compKey) {
  STATE.selectedPartId = compKey;
  const comp = COMPONENTS_DB[compKey];
  if (!comp) return;

  // Cambiar pestaña del panel derecho a 'inspector'
  switchTab('inspector');

  // Rellenar datos en la tarjeta del Inspector
  const container = document.getElementById('inspector-content');
  if (container) {
    container.innerHTML = `
      <div class="fit-card">
        <div class="fit-card-header">
          <div class="fit-card-title">
            <span class="part-color-dot" style="background:${comp.color};"></span>
            ${comp.name}
          </div>
          <span class="fit-badge ${comp.fit_status}">${comp.fit_label}</span>
        </div>

        <table class="dim-table">
          <thead>
            <tr>
              <th>Dimensión</th>
              <th>Componente</th>
              <th>Cavidad Caja</th>
              <th>Holgura Libre</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Longitud (X)</td>
              <td>${comp.dim_comp.x} mm</td>
              <td>${comp.dim_cavity.x} mm</td>
              <td class="clearance-val">+${comp.clearance.x} mm</td>
            </tr>
            <tr>
              <td>Ancho (Y)</td>
              <td>${comp.dim_comp.y} mm</td>
              <td>${comp.dim_cavity.y} mm</td>
              <td class="clearance-val">+${comp.clearance.y} mm</td>
            </tr>
            <tr>
              <td>Altura (Z)</td>
              <td>${comp.dim_comp.z} mm</td>
              <td>${comp.dim_cavity.z} mm</td>
              <td class="clearance-val">+${comp.clearance.z} mm</td>
            </tr>
          </tbody>
        </table>

        <div class="fit-card-notes">
          <strong>Propósito:</strong> ${comp.description}<br><br>
          <strong>Criterio Dimensional:</strong> ${comp.notes}
        </div>
      </div>
    `;
  }

  // Resaltar en el árbol
  document.querySelectorAll('.tree-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.part === compKey);
  });
}

function onCanvasClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const interactableMeshes = Object.values(meshes).filter(m => m && m.visible);
  const intersects = raycaster.intersectObjects(interactableMeshes, false);

  if (intersects.length > 0) {
    const hit = intersects[0].object;
    const partId = hit.userData.id;

    // Buscar si corresponde a una clave en COMPONENTS_DB
    if (COMPONENTS_DB[partId]) {
      selectComponent(partId);
    } else {
      // Intentar mapear partes estructurales
      if (partId.includes('right')) selectComponent('bateria');
      else if (partId.includes('left')) selectComponent('lilygo');
      else if (partId.includes('bridge') || partId.includes('puente')) selectComponent('puente');
    }
  }
}

// =============================================================================
// 11. GESTIÓN DE UI, PESTAÑAS Y EVENTOS
// =============================================================================
function switchTab(tabId) {
  STATE.activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabId}`);
  });
}

// =============================================================================
// GESTIÓN DE MODO CLARO / OSCURO (STUDIO CAD THEME)
// =============================================================================
function setTheme(themeName) {
  STATE.theme = themeName;
  try {
    localStorage.setItem('cowai_cad_theme', themeName);
  } catch (e) {}

  const themeBtn = document.getElementById('btn-theme-toggle');
  const isLight = (themeName === 'light');

  if (isLight) {
    document.body.classList.add('theme-light');
    if (themeBtn) {
      themeBtn.innerHTML = '🌙';
      themeBtn.title = 'Cambiar a Modo Oscuro (Studio)';
    }
    // Ajuste de fondo de escena y niebla 3D
    if (scene) {
      scene.background.setHex(0xf8fafc);
      if (scene.fog) scene.fog.color.setHex(0xf8fafc);
    }
    // Rejilla de ingeniería en modo claro
    if (gridHelper) {
      scene.remove(gridHelper);
      gridHelper = new THREE.GridHelper(600, 60, 0x0284c7, 0xcbd5e1);
      gridHelper.rotation.x = Math.PI / 2;
      gridHelper.position.z = 0;
      scene.add(gridHelper);
    }
    // Contraste óptico para piezas blancas de ASA sobre fondo claro
    if (materials && materials.asa) {
      materials.asa.color.setHex(0xcfd8dc);
    }
  } else {
    document.body.classList.remove('theme-light');
    if (themeBtn) {
      themeBtn.innerHTML = '☀️';
      themeBtn.title = 'Cambiar a Modo Claro (Studio)';
    }
    // Fondo de escena y niebla en modo oscuro
    if (scene) {
      scene.background.setHex(0x12151b);
      if (scene.fog) scene.fog.color.setHex(0x12151b);
    }
    // Rejilla de ingeniería en modo oscuro
    if (gridHelper) {
      scene.remove(gridHelper);
      gridHelper = new THREE.GridHelper(600, 60, 0x00e5ff, 0x263238);
      gridHelper.rotation.x = Math.PI / 2;
      gridHelper.position.z = 0;
      scene.add(gridHelper);
    }
    if (materials && materials.asa) {
      materials.asa.color.setHex(0xdae2ec);
    }
  }

  // Actualizar color de líneas de cotas para contraste
  if (dimensionLinesGroup) {
    dimensionLinesGroup.traverse((child) => {
      if (child.isLine && child.material) {
        child.material.color.setHex(isLight ? 0x0284c7 : 0x00e5ff);
      }
    });
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function initTheme() {
  let saved = 'dark';
  try {
    saved = localStorage.getItem('cowai_cad_theme') || 'dark';
  } catch (e) {}
  setTheme(saved);
}

function setupUIEventListeners() {
  // Botón Alternar Modo Claro / Oscuro
  const themeToggleBtn = document.getElementById('btn-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = (STATE.theme === 'dark') ? 'light' : 'dark';
      setTheme(nextTheme);
    });
  }

  // Slider de Despiece (Explosion)
  const explodeSlider = document.getElementById('explode-slider');
  if (explodeSlider) {
    explodeSlider.addEventListener('input', (e) => {
      updateExplosion(parseFloat(e.target.value));
    });
  }

  // Botón Animar Despiece
  const playExplodeBtn = document.getElementById('btn-play-explode');
  if (playExplodeBtn) {
    playExplodeBtn.addEventListener('click', () => {
      STATE.isExploding = !STATE.isExploding;
      playExplodeBtn.textContent = STATE.isExploding ? '⏸ Pausar' : '▶ Animar';
    });
  }

  // Slider Rayos X
  const xraySlider = document.getElementById('xray-slider');
  if (xraySlider) {
    xraySlider.addEventListener('input', (e) => {
      updateXRayOpacity(parseFloat(e.target.value));
    });
  }

  // Toggle Cotas 3D
  const dimToggle = document.getElementById('toggle-dimensions');
  if (dimToggle) {
    dimToggle.addEventListener('change', (e) => {
      STATE.showDimensions = e.target.checked;
      dimensionLinesGroup.visible = STATE.showDimensions;
    });
  }

  // Toggle Modo Alámbrico
  const wireToggle = document.getElementById('toggle-wireframe');
  if (wireToggle) {
    wireToggle.addEventListener('change', (e) => {
      STATE.wireframe = e.target.checked;
      Object.values(meshes).forEach(m => {
        if (m && m.material) m.material.wireframe = STATE.wireframe;
      });
    });
  }

  // Controles de Plano de Corte (Section Slicer)
  const sliceToggle = document.getElementById('toggle-slicing');
  if (sliceToggle) {
    sliceToggle.addEventListener('change', (e) => {
      STATE.slicing.enabled = e.target.checked;
      const sliceControls = document.getElementById('slice-controls');
      if (sliceControls) sliceControls.style.display = e.target.checked ? 'flex' : 'none';
      updateSlicing();
    });
  }

  document.querySelectorAll('.slice-axis-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.slice-axis-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.slicing.axis = btn.dataset.axis;
      updateSlicing();
    });
  });

  const sliceSlider = document.getElementById('slice-slider');
  if (sliceSlider) {
    sliceSlider.addEventListener('input', (e) => {
      STATE.slicing.value = parseFloat(e.target.value);
      const valLabel = document.getElementById('slice-value');
      if (valLabel) valLabel.textContent = e.target.value + ' mm';
      updateSlicing();
    });
  }

  const sliceInvert = document.getElementById('btn-slice-invert');
  if (sliceInvert) {
    sliceInvert.addEventListener('click', () => {
      STATE.slicing.inverted = !STATE.slicing.inverted;
      updateSlicing();
    });
  }

  // Botones de Vistas de Cámara
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setCameraPreset(btn.dataset.view);
    });
  });

  // Pestañas del Panel Derecho
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Árbol de Piezas (Tree View - Visibilidad y Selección)
  document.querySelectorAll('.tree-item').forEach(item => {
    const partKey = item.dataset.part;
    item.addEventListener('click', (e) => {
      if (!e.target.classList.contains('vis-btn') && !e.target.classList.contains('solo-btn')) {
        selectComponent(partKey);
      }
    });

    const visBtn = item.querySelector('.vis-btn');
    if (visBtn) {
      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetMesh = meshes[partKey] || Object.values(meshes).find(m => m && m.userData.id === partKey);
        if (targetMesh) {
          targetMesh.visible = !targetMesh.visible;
          visBtn.textContent = targetMesh.visible ? '👁' : '🚫';
          visBtn.classList.toggle('visible', targetMesh.visible);
        }
      });
    }

    const soloBtn = item.querySelector('.solo-btn');
    if (soloBtn) {
      soloBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Object.values(meshes).forEach(m => {
          if (m) m.visible = (m.userData.id === partKey);
        });
        document.querySelectorAll('.vis-btn').forEach(b => {
          const p = b.closest('.tree-item').dataset.part;
          b.textContent = (p === partKey) ? '👁' : '🚫';
          b.classList.toggle('visible', p === partKey);
        });
      });
    }
  });

  // Botón Restablecer Todas las Visibilidades
  const resetVisBtn = document.getElementById('btn-reset-vis');
  if (resetVisBtn) {
    resetVisBtn.addEventListener('click', () => {
      Object.values(meshes).forEach(m => { if (m) m.visible = true; });
      document.querySelectorAll('.vis-btn').forEach(b => {
        b.textContent = '👁';
        b.classList.add('visible');
      });
    });
  }

  // Captura de Pantalla HD
  const screenshotBtn = document.getElementById('btn-screenshot');
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', () => {
      renderer.render(scene, camera);
      const dataURL = renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'COWAI_CollarNet_CAD_Inspection.png';
      link.href = dataURL;
      link.click();
    });
  }

  // Modal de Ayuda / Presentación
  const helpBtn = document.getElementById('btn-help');
  const helpModal = document.getElementById('help-modal');
  const closeHelpBtn = document.getElementById('btn-close-help');

  if (helpBtn && helpModal) {
    helpBtn.addEventListener('click', () => { helpModal.style.display = 'flex'; });
  }
  if (closeHelpBtn && helpModal) {
    closeHelpBtn.addEventListener('click', () => { helpModal.style.display = 'none'; });
  }
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.style.display = 'none';
    });
  }
}

// -----------------------------------------------------------------------------
// Redimensión de Ventana
// -----------------------------------------------------------------------------
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// =============================================================================
// 12. LOOP DE ANIMACIÓN Y RENDERIZADO
// =============================================================================
let animDirection = 1;
function animate() {
  requestAnimationFrame(animate);

  // Animación continua de despiece si está activa
  if (STATE.isExploding) {
    let newExplode = STATE.explodeFactor + 0.006 * animDirection;
    if (newExplode >= 1.0) {
      newExplode = 1.0;
      animDirection = -1;
    } else if (newExplode <= 0.0) {
      newExplode = 0.0;
      animDirection = 1;
    }
    const slider = document.getElementById('explode-slider');
    if (slider) slider.value = newExplode;
    updateExplosion(newExplode);
  }

  controls.update();
  renderer.render(scene, camera);
}

// Iniciar aplicación al cargar el DOM
window.addEventListener('DOMContentLoaded', init);
