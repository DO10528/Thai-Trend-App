'use client';

import { useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { APIProvider, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// --- Types ---
interface Shop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  trend_score: number;
  is_ad_contracted: boolean;
  video_url?: string;
  geometry: {
    location: { lat: number; lng: number };
  };
}

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

const ShopMarkers = ({ places, onMarkerClick }: { places: Shop[]; onMarkerClick: (place: Shop) => void }) => {
  return (
    <>
      {places.map((place) => {
        const score = place.trend_score || 0;
        // Neon coloring based on score
        const pinColor = score > 80 ? '#FF2A85' : score > 50 ? '#B026FF' : '#00F0FF';
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
  const [selectedPlace, setSelectedPlace] = useState<Shop | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const map = useMap();

  const fetchSupabaseShops = async (): Promise<Shop[]> => {
    try {
      const { data, error } = await supabase.from('shops').select('*');
      if (error) throw new Error(error.message);
      if (!data) return [];
  
      return data.map((shop) => ({
        id: Array.isArray(shop.id) ? shop.id[0] : (shop.id as string),
        name: shop.name || 'Unknown',
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
      if (err instanceof Error) {
        setErrorToast(`Data Sync Error: ${err.message}`);
      } else {
        setErrorToast(`Failed to load shops.`);
      }
      return [];
    }
  };

  useEffect(() => {
    // Initial fetch user
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error) console.error('Auth error:', error.message);
      else setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error during checkout');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorToast(`Payment Error: ${err.message}`);
      } else {
        setErrorToast('Failed to connect to Stripe.');
      }
    }
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
        async (error) => {
          console.warn('Geolocation failed, falling back to default:', error.message);
          // Fallback fetch even without location
          const supabaseShops = await fetchSupabaseShops();
          setPlaces(supabaseShops);
        }
      );
    }
  }, []);

  const rankedPlaces = useMemo(() => {
    return [...places].sort((a, b) => (b.trend_score || 0) - (a.trend_score || 0));
  }, [places]);

  return (
    <div className="flex flex-col h-[100dvh] w-full relative overflow-hidden bg-black text-white">
      {/* Error Toaster */}
      {errorToast && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 glass-panel neon-border-pink px-6 py-3 rounded-full flex items-center gap-3 animate-bounce">
          <span className="text-neon-pink font-bold">⚠️</span>
          <span className="font-medium text-sm">{errorToast}</span>
          <button onClick={() => setErrorToast(null)} className="ml-2 text-white/50 hover:text-white">✕</button>
        </div>
      )}

      <VideoModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />

      {/* Main Container - Responsive Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative h-full">
        
        {/* Left Panel: Desktop View & Mobile Drawer */}
        <div className="
          w-full md:w-96 md:h-full z-20 flex flex-col
          order-2 md:order-1
          glass-panel border-r-0 md:border-r border-t border-white/10 md:border-t-0
          rounded-t-[30px] md:rounded-none
          absolute md:relative bottom-0 left-0
          h-[45vh] md:h-auto
          shadow-[0_-10px_40px_rgba(0,240,255,0.1)] md:shadow-[10px_0_40px_rgba(0,0,0,0.5)]
        ">
          
          {/* Mobile Handle */}
          <div className="w-full flex justify-center py-3 md:hidden">
            <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 safe-pb custom-scrollbar">
            <div className="flex items-center justify-between mt-2 md:mt-6 mb-6">
              <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neon-pink to-neon-cyan">
                SNS TREND
              </h2>
              <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"></div>
            </div>

            {/* Auth Section */}
            {user ? (
              <div className="p-5 bg-white/5 border border-neon-cyan/30 rounded-2xl mb-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 text-xs text-neon-cyan font-mono mb-1">LOGGED IN AS</div>
                <p className="text-sm font-medium truncate mb-4 text-white/90">{user.email}</p>
                <div className="flex gap-2">
                  <button onClick={() => supabase.auth.signOut()} className="flex-1 bg-white/10 hover:bg-white/20 text-xs px-3 py-3 rounded-xl transition-colors font-medium border border-white/10">
                    LOGOUT
                  </button>
                  <button onClick={handleCheckout} className="flex-[2] bg-gradient-to-r from-neon-pink to-neon-purple hover:opacity-90 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(255,42,133,0.4)]">
                    ⚡ PREMIUM ACCESS
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => {
                  const email = window.prompt("Email for Magic Link Login:");
                  if (email) supabase.auth.signInWithOtp({ email });
                }} 
                className="w-full mb-6 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur text-white font-bold py-3.5 rounded-2xl text-sm transition-all"
              >
                CONNECT ACCOUNT
              </button>
            )}

            {/* Trend List */}
            <div className="space-y-3">
              <div className="text-[10px] font-mono text-white/40 tracking-widest mb-2">LIVE RANKING</div>
              {rankedPlaces.map((place, i) => {
                const isSelected = selectedPlace?.id === place.id;
                const score = place.trend_score || 0;
                
                return (
                  <div 
                    key={place.id} 
                    className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300
                      ${isSelected ? 'bg-white/10 border-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'bg-black/50 border-white/5 hover:bg-white/5'}
                      border
                    `}
                    onClick={() => setSelectedPlace(place)}
                  >
                    <div className={`text-2xl font-black italic 
                      ${i === 0 ? 'neon-text-pink scale-110' : i < 3 ? 'text-neon-cyan' : 'text-white/20'}`}
                    >
                      {i + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate mb-1 text-white/90 group-hover:text-white transition-colors">
                        {place.name}
                        {place.is_ad_contracted && <span className="ml-2 text-[8px] bg-neon-pink text-white px-1.5 py-0.5 rounded-full inline-block align-middle">SPONSORED</span>}
                      </div>
                      
                      {/* Futuristic Progress Bar */}
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-neon-pink' : 'bg-neon-cyan'}`}
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                      <div className="text-[9px] text-white/40 font-mono mt-1 text-right">{score}% HYPE</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Map Container */}
        <div className="flex-1 relative order-1 md:order-2 h-[55vh] md:h-full bg-black">
          <Map 
            style={{ width: '100%', height: '100%' }} 
            center={myLocation} 
            defaultZoom={14} 
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            styles={darkMapStyle}
          >
            {/* User Location Pulsing Dot */}
            <Marker position={myLocation} >
              <div className="w-5 h-5 bg-neon-cyan rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,240,255,0.8)] animate-ping absolute -translate-x-1/2 -translate-y-1/2"></div>
              <div className="w-3 h-3 bg-white rounded-full absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 z-10 transition-transform hover:scale-125"></div>
            </Marker>

            <ShopMarkers places={places} onMarkerClick={setSelectedPlace} />
          </Map>

          {/* Gradient overlay for fade into Map */}
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