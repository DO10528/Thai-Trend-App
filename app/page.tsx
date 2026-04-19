'use client';

import { useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import Sidebar, { Shop, RankedShop, PROVINCES } from '@/components/Sidebar';

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

const ShopMarkers = ({ places, selectedPlace, onMarkerClick }: { places: RankedShop[]; selectedPlace: RankedShop | null; onMarkerClick: (place: RankedShop) => void }) => {
  return (
    <>
      {places.map((place) => {
        const score = place.finalScore || 0;
        const pinColor = score > 70 ? '#FF2A85' : score > 40 ? '#B026FF' : '#00F0FF';
        const isSelected = selectedPlace?.id === place.id;
        const scale = isSelected ? 1.8 : (place.is_ad_contracted ? 1.5 : 1.1);

        return (
          <AdvancedMarker 
            key={place.id} 
            position={place.geometry.location} 
            title={place.name}
            onClick={() => onMarkerClick(place)}
            zIndex={isSelected ? 1000 : 1}
          >
            <Pin background={pinColor} borderColor={isSelected ? "#FFD700" : "#FFFFFF"} glyphColor="#FFFFFF" scale={scale} />
          </AdvancedMarker>
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

const Directions = ({ origin, destination, travelMode, setTravelMode }: { 
  origin: { lat: number, lng: number }, 
  destination: { lat: number, lng: number } | null, 
  travelMode: 'BICYCLING' | 'DRIVING' | 'TRANSIT' | 'TWO_WHEELER' | 'WALKING',
  setTravelMode: (mode: 'BICYCLING' | 'DRIVING' | 'TRANSIT' | 'TWO_WHEELER' | 'WALKING') => void
}) => {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();
  const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);

  useEffect(() => {
    if (!routesLibrary || !map) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDirectionsService(new routesLibrary.DirectionsService());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map, suppressMarkers: true }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !destination) {
      if (directionsRenderer) directionsRenderer.setDirections(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRouteInfo(null);
      return;
    }

    directionsService.route({
      origin,
      destination,
      travelMode: travelMode,
    }).then(response => {
      directionsRenderer.setDirections(response);
      const leg = response.routes[0]?.legs[0];
      if (leg) {
        setRouteInfo({
          distance: leg.distance?.text || '',
          duration: leg.duration?.text || ''
        });
      }
    }).catch(e => {
      console.error('Directions request failed', e);
      setRouteInfo(null);
    });
  }, [directionsService, directionsRenderer, origin, destination, travelMode]);

  if (!destination || !routeInfo) return null;

  return (
    <div className="absolute top-4 right-4 bg-white text-black p-4 rounded-xl shadow-lg z-10 border border-gray-200">
      <h3 className="font-bold text-sm mb-2">Route Info</h3>
      <div className="flex gap-2 mb-2">
        <button onClick={() => setTravelMode('DRIVING')} className={`px-2 py-1 text-xs rounded ${travelMode === 'DRIVING' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>🚗 Car</button>
        <button onClick={() => setTravelMode('BICYCLING')} className={`px-2 py-1 text-xs rounded ${travelMode === 'BICYCLING' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>🏍️ Bike</button>
        <button onClick={() => setTravelMode('WALKING')} className={`px-2 py-1 text-xs rounded ${travelMode === 'WALKING' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>🚶 Walk</button>
      </div>
      <p className="text-xs">Distance: {routeInfo.distance}</p>
      <p className="text-xs">Duration: {routeInfo.duration}</p>
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [travelMode, setTravelMode] = useState<'BICYCLING' | 'DRIVING' | 'TRANSIT' | 'TWO_WHEELER' | 'WALKING'>('DRIVING');

  const map = useMap();

  const fetchSupabaseShops = async (query?: string, categoryFilter?: string): Promise<Shop[]> => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error('Supabase Configuration Missing');
      }
      let sbQuery = supabase.from('shops').select('*');
      if (query && query.trim()) {
        const q = `%${query.trim()}%`;
        sbQuery = sbQuery.or(`name.ilike.${q},category.ilike.${q},tags.ilike.${q}`);
      }
      if (categoryFilter) {
        sbQuery = sbQuery.eq('category', categoryFilter);
      }
      const { data, error } = await sbQuery;
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
    const delayDebounceFn = setTimeout(() => {
      fetchSupabaseShops(searchQuery, selectedCategory).then(setPlaces);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategory]);

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
        (position) => {
          setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => console.warn('Geolocation failed or blocked.')
      );
    }
  }, []);

  // --- Realtime Ranking Algorithm ---
  const rankedPlaces = useMemo(() => {
    const ranked = places.map(place => {
      const distanceKm = getDistanceInKm(myLocation.lat, myLocation.lng, place.latitude, place.longitude);
      const distancePenalty = distanceKm * 0.5; // Soft penalty
      const finalScore = Math.max(0, (place.trend_score || 0) - distancePenalty);

      return { ...place, distanceKm, finalScore };
    });

    return ranked.sort((a, b) => {
      if (Math.floor(b.finalScore) !== Math.floor(a.finalScore)) {
        return b.finalScore - a.finalScore; // Sort by calculated score
      }
      return a.distanceKm - b.distanceKm; // Tie-breaker: Closer spots first
    });
  }, [places, myLocation]);

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
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedProvince={selectedProvince}
          setSelectedProvince={(provName) => {
            setSelectedProvince(provName);
            const prov = PROVINCES.find(p => p.name === provName);
            if (prov && map) {
              map.panTo({ lat: prov.lat, lng: prov.lng });
              map.setZoom(12);
            }
          }}
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
        <div className="flex-1 relative order-1 md:order-2 h-[55vh] md:h-full bg-white">
          <Map 
            mapId="DEMO_MAP_ID"
            style={{ width: '100%', height: '100%' }} 
            center={myLocation} 
            defaultZoom={14} 
            gestureHandling={'greedy'}
            disableDefaultUI={false}
          >
            {/* User Location Pulsing Dot */}
            <AdvancedMarker position={myLocation}>
              <div className="w-4 h-4 rounded-full bg-neon-cyan animate-pulse border-2 border-white shadow-[0_0_10px_#00F0FF]"></div>
            </AdvancedMarker>

            <ShopMarkers places={rankedPlaces} selectedPlace={selectedPlace} onMarkerClick={setSelectedPlace} />
            <Directions 
                origin={myLocation} 
                destination={selectedPlace ? { lat: selectedPlace.latitude, lng: selectedPlace.longitude } : null} 
                travelMode={travelMode} 
                setTravelMode={setTravelMode}
              />
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