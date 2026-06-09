import * as THREE from 'three';

// Configura renderer, cena e câmera; trata redimensionamento (tela cheia no mobile).
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: window.devicePixelRatio < 2, // desliga AA em telas hi-dpi p/ performance
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 200);
    this.scene.add(this.camera);

    this._resize();
    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._resize(), 200));
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  // Remove tudo da cena (para reiniciar o jogo)
  clearScene() {
    const cam = this.camera;
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const obj = this.scene.children[i];
      if (obj === cam) continue;
      this.scene.remove(obj);
    }
    // limpa filhos da câmera (lanterna etc.)
    for (let i = cam.children.length - 1; i >= 0; i--) cam.remove(cam.children[i]);
  }
}
