'use client';

import { useState, useEffect } from 'react';
import { APIProvider, Map, Marker, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';

// 地図上に表示するお店のパーツ
const ShopMarkers = ({ places }: { places: google.maps.places.PlaceResult[] }) => {
  return (
    <>
      {places.map((place, index) => (
        place.geometry?.location && (
          <Marker 
            key={index} 
            position={place.geometry.location} 
            title={place.name}
          />
        )
      ))}
    </>
  );
};

export default function Home() {
  const API_KEY = 'AIzaSyCjNLzabkSaIDVuC8eFTPB9GZxBXxxK4a8'; // あなたのキー
  const [myLocation, setMyLocation] = useState({ lat: 13.7468, lng: 100.5328 });
  const [places, setPlaces] = useState<google.maps.places.PlaceResult[]>([]);
  
  const placesLib = useMapsLibrary('places');
  const map = useMap();

  useEffect(() => {
    // 1. 現在地を取得
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setMyLocation(pos);

        // 2. 現在地が決まったら近くのレストランを検索
        if (placesLib && map) {
          const service = new placesLib.PlacesService(map);
          service.nearbySearch(
            { location: pos, radius: 1000, type: 'restaurant' },
            (results, status) => {
              if (status === placesLib.PlacesServiceStatus.OK && results) {
                setPlaces(results);
              }
            }
          );
        }
      });
    }
  }, [placesLib, map]);

  return (
    <main className="h-screen w-full relative">
      <APIProvider apiKey={API_KEY}>
        <Map
          style={{ width: '100vw', height: '100vh' }}
          center={myLocation}
          defaultZoom={15}
          gestureHandling={'greedy'}
        >
          {/* 自分の場所 */}
          <Marker position={myLocation} label="YOU" />
          
          {/* 見つかったお店の場所 */}
          <ShopMarkers places={places} />
        </Map>
      </APIProvider>

      {/* 情報パネル */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 p-5 rounded-2xl shadow-xl backdrop-blur-md border border-white/50 w-64">
        <h1 className="text-xl font-black text-gray-900 leading-tight">Thai Trend Map</h1>
        <p className="text-[10px] font-bold tracking-widest text-blue-500 uppercase">Step 3: Nearby Search</p>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600 font-medium">
            周辺で見つかったお店: <span className="text-blue-600 font-bold text-lg">{places.length}</span> 件
          </p>
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-2/3"></div>
          </div>
        </div>
      </div>
    </main>
  );
}