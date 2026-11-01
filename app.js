// ==========================================
// Configuration
// ==========================================
const GOOGLE_CLIENT_ID = "285457271466-16p1mhfimanl8jcmeebenlkd0llah0kb.apps.googleusercontent.com";
const SPREADSHEET_ID = "1c455xhbJeci3T3Ny-ykKkKdNmsyi-Vd81_NsJPHEUgs";

// The sheet is read as CSV through the Google Sheets "gviz" endpoint
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`;

// Net worth tiers: red < $100K, orange $100K-$200K, green > $200K
const TIERS = {
    low:  { color: '#EF3022', tint: 'rgba(239, 48, 34, 0.4)',  label: '< $100K' },
    mid:  { color: '#FDCA35', tint: 'rgba(253, 202, 53, 0.4)', label: '$100K – $200K' },
    high: { color: '#3A9F48', tint: 'rgba(58, 159, 72, 0.4)',  label: '> $200K' }
};

function getTier(networth) {
    if (networth < 100000) return TIERS.low;
    if (networth <= 200000) return TIERS.mid;
    return TIERS.high;
}

// Plain grey square shown when a photo fails to load
const FALLBACK_PHOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="115" height="115"><rect width="115" height="115" fill="#222"/></svg>'
);

// ==========================================
// Google Sign-In (Image A)
// ==========================================
window.onload = function () {
    if (typeof google === 'undefined') {
        console.error('Google Identity Services failed to load.');
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
    });

    google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "filled_blue", size: "large", width: "180" }
    );
};

let appStarted = false;

function handleCredentialResponse() {
    if (appStarted) return;
    initApp();
}

// ==========================================
// Sheet data
// ==========================================
let tableData = [];

// Minimal CSV parser: handles quoted fields, escaped quotes and commas inside quotes
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                field += ch;
            }
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field);
            field = '';
            rows.push(row);
            row = [];
        } else {
            field += ch;
        }
    }
    if (field !== '' || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

async function fetchSheetData() {
    try {
        const response = await fetch(SHEET_CSV_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const rows = parseCSV(await response.text());

        // Skip the header row. Column order: Name, Photo, Age, Country, Interest, Net Worth
        return rows
            .slice(1)
            .filter(cols => cols.length >= 6)
            .map(cols => {
                const c = cols.map(value => value.trim());
                // "$251,260.80" -> 251260.80
                const networthVal = parseFloat(c[5].replace(/[$,]/g, '')) || 0;
                return {
                    name: c[0],
                    photo: c[1],
                    age: c[2],
                    country: c[3],
                    interest: c[4],
                    networthStr: c[5],
                    networthVal: networthVal
                };
            });
    } catch (err) {
        console.error("Failed to read Google Sheet:", err);
        return [];
    }
}

// ==========================================
// Three.js scene
// ==========================================
let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

async function initApp() {
    appStarted = true;
    tableData = await fetchSheetData();

    if (tableData.length === 0) {
        appStarted = false;
        alert("Unable to load data from the Google Sheet. Please check that the sheet is accessible and try again.");
        return;
    }

    // Data loaded: hide login, show controls
    document.getElementById("login-overlay").style.display = "none";
    document.getElementById("menu").style.display = "block";
    buildLegend();

    initThreeJS();
    animate();
}

function buildLegend() {
    const legend = document.getElementById('legend');
    Object.values(TIERS).forEach(tier => {
        const item = document.createElement('div');
        item.className = 'legend-item';

        const swatch = document.createElement('span');
        swatch.className = 'legend-swatch';
        swatch.style.borderColor = tier.color;
        swatch.style.background = tier.tint;

        const label = document.createElement('span');
        label.textContent = tier.label;

        item.append(swatch, label);
        legend.appendChild(item);
    });
    legend.style.display = 'flex';
}

// Builds one tile (Image B): country, age, photo, name, interest
function createCard(item) {
    const tier = getTier(item.networthVal);

    const element = document.createElement('div');
    element.className = 'element';
    element.style.border = `1.5px solid ${tier.color}`;
    element.style.background = `linear-gradient(135deg, ${tier.tint} 0%, #111111 70%)`;
    element.style.boxShadow = `0 0 8px ${tier.color}44`;

    const header = document.createElement('div');
    header.className = 'card-header';
    const country = document.createElement('span');
    country.textContent = item.country;
    const age = document.createElement('span');
    age.textContent = item.age;
    header.append(country, age);

    const photo = document.createElement('img');
    photo.className = 'card-photo';
    photo.style.borderColor = tier.color;
    photo.alt = item.name;
    photo.onerror = () => {
        photo.onerror = null;
        photo.src = FALLBACK_PHOTO;
    };
    photo.src = item.photo;

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = item.name;

    const interest = document.createElement('div');
    interest.className = 'card-interest';
    interest.textContent = item.interest;

    element.append(header, photo, name, interest);
    return element;
}

function initThreeJS() {
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3500;

    scene = new THREE.Scene();

    // Tiles start at random positions and animate into the first layout
    for (let i = 0; i < tableData.length; i++) {
        const objectCSS = new THREE.CSS3DObject(createCard(tableData[i]));
        objectCSS.position.x = Math.random() * 4000 - 2000;
        objectCSS.position.y = Math.random() * 4000 - 2000;
        objectCSS.position.z = Math.random() * 4000 - 2000;
        scene.add(objectCSS);

        objects.push(objectCSS);
    }

    // ------------------------------------------
    // Layout 1: Table (20 x 10)
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
    // Layout 2: Sphere
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
    // Layout 3: Double helix
    // Even tiles go on strand 0, odd tiles on strand 1 (180 degrees apart).
    // phiStep sets how tightly each strand winds; yStep sets the height per tile.
    // With 100 tiles per strand this gives about 3 turns, and the two strands
    // stay clearly separated vertically.
    // ------------------------------------------
    const phiStep = 0.19;
    const yStep = 20;
    for (let i = 0, l = objects.length; i < l; i++) {
        const strand = i % 2;
        const indexInStrand = Math.floor(i / 2);

        const phi = indexInStrand * phiStep + (strand * Math.PI);
        const y = -(indexInStrand * yStep) + 1000;

        const object = new THREE.Object3D();
        object.position.setFromCylindricalCoords(900, phi, y);

        vector.x = object.position.x * 2;
        vector.y = object.position.y;
        vector.z = object.position.z * 2;
        object.lookAt(vector);

        targets.helix.push(object);
    }

    // ------------------------------------------
    // Layout 4: Grid (5 x 4 x 10 = 200 tiles)
    // 10 across (X), 4 down (Y), 5 deep (Z)
    // ------------------------------------------
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

    // Renderer and controls
    renderer = new THREE.CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener('change', render);

    // Layout buttons
    document.getElementById('table').addEventListener('click', () => transform(targets.table, 2000));
    document.getElementById('sphere').addEventListener('click', () => transform(targets.sphere, 2000));
    document.getElementById('helix').addEventListener('click', () => transform(targets.helix, 2000));
    document.getElementById('grid').addEventListener('click', () => transform(targets.grid, 2000));

    // Start with the table layout
    transform(targets.table, 2000);

    window.addEventListener('resize', onWindowResize);
}

// ------------------------------------------
// Layout transitions
// ------------------------------------------
// Starts a transition for every tile. A new transition replaces any running one
// on the same tile, so clicking buttons quickly does not make tiles jitter.
function transform(targetArray, duration) {
    const now = performance.now();

    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const target = targetArray[i];
        if (!target) continue;

        object.userData.tween = {
            startTime: now,
            duration: duration,
            fromPos: object.position.clone(),
            toPos: target.position,
            fromRot: object.rotation.clone(),
            toRot: target.rotation
        };
    }
}

// Advances all running transitions. Returns true if anything moved this frame.
function updateTweens() {
    const now = performance.now();
    let moved = false;

    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const tween = object.userData.tween;
        if (!tween) continue;

        const progress = Math.min((now - tween.startTime) / tween.duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

        object.position.lerpVectors(tween.fromPos, tween.toPos, ease);
        object.rotation.set(
            tween.fromRot.x + (tween.toRot.x - tween.fromRot.x) * ease,
            tween.fromRot.y + (tween.toRot.y - tween.fromRot.y) * ease,
            tween.fromRot.z + (tween.toRot.z - tween.fromRot.z) * ease
        );

        moved = true;
        if (progress >= 1) object.userData.tween = null;
    }
    return moved;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    if (updateTweens()) render();
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}