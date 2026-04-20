import { User } from '@supabase/supabase-js';

export interface Shop {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string;
  latitude: number;
  longitude: number;
  trend_score: number;
  is_ad_contracted: boolean;
  video_url?: string;
  geometry: {
    location: { lat: number; lng: number };
  };
}

export interface RankedShop extends Shop {
  distanceKm: number;
  finalScore: number;
}

export const PROVINCES = [
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { name: 'Chiang Mai', lat: 18.7883, lng: 98.9853 },
  { name: 'Phuket', lat: 7.8804, lng: 98.3923 },
  { name: 'Pattaya', lat: 12.9236, lng: 100.8825 },
  { name: 'Khon Kaen', lat: 16.4322, lng: 102.8236 },
];

export const CATEGORIES = [
  'All',
  'Restaurant',
  'Cafe',
  'Hotel',
  'Gas Station',
  'Street Food',
  'Seafood',
  'Dessert',
];

interface SidebarProps {
  user: User | null;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  selectedProvince: string;
  setSelectedProvince: (val: string) => void;
  rankedPlaces: RankedShop[];
  selectedPlace: RankedShop | null;
  isLoading?: boolean;
  handleCheckout: () => void;
  handleLogout: () => void;
  handleLogin: () => void;
  onPlaceClick: (place: RankedShop) => void;
}

export default function Sidebar({
  user,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedProvince,
  setSelectedProvince,
  rankedPlaces,
  selectedPlace,
  isLoading = false,
  handleCheckout,
  handleLogout,
  handleLogin,
  onPlaceClick,
}: SidebarProps) {
  return (
    <div className="
      w-full md:w-[400px] md:h-full z-20 flex flex-col
      order-2 md:order-1
      glass-panel border-r-0 md:border-r border-t border-white/10 md:border-t-0
      rounded-t-[30px] md:rounded-none
      absolute md:relative bottom-0 left-0
      h-[50vh] md:h-auto
      shadow-[0_-10px_40px_rgba(0,240,255,0.1)] md:shadow-[10px_0_40px_rgba(0,0,0,0.5)]
    ">
      
      {/* Mobile Handle */}
      <div className="w-full flex justify-center py-3 md:hidden">
        <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 safe-pb custom-scrollbar">
        <div className="flex items-center justify-between mt-2 md:mt-6 mb-4">
          <h2 className="text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-neon-pink to-neon-cyan">
            SNS TREND
          </h2>
          <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]"></div>
        </div>

        {/* Neon Cyber Search Bar */}
        <div className="mb-4 relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
             <span className="text-neon-cyan/50 group-focus-within:text-neon-cyan transition-colors">🔍</span>
          </div>
          <input 
            type="text" 
            placeholder="Search food, shops (e.g. ส้มตำ)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:border-transparent transition-all shadow-inner placeholder:text-white/30 text-sm font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
          <select 
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="bg-black/40 border border-white/10 text-white px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-neon-cyan text-sm min-w-[120px]"
          >
            <option value="">Select Area</option>
            {PROVINCES.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === 'All' ? '' : cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  (cat === 'All' && !selectedCategory) || selectedCategory === cat
                    ? 'bg-neon-cyan text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                    : 'bg-black/40 border border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Auth Section */}
        {user ? (
          <div className="p-4 bg-white/5 border border-neon-cyan/30 rounded-2xl mb-6 relative overflow-hidden group hover:border-neon-cyan/80 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10 text-[10px] text-neon-cyan font-mono mb-1">LOGGED IN AS</div>
            <p className="text-sm font-medium truncate mb-4 text-white/90">{user.email}</p>
            <div className="flex gap-2">
              <button onClick={handleLogout} className="flex-1 bg-white/10 hover:bg-white/20 text-[10px] sm:text-xs px-2 py-3 rounded-xl transition-colors font-medium border border-white/10">
                LOGOUT
              </button>
              <button onClick={handleCheckout} className="flex-[2] bg-gradient-to-r from-neon-pink to-neon-purple hover:opacity-90 text-white font-bold py-3 rounded-xl text-[10px] sm:text-xs transition-all shadow-[0_0_15px_rgba(255,42,133,0.4)] whitespace-nowrap">
                ⚡ PREMIUM ACCESS
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleLogin} 
            className="w-full mb-6 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur text-white font-bold py-3.5 rounded-2xl text-sm transition-all"
          >
            CONNECT ACCOUNT
          </button>
        )}

        {/* Trend List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-2">
            <div className="text-[10px] font-mono text-white/40 tracking-widest">LIVE RANKING</div>
            {searchQuery && <div className="text-[10px] text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded-full">{rankedPlaces.length} MATCHES</div>}
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-70">
              <div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
              <div className="text-xs font-mono text-neon-cyan">SYNCING DATA...</div>
            </div>
          ) : rankedPlaces.length === 0 ? (
            <div className="text-center py-10 opacity-50 text-sm">一致するお店が見つかりませんでした。</div>
          ) : (
            rankedPlaces.map((place, i) => {
              const isSelected = selectedPlace?.id === place.id;
              
              return (
                <div 
                  key={place.id} 
                  className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300
                    ${isSelected ? 'bg-white/10 border-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'bg-black/50 border-white/5 hover:bg-white/5'}
                    border
                  `}
                  onClick={() => onPlaceClick(place)}
                >
                  <div className={`text-2xl font-black italic w-6 text-center
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
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden flex mb-1.5 mt-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${i === 0 ? 'bg-neon-pink' : 'bg-neon-cyan'}`}
                        style={{ width: `${Math.min(100, Math.max(0, place.finalScore))}%` }}
                      ></div>
                    </div>

                    {/* Stats Readout */}
                    <div className="flex justify-between items-center text-[9px] font-mono mt-1">
                      <div className={`flex gap-2 ${place.distanceKm < 5 ? 'text-neon-cyan' : 'text-white/40'}`}>
                        <span>📍 {place.distanceKm.toFixed(1)} km</span>
                        {place.distanceKm < 5 && <span className="bg-neon-cyan text-black px-1 rounded-[3px] font-bold">NEARBY</span>}
                      </div>
                      <div className="text-white/60">{Math.floor(place.finalScore)} PWR</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
