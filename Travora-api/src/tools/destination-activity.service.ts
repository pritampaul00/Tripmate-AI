import { Injectable } from '@nestjs/common';
import { ActivityCandidate } from '../models/activity-planning.model';

@Injectable()
export class DestinationActivityService {
  private readonly catalog: Record<string, ActivityCandidate[]> = {
    tokyo: [
      this.a('senso-ji', 'Senso-ji Temple', 'Visit Tokyo\'s historic temple complex and Nakamise shopping street.', 'Asakusa', 35.7148, 139.7967, 'culture', ['culture', 'history', 'photography'], ['Couple', 'Family'], 'free', 90, 'morning'),
      this.a('nakamise', 'Nakamise-dori', 'Browse traditional snacks, souvenirs, and small shops beside Senso-ji.', 'Asakusa', 35.7119, 139.7966, 'shopping', ['shopping', 'food', 'culture'], ['Couple', 'Family'], 'low', 75, 'morning'),
      this.a('ueno-park', 'Ueno Park', 'Walk through one of Tokyo\'s major green spaces and its cultural district.', 'Ueno', 35.7146, 139.7745, 'nature', ['nature', 'culture', 'photography'], ['Couple', 'Family'], 'free', 90, 'afternoon'),
      this.a('ameyoko', 'Ameyoko Market', 'Explore a busy market street for snacks, casual shopping, and local atmosphere.', 'Ueno', 35.7077, 139.7747, 'food', ['food', 'shopping', 'photography'], ['Couple', 'Friends'], 'low', 90, 'evening'),
      this.a('meiji-jingu', 'Meiji Jingu', 'Walk through the forested shrine grounds near Harajuku.', 'Harajuku', 35.6764, 139.6993, 'culture', ['culture', 'history', 'nature', 'photography'], ['Couple', 'Family'], 'free', 90, 'morning'),
      this.a('takeshita', 'Takeshita Street', 'Browse Harajuku fashion, street snacks, and youth culture.', 'Harajuku', 35.6716, 139.7041, 'shopping', ['shopping', 'food', 'photography'], ['Couple', 'Friends'], 'low', 120, 'afternoon'),
      this.a('shibuya-crossing', 'Shibuya Crossing', 'See one of Tokyo\'s busiest intersections and explore the surrounding streets.', 'Shibuya', 35.6595, 139.7005, 'attraction', ['photography', 'shopping', 'nightlife'], ['Couple', 'Friends'], 'free', 60, 'evening'),
      this.a('shibuya-sky', 'Shibuya Sky', 'Take a rooftop view over Tokyo from Shibuya.', 'Shibuya', 35.6581, 139.7014, 'viewpoint', ['photography', 'views', 'romantic'], ['Couple'], 'high', 90, 'evening'),
      this.a('shinjuku-gyoen', 'Shinjuku Gyoen National Garden', 'Walk through landscaped gardens in central Tokyo.', 'Shinjuku', 35.6852, 139.7101, 'nature', ['nature', 'photography', 'romantic'], ['Couple', 'Family'], 'low', 120, 'morning'),
      this.a('tokyo-metropolitan', 'Tokyo Metropolitan Government Building', 'Use the free observation area for a broad Tokyo skyline view.', 'Shinjuku', 35.6896, 139.6917, 'viewpoint', ['views', 'photography'], ['Couple', 'Family'], 'free', 75, 'afternoon'),
      this.a('kabukicho', 'Kabukicho', 'Explore Shinjuku\'s neon entertainment district after dark.', 'Shinjuku', 35.694, 139.7036, 'nightlife', ['nightlife', 'photography', 'food'], ['Couple', 'Friends'], 'free', 90, 'evening'),
      this.a('akihabara', 'Akihabara Electric Town', 'Explore anime, manga, games, arcades, and electronics stores.', 'Akihabara', 35.6984, 139.7731, 'entertainment', ['anime', 'manga', 'gaming', 'shopping', 'electronics'], ['Couple', 'Friends'], 'low', 180, 'afternoon'),
      this.a('ginza', 'Ginza', 'Explore upscale shopping streets, department stores, and flagship shops.', 'Ginza', 35.6717, 139.765, 'shopping', ['shopping', 'food', 'photography'], ['Couple'], 'free', 120, 'afternoon'),
      this.a('teamlab', 'teamLab Planets TOKYO', 'Experience an immersive digital art exhibition in Toyosu.', 'Toyosu', 35.6467, 139.7891, 'entertainment', ['art', 'photography', 'romantic'], ['Couple'], 'high', 120, 'morning'),
      this.a('odaiba', 'Odaiba Waterfront', 'Walk the waterfront and see Tokyo Bay attractions.', 'Odaiba', 35.6249, 139.7757, 'nature', ['nature', 'photography', 'shopping'], ['Couple', 'Family'], 'free', 150, 'afternoon'),
      this.a('tokyo-tower', 'Tokyo Tower Area', 'See Tokyo Tower and explore the surrounding Minato district.', 'Roppongi', 35.6586, 139.7454, 'viewpoint', ['views', 'photography', 'romantic'], ['Couple'], 'medium', 120, 'evening'),
      this.a('yurakucho', 'Yurakucho Dining Alleys', 'Try casual Japanese food beneath the railway tracks.', 'Yurakucho', 35.6749, 139.7627, 'food', ['food', 'nightlife'], ['Couple', 'Friends'], 'medium', 90, 'evening'),
      this.a('tsukiji', 'Tsukiji Outer Market', 'Browse seafood stalls, Japanese snacks, and food shops.', 'Tsukiji', 35.6654, 139.7707, 'food', ['food', 'photography', 'culture'], ['Couple', 'Family'], 'medium', 120, 'morning'),
      this.a('imperial-palace', 'Imperial Palace East Gardens', 'Walk through historic gardens near Tokyo Station.', 'Tokyo Station', 35.6852, 139.7528, 'culture', ['history', 'nature', 'photography'], ['Couple', 'Family'], 'free', 90, 'afternoon'),
    ],
    seoul: [
      this.a('gyeongbokgung', 'Gyeongbokgung Palace', 'Explore Seoul\'s main royal palace and its historic grounds.', 'Jongno', 37.5796, 126.977, 'culture', ['culture', 'history', 'photography'], ['Couple', 'Family'], 'low', 120, 'morning'),
      this.a('bukchon', 'Bukchon Hanok Village', 'Walk through traditional Korean houses and lanes.', 'Bukchon', 37.5826, 126.983, 'culture', ['culture', 'history', 'photography'], ['Couple'], 'free', 120, 'afternoon'),
      this.a('insadong', 'Insadong', 'Browse traditional crafts, tea houses, and Korean souvenirs.', 'Insadong', 37.5743, 126.985, 'shopping', ['shopping', 'culture', 'food'], ['Couple', 'Family'], 'low', 120, 'afternoon'),
      this.a('gwangjang', 'Gwangjang Market', 'Try Korean street food and browse a traditional market.', 'Jongno', 37.5701, 126.9997, 'food', ['food', 'culture', 'photography'], ['Couple', 'Friends'], 'low', 120, 'evening'),
      this.a('namsan', 'Namsan Seoul Tower', 'See Seoul from a hilltop landmark and viewpoint.', 'Namsan', 37.5512, 126.9882, 'viewpoint', ['views', 'photography', 'romantic'], ['Couple'], 'medium', 150, 'evening'),
      this.a('myeongdong', 'Myeongdong', 'Explore a central shopping district and Korean street food stalls.', 'Myeongdong', 37.5636, 126.9869, 'shopping', ['shopping', 'food', 'nightlife'], ['Couple', 'Friends'], 'low', 150, 'evening'),
      this.a('hongdae', 'Hongdae', 'Explore cafes, street performances, shopping, and nightlife.', 'Hongdae', 37.5563, 126.9236, 'nightlife', ['nightlife', 'food', 'shopping', 'music'], ['Couple', 'Friends'], 'low', 180, 'evening'),
      this.a('bukhan', 'Bukhansan National Park', 'Hike through mountain landscapes on Seoul\'s northern edge.', 'Bukhansan', 37.6581, 126.977, 'nature', ['nature', 'hiking', 'photography'], ['Adventure', 'Friends'], 'low', 240, 'morning'),
      this.a('gangnam', 'Gangnam', 'Explore Seoul\'s modern shopping, dining, and entertainment district.', 'Gangnam', 37.4979, 127.0276, 'shopping', ['shopping', 'food', 'nightlife'], ['Couple', 'Friends'], 'low', 150, 'afternoon'),
      this.a('han-river', 'Han River Park', 'Relax by the river and enjoy Seoul skyline views.', 'Yeouido', 37.528, 126.9326, 'nature', ['nature', 'views', 'romantic', 'photography'], ['Couple', 'Family'], 'free', 120, 'evening'),
      this.a('ddp', 'Dongdaemun Design Plaza', 'See Seoul\'s futuristic architecture and design district.', 'Dongdaemun', 37.5663, 127.0097, 'attraction', ['architecture', 'photography', 'shopping'], ['Couple', 'Friends'], 'free', 90, 'evening'),
      this.a('itaewon', 'Itaewon', 'Explore international food, cafes, and nightlife.', 'Itaewon', 37.5345, 126.9946, 'food', ['food', 'nightlife'], ['Couple', 'Friends'], 'medium', 120, 'evening'),
    ],
    barcelona: [
      this.a('sagrada', 'Sagrada Familia', 'Visit Gaudi\'s landmark basilica and its distinctive interior.', 'Eixample', 41.4036, 2.1744, 'culture', ['architecture', 'culture', 'photography'], ['Couple', 'Family'], 'high', 150, 'morning'),
      this.a('park-guell', 'Park Guell', 'Explore Gaudi\'s colorful park and panoramic city views.', 'Gracia', 41.4145, 2.1527, 'attraction', ['architecture', 'nature', 'photography'], ['Couple', 'Family'], 'medium', 150, 'morning'),
      this.a('gothic-quarter', 'Gothic Quarter', 'Walk through Barcelona\'s medieval streets and historic squares.', 'Gothic Quarter', 41.3826, 2.1769, 'culture', ['history', 'culture', 'photography'], ['Couple', 'Family'], 'free', 150, 'afternoon'),
      this.a('la-boqueria', 'La Boqueria Market', 'Sample Catalan and Spanish food in the famous market.', 'La Rambla', 41.3817, 2.1716, 'food', ['food', 'photography', 'culture'], ['Couple', 'Family'], 'low', 90, 'afternoon'),
      this.a('barceloneta', 'Barceloneta Beach', 'Walk the waterfront and relax by the Mediterranean.', 'Barceloneta', 41.3784, 2.1925, 'nature', ['nature', 'romantic', 'photography'], ['Couple', 'Family'], 'free', 150, 'afternoon'),
      this.a('montjuic', 'Montjuic', 'Explore hilltop gardens, views, and cultural landmarks.', 'Montjuic', 41.3641, 2.154, 'viewpoint', ['views', 'nature', 'culture', 'photography'], ['Couple', 'Family'], 'low', 180, 'afternoon'),
      this.a('gracia', 'Gracia', 'Explore local plazas, cafes, and independent shops.', 'Gracia', 41.4037, 2.1574, 'food', ['food', 'shopping', 'culture'], ['Couple', 'Friends'], 'low', 150, 'evening'),
      this.a('magic-fountain', 'Magic Fountain Area', 'See the Montjuic fountain area and evening city views.', 'Montjuic', 41.3712, 2.1519, 'viewpoint', ['views', 'photography', 'romantic'], ['Couple'], 'free', 90, 'evening'),
      this.a('gothic-dinner', 'Gothic Quarter Tapas Evening', 'Try tapas and local dishes in the historic center.', 'Gothic Quarter', 41.3826, 2.1769, 'food', ['food', 'nightlife'], ['Couple', 'Friends'], 'medium', 120, 'evening'),
      this.a('casa-batllo', 'Casa Batllo', 'Explore Gaudi\'s modernist architecture on Passeig de Gracia.', 'Eixample', 41.3916, 2.165, 'architecture', ['architecture', 'culture', 'photography'], ['Couple'], 'high', 120, 'afternoon'),
    ],
  };

  getCandidates(destination?: string): ActivityCandidate[] {
    if (!destination) return [];
    const key = destination.trim().toLowerCase();
    return (this.catalog[key] ?? []).map((item) => ({ ...item }));
  }

  private a(
    id: string,
    title: string,
    description: string,
    area: string,
    latitude: number,
    longitude: number,
    category: ActivityCandidate['category'],
    interests: string[],
    travelStyles: string[] | undefined,
    costTier: ActivityCandidate['costTier'],
    durationMinutes: number,
    timePreference: ActivityCandidate['timePreference'],
  ): ActivityCandidate {
    return { id, title, description, location: area, area, latitude, longitude, category, interests, travelStyles, costTier, durationMinutes, timePreference };
  }
}
