'use client';

import { APIProvider, Map } from '@vis.gl/react-google-maps';

export default function Home() {
  // 先ほど取得したAPIキーを入力してください
  const API_KEY = 'AIzaSyCjNLzabkSaIDVuC8eFTPB9GZxBXxxK4a8';

  return (
    <main className="h-screen w-full">
      <APIProvider apiKey={API_KEY}>
        <Map
          style={{ width: '100vw', height: '100vh' }}
          defaultCenter={{ lat: 13.7468, lng: 100.5328 }} // バンコク・サイアム
          defaultZoom={15}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
        />
      </APIProvider>
      
      {/* オーバーレイUIのサンプル */}
      <div className="absolute top-4 left-4 z-10 bg-white p-4 rounded-lg shadow-lg">
        <h1 className="text-xl font-bold text-gray-800">Thai Trend Map (Step 1)</h1>
        <p className="text-sm text-gray-500">Google Maps Integration Successed.</p>
      </div>
    </main>
  );
}