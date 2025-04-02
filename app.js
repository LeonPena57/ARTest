document.addEventListener("DOMContentLoaded", () => {
  const permissionPopup = document.getElementById("permission-popup");
  const startButton = document.getElementById("start-ar");
  const loading = document.getElementById("loading");
  const errorMessage = document.getElementById("error-message");
  const arContainer = document.getElementById("ar-container");

  // Check for WebXR support
  if (!navigator.xr) {
    showError("WebXR not supported in this browser");
    return;
  }

  startButton.addEventListener("click", async () => {
    try {
      permissionPopup.classList.add("hidden");
      loading.classList.remove("hidden");

      // Request AR session
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local", "hit-test"],
      });

      initXRScene(session);
    } catch (err) {
      showError(`AR failed to start: ${err.message}`);
    }
  });

  async function initXRScene(session) {
    try {
      // Three.js setup
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        1000
      );
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      renderer.xr.setSession(session);
      arContainer.appendChild(renderer.domElement);
      arContainer.classList.remove("hidden");

      // Add camera background (real world view)
      scene.background = new THREE.WebGLRenderTarget().texture;

      // Add simple cube
      const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(0, 0, -0.5);
      scene.add(cube);

      // Handle XR session events
      session.addEventListener("end", () => {
        location.reload();
      });

      // Animation loop
      renderer.setAnimationLoop(() => {
        // Update camera position from XR frame
        const frame = session.requestAnimationFrame();
        const pose = frame.getViewerPose(session.renderState.referenceSpace);

        if (pose) {
          const view = pose.views[0];
          camera.projectionMatrix.fromArray(view.projectionMatrix);
          const viewMatrix = new THREE.Matrix4().fromArray(
            view.transform.inverse.matrix
          );
          camera.matrixWorldInverse.copy(viewMatrix);
          camera.updateMatrixWorld(true);
        }

        renderer.render(scene, camera);
      });

      loading.classList.add("hidden");
    } catch (err) {
      showError(`Scene initialization failed: ${err.message}`);
    }
  }

  function showError(message) {
    console.error(message);
    errorMessage.textContent = message;
    permissionPopup.classList.remove("hidden");
    loading.classList.add("hidden");
  }

  // Initial checks
  if (!window.isSecureContext) {
    showError("Secure context required (HTTPS or localhost)");
  }
});
