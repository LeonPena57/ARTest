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
  const placementInstructions = document.getElementById("placement-instructions");
  const placeModelBtn = document.getElementById("place-model");

  // Scene variables
  let arScene, arCamera, arRenderer, arModel = null;
  let viewerScene, viewerCamera, viewerRenderer, controls = null;
  let gltfLoader = new THREE.GLTFLoader();
  let cameraStream = null;
  let animationId = null;
  let planeMesh = null;
  let placed = false;
  let surfaceDetected = false;

  // Initialize both modes
  initViewerMode();
  
  // Event listeners
  arModeBtn.addEventListener("click", startARExperience);
  viewerModeBtn.addEventListener("click", startViewerExperience);
  exitArBtn.addEventListener("click", exitAR);
  exitViewerBtn.addEventListener("click", exitViewer);
  placeModelBtn.addEventListener("click", placeModel);
  arCanvas.addEventListener("click", handleTap);

  function initViewerMode() {
    // Set up viewer scene
    viewerScene = new THREE.Scene();
    
    // Add environment
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
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    viewerScene.add(directionalLight);

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
          const scale = 3.0 / size; // Further increased scale to make the model larger
          model.scale.set(scale, scale, scale);
          
          // Centered position for both AR and viewer modes
          model.position.set(0, 1.0, 0); // Adjusted position to move it higher
          
          if (isAR) {
            // Position for AR mode (initially hidden)
            model.rotation.y = Math.PI / 4;
            model.visible = false;
          }
          
          scene.add(model);
          resolve(model);
        },
        undefined,
        (error) => {
          console.error("Error loading model:", error);
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

      // Add environment (same as viewer mode)
      const backgroundTexture = new THREE.TextureLoader().load('https://images.unsplash.com/photo-1607153333879-c174d265f1d6');
      const background = new THREE.Mesh(
        new THREE.SphereGeometry(100, 32, 32),
        new THREE.MeshBasicMaterial({
          map: backgroundTexture,
          side: THREE.BackSide
        })
      );
      arScene.add(background);

      arCamera = new THREE.PerspectiveCamera(
        60, 
        window.innerWidth / window.innerHeight, 
        0.1, 
        1000
      );
      arCamera.position.set(0, 1.5, 5);

      arRenderer = new THREE.WebGLRenderer({ 
        canvas: arCanvas,
        antialias: true,
        alpha: true
      });
      arRenderer.setPixelRatio(window.devicePixelRatio);
      arRenderer.setSize(window.innerWidth, window.innerHeight);
      arRenderer.setClearColor(0x000000, 0);

      // Add lighting (same as viewer mode)
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      arScene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7);
      directionalLight.castShadow = true;
      arScene.add(directionalLight);

      // Load model
      arModel = await loadModel(arScene, true);
      arModel.visible = true; // Automatically make the model visible
      placed = true; // Mark as placed

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

  function updatePlaneDetection() {
    // Remove plane detection logic as the model is automatically placed
  }

  function handleTap(event) {
    // Remove tap handling logic as the model is automatically placed
  }

  function placeModel() {
    // Remove place model button functionality
  }

  function onARResize() {
    if (!arCamera || !arRenderer) return;
    
    arCamera.aspect = window.innerWidth / window.innerHeight;
    arCamera.updateProjectionMatrix();
    arRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animateAR() {
    animationId = requestAnimationFrame(animateAR);
    
    // Animate model if placed
    if (placed && arModel) {
      arModel.rotation.y += 0.005;
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
      controls.maxDistance = 20; // Increased maximum zoom level
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
    placed = false;
    surfaceDetected = false;
    placementInstructions.textContent = "Move your device to detect surfaces";
    placeModelBtn.classList.add("hidden");
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