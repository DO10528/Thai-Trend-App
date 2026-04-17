'use client';

import { useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import Sidebar, { Shop, RankedShop } from '@/components/Sidebar';

// --- Map Styling (Cyberpunk Dark) ---
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0A0A0F" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#00F0FF" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0A0A0F" }, { weight: 2 }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#B026FF" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0D1A1A" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#222" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#333" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FF2A85" }, { lightness: -40 }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#FF2A85" }, { lightness: -60 }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#111" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#00050A" }] },
];

// --- Utilities ---
function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

// --- Components ---
const EnvCheck = ({ children }: { children: ReactNode }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-neon-pink">
        <div className="glass-panel p-8 text-center rounded-2xl neon-border-pink">
          <h1 className="text-2xl font-black mb-2 animate-pulse">API KEY MISSING</h1>
          <p className="text-sm opacity-80">Please check your environment variables.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const ShopMarkers = ({ places, onMarkerClick }: { places: RankedShop[]; onMarkerClick: (place: RankedShop) => void }) => {
  return (
    <>
      {places.map((place) => {
        const score = place.finalScore || 0;
        const pinColor = score > 70 ? '#FF2A85' : score > 40 ? '#B026FF' : '#00F0FF';
        const scale = place.is_ad_contracted ? 1.8 : 1.3;

        const svgIcon = {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 1.5,
          scale: scale,
          anchor: { x: 12, y: 22 } as any
        };

        return (
          <Marker 
            key={place.id} 
            position={place.geometry.location} 
            title={place.name}
            icon={svgIcon}
            onClick={() => onMarkerClick(place)}
          />
        );
      })}
    </>
  );
};

const VideoModal = ({ place, onClose }: { place: Shop | null; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => { 
    if (videoRef.current) {
      videoRef.current.play().catch((e) => console.log('Video autoplay blocked:', e)); 
    }
  }, [place]);

  if (!place || !place.is_ad_contracted) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-md p-4 text-white transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(255,42,133,0.4)] border border-neon-pink p-1 animate-scale-up" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <video ref={videoRef} src={place.video_url} className="w-full h-full object-cover" loop playsInline controls />
        </div>
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 bg-black/50 hover:bg-neon-pink/50 backdrop-blur-md text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors border border-white/20"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

const MapContent = () => {
  const [myLocation, setMyLocation] = useState({ lat: 13.7468, lng: 100.5328 });
  const [places, setPlaces] = useState<Shop[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<RankedShop | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const map = useMap();

  const fetchSupabaseShops = async (): Promise<Shop[]> => {
    try {
      const { data, error } = await supabase.from('shops').select('*');
      if (error) throw new Error(error.message);
      if (!data) return [];
  
      return data.map((shop) => ({
        id: Array.isArray(shop.id) ? shop.id[0] : (shop.id as string),
        name: shop.name || 'Unknown',
        description: shop.description || '',
        category: shop.category || '',
        tags: shop.tags || '',
        latitude: parseFloat(shop.latitude) || 0,
        longitude: parseFloat(shop.longitude) || 0,
        trend_score: shop.trend_score || 0,
        is_ad_contracted: !!shop.is_ad_contracted,
        video_url: shop.video_url || '',
        geometry: {
          location: { lat: parseFloat(shop.latitude), lng: parseFloat(shop.longitude) }
        }
      }));
    } catch (err: unknown) {
      if (err instanceof Error) setErrorToast(`Data Sync Error: ${err.message}`);
      return [];
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error during checkout');
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      if (err instanceof Error) setErrorToast(`Payment Error: ${err.message}`);
    }
  };

  const handleLogout = () => supabase.auth.signOut();
  const handleLogin = () => {
    const email = window.prompt("Email for Magic Link Login:");
    if (email) supabase.auth.signInWithOtp({ email });
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setMyLocation(pos);
          const supabaseShops = await fetchSupabaseShops();
          setPlaces(supabaseShops);
        },
        async () => {
          const supabaseShops = await fetchSupabaseShops();
          setPlaces(supabaseShops);
        }
      );
    } else {
      fetchSupabaseShops().then(setPlaces);
    }
  }, []);

  // --- Realtime Search & Ranking Algorithm ---
  const rankedPlaces = useMemo(() => {
    let filtered = places;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const fullText = `${p.name} ${p.description || ''} ${p.category || ''} ${p.tags || ''}`.toLowerCase();
        return fullText.includes(q);
      });
    }

    const ranked = filtered.map(place => {
      const distanceKm = getDistanceInKm(myLocation.lat, myLocation.lng, place.latitude, place.longitude);
      const distancePenalty = distanceKm * 2; 
      const finalScore = Math.max(0, (place.trend_score || 0) - distancePenalty);

      return { ...place, distanceKm, finalScore };
    });

    return ranked.sort((a, b) => b.finalScore - a.finalScore);
  }, [places, searchQuery, myLocation]);

  return (
    <div className="flex flex-col h-[100dvh] w-full relative overflow-hidden bg-black text-white">
      {errorToast && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 glass-panel neon-border-pink px-6 py-3 rounded-full flex items-center gap-3 animate-bounce">
          <span className="text-neon-pink font-bold">⚠️</span>
          <span className="font-medium text-sm">{errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="ml-2 text-white/50 hover:text-white">✕</button>
        </div>
      )}

      <VideoModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />

      <div className="flex-1 flex flex-col md:flex-row relative h-full">
        
        <Sidebar 
          user={user}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          rankedPlaces={rankedPlaces}
          selectedPlace={selectedPlace}
          handleCheckout={handleCheckout}
          handleLogout={handleLogout}
          handleLogin={handleLogin}
          onPlaceClick={(place) => {
            setSelectedPlace(place);
            if (map) map.panTo({ lat: place.latitude, lng: place.longitude });
          }}
        />

        {/* Right Panel: Map Container */}
        <div className="flex-1 relative order-1 md:order-2 h-[55vh] md:h-full bg-black">
          <Map 
            mapId="ce6b9f4a0c8b3"
            style={{ width: '100%', height: '100%' }} 
            center={myLocation} 
            defaultZoom={14} 
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            styles={darkMapStyle}
          >
            {/* User Location Pulsing Dot */}
            <AdvancedMarker position={myLocation}>
              <div className="w-4 h-4 rounded-full bg-neon-cyan animate-pulse border-2 border-white shadow-[0_0_10px_#00F0FF]"></div>
            </AdvancedMarker>

            <ShopMarkers places={rankedPlaces} onMarkerClick={setSelectedPlace} />
          </Map>

          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent md:hidden pointer-events-none"></div>
        </div>

      </div>
    </div>
  );
};

export default function Home() {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;
  return (
    <main className="h-[100dvh] w-full relative text-white bg-black">
      <EnvCheck>
        <APIProvider apiKey={API_KEY}>
          <MapContent />
        </APIProvider>
      </EnvCheck>
    </main>
  );
}