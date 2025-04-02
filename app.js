document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const permissionPopup = document.getElementById("permission-popup");
  const useCameraBtn = document.getElementById("use-camera");
  const viewOnlyBtn = document.getElementById("view-only");
  const container = document.getElementById("container");
  const arView = document.getElementById("ar-view");
  const modelContainer = document.getElementById("model-container");
  const fallbackContainer = document.getElementById("fallback-container");
  const loading = document.getElementById("loading");

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
      permissionPopup.classList.add("hidden");
      container.classList.remove("hidden");
      modelContainer.classList.remove("hidden");
      loading.classList.remove("hidden");

      // Request AR session **inside the click event**
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor"],
      });

      await initARScene(session);
    } catch (err) {
      alert("AR Initialization Error: " + err.message);
    }
  });
  viewOnlyBtn.addEventListener("click", initFallbackView);

  function showCameraError(message) {
    alert(message);
    initFallbackView();
  }

  function getFriendlyError(err) {
    if (err.name === "NotAllowedError") {
      return "Camera access was denied. Please allow camera permissions in your browser settings.";
    } else if (err.name === "NotFoundError") {
      return "No camera found on this device.";
    } else if (
      location.protocol !== "https:" &&
      location.hostname !== "localhost"
    ) {
      return (
        "Camera requires HTTPS or localhost. Current protocol: " +
        location.protocol
      );
    }
    return "Camera error: " + err.message;
  }

  function initARView() {
    permissionPopup.classList.add("hidden");
    container.classList.remove("hidden");
    loading.classList.remove("hidden");

    // Check for camera support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showCameraError("Camera API not supported in this browser");
      return;
    }

    const constraints = {
      video: {
        facingMode: "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        arView.srcObject = stream;
        arView.onloadedmetadata = () => {
          arView.play();
          initARScene();
        };
      })
      .catch((err) => {
        console.error("Camera error:", err);
        showCameraError(getFriendlyError(err));
      });
  }

  async function initARScene(session) {
    alert("Initializing AR Scene...");

    // Set up Three.js scene
    scene = new THREE.Scene();

    // Set up WebGL Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.xr.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    modelContainer.appendChild(renderer.domElement);

    alert("Renderer initialized!");

    // Set session inside the function
    renderer.xr.setSession(session);
    alert("AR session started!");

    // Set up AR Camera
    camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    scene.add(camera);

    alert("Camera added!");

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    alert("Lights added!");

    // Create a simple cube
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    model = new THREE.Mesh(geometry, material);
    model.position.set(0, 0, -1);
    scene.add(model);

    alert("Cube added!");

    // Start AR animation loop
    function animate() {
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });
    }

    animate();
    alert("Animation started!");
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
});
