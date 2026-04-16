'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { APIProvider, Map, Marker, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

// --- サブコンポーネント: トレンドに応じたカスタムSVGピン ---
const ShopMarkers = ({ places, onMarkerClick }: { places: any[]; onMarkerClick: (place: any) => void }) => {
  return (
    <>
      {places.map((place, index) => {
        const score = place.trendScore || 0;
        const pinColor = score > 80 ? '#FF4444' : score > 50 ? '#FF9900' : '#4444FF';
        
        const svgIcon = {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          scale: place.isAdContracted ? 1.8 : 1.3,
          anchor: typeof window !== 'undefined' && (window as any).google ? new (window as any).google.maps.Point(12, 22) : null
        };

        return (
          <Marker 
            key={index} 
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

// --- サブコンポーネント: TikTok風動画モーダル ---
const VideoModal = ({ place, onClose }: { place: any; onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => console.log("Auto-play blocked:", error));
    }
  }, [place]);

  if (!place || !place.isAdContracted) return null;

  return (
    <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center backdrop-blur-sm p-4 text-white" onClick={onClose}>
      <div className="relative w-full max-w-[320px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20" onClick={(e) => e.stopPropagation()}>
        <video 
          ref={videoRef}
          src={place.videoUrl} 
          className="w-full h-full object-cover" 
          loop 
          playsInline
          controls
        />
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="text-xl font-black">{place.name}</h3>
          <p className="text-xs text-gray-300">Trend Score: {place.trendScore}%</p>
          <button className="mt-3 w-full bg-red-600 text-white text-xs font-bold py-2 rounded-full hover:bg-red-700 transition-colors">
            メニューを見る (広告リンク)
          </button>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 text-white p-2 rounded-full backdrop-blur-sm">
          ✕
        </button>
      </div>
    </div>
  );
};

// --- サブコンポーネント: 地図本体とサイドバー ---
const MapContent = () => {
  const [myLocation, setMyLocation] = useState({ lat: 13.7468, lng: 100.5328 });
  const [places, setPlaces] = useState<any[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  
  const [user, setUser] = useState<User | null>(null);

  const placesLib = useMapsLibrary('places');
  const map = useMap();

  const rankedPlaces = useMemo(() => {
    return [...places].sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0));
  }, [places]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const email = window.prompt("ログイン用（または新規登録用）のEmailを入力してください");
    if (email) {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        alert("エラーが発生しました: " + error.message);
      } else {
        alert("ログイン用のリンクをメールで送信しました！メールボックスをご確認ください。");
      }
    }
  };

  // 💡 追加：Stripeの決済画面（API）を呼び出す処理
  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/checkout', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Stripeの決済画面へリダイレクト
      } else {
        alert("決済画面の準備に失敗しました。");
      }
    } catch (error) {
      console.error(error);
      alert("エラーが発生しました。");
    }
  };

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setMyLocation(pos);

        if (placesLib && map) {
          const service = new placesLib.PlacesService(map);
          service.nearbySearch(
            { location: pos, radius: 1000, type: 'restaurant' },
            (results: any, status: any) => {
              if (status === 'OK' && results) {
                const enrichedResults = results.map((r: any, index: number) => ({
                  ...r,
                  trendScore: Math.floor(Math.random() * 100),
                  isAdContracted: Math.random() < 0.2, 
                  videoUrl: 'https://cdn.coverr.co/videos/coverr-preparing-pad-thai-1725/1080p.mp4'
                }));
                setPlaces(enrichedResults);
              }
            }
          );
        }
      });
    }
  }, [placesLib, map]);

  return (
    <div className="flex h-screen w-full relative">
      <VideoModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />

      {/* 左側：ランキングサイドバー */}
      <div className="w-80 h-full bg-white shadow-2xl z-20 overflow-y-auto p-4 hidden md:block text-black">
        
        {/* 認証と決済エリア */}
        <div className="mb-6 border-b border-gray-200 pb-5">
          <h2 className="text-2xl font-black text-gray-800">🔥 SNS TREND</h2>
          
          {user ? (
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 truncate font-medium">User: {user.email}</p>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="mt-2 text-[10px] bg-gray-200 px-3 py-1.5 rounded-full text-gray-700 hover:bg-gray-300 transition-colors font-bold"
              >
                ログアウト
              </button>
              
              {/* 💡 修正：onClick={handleCheckout} を追加してボタンを機能させる */}
              <button 
                onClick={handleCheckout} 
                className="mt-4 w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm shadow-lg hover:bg-blue-700 hover:shadow-xl transition-all transform hover:-translate-y-0.5"
              >
                ✨ プレミアム会員 (20 THB/月)
              </button>
              <p className="text-[9px] text-gray-400 mt-2 text-center">広告非表示・ランキング全開放</p>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="mt-5 w-full bg-black text-white font-bold py-3 rounded-xl text-sm shadow-md hover:bg-gray-800 transition-all transform hover:-translate-y-0.5"
            >
              ログインして全機能を利用
            </button>
          )}
        </div>

        {/* ランキングリスト */}
        <div className="space-y-4">
          {rankedPlaces.map((place, i) => (
            <div 
              key={i} 
              className={`flex items-center gap-3 p-3 rounded-xl transition-all border cursor-pointer ${place.isAdContracted ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50 hover:border-gray-200 border-transparent'}`}
              onClick={() => setSelectedPlace(place)}
            >
              <span className={`text-lg font-black ${i < 3 ? 'text-red-500' : 'text-gray-400'}`}>{i + 1}</span>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-sm truncate w-36">{place.name}</div>
                <div className="text-[10px] text-gray-500">Trend Score: {place.trendScore}</div>
                {place.isAdContracted && <span className="text-[8px] text-white bg-red-500 px-2 py-0.5 rounded-full font-bold">ADS</span>}
              </div>
              <div className="bg-white/50 text-red-600 text-[10px] px-2 py-1 rounded-full font-bold border">
                {place.trendScore}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右側：地図本体 */}
      <div className="flex-1 relative">
        <Map
          style={{ width: '100%', height: '100%' }}
          center={myLocation}
          defaultZoom={15}
          gestureHandling={'greedy'}
        >
          <Marker 
            position={myLocation} 
            icon={{
              path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
              fillColor: '#000',
              fillOpacity: 1,
              strokeColor: "#FFF",
              strokeWeight: 2,
              scale: 1.8,
              anchor: typeof window !== 'undefined' && (window as any).google ? new (window as any).google.maps.Point(12, 22) : null
            }}
          />
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
      <APIProvider apiKey={API_KEY}>
        <MapContent />
      </APIProvider>
    </main>
  );
}