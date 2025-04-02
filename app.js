document.addEventListener("DOMContentLoaded", () => {
  // Add debug container
  const debugContainer = document.createElement("div");
  debugContainer.style.position = "fixed";
  debugContainer.style.top = "0";
  debugContainer.style.left = "0";
  debugContainer.style.color = "white";
  debugContainer.style.zIndex = "1000";
  document.body.appendChild(debugContainer);

  function debugLog(message) {
    console.log(message);
    debugContainer.innerHTML += `${message}<br>`;
  }

  // DOM elements
  const permissionPopup = document.getElementById("permission-popup");
  const useCameraBtn = document.getElementById("use-camera");
  const viewOnlyBtn = document.getElementById("view-only");
  const container = document.getElementById("container");
  const arView = document.getElementById("ar-view");
  const modelContainer = document.getElementById("model-container");
  const fallbackContainer = document.getElementById("fallback-container");
  const loading = document.getElementById("loading");

  debugLog("DOM elements loaded");

  // Three.js variables
  let scene, camera, renderer, model;
  let fallbackScene,
    fallbackCamera,
    fallbackRenderer,
    fallbackModel,
    fallbackControls;

  // Event listeners for buttons
  useCameraBtn.addEventListener("click", async () => {
    try {
      debugLog("AR button clicked");
      permissionPopup.classList.add("hidden");
      container.classList.remove("hidden");
      modelContainer.classList.remove("hidden");
      loading.classList.remove("hidden");

      debugLog("Requesting AR session...");
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor"],
      });
      debugLog(`AR session granted: ${session ? "yes" : "no"}`);

      await initARScene(session);
    } catch (err) {
      debugLog(`AR Initialization Error: ${err.message}`);
      alert("AR Initialization Error: " + err.message);
    }
  });

  viewOnlyBtn.addEventListener("click", () => {
    debugLog("View only button clicked");
    initFallbackView();
  });

  async function initARScene(session) {
    try {
      debugLog("Initializing AR Scene...");

      // Set up Three.js scene
      scene = new THREE.Scene();
      debugLog("Scene created");

      // Set up WebGL Renderer
      debugLog("Creating WebGL renderer...");
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true, // Helps with debugging
      });

      if (!renderer) {
        throw new Error("Failed to create WebGL renderer");
      }

      renderer.xr.enabled = true;
      renderer.setSize(window.innerWidth, window.innerHeight);
      debugLog(`Appending renderer to: ${modelContainer.id}`);
      modelContainer.appendChild(renderer.domElement);
      debugLog("Renderer initialized");

      // Verify WebGL context
      const gl = renderer.getContext();
      debugLog(`WebGL context: ${gl ? "created" : "failed"}`);
      debugLog(
        `WebGL attributes: ${JSON.stringify(gl.getContextAttributes())}`
      );

      // Set XR session
      debugLog("Setting XR session...");
      await renderer.xr.setSession(session);
      debugLog("XR session set");

      // Set up AR Camera
      debugLog("Creating AR camera");
      camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      scene.add(camera);
      debugLog(`Camera position: ${camera.position.toArray()}`);

      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);
      debugLog("Lights added");

      // Create test cube
      const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const material = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        wireframe: true, // Wireframe for debugging
      });
      model = new THREE.Mesh(geometry, material);
      model.position.set(0, 0, -1);
      scene.add(model);
      debugLog("Cube added");

      // Animation loop with debug info
      let frameCount = 0;
      function animate() {
        renderer.setAnimationLoop(() => {
          frameCount++;
          if (frameCount % 60 === 0) {
            debugLog(`Rendering frame ${frameCount}`);
            debugLog(`Camera position: ${camera.position.toArray()}`);
            debugLog(`Cube position: ${model.position.toArray()}`);
          }
          renderer.render(scene, camera);
        });
      }

      animate();
      debugLog("Animation started");
    } catch (err) {
      debugLog(`AR Scene Error: ${err.message}`);
      alert(`AR Scene Error: ${err.message}`);
    }
  }

  function initFallbackView() {
    permissionPopup.classList.add("hidden");
    container.classList.remove("hidden");
    modelContainer.classList.add("hidden");
    fallbackContainer.classList.remove("hidden");
    loading.classList.remove("hidden");

    // Set up scene
    fallbackScene = new THREE.Scene();
    fallbackScene.background = new THREE.Color(0x222222);

    // Set up camera
    fallbackCamera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    fallbackCamera.position.z = 3;

    // Set up renderer
    fallbackRenderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    fallbackRenderer.setPixelRatio(window.devicePixelRatio);
    fallbackRenderer.setSize(window.innerWidth, window.innerHeight);
    fallbackContainer.appendChild(fallbackRenderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    fallbackScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    fallbackScene.add(directionalLight);

    // Load model
    const loader = new THREE.GLTFLoader();
    loader.load(
      "models/cube.glb",
      (gltf) => {
        fallbackModel = gltf.scene;
        const box = new THREE.Box3().setFromObject(fallbackModel);
        const center = box.getCenter(new THREE.Vector3());
        fallbackModel.position.sub(center);
        const size = box.getSize(new THREE.Vector3()).length();
        const scale = 2.0 / size;
        fallbackModel.scale.set(scale, scale, scale);
        fallbackScene.add(fallbackModel);
        loading.classList.add("hidden");
      },
      (xhr) => {
        const percentLoaded = (xhr.loaded / xhr.total) * 100;
        loading.textContent = `Loading model... ${Math.round(percentLoaded)}%`;
      },
      (error) => {
        console.error("Error loading model:", error);
        loading.textContent = "Failed to load model";
      }
    );

    // Set up controls
    fallbackControls = new THREE.OrbitControls(
      fallbackCamera,
      fallbackRenderer.domElement
    );
    fallbackControls.enableDamping = true;
    fallbackControls.dampingFactor = 0.05;
    fallbackControls.screenSpacePanning = false;
    fallbackControls.maxPolarAngle = Math.PI;
    fallbackControls.minDistance = 1;
    fallbackControls.maxDistance = 10;
    fallbackControls.enableTouch = true;

    // Handle window resize
    window.addEventListener("resize", () => {
      fallbackCamera.aspect = window.innerWidth / window.innerHeight;
      fallbackCamera.updateProjectionMatrix();
      fallbackRenderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      // Ensure model is always in front of the camera
      if (model) {
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        model.position
          .copy(camera.position)
          .add(cameraDirection.multiplyScalar(2));
      }

      if (videoTexture) videoTexture.needsUpdate = true;
      renderer.render(scene, camera);
    }

    animate();
  }
  debugLog(`XR support: ${navigator.xr ? "available" : "unavailable"}`);
  debugLog(
    `WebGL support: ${
      THREE.WEBGL.isWebGLAvailable() ? "available" : "unavailable"
    }`
  );
  debugLog(`Secure context: ${window.isSecureContext ? "yes" : "no"}`);
});
