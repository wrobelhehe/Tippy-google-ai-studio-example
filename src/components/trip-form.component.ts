import { Component, input, output, effect, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Trip } from '../services/trip.service';

@Component({
  selector: 'app-trip-form',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" (click)="cancel.emit()"></div>
      
      <!-- Modal Content -->
      <div class="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div class="p-6 border-b border-slate-700 flex justify-between items-center shrink-0">
          <h2 class="text-xl font-bold text-white">{{ isEdit() ? 'Edit Trip' : 'Add New Trip' }}</h2>
          <button (click)="cancel.emit()" class="text-slate-400 hover:text-white">✕</button>
        </div>

        <div class="p-6 overflow-y-auto custom-scrollbar">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            
            <!-- Title -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1">Trip Title</label>
              <input type="text" formControlName="title" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none">
            </div>

            <!-- Location Row -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Country</label>
                <input type="text" formControlName="country" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">City (Optional)</label>
                <input type="text" formControlName="city" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <!-- Coordinates Picker -->
            <div class="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
              <div class="flex justify-between items-center mb-2">
                <label class="block text-sm font-medium text-blue-400">Coordinates</label>
                <button type="button" (click)="pickLocation.emit()" class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded transition">
                  📍 Pick on Globe
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div class="bg-slate-900 p-2 rounded text-slate-400">
                  Lat: <span class="text-white">{{ form.value.lat | number:'1.4-4' }}</span>
                </div>
                <div class="bg-slate-900 p-2 rounded text-slate-400">
                  Lng: <span class="text-white">{{ form.value.lng | number:'1.4-4' }}</span>
                </div>
              </div>
              @if (form.controls['lat'].invalid && form.controls['lat'].touched) {
                <p class="text-red-400 text-xs mt-1">Coordinates required (Pick from globe or enter manually)</p>
              }
            </div>

            <!-- Dates -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                <input type="date" formControlName="startDate" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                <input type="date" formControlName="endDate" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <!-- Cost & Tags -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Flight Cost ($)</label>
                <input type="number" formControlName="costFlight" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-1">Tags (comma sep)</label>
                <input type="text" formControlName="tags" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none">
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea formControlName="description" rows="3" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
            </div>

            <div class="pt-4 flex justify-end gap-3 shrink-0">
              <button type="button" (click)="cancel.emit()" class="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition">Cancel</button>
              <button type="submit" [disabled]="form.invalid" class="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {{ isEdit() ? 'Update Trip' : 'Add Trip' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 4px; }
  `]
})
export class TripFormComponent {
  trip = input<Trip | null>(null);
  pickedCoordinates = input<{lat: number, lng: number} | null>(null);
  
  save = output<Partial<Trip>>();
  cancel = output<void>();
  pickLocation = output<void>();

  private readonly fb: FormBuilder;
  readonly form: FormGroup;

  constructor() {
    // FIX: Initializing FormBuilder and the form group inside the constructor
    // ensures a valid dependency injection context and resolves issues with
    // field initializers in some environments.
    this.fb = inject(FormBuilder);
    this.form = this.fb.group({
      title: ['', Validators.required],
      country: ['', Validators.required],
      city: [''],
      lat: [null as number | null, Validators.required],
      lng: [null as number | null, Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      description: [''],
      costFlight: [0],
      tags: ['']
    });

    // Populate form if editing
    effect(() => {
      const t = this.trip();
      if (t) {
        this.form.patchValue({
          title: t.title,
          country: t.country,
          city: t.city,
          lat: t.coordinates.lat,
          lng: t.coordinates.lng,
          startDate: t.startDate,
          endDate: t.endDate,
          description: t.description,
          costFlight: t.costFlight,
          tags: t.tags.join(', ')
        });
      }
    });

    // Update coordinates when picked from globe
    effect(() => {
      const coords = this.pickedCoordinates();
      if (coords) {
        this.form.patchValue({
          lat: coords.lat,
          lng: coords.lng
        });
      }
    });
  }

  isEdit() {
    return !!this.trip();
  }

  onSubmit() {
    if (this.form.valid) {
      const val = this.form.value;
      const tripData = {
        title: val.title,
        country: val.country,
        city: val.city,
        coordinates: { lat: val.lat!, lng: val.lng! },
        startDate: val.startDate,
        endDate: val.endDate,
        description: val.description,
        costFlight: val.costFlight,
        tags: val.tags ? val.tags.toString().split(',').map((s: string) => s.trim()).filter((s: string) => s) : []
      };
      
      this.save.emit({
        ...tripData,
        id: this.trip()?.id 
      });
    }
  }
}
