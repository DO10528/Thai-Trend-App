import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2].replace(/^"|"$/g, '');
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const shops = [
  { id: '11111111-1111-4111-1111-111111111111', name: 'After You Dessert Cafe', description: 'Famous for Shibuya Honey Toast and Kakigori.', category: 'Dessert', tags: 'Cafe, Dessert, Sweets, Bingsu', latitude: 13.7288, longitude: 100.5348, trend_score: 98, is_ad_contracted: false },
  { id: '22222222-2222-4222-2222-222222222222', name: 'Khao San Road Night Market', description: 'Vibrant night market popular among backpackers.', category: 'Street Food', tags: 'Night Market, Backpackers, Drinks', latitude: 13.7590, longitude: 100.4971, trend_score: 95, is_ad_contracted: false },
  { id: '33333333-3333-4333-3333-333333333333', name: 'PTT Station Vibhavadi', description: 'Large gas station with Amazon Cafe and food courts.', category: 'Gas Station', tags: 'Fuel, Rest Area, Cafe Amazon', latitude: 13.8203, longitude: 100.5601, trend_score: 75, is_ad_contracted: true },
  { id: '44444444-4444-4444-4444-444444444444', name: 'Gaggan Anand', description: 'Renowned progressive Indian cuisine restaurant.', category: 'Restaurant', tags: 'Fine Dining, Indian, Michelin', latitude: 13.7383, longitude: 100.5427, trend_score: 99, is_ad_contracted: false },
  { id: '55555555-5555-4555-5555-555555555555', name: 'Tichuca Rooftop Bar', description: 'Jungle-themed rooftop bar with glowing jellyfish tree.', category: 'Cafe', tags: 'Rooftop, Bar, Nightlife', latitude: 13.7215, longitude: 100.5815, trend_score: 96, is_ad_contracted: true },
  { id: '66666666-6666-4666-6666-666666666666', name: 'Roast at EmQuartier', description: 'Cozy cafe known for specialty coffee and brunch.', category: 'Cafe', tags: 'Brunch, Coffee, EmQuartier', latitude: 13.7314, longitude: 100.5697, trend_score: 88, is_ad_contracted: false },
  { id: '77777777-7777-4777-7777-777777777777', name: 'Jay Fai', description: 'Michelin-starred street food stall famous for crab omelet.', category: 'Street Food', tags: 'Michelin, Seafood, Historic', latitude: 13.7526, longitude: 100.5048, trend_score: 100, is_ad_contracted: false },
  { id: '88888888-8888-4888-8888-888888888888', name: 'Siam Paragon Food Hall', description: 'Luxurious food court offering diverse cuisines.', category: 'Restaurant', tags: 'Food Court, Mall, Diverse', latitude: 13.7468, longitude: 100.5346, trend_score: 92, is_ad_contracted: true },
  { id: '99999999-9999-4999-9999-999999999999', name: 'Shell Station Bangna', description: 'Convenient rest stop with Deli Cafe and minimart.', category: 'Gas Station', tags: 'Fuel, Minimart, Rest Stop', latitude: 13.6705, longitude: 100.6128, trend_score: 68, is_ad_contracted: false },
  { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', name: 'Chatuchak Weekend Market', description: 'Massive market with thousands of food and clothing stalls.', category: 'Street Food', tags: 'Market, Shopping, Weekend', latitude: 13.7999, longitude: 100.5509, trend_score: 97, is_ad_contracted: false },
  { id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', name: 'Thip Samai Pad Thai', description: 'Legendary Pad Thai restaurant with a long history.', category: 'Restaurant', tags: 'Pad Thai, Noodles, Famous', latitude: 13.7527, longitude: 100.5048, trend_score: 93, is_ad_contracted: false },
  { id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc', name: 'Mandarin Oriental Bangkok', description: 'Historic luxury hotel along the Chao Phraya River.', category: 'Hotel', tags: 'Luxury, Historic, Riverside', latitude: 13.7235, longitude: 100.5142, trend_score: 94, is_ad_contracted: true },
  { id: 'dddddddd-dddd-4ddd-dddd-dddddddddddd', name: 'The Commons Thonglor', description: 'Community mall with trendy cafes and eateries.', category: 'Cafe', tags: 'Trendy, Brunch, Community', latitude: 13.7335, longitude: 100.5826, trend_score: 90, is_ad_contracted: false },
  { id: 'eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee', name: 'Som Tum Der', description: 'Authentic Isan cuisine, famous for Som Tum.', category: 'Restaurant', tags: 'Isan, Spicy, Som Tum', latitude: 13.7289, longitude: 100.5332, trend_score: 89, is_ad_contracted: false },
  { id: 'ffffffff-ffff-4fff-ffff-ffffffffffff', name: 'Bangchak Station Sukhumvit', description: 'Eco-friendly gas station with Inthanin Coffee.', category: 'Gas Station', tags: 'Eco, Fuel, Coffee', latitude: 13.7042, longitude: 100.6034, trend_score: 70, is_ad_contracted: false },
  { id: '12345678-1234-4234-1234-123456789012', name: 'Cabbages & Condoms', description: 'Unique restaurant promoting family planning.', category: 'Restaurant', tags: 'Unique, Thai Food, Concept', latitude: 13.7380, longitude: 100.5583, trend_score: 86, is_ad_contracted: true },
  { id: '23456789-2345-4345-2345-234567890123', name: 'Asiatique The Riverfront', description: 'Open-air mall with dining, shopping, and entertainment.', category: 'Restaurant', tags: 'Riverfront, Dining, Shopping', latitude: 13.7046, longitude: 100.5033, trend_score: 91, is_ad_contracted: false },
  { id: '34567890-3456-4456-3456-345678901234', name: 'Red Sky Bar', description: 'Rooftop bar offering panoramic views of Bangkok.', category: 'Cafe', tags: 'Rooftop, Views, Cocktails', latitude: 13.7466, longitude: 100.5393, trend_score: 88, is_ad_contracted: true },
  { id: '45678901-4567-4567-4567-456789012345', name: 'PTT Life Station Rama 2', description: 'Modern gas station with lifestyle amenities.', category: 'Gas Station', tags: 'Modern, Amenities, Fuel', latitude: 13.6664, longitude: 100.4357, trend_score: 72, is_ad_contracted: false },
  { id: '56789012-5678-4678-5678-567890123456', name: 'Blue Elephant', description: 'Fine dining Thai restaurant in a historic mansion.', category: 'Restaurant', tags: 'Fine Dining, Historic, Thai', latitude: 13.7171, longitude: 100.5218, trend_score: 95, is_ad_contracted: false }
];

async function seed() {
  const { data, error } = await supabase.from('shops').upsert(shops, { onConflict: 'id' });
  if (error) {
    console.error('Error inserting data:', error);
  } else {
    console.log('Successfully inserted 20 spots');
  }
}

seed();