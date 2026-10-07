import * as THREE from 'three';
import { FIELD_GEOMETRY_THREE } from './FieldGeometryThree.js';
import { createFieldEnvironmentGeometry, disposeFieldEnvironmentGeometry } from './FieldEnvironmentGeometry.js';

// One on-demand renderer per open atlas. Changing the card disposes every
// shared geometry/material and closing releases the WebGL context entirely.
export class FieldSpellAtlasPreview {
  constructor(container, environment) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-label', 'Aperçu tridimensionnel du Terrain');
    this.renderer.domElement.setAttribute('role', 'img');
    container.append(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(environment.environmentTint || '#263443').multiplyScalar(0.22);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.scene.add(new THREE.HemisphereLight('#f4f7ff', '#333028', 2.1));
    const sun = new THREE.DirectionalLight('#ffffff', 2.4);
    sun.position.set(-20, 40, 25);
    this.scene.add(sun);
    this.geometry = createFieldEnvironmentGeometry(FIELD_GEOMETRY_THREE, environment);
    this.scene.add(this.geometry);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(105, 95), new THREE.MeshStandardMaterial({ color: environment.surfacePalette?.ground || environment.environmentTint || '#34425f', roughness: 1 }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(0, -0.7, -13);
    this.scene.add(this.floor);
    this.angle = 0;
    this.target = new THREE.Vector3(0, 5, -12);
    this.resize = new ResizeObserver(() => this.render());
    this.resize.observe(container);
    this.onDown = event => { this.dragX = event.clientX; container.setPointerCapture(event.pointerId); };
    this.onMove = event => {
      if (this.dragX == null) return;
      this.angle += (event.clientX - this.dragX) * 0.008;
      this.dragX = event.clientX;
      this.render();
    };
    this.onUp = () => { this.dragX = null; };
    container.addEventListener('pointerdown', this.onDown);
    container.addEventListener('pointermove', this.onMove);
    container.addEventListener('pointerup', this.onUp);
    container.addEventListener('pointercancel', this.onUp);
    this.render();
  }

  setAngle(angle) { this.angle = angle; this.render(); }

  render() {
    if (!this.renderer) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.position.set(Math.sin(this.angle) * 61, 29, -12 + Math.cos(this.angle) * 61);
    this.camera.lookAt(this.target);
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (!this.renderer) return;
    this.resize.disconnect();
    for (const [event, handler] of [['pointerdown', this.onDown], ['pointermove', this.onMove], ['pointerup', this.onUp], ['pointercancel', this.onUp]]) this.container.removeEventListener(event, handler);
    disposeFieldEnvironmentGeometry(this.geometry);
    this.floor.geometry.dispose();
    this.floor.material.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.renderer = null;
  }
}
