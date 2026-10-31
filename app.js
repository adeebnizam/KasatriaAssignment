// ==========================================
// 1. CONFIGURATION
// ==========================================
const GOOGLE_CLIENT_ID = "285457271466-16p1mhfimanl8jcmeebenlkd0llah0kb.apps.googleusercontent.com"; 
const SPREADSHEET_ID = "1c455xhbJeci3T3Ny-ykKkKdNmsyi-Vd81_NsJPHEUgs";    

// URL untuk tarik data Google Sheet dalam format CSV/JSON
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`;

// ==========================================
// 2. GOOGLE SIGN-IN INTEGRATION (IMAGE A)
// ==========================================
window.onload = function () {
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse
        });
        
        google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            { theme: "filled_blue", size: "large", width: "180" }
        );
    }
};

function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    
    // Sembunyikan skrin login lepas berjaya log masuk
    document.getElementById("login-overlay").style.display = "none";
    
    // Mula download data Google Sheet dan bina 3D Periodic Table
    initApp();
}

// ==========================================
// 3. PARSING DATA GOOGLE SHEET (CSV)
// ==========================================
let tableData = [];

async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        const dataText = await response.text();
        
        // Split ikut baris
        const rows = dataText.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        
        // Abaikan header (baris 0) jika ada, ambil baris data sahaja
        const parsed = [];
        for (let i = 1; i < rows.length; i++) {
            // RegEx untuk parse CSV berasaskan comma & quotes
            const cols = rows[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const cleanCols = cols.map(c => c.replace(/^"|"$/g, '').trim());
            
            if (cleanCols.length >= 6) {
                // Parse nilai Networth daripada teks ($251,260.80 -> 251260.80)
                const rawNetworth = cleanCols[5].replace(/[\$,]/g, '');
                const networthVal = parseFloat(rawNetworth) || 0;
                
                parsed.push({
                    name: cleanCols[0],
                    photo: cleanCols[1],
                    age: cleanCols[2],
                    country: cleanCols[3],
                    interest: cleanCols[4],
                    networthStr: cleanCols[5],
                    networthVal: networthVal
                });
            }
        }
        return parsed;
    } catch (err) {
        console.error("Gagal membaca Google Sheet:", err);
        return [];
    }
}

// ==========================================
// 4. THREE.JS 3D ENGINE & SCENE SETUP
// ==========================================
let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

async function initApp() {
    tableData = await fetchSheetData();
    if (tableData.length === 0) {
        alert("Data Google Sheet tidak dapat dibaca. Pastikan tetapan Share = Anyone with the link (Viewer)!");
        return;
    }

    initThreeJS();
    animate();
}

function initThreeJS() {
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3000;

    scene = new THREE.Scene();

    // ------------------------------------------
    // A. BINA OBJECTS (IMAGE B DATA STRUCTURE)
    // ------------------------------------------
    for (let i = 0; i < tableData.length; i++) {
        const item = tableData[i];

        const element = document.createElement('div');
        element.className = 'element';
        
        // Styling Asas Kad 3D
        element.style.width = '140px';
        element.style.height = '180px';
        element.style.boxShadow = '0px 0px 12px rgba(0,255,255,0.5)';
        element.style.border = '1px solid rgba(127,255,255,0.25)';
        element.style.borderRadius = '8px';
        element.style.padding = '8px';
        element.style.boxSizing = 'border-box';
        element.style.display = 'flex';
        element.style.flexDirection = 'column';
        element.style.alignItems = 'center';
        element.style.justifyContent = 'space-between';
        element.style.fontFamily = 'sans-serif';
        element.style.cursor = 'default';

        // WARNA BACKGROUND BERDASARKAN NETWORTH (Syarat 5)
        // Red(#EF3022) < $100K, Orange(#FDCA35) <= $200K & Green(#3A9F48) > $200K
        let borderColor = '#EF3022';
        let bgColor = 'rgba(239, 48, 34, 0.15)'; // Kesan glow malap di dalam kad

        if (item.networthVal < 100000) {
            borderColor = '#EF3022'; // Merah
            bgColor = 'rgba(239, 48, 34, 0.18)';
        } else if (item.networthVal <= 200000) {
            borderColor = '#FDCA35'; // Kuning/Oren
            bgColor = 'rgba(253, 202, 53, 0.18)';
        } else {
            borderColor = '#3A9F48'; // Hijau
            bgColor = 'rgba(58, 159, 72, 0.18)';
        }

        // Set border luar tajam dan background glowing
        element.style.border = `1.5px solid ${borderColor}`;
        element.style.background = `linear-gradient(135deg, ${bgColor} 0%, #111111 70%)`;
        element.style.boxShadow = `0 0 8px ${borderColor}44`; // Kesan cahaya neon halus di luar kotak

        // Susunan kandungan dalam kad mengikut rujukan rubrik
        element.innerHTML = `
            <div style="display: flex; justify-content: space-between; width: 100%; font-size: 10px; color: #ddd; font-weight: bold; padding: 0 4px;">
                <span>${item.country}</span>
                <span>${item.age}</span>
            </div>
            <img src="${item.photo}" style="width:115px; height:115px; object-fit:cover; border-radius:2px; border:1px solid ${borderColor};">
            <div style="font-weight:bold; font-size:11px; color:#fff; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">
                ${item.name}
            </div>
            <div style="font-size:9px; color:#aaa; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">
                ${item.interest}
            </div>
        `;

        const objectCSS = new THREE.CSS3DObject(element);
        objectCSS.position.x = Math.random() * 4000 - 2000;
        objectCSS.position.y = Math.random() * 4000 - 2000;
        objectCSS.position.z = Math.random() * 4000 - 2000;
        scene.add(objectCSS);

        objects.push(objectCSS);
    }

    // ------------------------------------------
    // B. SUSUNAN 1: TABLE (20 x 10) (Syarat 7)
    // ------------------------------------------
    const cols = 20;
    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();
        const col = i % cols;
        const row = Math.floor(i / cols);

        object.position.x = (col * 160) - (cols * 160 / 2) + 80;
        object.position.y = -(row * 200) + (10 * 200 / 2) - 100;
        object.position.z = 0;

        targets.table.push(object);
    }

    // ------------------------------------------
    // C. SUSUNAN 2: SPHERE
    // ------------------------------------------
    const vector = new THREE.Vector3();
    for (let i = 0, l = objects.length; i < l; i++) {
        const phi = Math.acos(-1 + (2 * i) / l);
        const theta = Math.sqrt(l * Math.PI) * phi;

        const object = new THREE.Object3D();
        object.position.setFromSphericalCoords(800, phi, theta);
        vector.copy(object.position).multiplyScalar(2);
        object.lookAt(vector);

        targets.sphere.push(object);
    }

    // ------------------------------------------
    // D. SUSUNAN 3: DOUBLE HELIX (Syarat 8)
    // ------------------------------------------
    for (let i = 0, l = objects.length; i < l; i++) {
        // Asingkan kepada 2 rantai (Strand 0 & Strand 1) untuk hasilkan Double Helix
        const strand = i % 2; 
        const indexInStrand = Math.floor(i / 2);
        
        const phi = indexInStrand * 0.25 + (strand * Math.PI); // Fasa 180 darjah pemisah
        const y = -(indexInStrand * 16) + 1200;

        const object = new THREE.Object3D();
        object.position.setFromCylindricalCoords(900, phi, y);

        vector.x = object.position.x * 2;
        vector.y = object.position.y;
        vector.z = object.position.z * 2;
        object.lookAt(vector);

        targets.helix.push(object);
    }

    // ------------------------------------------
    // E. SUSUNAN 4: GRID (5 x 4 x 10) (Syarat 9 & Image C)
    // ------------------------------------------
    // 5 kedalaman (Z), 4 baris tinggi (Y), 10 lebar (X) -> Total 200 tiles
    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();

        const x = (i % 10);
        const y = Math.floor((i / 10) % 4);
        const z = Math.floor(i / 40);

        object.position.x = (x * 220) - (10 * 220 / 2) + 110;
        object.position.y = -(y * 240) + (4 * 240 / 2) - 120;
        object.position.z = (z * 400) - (5 * 400 / 2);

        targets.grid.push(object);
    }

    // RENDERER & CONTROLS
    renderer = new THREE.CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener('change', render);

    // EVEN HANDLERS BUTANG MENU
    document.getElementById('table').addEventListener('click', () => transform(targets.table, 2000));
    document.getElementById('sphere').addEventListener('click', () => transform(targets.sphere, 2000));
    document.getElementById('helix').addEventListener('click', () => transform(targets.helix, 2000));
    document.getElementById('grid').addEventListener('click', () => transform(targets.grid, 2000));

    // Mula dengan bentuk Table
    transform(targets.table, 2000);

    window.addEventListener('resize', onWindowResize);
}

// ------------------------------------------
// ANIMASI TRANSISI (TRANSFORM)
// ------------------------------------------
function transform(targetArray, duration) {
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const target = targetArray[i];

        if (!target) continue;

        // Simple interpolation animation (LERP)
        new SimpleTween(object.position, target.position, duration);
        new SimpleTween(object.rotation, target.rotation, duration);
    }
}

// Helper Ringkas Animation Tween
class SimpleTween {
    constructor(source, target, duration) {
        const startX = source.x, startY = source.y, startZ = source.z;
        const targetX = target.x, targetY = target.y, targetZ = target.z;
        const startTime = performance.now();

        function update() {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function (easeOutCubic)
            const ease = 1 - Math.pow(1 - progress, 3);

            source.x = startX + (targetX - startX) * ease;
            source.y = startY + (targetY - startY) * ease;
            source.z = startZ + (targetZ - startZ) * ease;

            render();

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}