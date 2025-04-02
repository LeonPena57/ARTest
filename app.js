document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements
  const modeSelection = document.getElementById("mode-selection");
  const arModeBtn = document.getElementById("ar-mode-btn");
  const viewerModeBtn = document.getElementById("viewer-mode-btn");
  const arContainer = document.getElementById("ar-container");
  const viewerContainer = document.getElementById("viewer-container");
  const exitArBtn = document.getElementById("exit-ar");
  const exitViewerBtn = document.getElementById("exit-viewer");
  const loading = document.getElementById("loading");
  const errorMessage = document.getElementById("error-message");
  const cameraFeed = document.getElementById("camera-feed");
  const arCanvas = document.getElementById("ar-canvas");
  const viewerCanvas = document.getElementById("viewer-canvas");

  // Scene variables
  let arScene, arCamera, arRenderer, arModel = null;
  let viewerScene, viewerCamera, viewerRenderer, controls = null;
  let gltfLoader = new THREE.GLTFLoader();
  let cameraStream = null;
  let animationId = null;

  // Initialize both modes
  initViewerMode();
  
  // Event listeners
  arModeBtn.addEventListener("click", startARExperience);
  viewerModeBtn.addEventListener("click", startViewerExperience);
  exitArBtn.addEventListener("click", exitAR);
  exitViewerBtn.addEventListener("click", exitViewer);

  function initViewerMode() {
    // Set up viewer scene
    viewerScene = new THREE.Scene();
    
    // Add simple environment
    const backgroundTexture = new THREE.TextureLoader().load('https://images.unsplash.com/photo-1607153333879-c174d265f1d6');
    const background = new THREE.Mesh(
      new THREE.SphereGeometry(100, 32, 32),
      new THREE.MeshBasicMaterial({
        map: backgroundTexture,
        side: THREE.BackSide
      })
    );
    viewerScene.add(background);
    
    viewerCamera = new THREE.PerspectiveCamera(
      60, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    viewerCamera.position.set(0, 1.5, 5);

    viewerRenderer = new THREE.WebGLRenderer({ 
      canvas: viewerCanvas,
      antialias: true, 
      alpha: true
    });
    viewerRenderer.setSize(window.innerWidth, window.innerHeight);
    viewerRenderer.setPixelRatio(window.devicePixelRatio);
    viewerRenderer.setClearColor(0x000000, 0);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    viewerScene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 7);
    directionalLight1.castShadow = true;
    viewerScene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(-5, 5, -5);
    viewerScene.add(directionalLight2);

    // Handle window resize
    window.addEventListener('resize', onViewerResize);
  }

  async function loadModel(scene, isAR = false) {
    return new Promise((resolve, reject) => {
      gltfLoader.load(
        'models/dababy.glb',
        (gltf) => {
          const model = gltf.scene;
          
          // Scale the model appropriately
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3()).length();
          const scale = 2.5 / size;
          model.scale.set(scale, scale, scale);
          
          if (isAR) {
            // Position for AR mode
            model.position.set(0, -1.5, -3);
            model.rotation.y = Math.PI / 4;
          } else {
            // Position for viewer mode
            model.position.set(0, -0.5, 0);
          }
          
          scene.add(model);
          resolve(model);
        },
        undefined,
        (error) => {
          console.error("Error loading DaBaby model:", error);
          reject(error);
        }
      );
    });
  }

  async function startARExperience() {
    try {
      loading.classList.remove("hidden");
      modeSelection.classList.add("hidden");

      // Check for camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your device doesn't support AR");
      }

      // Get camera stream
      cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      });
      
      cameraFeed.srcObject = cameraStream;
      
      // Initialize AR scene
      arScene = new THREE.Scene();
      arCamera = new THREE.PerspectiveCamera(
        60, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
      );
      
      arRenderer = new THREE.WebGLRenderer({ 
        canvas: arCanvas,
        antialias: true,
        alpha: true
      });
      arRenderer.setPixelRatio(window.devicePixelRatio);
      arRenderer.setSize(window.innerWidth, window.innerHeight);
      arRenderer.setClearColor(0x000000, 0);

      // Add lighting for AR
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      arScene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 1, 0.5);
      arScene.add(directionalLight);

      // Load DaBaby model
      arModel = await loadModel(arScene, true);
      
      // Handle window resize
      window.addEventListener('resize', onARResize);
      onARResize();
      
      // Show AR container
      arContainer.classList.remove("hidden");
      
      // Start animation loop
      animateAR();
      
      loading.classList.add("hidden");
    } catch (err) {
      console.error("AR setup failed:", err);
      showError(`Error: ${err.message}`);
      loading.classList.add("hidden");
      modeSelection.classList.remove("hidden");
    }
  }

  function onARResize() {
    if (!arCamera || !arRenderer) return;
    
    arCamera.aspect = window.innerWidth / window.innerHeight;
    arCamera.updateProjectionMatrix();
    arRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animateAR() {
    animationId = requestAnimationFrame(animateAR);
    
    if (arModel) {
      // Subtle animation
      arModel.rotation.y += 0.002;
      arModel.position.y = -1.5 + Math.sin(Date.now() * 0.001) * 0.05;
    }
    
    arRenderer.render(arScene, arCamera);
  }

  async function startViewerExperience() {
    try {
      modeSelection.classList.add("hidden");
      loading.classList.remove("hidden");
      viewerContainer.classList.remove("hidden");
      
      // Load model if not already loaded
      if (!viewerScene.children.some(child => child.isGroup && child !== viewerScene.children[0])) {
        await loadModel(viewerScene);
      }
      
      // Set up camera
      viewerCamera.position.set(0, 2, 5);
      viewerCamera.lookAt(0, 0.5, 0);
      
      // Initialize orbit controls
      controls = new THREE.OrbitControls(viewerCamera, viewerCanvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 3;
      controls.maxDistance = 10;
      controls.target.set(0, 0.5, 0);
      controls.enablePan = false;
      
      // Start animation loop
      animateViewer();
      
      loading.classList.add("hidden");
    } catch (err) {
      console.error("Viewer setup failed:", err);
      showError("Error loading viewer");
      exitViewer();
    }
  }

  function animateViewer() {
    animationId = requestAnimationFrame(animateViewer);
    controls.update();
    viewerRenderer.render(viewerScene, viewerCamera);
  }

  function onViewerResize() {
    if (!viewerCamera || !viewerRenderer) return;
    
    viewerCamera.aspect = window.innerWidth / window.innerHeight;
    viewerCamera.updateProjectionMatrix();
    viewerRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  function exitAR() {
    if (animationId) cancelAnimationFrame(animationId);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraFeed.srcObject = null;
    }
    if (arRenderer) arRenderer.dispose();
    window.removeEventListener('resize', onARResize);
    arContainer.classList.add("hidden");
    modeSelection.classList.remove("hidden");
  }

  function exitViewer() {
    if (animationId) cancelAnimationFrame(animationId);
    if (controls) controls.dispose();
    viewerContainer.classList.add("hidden");
    modeSelection.classList.remove("hidden");
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
    setTimeout(() => errorMessage.classList.add("hidden"), 5000);
  }
});