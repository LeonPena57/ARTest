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
    viewerCamera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    viewerCamera.position.z = 2;

    viewerRenderer = new THREE.WebGLRenderer({ 
      canvas: viewerCanvas,
      antialias: true, 
      alpha: true 
    });
    viewerRenderer.setSize(window.innerWidth, window.innerHeight);
    viewerRenderer.setPixelRatio(window.devicePixelRatio);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    viewerScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    viewerScene.add(directionalLight);

    // Add pedestal
    const pedestalGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
    const pedestalMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x6E3B23,
      specular: 0x111111,
      shininess: 10
    });
    const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
    pedestal.position.y = -0.8;
    viewerScene.add(pedestal);

    // Handle window resize
    window.addEventListener('resize', onViewerResize);
  }

  async function loadModel(scene, isAR = false) {
    return new Promise((resolve, reject) => {
      gltfLoader.load(
        'models/dababy.glb',
        (gltf) => {
          const model = gltf.scene;
          
          // Scale and position the model
          model.scale.set(0.5, 0.5, 0.5);
          
          if (isAR) {
            // Position for AR mode (on ground)
            model.position.set(0, -0.8, -2);
            model.rotation.y = Math.PI;
          } else {
            // Position for viewer mode (on pedestal)
            model.position.set(0, -0.5, 0);
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
        throw new Error("Camera access not supported in this browser");
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
      arCamera.position.set(0, 0, 0);
      
      arRenderer = new THREE.WebGLRenderer({ 
        canvas: arCanvas,
        antialias: true,
        alpha: true
      });
      arRenderer.setPixelRatio(window.devicePixelRatio);
      arRenderer.setSize(window.innerWidth, window.innerHeight);

      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      arScene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 1, 0);
      arScene.add(directionalLight);

      // Load model
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
      showError(`Failed to start AR: ${err.message}`);
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
    
    // Rotate model slightly
    if (arModel) {
      arModel.rotation.y += 0.005;
    }
    
    arRenderer.render(arScene, arCamera);
  }

  async function startViewerExperience() {
    try {
      modeSelection.classList.add("hidden");
      loading.classList.remove("hidden");
      viewerContainer.classList.remove("hidden");
      
      // Load Dababy model for viewer if not already loaded
      if (!viewerScene.children.some(child => child.type === 'Group')) {
        await loadModel(viewerScene);
      }
      
      // Initialize orbit controls for viewer mode
      controls = new THREE.OrbitControls(viewerCamera, viewerCanvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 0.5;
      controls.maxDistance = 5;
      
      // Start animation loop for viewer
      animateViewer();
      
      loading.classList.add("hidden");
    } catch (err) {
      console.error("Viewer setup failed:", err);
      showError("Failed to load 3D model");
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
    // Stop animation
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    // Stop camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraFeed.srcObject = null;
      cameraStream = null;
    }
    
    // Clean up Three.js
    if (arRenderer) {
      arRenderer.dispose();
    }
    
    // Remove event listeners
    window.removeEventListener('resize', onARResize);
    
    arContainer.classList.add("hidden");
    modeSelection.classList.remove("hidden");
  }

  function exitViewer() {
    // Stop animation
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    if (controls) {
      controls.dispose();
      controls = null;
    }
    
    viewerContainer.classList.add("hidden");
    modeSelection.classList.remove("hidden");
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
    
    setTimeout(() => {
      errorMessage.classList.add("hidden");
    }, 5000);
  }
});