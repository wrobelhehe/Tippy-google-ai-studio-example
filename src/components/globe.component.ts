
import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, effect, output, input, signal, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TripService, Trip } from '../services/trip.service';
import { latLngToVector3, vector3ToLatLng } from '../utils/geo.utils';

@Component({
  selector: 'app-globe',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full h-full overflow-hidden bg-transparent">
      
      <!-- 3D Canvas -->
      <div #rendererContainer class="w-full h-full relative cursor-move z-10"></div>
      
      <!-- HTML Overlay for Tooltips (Syncs with 3D position) -->
      @if (hoveredTrip(); as trip) {
         <div 
            class="absolute pointer-events-none z-30 transition-opacity duration-200"
            [style.transform]="tooltipTransform()"
            [style.opacity]="isRotating ? 0 : 1"
            style="top: 0; left: 0; will-change: transform;"
         >
            <!-- Trippy Style Tooltip -->
            <div class="relative -translate-x-1/2 -translate-y-[130%] flex flex-col items-center">
               <div class="bg-slate-900/80 backdrop-blur-xl border border-white/20 p-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] min-w-[200px]">
                  <h3 class="text-white font-bold text-lg leading-tight">{{ trip.title }}</h3>
                  <div class="flex items-center gap-2 mt-2">
                     <span class="text-blue-400 font-bold text-xs uppercase tracking-wider">{{ trip.city || 'Unknown City' }}</span>
                     <span class="text-slate-500 text-[10px]">•</span>
                     <span class="text-slate-400 text-[10px] font-mono uppercase tracking-widest">{{ trip.country }}</span>
                  </div>
                  <div class="mt-2 flex gap-2">
                     <span class="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300">{{ trip.startDate | date:'MMM y' }}</span>
                  </div>
               </div>
               <!-- Arrow -->
               <div class="w-px h-6 bg-gradient-to-b from-white/30 to-transparent"></div>
               <div class="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_15px_#3b82f6] border border-white/20"></div>
            </div>
         </div>
      }

      <!-- Picking Instruction -->
      @if (isPickingMode()) {
        <div class="absolute top-24 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur text-white px-6 py-3 rounded-full shadow-2xl z-40 pointer-events-none animate-bounce font-medium border border-blue-400/50 text-sm md:text-base whitespace-nowrap">
          📍 Click globe to set location
        </div>
      }
      
      <!-- Zoom Controls -->
      <div class="absolute bottom-48 md:bottom-12 right-4 md:right-6 z-20 flex flex-col bg-black/40 backdrop-blur-md border border-white/10 rounded-full overflow-hidden shadow-lg">
        <button (click)="zoomIn()" class="w-10 h-10 text-white text-xl font-bold hover:bg-white/20 transition flex items-center justify-center active:bg-white/30" aria-label="Zoom in">+</button>
        <div class="h-px w-full bg-white/10"></div>
        <button (click)="zoomOut()" class="w-10 h-10 text-white text-xl font-bold hover:bg-white/20 transition flex items-center justify-center active:bg-white/30" aria-label="Zoom out">-</button>
      </div>
    </div>
  `
})
export class GlobeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef;
  
  isPickingMode = input<boolean>(false);
  locationPicked = output<{lat: number, lng: number}>();
  
  private tripService = inject(TripService);
  private ngZone = inject(NgZone);
  
  // Tooltip State
  hoveredTrip = signal<Trip | null>(null);
  tooltipTransform = signal<string>('translate(-9999px, -9999px)');
  isRotating = false;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private earthGroup!: THREE.Group;
  private pinsGroup!: THREE.Group;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  
  private animationId: number | null = null;
  private earthRadius = 5;
  private targetCameraPos: THREE.Vector3 | null = null;

  constructor() {
    effect(() => {
      const trips = this.tripService.trips();
      // Ensure we have the scene before updating
      if (this.scene && this.pinsGroup) {
        this.updatePins(trips);
      }
    });

    effect(() => {
      const selectedId = this.tripService.selectedTripId();
      if (selectedId && this.scene) {
        const trip = this.tripService.getTripById(selectedId);
        if (trip) {
          this.flyTo(trip.coordinates.lat, trip.coordinates.lng);
        }
      }
    });
  }

  ngAfterViewInit() {
    // Run 3D initialization outside Angular zone to prevent excessive change detection during render loop
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
          this.initThree();
          this.createEarth();
          this.createAtmosphere();
          this.createStars();
          this.animate();
          
          // Sync back to Angular zone for initial data
          this.ngZone.run(() => {
             this.updatePins(this.tripService.trips());
          });

          window.addEventListener('resize', this.onWindowResize.bind(this));
          this.rendererContainer.nativeElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
          this.rendererContainer.nativeElement.addEventListener('pointermove', this.onPointerMove.bind(this));
      }, 50);
    });
  }

  ngOnDestroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    if (this.renderer) {
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
  }

  private initThree() {
    const container = this.rendererContainer.nativeElement;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020617, 0.02);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 22;
    this.camera.position.y = 10;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 6.5;
    this.controls.maxDistance = 50;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.8;
    this.controls.enableZoom = true; // Keep scroll wheel zoom
    
    this.controls.addEventListener('start', () => { 
        this.isRotating = true; 
        // Force check to hide tooltip immediately
        this.ngZone.run(() => {}); 
    });
    this.controls.addEventListener('end', () => { 
        this.isRotating = false; 
        this.ngZone.run(() => {});
    });

    const ambientLight = new THREE.AmbientLight(0x4040ff, 0.5); 
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
    sunLight.position.set(20, 10, 10);
    this.scene.add(sunLight);
    
    const rimLight = new THREE.SpotLight(0x00ffff, 3);
    rimLight.position.set(-10, 15, -5);
    rimLight.lookAt(0,0,0);
    this.scene.add(rimLight);

    this.earthGroup = new THREE.Group();
    this.scene.add(this.earthGroup);
    
    this.pinsGroup = new THREE.Group();
    this.earthGroup.add(this.pinsGroup);
  }

  private createEarth() {
    const geometry = new THREE.SphereGeometry(this.earthRadius, 64, 64);
    
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x111111,
      emissive: 0x000000,
      roughness: 0.6,
      metalness: 0.2,
      clearcoat: 0.1,
    });

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg', 
      (t) => { material.map = t; material.needsUpdate = true; }
    );
    textureLoader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
        (t) => { material.roughnessMap = t; material.needsUpdate = true; }
    );
    textureLoader.load(
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
        (t) => { material.normalMap = t; material.needsUpdate = true; }
    );

    const earth = new THREE.Mesh(geometry, material);
    this.earthGroup.add(earth);
  }

  private createAtmosphere() {
    const geometry = new THREE.SphereGeometry(this.earthRadius + 0.05, 64, 64);
    const vertexShader = `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const fragmentShader = `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.65 - dot(vNormal, vec3(0, 0, 1.0)), 4.0);
        gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity * 1.5;
      }
    `;
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });

    const atmosphere = new THREE.Mesh(geometry, material);
    this.earthGroup.add(atmosphere);
  }

  private createStars() {
    const starGeo = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for(let i=0; i<count * 3; i++) positions[i] = (Math.random() - 0.5) * 800;
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({color: 0x88ccff, size: 0.8, transparent: true, opacity: 0.6});
    const stars = new THREE.Points(starGeo, starMat);
    this.scene.add(stars);
  }

  private updatePins(trips: Trip[]) {
    while(this.pinsGroup.children.length > 0) this.pinsGroup.remove(this.pinsGroup.children[0]);

    const geometry = new THREE.SphereGeometry(0.12, 12, 12);
    const material = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    const ringGeo = new THREE.TorusGeometry(0.25, 0.02, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.7 });

    trips.forEach(trip => {
      const pos = latLngToVector3(trip.coordinates.lat, trip.coordinates.lng, this.earthRadius);
      
      const group = new THREE.Group();
      group.position.copy(pos);
      group.lookAt(new THREE.Vector3(0,0,0)); 
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());

      const dot = new THREE.Mesh(geometry, material);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      
      group.add(dot);
      group.add(ring);
      
      group.userData = { tripId: trip.id };
      
      const hitbox = new THREE.Mesh(
          new THREE.SphereGeometry(0.6, 8, 8),
          new THREE.MeshBasicMaterial({ visible: false })
      );
      group.add(hitbox);

      this.pinsGroup.add(group);
    });
  }

  private flyTo(lat: number, lng: number) {
    if (!this.controls) return;
    this.controls.autoRotate = false;
    const currentDist = this.controls.getDistance();
    const targetDist = Math.max(10, Math.min(currentDist, 20)); // Clamp zoom level
    const targetPos = latLngToVector3(lat, lng, targetDist);
    this.targetCameraPos = targetPos;
  }

  private animate() {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.controls.update();

    if (this.targetCameraPos && this.camera) {
        this.camera.position.lerp(this.targetCameraPos, 0.05);
        if (this.camera.position.distanceTo(this.targetCameraPos) < 0.1) this.targetCameraPos = null;
    }

    if (this.hoveredTrip()) {
         this.updateTooltipPosition();
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateTooltipPosition() {
    const trip = this.hoveredTrip();
    if (!trip || !this.camera) return;

    const pos = latLngToVector3(trip.coordinates.lat, trip.coordinates.lng, this.earthRadius);
    pos.project(this.camera);

    const x = (pos.x * 0.5 + 0.5) * this.rendererContainer.nativeElement.clientWidth;
    const y = (-(pos.y * 0.5) + 0.5) * this.rendererContainer.nativeElement.clientHeight;

    const distance = this.camera.position.distanceTo(new THREE.Vector3(0,0,0));
    const isBehind = this.camera.position.distanceTo(latLngToVector3(trip.coordinates.lat, trip.coordinates.lng, this.earthRadius)) > Math.sqrt(distance*distance - this.earthRadius*this.earthRadius);

    let transform = 'translate(-9999px, -9999px)';
    if (Math.abs(pos.z) <= 1 && !isBehind) {
        transform = `translate(${x}px, ${y}px)`;
    }

    this.ngZone.run(() => {
        this.tooltipTransform.set(transform);
    });
  }

  private onPointerMove(event: PointerEvent) {
    if (this.isPickingMode() || this.isRotating) return;
    if (Date.now() % 3 !== 0) return;

    const rect = this.rendererContainer.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.pinsGroup.children, true);

    let foundTripId: string | null = null;

    if (intersects.length > 0) {
      let obj = intersects[0].object;
      while (obj.parent && !obj.userData['tripId']) {
          obj = obj.parent;
      }
      if (obj.userData['tripId']) {
        foundTripId = obj.userData['tripId'];
      }
    }

    this.ngZone.run(() => {
       if (foundTripId) {
         const trip = this.tripService.getTripById(foundTripId);
         if (trip && this.hoveredTrip()?.id !== trip.id) {
            this.hoveredTrip.set(trip);
            document.body.style.cursor = 'pointer';
         }
       } else if (this.hoveredTrip()) {
         this.hoveredTrip.set(null);
         document.body.style.cursor = 'default';
       }
    });
  }

  private onPointerDown(event: PointerEvent) {
    if (this.hoveredTrip()) {
        this.ngZone.run(() => {
            this.tripService.selectTrip(this.hoveredTrip()!.id);
        });
        this.controls.autoRotate = false;
        return;
    }

    if (!this.isPickingMode()) return;

    const rect = this.rendererContainer.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.earthGroup.children);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const coords = vector3ToLatLng(point);
      this.ngZone.run(() => {
        this.locationPicked.emit(coords);
      });
    }
  }
  
  private onWindowResize() {
    if (!this.rendererContainer) return;
    const width = this.rendererContainer.nativeElement.clientWidth;
    const height = this.rendererContainer.nativeElement.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  zoomIn() {
    if (!this.camera || !this.controls) return;
    const distance = this.camera.position.length();
    this.camera.position.setLength(Math.max(this.controls.minDistance, distance * 0.85));
  }
  
  zoomOut() {
    if (!this.camera || !this.controls) return;
    const distance = this.camera.position.length();
    this.camera.position.setLength(Math.min(this.controls.maxDistance, distance * 1.15));
  }
}
