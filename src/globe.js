import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { places } from './data.js';
import { $, escapeHtml, flagIcon, markInteracted, prefetchImages } from './utils.js';

const R = 1;
const AXIS_X = new THREE.Vector3(1,0,0);
const AXIS_Y = new THREE.Vector3(0,1,0);
const MAX_PITCH = THREE.MathUtils.degToRad(65);
const YAW_SENS = 0.0038, PITCH_SENS = 0.0038, AUTO_YAW_SPEED = 0.045;
const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH = window.matchMedia('(pointer:coarse)').matches;

function latLon(lat, lon, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}
function lonLatToXY(lon, lat) { return [ ((lon+180)/360)*2048, ((90-lat)/180)*1024 ]; }

const GeoCache = (() => {
  const DB_NAME = 'be_geo_v1';
  const STORE = 'geojson';
  const TTL_MS = 7 * 24 * 60 * 60 * 1000;
  let dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('IDB unavailable'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error || new Error('IDB open failed'));
      req.onblocked = () => rej(new Error('IDB blocked'));
    }).catch(err => { dbPromise = null; throw err; });
    return dbPromise;
  }
  async function get(key) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  }
  async function set(key, value) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  }
  async function del(key) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }
  async function clearOld(maxAgeMs) {
    try {
      const db = await openDB();
      const now = Date.now();
      return new Promise((res) => {
        const tx = db.transaction(STORE, 'readwrite');
        const cursor = tx.objectStore(STORE).openCursor();
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (!c) return;
          if (!c.value || !c.value.ts || (now - c.value.ts) > maxAgeMs) c.delete();
          c.continue();
        };
        tx.oncomplete = () => res();
        tx.onerror = () => res();
      });
    } catch(_) {}
  }
  if ('indexedDB' in window) setTimeout(() => { openDB().catch(() => {}); }, 0);
  return { get, set, del, clearOld, TTL_MS };
})();

export async function initGlobe({ onMarkerClick }) {
  const canvas = $('scene');
  let hasWebGL = false;
  try {
    const c = document.createElement('canvas');
    hasWebGL = !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch(_) { hasWebGL = false; }

  if (!hasWebGL) {
    canvas.classList.add('hidden');
    document.body.classList.add('no-webgl');
    $('loading').classList.add('hide');
    $('onboarding')?.classList.add('hide');
    return {
      hasWebGL: false,
      moveCameraTo: () => {},
      highlightCountry: () => {}
    };
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth/window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 3.4);

  const globe = new THREE.Group();
  scene.add(globe);

  (function stars() {
    const count = 1100, pos = new Float32Array(count*3);
    for (let i=0;i<count;i++){
      const r = 14 + Math.random()*26;
      const th = Math.random()*Math.PI*2;
      const ph = Math.acos(2*Math.random()-1);
      pos[i*3] = r*Math.sin(ph)*Math.cos(th);
      pos[i*3+1] = r*Math.cos(ph);
      pos[i*3+2] = r*Math.sin(ph)*Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos,3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({
      color:0xc9a870, size:0.065, transparent:true, opacity:0.55, depthWrite:false
    })));
  })();

  const MAP_W = 2048, MAP_H = 1024;
  const mapCanvas = document.createElement('canvas'); mapCanvas.width = MAP_W; mapCanvas.height = MAP_H;
  const mctx = mapCanvas.getContext('2d');
  const hlCanvas = document.createElement('canvas'); hlCanvas.width = MAP_W; hlCanvas.height = MAP_H;
  const hctx = hlCanvas.getContext('2d');
  let hlTexture = null;

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 64),
    new THREE.MeshPhongMaterial({ color:0x1a1510, emissive:0x0e0b08, shininess:16, specular:0x4a3a24 })
  );
  globe.add(earth);

  const hlSphere = new THREE.Mesh(
    new THREE.SphereGeometry(R*1.002, 96, 64),
    new THREE.MeshBasicMaterial({ transparent:true, opacity:0.55, depthWrite:false, blending:THREE.AdditiveBlending })
  );
  hlSphere.visible = false;
  globe.add(hlSphere);

  (function grid() {
    const mat = new THREE.LineBasicMaterial({ color:0x8c7a5a, transparent:true, opacity:0.08 });
    for (let lat=-75; lat<=75; lat+=15) {
      const pts=[]; for (let lon=-180; lon<=180; lon+=3) pts.push(latLon(lat,lon,R*1.003));
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    for (let lon=-180; lon<180; lon+=15) {
      const pts=[]; for (let lat=-90; lat<=90; lat+=3) pts.push(latLon(lat,lon,R*1.003));
      globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  })();

  (function atmosphere() {
    const mat = new THREE.ShaderMaterial({
      uniforms:{ uColor:{ value: new THREE.Color(0xf5a623) } },
      vertexShader:`varying vec3 vN; varying vec3 vP;
        void main(){ vN=normalize(normalMatrix*normal);
          vec4 mv=modelViewMatrix*vec4(position,1.0); vP=mv.xyz;
          gl_Position=projectionMatrix*mv; }`,
      fragmentShader:`uniform vec3 uColor; varying vec3 vN; varying vec3 vP;
        void main(){ vec3 v=normalize(-vP);
          float f=pow(1.0-abs(dot(v,normalize(vN))),2.6);
          gl_FragColor=vec4(uColor,f*0.42); }`,
      transparent:true, blending:THREE.AdditiveBlending, side:THREE.BackSide, depthWrite:false
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R*1.2,48,32), mat));
  })();

  scene.add(new THREE.AmbientLight(0xa89880, 1.0));
  const key = new THREE.DirectionalLight(0xffe0b0, 1.3); key.position.set(3,2.5,4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xf5a623, 0.8); rim.position.set(-4,-2,-3); scene.add(rim);

  const hitMeshes = [];
  const markers = [];
  const activeRipples = [];
  const HIT_MAT = new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false });
  const DOT_GEO = new THREE.SphereGeometry(0.013, 14, 14);
  const HIT_GEO = new THREE.SphereGeometry(IS_TOUCH ? 0.11 : 0.075, 12, 12);
  const ACCENT = new THREE.Color(0xf5c76a);

  places.forEach((place) => {
    const pos = latLon(place.lat, place.lon, R*1.008);
    const outward = pos.clone().normalize();
    const group = new THREE.Group();
    group.position.copy(pos);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), outward);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.026, 0.034, 28),
      new THREE.MeshBasicMaterial({ color:ACCENT, transparent:true, opacity:0.85, side:THREE.DoubleSide, depthWrite:false })
    );
    ring.position.z = 0.001;
    group.add(ring);

    const dot = new THREE.Mesh(DOT_GEO, new THREE.MeshBasicMaterial({ color:0xfff3d6 }));
    dot.position.z = 0.002;
    group.add(dot);

    const hit = new THREE.Mesh(HIT_GEO, HIT_MAT);
    hit.userData.place = place;
    hit.userData.index = markers.length;
    group.add(hit);
    hitMeshes.push(hit);

    globe.add(group);
    markers.push({ group, ring, dot, place, pop: 1 });
  });

  let yaw = -(69.24 + 90) * Math.PI/180;
  let pitch = THREE.MathUtils.degToRad(8);
  let targetYaw = null, targetPitch = null, idleTime = 0;
  let hoveredMarker = null;
  let dragging = false, moved = 0, lastX = 0, lastY = 0;
  let pinchStartDist = 0, pinchStartZ = camera.position.z;
  const pointers = new Map();
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  function toNDC(x, y) {
    const r = canvas.getBoundingClientRect();
    pointerNDC.x = ((x-r.left)/r.width)*2-1;
    pointerNDC.y = -((y-r.top)/r.height)*2+1;
  }
  function pick(x, y) {
    toNDC(x, y); globe.updateMatrixWorld();
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    return hits.length ? markers[hits[0].object.userData.index] : null;
  }

  const tip = $('tip');

  canvas.addEventListener('pointerdown', (e) => {
    markInteracted();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      dragging = true; moved = 0;
      lastX = e.clientX; lastY = e.clientY;
      idleTime = 0; targetYaw = null; targetPitch = null;
      canvas.classList.add('dragging');
    } else if (pointers.size === 2) {
      dragging = false;
      const [a, b] = [...pointers.values()];
      pinchStartDist = Math.hypot(a.x-b.x, a.y-b.y);
      pinchStartZ = camera.position.z;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch(_) {}
  });

  canvas.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x-b.x, a.y-b.y);
        camera.position.z = THREE.MathUtils.clamp(pinchStartZ * (pinchStartDist / d), 2.2, 5.5);
        return;
      }
      if (dragging) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 3) {
          yaw += dx * YAW_SENS;
          pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch + dy * PITCH_SENS));
          tip.classList.remove('on');
          hoveredMarker = null;
        }
      }
      return;
    }
    if (IS_TOUCH) return;
    const m = pick(e.clientX, e.clientY);
    if (m !== hoveredMarker) {
      hoveredMarker = m;
      if (m) {
        tip.innerHTML = `${flagIcon(m.place.iso)}<div class="tip-text">${escapeHtml(m.place.name)}<small>${escapeHtml(m.place.country)} · ${m.place.items.length} поз.</small></div>`;
        tip.classList.add('on');
        idleTime = 0;
        prefetchImages(m.place);
      } else {
        tip.classList.remove('on');
      }
    }
    if (m) {
      const margin = 90;
      tip.style.left = Math.min(Math.max(e.clientX, margin), window.innerWidth - margin) + 'px';
      tip.style.top = Math.min(Math.max(e.clientY, margin), window.innerHeight - margin) + 'px';
    }
  });

  function spawnRipple(place) {
    const pos = latLon(place.lat, place.lon, R * 1.015);
    const outward = pos.clone().normalize();
    
    const group = new THREE.Group();
    group.position.copy(pos);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), outward);

    const geo = new THREE.RingGeometry(0.01, 0.03, 32);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0xf5a623, 
      transparent: true, 
      opacity: 1, 
      side: THREE.DoubleSide, 
      depthWrite: false 
    });
    
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    globe.add(group);

    activeRipples.push({ group, mesh, scale: 1, opacity: 1 });
  }

  function endPointer(e) {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      canvas.classList.remove('dragging');
      if (dragging && moved < 8) {
        const m = pick(e.clientX, e.clientY);
        if (m && typeof onMarkerClick === 'function') {
          spawnRipple(m.place);
          onMarkerClick(m.place);
        }
      }
      dragging = false;
      idleTime = 0;
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    dragging = false;
    canvas.classList.remove('dragging');
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    markInteracted();
    camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY*0.0012, 2.2, 5.5);
  }, { passive: false });

  function highlightCountry(iso) {
    if (!iso || !window.__countries) {
      hlSphere.visible = false;
      hctx.clearRect(0, 0, MAP_W, MAP_H);
      return;
    }
    const feature = window.__countries.find(f => {
      const p = f.properties || {};
      return p.ADM0_A3 === iso || p.ISO_A3 === iso || p.SOV_A3 === iso;
    });
    if (!feature) { hlSphere.visible = false; return; }
    hctx.clearRect(0, 0, MAP_W, MAP_H);
    const geom = feature.geometry;
    const polys = geom.type === 'Polygon' ? [geom.coordinates]
                : geom.type === 'MultiPolygon' ? geom.coordinates : null;
    if (!polys) { hlSphere.visible = false; return; }
    polys.forEach(rings => {
      if (!rings.length) return;
      hctx.beginPath();
      rings[0].forEach((c, i) => {
        const [x, y] = lonLatToXY(c[0], c[1]);
        i ? hctx.lineTo(x, y) : hctx.moveTo(x, y);
      });
      hctx.closePath();
      hctx.fillStyle = 'rgba(245,166,35,0.48)'; hctx.fill();
      hctx.strokeStyle = 'rgba(255,210,100,0.92)'; hctx.lineWidth = 2.5; hctx.stroke();
    });
    if (hlTexture) hlTexture.dispose();
    hlTexture = new THREE.CanvasTexture(hlCanvas);
    hlTexture.colorSpace = THREE.SRGBColorSpace;
    hlSphere.material.map = hlTexture;
    hlSphere.material.needsUpdate = true;
    hlSphere.visible = true;
  }

  function moveCameraTo(lat, lon) {
    const isMobile = window.innerWidth <= 900;
    const yawOffset = isMobile ? 0 : -0.22;
    const pitchOffset = isMobile ? -0.55 : 0;
    targetYaw = -(lon + 90) * Math.PI/180 + yawOffset;
    targetPitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, lat * Math.PI/180 + pitchOffset));
    idleTime = 0;
  }

  function updateRotation(dt) {
    if (targetYaw !== null && targetPitch !== null) {
      let dyaw = targetYaw - yaw;
      while (dyaw > Math.PI) dyaw -= Math.PI*2;
      while (dyaw < -Math.PI) dyaw += Math.PI*2;
      const dpitch = targetPitch - pitch;
      const ease = 1 - Math.pow(0.0025, dt);
      yaw += dyaw * ease;
      pitch += dpitch * ease;
      if (Math.abs(dyaw) < 0.003 && Math.abs(dpitch) < 0.003) {
        yaw = targetYaw; pitch = targetPitch;
        targetYaw = null; targetPitch = null;
      }
    } else if (!dragging && !PREFERS_REDUCED_MOTION) {
      idleTime += dt;
      if (idleTime > 1.4 && !hoveredMarker &&
          !$('panel').classList.contains('open') &&
          !$('modal').classList.contains('open') &&
          !$('sheet').classList.contains('open')) {
        yaw += AUTO_YAW_SPEED * dt;
      }
    }
    pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch));
    const qY = new THREE.Quaternion().setFromAxisAngle(AXIS_Y, yaw);
    const qX = new THREE.Quaternion().setFromAxisAngle(AXIS_X, pitch);
    globe.quaternion.copy(qX).multiply(qY);
  }

  const GEOJSON_URL = 'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector/geojson/ne_110m_admin_0_countries.geojson';
  const DEBUG = location.search.includes('debug');

  function renderGeoOnCanvas(features) {
    mctx.fillStyle = '#14100b'; mctx.fillRect(0, 0, MAP_W, MAP_H);
    features.forEach(f => {
      const geom = f.geometry; if (!geom) return;
      const polys = geom.type === 'Polygon' ? [geom.coordinates]
                  : geom.type === 'MultiPolygon' ? geom.coordinates : null;
      if (!polys) return;
      polys.forEach(rings => {
        if (!rings.length) return;
        mctx.beginPath();
        rings[0].forEach((coord, i) => {
          const [x, y] = lonLatToXY(coord[0], coord[1]);
          i ? mctx.lineTo(x, y) : mctx.moveTo(x, y);
        });
        mctx.closePath();
        mctx.fillStyle = 'rgba(62,53,42,0.72)'; mctx.fill();
        mctx.strokeStyle = 'rgba(180,148,90,0.32)'; mctx.lineWidth = 1.2; mctx.stroke();
      });
    });
    const mapTexture = new THREE.CanvasTexture(mapCanvas);
    mapTexture.colorSpace = THREE.SRGBColorSpace;
    earth.material.map = mapTexture;
    earth.material.color.setHex(0xffffff);
    earth.material.needsUpdate = true;
    window.__countries = features;
    $('loading').classList.add('hide');
  }

  function showMapError() {
    $('loading').innerHTML = '<div style="font-size:11px;max-width:200px;text-align:center;line-height:1.5;color:#908880">Карта недоступна.<br>Точки работают.</div>';
    setTimeout(() => $('loading').classList.add('hide'), 2600);
  }

  async function loadCountries() {
    const t0 = performance.now();
    let geojson = null, staleCache = null, source = 'network';

    try {
      const cached = await GeoCache.get(GEOJSON_URL);
      if (cached && cached.json) {
        const age = Date.now() - (cached.ts || 0);
        if (age < GeoCache.TTL_MS) {
          try { geojson = JSON.parse(cached.json); source = 'cache-fresh'; }
          catch(_) { GeoCache.del(GEOJSON_URL).catch(() => {}); }
        } else {
          staleCache = cached;
        }
      }
    } catch(e) { if (DEBUG) console.warn('[geo] cache read failed:', e); }

    if (!geojson) {
      try {
        const res = await fetch(GEOJSON_URL, { cache: 'default' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        geojson = await res.json();
        source = 'network';
        GeoCache.set(GEOJSON_URL, { ts: Date.now(), json: JSON.stringify(geojson) }).catch(e => {
          if (DEBUG) console.warn('[geo] cache write failed:', e);
        });
      } catch (e) {
        if (DEBUG) console.warn('[geo] fetch failed:', e);
        if (staleCache && staleCache.json) {
          try { geojson = JSON.parse(staleCache.json); source = 'cache-stale'; }
          catch(_) { geojson = null; }
        }
      }
    }

    if (!geojson) { showMapError(); return; }
    try {
      const features = geojson.features || [];
      renderGeoOnCanvas(features);
      if (DEBUG) {
        const ms = (performance.now() - t0).toFixed(1);
        console.log(`[geo] source=${source} time=${ms}ms features=${features.length}`);
      }
    } catch (e) { console.warn('GeoJSON render failed:', e); showMapError(); }

    GeoCache.clearOld(GeoCache.TTL_MS);
  }
  loadCountries();
  setTimeout(() => { const l = $('loading'); if (l && !l.classList.contains('hide')) l.classList.add('hide'); }, 8000);

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    updateRotation(dt);

    markers.forEach((m, i) => {
      if (PREFERS_REDUCED_MOTION) {
        m.ring.scale.setScalar(1);
        m.ring.material.opacity = 0.4;
      } else {
        const phase = (t*0.55 + i*0.17) % 1;
        m.ring.scale.setScalar(0.7 + phase*1.7);
        m.ring.material.opacity = (1-phase) * 0.8;
      }
      const target = (m === hoveredMarker) ? 1.9 : 1;
      m.pop += (target - m.pop) * Math.min(1, dt*12);
      m.dot.scale.setScalar(m.pop);
      m.dot.material.color.set(m === hoveredMarker ? 0xffffff : 0xfff3d6);
    });

    for (let i = activeRipples.length - 1; i >= 0; i--) {
      const r = activeRipples[i];
      r.mesh.scale.setScalar(r.scale);
      r.mesh.material.opacity = r.opacity;
      
      r.scale += dt * 4;
      r.opacity -= dt * 2.5;

      if (r.opacity <= 0) {
        globe.remove(r.group);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        activeRipples.splice(i, 1);
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { hasWebGL: true, moveCameraTo, highlightCountry };
}