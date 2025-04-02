document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const permissionPopup = document.getElementById('permission-popup');
    const useCameraBtn = document.getElementById('use-camera');
    const viewOnlyBtn = document.getElementById('view-only');
    const container = document.getElementById('container');
    const arView = document.getElementById('ar-view');
    const modelContainer = document.getElementById('model-container');
    const fallbackContainer = document.getElementById('fallback-container');
    const loading = document.getElementById('loading');

    // Three.js variables
    let scene, camera, renderer, model;
    let fallbackScene, fallbackCamera, fallbackRenderer, fallbackModel, fallbackControls;

    // Event listeners for buttons
    useCameraBtn.addEventListener('click', initARView);
    viewOnlyBtn.addEventListener('click', initFallbackView);

    function showCameraError(message) {
        alert(message);
        initFallbackView();
    }

    function getFriendlyError(err) {
        if (err.name === 'NotAllowedError') {
            return "Camera access was denied. Please allow camera permissions in your browser settings.";
        } else if (err.name === 'NotFoundError') {
            return "No camera found on this device.";
        } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            return "Camera requires HTTPS or localhost. Current protocol: " + location.protocol;
        }
        return "Camera error: " + err.message;
    }

    function initARView() {
        permissionPopup.classList.add('hidden');
        container.classList.remove('hidden');
        loading.classList.remove('hidden');

        // Check for camera support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showCameraError("Camera API not supported in this browser");
            return;
        }

        const constraints = { 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        };

        navigator.mediaDevices.getUserMedia(constraints)
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

    function initARScene() {
        arView.classList.remove('hidden');
        modelContainer.classList.remove('hidden');

        // Set up scene
        scene = new THREE.Scene();
        
        // Create video texture background
        const videoTexture = new THREE.VideoTexture(arView);
        scene.background = videoTexture;

        // Set up camera to match video aspect ratio
        const videoAspect = arView.videoWidth / arView.videoHeight;
        camera = new THREE.PerspectiveCamera(60, videoAspect, 0.1, 1000);
        camera.position.set(0, 0, 0);

        // Set up renderer
        renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        modelContainer.appendChild(renderer.domElement);

        // Add lights - crucial for model visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(1, 1, 1);
        scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight2.position.set(-1, -1, -1);
        scene.add(directionalLight2);

        // Load model
        const loader = new THREE.GLTFLoader();
        loader.load(
            'models/dababy.glb',
            (gltf) => {
                model = gltf.scene;
                
                // Center and scale model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center);
                
                // Auto-scale to reasonable size
                const size = box.getSize(new THREE.Vector3()).length();
                const scale = 1.5 / size;
                model.scale.set(scale, scale, scale);
                
                // Position in front of camera
                model.position.z = -2;
                model.position.y = -0.5; // Adjust vertical position
                
                scene.add(model);
                loading.classList.add('hidden');
                
                // Start animation
                animate();
            },
            (xhr) => {
                // Progress callback
                const percentLoaded = (xhr.loaded / xhr.total) * 100;
                loading.textContent = `Loading model... ${Math.round(percentLoaded)}%`;
            },
            (error) => {
                console.error('Error loading model:', error);
                loading.textContent = 'Failed to load model. Using test cube.';
                addTestCube();
            }
        );

        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        function addTestCube() {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                metalness: 0.5,
                roughness: 0.5
            });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.z = -2;
            scene.add(cube);
            loading.classList.add('hidden');
            animate();
        }

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            
            // Critical for video texture updates
            if (videoTexture) videoTexture.needsUpdate = true;
            
            renderer.render(scene, camera);
        }
    }

    function initFallbackView() {
        permissionPopup.classList.add('hidden');
        container.classList.remove('hidden');
        fallbackContainer.classList.remove('hidden');
        loading.classList.remove('hidden');

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
            powerPreference: "high-performance"
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
            'models/dababy.glb',
            (gltf) => {
                fallbackModel = gltf.scene;
                const box = new THREE.Box3().setFromObject(fallbackModel);
                const center = box.getCenter(new THREE.Vector3());
                fallbackModel.position.sub(center);
                const size = box.getSize(new THREE.Vector3()).length();
                const scale = 2.0 / size;
                fallbackModel.scale.set(scale, scale, scale);
                fallbackScene.add(fallbackModel);
                loading.classList.add('hidden');
            },
            (xhr) => {
                const percentLoaded = (xhr.loaded / xhr.total) * 100;
                loading.textContent = `Loading model... ${Math.round(percentLoaded)}%`;
            },
            (error) => {
                console.error('Error loading model:', error);
                loading.textContent = 'Failed to load model';
            }
        );

        // Set up controls
        fallbackControls = new THREE.OrbitControls(fallbackCamera, fallbackRenderer.domElement);
        fallbackControls.enableDamping = true;
        fallbackControls.dampingFactor = 0.05;
        fallbackControls.screenSpacePanning = false;
        fallbackControls.maxPolarAngle = Math.PI;
        fallbackControls.minDistance = 1;
        fallbackControls.maxDistance = 10;
        fallbackControls.enableTouch = true;

        // Handle window resize
        window.addEventListener('resize', () => {
            fallbackCamera.aspect = window.innerWidth / window.innerHeight;
            fallbackCamera.updateProjectionMatrix();
            fallbackRenderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            fallbackControls.update();
            fallbackRenderer.render(fallbackScene, fallbackCamera);
        }
        animate();
    }
});