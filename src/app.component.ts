
import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe, CurrencyPipe } from '@angular/common';
import { TripService, Trip } from './services/trip.service';
import { GlobeComponent } from './components/globe.component';
import { TripFormComponent } from './components/trip-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, GlobeComponent, TripFormComponent, DecimalPipe, DatePipe, CurrencyPipe],
  template: `
    <!-- Main Container -->
    <div class="h-screen w-screen bg-slate-950 text-white overflow-hidden relative font-sans selection:bg-blue-500/30">
      
      <!-- ENHANCED BACKGROUND -->
      <div class="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_rgba(15,23,42,0.4)_0%,_rgba(2,6,23,0)_70%)]"></div>

      <!-- BACKGROUND GLOBE -->
      <div class="absolute inset-0 z-0">
         <app-globe 
            [isPickingMode]="isPickingMode()"
            (locationPicked)="onLocationPicked($event)"
          ></app-globe>
      </div>
      
      <!-- GRADIENT OVERLAYS -->
      <div class="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 opacity-70"></div>
      <div class="absolute inset-0 pointer-events-none bg-gradient-to-r from-slate-950/50 via-transparent to-transparent z-10 hidden md:block"></div>

      <!-- TOP BAR -->
      <header class="absolute top-0 left-0 right-0 z-40 p-4 md:p-6 flex justify-between items-center pointer-events-none">
        <div class="flex items-center gap-3 pointer-events-auto cursor-pointer" (click)="toggleSidebar()">
           <div class="p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/10 transition group shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white group-hover:scale-110 transition"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
           </div>
           <h1 class="text-2xl font-bold tracking-tight text-white drop-shadow-lg hidden md:block">TRIPPY<span class="text-blue-500">.IO</span></h1>
        </div>

        <button (click)="openAddModal()" class="pointer-events-auto bg-blue-600/90 backdrop-blur hover:bg-blue-500 text-white px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center gap-2 font-medium transition hover:scale-105 active:scale-95 border border-blue-400/30">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
           <span class="hidden md:inline">New Trip</span>
        </button>
      </header>

      <!-- SIDEBAR DRAWER with Search & Filter -->
      <aside 
        class="fixed top-0 left-0 bottom-0 w-80 bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-white/10 z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-2xl flex flex-col"
        [class.translate-x-0]="isSidebarOpen()"
        [class.-translate-x-full]="!isSidebarOpen()"
      >
         <div class="p-6 flex justify-between items-center border-b border-white/5">
             <h1 class="text-xl font-bold tracking-tight">EXPLORE</h1>
             <button (click)="toggleSidebar()" class="text-slate-400 hover:text-white transition p-2 rounded-full hover:bg-white/5">✕</button>
         </div>
         
         <div class="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-2">
             <button (click)="resetView()" class="w-full flex items-center gap-4 px-4 py-3 text-left rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition group mb-4">
                <span class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                </span>
                <span class="font-bold">Dashboard Overview</span>
             </button>

             <!-- Search & Filter Controls -->
             <div class="space-y-3 mb-6">
                <div class="relative">
                   <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   <input 
                      type="text" 
                      placeholder="Search trips..." 
                      [value]="searchQuery()"
                      (input)="updateSearch($event)"
                      class="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder-slate-500 transition"
                   >
                </div>
                
                <select 
                   (change)="updateFilter($event)" 
                   class="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-slate-300 focus:ring-2 focus:ring-blue-500/50 outline-none appearance-none cursor-pointer"
                >
                   <option value="" class="bg-slate-900">All Countries</option>
                   @for (country of allCountries(); track country) {
                      <option [value]="country" class="bg-slate-900">{{ country }}</option>
                   }
                </select>
             </div>

             <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                Results ({{ filteredTrips().length }})
             </p>
             
             @for (trip of filteredTrips(); track trip.id) {
               <div (click)="selectTripFromSidebar(trip.id)" class="flex items-center gap-3 py-3 px-2 rounded-lg cursor-pointer group hover:bg-white/5 transition">
                  <div class="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 shrink-0 border border-white/10 group-hover:border-blue-500/50 transition">
                     <img [src]="trip.coverPhoto" class="w-full h-full object-cover opacity-70 group-hover:opacity-100">
                  </div>
                  <div class="min-w-0">
                     <p class="font-medium text-sm truncate group-hover:text-blue-400 transition">{{ trip.title }}</p>
                     <p class="text-xs text-slate-500 truncate">{{ trip.city || trip.country }}</p>
                  </div>
               </div>
             }
         </div>

         <div class="p-6 border-t border-white/5 bg-black/20">
             <div class="flex items-center gap-3">
                 <img src="https://ui-avatars.com/api/?name=Guest+User&background=random" class="w-10 h-10 rounded-full border border-white/20">
                 <div>
                    <p class="font-bold text-sm">Guest Explorer</p>
                    <p class="text-xs text-slate-400">View Only Mode</p>
                 </div>
             </div>
         </div>
      </aside>

      <!-- OVERLAY: CLICK OUTSIDE SIDEBAR -->
      @if (isSidebarOpen()) {
        <div (click)="toggleSidebar()" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500"></div>
      }

      <!-- BOTTOM DASHBOARD STATS (Refined Glassmorphism) -->
      <div class="absolute bottom-0 left-0 right-0 z-20 p-4 md:p-10 pointer-events-none flex flex-col justify-end transition-transform duration-500" 
           [class.translate-y-[120%]]="!!tripService.selectedTripId()">
          <div class="container mx-auto max-w-7xl">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pointer-events-auto">
                 
                 <!-- Stat Card 1: Countries -->
                 <div class="bg-black/20 backdrop-blur-xl border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg hover:border-white/20 transition group">
                    <div class="flex justify-between items-start mb-2">
                       <span class="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Countries</span>
                       <div class="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2H10a2 2 0 012-2h1a2 2 0 012 2h1a2 2 0 012 2v-1a2 2 0 002-2h1.945M7.7 9.3l.16-.29M12 12l.01.01M16.3 9.3l-.16-.29M12 21a9 9 0 110-18 9 9 0 010 18z" /></svg>
                       </div>
                    </div>
                    <p class="text-2xl md:text-3xl font-bold text-white">{{ tripService.uniqueCountries() }}</p>
                 </div>

                 <!-- Stat Card 2: Flight Cost -->
                 <div class="bg-black/20 backdrop-blur-xl border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg hover:border-white/20 transition group">
                    <div class="flex justify-between items-start mb-2">
                       <span class="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Flight Cost</span>
                       <div class="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                       </div>
                    </div>
                    <p class="text-2xl md:text-3xl font-bold text-white">{{ tripService.totalFlightCost() | currency:'USD':'symbol':'1.0-0' }}</p>
                 </div>

                 <!-- Stat Card 3: Days -->
                 <div class="bg-black/20 backdrop-blur-xl border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg hover:border-white/20 transition group">
                    <div class="flex justify-between items-start mb-2">
                       <span class="text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Days</span>
                       <div class="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       </div>
                    </div>
                    <p class="text-2xl md:text-3xl font-bold text-white">{{ tripService.totalDays() }}</p>
                 </div>

                 <div (click)="toggleSidebar()" class="bg-blue-600/80 backdrop-blur-lg border border-blue-400/30 p-4 md:p-5 rounded-2xl shadow-lg hover:bg-blue-600 cursor-pointer transition group flex flex-col justify-center items-center text-center">
                    <p class="font-bold text-base md:text-lg">View List</p>
                    <p class="text-blue-200 text-xs">Search & Filter →</p>
                 </div>

              </div>
          </div>
      </div>


      <!-- FULL SCREEN TRIP DETAILS (Mobile Bottom Sheet / Desktop Sidebar) -->
      @if (tripService.selectedTripId(); as selectedId) {
         @let trip = tripService.getTripById(selectedId);
         @if (trip) {
            <!-- Increased z-index to z-50 to cover main header on mobile -->
            <div class="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end md:block">
               
               <!-- Backdrop Click to Close -->
               <div (click)="resetView()" class="pointer-events-auto absolute inset-0 bg-transparent" title="Close details"></div>

               <!-- The Content Panel -->
               <div class="pointer-events-auto relative w-full md:w-[600px] h-[85vh] md:h-full bg-[#0a0a0a]/95 backdrop-blur-2xl border-t md:border-t-0 md:border-l border-white/10 md:ml-auto flex flex-col shadow-2xl overflow-y-auto custom-scrollbar rounded-t-3xl md:rounded-none animate-slide-up">
                  
                  <!-- Mobile Drag Handle -->
                  <div class="md:hidden w-full flex justify-center pt-3 pb-1">
                     <div class="w-12 h-1.5 bg-white/20 rounded-full"></div>
                  </div>

                  <!-- Sticky Header -->
                  <div class="sticky top-0 z-10 p-4 flex justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
                      <button (click)="resetView()" class="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition">
                         <span class="text-xl">←</span> <span class="hidden md:inline">Back</span>
                      </button>
                      <div class="flex gap-2">
                         <button (click)="openEditModal(trip)" class="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-white transition">✎</button>
                         <button (click)="deleteTrip(trip.id)" class="p-2 bg-red-500/10 rounded-lg hover:bg-red-500/20 text-red-400 transition">🗑</button>
                      </div>
                  </div>

                  <!-- Hero Image -->
                  <div class="relative h-56 md:h-80 w-full shrink-0 group overflow-hidden">
                     <img [src]="trip.coverPhoto" class="w-full h-full object-cover transition duration-1000 group-hover:scale-105">
                     <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
                     <div class="absolute bottom-6 left-6 right-6">
                        <div class="flex items-center gap-2 mb-2">
                           <span class="px-2 py-1 bg-blue-600 rounded text-[10px] font-bold uppercase tracking-wider shadow-lg">Trip</span>
                           <span class="text-slate-300 text-sm flex items-center gap-1 drop-shadow-md">📍 {{ trip.city || trip.country }}</span>
                        </div>
                        <h1 class="text-3xl md:text-4xl font-bold leading-tight drop-shadow-xl">{{ trip.title }}</h1>
                     </div>
                  </div>

                  <!-- Content Body -->
                  <div class="p-6 md:p-8 space-y-8 pb-20">
                     
                     <p class="text-base md:text-lg text-slate-300 leading-relaxed font-light">
                        {{ trip.description }}
                     </p>

                     <!-- Flight Ticket Widget -->
                     <div class="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-5 relative overflow-hidden shadow-lg">
                        <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-white/10 pb-2 flex justify-between">
                           <span>Boarding Pass</span>
                           <span class="text-blue-400">{{ trip.startDate | date:'mediumDate' }}</span>
                        </h3>
                        <div class="flex justify-between items-center mb-6">
                           <div>
                              <p class="text-3xl font-mono font-bold">{{ trip.city?.substring(0,3)?.toUpperCase() || 'ORG' }}</p>
                              <p class="text-xs text-slate-400">Origin</p>
                           </div>
                           <div class="flex-1 px-4 flex flex-col items-center">
                              <div class="w-full h-px bg-white/20 relative flex justify-center">
                                 <svg class="w-5 h-5 text-blue-500 absolute -top-2.5 bg-[#0a0a0a] px-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                              </div>
                              <p class="text-[10px] text-blue-400 mt-2 tracking-wider">{{ trip.airline }}</p>
                           </div>
                           <div class="text-right">
                              <p class="text-3xl font-mono font-bold">{{ trip.country.substring(0,3).toUpperCase() }}</p>
                              <p class="text-xs text-slate-400">Dest</p>
                           </div>
                        </div>
                        <div class="grid grid-cols-3 gap-4 text-sm bg-black/20 p-3 rounded-xl border border-white/5">
                           <div class="text-center">
                              <p class="text-slate-500 text-[10px] uppercase">Flight</p>
                              <p class="font-bold font-mono">{{ trip.flightNumber }}</p>
                           </div>
                           <div class="text-center border-l border-white/10">
                              <p class="text-slate-500 text-[10px] uppercase">Seat</p>
                              <p class="font-bold font-mono">{{ trip.seat }}</p>
                           </div>
                           <div class="text-center border-l border-white/10">
                              <p class="text-slate-500 text-[10px] uppercase">Gate</p>
                              <p class="font-bold font-mono">{{ trip.gate }}</p>
                           </div>
                        </div>
                     </div>

                     <!-- Gallery Grid -->
                     <div>
                        <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                           <span>📸</span> Visuals
                        </h3>
                        <div class="grid grid-cols-2 gap-3">
                           @for (photo of trip.gallery; track $index) {
                              <div class="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/5 group relative">
                                 <img [src]="photo" class="w-full h-full object-cover transition duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100">
                              </div>
                           }
                        </div>
                     </div>

                     <!-- Tags -->
                     <div class="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                        @for (tag of trip.tags; track tag) {
                           <span class="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs text-slate-300">#{{ tag }}</span>
                        }
                     </div>

                  </div>
               </div>
            </div>
         }
      }

      <!-- Add/Edit Modal -->
      @if (showModal()) {
        <app-trip-form 
          [trip]="editingTrip()"
          [pickedCoordinates]="pickedCoordinates()"
          (save)="onSaveTrip($event)" 
          (cancel)="closeModal()"
          (pickLocation)="enablePickingMode()"
        ></app-trip-form>
      }
    </div>
  `,
  styles: [`
    .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #333; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  `]
})
export class AppComponent {
  tripService = inject(TripService);
  
  // UI State
  showModal = signal(false);
  editingTrip = signal<Trip | null>(null);
  isPickingMode = signal(false);
  pickedCoordinates = signal<{lat: number, lng: number} | null>(null);
  isSidebarOpen = signal(false);

  // Search & Filter State
  searchQuery = signal('');
  filterCountry = signal('');

  // Computed Lists
  allCountries = computed(() => {
    const countries = new Set(this.tripService.trips().map(t => t.country));
    return Array.from(countries).sort();
  });

  filteredTrips = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const country = this.filterCountry();
    
    return this.tripService.trips().filter(trip => {
      const matchesSearch = trip.title.toLowerCase().includes(query) || 
                            trip.country.toLowerCase().includes(query) ||
                            (trip.city && trip.city.toLowerCase().includes(query));
      
      const matchesCountry = country ? trip.country === country : true;

      return matchesSearch && matchesCountry;
    });
  });

  // Actions
  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  updateSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  updateFilter(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filterCountry.set(select.value);
  }

  selectTripFromSidebar(id: string) {
    this.tripService.selectTrip(id);
    this.isSidebarOpen.set(false);
  }

  openAddModal() {
    this.editingTrip.set(null);
    this.pickedCoordinates.set(null);
    this.isPickingMode.set(false);
    this.showModal.set(true);
  }

  openEditModal(trip: Trip) {
    this.editingTrip.set(trip);
    this.pickedCoordinates.set(null); 
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingTrip.set(null);
    this.isPickingMode.set(false);
  }

  deleteTrip(id: string) {
    if(confirm('Delete this memory?')) {
      this.tripService.deleteTrip(id);
    }
  }

  onSaveTrip(tripData: Partial<Trip>) {
    if (this.editingTrip()) {
      this.tripService.updateTrip(tripData as Trip);
    } else {
      this.tripService.addTrip(tripData as Omit<Trip, 'id' | 'coverPhoto' | 'gallery' | 'flightNumber' | 'airline' | 'seat' | 'gate'>);
    }
    this.closeModal();
  }

  enablePickingMode() {
    this.showModal.set(false);
    this.isPickingMode.set(true);
  }

  onLocationPicked(coords: {lat: number, lng: number}) {
    this.pickedCoordinates.set(coords);
    this.isPickingMode.set(false);
    this.showModal.set(true); 
  }
  
  resetView() {
    this.tripService.selectTrip(null);
  }
}
