
import { Injectable, signal, computed, effect } from '@angular/core';

export interface Trip {
  id: string;
  title: string;
  country: string;
  city?: string;
  coordinates: { lat: number; lng: number };
  startDate: string;
  endDate: string;
  description: string;
  costFlight: number;
  tags: string[];
  // Extended details for "Awwwards" feel
  coverPhoto: string;
  gallery: string[];
  flightNumber: string;
  airline: string;
  seat: string;
  gate: string;
}

const STORAGE_KEY = 'wanderlust_trips_v2';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  readonly trips = signal<Trip[]>([]);
  readonly selectedTripId = signal<string | null>(null);

  // Derived state
  readonly totalTrips = computed(() => this.trips().length);
  readonly uniqueCountries = computed(() => {
    const countries = new Set(this.trips().map(t => t.country));
    return countries.size;
  });
  readonly totalFlightCost = computed(() => {
    return this.trips().reduce((sum, t) => sum + (t.costFlight || 0), 0);
  });
  readonly totalDays = computed(() => {
    return this.trips().reduce((sum, t) => {
      const start = new Date(t.startDate).getTime();
      const end = new Date(t.endDate).getTime();
      const diff = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      return sum + diff;
    }, 0);
  });

  constructor() {
    this.loadFromStorage();
    
    effect(() => {
      const currentTrips = this.trips();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTrips));
    });
  }

  private loadFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.trips.set(JSON.parse(stored));
      } catch (e) {
        this.seedData();
      }
    } else {
      this.seedData();
    }
  }

  private seedData() {
    this.trips.set([
      {
        id: crypto.randomUUID(),
        title: 'Neon Nights in Tokyo',
        country: 'Japan',
        city: 'Tokyo',
        coordinates: { lat: 35.6762, lng: 139.6503 },
        startDate: '2023-04-01',
        endDate: '2023-04-14',
        description: 'Lost in translation, found in the lights. Sushi marathons, Shibuya crossing chaos, and peaceful temples in the rain.',
        costFlight: 1200,
        tags: ['City', 'Food', 'Cyberpunk'],
        coverPhoto: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=1000&auto=format&fit=crop',
        gallery: [
          'https://images.unsplash.com/photo-1503899036084-c55cdd92da26',
          'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e',
          'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc'
        ],
        flightNumber: 'JL 408',
        airline: 'JAL',
        seat: '14A',
        gate: 'D2'
      },
      {
        id: crypto.randomUUID(),
        title: 'Icelandic Roadtrip',
        country: 'Iceland',
        city: 'Reykjavik',
        coordinates: { lat: 64.1466, lng: -21.9426 },
        startDate: '2022-09-10',
        endDate: '2022-09-15',
        description: 'Chasing waterfalls and the northern lights. The landscape felt like another planet.',
        costFlight: 600,
        tags: ['Nature', 'Cold', 'Photography'],
        coverPhoto: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?q=80&w=1000&auto=format&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1504893524553-bfe206dd6432',
            'https://images.unsplash.com/photo-1520699918507-3c3e05c46b90',
            'https://images.unsplash.com/photo-1476610182048-b716b8518aae'
        ],
        flightNumber: 'FI 450',
        airline: 'Icelandair',
        seat: '22F',
        gate: 'A1'
      },
      {
        id: crypto.randomUUID(),
        title: 'New York State of Mind',
        country: 'USA',
        city: 'New York',
        coordinates: { lat: 40.7128, lng: -74.0060 },
        startDate: '2023-11-05',
        endDate: '2023-11-10',
        description: 'Business trip turned urban exploration. Central Park in autumn is unmatched.',
        costFlight: 450,
        tags: ['Work', 'City', 'Architecture'],
        coverPhoto: 'https://images.unsplash.com/photo-1496442226666-8d4a0e62e6e9?q=80&w=1000&auto=format&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2',
            'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b'
        ],
        flightNumber: 'DL 112',
        airline: 'Delta',
        seat: '4C',
        gate: 'T4'
      },
      {
        id: crypto.randomUUID(),
        title: 'Sahara Expedition',
        country: 'Morocco',
        city: 'Merzouga',
        coordinates: { lat: 31.1103, lng: -3.9785 },
        startDate: '2024-01-10',
        endDate: '2024-01-25',
        description: 'Sleeping under a billion stars in the desert. Camel trekking was harder than it looks.',
        costFlight: 800,
        tags: ['Desert', 'Adventure'],
        coverPhoto: 'https://images.unsplash.com/photo-1539650116455-8ef84f0b0d7f?q=80&w=1000&auto=format&fit=crop',
        gallery: [
            'https://images.unsplash.com/photo-1512551800344-3d968f921501',
            'https://images.unsplash.com/photo-1549488346-60144dc926e2'
        ],
        flightNumber: 'AT 801',
        airline: 'RAM',
        seat: '12B',
        gate: 'C3'
      }
    ]);
  }

  addTrip(trip: Omit<Trip, 'id' | 'coverPhoto' | 'gallery' | 'flightNumber' | 'airline' | 'seat' | 'gate'>) {
    // Add mock rich data for new trips
    const newTrip: Trip = { 
        ...trip, 
        id: crypto.randomUUID(),
        coverPhoto: `https://picsum.photos/seed/${Math.random()}/1000/600`,
        gallery: [
            `https://picsum.photos/seed/${Math.random() + 1}/600/400`,
            `https://picsum.photos/seed/${Math.random() + 2}/600/400`,
            `https://picsum.photos/seed/${Math.random() + 3}/600/400`
        ],
        flightNumber: 'XX 000',
        airline: 'Unknown',
        seat: '1A',
        gate: '--'
    };
    this.trips.update(list => [newTrip, ...list]);
  }

  updateTrip(updatedTrip: Trip) {
    this.trips.update(list => list.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  }

  deleteTrip(id: string) {
    this.trips.update(list => list.filter(t => t.id !== id));
    if (this.selectedTripId() === id) {
      this.selectedTripId.set(null);
    }
  }

  selectTrip(id: string | null) {
    this.selectedTripId.set(id);
  }

  getTripById(id: string): Trip | undefined {
    return this.trips().find(t => t.id === id);
  }
}
