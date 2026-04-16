'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { APIProvider, Map, Marker, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// --- 鍵チェック用コンポーネント ---
const EnvCheck = ({ children }: { children: React.ReactNode }) => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-red-50 p-10 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl">
          <h1 className="text-2xl font-bold text-red-600 mb-4">APIキー設定エラー</h1>
          <p className="text-gray-600 text-sm">Vercelまたは.env.localの環境変数を確認してください。</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// --- カスタムSVGピン ---
const ShopMarkers = ({ places, onMarkerClick }: { places: any[]; onMarkerClick: (place: any) => void }) => {
  return (
    <>
      {places.map((place, index) => {
        const score = place.trend_score || 0;
        const pinColor = score > 80 ? '#FF4444' : score > 50 ? '#FF9900' : '#4444FF';
        
        const svgIcon = {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          scale: place.is_ad_contracted ? 1.8 : 1.3,
          anchor: { x: 12, y: 22 } as any
        };

        return (
          <Marker 
            key={place.id || index} 
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

// --- 動画モーダル ---
const VideoModal = ({ place, onClose }: { place: any; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (videoRef.current) videoRef.current.play().catch(() => {}); }, [place]);
  if (!place || !place.is_ad_contracted) return null;

  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm p-4 text-white" onClick={onClose}>
      <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20" onClick={(e) => e.stopPropagation()}>
        <video ref={videoRef} src={place.video_url} className="w-full h-full object-cover" loop playsInline controls />
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="text-xl font-black">{place.name}</h3>
          <p className="text-xs text-gray-300">Trend Score: {place.trend_score}%</p>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 text-white p-2 rounded-full">✕</button>
      </div>
    </div>
  );
};

// --- メインコンテンツ ---
const MapContent = () => {
  const [myLocation, setMyLocation] = useState({ lat: 13.7468, lng: 100.5328 });
  const [places, setPlaces] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);

  const map = useMap();

  // 1. Supabaseからデータを読み込む関数
  const fetchSupabaseShops = async () => {
    const { data, error } = await supabase
      .from('shops')
      .select('*');
    
    if (error) {
      console.error('Supabase Error:', error);
      return [];
    }

    // Google Mapsの形式に合わせてデータを変換
    return data.map(shop => ({
      ...shop,
      geometry: {
        location: { lat: shop.latitude, lng: shop.longitude }
      }
    }));
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const email = window.prompt("Emailを入力してください");
    if (email) await supabase.auth.signInWithOtp({ email });
  };

  const handleCheckout = async () => {
    const res = await fetch('/api/checkout', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  // 2. ページ読み込み時にデータを取得
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setMyLocation(pos);

        // Supabaseから本物のデータを取得
        const supabaseShops = await fetchSupabaseShops();
        setPlaces(supabaseShops);
      });
    }
  }, []);

  const rankedPlaces = useMemo(() => {
    return [...places].sort((a, b) => (b.trend_score || 0) - (a.trend_score || 0));
  }, [places]);

  return (
    <div className="flex h-screen w-full relative">
      <VideoModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      <div className="w-80 h-full bg-white shadow-2xl z-20 overflow-y-auto p-4 hidden md:block text-black">
        <h2 className="text-2xl font-black text-gray-800">🔥 SNS TREND</h2>
        {user ? (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs text-gray-500 font-medium truncate">User: {user.email}</p>
            <button onClick={() => supabase.auth.signOut()} className="mt-2 text-[10px] bg-gray-200 px-3 py-1.5 rounded-full">ログアウト</button>
            <button onClick={handleCheckout} className="mt-4 w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm">✨ プレミアム会員</button>
          </div>
        ) : (
          <button onClick={handleLogin} className="mt-5 w-full bg-black text-white font-bold py-3 rounded-xl text-sm">ログイン</button>
        )}
        <div className="mt-8 space-y-4">
          {rankedPlaces.map((place, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${place.is_ad_contracted ? 'bg-red-50 border-red-200' : 'border-transparent'}`} onClick={() => setSelectedPlace(place)}>
              <span className={`text-lg font-black ${i < 3 ? 'text-red-500' : 'text-gray-400'}`}>{i + 1}</span>
              <div className="flex-1">
                <div className="font-bold text-sm truncate w-36">{place.name}</div>
                <div className="text-[10px] text-gray-500">Trend: {place.trend_score}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 relative">
        <Map style={{ width: '100%', height: '100%' }} center={myLocation} defaultZoom={15} gestureHandling={'greedy'}>
          <Marker position={myLocation} />
          <ShopMarkers places={places} onMarkerClick={setSelectedPlace} />
        </Map>
      </div>
    </div>
  );
};

export default function Home() {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;
  return (
    <main className="h-screen w-full relative text-black">
      <EnvCheck>
        <APIProvider apiKey={API_KEY}>
          <MapContent />
        </APIProvider>
      </EnvCheck>
    </main>
  );
}