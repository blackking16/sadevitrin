import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { SetStateAction, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  NativeModules,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

declare const process: { env?: { EXPO_PUBLIC_API_URL?: string } };

type Role = 'customer' | 'seller';
type AuthMode = 'login' | 'register';
type Category = string;
type PetFilter = 'Tümü' | 'Kedi' | 'Köpek' | 'Kuş' | 'Balık' | 'Diğer';
type PetSubFilter = 'Tümü' | 'Kuru mama' | 'Yaş mama' | 'Ödül' | 'Kum' | 'Oyuncak' | 'Bakım' | 'Aksesuar' | 'Diğer';
type BabyFilter = 'Tümü' | 'Bebek bezi' | 'Islak mendil' | 'Mama' | 'Bakım' | 'Oyuncak' | 'Tekstil' | 'Diğer';
type SortFilter = 'Önerilen' | 'En düşük fiyat' | 'En hızlı kargo' | 'En yüksek stok';
type BarcodeScannerMode = 'customer' | 'seller';
type ExperienceMode = 'simple' | 'discovery';
type InfluencerSection = 'feed' | 'search' | 'explore' | 'cart' | 'manage';
type NotificationPreferences = {
  orderUpdates: boolean;
  reorderReminders: boolean;
  savedItemUpdates: boolean;
  searchDemandUpdates: boolean;
  newProducts: boolean;
  campaigns: boolean;
};
type ProductFilters = {
  category: string;
  subCategory: string;
  segment: string;
  sort: SortFilter;
};
type MarketplaceCategory = {
  name: string;
  subCategories: string[];
  segments: string[];
};
type AuctionStatus = 'requested' | 'open' | 'completed';
type Tab =
  | 'home'
  | 'saved'
  | 'cart'
  | 'orders'
  | 'seller'
  | 'sellerRequests'
  | 'sellerBids'
  | 'sellerProducts'
  | 'sellerVitrinProducts'
  | 'sellerRevenue'
  | 'notifications'
  | 'influencer'
  | 'profile';

type Profile = {
  id: string;
  role: Role;
  name: string;
  phone: string;
  email: string;
  password: string;
  address: string;
  city: string;
  district: string;
  companyName?: string;
  taxNumber?: string;
  sellerChannels?: ('simple' | 'vitrin')[];
  experienceMode: ExperienceMode;
  notificationPreferences: NotificationPreferences;
};

type ProfileUpdate = Pick<Profile, 'name' | 'phone' | 'email' | 'companyName' | 'taxNumber' | 'experienceMode' | 'notificationPreferences'>;

type Address = {
  id: string;
  profileId: string;
  title: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
};

type Auction = {
  id: string;
  category: Category;
  categoryName: string;
  subCategoryName?: string;
  segmentName?: string;
  petType?: PetFilter;
  petSubCategory?: PetSubFilter;
  babySubCategory?: BabyFilter;
  brand: string;
  model: string;
  packageInfo: string;
  barcode?: string;
  imageUrl: string;
  description: string;
  requestedBySellerId: string;
  requestedBySellerName: string;
  createdAt: string;
  endsAt: string;
  status: AuctionStatus;
};

type Bid = {
  id: string;
  auctionId: string;
  sellerId: string;
  sellerName: string;
  price: number;
  stock: number;
  deliveryDays: number;
  note: string;
};

type LiveProduct = {
  id: string;
  auctionId: string;
  category: Category;
  categoryName: string;
  subCategoryName?: string;
  segmentName?: string;
  petType?: PetFilter;
  petSubCategory?: PetSubFilter;
  babySubCategory?: BabyFilter;
  title: string;
  barcode?: string;
  imageUrl: string;
  description: string;
  sellerName: string;
  price: number;
  stock: number;
  deliveryDays: number;
  createdAt?: string;
};

type CartItem = {
  id: string;
  customerId: string;
  productId: string;
  quantity: number;
};

type Order = {
  id: string;
  apiOrderId?: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  title: string;
  imageUrl: string;
  sellerName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  addressId: string;
  address: string;
  paymentMethod: 'Kart' | 'Kapıda ödeme';
  paymentStatus: 'Ödendi' | 'Bekliyor';
  status: 'Hazırlanıyor' | 'Kargoda' | 'Teslim edildi';
  createdAt: string;
};

type Review = {
  id: string;
  orderId: string;
  productId: string;
  sellerName: string;
  customerId: string;
  customerName: string;
  productRating: number;
  sellerRating: number;
  comment: string;
  createdAt: string;
};

type SavedItem = {
  id: string;
  customerId: string;
  targetType: 'product' | 'order';
  targetId: string;
  createdAt: string;
};

type InfluencerProfile = {
  id: string;
  ownerId?: string;
  name: string;
  handle: string;
  specialty: string;
  bio: string;
  avatarUrl: string;
  heroUrl: string;
  followerCount: number;
  verified?: boolean;
};

type InfluencerPost = {
  id: string;
  influencerId: string;
  productId?: string;
  type: 'post' | 'video' | 'campaign';
  title: string;
  caption: string;
  mediaUrl: string;
  mediaUrls?: string[];
  productTitle: string;
  productQuery: string;
  productPrice: string;
  campaign?: string;
  tags: string[];
  productLinks?: InfluencerPostProductLink[];
  status?: 'PUBLISHED' | 'HIDDEN' | 'DELETED' | string;
  likeCount?: number;
  commentCount?: number;
  dailyScore?: number;
  weeklyScore?: number;
  monthlyScore?: number;
  aiCategory?: string;
  aiSubCategory?: string | null;
  aiTags?: string[];
  aiTargetAudience?: string[];
  aiSummary?: string;
  aiQualityScore?: number;
  aiCommercialIntent?: number;
  aiRisk?: 'low' | 'medium' | 'high' | string;
  aiAlgorithmScore?: number;
  aiAnalyzedAt?: string | null;
  aiModel?: string | null;
  comments?: InfluencerPostComment[];
};

type InfluencerPostProductLink = {
  productId: string;
  label: string;
  x: number;
  y: number;
};

type InfluencerPostComment = {
  id: string;
  postId: string;
  profileId: string;
  profileName?: string;
  text: string;
  createdAt: string;
};

type InfluencerProduct = {
  id: string;
  influencerId?: string | null;
  sellerId?: string | null;
  title: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  priceText: string;
  sellerName?: string;
  detailText?: string;
  sizes?: string[];
  colors?: string[];
  linkText?: string;
  stockText?: string;
  dailyHits: number;
  weeklyHits: number;
  monthlyHits: number;
};

type InfluencerCollection = {
  id: string;
  influencerId: string;
  title: string;
  text: string;
  productCount: number;
  mediaUrl: string;
};

type InfluencerFollow = {
  id: string;
  profileId: string;
  influencerId: string;
  createdAt: string;
};

type InfluencerCartItem = {
  id: string;
  profileId: string;
  productId: string;
  quantity: number;
};

type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

type LegalDocument = {
  title: string;
  body: string;
};

type SmartSearch = {
  normalized: string;
  tokens: string[];
  category?: Category;
  pet?: PetFilter;
  petSub?: PetSubFilter;
  baby?: BabyFilter;
};

type ReorderReminder = {
  product: LiveProduct;
  order: Order;
  estimatedRunOutAt: Date;
  remindAt: Date;
  daysLeft: number;
  reason: string;
};

type Database = {
  profiles: Profile[];
  addresses: Address[];
  auctions: Auction[];
  bids: Bid[];
  liveProducts: LiveProduct[];
  cartItems: CartItem[];
  orders: Order[];
  reviews: Review[];
  savedItems: SavedItem[];
  influencerFollows: InfluencerFollow[];
  influencerCartItems: InfluencerCartItem[];
  notifications: NotificationItem[];
};

const STORAGE_KEY = 'sadevitrin-local-db-v1';
const TOKEN_KEY = 'sadevitrin-api-token';

const getApiUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:4000';
  }

  if (process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  const host = scriptUrl?.match(/\/\/([^:/]+)/)?.[1];
  return `http://${host || '192.168.1.106'}:4000`;
};

const API_URL = getApiUrl();

const defaultNotificationPreferences: NotificationPreferences = {
  orderUpdates: true,
  reorderReminders: true,
  savedItemUpdates: true,
  searchDemandUpdates: true,
  newProducts: false,
  campaigns: false,
};

const normalizeProfile = (profile: any): Profile => ({
  ...profile,
  experienceMode: profile?.experienceMode === 'discovery' ? 'discovery' : 'simple',
  notificationPreferences: {
    ...defaultNotificationPreferences,
    ...(profile?.notificationPreferences ?? {}),
  },
});

const emptyDb: Database = {
  profiles: [],
  addresses: [],
  auctions: [],
  bids: [],
  liveProducts: [],
  cartItems: [],
  orders: [],
  reviews: [],
  savedItems: [],
  influencerFollows: [],
  influencerCartItems: [],
  notifications: [],
};

const normalizeDb = (value: Partial<Database> | null): Database => ({
  profiles: Array.isArray(value?.profiles) ? value.profiles.map(normalizeProfile) : [],
  addresses: Array.isArray(value?.addresses) ? value.addresses : [],
  auctions: Array.isArray(value?.auctions) ? value.auctions : [],
  bids: Array.isArray(value?.bids) ? value.bids : [],
  liveProducts: Array.isArray(value?.liveProducts) ? value.liveProducts : [],
  cartItems: Array.isArray(value?.cartItems) ? value.cartItems : [],
  orders: Array.isArray(value?.orders) ? value.orders : [],
  reviews: Array.isArray(value?.reviews) ? value.reviews : [],
  savedItems: Array.isArray(value?.savedItems) ? value.savedItems : [],
  influencerFollows: Array.isArray(value?.influencerFollows) ? value.influencerFollows : [],
  influencerCartItems: Array.isArray(value?.influencerCartItems) ? value.influencerCartItems : [],
  notifications: Array.isArray(value?.notifications) ? value.notifications : [],
});

const initialProductFilters: ProductFilters = {
  category: 'Tümü',
  subCategory: 'Tümü',
  segment: 'Tümü',
  sort: 'Önerilen',
};

const marketplaceCategories: MarketplaceCategory[] = [
  { name: 'Tümü', subCategories: [], segments: [] },
  { name: 'Pet', subCategories: ['Kuru mama', 'Yaş mama', 'Ödül', 'Kum', 'Oyuncak', 'Bakım', 'Aksesuar', 'Diğer'], segments: ['Kedi', 'Köpek', 'Kuş', 'Balık', 'Diğer'] },
  { name: 'Bebek', subCategories: ['Bebek bezi', 'Islak mendil', 'Mama', 'Bakım', 'Oyuncak', 'Tekstil', 'Diğer'], segments: [] },
  { name: 'Giyim', subCategories: ['Kadın', 'Erkek', 'Çocuk', 'Ayakkabı', 'Çanta', 'Aksesuar', 'Diğer'], segments: ['Günlük', 'Spor', 'Klasik', 'Outdoor'] },
  { name: 'Teknoloji', subCategories: ['Telefon', 'Bilgisayar', 'Kulaklık', 'Akıllı saat', 'Oyun', 'Aksesuar', 'Diğer'], segments: ['Apple', 'Android', 'Gaming', 'Ofis'] },
  { name: 'Ev & Yaşam', subCategories: ['Mutfak', 'Temizlik', 'Dekorasyon', 'Mobilya', 'Bahçe', 'Diğer'], segments: ['Küçük ev', 'Aile', 'Profesyonel'] },
  { name: 'Kozmetik', subCategories: ['Cilt bakım', 'Makyaj', 'Saç bakım', 'Parfüm', 'Kişisel bakım', 'Diğer'], segments: ['Kadın', 'Erkek', 'Unisex'] },
  { name: 'Takı & Aksesuar', subCategories: ['Kolye', 'Bileklik', 'Küpe', 'Saat', 'Gözlük', 'Diğer'], segments: ['Günlük', 'Özel gün', 'Minimal'] },
];

const petFilters: PetFilter[] = ['Tümü', 'Kedi', 'Köpek', 'Kuş', 'Balık', 'Diğer'];
const petSubFilters: PetSubFilter[] = ['Tümü', 'Kuru mama', 'Yaş mama', 'Ödül', 'Kum', 'Oyuncak', 'Bakım', 'Aksesuar', 'Diğer'];
const babyFilters: BabyFilter[] = ['Tümü', 'Bebek bezi', 'Islak mendil', 'Mama', 'Bakım', 'Oyuncak', 'Tekstil', 'Diğer'];
const sortFilters: SortFilter[] = ['Önerilen', 'En düşük fiyat', 'En hızlı kargo', 'En yüksek stok'];

const influencerProfiles: InfluencerProfile[] = [
  {
    id: 'style-aylin',
    name: 'Aylin Kombin',
    handle: '@aylinkombin',
    specialty: 'Giyim, çanta, takı',
    bio: 'Günlük kombinleri tek ürün standardına bağlayan sade alışveriş vitrini.',
    avatarUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=240&q=80',
    heroUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80',
    followerCount: 18400,
    verified: true,
  },
  {
    id: 'tekno-deniz',
    name: 'Tekno Deniz',
    handle: '@teknodeniz',
    specialty: 'Teknoloji, aksesuar',
    bio: 'Kısa video incelemeleri ve net satın alma listeleri.',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80',
    heroUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
    followerCount: 31200,
    verified: true,
  },
  {
    id: 'evde-seda',
    name: 'Evde Seda',
    handle: '@evdeseda',
    specialty: 'Ev, mutfak, düzen',
    bio: 'Mutfak ve ev düzeni için ticari koleksiyonlar.',
    avatarUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=240&q=80',
    heroUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80',
    followerCount: 12700,
  },
  {
    id: 'mini-rota',
    name: 'Mini Rota',
    handle: '@minirota',
    specialty: 'Bebek, aile, dışarı çıkış',
    bio: 'Ailelerin tekrar tekrar aldığı ürünleri tek listede toplar.',
    avatarUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=240&q=80',
    heroUrl: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=80',
    followerCount: 9600,
  },
];

const influencerPosts: InfluencerPost[] = [
  {
    id: 'post-canta',
    influencerId: 'style-aylin',
    productId: 'vproduct-canta',
    type: 'post',
    title: 'Hafta sonu siyah çanta seçimi',
    caption: 'Tek parça çanta, iki farklı kombin. Ürün etiketi satıştaki tek satıcıya gider.',
    mediaUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    productTitle: 'Minimal siyah çapraz çanta',
    productQuery: 'siyah çapraz çanta',
    productPrice: '1.249 TL',
    productLinks: [
      { productId: 'vproduct-canta', label: 'Çanta', x: 72, y: 24 },
      { productId: 'vproduct-ayakkabi', label: 'Ayakkabı', x: 66, y: 78 },
    ],
    likeCount: 1840,
    commentCount: 126,
    dailyScore: 620,
    weeklyScore: 2410,
    monthlyScore: 8700,
    campaign: 'Bugüne özel vitrin fiyatı',
    tags: ['Çanta', 'Kombin', 'Giyim'],
  },
  {
    id: 'post-kulaklik',
    influencerId: 'tekno-deniz',
    productId: 'vproduct-kulaklik',
    type: 'video',
    title: '1 dakikada kulaklık testi',
    caption: 'Ses, mikrofon ve şarjı tek videoda özetledim. Satışa açılırsa direkt ürüne gider.',
    mediaUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    productTitle: 'Kablosuz kulaklık Pro model',
    productQuery: 'kablosuz kulaklık pro',
    productPrice: '2.899 TL',
    productLinks: [{ productId: 'vproduct-kulaklik', label: 'Kulaklık', x: 54, y: 36 }],
    likeCount: 2670,
    commentCount: 211,
    dailyScore: 810,
    weeklyScore: 3520,
    monthlyScore: 11200,
    campaign: 'Video ürün etiketi',
    tags: ['Video', 'Teknoloji', 'Kulaklık'],
  },
  {
    id: 'post-mutfak',
    influencerId: 'evde-seda',
    productId: 'vproduct-mutfak',
    type: 'campaign',
    title: 'Düzenli mutfak başlangıç seti',
    caption: 'Saklama kabı, etiket ve raf düzeni için satın alma listesi.',
    mediaUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80',
    productTitle: 'Cam saklama kabı seti',
    productQuery: 'cam saklama kabı seti',
    productPrice: '799 TL',
    productLinks: [{ productId: 'vproduct-mutfak', label: 'Set', x: 62, y: 45 }],
    likeCount: 1320,
    commentCount: 88,
    dailyScore: 430,
    weeklyScore: 1890,
    monthlyScore: 6900,
    campaign: 'Koleksiyon indirimi',
    tags: ['Ev', 'Mutfak', 'Kampanya'],
  },
];

const influencerProducts: InfluencerProduct[] = [
  {
    id: 'vproduct-canta',
    influencerId: 'style-aylin',
    title: 'Minimal siyah çapraz çanta',
    description: 'Vitrin içeriğine bağlı ayrı ürün. Sade pazardaki ihale ürünleriyle karışmaz.',
    imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
    priceText: '1.249 TL',
    linkText: 'Vitrin ürünü',
    stockText: 'Sınırlı vitrin stoğu',
    dailyHits: 92,
    weeklyHits: 510,
    monthlyHits: 1810,
  },
  {
    id: 'vproduct-kulaklik',
    influencerId: 'tekno-deniz',
    title: 'Kablosuz kulaklık Pro model',
    description: 'Video incelemesine bağlanan teknoloji vitrin ürünü.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    priceText: '2.899 TL',
    linkText: 'Video etiketi',
    stockText: 'Kampanyalı liste',
    dailyHits: 138,
    weeklyHits: 870,
    monthlyHits: 2940,
  },
  {
    id: 'vproduct-mutfak',
    influencerId: 'evde-seda',
    title: 'Cam saklama kabı seti',
    description: 'Mutfak düzeni koleksiyonunda önerilen vitrin ürünü.',
    imageUrl: 'https://images.unsplash.com/photo-1584473457406-6240486418e9?auto=format&fit=crop&w=900&q=80',
    priceText: '799 TL',
    linkText: 'Koleksiyon ürünü',
    stockText: 'Çok görüntülenen',
    dailyHits: 64,
    weeklyHits: 430,
    monthlyHits: 1210,
  },
  {
    id: 'vproduct-bebek',
    influencerId: 'mini-rota',
    title: 'Bebek bakım çanta seti',
    description: 'Aile ve bebek içeriklerine bağlı ayrı vitrin ürünü.',
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80',
    priceText: '649 TL',
    linkText: 'İçerik etiketi',
    stockText: 'Haftanın listesi',
    dailyHits: 47,
    weeklyHits: 310,
    monthlyHits: 980,
  },
];

const influencerCollections: InfluencerCollection[] = [
  {
    id: 'collection-style',
    influencerId: 'style-aylin',
    title: 'Kapsül dolap',
    text: 'Az parçayla çok kombin isteyenler için ürün listesi.',
    productCount: 8,
    mediaUrl: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'collection-tech',
    influencerId: 'tekno-deniz',
    title: 'Masa üstü setup',
    text: 'Kulaklık, klavye, aydınlatma ve aksesuar seçimleri.',
    productCount: 6,
    mediaUrl: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'collection-home',
    influencerId: 'evde-seda',
    title: 'Mutfak düzeni',
    text: 'Her ürünün standart tanımı belli olan pratik liste.',
    productCount: 7,
    mediaUrl: 'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=900&q=80',
  },
];
const legalDocuments: LegalDocument[] = [
  {
    title: 'KVKK Aydınlatma Metni',
    body: `SadeVitrin; hesap oluşturma, kimliklendirme, satıcı başvurusu, ürün talebi, ihale, sipariş, ödeme, teslimat, iade, destek, şikayet ve güvenlik süreçlerinin yürütülmesi için kişisel verileri işler. İşlenen veriler ad soyad, telefon, e-posta, adres, firma adı, vergi/TCKN bilgisi, sipariş geçmişi, ödeme durumu, teslimat bilgisi, yorum, puanlama, işlem kayıtları ve cihaz/oturum güvenliği verilerinden oluşabilir.

Kişisel veriler; hizmetin sunulması, sözleşmenin kurulması ve ifası, siparişin teslim edilmesi, kullanıcı ve satıcı ile iletişim kurulması, yasal yükümlülüklerin yerine getirilmesi, dolandırıcılığın önlenmesi, platform güvenliğinin sağlanması ve destek taleplerinin sonuçlandırılması amaçlarıyla işlenir.

Veriler; ödeme kuruluşları, kargo firmaları, teknik altyapı sağlayıcıları, muhasebe ve hukuk danışmanları ile kanunen yetkili kamu kurumlarıyla, yalnızca gerekli olduğu ölçüde paylaşılabilir. Kullanıcılar KVKK kapsamındaki bilgi alma, düzeltme, silme, işlemeyi sınırlama, itiraz ve başvuru haklarını SadeVitrin iletişim kanalları üzerinden kullanabilir.`,
  },
  {
    title: 'Mesafeli Satış Sözleşmesi',
    body: `Bu sözleşme, kullanıcının SadeVitrin üzerinden satın aldığı ürünlere ilişkin satış koşullarını düzenler. Sipariş öncesinde ürün adı, ürün standardı, satıcı bilgisi, satış fiyatı, teslimat adresi, ödeme yöntemi, kargo/teslimat bilgisi ve sipariş numarası kullanıcıya gösterilir.

SadeVitrin pazaryeri altyapısı sağlar; ürünün satışından, faturalanmasından, paketlenmesinden, belirtilen standarda uygunluğundan ve teslimata hazırlanmasından ilgili satıcı sorumludur. Kullanıcı, sipariş oluşturarak ön bilgilendirme koşullarını ve bu sözleşme hükümlerini kabul eder.

Ödeme, gerçek ürün aşamasında lisanslı ödeme kuruluşları aracılığıyla alınır. Siparişin durumu uygulama içinde hazırlanıyor, kargoda ve teslim edildi adımlarıyla izlenir. Cayma, iade ve iptal hakları ilgili mevzuat, ürünün niteliği ve hijyen/ambalaj durumu dikkate alınarak değerlendirilir.`,
  },
  {
    title: 'İade, İptal ve Teslimat',
    body: `Kullanıcı, sipariş hazırlık aşamasına geçmeden önce iptal talebi oluşturabilir. Sipariş kargoya verildikten sonra iptal yerine iade süreci uygulanır. Teslim edilen ürünlerde iade talepleri ürünün türü, ambalaj durumu, hijyen koşulları ve ilgili mevzuat dikkate alınarak incelenir.

Pet maması, bebek ürünü, hijyen ürünü ve benzeri ürünlerde açılmış, kullanılmış, bozulabilir veya tekrar satışı sağlık açısından uygun olmayan ürünler için iade koşulları ayrıca değerlendirilir. Yanlış, eksik, hasarlı veya standart dışı gönderimlerde satıcıdan düzeltme, değişim veya iade süreci talep edilebilir.

Satıcı, sipariş durumunu güncel tutmakla yükümlüdür. Kullanıcı siparişini uygulama üzerinden takip eder. Teslimat adresinin doğru ve eksiksiz verilmesi kullanıcının sorumluluğundadır.`,
  },
  {
    title: 'Kullanıcı Sözleşmesi',
    body: `Kullanıcı, SadeVitrin hesabını doğru ve güncel bilgilerle oluşturmayı, teslimat adresi ve iletişim bilgilerinin doğruluğundan sorumlu olduğunu kabul eder. Hesap güvenliği, şifre gizliliği ve hesap üzerinden yapılan işlemler kullanıcının sorumluluğundadır.

SadeVitrin'de her ürün standardı için parametrelere göre seçilen en uygun satıcı modeli uygulanır. Rekabet kullanıcı ekranında kalabalık oluşturmaz; arka plandaki teklif ve ihale sürecinde devam eder. Kullanıcı ürün sayfasında aktif satıcıyı, ürün standardını, fiyatı, stok ve teslimat bilgilerini görerek sipariş oluşturur. Kullanıcı, yanıltıcı işlem yapmamayı, platformu kötüye kullanmamayı ve üçüncü kişilerin haklarını ihlal etmemeyi kabul eder.

Yorum ve puanlama yalnızca teslim edilen siparişlerden sonra yapılabilir. Değerlendirmeler gerçek deneyime dayanmalı; hakaret, yanıltıcı bilgi, reklam, kişisel veri veya hukuka aykırı içerik barındırmamalıdır.`,
  },
  {
    title: 'Satıcı Sözleşmesi',
    body: `Satıcı, SadeVitrin'e sunduğu ürün talebi, marka, model, paket standardı, görsel, açıklama, fiyat, stok, vergi ve firma bilgilerinin doğru, güncel ve hukuka uygun olduğunu kabul eder. Ürün talebi yönetici onayından sonra ihaleye açılır; ihale sonucunda kazanan teklif ürün satışına dönüşür.

Kazanan satıcı, yayındaki ürünü belirtilen fiyat, stok ve teslimat süresiyle satmakla yükümlüdür. Satıcı stok yetersizliği, geç kargo, yanlış ürün, eksik ürün, yanıltıcı görsel veya standart dışı gönderimden sorumludur. Sipariş durumları uygulamada zamanında güncellenmelidir.

SadeVitrin, platform güvenliği, kullanıcı memnuniyeti veya mevzuata aykırılık halinde satıcı hesabını incelemeye alabilir, askıya alabilir, ürünü yayından kaldırabilir veya ilgili süreçleri durdurabilir.`,
  },
];
const makeId = () => `${Date.now()}-${Math.round(Math.random() * 100000)}`;
const makeOrderNumber = () => `SP-${new Date().getFullYear()}-${Math.round(100000 + Math.random() * 899999)}`;
const money = (value: number) => `${value.toLocaleString('tr-TR')} TL`;
const parsePriceText = (value: string) => {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};
const compactNumber = (value?: number) => {
  const amount = value ?? 0;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1).replace('.', ',')}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1).replace('.', ',')}B`;
  return String(amount);
};
const engagementScore = (post: InfluencerPost, period: 'daily' | 'weekly' | 'monthly') => {
  const score = period === 'daily' ? post.dailyScore : period === 'weekly' ? post.weeklyScore : post.monthlyScore;
  const organicScore = (score ?? 0) + (post.likeCount ?? 0) + (post.commentCount ?? 0) * 4;
  const aiScore = (post.aiAlgorithmScore ?? 0) + (post.aiQualityScore ?? 0) * 1.6 + (post.aiCommercialIntent ?? 0) * 1.4;
  const riskPenalty = post.aiRisk === 'high' ? 180 : post.aiRisk === 'medium' ? 70 : 0;
  return Math.max(organicScore, aiScore - riskPenalty);
};
const sortPostsByEngagement = (posts: InfluencerPost[], period: 'daily' | 'weekly' | 'monthly') =>
  [...posts].sort((a, b) => engagementScore(b, period) - engagementScore(a, period));
const isFeedPost = (post: InfluencerPost) => post.status !== 'HIDDEN' && post.status !== 'DELETED';
const uniqueMediaList = (primary?: string, items?: string[]) =>
  [...(items ?? []), primary]
    .filter((item): item is string => Boolean(item?.trim()))
    .filter((item, index, all) => all.indexOf(item) === index);
const postMediaList = (post: InfluencerPost) => uniqueMediaList(post.mediaUrl, post.mediaUrls);
const productImageList = (product: InfluencerProduct) => uniqueMediaList(product.imageUrl, product.imageUrls);
const normalize = (value: string) => value.trim().toLowerCase();
const normalizeBarcodeInput = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
const productText = (product: LiveProduct) =>
  `${product.title} ${product.description} ${product.sellerName} ${product.categoryName ?? ''} ${product.subCategoryName ?? ''} ${product.segmentName ?? ''} ${product.petType ?? ''} ${product.petSubCategory ?? ''} ${product.babySubCategory ?? ''}`.toLowerCase();

const normalizeSmartText = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/(\d+)\s*(kilo|kilogram|kg|k\b)/g, '$1 kg')
    .replace(/(\d+)\s*(adet|li|lu|lü|lü paket)/g, '$1 adet')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const searchAliases: Record<string, string[]> = {
  kisir: ['sterilised', 'sterilized', 'sterilised', 'kisir'],
  steril: ['sterilised', 'sterilized', 'steril', 'kisir'],
  canin: ['canin', 'kanin'],
  kopek: ['kopek', 'dog', 'puppy'],
  kedi: ['kedi', 'cat', 'kitten'],
  yas: ['yas', 'wet', 'konserve', 'pouch'],
  islak: ['islak', 'wet', 'mendil'],
  bez: ['bez', 'diaper'],
};

function buildSmartSearch(query: string): SmartSearch {
  const normalized = normalizeSmartText(query);
  const tokens = normalized.split(' ').filter((token) => token.length > 1);
  const has = (words: string[]) => words.some((word) => normalized.includes(word));

  const smart: SmartSearch = { normalized, tokens };

  if (has(['kedi', 'cat', 'kitten'])) {
    smart.category = 'Pet';
    smart.pet = 'Kedi';
  } else if (has(['kopek', 'dog', 'puppy'])) {
    smart.category = 'Pet';
    smart.pet = 'Köpek';
  } else if (has(['kus', 'kanarya', 'muhabbet', 'papagan'])) {
    smart.category = 'Pet';
    smart.pet = 'Kuş';
  } else if (has(['balik', 'akvaryum', 'fish'])) {
    smart.category = 'Pet';
    smart.pet = 'Balık';
  }

  if (has(['bebek bezi', 'bez', 'diaper', 'numara'])) {
    smart.category = 'Bebek';
    smart.baby = 'Bebek bezi';
  } else if (has(['islak mendil', 'mendil', 'wipe'])) {
    smart.category = 'Bebek';
    smart.baby = 'Islak mendil';
  } else if (has(['devam sutu', 'bebek mama', 'formul'])) {
    smart.category = 'Bebek';
    smart.baby = 'Mama';
  }

  if (smart.category !== 'Bebek' && has(['kuru mama', 'dry food'])) {
    smart.category = 'Pet';
    smart.petSub = 'Kuru mama';
  } else if (smart.category !== 'Bebek' && has(['yas mama', 'wet food', 'konserve', 'pouch'])) {
    smart.category = 'Pet';
    smart.petSub = 'Yaş mama';
  } else if (smart.category !== 'Bebek' && has(['odul', 'treat', 'snack'])) {
    smart.category = 'Pet';
    smart.petSub = 'Ödül';
  } else if (smart.category !== 'Bebek' && has(['kum', 'bentonit', 'silika'])) {
    smart.category = 'Pet';
    smart.petSub = 'Kum';
  }

  return smart;
}

function smartTokenMatches(productTextValue: string, token: string) {
  if (productTextValue.includes(token)) {
    return true;
  }

  return (searchAliases[token] ?? []).some((alias) => productTextValue.includes(alias));
}

function smartSearchMatches(product: LiveProduct, smart: SmartSearch) {
  const text = normalizeSmartText(productText(product));
  const significantTokens = smart.tokens.filter((token) => !['urun', 'mama', 'adet', 'kg'].includes(token));

  if (smart.category && product.category !== smart.category) {
    return false;
  }

  if (smart.pet && product.petType && product.petType !== smart.pet) {
    return false;
  }

  if (smart.petSub && product.petSubCategory && product.petSubCategory !== smart.petSub) {
    return false;
  }

  if (smart.baby && product.babySubCategory && product.babySubCategory !== smart.baby) {
    return false;
  }

  if (significantTokens.length === 0) {
    return true;
  }

  return significantTokens.every((token) => smartTokenMatches(text, token));
}

function resolveImageUrl(url?: string | null) {
  if (!url) {
    return '';
  }

  const uploadPath = url.match(/\/uploads\/.+$/)?.[0];

  if (uploadPath) {
    return `${API_URL}${uploadPath}`;
  }

  return url;
}

async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string) {
  const response = await Promise.race([
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    }),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error(`API bağlantısı zaman aşımına uğradı: ${API_URL}`)), 8000),
    ),
  ]);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API hatası.' }));
    const issueText = Array.isArray(error.issues)
      ? error.issues.map((issue: any) => issue.message).filter(Boolean).join('\n')
      : '';
    throw new Error(issueText || error.message || 'API hatas?.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function uploadImage(base64: string, mimeType: string, fileName: string, token: string) {
  const safeMimeType = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'].includes(mimeType) ? mimeType : 'image/jpeg';

  return apiRequest<{ url: string }>('/uploads/images', {
    method: 'POST',
    body: JSON.stringify({
      base64,
      mimeType: safeMimeType,
      fileName,
    }),
  }, token);
}

async function imageUriToBase64(uri: string) {
  const blob = await fetch(uri).then((response) => response.blob());

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
    reader.onloadend = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.readAsDataURL(blob);
  });
}

const mapRole = (role: string): Role => (role === 'SELLER' ? 'seller' : 'customer');
const mapCategory = (category: string): Category => (category === 'BABY' ? 'Bebek' : 'Pet');
const toApiCategory = (category: Category) => (category === 'Bebek' ? 'BABY' : 'PET');
const legacyCategoryFromName = (categoryName: string) => normalizeSmartText(categoryName).includes('bebek') ? 'BABY' : 'PET';
const toApiPayment = (method: 'Kart' | 'Kapıda ödeme') => (method === 'Kart' ? 'CARD' : 'CASH_ON_DELIVERY');
const toApiPetType = (value: PetFilter) => {
  if (value === petFilters[1]) return 'CAT';
  if (value === petFilters[2]) return 'DOG';
  if (value === petFilters[3]) return 'BIRD';
  if (value === petFilters[4]) return 'FISH';
  if (value === petFilters[5]) return 'OTHER';
  return undefined;
};
const toApiPetSubCategory = (value: PetSubFilter) => {
  if (value === petSubFilters[1]) return 'DRY_FOOD';
  if (value === petSubFilters[2]) return 'WET_FOOD';
  if (value === petSubFilters[3]) return 'TREAT';
  if (value === petSubFilters[4]) return 'LITTER';
  if (value === petSubFilters[5]) return 'TOY';
  if (value === petSubFilters[6]) return 'CARE';
  if (value === petSubFilters[7]) return 'ACCESSORY';
  if (value === petSubFilters[8]) return 'OTHER';
  return undefined;
};
const toApiBabySubCategory = (value: BabyFilter) => {
  if (value === babyFilters[1]) return 'DIAPER';
  if (value === babyFilters[2]) return 'WIPES';
  if (value === babyFilters[3]) return 'FOOD';
  if (value === babyFilters[4]) return 'CARE';
  if (value === babyFilters[5]) return 'TOY';
  if (value === babyFilters[6]) return 'TEXTILE';
  if (value === babyFilters[7]) return 'OTHER';
  return undefined;
};
const fromApiPetType = (value?: string): PetFilter | undefined => {
  if (value === 'CAT') return petFilters[1];
  if (value === 'DOG') return petFilters[2];
  if (value === 'BIRD') return petFilters[3];
  if (value === 'FISH') return petFilters[4];
  if (value === 'OTHER') return petFilters[5];
  return undefined;
};
const fromApiPetSubCategory = (value?: string): PetSubFilter | undefined => {
  if (value === 'DRY_FOOD') return petSubFilters[1];
  if (value === 'WET_FOOD') return petSubFilters[2];
  if (value === 'TREAT') return petSubFilters[3];
  if (value === 'LITTER') return petSubFilters[4];
  if (value === 'TOY') return petSubFilters[5];
  if (value === 'CARE') return petSubFilters[6];
  if (value === 'ACCESSORY') return petSubFilters[7];
  if (value === 'OTHER') return petSubFilters[8];
  return undefined;
};
const fromApiBabySubCategory = (value?: string): BabyFilter | undefined => {
  if (value === 'DIAPER') return babyFilters[1];
  if (value === 'WIPES') return babyFilters[2];
  if (value === 'FOOD') return babyFilters[3];
  if (value === 'CARE') return babyFilters[4];
  if (value === 'TOY') return babyFilters[5];
  if (value === 'TEXTILE') return babyFilters[6];
  if (value === 'OTHER') return babyFilters[7];
  return undefined;
};
const fallbackSubCategory = (product: any) =>
  product.subCategoryName ??
  fromApiPetSubCategory(product.petSubCategory) ??
  fromApiBabySubCategory(product.babySubCategory);
const fallbackSegment = (product: any) => product.segmentName ?? fromApiPetType(product.petType);

function mapProfile(user: any): Profile {
  const firstAddress = user.addresses?.[0];

  return {
    id: user.id,
    role: mapRole(user.role),
    name: user.name,
    phone: user.phone,
    email: user.email,
    password: '',
    city: firstAddress?.city ?? '',
    district: firstAddress?.district ?? '',
    address: firstAddress?.detail ?? '',
    companyName: user.sellerProfile?.companyName,
    taxNumber: user.sellerProfile?.taxNumber,
    sellerChannels: mapRole(user.role) === 'seller'
      ? [
          ...(user.sellerProfile?.sellInSimple ?? true ? ['simple' as const] : []),
          ...(user.sellerProfile?.sellInVitrin ?? true ? ['vitrin' as const] : []),
        ]
      : undefined,
    experienceMode: user.experienceMode === 'DISCOVERY' ? 'discovery' : 'simple',
    notificationPreferences: {
      orderUpdates: user.notifyOrderUpdates ?? true,
      reorderReminders: user.notifyReorderReminders ?? true,
      savedItemUpdates: user.notifySavedItemUpdates ?? true,
      searchDemandUpdates: user.notifySearchDemandUpdates ?? true,
      newProducts: user.notifyNewProducts ?? false,
      campaigns: user.notifyCampaigns ?? false,
    },
  };
}

function mapAddress(address: any): Address {
  return {
    id: address.id,
    profileId: address.userId,
    title: address.title,
    city: address.city,
    district: address.district,
    detail: address.detail,
    isDefault: address.isDefault,
  };
}

function mapProduct(product: any): LiveProduct {
  return {
    id: product.id,
    auctionId: product.auctionId,
    category: mapCategory(product.category),
    categoryName: product.categoryName ?? mapCategory(product.category),
    subCategoryName: fallbackSubCategory(product),
    segmentName: fallbackSegment(product),
    petType: fromApiPetType(product.petType),
    petSubCategory: fromApiPetSubCategory(product.petSubCategory),
    babySubCategory: fromApiBabySubCategory(product.babySubCategory),
    title: product.title,
    barcode: product.barcode ?? undefined,
    imageUrl: resolveImageUrl(product.imageUrl),
    description: product.description,
    sellerName: product.seller?.sellerProfile?.companyName || product.seller?.name || 'Seçili satıcı',
    price: Number(product.price),
    stock: product.stock,
    deliveryDays: product.deliveryDays,
    createdAt: product.createdAt,
  };
}

function mapCartItem(item: any): CartItem {
  return {
    id: item.id,
    customerId: item.userId,
    productId: item.productId,
    quantity: item.quantity,
  };
}

function mapStatus(status: string): Order['status'] {
  if (status === 'SHIPPED') return 'Kargoda';
  if (status === 'DELIVERED') return 'Teslim edildi';
  return 'Hazırlanıyor';
}

function mapPaymentMethod(method: string): Order['paymentMethod'] {
  return method === 'CASH_ON_DELIVERY' ? 'Kapıda ödeme' : 'Kart';
}

function mapPaymentStatus(status: string): Order['paymentStatus'] {
  return status === 'PENDING' ? 'Bekliyor' : 'Ödendi';
}

function mapOrders(apiOrders: any[]): Order[] {
  return apiOrders.flatMap((order) =>
    (order.items ?? []).map((item: any) => ({
      id: `${order.id}-${item.id}`,
      apiOrderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.userId,
      customerName: '',
      productId: item.productId,
      title: item.title,
      imageUrl: resolveImageUrl(item.imageUrl),
      sellerName: item.product?.seller?.sellerProfile?.companyName || item.product?.seller?.name || '',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
      addressId: order.addressId,
      address: order.address
        ? `${order.address.title} · ${order.address.city} / ${order.address.district} · ${order.address.detail}`
        : 'Teslimat adresi',
      paymentMethod: mapPaymentMethod(order.paymentMethod),
      paymentStatus: mapPaymentStatus(order.paymentStatus),
      status: mapStatus(order.status),
      createdAt: order.createdAt,
    })),
  );
}

function mapSavedItems(apiItems: any[], customerId: string): SavedItem[] {
  return apiItems.flatMap((item) => {
    if (item.productId) {
      return [{
        id: item.id,
        customerId,
        targetType: 'product' as const,
        targetId: item.productId,
        createdAt: item.createdAt,
      }];
    }

    if (item.orderId) {
      return (item.order?.items ?? []).map((orderItem: any) => ({
        id: item.id,
        customerId,
        targetType: 'order' as const,
        targetId: `${item.orderId}-${orderItem.id}`,
        createdAt: item.createdAt,
      }));
    }

    return [];
  });
}

function mapNotifications(apiItems: any[]): NotificationItem[] {
  return apiItems.map((item) => ({
    id: item.id,
    userId: item.userId,
    type: item.type,
    title: item.title,
    body: item.body,
    isRead: Boolean(item.isRead),
    createdAt: item.createdAt,
  }));
}

function mapInfluencerFollows(apiItems: any[], profileId: string): InfluencerFollow[] {
  return apiItems.map((item) => ({
    id: item.id,
    profileId: item.profileId ?? profileId,
    influencerId: item.influencerId,
    createdAt: item.createdAt,
  }));
}

function mapInfluencerPost(item: InfluencerPost): InfluencerPost {
  const mediaUrl = resolveImageUrl(item.mediaUrl);

  return {
    ...item,
    mediaUrl,
    mediaUrls: uniqueMediaList(mediaUrl, item.mediaUrls?.map(resolveImageUrl)),
    aiTags: item.aiTags ?? [],
    aiTargetAudience: item.aiTargetAudience ?? [],
    comments: (item.comments ?? []).map((comment) => ({
      ...comment,
      createdAt: comment.createdAt,
    })),
  };
}

function mapInfluencerProduct(item: InfluencerProduct): InfluencerProduct {
  const imageUrl = resolveImageUrl(item.imageUrl);

  return {
    ...item,
    imageUrl,
    imageUrls: uniqueMediaList(imageUrl, item.imageUrls?.map(resolveImageUrl)),
  };
}

function matchesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(normalizeSmartText(word)));
}

function productMatchesFilters(product: LiveProduct, search: string, filters: ProductFilters) {
  const smart = buildSmartSearch(search);

  if (search.trim() && !smartSearchMatches(product, smart)) {
    return false;
  }

  if (filters.category !== 'Tümü' && product.categoryName !== filters.category) {
    return false;
  }

  if (filters.subCategory !== 'Tümü' && product.subCategoryName !== filters.subCategory) {
    return false;
  }

  if (filters.segment !== 'Tümü' && product.segmentName !== filters.segment) {
    return false;
  }

  return true;
}

function sortProducts(products: LiveProduct[], sort: SortFilter) {
  return [...products].sort((a, b) => {
    if (sort === 'En düşük fiyat') return a.price - b.price;
    if (sort === 'En hızlı kargo') return a.deliveryDays - b.deliveryDays;
    if (sort === 'En yüksek stok') return b.stock - a.stock;
    return 0;
  });
}

function estimateProductDurationDays(product: LiveProduct, quantity: number) {
  const text = normalizeSmartText(`${product.title} ${product.description}`);
  const kgMatch = text.match(/(\d+(?:[.,]\d+)?)\s*kg/);
  const adetMatch = text.match(/(\d{2,4})\s*adet/);
  const kg = kgMatch ? Number(kgMatch[1].replace(',', '.')) : 0;
  const adet = adetMatch ? Number(adetMatch[1]) : 0;

  if (product.categoryName === 'Pet') {
    if (product.subCategoryName === 'Kuru mama' || product.petSubCategory === 'Kuru mama') {
      return Math.max(21, Math.round((kg || 7) * 4.5 * quantity));
    }

    if (product.subCategoryName === 'Yaş mama' || product.petSubCategory === 'Yaş mama') {
      return Math.max(10, Math.round((adet || 12) * 1.2 * quantity));
    }

    return 30 * quantity;
  }

  if (product.subCategoryName === 'Bebek bezi' || product.babySubCategory === 'Bebek bezi') {
    return Math.max(10, Math.round((adet || 90) / 5.5) * quantity);
  }

  if (product.subCategoryName === 'Islak mendil' || product.babySubCategory === 'Islak mendil') {
    return Math.max(14, Math.round((adet || 360) / 18) * quantity);
  }

  return 30 * quantity;
}

function getReorderReminders(products: LiveProduct[], orders: Order[]) {
  const latestByProduct = new Map<string, Order>();

  orders.forEach((order) => {
    const current = latestByProduct.get(order.productId);
    if (!current || new Date(order.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      latestByProduct.set(order.productId, order);
    }
  });

  return [...latestByProduct.values()]
    .map((order): ReorderReminder | null => {
      const product = products.find((item) => item.id === order.productId);
      if (!product) {
        return null;
      }

      const createdAt = new Date(order.createdAt);
      const durationDays = estimateProductDurationDays(product, order.quantity);
      const estimatedRunOutAt = new Date(createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const remindAt = new Date(estimatedRunOutAt.getTime() - 7 * 24 * 60 * 60 * 1000);
      const now = Date.now();

      if (now < remindAt.getTime() || now > estimatedRunOutAt.getTime() + 14 * 24 * 60 * 60 * 1000) {
        return null;
      }

      return {
        product,
        order,
        estimatedRunOutAt,
        remindAt,
        daysLeft: Math.max(0, Math.ceil((estimatedRunOutAt.getTime() - now) / (24 * 60 * 60 * 1000))),
        reason: `${durationDays} günlük tahmini kullanıma göre`,
      };
    })
    .filter((item): item is ReorderReminder => Boolean(item))
    .slice(0, 3);
}

function getInferredRecommendations(products: LiveProduct[], orders: Order[], reminders: ReorderReminder[]) {
  if (orders.length === 0) {
    return [];
  }

  const reminderProductIds = new Set(reminders.map((item) => item.product.id));
  const orderedProductIds = new Set(orders.map((order) => order.productId));
  const purchasedProducts = orders
    .map((order) => products.find((product) => product.id === order.productId))
    .filter((product): product is LiveProduct => Boolean(product));

  return products
    .filter((product) => !reminderProductIds.has(product.id) && !orderedProductIds.has(product.id))
    .map((product) => {
      const score = purchasedProducts.reduce((sum, purchased) => {
        let next = sum;
        if (product.categoryName === purchased.categoryName) next += 2;
        if (product.subCategoryName && product.subCategoryName === purchased.subCategoryName) next += 4;
        if (product.segmentName && product.segmentName === purchased.segmentName) next += 3;
        if (product.petType && product.petType === purchased.petType) next += 3;
        if (product.petSubCategory && product.petSubCategory === purchased.petSubCategory) next += 4;
        if (product.babySubCategory && product.babySubCategory === purchased.babySubCategory) next += 4;
        return next;
      }, 0);

      return { product, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, 4)
    .map((item) => item.product);
}

function getNewlyOpenedProducts(products: LiveProduct[], orders: Order[]) {
  const orderedProductIds = new Set(orders.map((order) => order.productId));

  return [...products]
    .filter((product) => !orderedProductIds.has(product.id))
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 4);
}

export default function App() {
  const [db, setDb] = useState<Database>(emptyDb);
  const [loaded, setLoaded] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [accountType, setAccountType] = useState<Role>('customer');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [influencerSection, setInfluencerSection] = useState<InfluencerSection>('feed');
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null);
  const [selectedInfluencerProductId, setSelectedInfluencerProductId] = useState<string | null>(null);
  const [influencerSearch, setInfluencerSearch] = useState('');
  const [creatorProfiles, setCreatorProfiles] = useState<InfluencerProfile[]>([]);
  const [creatorPosts, setCreatorPosts] = useState<InfluencerPost[]>([]);
  const [creatorProducts, setCreatorProducts] = useState<InfluencerProduct[]>([]);
  const [creatorCollections, setCreatorCollections] = useState<InfluencerCollection[]>([]);
  const [influencerLikedPostIds, setInfluencerLikedPostIds] = useState<string[]>([]);
  const [categoryCatalog, setCategoryCatalog] = useState<MarketplaceCategory[]>(marketplaceCategories);
  const [search, setSearch] = useState('');
  const [productFilters, setProductFilters] = useState<ProductFilters>(initialProductFilters);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [barcodeScannerMode, setBarcodeScannerMode] = useState<BarcodeScannerMode | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeDemandNote, setBarcodeDemandNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Kart' | 'Kapıda ödeme'>('Kart');

  const [register, setRegister] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    address: '',
    city: '',
    district: '',
    companyName: '',
    taxNumber: '',
    kvkkAccepted: false,
    userAgreementAccepted: false,
    sellerAgreementAccepted: false,
    sellerSimpleChannel: true,
    sellerVitrinChannel: true,
  });

  const [sellerVitrinDraft, setSellerVitrinDraft] = useState({
    title: '',
    description: '',
    imageUrl: '',
    imageUrls: [] as string[],
    priceText: '',
    detailText: '',
    sizesText: '',
    colorsText: '',
    linkText: '',
    stockText: '',
  });

  const [request, setRequest] = useState({
    category: 'Pet' as Category,
    categoryName: 'Pet',
    subCategoryName: 'Kuru mama',
    segmentName: 'Kedi',
    petType: 'Kedi' as PetFilter,
    petSubCategory: 'Kuru mama' as PetSubFilter,
    babySubCategory: 'Bebek bezi' as BabyFilter,
    brand: '',
    model: '',
    packageInfo: '',
    barcode: '',
    imageUrl: '',
    imageBase64: '',
    imageMimeType: 'image/jpeg',
    imageName: 'urun.jpg',
    description: '',
  });

  const [bid, setBid] = useState({
    auctionId: '',
    price: '',
    stock: '',
    deliveryDays: '',
    note: '',
  });

  const [newAddress, setNewAddress] = useState({
    title: '',
    city: '',
    district: '',
    detail: '',
  });

  useEffect(() => {
    Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(TOKEN_KEY)])
      .then(async ([value, token]) => {
        apiRequest<MarketplaceCategory[]>('/categories')
          .then((items) => setCategoryCatalog(items.length ? items : marketplaceCategories))
          .catch(() => setCategoryCatalog(marketplaceCategories));

        if (value) {
          setDb(normalizeDb(JSON.parse(value)));
        } else {
          setDb(normalizeDb(null));
        }

        if (token) {
          try {
            setApiToken(token);
            await loadRemoteData(token);
          } catch {
            await AsyncStorage.removeItem(TOKEN_KEY);
            setApiToken('');
            await loadProducts();
          }
        } else {
          await loadProducts();
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    }
  }, [db, loaded]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const sellerTabs: Tab[] = ['seller', 'sellerRequests', 'sellerBids', 'sellerProducts', 'influencer', 'sellerVitrinProducts', 'sellerRevenue', 'orders', 'notifications', 'profile'];
    const customerTabs: Tab[] = ['home', 'saved', 'cart', 'orders', 'notifications', 'influencer', 'profile'];

    if (profile.role === 'seller' && !sellerTabs.includes(tab)) {
      setTab('seller');
    }

    if (profile.role === 'customer' && !customerTabs.includes(tab)) {
      setTab('home');
    }
  }, [profile, tab]);

  const openAuctions = db.auctions.filter((auction) => auction.status === 'open');
  const selectedProduct = db.liveProducts.find((product) => product.id === selectedProductId);
  const currentCartItems = profile
    ? (db.cartItems ?? []).filter((item) => item.customerId === profile.id)
    : [];
  const cartItemCount = currentCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const currentOrders = profile
    ? profile.role === 'seller'
      ? (db.orders ?? []).filter((order) => order.sellerName === (profile.companyName || profile.name))
      : (db.orders ?? []).filter((order) => order.customerId === profile.id)
    : [];
  const currentAddresses = profile
    ? (db.addresses ?? []).filter((address) => address.profileId === profile.id)
    : [];
  const checkoutAddress =
    currentAddresses.find((address) => address.id === selectedAddressId) ??
    currentAddresses.find((address) => address.isDefault) ??
    currentAddresses[0];
  const cartLines = currentCartItems
    .map((item) => ({
      item,
      product: db.liveProducts.find((product) => product.id === item.productId),
    }))
    .filter((line): line is { item: CartItem; product: LiveProduct } => Boolean(line.product));
  const cartTotal = cartLines.reduce((sum, line) => sum + line.product.price * line.item.quantity, 0);
  const sellerName = profile ? profile.companyName || profile.name : '';
  const sellerRequests = profile
    ? db.auctions.filter((auction) => auction.requestedBySellerId === profile.id)
    : [];
  const sellerBids = profile
    ? db.bids.filter((item) => item.sellerId === profile.id)
    : [];
  const sellerProducts = profile
    ? db.liveProducts.filter((product) => product.sellerName === sellerName)
    : [];
  const sellerVitrinProducts = profile?.role === 'seller'
    ? creatorProducts.filter((product) => product.sellerId === profile.id || product.sellerName === sellerName)
    : [];
  const reviews = db.reviews ?? [];
  const savedItems = profile
    ? (db.savedItems ?? []).filter((item) => item.customerId === profile.id)
    : [];
  const followedInfluencerIds = profile
    ? (db.influencerFollows ?? [])
        .filter((item) => item.profileId === profile.id)
        .map((item) => item.influencerId)
    : [];
  const selectedInfluencerProduct = selectedInfluencerProductId
    ? creatorProducts.find((product) => product.id === selectedInfluencerProductId)
    : undefined;
  const ownInfluencerProfile = profile?.role === 'customer'
    ? creatorProfiles.find((item) => item.ownerId === profile.id)
    : undefined;
  const influencerCartLines = profile
    ? (db.influencerCartItems ?? [])
        .filter((item) => item.profileId === profile.id)
        .reduce<{ item: InfluencerCartItem; product: InfluencerProduct; creator?: InfluencerProfile }[]>((lines, item) => {
          const product = creatorProducts.find((candidate) => candidate.id === item.productId);
          if (!product) {
            return lines;
          }

          lines.push({
            item,
            product,
            creator: creatorProfiles.find((creator) => creator.id === product.influencerId),
          });
          return lines;
        }, [])
    : [];
  const influencerCartCount = influencerCartLines.reduce((sum, line) => sum + line.item.quantity, 0);
  const currentNotifications = profile
    ? (db.notifications ?? []).filter((item) => item.userId === profile.id)
    : [];
  const unreadNotificationCount = currentNotifications.filter((item) => !item.isRead).length;
  const notificationPreferences = profile?.notificationPreferences ?? defaultNotificationPreferences;
  const isDiscoveryMode = profile?.role === 'customer' && profile.experienceMode === 'discovery';
  const filteredProducts = sortProducts(
    db.liveProducts.filter((product) => productMatchesFilters(product, search, productFilters)),
    productFilters.sort,
  );
  const reorderReminders = profile?.role === 'customer' && notificationPreferences.reorderReminders
    ? getReorderReminders(db.liveProducts, currentOrders)
    : [];
  const inferredRecommendations = isDiscoveryMode
    ? getInferredRecommendations(db.liveProducts, currentOrders, reorderReminders)
    : [];
  const newlyOpenedProducts = isDiscoveryMode
    ? getNewlyOpenedProducts(db.liveProducts, currentOrders)
    : [];

  const auctionRows = useMemo(() => {
    return openAuctions.map((auction) => ({
      auction,
      bids: db.bids.filter((item) => item.auctionId === auction.id),
    }));
  }, [db.bids, openAuctions]);

  const updateRegister = (key: keyof typeof register, value: string | boolean) => {
    setRegister((current) => ({ ...current, [key]: value }));
  };

  const updateRequest = (key: keyof typeof request, value: string) => {
    setRequest((current) => {
      if (key === 'categoryName') {
        const nextCategory = categoryCatalog.find((item) => item.name === value);
        return {
          ...current,
          category: value,
          categoryName: value,
          subCategoryName: nextCategory?.subCategories[0] ?? 'Diğer',
          segmentName: nextCategory?.segments[0] ?? '',
        };
      }

      return { ...current, [key]: value };
    });
  };

  const updateBid = (key: keyof typeof bid, value: string) => {
    setBid((current) => ({ ...current, [key]: value }));
  };

  const logout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setApiToken('');
    setProfile(null);
    setSelectedProductId(null);
    setTab('home');
  };

  const updateProfile = async (values: ProfileUpdate) => {
    if (!profile) {
      return;
    }

    if (!values.name.trim() || !values.phone.trim() || !values.email.trim()) {
      Alert.alert('Eksik bilgi', 'Ad soyad, telefon ve e-posta boş bırakılamaz.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      Alert.alert('E-posta hatalı', 'Geçerli bir e-posta adresi yazmalısın.');
      return;
    }

    if (values.phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Telefon hatalı', 'Telefon numarasını en az 10 haneli yazmalısın.');
      return;
    }

    if (apiToken) {
      try {
        await apiRequest('/me', {
          method: 'PATCH',
          body: JSON.stringify({
            name: values.name.trim(),
            phone: values.phone.trim(),
            email: values.email.trim(),
            experienceMode: values.experienceMode === 'discovery' ? 'DISCOVERY' : 'SIMPLE',
            notificationPreferences: values.notificationPreferences,
            seller: profile.role === 'seller'
              ? {
                  companyName: values.companyName?.trim() || profile.companyName,
                  taxNumber: values.taxNumber?.trim() || profile.taxNumber,
                }
              : undefined,
          }),
        }, apiToken);
        await loadRemoteData(apiToken);
        Alert.alert('Profil güncellendi', 'Bilgilerin kaydedildi.');
        return;
      } catch (error) {
        Alert.alert('Profil güncellenemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    const nextProfile: Profile = {
      ...profile,
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      companyName: profile.role === 'seller' ? values.companyName?.trim() : profile.companyName,
      taxNumber: profile.role === 'seller' ? values.taxNumber?.trim() : profile.taxNumber,
      experienceMode: values.experienceMode,
      notificationPreferences: values.notificationPreferences,
    };

    setProfile(nextProfile);
    setDb((current) => ({
      ...current,
      profiles: current.profiles.map((item) => (item.id === profile.id ? nextProfile : item)),
    }));
    Alert.alert('Profil güncellendi', 'Bilgilerin kaydedildi.');
  };

  const addLocalNotification = (title: string, body: string, type = 'LOCAL') => {
    if (!profile) {
      return;
    }

    setDb((current) => ({
      ...current,
      notifications: [
        {
          id: makeId(),
          userId: profile.id,
          type,
          title,
          body,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...(current.notifications ?? []),
      ],
    }));
  };

  const markNotificationsRead = () => {
    if (!profile) {
      return;
    }

    if (apiToken) {
      apiRequest('/notifications/read', { method: 'PATCH' }, apiToken)
        .then(() => loadRemoteData(apiToken))
        .catch((error) => Alert.alert('Bildirimler güncellenemedi', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    setDb((current) => ({
      ...current,
      notifications: (current.notifications ?? []).map((item) =>
        item.userId === profile.id ? { ...item, isRead: true } : item,
      ),
    }));
  };

  const createSearchDemand = async () => {
    if (!profile || profile.role !== 'customer') {
      Alert.alert('Kullanıcı hesabı gerekli', 'Aradığın ürün için talep bırakmak üzere kullanıcı hesabıyla giriş yapmalısın.');
      return;
    }

    if (!search.trim()) {
      return;
    }

    const smart = buildSmartSearch(search);

    if (apiToken) {
      try {
        await apiRequest('/search-demands', {
          method: 'POST',
          body: JSON.stringify({
            query: search.trim(),
            resultCount: filteredProducts.length,
            category: smart.category ? toApiCategory(smart.category) : undefined,
            categoryName: productFilters.category !== 'Tümü' ? productFilters.category : smart.category,
            subCategoryName: productFilters.subCategory !== 'Tümü' ? productFilters.subCategory : smart.petSub ?? smart.baby,
            segmentName: productFilters.segment !== 'Tümü' ? productFilters.segment : smart.pet,
            petType: smart.pet ? toApiPetType(smart.pet) : undefined,
            petSubCategory: smart.petSub ? toApiPetSubCategory(smart.petSub) : undefined,
            babySubCategory: smart.baby ? toApiBabySubCategory(smart.baby) : undefined,
          }),
        }, apiToken);
        await loadRemoteData(apiToken);
        Alert.alert('Talep kaydedildi', 'Bu ürün satışa açılırsa haber verebilmek için talebini kaydettik.');
        return;
      } catch (error) {
        Alert.alert('Talep kaydedilemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    addLocalNotification('Aradığın ürün takipte', `"${search.trim()}" satışa açılırsa haber verebilmek için talebini kaydettik.`, 'SEARCH_DEMAND_CREATED');
    Alert.alert('Talep kaydedildi', 'Bu ürün satışa açılırsa haber verebilmek için talebini kaydettik.');
  };

  const startBarcodeScanner = async (mode: BarcodeScannerMode) => {
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();

    if (!permission?.granted) {
      Alert.alert('Kamera izni gerekli', 'Barkod okutmak için kamera izni vermelisin. İstersen barkodu elle de yazabilirsin.');
      return;
    }

    setBarcodeScannerMode(mode);
  };

  const lookupBarcode = async (rawValue = barcodeInput) => {
    if (!profile || profile.role !== 'customer') {
      Alert.alert('Kullanıcı hesabı gerekli', 'Barkodla ürün bulmak için kullanıcı hesabıyla giriş yapmalısın.');
      return;
    }

    const code = normalizeBarcodeInput(rawValue);
    setBarcodeInput(code);

    if (code.length < 5) {
      Alert.alert('Barkod eksik', 'Barkod en az 5 karakter olmalı.');
      return;
    }

    const localProduct = db.liveProducts.find((product) => normalizeBarcodeInput(product.barcode ?? '') === code);

    if (localProduct && !apiToken) {
      setSelectedProductId(localProduct.id);
      setTab('home');
      setBarcodeDemandNote('');
      return;
    }

    if (!apiToken) {
      Alert.alert('Barkod hafızada yok', 'Ürünün adını veya kısa bilgisini yazıp barkod talebi bırakabilirsin.');
      return;
    }

    try {
      const result = await apiRequest<any>(`/barcodes/${encodeURIComponent(code)}`, {}, apiToken);

      if (result.status === 'FOUND' && result.product) {
        const mappedProduct = mapProduct(result.product);
        setDb((current) => ({
          ...current,
          liveProducts: [
            mappedProduct,
            ...current.liveProducts.filter((product) => product.id !== mappedProduct.id),
          ],
        }));
        setSelectedProductId(mappedProduct.id);
        setTab('home');
        setBarcodeDemandNote('');
        Alert.alert('Ürün bulundu', 'Barkod kayıtlı ürünle eşleşti.');
        return;
      }

      if (result.status === 'KNOWN_NOT_ACTIVE' && result.request) {
        const requestNote = [result.request.brand, result.request.model, result.request.packageInfo].filter(Boolean).join(' ');
        setBarcodeDemandNote(requestNote);
        Alert.alert('Ürün hafızada', 'Bu barkod daha önce tanınmış ama ürün şu an satışta değil. Talep bırakırsan yönetici ekranında takip edilir.');
        return;
      }

      Alert.alert('Barkod hafızada yok', 'Ürünün adını, markasını veya paket bilgisini yazıp talep bırakabilirsin.');
    } catch (error) {
      Alert.alert('Barkod aranamadı', error instanceof Error ? error.message : 'API hatası.');
    }
  };

  const createBarcodeDemand = async () => {
    if (!profile || profile.role !== 'customer') {
      Alert.alert('Kullanıcı hesabı gerekli', 'Barkod talebi bırakmak için kullanıcı hesabıyla giriş yapmalısın.');
      return;
    }

    const code = normalizeBarcodeInput(barcodeInput);

    if (code.length < 5) {
      Alert.alert('Barkod eksik', 'Barkodu okutmalı veya elle yazmalısın.');
      return;
    }

    if (!barcodeDemandNote.trim()) {
      Alert.alert('Kısa bilgi gerekli', 'Barkod sistemde yoksa hangi ürüne ait olduğunu anlamamız için marka, ürün adı veya paket bilgisini yaz.');
      return;
    }

    if (apiToken) {
      try {
        await apiRequest('/barcode-demands', {
          method: 'POST',
          body: JSON.stringify({
            barcode: code,
            note: barcodeDemandNote.trim(),
          }),
        }, apiToken);
        await loadRemoteData(apiToken);
        setBarcodeInput('');
        setBarcodeDemandNote('');
        Alert.alert('Barkod talebi alındı', 'Yönetici panelinde bu barkod incelenecek. Ürün açıldığında sistem hafızası güçlenmiş olacak.');
        return;
      } catch (error) {
        Alert.alert('Talep kaydedilemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    addLocalNotification(
      'Barkod talebin alındı',
      `${code} barkodu için "${barcodeDemandNote.trim()}" notunu kaydettik.`,
      'BARCODE_DEMAND_CREATED',
    );
    setBarcodeInput('');
    setBarcodeDemandNote('');
    Alert.alert('Barkod talebi alındı', 'Bu demo kaydı yerel olarak tutuldu.');
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    const code = normalizeBarcodeInput(data);
    const mode = barcodeScannerMode;

    if (!mode || code.length < 5) {
      return;
    }

    setBarcodeScannerMode(null);

    if (mode === 'seller') {
      updateRequest('barcode', code);
      Alert.alert('Barkod eklendi', `${code} ürün talebine işlendi.`);
      return;
    }

    setBarcodeInput(code);
    lookupBarcode(code);
  };

  const loadProducts = async () => {
    const products = await apiRequest<any[]>('/products');
    setDb((current) => ({
      ...current,
      liveProducts: products.map(mapProduct),
      reviews: products.flatMap((product) =>
        (product.reviews ?? []).map((review: any) => ({
          id: review.id,
          orderId: review.orderId,
          productId: review.productId,
          sellerName: mapProduct(product).sellerName,
          customerId: review.userId,
          customerName: 'Kullanıcı',
          productRating: review.productRating,
          sellerRating: review.sellerRating,
          comment: review.comment,
          createdAt: review.createdAt,
        })),
      ),
    }));
  };

  const loadRemoteData = async (token = apiToken, userOverride?: any) => {
    const user = userOverride ?? await apiRequest<any>('/me', {}, token);
    if (user.role === 'ADMIN') {
      throw new Error('Yönetici hesapları mobil uygulamaya giriş yapamaz.');
    }

    const [products, addresses, orders, notifications] = await Promise.all([
      apiRequest<any[]>('/products', {}, token),
      apiRequest<any[]>('/addresses', {}, token),
      apiRequest<any[]>('/orders', {}, token),
      apiRequest<any[]>('/notifications', {}, token),
    ]);
    const cart = user.role === 'CUSTOMER' ? await apiRequest<any[]>('/cart', {}, token) : [];
    const savedItemsApi = user.role === 'CUSTOMER' ? await apiRequest<any[]>('/saved-items', {}, token) : [];
    const influencerApi = await apiRequest<{ profiles: InfluencerProfile[]; posts: InfluencerPost[]; products: InfluencerProduct[]; collections: InfluencerCollection[]; follows: any[]; likedPostIds?: string[] }>('/influencers', {}, token)
      .catch(() => ({ profiles: [], posts: [], products: [], collections: [], follows: [], likedPostIds: [] }));
    const ownInfluencerPostsApi = user.role === 'CUSTOMER' || user.role === 'SELLER'
      ? await apiRequest<InfluencerPost[]>('/influencer-posts/me', {}, token).catch(() => [])
      : [];
    const sellerRequestsApi = user.role === 'SELLER' ? await apiRequest<any[]>('/seller/product-requests', {}, token) : [];
    const sellerBidsApi = user.role === 'SELLER' ? await apiRequest<any[]>('/seller/bids', {}, token) : [];
    const openAuctionsApi = user.role === 'SELLER' ? await apiRequest<any[]>('/auctions/open', {}, token) : [];
    const sellerProductsApi = user.role === 'SELLER' ? await apiRequest<any[]>('/seller/products', {}, token) : [];

    const mappedProducts = products.map(mapProduct);
    const mappedSellerProducts = sellerProductsApi.map(mapProduct);

    setProfile(mapProfile(user));
    setCreatorProfiles(influencerApi.profiles);
    setCreatorPosts([
      ...influencerApi.posts,
      ...ownInfluencerPostsApi.filter((post) => !influencerApi.posts.some((publicPost) => publicPost.id === post.id)),
    ].map(mapInfluencerPost));
    setCreatorProducts(influencerApi.products.map(mapInfluencerProduct));
    setCreatorCollections(influencerApi.collections);
    setInfluencerLikedPostIds(influencerApi.likedPostIds ?? []);
    setDb((current) => ({
      ...current,
      profiles: [mapProfile(user)],
      addresses: addresses.map(mapAddress),
      liveProducts: [...mappedProducts, ...mappedSellerProducts.filter((item) => !mappedProducts.some((product) => product.id === item.id))],
      cartItems: cart.map(mapCartItem),
      orders: mapOrders(orders),
      auctions: [
        ...sellerRequestsApi.map((item) => ({
          id: item.auction?.id ?? item.id,
          category: mapCategory(item.category),
          categoryName: item.categoryName ?? mapCategory(item.category),
          subCategoryName: fallbackSubCategory(item),
          segmentName: fallbackSegment(item),
          petType: fromApiPetType(item.petType),
          petSubCategory: fromApiPetSubCategory(item.petSubCategory),
          babySubCategory: fromApiBabySubCategory(item.babySubCategory),
          brand: item.brand,
          model: item.model,
          packageInfo: item.packageInfo,
          barcode: item.barcode ?? undefined,
          imageUrl: resolveImageUrl(item.imageUrl),
          description: item.description,
          requestedBySellerId: item.sellerId,
          requestedBySellerName: user.sellerProfile?.companyName || user.name,
          createdAt: item.createdAt,
          endsAt: item.auction?.endsAt ?? item.createdAt,
          status: (item.auction
            ? (item.auction.status === 'COMPLETED' ? 'completed' : 'open')
            : 'requested') as AuctionStatus,
        })),
        ...openAuctionsApi.map((item) => ({
          id: item.id,
          category: mapCategory(item.request.category),
          categoryName: item.request.categoryName ?? mapCategory(item.request.category),
          subCategoryName: fallbackSubCategory(item.request),
          segmentName: fallbackSegment(item.request),
          petType: fromApiPetType(item.request.petType),
          petSubCategory: fromApiPetSubCategory(item.request.petSubCategory),
          babySubCategory: fromApiBabySubCategory(item.request.babySubCategory),
          brand: item.request.brand,
          model: item.request.model,
          packageInfo: item.request.packageInfo,
          barcode: item.request.barcode ?? undefined,
          imageUrl: resolveImageUrl(item.request.imageUrl),
          description: item.request.description,
          requestedBySellerId: item.request.sellerId,
          requestedBySellerName: 'Satıcı',
          createdAt: item.createdAt,
          endsAt: item.endsAt,
          status: 'open' as AuctionStatus,
        })),
      ],
      bids: sellerBidsApi.map((item) => ({
        id: item.id,
        auctionId: item.auctionId,
        sellerId: item.sellerId,
        sellerName: user.sellerProfile?.companyName || user.name,
        price: Number(item.price),
        stock: item.stock,
        deliveryDays: item.deliveryDays,
        note: item.note ?? '',
      })),
      reviews: products.flatMap((product) =>
        (product.reviews ?? []).map((review: any) => ({
          id: review.id,
          orderId: review.orderId,
          productId: review.productId,
          sellerName: mapProduct(product).sellerName,
          customerId: review.userId,
          customerName: 'Kullanıcı',
          productRating: review.productRating,
          sellerRating: review.sellerRating,
          comment: review.comment,
          createdAt: review.createdAt,
        })),
      ),
      savedItems: mapSavedItems(savedItemsApi, user.id),
      influencerFollows: mapInfluencerFollows(influencerApi.follows, user.id),
      notifications: mapNotifications(notifications),
    }));
  };

  const login = async () => {
    const identifier = normalize(loginIdentifier);

    if (!identifier || !loginPassword) {
      Alert.alert('Eksik bilgi', 'E-posta/telefon ve şifre gir.');
      return;
    }

    try {
      const result = await apiRequest<{ user: any; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password: loginPassword }),
      });

      if (result.user.role === 'ADMIN') {
        Alert.alert('Yönetici paneli', 'Yönetici hesabı mobil uygulamaya alınmaz. Yönetici işlemleri web panelinden yapılır.');
        return;
      }

      await AsyncStorage.setItem(TOKEN_KEY, result.token);
      setApiToken(result.token);
      setProfile(mapProfile(result.user));
      await loadRemoteData(result.token, result.user);
      setLoginIdentifier('');
      setLoginPassword('');
      setTab(result.user.role === 'SELLER' ? 'seller' : 'home');
      return;
    } catch (error) {
      Alert.alert('Giriş başarısız', error instanceof Error ? error.message : 'Giriş yapılamadı.');
      return;
    }

    const foundProfile = db.profiles.find((item) => {
      const sameIdentifier = normalize(item.email) === identifier || normalize(item.phone) === identifier;
      return sameIdentifier && item.password === loginPassword;
    }) ?? null;

    if (!foundProfile) {
      Alert.alert('Giriş başarısız', 'E-posta/telefon veya şifre hatalı.');
      return;
    }

    setProfile(foundProfile);
    setLoginIdentifier('');
    setLoginPassword('');
    setTab(foundProfile!.role === 'seller' ? 'seller' : 'home');
  };

  const continueAsGuest = () => {
    const guestProfile: Profile = {
      id: 'guest-customer',
      role: 'customer',
      name: 'Misafir Kullanıcı',
      phone: '',
      email: '',
      password: '',
      address: '',
      city: '',
      district: '',
      experienceMode: 'simple',
      notificationPreferences: defaultNotificationPreferences,
    };

    setApiToken('');
    setProfile(guestProfile);
    setTab('home');
    apiRequest<{ profiles: InfluencerProfile[]; posts: InfluencerPost[]; products: InfluencerProduct[]; collections: InfluencerCollection[]; follows: any[]; likedPostIds?: string[] }>('/influencers/public')
      .then((influencerApi) => {
        setCreatorProfiles(influencerApi.profiles);
        setCreatorPosts(influencerApi.posts.map(mapInfluencerPost));
        setCreatorProducts(influencerApi.products.map(mapInfluencerProduct));
        setCreatorCollections(influencerApi.collections);
        setInfluencerLikedPostIds([]);
      })
      .catch(() => {});
  };

  const saveProfile = async () => {
    const required = [
      register.name,
      register.phone,
      register.email,
      register.password,
      register.address,
      register.city,
      register.district,
    ];
    const sellerRequired = accountType === 'seller' ? [register.companyName, register.taxNumber] : [];

    if ([...required, ...sellerRequired].some((value) => !value.trim())) {
      Alert.alert('Eksik bilgi', 'Kayıt için gerekli alanları doldurmalısın.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(register.email.trim())) {
      Alert.alert('E-posta hatal?', 'Ge?erli bir e-posta adresi yazmal?s?n.');
      return;
    }

    if (register.phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Telefon hatal?', 'Telefon numaras?n? en az 10 haneli yazmal?s?n.');
      return;
    }

    if (register.password.length < 6) {
      Alert.alert('Şifre kısa', 'En az 6 karakterli bir şifre gir.');
      return;
    }

    if (register.address.trim().length < 5) {
      Alert.alert('Adres k?sa', 'A??k adres alan?na en az 5 karakter yazmal?s?n.');
      return;
    }

    if (accountType === 'seller' && register.taxNumber.replace(/\D/g, '').length < 5) {
      Alert.alert('Vergi bilgisi hatal?', 'Vergi no / TCKN alan?n? en az 5 haneli yazmal?s?n.');
      return;
    }

    if (accountType === 'seller' && !register.sellerSimpleChannel && !register.sellerVitrinChannel) {
      Alert.alert('Satış kanalı gerekli', 'Satıcı hesabı için sade pazar veya vitrin satışından en az birini seçmelisin.');
      return;
    }

    if (!register.kvkkAccepted || !register.userAgreementAccepted || (accountType === 'seller' && !register.sellerAgreementAccepted)) {
      Alert.alert('Onay gerekli', 'Kayıt oluşturmak için KVKK ve ilgili sözleşme onaylarını işaretlemelisin.');
      return;
    }

    try {
      const result = await apiRequest<{ user: any; token: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: accountType === 'seller' ? 'SELLER' : 'CUSTOMER',
          name: register.name.trim(),
          phone: register.phone.trim(),
          email: register.email.trim(),
          password: register.password,
          address: {
            title: 'Ev',
            city: register.city.trim(),
            district: register.district.trim(),
            detail: register.address.trim(),
          },
          seller: accountType === 'seller'
            ? {
                companyName: register.companyName.trim(),
                taxNumber: register.taxNumber.trim(),
                sellInSimple: register.sellerSimpleChannel,
                sellInVitrin: register.sellerVitrinChannel,
              }
            : undefined,
        }),
      });

      await AsyncStorage.setItem(TOKEN_KEY, result.token);
      setApiToken(result.token);
      setProfile(mapProfile(result.user));
      await loadRemoteData(result.token, result.user);
      setTab(result.user.role === 'SELLER' ? 'seller' : 'home');
      return;
    } catch (error) {
      Alert.alert('Kayıt başarısız', error instanceof Error ? error.message : 'Kayıt yapılamadı.');
      return;
    }

    const email = normalize(register.email);
    const phone = normalize(register.phone);
    const alreadyExists = db.profiles.some((item) => normalize(item.email) === email || normalize(item.phone) === phone);

    if (alreadyExists) {
      Alert.alert('Hesap zaten var', 'Bu e-posta veya telefonla daha önce kayıt yapılmış.');
      return;
    }

    const nextProfile: Profile = {
      id: makeId(),
      role: accountType,
      name: register.name.trim(),
      phone: register.phone.trim(),
      email: register.email.trim(),
      password: register.password,
      address: register.address.trim(),
      city: register.city.trim(),
      district: register.district.trim(),
      companyName: accountType === 'seller' ? register.companyName.trim() : undefined,
      taxNumber: accountType === 'seller' ? register.taxNumber.trim() : undefined,
      sellerChannels: accountType === 'seller'
        ? [
            ...(register.sellerSimpleChannel ? ['simple' as const] : []),
            ...(register.sellerVitrinChannel ? ['vitrin' as const] : []),
          ]
        : undefined,
      experienceMode: 'simple',
      notificationPreferences: defaultNotificationPreferences,
    };

    setDb((current) => ({
      ...current,
      profiles: current.profiles.some((item) => item.id === nextProfile.id)
        ? current.profiles
        : [...current.profiles, nextProfile],
      addresses: [
        ...(current.addresses ?? []),
        {
          id: makeId(),
          profileId: nextProfile.id,
          title: 'Ev',
          city: nextProfile.city,
          district: nextProfile.district,
          detail: nextProfile.address,
          isDefault: true,
        },
      ],
    }));
    setProfile(nextProfile);
    setTab(nextProfile.role === 'seller' ? 'seller' : 'home');
  };

  const createAuction = async () => {
    if (!profile || profile.role !== 'seller') {
      return;
    }

    if (!request.brand.trim() || !request.model.trim() || !request.packageInfo.trim() || !request.description.trim()) {
      Alert.alert('Eksik ürün talebi', 'Marka, model, paket standardı ve açıklama alanlarını doldur.');
      return;
    }

    if (apiToken) {
      try {
        const uploadedImage = request.imageBase64
          ? await uploadImage(request.imageBase64, request.imageMimeType, request.imageName, apiToken)
          : null;
        const imageUrl = uploadedImage?.url ?? request.imageUrl.trim();

        await apiRequest('/seller/product-requests', {
          method: 'POST',
          body: JSON.stringify({
            category: legacyCategoryFromName(request.categoryName),
            categoryName: request.categoryName,
            subCategoryName: request.subCategoryName,
            segmentName: request.segmentName,
            petType: request.categoryName === 'Pet' ? toApiPetType(request.segmentName as PetFilter) : undefined,
            petSubCategory: request.categoryName === 'Pet' ? toApiPetSubCategory(request.subCategoryName as PetSubFilter) : undefined,
            babySubCategory: request.categoryName === 'Bebek' ? toApiBabySubCategory(request.subCategoryName as BabyFilter) : undefined,
            brand: request.brand.trim(),
            model: request.model.trim(),
            packageInfo: request.packageInfo.trim(),
            barcode: normalizeBarcodeInput(request.barcode) || undefined,
            imageUrl: imageUrl || undefined,
            description: request.description.trim(),
          }),
        }, apiToken);
        setRequest({ category: 'Pet', categoryName: 'Pet', subCategoryName: 'Kuru mama', segmentName: 'Kedi', petType: 'Kedi', petSubCategory: 'Kuru mama', babySubCategory: 'Bebek bezi', brand: '', model: '', packageInfo: '', barcode: '', imageUrl: '', imageBase64: '', imageMimeType: 'image/jpeg', imageName: 'urun.jpg', description: '' });
        await loadRemoteData(apiToken);
        return;
      } catch (error) {
        Alert.alert('Talep gönderilemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(now.getDate() + 7);

    const auction: Auction = {
      id: makeId(),
      category: request.category,
      categoryName: request.categoryName,
      subCategoryName: request.subCategoryName,
      segmentName: request.segmentName || undefined,
      petType: request.categoryName === 'Pet' ? (request.segmentName as PetFilter) : undefined,
      petSubCategory: request.categoryName === 'Pet' ? (request.subCategoryName as PetSubFilter) : undefined,
      babySubCategory: request.categoryName === 'Bebek' ? (request.subCategoryName as BabyFilter) : undefined,
      brand: request.brand.trim(),
      model: request.model.trim(),
      packageInfo: request.packageInfo.trim(),
      barcode: normalizeBarcodeInput(request.barcode) || undefined,
      imageUrl: resolveImageUrl(request.imageUrl.trim()),
      description: request.description.trim(),
      requestedBySellerId: profile.id,
      requestedBySellerName: profile.companyName || profile.name,
      createdAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      status: 'requested',
    };

    setDb((current) => ({ ...current, auctions: [auction, ...current.auctions] }));
    setBid((current) => ({ ...current, auctionId: auction.id }));
    setRequest({ category: 'Pet', categoryName: 'Pet', subCategoryName: 'Kuru mama', segmentName: 'Kedi', petType: 'Kedi', petSubCategory: 'Kuru mama', babySubCategory: 'Bebek bezi', brand: '', model: '', packageInfo: '', barcode: '', imageUrl: '', imageBase64: '', imageMimeType: 'image/jpeg', imageName: 'urun.jpg', description: '' });
  };

  const createBid = async () => {
    if (!profile || profile.role !== 'seller') {
      return;
    }

    const price = Number(bid.price);
    const stock = Number(bid.stock);
    const deliveryDays = Number(bid.deliveryDays);

    if (!bid.auctionId || !price || !stock || !deliveryDays) {
      Alert.alert('Eksik teklif', 'İhale, fiyat, stok ve teslimat süresi gerekli.');
      return;
    }

    if (apiToken) {
      try {
        await apiRequest(`/auctions/${bid.auctionId}/bids`, {
          method: 'POST',
          body: JSON.stringify({ price, stock, deliveryDays, note: bid.note.trim() || undefined }),
        }, apiToken);
        setBid({ auctionId: bid.auctionId, price: '', stock: '', deliveryDays: '', note: '' });
        await loadRemoteData(apiToken);
        return;
      } catch (error) {
        Alert.alert('Teklif kaydedilemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    const nextBid: Bid = {
      id: makeId(),
      auctionId: bid.auctionId,
      sellerId: profile.id,
      sellerName: profile.companyName || profile.name,
      price,
      stock,
      deliveryDays,
      note: bid.note.trim(),
    };

    setDb((current) => ({ ...current, bids: [nextBid, ...current.bids] }));
    setBid({ auctionId: bid.auctionId, price: '', stock: '', deliveryDays: '', note: '' });
  };

  const completeAuction = (auctionId: string) => {
    const auction = db.auctions.find((item) => item.id === auctionId);
    const bids = db.bids.filter((item) => item.auctionId === auctionId);

    if (!auction || bids.length === 0) {
      Alert.alert('Teklif yok', 'Ürün satışa açılmadan önce en az bir teklif alınmalı.');
      return;
    }

    const winner = [...bids].sort((a, b) => {
      const aScore = a.price - a.stock * 0.05 + a.deliveryDays * 10;
      const bScore = b.price - b.stock * 0.05 + b.deliveryDays * 10;
      return aScore - bScore;
    })[0];

    const liveProduct: LiveProduct = {
      id: makeId(),
      auctionId,
      category: auction.category,
      categoryName: auction.categoryName,
      subCategoryName: auction.subCategoryName,
      segmentName: auction.segmentName,
      title: `${auction.brand} ${auction.model} ${auction.packageInfo}`,
      imageUrl: auction.imageUrl,
      description: auction.description,
      sellerName: winner.sellerName,
      price: winner.price,
      stock: winner.stock,
      deliveryDays: winner.deliveryDays,
      createdAt: new Date().toISOString(),
    };

    setDb((current) => ({
      ...current,
      auctions: current.auctions.map((item) =>
        item.id === auctionId ? { ...item, status: 'completed' } : item,
      ),
      liveProducts: [liveProduct, ...current.liveProducts],
    }));
    setSelectedProductId(liveProduct.id);
    setTab('home');
  };

  const addToCart = (productId: string) => {
    if (!profile || profile.role !== 'customer') {
      Alert.alert('Kullanıcı hesabı gerekli', 'Sepete eklemek için kullanıcı hesabıyla giriş yapmalısın.');
      return;
    }

    if (apiToken) {
      apiRequest('/cart', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      }, apiToken)
        .then(() => loadRemoteData(apiToken))
        .catch((error) => Alert.alert('Sepete eklenemedi', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    setDb((current) => {
      const existing = current.cartItems.find(
        (item) => item.customerId === profile.id && item.productId === productId,
      );

      if (existing) {
        return {
          ...current,
          cartItems: (current.cartItems ?? []).map((item) =>
            item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        };
      }

      return {
        ...current,
        cartItems: [
          ...(current.cartItems ?? []),
          { id: makeId(), customerId: profile.id, productId, quantity: 1 },
        ],
      };
    });
  };

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (apiToken) {
      apiRequest(`/cart/${cartItemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }, apiToken)
        .then(() => loadRemoteData(apiToken))
        .catch((error) => Alert.alert('Sepet güncellenemedi', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    setDb((current) => ({
      ...current,
      cartItems:
        quantity <= 0
          ? (current.cartItems ?? []).filter((item) => item.id !== cartItemId)
          : (current.cartItems ?? []).map((item) => (item.id === cartItemId ? { ...item, quantity } : item)),
    }));
  };

  const checkout = () => {
    if (!profile || cartLines.length === 0) {
      return;
    }

    if (!checkoutAddress) {
      Alert.alert('Adres gerekli', 'Siparişi tamamlamak için profilinden bir teslimat adresi eklemelisin.');
      setTab('profile');
      return;
    }

    if (apiToken) {
      apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          addressId: checkoutAddress.id,
          paymentMethod: toApiPayment(paymentMethod),
        }),
      }, apiToken)
        .then(() => loadRemoteData(apiToken))
        .then(() => setTab('orders'))
        .catch((error) => Alert.alert('Sipariş oluşturulamadı', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    const orders: Order[] = cartLines.map((line) => ({
      id: makeId(),
      orderNumber: makeOrderNumber(),
      customerId: profile.id,
      customerName: profile.name,
      productId: line.product.id,
      title: line.product.title,
      imageUrl: line.product.imageUrl,
      sellerName: line.product.sellerName,
      quantity: line.item.quantity,
      unitPrice: line.product.price,
      total: line.product.price * line.item.quantity,
      addressId: checkoutAddress.id,
      address: `${checkoutAddress.title} · ${checkoutAddress.city} / ${checkoutAddress.district} · ${checkoutAddress.detail}`,
      paymentMethod,
      paymentStatus: paymentMethod === 'Kart' ? 'Ödendi' : 'Bekliyor',
      status: 'Hazırlanıyor',
      createdAt: new Date().toISOString(),
    }));

    setDb((current) => ({
      ...current,
      cartItems: (current.cartItems ?? []).filter((item) => item.customerId !== profile.id),
      orders: [...orders, ...(current.orders ?? [])],
    }));
    setTab('orders');
  };

  const submitReview = (
    order: Order,
    productRating: number,
    sellerRating: number,
    comment: string,
  ) => {
    if (!profile) {
      return;
    }

    if (order.status !== 'Teslim edildi') {
      Alert.alert('Teslimat bekleniyor', 'Değerlendirme sipariş teslim edildikten sonra yapılabilir.');
      return;
    }

    if (db.reviews.some((review) => review.orderId === order.id)) {
      Alert.alert('Değerlendirme var', 'Bu sipariş için zaten değerlendirme yapılmış.');
      return;
    }

    if (!comment.trim()) {
      Alert.alert('Yorum gerekli', 'Kısa bir ürün yorumu yazmalısın.');
      return;
    }

    if (apiToken) {
      apiRequest('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.apiOrderId ?? order.id,
          productId: order.productId,
          productRating,
          sellerRating,
          comment: comment.trim(),
        }),
      }, apiToken)
        .then(() => loadRemoteData(apiToken))
        .catch((error) => Alert.alert('Değerlendirme gönderilemedi', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    const review: Review = {
      id: makeId(),
      orderId: order.id,
      productId: order.productId,
      sellerName: order.sellerName,
      customerId: profile.id,
      customerName: profile.name,
      productRating,
      sellerRating,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    setDb((current) => ({
      ...current,
      reviews: [review, ...(current.reviews ?? [])],
    }));
  };

  const advanceOrderStatus = (orderId: string) => {
    const targetOrder = db.orders.find((item) => item.id === orderId);
    const targetNextStatus =
      targetOrder?.status === mapStatus('PREPARING')
        ? mapStatus('SHIPPED')
        : targetOrder?.status === mapStatus('SHIPPED')
          ? mapStatus('DELIVERED')
          : mapStatus('DELIVERED');

    if (apiToken && targetOrder?.apiOrderId) {
      const apiStatus = targetNextStatus === 'Teslim edildi' ? 'DELIVERED' : 'SHIPPED';

      apiRequest(`/seller/orders/${targetOrder.apiOrderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: apiStatus }),
      }, apiToken)
        .then(() => loadRemoteData(apiToken))
        .catch((error) => Alert.alert('Sipariş güncellenemedi', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    setDb((current) => ({
      ...current,
      orders: (current.orders ?? []).map((order) => {
        if (order.id !== orderId) {
          return order;
        }

        const nextStatus =
          order.status === 'Hazırlanıyor'
            ? 'Kargoda'
            : order.status === 'Kargoda'
              ? 'Teslim edildi'
              : 'Teslim edildi';

        return { ...order, status: nextStatus };
      }),
    }));
  };

  const toggleSavedItem = (targetType: 'product' | 'order', targetId: string) => {
    if (!profile || profile.role !== 'customer') {
      return;
    }

    if (apiToken) {
      const existing = (db.savedItems ?? []).find(
        (item) =>
          item.customerId === profile.id &&
          item.targetType === targetType &&
          item.targetId === targetId,
      );

      if (existing) {
        apiRequest(`/saved-items/${existing.id}`, { method: 'DELETE' }, apiToken)
          .then(() => loadRemoteData(apiToken))
          .catch((error) => Alert.alert('Kayıt kaldırılamadı', error instanceof Error ? error.message : 'API hatası.'));
        return;
      }

      const order = targetType === 'order' ? db.orders.find((item) => item.id === targetId) : null;
      apiRequest('/saved-items', {
        method: 'POST',
        body: JSON.stringify(
          targetType === 'product'
            ? { productId: targetId }
            : { orderId: order?.apiOrderId ?? targetId },
        ),
      }, apiToken)
        .then(() => loadRemoteData(apiToken))
        .catch((error) => Alert.alert('Kaydedilemedi', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    setDb((current) => {
      const existing = (current.savedItems ?? []).find(
        (item) =>
          item.customerId === profile.id &&
          item.targetType === targetType &&
          item.targetId === targetId,
      );

      if (existing) {
        return {
          ...current,
          savedItems: (current.savedItems ?? []).filter((item) => item.id !== existing.id),
        };
      }

      return {
        ...current,
        savedItems: [
          {
            id: makeId(),
            customerId: profile.id,
            targetType,
            targetId,
            createdAt: new Date().toISOString(),
          },
          ...(current.savedItems ?? []),
        ],
      };
    });
  };

  const toggleInfluencerFollow = (influencerId: string) => {
    if (!profile || profile.role !== 'customer') {
      Alert.alert('Kullanıcı hesabı gerekli', 'Influencer vitrini takip etmek için kullanıcı hesabıyla giriş yapmalısın.');
      return;
    }

    if (apiToken) {
      const existing = (db.influencerFollows ?? []).find(
        (item) => item.profileId === profile.id && item.influencerId === influencerId,
      );

      apiRequest(`/influencers/${influencerId}/follow`, { method: existing ? 'DELETE' : 'POST' }, apiToken)
        .then(() => loadRemoteData(apiToken))
        .catch((error) => Alert.alert('Takip güncellenemedi', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    setDb((current) => {
      const existing = (current.influencerFollows ?? []).find(
        (item) => item.profileId === profile.id && item.influencerId === influencerId,
      );

      if (existing) {
        return {
          ...current,
          influencerFollows: (current.influencerFollows ?? []).filter((item) => item.id !== existing.id),
        };
      }

      return {
        ...current,
        influencerFollows: [
          {
            id: makeId(),
            profileId: profile.id,
            influencerId,
            createdAt: new Date().toISOString(),
          },
          ...(current.influencerFollows ?? []),
        ],
      };
    });
  };

  const openInfluencerProduct = (product: InfluencerProduct) => {
    setSelectedInfluencerProductId(product.id);
    setSelectedInfluencerId(null);
    setTab('influencer');
  };

  const openCreatorRequest = () => {
    if (!profile || (profile.role !== 'customer' && profile.role !== 'seller')) {
      return;
    }

    const existingProfile = creatorProfiles.find((item) => item.ownerId === profile.id);
    if (existingProfile) {
      setSelectedInfluencerId(existingProfile.id);
      return;
    }

    if (apiToken) {
      apiRequest<InfluencerProfile>('/influencers/me', {
        method: 'POST',
        body: JSON.stringify({ specialty: 'Kişisel vitrin' }),
      }, apiToken)
        .then((createdProfile) => {
          setSelectedInfluencerId(createdProfile.id);
          return loadRemoteData(apiToken);
        })
        .then(() => Alert.alert('Vitrin açıldı', 'Mevcut hesabına vitrin profili bağlandı. Ürünleri sade pazardan ayrı tutulacak.'))
        .catch((error) => Alert.alert('Vitrin açılamadı', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    const localProfile: InfluencerProfile = {
      id: `local-vitrin-${profile.id}`,
      ownerId: profile.id,
      name: profile.name,
      handle: `@${normalizeSmartText(profile.name).replace(/\s+/g, '') || 'vitrin'}`,
      specialty: 'Kişisel vitrin',
      bio: `${profile.name} tarafından hazırlanan ürün bağlantılı vitrin.`,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
      heroUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80',
      followerCount: 0,
    };

    setCreatorProfiles((current) => [localProfile, ...current]);
    setSelectedInfluencerId(localProfile.id);
    return;

    if (apiToken) {
      apiRequest('/influencer-applications', {
        method: 'POST',
        body: JSON.stringify({ note: 'Mobil uygulama içinden vitrin açma başvurusu.' }),
      }, apiToken)
        .then(() => loadRemoteData(apiToken))
        .then(() => Alert.alert('Başvuru alındı', 'Mevcut hesabınla vitrin açma başvurusu yönetici paneline iletildi.'))
        .catch((error) => Alert.alert('Başvuru gönderilemedi', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    Alert.alert(
      'Ayrı profil gerekmiyor',
      'Bu bölümde içerik üretici vitrini mevcut hesabına bağlanacak. Gerçek backend aşamasında kısa bir başvuru ve onay akışı ekleyeceğiz.',
    );
  };

  const uploadInfluencerMedia = async (asset: { uri: string; base64?: string | null; mimeType?: string | null; fileName?: string | null }) => {
    if (!apiToken) {
      return asset.uri;
    }

    const mimeType = asset.mimeType || 'image/jpeg';
    const base64 = asset.base64 ?? await imageUriToBase64(asset.uri);
    const uploaded = await uploadImage(base64, mimeType, asset.fileName || (mimeType.startsWith('video/') ? 'vitrin-video.mp4' : 'vitrin-gorsel.jpg'), apiToken);
    return resolveImageUrl(uploaded.url);
  };

  const saveInfluencerProfile = async (data: Pick<InfluencerProfile, 'name' | 'handle' | 'specialty' | 'bio' | 'avatarUrl' | 'heroUrl'>) => {
    if (!profile || (profile.role !== 'customer' && profile.role !== 'seller')) {
      return;
    }

    if (apiToken) {
      try {
        await apiRequest('/influencers/me', {
          method: 'PUT',
          body: JSON.stringify(data),
        }, apiToken);
        await loadRemoteData(apiToken);
        Alert.alert('Vitrin güncellendi', 'Profil bilgilerin kaydedildi.');
        return;
      } catch (error) {
        Alert.alert('Vitrin kaydedilemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    setCreatorProfiles((current) => current.map((item) => (
      item.ownerId === profile.id ? { ...item, ...data } : item
    )));
    Alert.alert('Vitrin güncellendi', 'Profil bilgilerin yerel olarak kaydedildi.');
  };

  const createInfluencerProduct = async (data: Omit<InfluencerProduct, 'id' | 'influencerId' | 'dailyHits' | 'weeklyHits' | 'monthlyHits'>) => {
    if (!profile || profile.role !== 'seller') {
      return;
    }

    if (!ownInfluencerProfile) {
      Alert.alert('Vitrin gerekli', 'Önce vitrin açmalısın.');
      return;
    }

    if (apiToken) {
      try {
        await apiRequest('/influencer-products', {
          method: 'POST',
          body: JSON.stringify(data),
        }, apiToken);
        await loadRemoteData(apiToken);
        Alert.alert('Ürün eklendi', 'Vitrin ürünün sade pazardan ayrı şekilde kaydedildi.');
        return;
      } catch (error) {
        Alert.alert('Ürün eklenemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    setCreatorProducts((current) => [
      {
        id: makeId(),
        influencerId: ownInfluencerProfile.id,
        dailyHits: 0,
        weeklyHits: 0,
        monthlyHits: 0,
        ...data,
      },
      ...current,
    ]);
  };

  const createInfluencerPost = async (data: {
    type: InfluencerPost['type'];
    title: string;
    caption: string;
    mediaUrl: string;
    mediaUrls?: string[];
    productId?: string;
    productTitle: string;
    productQuery: string;
    productPrice: string;
    campaign?: string;
    tags: string[];
    productLinks?: InfluencerPostProductLink[];
  }) => {
    if (!profile || (profile.role !== 'customer' && profile.role !== 'seller')) {
      return;
    }

    if (!ownInfluencerProfile) {
      Alert.alert('Vitrin gerekli', 'Önce vitrin açmalısın.');
      return;
    }

    if (apiToken) {
      try {
        await apiRequest('/influencer-posts', {
          method: 'POST',
          body: JSON.stringify(data),
        }, apiToken);
        await loadRemoteData(apiToken);
        Alert.alert('Paylaşım eklendi', 'İçerik vitrin akışına kaydedildi.');
        return;
      } catch (error) {
        Alert.alert('Paylaşım eklenemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    setCreatorPosts((current) => [
      {
        id: makeId(),
        influencerId: ownInfluencerProfile.id,
        status: 'PUBLISHED',
        ...data,
      },
      ...current,
    ]);
  };

  const updateInfluencerPost = async (postId: string, data: Partial<{
    type: InfluencerPost['type'];
    title: string;
    caption: string;
    mediaUrl: string;
    mediaUrls: string[];
    productId?: string;
    productTitle: string;
    productQuery: string;
    productPrice: string;
    campaign?: string;
    tags: string[];
    productLinks?: InfluencerPostProductLink[];
    status: 'PUBLISHED' | 'HIDDEN';
  }>) => {
    if (!profile || (profile.role !== 'customer' && profile.role !== 'seller')) {
      return;
    }

    if (apiToken) {
      try {
        await apiRequest(`/influencer-posts/${postId}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }, apiToken);
        await loadRemoteData(apiToken);
        Alert.alert('Paylaşım güncellendi', 'Değişiklikler kaydedildi.');
        return;
      } catch (error) {
        Alert.alert('Paylaşım güncellenemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    setCreatorPosts((current) => current.map((post) => (post.id === postId ? { ...post, ...data } : post)));
  };

  const deleteInfluencerPost = async (postId: string) => {
    if (!profile || (profile.role !== 'customer' && profile.role !== 'seller')) {
      return;
    }

    if (apiToken) {
      try {
        await apiRequest(`/influencer-posts/${postId}`, { method: 'DELETE' }, apiToken);
        await loadRemoteData(apiToken);
        Alert.alert('Paylaşım silindi', 'İçerik vitrinden kaldırıldı.');
        return;
      } catch (error) {
        Alert.alert('Paylaşım silinemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    setCreatorPosts((current) => current.filter((post) => post.id !== postId));
  };

  const likeInfluencerPost = async (postId: string) => {
    if (!profile || profile.role !== 'customer' || !apiToken) {
      return;
    }

    const result = await apiRequest<{ liked: boolean; likeCount: number; commentCount: number }>(`/influencer-posts/${postId}/like`, {
      method: 'POST',
    }, apiToken);

    setCreatorPosts((current) => current.map((post) => (
      post.id === postId ? { ...post, likeCount: result.likeCount, commentCount: result.commentCount } : post
    )));
    setInfluencerLikedPostIds((current) => (
      result.liked
        ? [...new Set([...current, postId])]
        : current.filter((id) => id !== postId)
    ));
  };

  const commentInfluencerPost = async (postId: string, text: string) => {
    if (!profile || profile.role !== 'customer' || !apiToken || !text.trim()) {
      return;
    }

    const result = await apiRequest<{ comment?: InfluencerPostComment; likeCount: number; commentCount: number }>(`/influencer-posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text: text.trim() }),
    }, apiToken);

    setCreatorPosts((current) => current.map((post) => (
      post.id === postId
        ? {
            ...post,
            likeCount: result.likeCount,
            commentCount: result.commentCount,
            comments: result.comment ? [...(post.comments ?? []), result.comment] : post.comments,
          }
        : post
    )));
  };

  const addInfluencerToCart = (productId: string) => {
    if (!profile || profile.role !== 'customer') {
      return;
    }

    setDb((current) => {
      const existing = (current.influencerCartItems ?? []).find((item) => item.profileId === profile.id && item.productId === productId);

      if (existing) {
        return {
          ...current,
          influencerCartItems: (current.influencerCartItems ?? []).map((item) => (
            item.id === existing.id ? { ...item, quantity: item.quantity + 1 } : item
          )),
        };
      }

      return {
        ...current,
        influencerCartItems: [
          ...(current.influencerCartItems ?? []),
          { id: makeId(), profileId: profile.id, productId, quantity: 1 },
        ],
      };
    });
  };

  const updateInfluencerCartQuantity = (itemId: string, quantity: number) => {
    setDb((current) => ({
      ...current,
      influencerCartItems: quantity <= 0
        ? (current.influencerCartItems ?? []).filter((item) => item.id !== itemId)
        : (current.influencerCartItems ?? []).map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    }));
  };

  const checkoutInfluencerCart = () => {
    if (influencerCartLines.length === 0) {
      return;
    }

    Alert.alert('Vitrin sepeti hazır', 'Bu sepet sade pazar sepetinden ayrı tutuluyor. Ödeme bağlantısını sonraki adımda vitrin ürünlerine özel bağlayacağız.');
  };

  const addAddress = () => {
    if (!profile) {
      return;
    }

    if (!newAddress.title.trim() || !newAddress.city.trim() || !newAddress.district.trim() || !newAddress.detail.trim()) {
      Alert.alert('Eksik adres', 'Adres başlığı, il, ilçe ve açık adres alanlarını doldur.');
      return;
    }

    if (apiToken) {
      apiRequest('/addresses', {
        method: 'POST',
        body: JSON.stringify({
          title: newAddress.title.trim(),
          city: newAddress.city.trim(),
          district: newAddress.district.trim(),
          detail: newAddress.detail.trim(),
        }),
      }, apiToken)
        .then(() => {
          setNewAddress({ title: '', city: '', district: '', detail: '' });
          return loadRemoteData(apiToken);
        })
        .catch((error) => Alert.alert('Adres eklenemedi', error instanceof Error ? error.message : 'API hatası.'));
      return;
    }

    setDb((current) => {
      const hasAddress = (current.addresses ?? []).some((address) => address.profileId === profile.id);
      return {
        ...current,
        addresses: [
          ...(current.addresses ?? []),
          {
            id: makeId(),
            profileId: profile.id,
            title: newAddress.title.trim(),
            city: newAddress.city.trim(),
            district: newAddress.district.trim(),
            detail: newAddress.detail.trim(),
            isDefault: !hasAddress,
          },
        ],
      };
    });
    setNewAddress({ title: '', city: '', district: '', detail: '' });
  };

  const pickRequestImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    const asset = result.canceled ? null : result.assets[0];

    if (asset?.uri) {
      const base64 = asset.base64 ?? await imageUriToBase64(asset.uri).catch(() => '');
      updateRequest('imageUrl', asset.uri);
      updateRequest('imageBase64', base64);
      updateRequest('imageMimeType', asset.mimeType ?? 'image/jpeg');
      updateRequest('imageName', asset.fileName ?? 'urun.jpg');
    }
  };

  const pickSellerVitrinImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.82,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    try {
      const uploadedUrls = await Promise.all(result.assets.filter((asset) => asset?.uri).map((asset) => uploadInfluencerMedia({
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      })));

      if (!uploadedUrls.length) {
        return;
      }

      setSellerVitrinDraft((current) => {
        const imageUrls = uniqueMediaList(current.imageUrl, [...current.imageUrls, ...uploadedUrls]);
        return { ...current, imageUrl: imageUrls[0] ?? uploadedUrls[0], imageUrls };
      });
    } catch (error) {
      Alert.alert('Görsel eklenemedi', error instanceof Error ? error.message : 'Dosya okunamadı.');
    }
  };

  const createSellerVitrinProduct = async () => {
    if (!profile || profile.role !== 'seller') {
      return;
    }

    const imageUrls = uniqueMediaList(sellerVitrinDraft.imageUrl, sellerVitrinDraft.imageUrls);
    if (!sellerVitrinDraft.title.trim() || !sellerVitrinDraft.description.trim() || !sellerVitrinDraft.priceText.trim() || imageUrls.length === 0) {
      Alert.alert('Eksik vitrin ürünü', 'Ürün adı, açıklama, fiyat ve en az bir görsel gerekli.');
      return;
    }

    const payload = {
      title: sellerVitrinDraft.title.trim(),
      description: sellerVitrinDraft.description.trim(),
      imageUrl: imageUrls[0],
      imageUrls,
      priceText: sellerVitrinDraft.priceText.trim(),
      sellerName: profile.companyName || profile.name,
      detailText: sellerVitrinDraft.detailText.trim() || undefined,
      sizes: sellerVitrinDraft.sizesText.split(',').map((value) => value.trim()).filter(Boolean),
      colors: sellerVitrinDraft.colorsText.split(',').map((value) => value.trim()).filter(Boolean),
      linkText: sellerVitrinDraft.linkText.trim() || undefined,
      stockText: sellerVitrinDraft.stockText.trim() || undefined,
    };

    if (apiToken) {
      try {
        await apiRequest('/influencer-products', {
          method: 'POST',
          body: JSON.stringify(payload),
        }, apiToken);
        await loadRemoteData(apiToken);
        setSellerVitrinDraft({ title: '', description: '', imageUrl: '', imageUrls: [], priceText: '', detailText: '', sizesText: '', colorsText: '', linkText: '', stockText: '' });
        Alert.alert('Vitrin ürünü eklendi', 'Ürün influencerların bağlayabileceği vitrin ürün havuzuna eklendi.');
        return;
      } catch (error) {
        Alert.alert('Vitrin ürünü eklenemedi', error instanceof Error ? error.message : 'API hatası.');
        return;
      }
    }

    setCreatorProducts((current) => [
      {
        id: makeId(),
        sellerId: profile.id,
        title: payload.title,
        description: payload.description,
        imageUrl: payload.imageUrl,
        imageUrls: payload.imageUrls,
        priceText: payload.priceText,
        sellerName: payload.sellerName,
        detailText: payload.detailText,
        sizes: payload.sizes,
        colors: payload.colors,
        linkText: payload.linkText,
        stockText: payload.stockText,
        dailyHits: 0,
        weeklyHits: 0,
        monthlyHits: 0,
      },
      ...current,
    ]);
    setSellerVitrinDraft({ title: '', description: '', imageUrl: '', imageUrls: [], priceText: '', detailText: '', sizesText: '', colorsText: '', linkText: '', stockText: '' });
  };

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.loading}>Yükleniyor</Text>
      </SafeAreaView>
    );
  }

  const isInfluencerTab = Boolean(profile && tab === 'influencer' && (profile.role === 'customer' || profile.role === 'seller'));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={[styles.page, isInfluencerTab && styles.influencerPage]} showsVerticalScrollIndicator={false}>
          {!isInfluencerTab && (
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>SadeVitrin</Text>
          </View>
          {profile && (
            <Pressable style={styles.smallButton} onPress={() => setTab('notifications')}>
              <Text style={styles.smallButtonText}>
                Bildirim{unreadNotificationCount > 0 ? ` (${unreadNotificationCount})` : ''}
              </Text>
            </Pressable>
          )}
          </View>
          )}

          {!profile ? (
            <AuthScreen
              authMode={authMode}
              accountType={accountType}
              loginIdentifier={loginIdentifier}
              loginPassword={loginPassword}
              register={register}
              setAuthMode={setAuthMode}
              setAccountType={setAccountType}
              setLoginIdentifier={setLoginIdentifier}
              setLoginPassword={setLoginPassword}
              updateRegister={updateRegister}
              login={login}
              saveProfile={saveProfile}
              continueAsGuest={continueAsGuest}
            />
          ) : (
            <>
              {tab === 'home' && profile.role === 'customer' && (
                <CustomerHome
                  products={filteredProducts}
                  categories={categoryCatalog}
                  search={search}
                  setSearch={setSearch}
                  filters={productFilters}
                  setFilters={setProductFilters}
                  selectedProduct={selectedProduct}
                  onSelectProduct={setSelectedProductId}
                  onAddToCart={addToCart}
                  reviews={reviews}
                  savedItems={savedItems}
                  recommendations={inferredRecommendations}
                  newlyOpenedProducts={newlyOpenedProducts}
                  reorderReminders={reorderReminders}
                  experienceMode={profile.experienceMode}
                  toggleSavedItem={toggleSavedItem}
                  createSearchDemand={createSearchDemand}
                  barcodeInput={barcodeInput}
                  setBarcodeInput={setBarcodeInput}
                  barcodeDemandNote={barcodeDemandNote}
                  setBarcodeDemandNote={setBarcodeDemandNote}
                  startBarcodeScanner={startBarcodeScanner}
                  lookupBarcode={lookupBarcode}
                  createBarcodeDemand={createBarcodeDemand}
                />
              )}
              {tab === 'saved' && (
                <SavedScreen
                  savedItems={savedItems}
                  products={db.liveProducts}
                  orders={currentOrders}
                  reviews={reviews}
                  onSelectProduct={(id) => {
                    setSelectedProductId(id);
                    setTab('home');
                  }}
                  toggleSavedItem={toggleSavedItem}
                />
              )}
              {tab === 'cart' && (
                <CartScreen
                  lines={cartLines}
                  total={cartTotal}
                  addresses={currentAddresses}
                  selectedAddressId={checkoutAddress?.id ?? ''}
                  selectAddress={setSelectedAddressId}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  updateQuantity={updateCartQuantity}
                  checkout={checkout}
                  goShopping={() => setTab('home')}
                />
              )}
              {tab === 'orders' && (
                <OrdersScreen
                  orders={currentOrders}
                  reviews={reviews}
                  profile={profile}
                  submitReview={submitReview}
                  advanceOrderStatus={advanceOrderStatus}
                  savedItems={savedItems}
                  toggleSavedItem={toggleSavedItem}
                />
              )}
              {tab === 'notifications' && (
                <NotificationsScreen
                  notifications={currentNotifications}
                  markRead={markNotificationsRead}
                />
              )}
              {tab === 'influencer' && (profile.role === 'customer' || profile.role === 'seller') && (
                <InfluencerScreen
                  section={influencerSection}
                  profile={profile}
                  posts={creatorPosts}
                  products={creatorProducts}
                  creators={creatorProfiles}
                  collections={creatorCollections}
                  followedIds={followedInfluencerIds}
                  likedPostIds={influencerLikedPostIds}
                  selectedCreatorId={selectedInfluencerId}
                  selectedProduct={selectedInfluencerProduct}
                  ownCreator={ownInfluencerProfile}
                  cartLines={influencerCartLines}
                  cartCount={influencerCartCount}
                  search={influencerSearch}
                  setSearch={setInfluencerSearch}
                  onFollow={toggleInfluencerFollow}
                  onOpenCreator={setSelectedInfluencerId}
                  onBackToVitrin={() => setSelectedInfluencerId(null)}
                  onBackFromProduct={() => setSelectedInfluencerProductId(null)}
                  onOpenProduct={openInfluencerProduct}
                  onAddToCart={addInfluencerToCart}
                  onUpdateCartQuantity={updateInfluencerCartQuantity}
                  onCheckoutCart={checkoutInfluencerCart}
                  onCreatorRequest={openCreatorRequest}
                  onUploadMedia={uploadInfluencerMedia}
                  onSaveCreatorProfile={saveInfluencerProfile}
                  onCreateInfluencerProduct={createInfluencerProduct}
                  onCreateInfluencerPost={createInfluencerPost}
                  onUpdateInfluencerPost={updateInfluencerPost}
                  onDeleteInfluencerPost={deleteInfluencerPost}
                  onLikeInfluencerPost={likeInfluencerPost}
                  onCommentInfluencerPost={commentInfluencerPost}
                />
              )}
              {tab === 'seller' && profile.role === 'seller' && (
                <SellerDashboard
                  profile={profile}
                  requests={sellerRequests}
                  bids={sellerBids}
                  products={sellerProducts}
                  vitrinProducts={sellerVitrinProducts}
                  orders={currentOrders}
                  onNavigate={setTab}
                />
              )}
              {tab === 'sellerRequests' && profile.role === 'seller' && (
                <SellerRequestsScreen
                  profile={profile}
                  request={request}
                  requests={sellerRequests}
                  categories={categoryCatalog}
                  updateRequest={updateRequest}
                  createAuction={createAuction}
                  pickRequestImage={pickRequestImage}
                  scanBarcode={() => startBarcodeScanner('seller')}
                />
              )}
              {tab === 'sellerBids' && profile.role === 'seller' && (
                <SellerBidsScreen
                  bid={bid}
                  openAuctions={openAuctions}
                  auctionRows={auctionRows}
                  updateBid={updateBid}
                  createBid={createBid}
                  bids={sellerBids}
                  auctions={db.auctions}
                />
              )}
              {tab === 'sellerProducts' && profile.role === 'seller' && (
                <SellerProductsScreen products={sellerProducts} reviews={reviews} />
              )}
              {tab === 'sellerVitrinProducts' && profile.role === 'seller' && (
                <SellerVitrinProductsScreen
                  products={sellerVitrinProducts}
                  draft={sellerVitrinDraft}
                  setDraft={setSellerVitrinDraft}
                  pickImages={pickSellerVitrinImages}
                  submit={createSellerVitrinProduct}
                />
              )}
              {tab === 'sellerRevenue' && profile.role === 'seller' && (
                <SellerRevenueScreen orders={currentOrders} />
              )}
              {tab === 'profile' && (
                <ProfileScreen
                  profile={profile}
                  addresses={currentAddresses}
                  newAddress={newAddress}
                  setNewAddress={setNewAddress}
                  addAddress={addAddress}
                  updateProfile={updateProfile}
                  logout={logout}
                />
              )}
            </>
          )}

        </ScrollView>

        {barcodeScannerMode && (
          <View style={styles.scannerOverlay}>
            <CameraView
              style={styles.scannerCamera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] as any,
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />
            <View style={styles.scannerPanel}>
              <Text style={styles.title}>Barkodu okut</Text>
              <Text style={styles.body}>Kamera barkodu gördüğünde alan otomatik doldurulur.</Text>
              <Pressable style={styles.secondaryButton} onPress={() => setBarcodeScannerMode(null)}>
                <Text style={styles.secondaryButtonText}>Kapat</Text>
              </Pressable>
            </View>
          </View>
        )}

        {profile && (
          isInfluencerTab ? (
            <InfluencerBottomBar
              active={influencerSection}
              cartCount={influencerCartCount}
              onChange={(nextSection) => {
                setSelectedInfluencerId(null);
                setSelectedInfluencerProductId(null);
                setInfluencerSection(nextSection);
              }}
              onSade={() => {
                setSelectedInfluencerId(null);
                setSelectedInfluencerProductId(null);
                setSelectedProductId(null);
                  setTab(profile?.role === 'seller' ? 'seller' : 'home');
              }}
            />
          ) : (
            <BottomBar
              role={profile.role}
              active={tab}
              cartCount={cartItemCount}
              onChange={(nextTab) => {
                setSelectedProductId(null);
                setSelectedInfluencerId(null);
                setSelectedInfluencerProductId(null);
                if (nextTab === 'influencer') {
                  setInfluencerSection('feed');
                }
                setTab(nextTab);
              }}
            />
          )
        )}
      </View>
    </SafeAreaView>
  );
}

function AuthScreen({
  authMode,
  accountType,
  loginIdentifier,
  loginPassword,
  register,
  setAuthMode,
  setAccountType,
  setLoginIdentifier,
  setLoginPassword,
  updateRegister,
  login,
  saveProfile,
  continueAsGuest,
}: {
  authMode: AuthMode;
  accountType: Role;
  loginIdentifier: string;
  loginPassword: string;
  register: {
    name: string;
    phone: string;
    email: string;
    password: string;
    address: string;
    city: string;
    district: string;
    companyName: string;
    taxNumber: string;
    kvkkAccepted: boolean;
    userAgreementAccepted: boolean;
    sellerAgreementAccepted: boolean;
    sellerSimpleChannel: boolean;
    sellerVitrinChannel: boolean;
  };
  setAuthMode: (value: AuthMode) => void;
  setAccountType: (value: Role) => void;
  setLoginIdentifier: (value: string) => void;
  setLoginPassword: (value: string) => void;
  updateRegister: (key: keyof typeof register, value: string | boolean) => void;
  login: () => void;
  saveProfile: () => void;
  continueAsGuest: () => void;
}) {
  const [openLegalTitle, setOpenLegalTitle] = useState<string | null>(null);
  const visibleLegalDocuments = legalDocuments.filter((document) =>
    accountType === 'seller' || document.title !== 'Satıcı Sözleşmesi',
  );
  const openLegalDocument = visibleLegalDocuments.find((document) => document.title === openLegalTitle);

  return (
    <View style={styles.stack}>
      <View style={styles.authTabs}>
        <AuthButton label="Giriş yap" active={authMode === 'login'} onPress={() => setAuthMode('login')} />
        <AuthButton label="Kayıt ol" active={authMode === 'register'} onPress={() => setAuthMode('register')} />
      </View>

      {authMode === 'login' ? (
        <View style={styles.panel}>
          <Text style={styles.title}>Giriş yap</Text>
          <Text style={styles.fieldLabel}>E-posta veya telefon</Text>
          <Input placeholder="E-posta veya telefon" value={loginIdentifier} onChangeText={setLoginIdentifier} />
          <Text style={styles.fieldLabel}>Şifre</Text>
          <Input placeholder="Şifre" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
          <Pressable onPress={() => Alert.alert('Şifre sıfırlama', 'Gerçek backend aşamasında e-posta veya SMS ile şifre sıfırlama bağlantısı göndereceğiz.')}>
            <Text style={styles.backText}>Şifremi unuttum</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={login}>
            <Text style={styles.primaryButtonText}>Giriş yap</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={continueAsGuest}>
            <Text style={styles.secondaryButtonText}>Üye olmadan devam et</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.title}>Kayıt ol</Text>
          <View style={styles.roleRow}>
            <RoleButton label="Kullanıcı hesabı" active={accountType === 'customer'} onPress={() => setAccountType('customer')} />
            <RoleButton label="Satıcı hesabı" active={accountType === 'seller'} onPress={() => setAccountType('seller')} />
          </View>
          <Input placeholder="Ad soyad" value={register.name} onChangeText={(value) => updateRegister('name', value)} />
          <Input placeholder="Telefon" value={register.phone} onChangeText={(value) => updateRegister('phone', value)} keyboardType="phone-pad" />
          <Input placeholder="E-posta" value={register.email} onChangeText={(value) => updateRegister('email', value)} keyboardType="email-address" />
          <Text style={styles.helperText}>E-posta ve telefon doğrulaması gerçek backend aşamasında SMS/e-posta koduyla çalışacak.</Text>
          <Text style={styles.fieldLabel}>Şifre belirle</Text>
          <Input placeholder="Şifre" value={register.password} onChangeText={(value) => updateRegister('password', value)} secureTextEntry />
          <Text style={styles.helperText}>En az 4 karakter olmalı.</Text>
          <Input placeholder="İl" value={register.city} onChangeText={(value) => updateRegister('city', value)} />
          <Input placeholder="İlçe" value={register.district} onChangeText={(value) => updateRegister('district', value)} />
          <Input placeholder="Açık adres" value={register.address} onChangeText={(value) => updateRegister('address', value)} multiline />
          {accountType === 'seller' && (
            <>
              <Input placeholder="Firma adı" value={register.companyName} onChangeText={(value) => updateRegister('companyName', value)} />
              <Input placeholder="Vergi no / TCKN" value={register.taxNumber} onChangeText={(value) => updateRegister('taxNumber', value)} />
              <View style={styles.legalConsentBox}>
                <Text style={styles.fieldLabel}>Satış kanalı</Text>
                <ConsentRow
                  checked={register.sellerSimpleChannel}
                  text="Sade pazarda parametrelere göre seçilen satıcı modelinde ürün satmak istiyorum."
                  onPress={() => updateRegister('sellerSimpleChannel', !register.sellerSimpleChannel)}
                />
                <ConsentRow
                  checked={register.sellerVitrinChannel}
                  text="Vitrinde serbest fiyatlı ürün satmak istiyorum."
                  onPress={() => updateRegister('sellerVitrinChannel', !register.sellerVitrinChannel)}
                />
              </View>
            </>
          )}
          <View style={styles.legalConsentBox}>
            <Text style={styles.fieldLabel}>Yasal onaylar</Text>
            <Text style={styles.helperText}>Metinleri okumak için başlığa dokunabilirsin.</Text>
            {visibleLegalDocuments.map((document) => (
              <Pressable
                key={document.title}
                style={styles.legalLinkRow}
                onPress={() => setOpenLegalTitle(openLegalTitle === document.title ? null : document.title)}
              >
                <Text style={styles.legalLinkText}>{document.title}</Text>
                <Text style={styles.legalLinkMeta}>{openLegalTitle === document.title ? 'Kapat' : 'Oku'}</Text>
              </Pressable>
            ))}
            {openLegalDocument && (
              <View style={styles.legalPreviewBox}>
                <Text style={styles.listTitle}>{openLegalDocument.title}</Text>
                <Text style={styles.body}>{openLegalDocument.body}</Text>
              </View>
            )}
            <ConsentRow
              checked={register.kvkkAccepted}
              text="KVKK Aydınlatma Metni'ni okudum ve kişisel verilerimin işlenmesine ilişkin bilgilendirmeyi kabul ediyorum."
              onPress={() => updateRegister('kvkkAccepted', !register.kvkkAccepted)}
            />
            <ConsentRow
              checked={register.userAgreementAccepted}
              text="Kullanıcı Sözleşmesi, Mesafeli Satış Sözleşmesi ve İade/İptal/Teslimat koşullarını kabul ediyorum."
              onPress={() => updateRegister('userAgreementAccepted', !register.userAgreementAccepted)}
            />
            {accountType === 'seller' && (
              <ConsentRow
                checked={register.sellerAgreementAccepted}
                text="Satıcı Sözleşmesi'ni ve parametre bazlı ihale/satış modelinin koşullarını kabul ediyorum."
                onPress={() => updateRegister('sellerAgreementAccepted', !register.sellerAgreementAccepted)}
              />
            )}
          </View>
          <Pressable style={styles.primaryButton} onPress={saveProfile}>
            <Text style={styles.primaryButtonText}>Kayıt ol</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CustomerHome({
  products,
  categories,
  search,
  setSearch,
  filters,
  setFilters,
  selectedProduct,
  onSelectProduct,
  onAddToCart,
  reviews,
  savedItems,
  recommendations,
  newlyOpenedProducts,
  reorderReminders,
  experienceMode,
  toggleSavedItem,
  createSearchDemand,
  barcodeInput,
  setBarcodeInput,
  barcodeDemandNote,
  setBarcodeDemandNote,
  startBarcodeScanner,
  lookupBarcode,
  createBarcodeDemand,
}: {
  products: LiveProduct[];
  categories: MarketplaceCategory[];
  search: string;
  setSearch: (value: string) => void;
  filters: ProductFilters;
  setFilters: (value: ProductFilters | ((current: ProductFilters) => ProductFilters)) => void;
  selectedProduct?: LiveProduct;
  onSelectProduct: (id: string) => void;
  onAddToCart: (id: string) => void;
  reviews: Review[];
  savedItems: SavedItem[];
  recommendations: LiveProduct[];
  newlyOpenedProducts: LiveProduct[];
  reorderReminders: ReorderReminder[];
  experienceMode: ExperienceMode;
  toggleSavedItem: (targetType: 'product' | 'order', targetId: string) => void;
  createSearchDemand: () => void;
  barcodeInput: string;
  setBarcodeInput: (value: string) => void;
  barcodeDemandNote: string;
  setBarcodeDemandNote: (value: string) => void;
  startBarcodeScanner: (mode: BarcodeScannerMode) => void;
  lookupBarcode: (rawValue?: string) => void;
  createBarcodeDemand: () => void;
}) {
  if (!selectedProduct && products.length === 0) {
    const hasSearch = Boolean(search.trim());

    return (
      <View style={styles.stack}>
        <Text style={styles.welcome}>Ürünler</Text>
        <ProductSearchControls search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} categories={categories} />
        <BarcodeLookupPanel
          barcodeInput={barcodeInput}
          setBarcodeInput={setBarcodeInput}
          barcodeDemandNote={barcodeDemandNote}
          setBarcodeDemandNote={setBarcodeDemandNote}
          startBarcodeScanner={startBarcodeScanner}
          lookupBarcode={lookupBarcode}
          createBarcodeDemand={createBarcodeDemand}
        />
        <EmptyState
          title={search.trim() ? 'Sonuç yok' : 'Ürün yok'}
          text={search.trim()
            ? 'Aramana uygun satışta ürün bulunamadı.'
            : 'Ürünler satıcı talepleriyle ihaleye açılır. İhale sonuçlandığında burada seçilen aktif satıcının ürünü görünür.'}
        />
        {hasSearch && (
          <Pressable style={styles.secondaryButton} onPress={createSearchDemand}>
            <Text style={styles.secondaryButtonText}>Satışa açılırsa haber ver</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (selectedProduct) {
    const productReviews = reviews.filter((review) => review.productId === selectedProduct.id);
    const rating = getProductRating(productReviews);

    return (
      <View style={styles.stack}>
        <Pressable onPress={() => onSelectProduct('')}>
          <Text style={styles.backText}>Ürünlere dön</Text>
        </Pressable>
        <View style={styles.panel}>
          <SafeImage uri={selectedProduct.imageUrl} style={styles.detailImage} />
          <Text style={styles.title}>{selectedProduct.title}</Text>
          <Text style={styles.body}>{selectedProduct.description}</Text>
          <RatingSummary reviews={productReviews} />
          <InfoLine label="Satıcı" value={selectedProduct.sellerName} />
          <InfoLine label="Ürün puanı" value={rating.productText} />
          <InfoLine label="Satıcı puanı" value={rating.sellerText} />
          <InfoLine label="Fiyat" value={money(selectedProduct.price)} strong />
          <InfoLine label="Stok" value={`${selectedProduct.stock} adet`} />
          <InfoLine label="Teslimat" value={`${selectedProduct.deliveryDays} gün içinde kargo`} />
          <Pressable style={styles.primaryButton} onPress={() => onAddToCart(selectedProduct.id)}>
            <Text style={styles.primaryButtonText}>Sepete ekle</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => toggleSavedItem('product', selectedProduct.id)}>
            <Text style={styles.secondaryButtonText}>
              {isSaved(savedItems, 'product', selectedProduct.id) ? 'Kaydedilenlerden çıkar' : 'Kaydet'}
            </Text>
          </Pressable>
          {productReviews.length > 0 && (
            <View style={styles.reviewList}>
              <Text style={styles.sectionTitle}>Yorumlar</Text>
              {productReviews.map((review) => (
                <View key={review.id} style={styles.reviewRow}>
                  <Text style={styles.listTitle}>{review.customerName}</Text>
                  <Text style={styles.listMeta}>Ürün {review.productRating}/5 · Satıcı {review.sellerRating}/5</Text>
                  <Text style={styles.body}>{review.comment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Ürünler</Text>
      <ProductSearchControls search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} categories={categories} />
      <BarcodeLookupPanel
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        barcodeDemandNote={barcodeDemandNote}
        setBarcodeDemandNote={setBarcodeDemandNote}
        startBarcodeScanner={startBarcodeScanner}
        lookupBarcode={lookupBarcode}
        createBarcodeDemand={createBarcodeDemand}
      />
      {experienceMode === 'discovery' && newlyOpenedProducts.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.title}>Yeni açılan ürünler</Text>
          {newlyOpenedProducts.map((product) => (
            <ProductCard
              key={`new-${product.id}`}
              product={product}
              reviews={reviews.filter((review) => review.productId === product.id)}
              saved={isSaved(savedItems, 'product', product.id)}
              onToggleSaved={() => toggleSavedItem('product', product.id)}
              onPress={() => onSelectProduct(product.id)}
            />
          ))}
        </View>
      )}
      {reorderReminders.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.title}>Yakında bitebilir</Text>
          {reorderReminders.map((item) => (
            <View key={`${item.order.id}-${item.product.id}`} style={styles.reminderRow}>
              <View style={styles.cartInfo}>
                <Text style={styles.listTitle}>{item.product.title}</Text>
                <Text style={styles.listMeta}>
                  {item.daysLeft > 0 ? `Tahmini ${item.daysLeft} gün kaldı` : 'Bitmiş olabilir'} · {item.reason}
                </Text>
              </View>
              <Pressable style={styles.inlineSaveButton} onPress={() => onAddToCart(item.product.id)}>
                <Text style={styles.inlineSaveText}>Sepete ekle</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      {recommendations.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.title}>Sana uygun olabilir</Text>
          {recommendations.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              reviews={reviews.filter((review) => review.productId === product.id)}
              saved={isSaved(savedItems, 'product', product.id)}
              onToggleSaved={() => toggleSavedItem('product', product.id)}
              onPress={() => onSelectProduct(product.id)}
            />
          ))}
        </View>
      )}
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          reviews={reviews.filter((review) => review.productId === product.id)}
          saved={isSaved(savedItems, 'product', product.id)}
          onToggleSaved={() => toggleSavedItem('product', product.id)}
          onPress={() => onSelectProduct(product.id)}
        />
      ))}
    </View>
  );
}

function BarcodeLookupPanel({
  barcodeInput,
  setBarcodeInput,
  barcodeDemandNote,
  setBarcodeDemandNote,
  startBarcodeScanner,
  lookupBarcode,
  createBarcodeDemand,
}: {
  barcodeInput: string;
  setBarcodeInput: (value: string) => void;
  barcodeDemandNote: string;
  setBarcodeDemandNote: (value: string) => void;
  startBarcodeScanner: (mode: BarcodeScannerMode) => void;
  lookupBarcode: (rawValue?: string) => void;
  createBarcodeDemand: () => void;
}) {
  const hasBarcode = barcodeInput.trim().length > 0;

  return (
    <View style={styles.barcodePanel}>
      <View style={styles.sectionHeader}>
        <View style={styles.cartInfo}>
          <Text style={styles.listTitle}>Barkod ile bul</Text>
        </View>
      </View>
      <Input
        placeholder="Barkod numarası"
        value={barcodeInput}
        onChangeText={(value) => setBarcodeInput(normalizeBarcodeInput(value))}
        keyboardType="default"
      />
      <View style={styles.roleRow}>
        <Pressable style={styles.secondaryButtonCompact} onPress={() => startBarcodeScanner('customer')}>
          <Text style={styles.secondaryButtonText}>Kamerayla okut</Text>
        </Pressable>
        <Pressable style={styles.secondaryButtonCompact} onPress={() => lookupBarcode()}>
          <Text style={styles.secondaryButtonText}>Barkodu ara</Text>
        </Pressable>
      </View>
      {hasBarcode && (
        <>
          <Input
            placeholder="Ürün adı, marka veya paket bilgisi"
            value={barcodeDemandNote}
            onChangeText={setBarcodeDemandNote}
          />
          <Pressable style={styles.textButton} onPress={createBarcodeDemand}>
            <Text style={styles.textButtonText}>Bilinmeyen barkod için talep bırak</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function SearchScreen({
  search,
  setSearch,
  products,
  reviews,
  onSelectProduct,
}: {
  search: string;
  setSearch: (value: string) => void;
  products: LiveProduct[];
  reviews: Review[];
  onSelectProduct: (id: string) => void;
}) {
  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Ürün ara</Text>
      <Input placeholder="Marka, model veya satıcı ara" value={search} onChangeText={setSearch} />
      {products.length === 0 ? (
        <EmptyState title="Sonuç yok" text="Satışa açılmış ürün bulunmadığı için arama sonucu gösterilemiyor." />
      ) : (
        products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            reviews={reviews.filter((review) => review.productId === product.id)}
            onPress={() => onSelectProduct(product.id)}
          />
        ))
      )}
    </View>
  );
}

function ProductSearchControls({
  search,
  setSearch,
  filters,
  setFilters,
  categories,
}: {
  search: string;
  setSearch: (value: string) => void;
  filters: ProductFilters;
  setFilters: (value: ProductFilters | ((current: ProductFilters) => ProductFilters)) => void;
  categories: MarketplaceCategory[];
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = getActiveFilterCount(filters);

  return (
    <View style={styles.searchFilterWrap}>
      <View style={styles.searchRow}>
        <Pressable
          style={[styles.filterIconButton, filtersOpen && styles.filterIconButtonActive]}
          onPress={() => setFiltersOpen((current) => !current)}
        >
          <View style={[styles.filterIconLine, filtersOpen && styles.filterIconLineActive, { width: 18 }]} />
          <View style={[styles.filterIconLine, filtersOpen && styles.filterIconLineActive, { width: 12 }]} />
          <View style={[styles.filterIconLine, filtersOpen && styles.filterIconLineActive, { width: 6 }]} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
        <Input
          placeholder="Ürün, marka veya satıcı ara"
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>
      {filtersOpen && <ProductFilterPanel filters={filters} setFilters={setFilters} categories={categories} />}
    </View>
  );
}

function getActiveFilterCount(filters: ProductFilters) {
  return [
    filters.category !== 'Tümü',
    filters.subCategory !== 'Tümü',
    filters.segment !== 'Tümü',
    filters.sort !== 'Önerilen',
  ].filter(Boolean).length;
}

function ProductFilterPanel({
  filters,
  setFilters,
  categories,
}: {
  filters: ProductFilters;
  setFilters: (value: ProductFilters | ((current: ProductFilters) => ProductFilters)) => void;
  categories: MarketplaceCategory[];
}) {
  const update = (next: Partial<ProductFilters>) => {
    setFilters((current) => ({ ...current, ...next }));
  };

  const reset = () => setFilters(initialProductFilters);
  const selectedCategory = categories.find((item) => item.name === filters.category);
  const subCategories = selectedCategory?.subCategories ?? [];
  const segments = selectedCategory?.segments ?? [];

  return (
    <View style={styles.filterPanel}>
      <Text style={styles.filterTitle}>Kategori</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        {categories.map((item) => (
          <FilterChip
            key={item.name}
            label={item.name}
            active={filters.category === item.name}
            onPress={() => update({ category: item.name, subCategory: 'Tümü', segment: 'Tümü' })}
          />
        ))}
      </ScrollView>

      {subCategories.length > 0 && (
        <>
          <Text style={styles.filterTitle}>Alt kategori</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            {['Tümü', ...subCategories].map((item) => (
              <FilterChip key={item} label={item} active={filters.subCategory === item} onPress={() => update({ subCategory: item })} />
            ))}
          </ScrollView>
        </>
      )}

      {segments.length > 0 && (
        <>
          <Text style={styles.filterTitle}>Seçim grubu</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            {['Tümü', ...segments].map((item) => (
              <FilterChip key={item} label={item} active={filters.segment === item} onPress={() => update({ segment: item })} />
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.filterFooter}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {sortFilters.map((item) => (
            <FilterChip key={item} label={item} active={filters.sort === item} onPress={() => update({ sort: item })} />
          ))}
        </ScrollView>
        <Pressable style={styles.clearFiltersButton} onPress={reset}>
          <Text style={styles.clearFiltersText}>Temizle</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SavedScreen({
  savedItems,
  products,
  orders,
  reviews,
  onSelectProduct,
  toggleSavedItem,
}: {
  savedItems: SavedItem[];
  products: LiveProduct[];
  orders: Order[];
  reviews: Review[];
  onSelectProduct: (id: string) => void;
  toggleSavedItem: (targetType: 'product' | 'order', targetId: string) => void;
}) {
  const savedProducts = savedItems
    .filter((item) => item.targetType === 'product')
    .map((item) => products.find((product) => product.id === item.targetId))
    .filter((product): product is LiveProduct => Boolean(product));
  const savedOrders = savedItems
    .filter((item) => item.targetType === 'order')
    .map((item) => orders.find((order) => order.id === item.targetId))
    .filter((order): order is Order => Boolean(order));

  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Kaydedilenler</Text>
      {savedProducts.length === 0 && savedOrders.length === 0 ? (
        <EmptyState title="Kaydedilen yok" text="Ürünleri ve önemli siparişleri daha sonra kolayca bulmak için kaydedebilirsin." />
      ) : (
        <>
          {savedProducts.length > 0 && (
            <View style={styles.panel}>
              <Text style={styles.title}>Ürünler</Text>
              {savedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  reviews={reviews.filter((review) => review.productId === product.id)}
                  saved
                  onToggleSaved={() => toggleSavedItem('product', product.id)}
                  onPress={() => onSelectProduct(product.id)}
                />
              ))}
            </View>
          )}
          {savedOrders.length > 0 && (
            <View style={styles.panel}>
              <Text style={styles.title}>Siparişler</Text>
              {savedOrders.map((order) => (
                <View key={order.id} style={styles.savedOrderRow}>
              <SafeImage uri={order.imageUrl} style={styles.cartImage} />
                  <View style={styles.cartInfo}>
                    <Text style={styles.listTitle}>{order.title}</Text>
                    <Text style={styles.listMeta}>{order.status} · {money(order.total)}</Text>
                    <Pressable style={styles.textButton} onPress={() => toggleSavedItem('order', order.id)}>
                      <Text style={styles.textButtonText}>Kaydedilenlerden çıkar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

function CartScreen({
  lines,
  total,
  addresses,
  selectedAddressId,
  selectAddress,
  paymentMethod,
  setPaymentMethod,
  updateQuantity,
  checkout,
  goShopping,
}: {
  lines: { item: CartItem; product: LiveProduct }[];
  total: number;
  addresses: Address[];
  selectedAddressId: string;
  selectAddress: (id: string) => void;
  paymentMethod: 'Kart' | 'Kapıda ödeme';
  setPaymentMethod: (method: 'Kart' | 'Kapıda ödeme') => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  checkout: () => void;
  goShopping: () => void;
}) {
  if (lines.length === 0) {
    return (
      <View style={styles.stack}>
        <Text style={styles.welcome}>Sepetim</Text>
        <EmptyState title="Sepetin boş" text="Tek satıcılı, net fiyatlı ürünler satışa açıldığında buradan hızlıca sipariş verebilirsin." />
        <Pressable style={styles.primaryButton} onPress={goShopping}>
          <Text style={styles.primaryButtonText}>Ürünlere bak</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Sepetim</Text>
      {lines.map(({ item, product }) => (
        <View key={item.id} style={styles.cartRow}>
          <SafeImage uri={product.imageUrl} style={styles.cartImage} />
          <View style={styles.cartInfo}>
            <Text style={styles.listTitle}>{product.title}</Text>
            <Text style={styles.listMeta}>{money(product.price)} · {product.sellerName}</Text>
            <View style={styles.quantityRow}>
              <Pressable style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                <Text style={styles.quantityText}>-</Text>
              </Pressable>
              <Text style={styles.quantityCount}>{item.quantity}</Text>
              <Pressable style={styles.quantityButton} onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                <Text style={styles.quantityText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
      <View style={styles.summaryPanel}>
        <Text style={styles.title}>Teslimat adresi</Text>
        {addresses.length === 0 ? (
          <Text style={styles.body}>Profilinden en az bir adres eklemelisin.</Text>
        ) : (
          addresses.map((address) => (
            <Pressable
              key={address.id}
              style={[styles.addressChoice, selectedAddressId === address.id && styles.addressChoiceActive]}
              onPress={() => selectAddress(address.id)}
            >
              <Text style={styles.listTitle}>{address.title}</Text>
              <Text style={styles.listMeta}>{address.city} / {address.district} · {address.detail}</Text>
            </Pressable>
          ))
        )}
        <Text style={styles.title}>Ödeme</Text>
        <View style={styles.roleRow}>
          <RoleButton label="Kart" active={paymentMethod === 'Kart'} onPress={() => setPaymentMethod('Kart')} />
          <RoleButton label="Kapıda" active={paymentMethod === 'Kapıda ödeme'} onPress={() => setPaymentMethod('Kapıda ödeme')} />
        </View>
        <Text style={styles.label}>Toplam</Text>
        <Text style={styles.summaryTotal}>{money(total)}</Text>
        <Pressable style={styles.primaryButton} onPress={checkout}>
          <Text style={styles.primaryButtonText}>Siparişi tamamla</Text>
        </Pressable>
      </View>
    </View>
  );
}

function OrdersScreen({
  orders,
  reviews,
  profile,
  submitReview,
  advanceOrderStatus,
  savedItems,
  toggleSavedItem,
}: {
  orders: Order[];
  reviews: Review[];
  profile: Profile;
  submitReview: (order: Order, productRating: number, sellerRating: number, comment: string) => void;
  advanceOrderStatus: (orderId: string) => void;
  savedItems: SavedItem[];
  toggleSavedItem: (targetType: 'product' | 'order', targetId: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, { productRating: number; sellerRating: number; comment: string }>>({});
  const [statusFilter, setStatusFilter] = useState<'Tümü' | Order['status']>('Tümü');
  const filteredOrders = statusFilter === 'Tümü'
    ? orders
    : orders.filter((order) => order.status === statusFilter);
  const activeCount = orders.filter((order) => order.status !== 'Teslim edildi').length;
  const shippedCount = orders.filter((order) => order.status === 'Kargoda').length;
  const deliveredCount = orders.filter((order) => order.status === 'Teslim edildi').length;
  const updateDraft = (orderId: string, values: Partial<{ productRating: number; sellerRating: number; comment: string }>) => {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        productRating: current[orderId]?.productRating ?? 5,
        sellerRating: current[orderId]?.sellerRating ?? 5,
        comment: current[orderId]?.comment ?? '',
        ...values,
      },
    }));
  };

  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>{profile.role === 'seller' ? 'Gelen siparişler' : 'Siparişlerim'}</Text>
      <View style={styles.orderSummaryGrid}>
        <View style={styles.orderSummaryBox}>
          <Text style={styles.metricValue}>{activeCount}</Text>
          <Text style={styles.metricLabel}>Aktif</Text>
        </View>
        <View style={styles.orderSummaryBox}>
          <Text style={styles.metricValue}>{shippedCount}</Text>
          <Text style={styles.metricLabel}>Yolda</Text>
        </View>
        <View style={styles.orderSummaryBox}>
          <Text style={styles.metricValue}>{deliveredCount}</Text>
          <Text style={styles.metricLabel}>Teslim</Text>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
        {(['Tümü', mapStatus('PREPARING'), mapStatus('SHIPPED'), mapStatus('DELIVERED')] as Array<'Tümü' | Order['status']>).map((item) => (
          <FilterChip key={item} label={item} active={statusFilter === item} onPress={() => setStatusFilter(item)} />
        ))}
      </ScrollView>
      {orders.length === 0 ? (
        <EmptyState title="Sipariş yok" text="Satın aldığın ürünler burada sakin ve takip edilebilir şekilde listelenir." />
      ) : filteredOrders.length === 0 ? (
        <EmptyState title="Bu durumda sipariş yok" text="Başka bir filtre seçerek diğer siparişleri görebilirsin." />
      ) : (
        filteredOrders.map((order) => {
          const existingReview = reviews.find((review) => review.orderId === order.id);
          const draft = drafts[order.id] ?? { productRating: 5, sellerRating: 5, comment: '' };

          return (
            <View key={order.id} style={styles.panel}>
          <SafeImage uri={order.imageUrl} style={styles.orderImage} />
              <Text style={styles.listTitle}>{order.title}</Text>
              <Text style={styles.listMeta}>{order.sellerName} · {order.quantity} adet · {money(order.total)}</Text>
              <InfoLine label="Sipariş no" value={order.orderNumber ?? order.id} />
              <InfoLine label="Durum" value={order.status} />
              <InfoLine label="Ödeme" value={`${order.paymentMethod ?? 'Kart'} · ${order.paymentStatus ?? 'Ödendi'}`} />
              <InfoLine label="Teslimat adresi" value={order.address} />
              <InfoLine label="Tarih" value={new Date(order.createdAt).toLocaleDateString('tr-TR')} />
              {profile.role === 'customer' && (
                <Pressable style={styles.secondaryButton} onPress={() => toggleSavedItem('order', order.id)}>
                  <Text style={styles.secondaryButtonText}>
                    {isSaved(savedItems, 'order', order.id) ? 'Kaydedilenlerden çıkar' : 'Siparişi kaydet'}
                  </Text>
                </Pressable>
              )}
              {profile.role === 'seller' && order.status !== 'Teslim edildi' && (
                <Pressable style={styles.secondaryButton} onPress={() => advanceOrderStatus(order.id)}>
                  <Text style={styles.secondaryButtonText}>
                    {order.status === 'Hazırlanıyor' ? 'Kargoya ver' : 'Teslim edildi yap'}
                  </Text>
                </Pressable>
              )}
              {profile.role === 'customer' && (
                order.status !== 'Teslim edildi' ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.sectionTitle}>Değerlendirme kapalı</Text>
                  </View>
                ) : existingReview ? (
                  <View style={styles.reviewRow}>
                    <Text style={styles.sectionTitle}>Değerlendirmen</Text>
                    <Text style={styles.listMeta}>Ürün {existingReview.productRating}/5 · Satıcı {existingReview.sellerRating}/5</Text>
                    <Text style={styles.body}>{existingReview.comment}</Text>
                  </View>
                ) : (
                  <View style={styles.reviewForm}>
                    <Text style={styles.sectionTitle}>Değerlendir</Text>
                    <RatingPicker
                      label="Ürün puanı"
                      value={draft.productRating}
                      onChange={(value) => updateDraft(order.id, { productRating: value })}
                    />
                    <RatingPicker
                      label="Satıcı puanı"
                      value={draft.sellerRating}
                      onChange={(value) => updateDraft(order.id, { sellerRating: value })}
                    />
                    <Input
                      placeholder="Yorumun"
                      value={draft.comment}
                      onChangeText={(value) => updateDraft(order.id, { comment: value })}
                      multiline
                    />
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => submitReview(order, draft.productRating, draft.sellerRating, draft.comment)}
                    >
                      <Text style={styles.secondaryButtonText}>Değerlendirmeyi gönder</Text>
                    </Pressable>
                  </View>
                )
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

function SellerDashboard({
  profile,
  requests,
  bids,
  products,
  vitrinProducts,
  orders,
  onNavigate,
}: {
  profile: Profile;
  requests: Auction[];
  bids: Bid[];
  products: LiveProduct[];
  vitrinProducts: InfluencerProduct[];
  orders: Order[];
  onNavigate: (tab: Tab) => void;
}) {
  const todayRevenue = getRevenueForDays(orders, 1);
  const preparingOrders = orders.filter((order) => order.status === 'Hazırlanıyor').length;
  const shippedOrders = orders.filter((order) => order.status === 'Kargoda').length;
  const lowStockProducts = products.filter((product) => product.stock <= 5);
  const openRequests = requests.filter((request) => request.status !== 'completed').length;

  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Satıcı paneli · {profile.companyName || profile.name}</Text>
      <View style={styles.metricsGrid}>
        <MetricBox label="Talepler" value={requests.length.toString()} onPress={() => onNavigate('sellerRequests')} />
        <MetricBox label="Teklifler" value={bids.length.toString()} onPress={() => onNavigate('sellerBids')} />
        <MetricBox label="Ürünler" value={products.length.toString()} onPress={() => onNavigate('sellerProducts')} />
        <MetricBox label="Vitrin" value={vitrinProducts.length.toString()} onPress={() => onNavigate('influencer')} />
        <MetricBox label="Siparişler" value={orders.length.toString()} onPress={() => onNavigate('orders')} />
      </View>
      <Pressable style={styles.revenueBox} onPress={() => onNavigate('sellerRevenue')}>
        <Text style={styles.label}>Mevcut durum</Text>
        <Text style={styles.summaryTotal}>{money(todayRevenue)}</Text>
        <Text style={styles.listMeta}>Bugünkü ciro · detay için dokun</Text>
      </Pressable>
      <View style={styles.panel}>
        <Text style={styles.title}>Operasyon özeti</Text>
        <InfoLine label="Hazırlanacak sipariş" value={preparingOrders.toString()} />
        <InfoLine label="Yoldaki sipariş" value={shippedOrders.toString()} />
        <InfoLine label="Açık talep/ihale" value={openRequests.toString()} />
        <InfoLine label="Düşük stok uyarısı" value={lowStockProducts.length ? `${lowStockProducts.length} ürün` : 'Yok'} />
      </View>
      {orders.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.title}>Son siparişler</Text>
          {orders.slice(0, 3).map((order) => (
            <View key={order.id} style={styles.bidRow}>
              <Text style={styles.listTitle}>{order.orderNumber}</Text>
              <Text style={styles.listMeta}>{order.title} · {order.status} · {money(order.total)}</Text>
            </View>
          ))}
        </View>
      )}
      {lowStockProducts.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.title}>Düşük stok</Text>
          {lowStockProducts.map((product) => (
            <View key={product.id} style={styles.bidRow}>
              <Text style={styles.listTitle}>{product.title}</Text>
              <Text style={styles.listMeta}>{product.stock} stok kaldı</Text>
            </View>
          ))}
        </View>
      )}
      {products.length > 0 && (
        <View style={styles.panel}>
          <Text style={styles.title}>Yayındaki ürünlerim</Text>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onPress={() => {}} />
          ))}
        </View>
      )}
    </View>
  );
}

function SellerRequestsScreen({
  profile,
  request,
  requests,
  categories,
  updateRequest,
  createAuction,
  pickRequestImage,
  scanBarcode,
}: {
  profile: Profile;
  request: { category: Category; categoryName: string; subCategoryName: string; segmentName: string; petType: PetFilter; petSubCategory: PetSubFilter; babySubCategory: BabyFilter; brand: string; model: string; packageInfo: string; barcode: string; imageUrl: string; description: string };
  requests: Auction[];
  categories: MarketplaceCategory[];
  updateRequest: (key: keyof typeof request, value: string) => void;
  createAuction: () => void;
  pickRequestImage: () => void;
  scanBarcode: () => void;
}) {
  const selectedCategory = categories.find((item) => item.name === request.categoryName) ?? categories.find((item) => item.name !== 'Tümü') ?? marketplaceCategories[1];

  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Taleplerim · {profile.companyName || profile.name}</Text>
      <View style={styles.panel}>
        <Text style={styles.title}>Yeni ürün talebi</Text>
        <Text style={styles.filterTitle}>Sektör</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
          {categories.filter((item) => item.name !== 'Tümü').map((item) => (
            <FilterChip key={item.name} label={item.name} active={request.categoryName === item.name} onPress={() => updateRequest('categoryName', item.name)} />
          ))}
        </ScrollView>
        {selectedCategory.subCategories.length > 0 && (
          <>
            <Text style={styles.filterTitle}>Alt kategori</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {selectedCategory.subCategories.map((item) => (
                <FilterChip key={item} label={item} active={request.subCategoryName === item} onPress={() => updateRequest('subCategoryName', item)} />
              ))}
            </ScrollView>
          </>
        )}
        {selectedCategory.segments.length > 0 && (
          <>
            <Text style={styles.filterTitle}>Seçim grubu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
              {selectedCategory.segments.map((item) => (
                <FilterChip key={item} label={item} active={request.segmentName === item} onPress={() => updateRequest('segmentName', item)} />
              ))}
            </ScrollView>
          </>
        )}
        <Input placeholder="Marka" value={request.brand} onChangeText={(value) => updateRequest('brand', value)} />
        <Input placeholder="Model / seri" value={request.model} onChangeText={(value) => updateRequest('model', value)} />
        <Input placeholder="Paket standardı: 10 kg, 4 numara 120 adet..." value={request.packageInfo} onChangeText={(value) => updateRequest('packageInfo', value)} />
        <Input
          placeholder="Barkod (opsiyonel)"
          value={request.barcode}
          onChangeText={(value) => updateRequest('barcode', normalizeBarcodeInput(value))}
        />
        <Pressable style={styles.secondaryButtonCompact} onPress={scanBarcode}>
          <Text style={styles.secondaryButtonText}>Barkod okut</Text>
        </Pressable>
        <Input placeholder="Görsel URL" value={request.imageUrl} onChangeText={(value) => updateRequest('imageUrl', value)} />
        <Pressable style={styles.uploadBox} onPress={pickRequestImage}>
          {request.imageUrl ? (
            <SafeImage uri={request.imageUrl} style={styles.uploadPreview} />
          ) : (
            <>
              <Text style={styles.listTitle}>Fotoğraf seç</Text>
            </>
          )}
        </Pressable>
        <Input placeholder="Ürün açıklaması ve zorunlu şartlar" value={request.description} onChangeText={(value) => updateRequest('description', value)} multiline />
        <Pressable style={styles.primaryButton} onPress={createAuction}>
          <Text style={styles.primaryButtonText}>Talebi gönder</Text>
        </Pressable>
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Gönderdiğim talepler</Text>
        {requests.length === 0 ? (
          <Text style={styles.body}>Talep yok</Text>
        ) : (
          requests.map((item) => (
            <View key={item.id} style={styles.auctionBox}>
              <Text style={styles.listTitle}>{item.brand} {item.model}</Text>
              <Text style={styles.listMeta}>
                {item.packageInfo} ? {item.status === 'requested' ? 'Y?netici onay? bekliyor' : item.status === 'open' ? '?halede' : 'Sonu?land?'}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function SellerBidsScreen({
  bid,
  openAuctions,
  auctionRows,
  updateBid,
  createBid,
  bids,
  auctions,
}: {
  bid: { auctionId: string; price: string; stock: string; deliveryDays: string; note: string };
  openAuctions: Auction[];
  auctionRows: { auction: Auction; bids: Bid[] }[];
  updateBid: (key: keyof typeof bid, value: string) => void;
  createBid: () => void;
  bids: Bid[];
  auctions: Auction[];
}) {
  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Tekliflerim</Text>
      <View style={styles.panel}>
        <Text style={styles.title}>Açık ihaleler</Text>
        {openAuctions.length === 0 ? (
          <Text style={styles.body}>Şu an açık ihale yok.</Text>
        ) : (
          auctionRows.map(({ auction, bids: auctionBids }) => (
            <View key={auction.id} style={styles.auctionBox}>
              <Text style={styles.listTitle}>{auction.brand} {auction.model} {auction.packageInfo}</Text>
              <Text style={styles.listMeta}>{auction.category} · Bitiş: {new Date(auction.endsAt).toLocaleDateString('tr-TR')} · {auctionBids.length} teklif</Text>
              <Pressable style={styles.secondaryButton} onPress={() => updateBid('auctionId', auction.id)}>
                <Text style={styles.secondaryButtonText}>Bu ihaleye teklif ver</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Teklif bilgileri</Text>
        <Input placeholder="İhale ID otomatik seçilir" value={bid.auctionId} onChangeText={(value) => updateBid('auctionId', value)} />
        <Input placeholder="Satış fiyatı" value={bid.price} onChangeText={(value) => updateBid('price', value)} keyboardType="numeric" />
        <Input placeholder="Stok adedi" value={bid.stock} onChangeText={(value) => updateBid('stock', value)} keyboardType="numeric" />
        <Input placeholder="Kargo süresi, gün" value={bid.deliveryDays} onChangeText={(value) => updateBid('deliveryDays', value)} keyboardType="numeric" />
        <Input placeholder="Teklif notu" value={bid.note} onChangeText={(value) => updateBid('note', value)} multiline />
        <Pressable style={styles.primaryButton} onPress={createBid}>
          <Text style={styles.primaryButtonText}>Teklifi kaydet</Text>
        </Pressable>
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Verdiğim teklifler</Text>
        {bids.length === 0 ? (
          <Text style={styles.body}>Teklif yok</Text>
        ) : (
          bids.map((item) => {
            const auction = auctions.find((auctionItem) => auctionItem.id === item.auctionId);
            return (
              <View key={item.id} style={styles.bidRow}>
                <Text style={styles.listTitle}>{auction ? `${auction.brand} ${auction.model}` : 'İhale'}</Text>
                <Text style={styles.listMeta}>{money(item.price)} · {item.stock} stok · {item.deliveryDays} gün kargo</Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

function SellerProductsScreen({ products, reviews }: { products: LiveProduct[]; reviews: Review[] }) {
  const activeStock = products.reduce((sum, product) => sum + product.stock, 0);
  const averagePrice = products.length
    ? products.reduce((sum, product) => sum + product.price, 0) / products.length
    : 0;

  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Ürünlerim</Text>
      <View style={styles.orderSummaryGrid}>
        <View style={styles.orderSummaryBox}>
          <Text style={styles.metricValue}>{products.length}</Text>
          <Text style={styles.metricLabel}>Yayında</Text>
        </View>
        <View style={styles.orderSummaryBox}>
          <Text style={styles.metricValue}>{activeStock}</Text>
          <Text style={styles.metricLabel}>Toplam stok</Text>
        </View>
        <View style={styles.orderSummaryBox}>
          <Text style={styles.metricValue}>{money(averagePrice)}</Text>
          <Text style={styles.metricLabel}>Ortalama fiyat</Text>
        </View>
      </View>
      {products.length === 0 ? (
        <EmptyState title="Yayında ürün yok" text="Kazandığın ihaleler satışa açıldığında ürünlerin burada görünür." />
      ) : (
        products.map((product) => {
          const productReviews = reviews.filter((review) => review.productId === product.id);
          return (
            <View key={product.id} style={styles.panel}>
              <ProductCard product={product} reviews={productReviews} onPress={() => {}} />
              <InfoLine label="Stok" value={product.stock.toString()} />
              <InfoLine label="Kargo süresi" value={`${product.deliveryDays} gün`} />
              <InfoLine label="Puan" value={getProductRating(productReviews).productText} />
            </View>
          );
        })
      )}
    </View>
  );
}

function SellerVitrinProductsScreen({
  products,
  draft,
  setDraft,
  pickImages,
  submit,
}: {
  products: InfluencerProduct[];
  draft: {
    title: string;
    description: string;
    imageUrl: string;
    imageUrls: string[];
    priceText: string;
    detailText: string;
    sizesText: string;
    colorsText: string;
    linkText: string;
    stockText: string;
  };
  setDraft: (value: SetStateAction<{
    title: string;
    description: string;
    imageUrl: string;
    imageUrls: string[];
    priceText: string;
    detailText: string;
    sizesText: string;
    colorsText: string;
    linkText: string;
    stockText: string;
  }>) => void;
  pickImages: () => void;
  submit: () => void;
}) {
  const draftImages = uniqueMediaList(draft.imageUrl, draft.imageUrls);

  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Vitrin ürünleri</Text>
      <Text style={styles.body}>
        Bu ürünler sade pazardaki ihale ürünlerinden ayrı tutulur. Influencerlar paylaşım yaparken bu havuzdan ürün bağlar; sipariş sorumluluğu satıcıda kalır.
      </Text>
      <View style={styles.panel}>
        <Text style={styles.title}>Yeni vitrin ürünü</Text>
        <Pressable style={styles.vitrinProductHeroPicker} onPress={pickImages}>
          {draftImages.length > 0 ? (
            <SafeImage uri={draftImages[0]} style={styles.vitrinProductHeroImage} />
          ) : (
            <Text style={styles.body}>Ürün görselleri seç</Text>
          )}
          {draftImages.length > 1 && <Text style={styles.vitrinMediaCount}>{draftImages.length} görsel</Text>}
        </Pressable>
        {draftImages.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitrinThumbRail}>
            {draftImages.map((uri) => (
              <SafeImage key={`seller-vitrin-${uri}`} uri={uri} style={styles.vitrinThumbImage} />
            ))}
          </ScrollView>
        )}
        <Input placeholder="Ürün adı" value={draft.title} onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))} />
        <Input placeholder="Fiyat: 1.249 TL" value={draft.priceText} onChangeText={(value) => setDraft((current) => ({ ...current, priceText: value }))} />
        <Input placeholder="Stok / kampanya bilgisi" value={draft.stockText} onChangeText={(value) => setDraft((current) => ({ ...current, stockText: value }))} />
        <Input placeholder="Influencer etiketi: çanta, ayakkabı, takı" value={draft.linkText} onChangeText={(value) => setDraft((current) => ({ ...current, linkText: value }))} />
        <Input placeholder="Bedenler: S, M, L veya 36, 37, 38" value={draft.sizesText} onChangeText={(value) => setDraft((current) => ({ ...current, sizesText: value }))} />
        <Input placeholder="Renkler: Siyah, Beyaz, Bej" value={draft.colorsText} onChangeText={(value) => setDraft((current) => ({ ...current, colorsText: value }))} />
        <Input placeholder="Kısa açıklama" value={draft.description} onChangeText={(value) => setDraft((current) => ({ ...current, description: value }))} multiline />
        <Input placeholder="Detaylar: kumaş, ölçü, garanti, kargo notu" value={draft.detailText} onChangeText={(value) => setDraft((current) => ({ ...current, detailText: value }))} multiline />
        <Pressable style={styles.primaryButton} onPress={submit}>
          <Text style={styles.primaryButtonText}>Vitrin ürününü kaydet</Text>
        </Pressable>
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Kayıtlı vitrin ürünleri</Text>
        {products.length === 0 ? (
          <Text style={styles.body}>Vitrin ürünü yok</Text>
        ) : (
          products.map((product) => (
            <View key={product.id} style={styles.vitrinLibraryRow}>
              <SafeImage uri={productImageList(product)[0] ?? product.imageUrl} style={styles.vitrinLibraryImage} />
              <View style={styles.cartInfo}>
                <Text style={styles.listTitle}>{product.title}</Text>
                <Text style={styles.listMeta}>{product.priceText}{product.stockText ? ` · ${product.stockText}` : ''}</Text>
                <Text style={styles.listMeta}>{[...(product.sizes ?? []), ...(product.colors ?? [])].slice(0, 4).join(' · ') || 'Seçenek girilmedi'}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function SellerRevenueScreen({ orders }: { orders: Order[] }) {
  const stats = [
    { label: 'Bugün', value: getRevenueForDays(orders, 1) },
    { label: 'Bu hafta', value: getRevenueForDays(orders, 7) },
    { label: 'Bu ay', value: getRevenueForDays(orders, 30) },
    { label: 'Bu yıl', value: getRevenueForDays(orders, 365) },
  ];
  const max = Math.max(...stats.map((item) => item.value), 1);

  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Ciro</Text>
      <View style={styles.panel}>
        {stats.map((item) => (
          <View key={item.label} style={styles.revenueRow}>
            <View style={styles.revenueHeader}>
              <Text style={styles.listTitle}>{item.label}</Text>
              <Text style={styles.listMeta}>{money(item.value)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(8, (item.value / max) * 100)}%` }]} />
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.body}>Bu demo ciro hesabı verilen siparişlerin toplam tutarından hesaplanır. Gerçek üründe ödeme durumu, iade ve komisyon sonrası net hak ediş ayrıca hesaplanır.</Text>
    </View>
  );
}

function SellerHome({
  profile,
  request,
  bid,
  openAuctions,
  auctionRows,
  updateRequest,
  updateBid,
  createAuction,
  createBid,
}: {
  profile: Profile;
  request: { category: Category; categoryName: string; subCategoryName: string; segmentName: string; petType: PetFilter; petSubCategory: PetSubFilter; babySubCategory: BabyFilter; brand: string; model: string; packageInfo: string; barcode: string; imageUrl: string; description: string };
  bid: { auctionId: string; price: string; stock: string; deliveryDays: string; note: string };
  openAuctions: Auction[];
  auctionRows: { auction: Auction; bids: Bid[] }[];
  updateRequest: (key: keyof typeof request, value: string) => void;
  updateBid: (key: keyof typeof bid, value: string) => void;
  createAuction: () => void;
  createBid: () => void;
}) {
  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Satıcı paneli · {profile.companyName || profile.name}</Text>

      <View style={styles.panel}>
        <Text style={styles.title}>Ürün talebi oluştur</Text>
        <View style={styles.roleRow}>
          <RoleButton label="Pet" active={request.category === 'Pet'} onPress={() => updateRequest('category', 'Pet')} />
          <RoleButton label="Bebek" active={request.category === 'Bebek'} onPress={() => updateRequest('category', 'Bebek')} />
        </View>
        <Input placeholder="Marka" value={request.brand} onChangeText={(value) => updateRequest('brand', value)} />
        <Input placeholder="Model / seri" value={request.model} onChangeText={(value) => updateRequest('model', value)} />
        <Input placeholder="Paket standardı: 10 kg, 4 numara 120 adet..." value={request.packageInfo} onChangeText={(value) => updateRequest('packageInfo', value)} />
        <Input placeholder="Görsel URL" value={request.imageUrl} onChangeText={(value) => updateRequest('imageUrl', value)} />
        <Input placeholder="Ürün açıklaması ve zorunlu şartlar" value={request.description} onChangeText={(value) => updateRequest('description', value)} multiline />
        <Pressable style={styles.primaryButton} onPress={createAuction}>
          <Text style={styles.primaryButtonText}>İhaleye açılmasını talep et</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <Text style={styles.title}>Açık ihalelere teklif ver</Text>
        {openAuctions.length === 0 ? (
          <Text style={styles.body}>Şu an açık ihale yok.</Text>
        ) : (
          auctionRows.map(({ auction, bids }) => (
            <View key={auction.id} style={styles.auctionBox}>
              <Text style={styles.listTitle}>{auction.brand} {auction.model} {auction.packageInfo}</Text>
              <Text style={styles.listMeta}>{auction.category} · Bitiş: {new Date(auction.endsAt).toLocaleDateString('tr-TR')} · {bids.length} teklif</Text>
              <Pressable style={styles.secondaryButton} onPress={() => updateBid('auctionId', auction.id)}>
                <Text style={styles.secondaryButtonText}>Bu ihaleye teklif ver</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.title}>Teklif bilgileri</Text>
        <Input placeholder="İhale ID otomatik seçilir" value={bid.auctionId} onChangeText={(value) => updateBid('auctionId', value)} />
        <Input placeholder="Satış fiyatı" value={bid.price} onChangeText={(value) => updateBid('price', value)} keyboardType="numeric" />
        <Input placeholder="Stok adedi" value={bid.stock} onChangeText={(value) => updateBid('stock', value)} keyboardType="numeric" />
        <Input placeholder="Kargo süresi, gün" value={bid.deliveryDays} onChangeText={(value) => updateBid('deliveryDays', value)} keyboardType="numeric" />
        <Input placeholder="Teklif notu" value={bid.note} onChangeText={(value) => updateBid('note', value)} multiline />
        <Pressable style={styles.primaryButton} onPress={createBid}>
          <Text style={styles.primaryButtonText}>Teklifi kaydet</Text>
        </Pressable>
      </View>
    </View>
  );
}

function AdminScreen({
  auctionRows,
  completeAuction,
}: {
  auctionRows: { auction: Auction; bids: Bid[] }[];
  completeAuction: (auctionId: string) => void;
}) {
  return (
    <View style={styles.stack}>
      <Text style={styles.welcome}>Yönetim</Text>
      <Text style={styles.body}>Demo admin alanı. Gerçek uygulamada bu kısım sadece platform sahibine açık olur.</Text>
      {auctionRows.length === 0 ? (
        <EmptyState title="Açık ihale yok" text="Satıcılar ürün talebi oluşturduğunda teklifler burada görüntülenir." />
      ) : (
        auctionRows.map(({ auction, bids }) => (
          <View key={auction.id} style={styles.panel}>
            <SafeImage uri={auction.imageUrl} style={styles.detailImage} />
            <Text style={styles.title}>{auction.brand} {auction.model}</Text>
            <Text style={styles.body}>{auction.packageInfo}</Text>
            <InfoLine label="Talep eden" value={auction.requestedBySellerName} />
            <InfoLine label="İhale bitiş" value={new Date(auction.endsAt).toLocaleDateString('tr-TR')} />
            <Text style={styles.sectionTitle}>Teklifler</Text>
            {bids.length === 0 ? (
          <Text style={styles.body}>Teklif yok</Text>
            ) : (
              bids.map((item) => (
                <View key={item.id} style={styles.bidRow}>
                  <Text style={styles.listTitle}>{item.sellerName}</Text>
                  <Text style={styles.listMeta}>{money(item.price)} · {item.stock} stok · {item.deliveryDays} gün kargo</Text>
                  {!!item.note && <Text style={styles.body}>{item.note}</Text>}
                </View>
              ))
            )}
            <Pressable style={styles.primaryButton} onPress={() => completeAuction(auction.id)}>
              <Text style={styles.primaryButtonText}>Kazananı seç ve satışa aç</Text>
            </Pressable>
          </View>
        ))
      )}
    </View>
  );
}

function ProfileScreen({
  profile,
  addresses,
  newAddress,
  setNewAddress,
  addAddress,
  updateProfile,
  logout,
}: {
  profile: Profile;
  addresses: Address[];
  newAddress: { title: string; city: string; district: string; detail: string };
  setNewAddress: (address: { title: string; city: string; district: string; detail: string }) => void;
  addAddress: () => void;
  updateProfile: (values: ProfileUpdate) => void;
  logout: () => void;
}) {
  const [settingsView, setSettingsView] = useState<'home' | 'menu' | 'account' | 'addresses' | 'preferences'>('home');
  const [draft, setDraft] = useState({
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    companyName: profile.companyName ?? '',
    taxNumber: profile.taxNumber ?? '',
    experienceMode: profile.experienceMode,
    notificationPreferences: profile.notificationPreferences,
  });

  useEffect(() => {
    setDraft({
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      companyName: profile.companyName ?? '',
      taxNumber: profile.taxNumber ?? '',
      experienceMode: profile.experienceMode,
      notificationPreferences: profile.notificationPreferences,
    });
  }, [profile.id, profile.name, profile.phone, profile.email, profile.companyName, profile.taxNumber, profile.experienceMode, profile.notificationPreferences]);

  const setExperienceMode = (experienceMode: ExperienceMode) => {
    setDraft((current) => ({
      ...current,
      experienceMode,
      notificationPreferences: {
        ...current.notificationPreferences,
        newProducts: experienceMode === 'discovery',
        campaigns: experienceMode === 'discovery',
      },
    }));
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    setDraft((current) => ({
      ...current,
      notificationPreferences: {
        ...current.notificationPreferences,
        [key]: !current.notificationPreferences[key],
      },
    }));
  };

  const SettingsHeader = ({ title }: { title: string }) => (
    <View style={styles.profileTop}>
      <Pressable style={styles.textButton} onPress={() => setSettingsView(settingsView === 'menu' ? 'home' : 'menu')}>
        <Text style={styles.backText}>{settingsView === 'menu' ? 'Profile dön' : 'Ayarlar'}</Text>
      </Pressable>
      <Text style={styles.welcome}>{title}</Text>
    </View>
  );

  if (settingsView === 'home') {
    return (
      <View style={styles.stack}>
        <View style={styles.profileTop}>
          <View>
            <Text style={styles.welcome}>Profil</Text>
          </View>
          <Pressable
            accessibilityLabel="Ayarlar"
            accessibilityRole="button"
            hitSlop={8}
            style={styles.settingsIconButton}
            onPress={() => setSettingsView('menu')}
          >
            <View style={[styles.settingsIconLine, { width: 20 }]} />
            <View style={[styles.settingsIconLine, { width: 16 }]} />
            <View style={[styles.settingsIconLine, { width: 12 }]} />
          </Pressable>
        </View>
        <View style={styles.panel}>
          <InfoLine label="Ad soyad" value={profile.name} />
          <InfoLine label="Telefon" value={profile.phone} />
          <InfoLine label="E-posta" value={profile.email} />
          <InfoLine label="Adres" value={`${profile.city} / ${profile.district} · ${profile.address}`} />
          {profile.role === 'customer' && (
            <InfoLine label="Deneyim" value={profile.experienceMode === 'discovery' ? 'Keşif Modu' : 'Sade Mod'} />
          )}
          {profile.role === 'seller' && (
            <>
              <InfoLine label="Firma" value={profile.companyName || '-'} />
              <InfoLine label="Vergi no" value={profile.taxNumber || '-'} />
              <InfoLine
                label="Satış kanalı"
                value={[
                  profile.sellerChannels?.includes('simple') ? 'Sade' : '',
                  profile.sellerChannels?.includes('vitrin') ? 'Vitrin' : '',
                ].filter(Boolean).join(' + ') || 'Seçilmedi'}
              />
            </>
          )}
        </View>
      </View>
    );
  }

  if (settingsView === 'menu') {
    return (
      <View style={styles.stack}>
        <SettingsHeader title="Ayarlar" />
        <View style={styles.panel}>
          <SettingsRow title="Profil bilgileri" text="Ad, telefon ve e-posta bilgilerini düzenle." onPress={() => setSettingsView('account')} />
          {profile.role === 'customer' && (
            <>
              <SettingsRow title="Adreslerim" text="Kayıtlı adresleri gör ve yeni adres ekle." onPress={() => setSettingsView('addresses')} />
              <SettingsRow title="Görünüm ve bildirimler" text="Sade Mod, Keşif Modu ve bildirim tercihleri." onPress={() => setSettingsView('preferences')} />
            </>
          )}
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Çıkış yap</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (settingsView === 'preferences' && profile.role === 'customer') {
    return (
      <View style={styles.stack}>
        <SettingsHeader title="Görünüm ve Bildirimler" />
        <View style={styles.panel}>
          <View style={styles.roleRow}>
            <RoleButton label="Sade Mod" active={draft.experienceMode === 'simple'} onPress={() => setExperienceMode('simple')} />
            <RoleButton label="Keşif Modu" active={draft.experienceMode === 'discovery'} onPress={() => setExperienceMode('discovery')} />
          </View>
          <PreferenceToggle
            label="Sipariş bildirimleri"
            text="Hazırlanıyor, kargoda ve teslim edildi gibi önemli durumlar."
            value={draft.notificationPreferences.orderUpdates}
            onToggle={() => togglePreference('orderUpdates')}
          />
          <PreferenceToggle
            label="Tekrar satın alma"
            text="Ürün bitmeden yaklaşık bir hafta önce hatırlatma."
            value={draft.notificationPreferences.reorderReminders}
            onToggle={() => togglePreference('reorderReminders')}
          />
          <PreferenceToggle
            label="Kaydedilen ürün gelişmeleri"
            text="Kaydettiğin ürünlerde önemli değişiklikler."
            value={draft.notificationPreferences.savedItemUpdates}
            onToggle={() => togglePreference('savedItemUpdates')}
          />
          <PreferenceToggle
            label="Takip ettiğim aramalar"
            text="Bulunamayan ürün satışa açılırsa haber ver."
            value={draft.notificationPreferences.searchDemandUpdates}
            onToggle={() => togglePreference('searchDemandUpdates')}
          />
          <PreferenceToggle
            label="Yeni açılan ürünler"
            text="Keşif Modu'nda yeni satışa çıkan ürünleri bildir."
            value={draft.notificationPreferences.newProducts}
            disabled={draft.experienceMode === 'simple'}
            onToggle={() => togglePreference('newProducts')}
          />
          <PreferenceToggle
            label="Kampanya bildirimleri"
            text="Gerçekten anlamlı kampanya ve fırsat özetleri."
            value={draft.notificationPreferences.campaigns}
            disabled={draft.experienceMode === 'simple'}
            onToggle={() => togglePreference('campaigns')}
          />
          <Pressable style={styles.primaryButton} onPress={() => updateProfile(draft)}>
            <Text style={styles.primaryButtonText}>Tercihleri kaydet</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (settingsView === 'addresses' && profile.role === 'customer') {
    return (
      <View style={styles.stack}>
        <SettingsHeader title="Adreslerim" />
        <View style={styles.panel}>
          {addresses.length === 0 ? (
            <Text style={styles.body}>Kayıtlı adres yok</Text>
          ) : (
            addresses.map((address) => (
              <View key={address.id} style={styles.addressChoice}>
                <Text style={styles.listTitle}>{address.title}{address.isDefault ? ' · Varsayılan' : ''}</Text>
                <Text style={styles.listMeta}>{address.city} / {address.district} · {address.detail}</Text>
              </View>
            ))
          )}
          <Text style={styles.sectionTitle}>Yeni adres ekle</Text>
          <Input placeholder="Adres başlığı: Ev, İş..." value={newAddress.title} onChangeText={(value) => setNewAddress({ ...newAddress, title: value })} />
          <Input placeholder="İl" value={newAddress.city} onChangeText={(value) => setNewAddress({ ...newAddress, city: value })} />
          <Input placeholder="İlçe" value={newAddress.district} onChangeText={(value) => setNewAddress({ ...newAddress, district: value })} />
          <Input placeholder="Açık adres" value={newAddress.detail} onChangeText={(value) => setNewAddress({ ...newAddress, detail: value })} multiline />
          <Pressable style={styles.primaryButton} onPress={addAddress}>
            <Text style={styles.primaryButtonText}>Adresi kaydet</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <SettingsHeader title="Profil Bilgileri" />
      <View style={styles.panel}>
        <InfoLine label="Hesap tipi" value={profile.role === 'seller' ? 'Satıcı' : 'Kullanıcı'} />
        <InfoLine label="Ad soyad" value={profile.name} />
        <InfoLine label="Telefon" value={profile.phone} />
        <InfoLine label="E-posta" value={profile.email} />
        <InfoLine label="Adres" value={`${profile.city} / ${profile.district} · ${profile.address}`} />
        {profile.role === 'seller' && (
          <>
            <InfoLine label="Firma" value={profile.companyName || '-'} />
            <InfoLine label="Vergi no" value={profile.taxNumber || '-'} />
          </>
        )}
      </View>
      <View style={styles.panel}>
        <Text style={styles.title}>Bilgilerimi düzenle</Text>
        <Input placeholder="Ad soyad" value={draft.name} onChangeText={(value) => setDraft({ ...draft, name: value })} />
        <Input placeholder="Telefon" value={draft.phone} onChangeText={(value) => setDraft({ ...draft, phone: value })} keyboardType="phone-pad" />
        <Input placeholder="E-posta" value={draft.email} onChangeText={(value) => setDraft({ ...draft, email: value })} keyboardType="email-address" autoCapitalize="none" />
        {profile.role === 'seller' && (
          <>
            <Input placeholder="Firma adı" value={draft.companyName} onChangeText={(value) => setDraft({ ...draft, companyName: value })} />
            <Input placeholder="Vergi no / TCKN" value={draft.taxNumber} onChangeText={(value) => setDraft({ ...draft, taxNumber: value })} keyboardType="numeric" />
          </>
        )}
        <Pressable style={styles.primaryButton} onPress={() => updateProfile(draft)}>
          <Text style={styles.primaryButtonText}>Bilgileri kaydet</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SettingsRow({
  title,
  onPress,
}: {
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" style={styles.settingsRow} onPress={onPress}>
      <View style={styles.cartInfo}>
        <Text style={styles.listTitle}>{title}</Text>
      </View>
      <Text style={styles.settingsArrow}>{'>'}</Text>
    </Pressable>
  );
}

function PreferenceToggle({
  label,
  text,
  value,
  disabled,
  onToggle,
}: {
  label: string;
  text: string;
  value: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      style={[styles.preferenceRow, disabled && styles.preferenceRowDisabled]}
      onPress={disabled ? undefined : onToggle}
    >
      <View style={styles.cartInfo}>
        <Text style={styles.listTitle}>{label}</Text>
        <Text style={styles.listMeta}>{text}</Text>
      </View>
      <View style={[styles.preferenceSwitch, value && styles.preferenceSwitchActive, disabled && styles.preferenceSwitchDisabled]}>
        <View style={[styles.preferenceKnob, value && styles.preferenceKnobActive]} />
      </View>
    </Pressable>
  );
}

function SafeImage({ uri, style }: { uri?: string; style: any }) {
  const [failed, setFailed] = useState(false);
  const source = resolveImageUrl(uri);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  if (!source || failed) {
    return (
      <View style={[style, styles.imageMissing]}>
        <Text style={styles.imageMissingText}>Görsel yüklenemedi</Text>
      </View>
    );
  }

  return <Image source={{ uri: source }} style={style} onError={() => setFailed(true)} />;
}

function ProductCard({
  product,
  onPress,
  reviews = [],
  saved = false,
  onToggleSaved,
}: {
  product: LiveProduct;
  onPress: () => void;
  reviews?: Review[];
  saved?: boolean;
  onToggleSaved?: () => void;
}) {
  const rating = getProductRating(reviews);

  return (
    <Pressable style={styles.productCard} onPress={onPress}>
      <SafeImage uri={product.imageUrl} style={styles.productImage} />
      <View style={styles.productText}>
        <Text style={styles.listTitle}>{product.title}</Text>
        <Text style={styles.listMeta}>{money(product.price)} · {product.sellerName}</Text>
        <Text style={styles.ratingText}>{rating.productText} · {reviews.length} yorum</Text>
        {onToggleSaved && (
          <Pressable style={styles.inlineSaveButton} onPress={onToggleSaved}>
            <Text style={styles.inlineSaveText}>{saved ? 'Kaydedildi' : 'Kaydet'}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function isSaved(savedItems: SavedItem[], targetType: 'product' | 'order', targetId: string) {
  return savedItems.some((item) => item.targetType === targetType && item.targetId === targetId);
}

function RatingPicker({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <View style={styles.ratingPicker}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.ratingButtons}>
        {[1, 2, 3, 4, 5].map((item) => (
          <Pressable
            key={item}
            style={[styles.ratingButton, value === item && styles.ratingButtonActive]}
            onPress={() => onChange(item)}
          >
            <Text style={[styles.ratingButtonText, value === item && styles.ratingButtonTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RatingSummary({ reviews }: { reviews: Review[] }) {
  const rating = getProductRating(reviews);

  return (
    <View style={styles.ratingSummary}>
      <Text style={styles.ratingSummaryText}>{rating.productText}</Text>
      <Text style={styles.ratingSummaryMeta}>{reviews.length} yorum · Satıcı {rating.sellerText}</Text>
    </View>
  );
}

function getProductRating(reviews: Review[]) {
  if (reviews.length === 0) {
    return {
      productText: 'Henüz puan yok',
      sellerText: 'Henüz puan yok',
    };
  }

  const productAverage = reviews.reduce((sum, review) => sum + review.productRating, 0) / reviews.length;
  const sellerAverage = reviews.reduce((sum, review) => sum + review.sellerRating, 0) / reviews.length;

  return {
    productText: `${productAverage.toFixed(1)}/5`,
    sellerText: `${sellerAverage.toFixed(1)}/5`,
  };
}

function NotificationsScreen({ notifications, markRead }: { notifications: NotificationItem[]; markRead: () => void }) {
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <View style={styles.stack}>
      <View style={styles.sectionHeader}>
        <Text style={styles.welcome}>Bildirimler</Text>
        {unreadCount > 0 && (
          <Pressable style={styles.secondaryButton} onPress={markRead}>
            <Text style={styles.secondaryButtonText}>Tümünü okundu yap</Text>
          </Pressable>
        )}
      </View>
      {notifications.length === 0 ? (
        <EmptyState title="Bildirim yok" text="İhale, sipariş ve teslimat gelişmeleri burada görünür." />
      ) : (
        notifications.map((item) => (
          <View key={item.id} style={[styles.notificationCard, !item.isRead && styles.notificationCardUnread]}>
            <View style={styles.notificationTopLine}>
              <Text style={styles.listTitle}>{item.title}</Text>
              {!item.isRead && <Text style={styles.unreadPill}>Yeni</Text>}
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.listMeta}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function InfluencerScreen({
  section,
  profile,
  posts,
  products,
  creators,
  collections,
  followedIds,
  likedPostIds: initialLikedPostIds,
  selectedCreatorId,
  selectedProduct,
  ownCreator,
  cartLines,
  cartCount,
  search,
  setSearch,
  onFollow,
  onOpenCreator,
  onBackToVitrin,
  onBackFromProduct,
  onOpenProduct,
  onAddToCart,
  onUpdateCartQuantity,
  onCheckoutCart,
  onCreatorRequest,
  onUploadMedia,
  onSaveCreatorProfile,
  onCreateInfluencerProduct,
  onCreateInfluencerPost,
  onUpdateInfluencerPost,
  onDeleteInfluencerPost,
  onLikeInfluencerPost,
  onCommentInfluencerPost,
}: {
  section: InfluencerSection;
  profile: Profile;
  posts: InfluencerPost[];
  products: InfluencerProduct[];
  creators: InfluencerProfile[];
  collections: InfluencerCollection[];
  followedIds: string[];
  likedPostIds: string[];
  selectedCreatorId: string | null;
  selectedProduct?: InfluencerProduct;
  ownCreator?: InfluencerProfile;
  cartLines: { item: InfluencerCartItem; product: InfluencerProduct; creator?: InfluencerProfile }[];
  cartCount: number;
  search: string;
  setSearch: (value: string) => void;
  onFollow: (influencerId: string) => void;
  onOpenCreator: (influencerId: string) => void;
  onBackToVitrin: () => void;
  onBackFromProduct: () => void;
  onOpenProduct: (product: InfluencerProduct) => void;
  onAddToCart: (productId: string) => void;
  onUpdateCartQuantity: (itemId: string, quantity: number) => void;
  onCheckoutCart: () => void;
  onCreatorRequest: () => void;
  onUploadMedia: (asset: { uri: string; base64?: string | null; mimeType?: string | null; fileName?: string | null }) => Promise<string>;
  onSaveCreatorProfile: (data: Pick<InfluencerProfile, 'name' | 'handle' | 'specialty' | 'bio' | 'avatarUrl' | 'heroUrl'>) => Promise<void>;
  onCreateInfluencerProduct: (data: Omit<InfluencerProduct, 'id' | 'influencerId' | 'dailyHits' | 'weeklyHits' | 'monthlyHits'>) => Promise<void>;
  onCreateInfluencerPost: (data: {
    type: InfluencerPost['type'];
    title: string;
    caption: string;
    mediaUrl: string;
    mediaUrls?: string[];
    productId?: string;
    productTitle: string;
    productQuery: string;
    productPrice: string;
    campaign?: string;
    tags: string[];
    productLinks?: InfluencerPostProductLink[];
  }) => Promise<void>;
  onUpdateInfluencerPost: (postId: string, data: Partial<{
    type: InfluencerPost['type'];
    title: string;
    caption: string;
    mediaUrl: string;
    mediaUrls: string[];
    productId?: string;
    productTitle: string;
    productQuery: string;
    productPrice: string;
    campaign?: string;
    tags: string[];
    productLinks?: InfluencerPostProductLink[];
    status: 'PUBLISHED' | 'HIDDEN';
  }>) => Promise<void>;
  onDeleteInfluencerPost: (postId: string) => Promise<void>;
  onLikeInfluencerPost: (postId: string) => Promise<void>;
  onCommentInfluencerPost: (postId: string, text: string) => Promise<void>;
}) {
  const followedSet = new Set(followedIds);
  const followedCreators = creators.filter((creator) => followedSet.has(creator.id));
  const feedPosts = posts.filter(isFeedPost);
  const visiblePosts = feedPosts.filter((post) => followedSet.has(post.influencerId));
  const selectedCreator = selectedCreatorId ? creators.find((creator) => creator.id === selectedCreatorId) : undefined;
  const creatorPostsForProfile = selectedCreator ? feedPosts.filter((post) => post.influencerId === selectedCreator.id) : [];
  const creatorProductsForProfile = selectedCreator ? products.filter((product) => product.influencerId === selectedCreator.id) : [];
  const normalizedSearch = normalizeSmartText(search);
  const searchedCreators = normalizedSearch
    ? creators.filter((creator) => normalizeSmartText(`${creator.name} ${creator.handle} ${creator.specialty} ${creator.bio}`).includes(normalizedSearch))
    : creators;
  const searchedPosts = normalizedSearch
    ? feedPosts.filter((post) => normalizeSmartText(`${post.title} ${post.caption} ${post.tags.join(' ')} ${post.aiCategory ?? ''} ${post.aiSubCategory ?? ''} ${(post.aiTags ?? []).join(' ')} ${post.aiSummary ?? ''}`).includes(normalizedSearch))
    : [];
  const searchedProducts = normalizedSearch
    ? products.filter((product) => normalizeSmartText(`${product.title} ${product.description} ${product.priceText}`).includes(normalizedSearch))
    : [];
  const dailyHitPosts = sortPostsByEngagement(feedPosts, 'daily').slice(0, 12);
  const weeklyHitPosts = sortPostsByEngagement(feedPosts, 'weekly').slice(0, 12);
  const monthlyHitPosts = sortPostsByEngagement(feedPosts, 'monthly').slice(0, 12);
  const dailyHits: InfluencerProduct[] = [];
  const weeklyHits: InfluencerProduct[] = [];
  const monthlyHits: InfluencerProduct[] = [];
  const linkedProductsForPost = (post: InfluencerPost) => {
    const links = post.productLinks?.length
      ? post.productLinks
      : post.productId
        ? [{ productId: post.productId, label: post.productTitle, x: 50, y: 50 }]
        : [];

    return links
      .map((link) => ({
        link,
        product: products.find((product) => product.id === link.productId),
      }))
      .filter((item): item is { link: InfluencerPostProductLink; product: InfluencerProduct } => Boolean(item.product));
  };
  const productForPost = (post: InfluencerPost): InfluencerProduct => products.find((product) => product.id === (post.productLinks?.[0]?.productId ?? post.productId)) ?? {
    id: `post-product-${post.id}`,
    influencerId: post.influencerId,
    title: post.productTitle,
    description: post.caption,
    imageUrl: postMediaList(post)[0] ?? post.mediaUrl,
    imageUrls: postMediaList(post),
    priceText: post.productPrice,
    linkText: post.campaign,
    dailyHits: 0,
    weeklyHits: 0,
    monthlyHits: 0,
  };
  const [profileDraft, setProfileDraft] = useState({
    name: ownCreator?.name ?? profile.name,
    handle: ownCreator?.handle ?? `@${normalizeSmartText(profile.name).replace(/\s+/g, '') || 'vitrin'}`,
    specialty: ownCreator?.specialty ?? 'Kişisel vitrin',
    bio: ownCreator?.bio ?? `${profile.name} tarafından hazırlanan vitrin.`,
    avatarUrl: ownCreator?.avatarUrl ?? '',
    heroUrl: ownCreator?.heroUrl ?? '',
  });
  const [productDraft, setProductDraft] = useState({
    title: '',
    description: '',
    imageUrl: '',
    imageUrls: [] as string[],
    priceText: '',
    sellerName: '',
    detailText: '',
    sizesText: '',
    colorsText: '',
    linkText: '',
    stockText: '',
  });
  const [postDraft, setPostDraft] = useState({
    type: 'post' as InfluencerPost['type'],
    title: '',
    caption: '',
    mediaUrl: '',
    mediaUrls: [] as string[],
    productId: '',
    productTitle: '',
    productQuery: '',
    productPrice: '',
    campaign: '',
    tagsText: '',
    linkedProductIds: [] as string[],
  });
  const [manageMode, setManageMode] = useState<'products' | 'content' | 'profile'>('products');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [taggedPostId, setTaggedPostId] = useState<string | null>(null);
  const [showVitrinNotices, setShowVitrinNotices] = useState(false);
  const [likedPostIds, setLikedPostIds] = useState<string[]>(initialLikedPostIds);
  const [likeDeltas, setLikeDeltas] = useState<Record<string, number>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [commentDeltas, setCommentDeltas] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!ownCreator) {
      return;
    }

    setProfileDraft({
      name: ownCreator.name,
      handle: ownCreator.handle,
      specialty: ownCreator.specialty,
      bio: ownCreator.bio,
      avatarUrl: ownCreator.avatarUrl,
      heroUrl: ownCreator.heroUrl,
    });
  }, [ownCreator?.id, ownCreator?.name, ownCreator?.handle, ownCreator?.specialty, ownCreator?.bio, ownCreator?.avatarUrl, ownCreator?.heroUrl]);

  const ownProducts = ownCreator ? products.filter((product) => product.influencerId === ownCreator.id) : [];
  const ownPosts = ownCreator ? posts.filter((post) => post.influencerId === ownCreator.id && post.status !== 'DELETED') : [];
  const linkableProducts = products;
  const followedOrOwnProducts = products.filter((product) => (product.influencerId ? followedSet.has(product.influencerId) : false) || product.influencerId === ownCreator?.id);
  const feedProducts = (followedOrOwnProducts.length ? followedOrOwnProducts : products).slice(0, 12);
  const vitrinNotices = [
    { title: 'Bildirimler', text: 'Takip ettiğin vitrinlerden yeni paylaşım' },
    { title: 'İndirimler', text: 'Kampanyalı vitrin etiketleri' },
    { title: 'Yeni vitrinler', text: 'Bugün öne çıkan içerikler' },
  ];
  const productDraftImages = uniqueMediaList(productDraft.imageUrl, productDraft.imageUrls);
  const postDraftMedia = uniqueMediaList(postDraft.mediaUrl, postDraft.mediaUrls);
  const selectedDraftProducts = linkableProducts.filter((product) => postDraft.linkedProductIds.includes(product.id));
  const productDraftFields = [
    { label: 'Görsel', done: productDraftImages.length > 0 },
    { label: 'Ad', done: Boolean(productDraft.title.trim()) },
    { label: 'Fiyat', done: Boolean(productDraft.priceText.trim()) },
    { label: 'Açıklama', done: Boolean(productDraft.description.trim()) },
    { label: 'Seçenek', done: Boolean(productDraft.sizesText.trim() || productDraft.colorsText.trim()) },
  ];

  useEffect(() => {
    setTaggedPostId(null);
  }, [section, selectedCreatorId, selectedProduct?.id]);

  useEffect(() => {
    setLikedPostIds(initialLikedPostIds);
    setLikeDeltas({});
  }, [initialLikedPostIds.join('|')]);

  useEffect(() => {
    setLikeDeltas({});
    setCommentDeltas({});
  }, [posts.map((post) => `${post.id}:${post.likeCount ?? 0}:${post.commentCount ?? 0}`).join('|')]);

  const taggedPost = taggedPostId ? posts.find((post) => post.id === taggedPostId) : undefined;

  const postStats = (post: InfluencerPost) => {
    const liked = likedPostIds.includes(post.id);

    return {
      liked,
      likeCount: Math.max((post.likeCount ?? 0) + (likeDeltas[post.id] ?? 0), 0),
      commentCount: (post.commentCount ?? 0) + (commentDeltas[post.id] ?? 0),
    };
  };

  const togglePostLike = (postId: string) => {
    const wasLiked = likedPostIds.includes(postId);

    setLikedPostIds((current) => (
      current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId]
    ));
    setLikeDeltas((current) => ({ ...current, [postId]: (current[postId] ?? 0) + (wasLiked ? -1 : 1) }));
    onLikeInfluencerPost(postId).catch(() => {
      setLikedPostIds((current) => (
        wasLiked
          ? [...new Set([...current, postId])]
          : current.filter((id) => id !== postId)
      ));
      setLikeDeltas((current) => ({ ...current, [postId]: (current[postId] ?? 0) + (wasLiked ? 1 : -1) }));
    });
  };

  const submitPostComment = (postId: string) => {
    const comment = commentDrafts[postId]?.trim();
    if (!comment) {
      return;
    }

    setCommentDeltas((current) => ({ ...current, [postId]: (current[postId] ?? 0) + 1 }));
    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    onCommentInfluencerPost(postId, comment).catch(() => {
      setCommentDeltas((current) => ({ ...current, [postId]: Math.max((current[postId] ?? 0) - 1, 0) }));
    });
  };
  const pickVitrinMedia = async (target: 'avatar' | 'hero' | 'product' | 'post') => {
    const multiple = target === 'product' || target === 'post';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: target === 'post' ? ImagePicker.MediaTypeOptions.All : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: !multiple,
      allowsMultipleSelection: multiple,
      selectionLimit: target === 'post' ? 10 : target === 'product' ? 8 : 1,
      quality: 0.82,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const assets = result.assets.filter((asset) => asset?.uri);
    const [asset] = assets;
    if (!asset?.uri) {
      return;
    }

    try {
      const uploadedUrls = await Promise.all(assets.map((item) => onUploadMedia({
        uri: item.uri,
        base64: item.base64,
        mimeType: item.mimeType,
        fileName: item.fileName,
      })));
      const mediaUrl = uploadedUrls[0];

      if (target === 'avatar') setProfileDraft((current) => ({ ...current, avatarUrl: mediaUrl }));
      if (target === 'hero') setProfileDraft((current) => ({ ...current, heroUrl: mediaUrl }));
      if (target === 'product') {
        setProductDraft((current) => {
          const imageUrls = uniqueMediaList(current.imageUrl, [...current.imageUrls, ...uploadedUrls]);
          return { ...current, imageUrl: imageUrls[0] ?? mediaUrl, imageUrls };
        });
      }
      if (target === 'post') {
        setPostDraft((current) => ({
          ...current,
          mediaUrl: current.mediaUrl || mediaUrl,
          mediaUrls: uniqueMediaList(current.mediaUrl, [...current.mediaUrls, ...uploadedUrls]),
          type: asset.mimeType?.startsWith('video/') ? 'video' : current.type,
        }));
      }
    } catch (error) {
      Alert.alert('Medya eklenemedi', error instanceof Error ? error.message : 'Dosya okunamadı.');
    }
  };

  const toggleDraftProduct = (product: InfluencerProduct) => {
    setPostDraft((current) => {
      const linkedProductIds = current.linkedProductIds.includes(product.id)
        ? current.linkedProductIds.filter((id) => id !== product.id)
        : [...current.linkedProductIds, product.id];
      const firstLinkedProduct = linkableProducts.find((item) => item.id === linkedProductIds[0]);

      return {
        ...current,
        linkedProductIds,
        productId: firstLinkedProduct?.id ?? '',
        productTitle: current.productTitle || firstLinkedProduct?.title || '',
        productPrice: current.productPrice || firstLinkedProduct?.priceText || '',
        productQuery: current.productQuery || firstLinkedProduct?.title || '',
      };
    });
  };

  const submitProduct = async () => {
    if (!productDraft.title.trim() || !productDraft.description.trim() || productDraftImages.length === 0 || !productDraft.priceText.trim()) {
      Alert.alert('Eksik ürün', 'Ürün adı, açıklama, görsel ve fiyat alanlarını doldurmalısın.');
      return;
    }

    await onCreateInfluencerProduct({
      title: productDraft.title.trim(),
      description: productDraft.description.trim(),
      imageUrl: productDraftImages[0],
      imageUrls: productDraftImages,
      priceText: productDraft.priceText.trim(),
      sellerName: productDraft.sellerName.trim() || ownCreator?.name || profile.name,
      detailText: productDraft.detailText.trim() || undefined,
      sizes: productDraft.sizesText.split(',').map((value) => value.trim()).filter(Boolean),
      colors: productDraft.colorsText.split(',').map((value) => value.trim()).filter(Boolean),
      linkText: productDraft.linkText.trim() || undefined,
      stockText: productDraft.stockText.trim() || undefined,
    });
    setProductDraft({
      title: '',
      description: '',
      imageUrl: '',
      imageUrls: [],
      priceText: '',
      sellerName: '',
      detailText: '',
      sizesText: '',
      colorsText: '',
      linkText: '',
      stockText: '',
    });
  };

  const submitPost = async () => {
    const linkedProducts = linkableProducts.filter((product) => postDraft.linkedProductIds.includes(product.id));
    const linkedProduct = linkedProducts[0] ?? linkableProducts.find((product) => product.id === postDraft.productId);
    const productTitle = postDraft.productTitle.trim() || linkedProduct?.title || postDraft.title.trim();
    const productPrice = postDraft.productPrice.trim() || linkedProduct?.priceText || 'Vitrin ürünü';

    if (!postDraft.title.trim() || !postDraft.caption.trim() || postDraftMedia.length === 0) {
      Alert.alert('Eksik paylaşım', 'Başlık, açıklama ve medya alanlarını doldurmalısın.');
      return;
    }

    const payload = {
      type: postDraft.type,
      title: postDraft.title.trim(),
      caption: postDraft.caption.trim(),
      mediaUrl: postDraftMedia[0],
      mediaUrls: postDraftMedia,
      productId: linkedProduct?.id,
      productTitle,
      productQuery: postDraft.productQuery.trim() || productTitle,
      productPrice,
      campaign: postDraft.campaign.trim() || undefined,
      tags: postDraft.tagsText.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean),
      productLinks: (linkedProducts.length ? linkedProducts : linkedProduct ? [linkedProduct] : []).map((product, index) => ({
        productId: product.id,
        label: (product.linkText || product.title).slice(0, 40),
        x: Math.min(82, 26 + (index % 3) * 26),
        y: Math.min(82, 28 + Math.floor(index / 3) * 20),
      })),
    };

    if (editingPostId) {
      await onUpdateInfluencerPost(editingPostId, payload);
    } else {
      await onCreateInfluencerPost(payload);
    }

    setPostDraft({
      type: 'post',
      title: '',
      caption: '',
      mediaUrl: '',
      mediaUrls: [],
      productId: '',
      productTitle: '',
      productQuery: '',
      productPrice: '',
      campaign: '',
      tagsText: '',
      linkedProductIds: [],
    });
    setEditingPostId(null);
  };

  const editPost = (post: InfluencerPost) => {
    setManageMode('content');
    setEditingPostId(post.id);
    setPostDraft({
      type: post.type,
      title: post.title,
      caption: post.caption,
      mediaUrl: post.mediaUrl,
      mediaUrls: postMediaList(post),
      productId: post.productId ?? '',
      productTitle: post.productTitle,
      productQuery: post.productQuery,
      productPrice: post.productPrice,
      campaign: post.campaign ?? '',
      tagsText: post.tags.join(', '),
      linkedProductIds: (post.productLinks ?? []).map((link) => link.productId),
    });
  };

  if (selectedProduct) {
    return (
      <InfluencerProductDetail
        product={selectedProduct}
        creator={creators.find((creator) => creator.id === selectedProduct.influencerId)}
        onBack={onBackFromProduct}
        onAddToCart={() => onAddToCart(selectedProduct.id)}
      />
    );
  }

  if (taggedPost) {
    return (
      <InfluencerTaggedProductsScreen
        post={taggedPost}
        creator={creators.find((creator) => creator.id === taggedPost.influencerId)}
        linkedProducts={linkedProductsForPost(taggedPost)}
        onBack={() => setTaggedPostId(null)}
        onOpenProduct={onOpenProduct}
      />
    );
  }

  if (selectedCreator) {
    return (
      <View style={styles.influencerStack}>
        <Pressable onPress={onBackToVitrin}>
          <Text style={styles.backText}>Vitrine dön</Text>
        </Pressable>
        <View style={styles.influencerHero}>
          <SafeImage uri={selectedCreator.heroUrl} style={styles.creatorProfileHeroImage} />
          <SafeImage uri={selectedCreator.avatarUrl} style={styles.creatorProfileAvatar} />
          <Text style={styles.influencerHeroTitle}>{selectedCreator.name}</Text>
          <Text style={styles.influencerHeroText}>{selectedCreator.handle} · {selectedCreator.specialty}</Text>
          <Text style={styles.influencerMuted}>{selectedCreator.bio}</Text>
          <Pressable style={[styles.influencerFollowButton, followedSet.has(selectedCreator.id) && styles.influencerFollowButtonActive]} onPress={() => onFollow(selectedCreator.id)}>
            <Text style={[styles.influencerFollowText, followedSet.has(selectedCreator.id) && styles.influencerFollowTextActive]}>
              {followedSet.has(selectedCreator.id) ? 'Takipte' : 'Takip et'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.influencerSectionTitle}>Paylaşımlar</Text>
        {creatorPostsForProfile.map((post) => (
          <InfluencerPostCard
            key={`profile-post-${post.id}`}
            post={post}
            creator={selectedCreator}
            followed={followedSet.has(post.influencerId)}
            onFollow={() => onFollow(post.influencerId)}
            onOpenCreator={() => onOpenCreator(post.influencerId)}
            linkedProducts={linkedProductsForPost(post)}
            stats={postStats(post)}
            commentValue={commentDrafts[post.id] ?? ''}
            onCommentChange={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
            onLike={() => togglePostLike(post.id)}
            onSubmitComment={() => submitPostComment(post.id)}
            onOpenTaggedProducts={() => setTaggedPostId(post.id)}
            onOpenProduct={() => onOpenProduct(productForPost(post))}
          />
        ))}
        <Text style={styles.influencerSectionTitle}>Vitrin ürünleri</Text>
        {creatorProductsForProfile.map((product) => (
          <InfluencerProductCard key={product.id} product={product} creator={selectedCreator} onOpen={() => onOpenProduct(product)} onAddToCart={() => onAddToCart(product.id)} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.influencerStack}>
      <View style={styles.influencerTopBar}>
        <Text style={styles.influencerTopTitle}>Vitrin</Text>
        <Pressable style={styles.smallButton} onPress={() => setShowVitrinNotices((current) => !current)}>
          <Text style={styles.smallButtonText}>Bildirimler</Text>
        </Pressable>
      </View>
      {showVitrinNotices && section !== 'manage' && section !== 'cart' && (
        <View style={styles.vitrinNoticePanel}>
          {vitrinNotices.map((item) => (
            <View key={item.title} style={styles.vitrinNoticeRow}>
              <Text style={styles.influencerNoticeTitle}>{item.title}</Text>
              <Text style={styles.influencerNoticeText}>{item.text}</Text>
            </View>
          ))}
        </View>
      )}
      {section !== 'manage' && section !== 'cart' && (
        <>
          <View style={styles.influencerTopSearch}>
            <Input
              placeholder="Vitrin, ürün veya paylaşım ara"
              value={search}
              onChangeText={setSearch}
              style={styles.influencerSearchInput}
            />
          </View>
        </>
      )}

      {section === 'manage' && (
        <View style={styles.influencerManageStack}>
          {!ownCreator ? (
            <View style={styles.influencerEmpty}>
              <Text style={styles.influencerCardTitle}>Vitrinin yok</Text>
              <Pressable style={styles.influencerPrimaryButton} onPress={onCreatorRequest}>
                <Text style={styles.influencerPrimaryText}>Vitrin aç</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.vitrinManageHeader}>
                <View style={styles.cartInfo}>
                  <Text style={styles.influencerSectionTitle}>Vitrin yönetimi</Text>
                  <Text style={styles.influencerMuted}>{ownCreator.name} · {ownCreator.handle}</Text>
                </View>
                <Text style={styles.vitrinCountPill}>{linkableProducts.length} ürün</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitrinManageTabs}>
                <FilterChip label="Ürün havuzu" active={manageMode === 'products'} onPress={() => setManageMode('products')} />
                <FilterChip label="İçerik paylaşımı" active={manageMode === 'content'} onPress={() => setManageMode('content')} />
                <FilterChip label="Profil" active={manageMode === 'profile'} onPress={() => setManageMode('profile')} />
              </ScrollView>

              {manageMode === 'products' && (
                <View style={styles.vitrinBuilderCard}>
                  <View style={styles.vitrinBuilderHeader}>
                    <View>
                      <Text style={styles.vitrinBuilderEyebrow}>ÜRÜN HAVUZU</Text>
                      <Text style={styles.influencerSectionTitle}>Satıcıların vitrin ürünleri</Text>
                    </View>
                    <Text style={styles.vitrinCountPill}>{linkableProducts.length} ürün</Text>
                  </View>
                  {profile.role === 'seller' && (
                    <View style={styles.vitrinFormGroup}>
                      <Text style={styles.vitrinGroupTitle}>Yeni vitrin ürünü</Text>
                      <Pressable style={styles.vitrinLargePicker} onPress={() => pickVitrinMedia('product')}>
                        {productDraftImages.length > 0 ? (
                          <SafeImage uri={productDraftImages[0]} style={styles.vitrinMediaPreview} />
                        ) : (
                          <Text style={styles.influencerMuted}>Ürün görsellerini seç</Text>
                        )}
                      </Pressable>
                      {productDraftImages.length > 1 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitrinThumbRail}>
                          {productDraftImages.map((uri) => (
                            <SafeImage key={`draft-product-${uri}`} uri={uri} style={styles.vitrinThumbImage} />
                          ))}
                        </ScrollView>
                      )}
                      <View style={styles.vitrinChecklist}>
                        {productDraftFields.map((item) => (
                          <Text key={item.label} style={[styles.vitrinChecklistItem, item.done && styles.vitrinChecklistItemDone]}>
                            {item.label}
                          </Text>
                        ))}
                      </View>
                      <Input placeholder="Ürün adı" value={productDraft.title} onChangeText={(value) => setProductDraft((current) => ({ ...current, title: value }))} />
                      <Input placeholder="Açıklama" value={productDraft.description} onChangeText={(value) => setProductDraft((current) => ({ ...current, description: value }))} multiline />
                      <Input placeholder="Fiyat metni" value={productDraft.priceText} onChangeText={(value) => setProductDraft((current) => ({ ...current, priceText: value }))} />
                      <Input placeholder="Bedenler: S, M, L" value={productDraft.sizesText} onChangeText={(value) => setProductDraft((current) => ({ ...current, sizesText: value }))} />
                      <Input placeholder="Renkler: siyah, beyaz" value={productDraft.colorsText} onChangeText={(value) => setProductDraft((current) => ({ ...current, colorsText: value }))} />
                      <Input placeholder="Stok / teslimat notu" value={productDraft.stockText} onChangeText={(value) => setProductDraft((current) => ({ ...current, stockText: value }))} />
                      <Pressable style={styles.influencerPrimaryButton} onPress={submitProduct}>
                        <Text style={styles.influencerPrimaryText}>Vitrin ürününü kaydet</Text>
                      </Pressable>
                    </View>
                  )}
                  {linkableProducts.length === 0 ? (
                    <View style={styles.vitrinEmptyDark}>
                      <Text style={styles.influencerCardTitle}>Ürün havuzu boş</Text>
                    </View>
                  ) : (
                    linkableProducts.map((product) => (
                      <Pressable key={`pool-product-${product.id}`} style={styles.vitrinLibraryRow} onPress={() => toggleDraftProduct(product)}>
                        <SafeImage uri={productImageList(product)[0] ?? product.imageUrl} style={styles.vitrinLibraryImage} />
                        <View style={styles.cartInfo}>
                          <Text style={styles.productLinkTitle}>{product.title}</Text>
                          <Text style={styles.productLinkMeta}>{product.priceText} · {product.sellerName || 'Satıcı'}</Text>
                          <Text style={styles.productLinkMeta} numberOfLines={1}>
                            {[...(product.sizes ?? []), ...(product.colors ?? [])].slice(0, 5).join(' · ') || product.stockText || 'Detay sayfası hazır'}
                          </Text>
                        </View>
                        <Text style={styles.productLinkAction}>{postDraft.linkedProductIds.includes(product.id) ? 'Seçildi' : 'Seç'}</Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
              {manageMode === 'content' && (
                <View style={styles.vitrinBuilderCard}>
                  <View style={styles.vitrinBuilderHeader}>
                    <View>
                      <Text style={styles.vitrinBuilderEyebrow}>İÇERİK</Text>
                      <Text style={styles.influencerSectionTitle}>İçerik paylaş</Text>
                    </View>
                    <Text style={styles.vitrinCountPill}>{selectedDraftProducts.length} link</Text>
                  </View>
                  <View style={styles.vitrinFormGroup}>
                    <Text style={styles.vitrinGroupTitle}>Medya</Text>
                    <Pressable style={styles.vitrinPostPreviewWrap} onPress={() => pickVitrinMedia('post')}>
                      {postDraftMedia.length > 0 ? (
                        <InfluencerMedia uri={postDraftMedia[0]} type={postDraft.type} style={styles.vitrinPostPreviewMedia} />
                      ) : (
                        <Text style={styles.influencerMuted}>Resim veya video seç</Text>
                      )}
                      {postDraftMedia.length > 1 && (
                        <Text style={styles.vitrinMediaCount}>{postDraftMedia.length} medya</Text>
                      )}
                    </Pressable>
                    {postDraftMedia.length > 1 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitrinThumbRail}>
                        {postDraftMedia.map((uri) => (
                          <InfluencerMedia key={`draft-post-${uri}`} uri={uri} type={postDraft.type} style={styles.vitrinThumbImage} />
                        ))}
                      </ScrollView>
                    )}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
                      {(['post', 'video', 'campaign'] as InfluencerPost['type'][]).map((type) => (
                        <FilterChip
                          key={type}
                          label={type === 'post' ? 'Post' : type === 'video' ? 'Video' : 'Kampanya'}
                          active={postDraft.type === type}
                          onPress={() => setPostDraft((current) => ({ ...current, type }))}
                        />
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.vitrinFormGroup}>
                    <View style={styles.vitrinBuilderHeader}>
                      <Text style={styles.vitrinGroupTitle}>Ürün linkleri (opsiyonel)</Text>
                      <Pressable onPress={() => setManageMode('products')}>
                        <Text style={styles.productLinkAction}>Ürün seç</Text>
                      </Pressable>
                    </View>
                    {linkableProducts.length === 0 ? (
                      <View style={styles.vitrinEmptyDark}>
                        <Text style={styles.influencerCardTitle}>Ürün linki yok</Text>
                      </View>
                    ) : (
                      <View style={styles.vitrinProductSelectGrid}>
                        {linkableProducts.map((product) => {
                          const active = postDraft.linkedProductIds.includes(product.id);
                          return (
                            <Pressable
                              key={`select-product-${product.id}`}
                              style={[styles.vitrinSelectableProduct, active && styles.vitrinSelectableProductActive]}
                              onPress={() => toggleDraftProduct(product)}
                            >
                              <SafeImage uri={productImageList(product)[0] ?? product.imageUrl} style={styles.vitrinSelectableImage} />
                              <View style={styles.cartInfo}>
                                <Text style={styles.vitrinSelectableTitle} numberOfLines={2}>{product.title}</Text>
                                <Text style={styles.vitrinSelectableMeta}>{product.priceText}</Text>
                              </View>
                              <Text style={[styles.vitrinSelectMark, active && styles.vitrinSelectMarkActive]}>{active ? 'Seçildi' : 'Seç'}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <View style={styles.vitrinFormGroup}>
                    <Text style={styles.vitrinGroupTitle}>Paylaşım metni</Text>
                    <Input placeholder="Başlık" value={postDraft.title} onChangeText={(value) => setPostDraft((current) => ({ ...current, title: value }))} />
                    <Input placeholder="Açıklama" value={postDraft.caption} onChangeText={(value) => setPostDraft((current) => ({ ...current, caption: value }))} multiline />
                    <Input placeholder="Etiketler: çanta, kombin, kampanya" value={postDraft.tagsText} onChangeText={(value) => setPostDraft((current) => ({ ...current, tagsText: value }))} />
                  </View>
                  {selectedDraftProducts.length > 0 && (
                    <View style={styles.vitrinFormGroup}>
                      <Text style={styles.vitrinGroupTitle}>Reklam olarak bağlanan ürünler</Text>
                      {selectedDraftProducts.map((product) => (
                        <View key={`draft-linked-${product.id}`} style={styles.taggedProductRow}>
                          <Text style={styles.taggedProductTitle}>{product.linkText || product.title}</Text>
                          <Text style={styles.productLinkMeta}>{product.priceText}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Pressable style={styles.influencerPrimaryButton} onPress={submitPost}>
                    <Text style={styles.influencerPrimaryText}>{editingPostId ? 'Paylaşımı güncelle' : 'Paylaşımı yayınla'}</Text>
                  </Pressable>
                  {editingPostId && (
                    <Pressable
                      style={styles.influencerGhostButton}
                      onPress={() => {
                        setEditingPostId(null);
                        setPostDraft({
                          type: 'post',
                          title: '',
                          caption: '',
                          mediaUrl: '',
                          mediaUrls: [],
                          productId: '',
                          productTitle: '',
                          productQuery: '',
                          productPrice: '',
                          campaign: '',
                          tagsText: '',
                          linkedProductIds: [],
                        });
                      }}
                    >
                      <Text style={styles.influencerGhostText}>Düzenlemeyi iptal et</Text>
                    </Pressable>
                  )}
                  <View style={styles.vitrinFormGroup}>
                    <Text style={styles.vitrinGroupTitle}>Paylaşımlarım</Text>
                    {ownPosts.length === 0 ? (
                      <View style={styles.vitrinEmptyDark}>
                        <Text style={styles.influencerCardTitle}>Henüz paylaşım yok</Text>
                      </View>
                    ) : (
                      ownPosts.map((post) => (
                        <View key={`manage-post-${post.id}`} style={styles.vitrinLibraryRow}>
                          <InfluencerMedia uri={postMediaList(post)[0] ?? post.mediaUrl} type={post.type} style={styles.vitrinLibraryImage} />
                          <View style={styles.cartInfo}>
                            <Text style={styles.productLinkTitle}>{post.title}</Text>
                            <Text style={styles.productLinkMeta}>{post.status === 'HIDDEN' ? 'Gizli' : 'Yayında'} · {post.type === 'video' ? 'Video' : post.type === 'campaign' ? 'Kampanya' : 'Post'}</Text>
                            <Text style={styles.productLinkMeta} numberOfLines={1}>{post.caption}</Text>
                          </View>
                          <View style={styles.vitrinPostActions}>
                            <Pressable onPress={() => editPost(post)}>
                              <Text style={styles.productLinkAction}>Düzenle</Text>
                            </Pressable>
                            <Pressable onPress={() => onUpdateInfluencerPost(post.id, { status: post.status === 'HIDDEN' ? 'PUBLISHED' : 'HIDDEN' })}>
                              <Text style={styles.productLinkAction}>{post.status === 'HIDDEN' ? 'Yayınla' : 'Gizle'}</Text>
                            </Pressable>
                            <Pressable onPress={() => onDeleteInfluencerPost(post.id)}>
                              <Text style={styles.dangerText}>Sil</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {manageMode === 'profile' && (
                <View style={styles.influencerPanel}>
                  <Text style={styles.influencerSectionTitle}>Profil ayarları</Text>
                  <View style={styles.vitrinMediaRow}>
                    <Pressable style={styles.vitrinMediaPicker} onPress={() => pickVitrinMedia('avatar')}>
                      {profileDraft.avatarUrl ? <SafeImage uri={profileDraft.avatarUrl} style={styles.vitrinMediaPreview} /> : <Text style={styles.influencerMuted}>Profil fotoğrafı</Text>}
                    </Pressable>
                    <Pressable style={[styles.vitrinMediaPicker, styles.vitrinHeroPicker]} onPress={() => pickVitrinMedia('hero')}>
                      {profileDraft.heroUrl ? <SafeImage uri={profileDraft.heroUrl} style={styles.vitrinMediaPreview} /> : <Text style={styles.influencerMuted}>Kapak görseli</Text>}
                    </Pressable>
                  </View>
                  <Input placeholder="Vitrin adı" value={profileDraft.name} onChangeText={(value) => setProfileDraft((current) => ({ ...current, name: value }))} />
                  <Input placeholder="@kullaniciadi" value={profileDraft.handle} onChangeText={(value) => setProfileDraft((current) => ({ ...current, handle: value.startsWith('@') ? value : `@${value}` }))} />
                  <Input placeholder="Uzmanlık alanı" value={profileDraft.specialty} onChangeText={(value) => setProfileDraft((current) => ({ ...current, specialty: value }))} />
                  <Input placeholder="Kısa bio" value={profileDraft.bio} onChangeText={(value) => setProfileDraft((current) => ({ ...current, bio: value }))} multiline />
                  <Pressable style={styles.influencerPrimaryButton} onPress={() => onSaveCreatorProfile(profileDraft)}>
                    <Text style={styles.influencerPrimaryText}>Profili kaydet</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {section === 'cart' && (
        <InfluencerCartScreen
          lines={cartLines}
          total={cartLines.reduce((sum, line) => sum + parsePriceText(line.product.priceText) * line.item.quantity, 0)}
          onUpdateQuantity={onUpdateCartQuantity}
          onCheckout={onCheckoutCart}
          onOpenProduct={onOpenProduct}
        />
      )}

      {!normalizedSearch && section === 'feed' && (
        <>
          {feedProducts.length > 0 && (
            <>
              <View style={styles.vitrinBuilderHeader}>
                <Text style={styles.influencerSectionTitle}>Vitrin ürünleri</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.influencerCreatorRail}>
                {feedProducts.map((product) => (
                  <Pressable key={`feed-product-${product.id}`} style={styles.vitrinFeedProductCard} onPress={() => onOpenProduct(product)}>
                    <SafeImage uri={productImageList(product)[0] ?? product.imageUrl} style={styles.vitrinFeedProductImage} />
                    <Text style={styles.vitrinSelectableTitle} numberOfLines={2}>{product.title}</Text>
                    <Text style={styles.vitrinSelectableMeta}>{product.priceText}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.influencerSectionTitle}>
            Takip ettiğin vitrinler
          </Text>
          {followedCreators.length === 0 ? (
            null
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.influencerCreatorRail}>
              {followedCreators.map((creator) => (
                <InfluencerCreatorCard
                  key={creator.id}
                  creator={creator}
                  followed={followedSet.has(creator.id)}
                  onFollow={() => onFollow(creator.id)}
                  onOpen={() => onOpenCreator(creator.id)}
                />
              ))}
            </ScrollView>
          )}

          <Text style={styles.influencerSectionTitle}>Takip akışı</Text>
          {visiblePosts.length === 0 ? (
            null
          ) : (
            visiblePosts.map((post) => (
              <InfluencerPostCard
                key={post.id}
                post={post}
                creator={creators.find((creator) => creator.id === post.influencerId)}
                followed={followedSet.has(post.influencerId)}
                onFollow={() => onFollow(post.influencerId)}
                onOpenCreator={() => onOpenCreator(post.influencerId)}
                linkedProducts={linkedProductsForPost(post)}
                stats={postStats(post)}
                commentValue={commentDrafts[post.id] ?? ''}
                onCommentChange={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
                onLike={() => togglePostLike(post.id)}
                onSubmitComment={() => submitPostComment(post.id)}
                onOpenTaggedProducts={() => setTaggedPostId(post.id)}
                onOpenProduct={() => onOpenProduct(productForPost(post))}
              />
            ))
          )}
        </>
      )}

      {normalizedSearch && section !== 'manage' && section !== 'cart' && (
        <InfluencerSearchResults
          creators={searchedCreators}
          posts={searchedPosts}
          products={searchedProducts}
          followedSet={followedSet}
          allCreators={creators}
          productForPost={productForPost}
          postStats={postStats}
          commentDrafts={commentDrafts}
          setCommentDrafts={setCommentDrafts}
          onLikePost={togglePostLike}
          onSubmitComment={submitPostComment}
          onOpenTaggedProducts={setTaggedPostId}
          onFollow={onFollow}
          onOpenCreator={onOpenCreator}
          onOpenProduct={onOpenProduct}
          onAddToCart={onAddToCart}
        />
      )}

      {false && normalizedSearch && section !== 'manage' && section !== 'cart' && (
        <>
          <Text style={styles.influencerSectionTitle}>Ara</Text>
          <Input
            placeholder="Vitrin, ürün, etiket veya kişi ara"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          <Text style={styles.influencerSectionTitle}>Vitrinler</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.influencerCreatorRail}>
            {searchedCreators.map((creator) => (
              <InfluencerCreatorCard
                key={`search-${creator.id}`}
                creator={creator}
                followed={followedSet.has(creator.id)}
                onFollow={() => onFollow(creator.id)}
                onOpen={() => onOpenCreator(creator.id)}
              />
            ))}
          </ScrollView>
          {searchedProducts.length > 0 && (
            <>
              <Text style={styles.influencerSectionTitle}>Ürün sonuçları</Text>
              {searchedProducts.map((product) => (
                <InfluencerProductCard
                  key={`search-product-${product.id}`}
                  product={product}
                  creator={creators.find((creator) => creator.id === product.influencerId)}
                  onOpen={() => onOpenProduct(product)}
                  onAddToCart={() => onAddToCart(product.id)}
                />
              ))}
            </>
          )}
          {searchedPosts.length > 0 && (
            <>
              <Text style={styles.influencerSectionTitle}>Paylaşım ızgarası</Text>
              <View style={styles.influencerGrid}>
                {searchedPosts.map((post) => (
                  <InfluencerGridTile
                    key={`search-post-${post.id}`}
                    title={post.title}
                    imageUrl={postMediaList(post)[0] ?? post.mediaUrl}
                    type={post.type}
                    onLongPress={() => setTaggedPostId(post.id)}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}

      {!normalizedSearch && section === 'explore' && (
        <InfluencerExploreFeed
          dailyPosts={dailyHitPosts}
          weeklyPosts={weeklyHitPosts}
          monthlyPosts={monthlyHitPosts}
          creators={creators}
          productForPost={productForPost}
          linkedProductsForPost={linkedProductsForPost}
          postStats={postStats}
          commentDrafts={commentDrafts}
          setCommentDrafts={setCommentDrafts}
          onLikePost={togglePostLike}
          onSubmitComment={submitPostComment}
          onOpenTaggedProducts={setTaggedPostId}
          followedSet={followedSet}
          onFollow={onFollow}
          onOpenCreator={onOpenCreator}
          onOpenProduct={onOpenProduct}
        />
      )}

      {false && !normalizedSearch && section === 'explore' && (
        <>
          <Text style={styles.influencerSectionTitle}>Keşfet</Text>
          <View style={styles.influencerGrid}>
            {posts.slice(0, 9).map((post) => (
              <InfluencerGridTile
                key={`explore-post-${post.id}`}
                title={post.title}
                imageUrl={postMediaList(post)[0] ?? post.mediaUrl}
                type={post.type}
                onLongPress={() => setTaggedPostId(post.id)}
              />
            ))}
          </View>
          <Text style={styles.influencerSectionTitle}>Günün hitleri</Text>
          {dailyHits.map((product) => (
            <InfluencerProductCard
              key={`daily-${product.id}`}
              product={product}
              creator={creators.find((creator) => creator.id === product.influencerId)}
              onOpen={() => onOpenProduct(product)}
              onAddToCart={() => onAddToCart(product.id)}
            />
          ))}
          <Text style={styles.influencerSectionTitle}>Haftanın hitleri</Text>
          {weeklyHits.map((product) => (
            <InfluencerProductCard
              key={`weekly-${product.id}`}
              product={product}
              creator={creators.find((creator) => creator.id === product.influencerId)}
              onOpen={() => onOpenProduct(product)}
              onAddToCart={() => onAddToCart(product.id)}
            />
          ))}
          <Text style={styles.influencerSectionTitle}>Ayın hitleri</Text>
          {monthlyHits.map((product) => (
            <InfluencerProductCard
              key={`monthly-${product.id}`}
              product={product}
              creator={creators.find((creator) => creator.id === product.influencerId)}
              onOpen={() => onOpenProduct(product)}
              onAddToCart={() => onAddToCart(product.id)}
            />
          ))}
          <Text style={styles.influencerSectionTitle}>Koleksiyonlar</Text>
          {collections.map((collection) => (
            <InfluencerCollectionCard
              key={collection.id}
              collection={collection}
              creator={creators.find((creator) => creator.id === collection.influencerId)}
              followed={followedSet.has(collection.influencerId)}
              onFollow={() => onFollow(collection.influencerId)}
            />
          ))}
        </>
      )}
    </View>
  );
}

function InfluencerCreatorCard({
  creator,
  followed,
  onFollow,
  onOpen,
}: {
  creator: InfluencerProfile;
  followed: boolean;
  onFollow: () => void;
  onOpen: () => void;
}) {
  return (
    <Pressable style={styles.influencerCreatorCard} onPress={onOpen}>
      <SafeImage uri={creator.heroUrl} style={styles.creatorHeroImage} />
      <SafeImage uri={creator.avatarUrl} style={styles.creatorAvatar} />
      <Text style={styles.influencerCardTitle}>{creator.name}{creator.verified ? ' · Onaylı' : ''}</Text>
      <Text style={styles.influencerMuted}>{creator.handle} · {creator.specialty}</Text>
      <Text style={styles.influencerSmallText}>{creator.followerCount.toLocaleString('tr-TR')} takipçi</Text>
      <Pressable style={[styles.influencerFollowButton, followed && styles.influencerFollowButtonActive]} onPress={onFollow}>
        <Text style={[styles.influencerFollowText, followed && styles.influencerFollowTextActive]}>
          {followed ? 'Takipte' : 'Takip et'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

function InfluencerSearchResults({
  creators,
  posts,
  products,
  followedSet,
  allCreators,
  productForPost,
  postStats,
  commentDrafts,
  setCommentDrafts,
  onLikePost,
  onSubmitComment,
  onOpenTaggedProducts,
  onFollow,
  onOpenCreator,
  onOpenProduct,
  onAddToCart,
}: {
  creators: InfluencerProfile[];
  posts: InfluencerPost[];
  products: InfluencerProduct[];
  followedSet: Set<string>;
  allCreators: InfluencerProfile[];
  productForPost: (post: InfluencerPost) => InfluencerProduct;
  postStats: (post: InfluencerPost) => { liked: boolean; likeCount: number; commentCount: number };
  commentDrafts: Record<string, string>;
  setCommentDrafts: (value: Record<string, string> | ((current: Record<string, string>) => Record<string, string>)) => void;
  onLikePost: (postId: string) => void;
  onSubmitComment: (postId: string) => void;
  onOpenTaggedProducts: (postId: string) => void;
  onFollow: (influencerId: string) => void;
  onOpenCreator: (influencerId: string) => void;
  onOpenProduct: (product: InfluencerProduct) => void;
  onAddToCart: (productId: string) => void;
}) {
  return (
    <View style={styles.influencerSearchResults}>
      <Text style={styles.influencerSectionTitle}>Arama sonuçları</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.influencerCreatorRail}>
        {creators.map((creator) => (
          <InfluencerCreatorCard
            key={`search-${creator.id}`}
            creator={creator}
            followed={followedSet.has(creator.id)}
            onFollow={() => onFollow(creator.id)}
            onOpen={() => onOpenCreator(creator.id)}
          />
        ))}
      </ScrollView>
      {products.length > 0 && (
        <>
          <Text style={styles.influencerSectionTitle}>Ürünler</Text>
          {products.map((product) => (
            <InfluencerProductCard
              key={`search-product-${product.id}`}
              product={product}
              creator={allCreators.find((creator) => creator.id === product.influencerId)}
              onOpen={() => onOpenProduct(product)}
              onAddToCart={() => onAddToCart(product.id)}
            />
          ))}
        </>
      )}
      {posts.length > 0 && (
        <>
          <Text style={styles.influencerSectionTitle}>Paylaşımlar</Text>
          <View style={styles.influencerGrid}>
            {posts.map((post) => (
              <InfluencerGridTile
                key={`search-post-${post.id}`}
                title={post.title}
                imageUrl={postMediaList(post)[0] ?? post.mediaUrl}
                type={post.type}
                meta={`${compactNumber(post.likeCount)} beğeni`}
                onLongPress={() => onOpenTaggedProducts(post.id)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function InfluencerExploreFeed({
  dailyPosts,
  weeklyPosts,
  monthlyPosts,
  creators,
  productForPost,
  linkedProductsForPost,
  postStats,
  commentDrafts,
  setCommentDrafts,
  onLikePost,
  onSubmitComment,
  onOpenTaggedProducts,
  followedSet,
  onFollow,
  onOpenCreator,
  onOpenProduct,
}: {
  dailyPosts: InfluencerPost[];
  weeklyPosts: InfluencerPost[];
  monthlyPosts: InfluencerPost[];
  creators: InfluencerProfile[];
  productForPost: (post: InfluencerPost) => InfluencerProduct;
  linkedProductsForPost: (post: InfluencerPost) => { link: InfluencerPostProductLink; product: InfluencerProduct }[];
  postStats: (post: InfluencerPost) => { liked: boolean; likeCount: number; commentCount: number };
  commentDrafts: Record<string, string>;
  setCommentDrafts: (value: Record<string, string> | ((current: Record<string, string>) => Record<string, string>)) => void;
  onLikePost: (postId: string) => void;
  onSubmitComment: (postId: string) => void;
  onOpenTaggedProducts: (postId: string) => void;
  followedSet: Set<string>;
  onFollow: (influencerId: string) => void;
  onOpenCreator: (influencerId: string) => void;
  onOpenProduct: (product: InfluencerProduct) => void;
}) {
  const trendPosts = [...dailyPosts, ...weeklyPosts, ...monthlyPosts]
    .filter((post, index, all) => all.findIndex((item) => item.id === post.id) === index);
  const renderPost = (post: InfluencerPost, prefix: string) => (
    <InfluencerTrendPost
      key={`${prefix}-${post.id}`}
      post={post}
      creator={creators.find((creator) => creator.id === post.influencerId)}
      followed={followedSet.has(post.influencerId)}
      linkedProducts={linkedProductsForPost(post)}
      stats={postStats(post)}
      commentValue={commentDrafts[post.id] ?? ''}
      onFollow={() => onFollow(post.influencerId)}
      onOpenCreator={() => onOpenCreator(post.influencerId)}
      onCommentChange={(value) => setCommentDrafts((current) => ({ ...current, [post.id]: value }))}
      onLike={() => onLikePost(post.id)}
      onSubmitComment={() => onSubmitComment(post.id)}
      onOpenTaggedProducts={() => onOpenTaggedProducts(post.id)}
      onOpenProduct={() => onOpenProduct(productForPost(post))}
    />
  );

  return (
    <View style={styles.influencerSearchResults}>
      <Text style={styles.influencerSectionTitle}>Keşfet</Text>
      {trendPosts.map((post) => renderPost(post, 'trend'))}
    </View>
  );
}

function InfluencerMedia({
  uri,
  type,
  style,
}: {
  uri: string;
  type?: InfluencerPost['type'];
  style: any;
}) {
  const isVideo = type === 'video' || /\.(mp4|mov|webm)(\?|$)/i.test(uri);

  if (isVideo) {
    return (
      <View style={[style, styles.videoPlaceholder]}>
        <Text style={styles.videoPlayMark}>Video</Text>
      </View>
    );
  }

  return <SafeImage uri={uri} style={style} />;
}

function InfluencerEngagementBar({
  stats,
  comments = [],
  commentValue,
  onCommentChange,
  onLike,
  onSubmitComment,
}: {
  stats: { liked: boolean; likeCount: number; commentCount: number };
  comments?: InfluencerPostComment[];
  commentValue: string;
  onCommentChange: (value: string) => void;
  onLike: () => void;
  onSubmitComment: () => void;
}) {
  const visibleComments = comments.slice(-3);

  return (
    <View style={styles.engagementBox}>
      <View style={styles.engagementActions}>
        <Pressable style={[styles.engagementButton, stats.liked && styles.engagementButtonActive]} onPress={onLike}>
          <Text style={[styles.engagementButtonText, stats.liked && styles.engagementButtonTextActive]}>
            {stats.liked ? 'Beğenildi' : 'Beğen'}
          </Text>
        </Pressable>
        <Text style={styles.influencerEngagement}>
          {compactNumber(stats.likeCount)} beğeni · {compactNumber(stats.commentCount)} yorum
        </Text>
      </View>
      <View style={styles.commentRow}>
        <TextInput
          placeholder="Yorum ekle..."
          placeholderTextColor="#8a918c"
          value={commentValue}
          onChangeText={onCommentChange}
          style={styles.commentInput}
        />
        <Pressable style={styles.commentSubmitButton} onPress={onSubmitComment}>
          <Text style={styles.commentSubmitText}>Gönder</Text>
        </Pressable>
      </View>
      {visibleComments.length > 0 && (
        <View style={styles.commentList}>
          {visibleComments.map((comment) => (
            <View key={comment.id} style={styles.commentBubble}>
              <Text style={styles.commentAuthor}>{comment.profileName || 'Kullanıcı'}</Text>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function InfluencerTrendPost({
  post,
  creator,
  followed,
  linkedProducts,
  stats,
  commentValue,
  onFollow,
  onOpenCreator,
  onOpenProduct,
  onCommentChange,
  onLike,
  onSubmitComment,
  onOpenTaggedProducts,
}: {
  post: InfluencerPost;
  creator?: InfluencerProfile;
  followed: boolean;
  linkedProducts: { link: InfluencerPostProductLink; product: InfluencerProduct }[];
  stats: { liked: boolean; likeCount: number; commentCount: number };
  commentValue: string;
  onFollow: () => void;
  onOpenCreator: () => void;
  onOpenProduct: () => void;
  onCommentChange: (value: string) => void;
  onLike: () => void;
  onSubmitComment: () => void;
  onOpenTaggedProducts: () => void;
}) {
  const mediaUrls = postMediaList(post);

  return (
    <View style={styles.trendPostCard}>
      <Pressable
        style={styles.trendMediaWrap}
        onLongPress={linkedProducts.length > 0 ? onOpenTaggedProducts : undefined}
      >
        <InfluencerMedia uri={mediaUrls[0] ?? post.mediaUrl} type={post.type} style={styles.trendMedia} />
        {linkedProducts.length > 0 && (
          <Text style={styles.trendProductHint}>Basılı tut · {linkedProducts.length} ürün</Text>
        )}
        {mediaUrls.length > 1 && (
          <Text style={styles.vitrinMediaCount}>{mediaUrls.length} medya</Text>
        )}
      </Pressable>
      {mediaUrls.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitrinThumbRail}>
          {mediaUrls.map((uri) => (
            <InfluencerMedia key={`${post.id}-trend-media-${uri}`} uri={uri} type={post.type} style={styles.vitrinThumbImage} />
          ))}
        </ScrollView>
      )}
      <View style={styles.trendPostBody}>
        <View style={styles.influencerPostTop}>
          {creator && (
            <Pressable onPress={onOpenCreator}>
              <SafeImage uri={creator.avatarUrl} style={styles.postAvatar} />
            </Pressable>
          )}
          <Pressable style={styles.cartInfo} onPress={onOpenCreator}>
            <Text style={styles.influencerCardTitle}>{creator?.name ?? 'Vitrin'}</Text>
            <Text style={styles.influencerMuted}>{creator?.handle ?? '@vitrin'} · {post.title}</Text>
          </Pressable>
          <Pressable style={[styles.influencerMiniButton, followed && styles.influencerMiniButtonActive]} onPress={onFollow}>
            <Text style={[styles.influencerMiniText, followed && styles.influencerMiniTextActive]}>{followed ? 'Takipte' : 'Takip'}</Text>
          </Pressable>
        </View>
        <Text style={styles.influencerMuted}>{post.caption}</Text>
        <InfluencerEngagementBar
          stats={stats}
          comments={post.comments}
          commentValue={commentValue}
          onCommentChange={onCommentChange}
          onLike={onLike}
          onSubmitComment={onSubmitComment}
        />
      </View>
    </View>
  );
}

function InfluencerPostCard({
  post,
  creator,
  followed,
  onFollow,
  onOpenCreator,
  onOpenProduct,
  linkedProducts = [],
  stats,
  commentValue,
  onCommentChange,
  onLike,
  onSubmitComment,
  onOpenTaggedProducts,
}: {
  post: InfluencerPost;
  creator?: InfluencerProfile;
  followed: boolean;
  onFollow: () => void;
  onOpenCreator: () => void;
  onOpenProduct: () => void;
  linkedProducts?: { link: InfluencerPostProductLink; product: InfluencerProduct }[];
  stats: { liked: boolean; likeCount: number; commentCount: number };
  commentValue: string;
  onCommentChange: (value: string) => void;
  onLike: () => void;
  onSubmitComment: () => void;
  onOpenTaggedProducts: () => void;
}) {
  const mediaUrls = postMediaList(post);

  return (
    <View style={styles.influencerPostCard}>
      <View style={styles.influencerPostTop}>
        {creator && (
          <Pressable onPress={onOpenCreator}>
            <SafeImage uri={creator.avatarUrl} style={styles.postAvatar} />
          </Pressable>
        )}
        <Pressable style={styles.cartInfo} onPress={onOpenCreator}>
          <Text style={styles.influencerCardTitle}>{creator?.name ?? 'Vitrin'}</Text>
          <Text style={styles.influencerMuted}>{creator?.handle ?? '@vitrin'} · {post.type === 'video' ? 'Video' : post.type === 'campaign' ? 'Kampanya' : 'Post'}</Text>
        </Pressable>
        <Pressable style={[styles.influencerMiniButton, followed && styles.influencerMiniButtonActive]} onPress={onFollow}>
          <Text style={[styles.influencerMiniText, followed && styles.influencerMiniTextActive]}>{followed ? 'Takipte' : 'Takip'}</Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.influencerMediaWrap}
        onLongPress={linkedProducts.length > 0 ? onOpenTaggedProducts : undefined}
      >
        <InfluencerMedia uri={mediaUrls[0] ?? post.mediaUrl} type={post.type} style={styles.influencerPostImage} />
        {mediaUrls.length > 1 && (
          <Text style={styles.vitrinMediaCount}>{mediaUrls.length} medya</Text>
        )}
        {linkedProducts.length > 0 && (
          <Text style={styles.vitrinProductHint}>Ürünleri görmek için basılı tut</Text>
        )}
      </Pressable>
      {mediaUrls.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitrinThumbRail}>
          {mediaUrls.map((uri) => (
            <InfluencerMedia key={`${post.id}-media-${uri}`} uri={uri} type={post.type} style={styles.vitrinThumbImage} />
          ))}
        </ScrollView>
      )}
      <View style={styles.influencerPostBody}>
        <Text style={styles.influencerPostTitle}>{post.title}</Text>
        <InfluencerEngagementBar
          stats={stats}
          comments={post.comments}
          commentValue={commentValue}
          onCommentChange={onCommentChange}
          onLike={onLike}
          onSubmitComment={onSubmitComment}
        />
        <Text style={styles.influencerMuted}>{post.caption}</Text>
        <View style={styles.influencerTagRow}>
          {post.tags.map((tag) => (
            <Text key={tag} style={styles.influencerTag}>#{tag}</Text>
          ))}
        </View>
        {linkedProducts.length > 0 && (
          <Pressable style={styles.textButton} onPress={onOpenTaggedProducts}>
            <Text style={styles.textButtonText}>{linkedProducts.length} reklam ürünü</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function InfluencerProductDetail({
  product,
  creator,
  onBack,
  onAddToCart,
}: {
  product: InfluencerProduct;
  creator?: InfluencerProfile;
  onBack: () => void;
  onAddToCart: () => void;
}) {
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] ?? '');
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] ?? '');
  const images = productImageList(product);
  const [selectedImage, setSelectedImage] = useState(images[0] ?? product.imageUrl);

  useEffect(() => {
    setSelectedSize(product.sizes?.[0] ?? '');
    setSelectedColor(product.colors?.[0] ?? '');
    setSelectedImage(productImageList(product)[0] ?? product.imageUrl);
  }, [product.id]);

  return (
    <View style={styles.influencerStack}>
      <Pressable onPress={onBack}>
        <Text style={styles.backText}>Vitrine dön</Text>
      </Pressable>
      <View style={styles.influencerProductDetail}>
        <SafeImage uri={selectedImage} style={styles.influencerProductDetailImage} />
        {images.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vitrinThumbRail}>
            {images.map((uri) => (
              <Pressable key={`detail-image-${uri}`} onPress={() => setSelectedImage(uri)}>
                <SafeImage uri={uri} style={[styles.vitrinThumbImage, selectedImage === uri && styles.vitrinThumbImageActive]} />
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={styles.influencerProductDetailBody}>
          <Text style={styles.influencerHeroTitle}>{product.title}</Text>
          <Text style={styles.productDetailPrice}>{product.priceText}</Text>
          <Text style={styles.influencerHeroText}>{product.description}</Text>
          {product.detailText && <Text style={styles.influencerMuted}>{product.detailText}</Text>}
          <View style={styles.productDetailInfoBox}>
            <Text style={styles.productDetailLabel}>Satıcı</Text>
            <Text style={styles.productDetailValue}>{product.sellerName || creator?.name || 'Vitrin satıcısı'}</Text>
          </View>
          {creator && (
            <View style={styles.productDetailInfoBox}>
              <Text style={styles.productDetailLabel}>Vitrin</Text>
              <Text style={styles.productDetailValue}>{creator.name} · {creator.handle}</Text>
            </View>
          )}
          {Boolean(product.sizes?.length) && (
            <View style={styles.productOptionGroup}>
              <Text style={styles.productDetailLabel}>Beden / seçenek</Text>
              <View style={styles.productOptionRow}>
                {product.sizes?.map((size) => (
                  <Pressable
                    key={size}
                    style={[styles.productOptionChip, selectedSize === size && styles.productOptionChipActive]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text style={[styles.productOptionText, selectedSize === size && styles.productOptionTextActive]}>{size}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {Boolean(product.colors?.length) && (
            <View style={styles.productOptionGroup}>
              <Text style={styles.productDetailLabel}>Renk</Text>
              <View style={styles.productOptionRow}>
                {product.colors?.map((color) => (
                  <Pressable
                    key={color}
                    style={[styles.productOptionChip, selectedColor === color && styles.productOptionChipActive]}
                    onPress={() => setSelectedColor(color)}
                  >
                    <Text style={[styles.productOptionText, selectedColor === color && styles.productOptionTextActive]}>{color}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {product.stockText && <Text style={styles.productLinkMeta}>{product.stockText}</Text>}
          <Pressable style={styles.influencerPrimaryButton} onPress={onAddToCart}>
            <Text style={styles.influencerPrimaryText}>Sepete ekle</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function InfluencerTaggedProductsScreen({
  post,
  creator,
  linkedProducts,
  onBack,
  onOpenProduct,
}: {
  post: InfluencerPost;
  creator?: InfluencerProfile;
  linkedProducts: { link: InfluencerPostProductLink; product: InfluencerProduct }[];
  onBack: () => void;
  onOpenProduct: (product: InfluencerProduct) => void;
}) {
  return (
    <View style={styles.influencerStack}>
      <Pressable onPress={onBack}>
        <Text style={styles.backText}>Paylaşıma dön</Text>
      </Pressable>
      <View style={styles.influencerPanel}>
        <Text style={styles.influencerSectionTitle}>Reklam ürünleri</Text>
        <Text style={styles.influencerMuted}>
          {creator?.name ?? 'Vitrin'} · {post.title}
        </Text>
        <SafeImage uri={postMediaList(post)[0] ?? post.mediaUrl} style={styles.taggedPostPreview} />
        {linkedProducts.length === 0 ? (
          <View style={styles.vitrinEmptyDark}>
            <Text style={styles.influencerCardTitle}>Ürün etiketi yok</Text>
            <Text style={styles.influencerMuted}>Bu paylaşımda reklam ürünü bağlanmamış.</Text>
          </View>
        ) : (
          linkedProducts.map(({ link, product }) => (
            <Pressable key={`tagged-product-${product.id}`} style={styles.taggedProductActionRow} onPress={() => onOpenProduct(product)}>
              <SafeImage uri={productImageList(product)[0] ?? product.imageUrl} style={styles.taggedProductImage} />
              <View style={styles.cartInfo}>
                <Text style={styles.taggedProductTitle}>{link.label || product.title}</Text>
                <Text style={styles.productLinkMeta}>{product.title} · {product.priceText}</Text>
              </View>
              <Text style={styles.productLinkAction}>Ürüne git</Text>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

function InfluencerProductCard({
  product,
  creator,
  onOpen,
  onAddToCart,
}: {
  product: InfluencerProduct;
  creator?: InfluencerProfile;
  onOpen: () => void;
  onAddToCart?: () => void;
}) {
  return (
    <View style={styles.influencerProductCard}>
      <Pressable onPress={onOpen}>
        <SafeImage uri={productImageList(product)[0] ?? product.imageUrl} style={styles.influencerProductImage} />
      </Pressable>
      <View style={styles.cartInfo}>
        <Text style={styles.productLinkTitle}>{product.title}</Text>
        <Text style={styles.influencerMuted}>{creator?.name ?? 'Vitrin'} · {product.linkText ?? 'Vitrin ürünü'}</Text>
        <Text style={styles.productLinkMeta}>{product.priceText}{product.stockText ? ` · ${product.stockText}` : ''}</Text>
      </View>
      <View style={styles.vitrinProductActions}>
        <Pressable onPress={onOpen}>
          <Text style={styles.productLinkAction}>Aç</Text>
        </Pressable>
        {onAddToCart && (
          <Pressable style={styles.vitrinAddButton} onPress={onAddToCart}>
            <Text style={styles.vitrinAddText}>Sepet</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function InfluencerGridTile({
  imageUrl,
  type,
  title,
  meta,
  onPress,
  onLongPress,
}: {
  imageUrl: string;
  type?: InfluencerPost['type'];
  title: string;
  meta?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable style={styles.influencerGridTile} onPress={onPress} onLongPress={onLongPress}>
      <InfluencerMedia uri={imageUrl} type={type} style={styles.influencerGridImage} />
      <View style={styles.influencerGridOverlay}>
        <Text style={styles.influencerGridText} numberOfLines={2}>{title}</Text>
        {meta && <Text style={styles.influencerGridMeta}>{meta}</Text>}
      </View>
    </Pressable>
  );
}

function InfluencerCartScreen({
  lines,
  total,
  onUpdateQuantity,
  onCheckout,
  onOpenProduct,
}: {
  lines: { item: InfluencerCartItem; product: InfluencerProduct; creator?: InfluencerProfile }[];
  total: number;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onCheckout: () => void;
  onOpenProduct: (product: InfluencerProduct) => void;
}) {
  return (
    <View style={styles.influencerPanel}>
      <Text style={styles.influencerSectionTitle}>Vitrin sepeti</Text>
      {lines.length === 0 ? (
        <View style={styles.influencerEmpty}>
          <Text style={styles.influencerCardTitle}>Sepet boş</Text>
        </View>
      ) : (
        <>
          {lines.map(({ item, product, creator }) => (
            <View key={item.id} style={styles.vitrinCartRow}>
              <Pressable onPress={() => onOpenProduct(product)}>
                <SafeImage uri={productImageList(product)[0] ?? product.imageUrl} style={styles.influencerProductImage} />
              </Pressable>
              <View style={styles.cartInfo}>
                <Text style={styles.productLinkTitle}>{product.title}</Text>
                <Text style={styles.influencerMuted}>{creator?.name ?? 'Vitrin'} · {product.priceText}</Text>
                <View style={styles.quantityRow}>
                  <Pressable style={styles.quantityButton} onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}>
                    <Text style={styles.quantityText}>-</Text>
                  </Pressable>
                  <Text style={styles.quantityText}>{item.quantity}</Text>
                  <Pressable style={styles.quantityButton} onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}>
                    <Text style={styles.quantityText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
          <View style={styles.vitrinCartSummary}>
            <Text style={styles.influencerCardTitle}>Tahmini toplam</Text>
            <Text style={styles.influencerCardTitle}>{total > 0 ? money(total) : 'Fiyatlar metinsel'}</Text>
          </View>
          <Pressable style={styles.influencerPrimaryButton} onPress={onCheckout}>
            <Text style={styles.influencerPrimaryText}>Vitrin sepetini onayla</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function InfluencerCollectionCard({
  collection,
  creator,
  followed,
  onFollow,
}: {
  collection: InfluencerCollection;
  creator?: InfluencerProfile;
  followed: boolean;
  onFollow: () => void;
}) {
  return (
    <View style={styles.collectionCard}>
      <SafeImage uri={collection.mediaUrl} style={styles.collectionImage} />
      <View style={styles.collectionOverlay}>
        <Text style={styles.collectionTitle}>{collection.title}</Text>
        <Text style={styles.collectionText}>{collection.text}</Text>
        <Text style={styles.collectionMeta}>{creator?.name ?? 'Vitrin'} · {collection.productCount} ürün</Text>
        <Pressable style={[styles.influencerFollowButton, followed && styles.influencerFollowButtonActive]} onPress={onFollow}>
          <Text style={[styles.influencerFollowText, followed && styles.influencerFollowTextActive]}>
            {followed ? 'Takipte' : 'Vitrini takip et'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function InfluencerBottomBar({
  active,
  cartCount,
  onChange,
  onSade,
}: {
  active: InfluencerSection;
  cartCount: number;
  onChange: (section: InfluencerSection) => void;
  onSade: () => void;
}) {
  const tabs: { key?: InfluencerSection; label: string }[] = [
    { key: 'feed', label: 'Akış' },
    { key: 'explore', label: 'Keşfet' },
    { key: 'cart', label: 'Sepet' },
    { key: 'manage', label: 'Yönet' },
    { label: 'Sade' },
  ];

  return (
    <View style={styles.influencerBottomBar}>
      {tabs.map((item) => (
        <Pressable
          key={item.label}
          style={styles.bottomButton}
          onPress={() => (item.key ? onChange(item.key) : onSade())}
        >
          {item.key === 'cart' && cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
          <Text style={[styles.influencerBottomText, item.key === active && styles.influencerBottomTextActive]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function BottomBar({ role, active, cartCount, onChange }: { role: Role; active: Tab; cartCount: number; onChange: (tab: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] =
    role === 'seller'
      ? [
          { key: 'seller', label: 'Panel' },
          { key: 'sellerRequests', label: 'Talepler' },
          { key: 'sellerBids', label: 'Teklifler' },
          { key: 'sellerProducts', label: 'Ürünler' },
          { key: 'influencer', label: 'Vitrin' },
          { key: 'profile', label: 'Profil' },
        ]
      : [
          { key: 'home', label: 'Ürünler' },
          { key: 'saved', label: 'Kaydet' },
          { key: 'cart', label: 'Sepet' },
          { key: 'orders', label: 'Siparişler' },
          { key: 'profile', label: 'Profil' },
          { key: 'influencer', label: 'Vitrin' },
        ];

  return (
    <View style={styles.bottomBar}>
      {tabs.map((item) => (
        <Pressable key={item.key} style={styles.bottomButton} onPress={() => onChange(item.key)}>
          {item.key === 'cart' && cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
            </View>
          )}
          <Text style={[styles.bottomText, active === item.key && styles.bottomTextActive]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function MetricBox({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.metricBox} onPress={onPress}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}

function getRevenueForDays(orders: Order[], days: number) {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return orders
    .filter((order) => new Date(order.createdAt).getTime() >= since)
    .reduce((sum, order) => sum + order.total, 0);
}

function AuthButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.authButton, active && styles.authButtonActive]} onPress={onPress}>
      <Text style={[styles.authButtonText, active && styles.authButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RoleButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.roleButton, active && styles.roleButtonActive]} onPress={onPress}>
      <Text style={[styles.roleButtonText, active && styles.roleButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ConsentRow({ checked, text, onPress }: { checked: boolean; text: string; onPress: () => void }) {
  return (
    <Pressable style={styles.consentRow} onPress={onPress}>
      <View style={[styles.checkbox, checked && styles.checkboxActive]}>
        <Text style={[styles.checkboxText, checked && styles.checkboxTextActive]}>{checked ? '✓' : ''}</Text>
      </View>
      <Text style={styles.consentText}>{text}</Text>
    </Pressable>
  );
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const { style, ...rest } = props;
  return <TextInput {...rest} placeholderTextColor="#8a918c" style={[styles.input, rest.multiline && styles.inputTall, style]} />;
}

function InfoLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.label}>{label}</Text>
      <Text style={strong ? styles.price : styles.value}>{value}</Text>
    </View>
  );
}

function EmptyState({ title }: { title: string; text?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f8f5',
  },
  shell: {
    flex: 1,
  },
  page: {
    alignSelf: 'center',
    maxWidth: 980,
    padding: 16,
    paddingBottom: 100,
    width: '100%',
  },
  influencerPage: {
    backgroundColor: '#f5f7f4',
    minHeight: '100%',
  },
  loading: {
    color: '#17201b',
    fontSize: 18,
    fontWeight: '800',
    margin: 24,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  brand: {
    color: '#151b17',
    fontSize: 26,
    fontWeight: '800',
  },
  subtle: {
    color: '#68706b',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },
  stack: {
    gap: 12,
  },
  profileTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e3da',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  barcodePanel: {
    backgroundColor: '#ffffff',
    borderColor: '#d7e4dc',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricBox: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 78,
    padding: 12,
  },
  orderSummaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  orderSummaryBox: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 66,
    padding: 10,
  },
  metricValue: {
    color: '#17201b',
    fontSize: 24,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#69716c',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  revenueBox: {
    backgroundColor: '#ffffff',
    borderColor: '#1f6b4d',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  revenueRow: {
    gap: 8,
  },
  revenueHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barTrack: {
    backgroundColor: '#edf0ec',
    borderRadius: 8,
    height: 10,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#1f6b4d',
    borderRadius: 8,
    height: 10,
  },
  title: {
    color: '#151b17',
    fontSize: 19,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#17201b',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  welcome: {
    color: '#17201b',
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: '#515a55',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  fieldLabel: {
    color: '#17201b',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: -4,
    marginTop: 2,
  },
  helperText: {
    color: '#69716c',
    fontSize: 12,
    fontWeight: '700',
    marginTop: -6,
  },
  authTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  authButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d8d2c8',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  authButtonActive: {
    backgroundColor: '#17201b',
    borderColor: '#17201b',
  },
  authButtonText: {
    color: '#17201b',
    fontSize: 15,
    fontWeight: '800',
  },
  authButtonTextActive: {
    color: '#ffffff',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d8d2c8',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 8,
  },
  roleButtonActive: {
    backgroundColor: '#1f6b4d',
    borderColor: '#1f6b4d',
  },
  roleButtonText: {
    color: '#17201b',
    fontSize: 14,
    fontWeight: '800',
  },
  roleButtonTextActive: {
    color: '#ffffff',
  },
  legalConsentBox: {
    backgroundColor: '#f8f6f2',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  legalLinkRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 10,
  },
  legalLinkText: {
    color: '#17201b',
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  legalLinkMeta: {
    color: '#1f6b4d',
    fontSize: 12,
    fontWeight: '800',
  },
  legalPreviewBox: {
    backgroundColor: '#ffffff',
    borderColor: '#d8d2c8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  consentRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  checkbox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#bfc7c1',
    borderRadius: 5,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    marginTop: 2,
    width: 22,
  },
  checkboxActive: {
    backgroundColor: '#1f6b4d',
    borderColor: '#1f6b4d',
  },
  checkboxText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  checkboxTextActive: {
    color: '#ffffff',
  },
  consentText: {
    color: '#4f5a54',
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  searchFilterWrap: {
    gap: 8,
  },
  searchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  filterIconButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    position: 'relative',
    width: 48,
  },
  filterIconButtonActive: {
    backgroundColor: '#e4f1e9',
    borderColor: '#1f6b4d',
  },
  filterIconLine: {
    backgroundColor: '#17201b',
    borderRadius: 999,
    height: 3,
    marginVertical: 2,
  },
  filterIconLineActive: {
    backgroundColor: '#1f6b4d',
  },
  filterBadge: {
    alignItems: 'center',
    backgroundColor: '#1f6b4d',
    borderRadius: 999,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    right: -5,
    top: -5,
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  filterPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  filterTitle: {
    color: '#17201b',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  filterChips: {
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: '#1f6b4d',
    borderColor: '#1f6b4d',
  },
  filterChipText: {
    color: '#17201b',
    fontSize: 13,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterFooter: {
    gap: 8,
  },
  clearFiltersButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 34,
    justifyContent: 'center',
  },
  clearFiltersText: {
    color: '#6b5540',
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#ddd8d1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#151b17',
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputTall: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  uploadBox: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 130,
    padding: 12,
  },
  uploadPreview: {
    backgroundColor: '#ebe4da',
    borderRadius: 8,
    height: 160,
    width: '100%',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#121916',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e4f1e9',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42,
    marginTop: 10,
  },
  secondaryButtonCompact: {
    alignItems: 'center',
    backgroundColor: '#e4f1e9',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 10,
  },
  secondaryButtonText: {
    color: '#1f6b4d',
    fontSize: 14,
    fontWeight: '800',
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#fff4ef',
    borderColor: '#e0b7a8',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  logoutButtonText: {
    color: '#8a4b38',
    fontSize: 15,
    fontWeight: '800',
  },
  settingsIconButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d8d2c8',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  settingsIconLine: {
    backgroundColor: '#17201b',
    borderRadius: 999,
    height: 3,
    marginVertical: 2,
  },
  settingsRow: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    padding: 12,
  },
  settingsArrow: {
    color: '#69716c',
    fontSize: 20,
    fontWeight: '800',
  },
  preferenceRow: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    padding: 10,
  },
  preferenceRowDisabled: {
    opacity: 0.55,
  },
  preferenceSwitch: {
    backgroundColor: '#d8d2c8',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 48,
  },
  preferenceSwitchActive: {
    alignItems: 'flex-end',
    backgroundColor: '#1f6b4d',
  },
  preferenceSwitchDisabled: {
    backgroundColor: '#d8d2c8',
  },
  preferenceKnob: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 22,
    width: 22,
  },
  preferenceKnobActive: {
    backgroundColor: '#ffffff',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#17201b',
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  scannerCamera: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerPanel: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    gap: 8,
    padding: 16,
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  notificationCardUnread: {
    backgroundColor: '#eef7f1',
    borderColor: '#bddcc9',
  },
  notificationTopLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  unreadPill: {
    backgroundColor: '#1f6b4d',
    borderRadius: 999,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  influencerStack: {
    gap: 14,
  },
  influencerHero: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 0,
    gap: 5,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  influencerEyebrow: {
    color: '#657069',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  influencerHeroTitle: {
    color: '#151b17',
    fontSize: 26,
    fontWeight: '800',
  },
  influencerHeroText: {
    color: '#515a55',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  influencerTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  influencerTopTitle: {
    color: '#151b17',
    fontSize: 28,
    fontWeight: '800',
  },
  vitrinNoticePanel: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  vitrinNoticeRow: {
    borderBottomColor: '#eee8df',
    borderBottomWidth: 1,
    gap: 2,
    paddingBottom: 8,
  },
  creatorRequestCard: {
    alignItems: 'center',
    backgroundColor: '#f9efe7',
    borderColor: '#ffb15c',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  influencerTopSearch: {
    backgroundColor: '#ffffff',
    borderColor: '#e6e1d8',
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
  },
  influencerSearchInput: {
    backgroundColor: '#ffffff',
    color: '#171012',
  },
  influencerNoticeRail: {
    gap: 10,
    paddingRight: 18,
  },
  influencerNoticePill: {
    backgroundColor: '#ffffff',
    borderColor: '#e6e1d8',
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 170,
    padding: 10,
  },
  influencerNoticeTitle: {
    color: '#1f6b4d',
    fontSize: 13,
    fontWeight: '800',
  },
  influencerNoticeText: {
    color: '#69716c',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    marginTop: 3,
  },
  creatorRequestTitle: {
    color: '#1a1014',
    fontSize: 16,
    fontWeight: '800',
  },
  creatorRequestText: {
    color: '#715d62',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  influencerPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#173d31',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  influencerPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  influencerGhostButton: {
    alignItems: 'center',
    backgroundColor: '#f3eee7',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  influencerGhostText: {
    color: '#173d31',
    fontSize: 13,
    fontWeight: '800',
  },
  influencerSectionTitle: {
    color: '#151b17',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  influencerEmpty: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  influencerManageStack: {
    gap: 12,
  },
  influencerPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#e6e1d8',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  vitrinMediaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  vitrinMediaPicker: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 104,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vitrinHeroPicker: {
    flex: 2,
  },
  vitrinMediaPreview: {
    height: '100%',
    width: '100%',
  },
  vitrinLargePicker: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 190,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vitrinLargePreview: {
    height: '100%',
    width: '100%',
  },
  vitrinChecklist: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitrinChecklistItem: {
    backgroundColor: '#f3eee7',
    borderRadius: 999,
    color: '#6b5d63',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vitrinChecklistItemDone: {
    backgroundColor: '#e3f2e8',
    color: '#126344',
  },
  vitrinMediaCount: {
    backgroundColor: 'rgba(23,16,18,0.78)',
    borderRadius: 999,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
    position: 'absolute',
    right: 10,
    top: 10,
  },
  vitrinThumbRail: {
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  vitrinThumbImage: {
    backgroundColor: '#342930',
    borderColor: '#43323a',
    borderRadius: 8,
    borderWidth: 1,
    height: 64,
    width: 64,
  },
  vitrinThumbImageActive: {
    borderColor: '#ff6a3d',
    borderWidth: 2,
  },
  vitrinManageHeader: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14,
  },
  vitrinManageTabs: {
    gap: 8,
    paddingRight: 18,
  },
  vitrinCountPill: {
    backgroundColor: '#2a4036',
    borderRadius: 999,
    color: '#bdf5d2',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vitrinBuilderCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12,
  },
  vitrinBuilderHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  vitrinBuilderEyebrow: {
    color: '#1f6b4d',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  vitrinProductBuilderGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  vitrinProductHeroPicker: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    flex: 1.35,
    height: 190,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vitrinProductHeroImage: {
    height: '100%',
    width: '100%',
  },
  vitrinProgressCard: {
    backgroundColor: '#f8f6f2',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 12,
  },
  vitrinProgressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  vitrinProgressDot: {
    backgroundColor: '#d8d2c8',
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  vitrinProgressDotActive: {
    backgroundColor: '#1f6b4d',
  },
  vitrinProgressText: {
    color: '#17201b',
    fontSize: 12,
    fontWeight: '800',
  },
  vitrinFormGroup: {
    backgroundColor: '#f8f6f2',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  vitrinGroupTitle: {
    color: '#17201b',
    fontSize: 14,
    fontWeight: '800',
  },
  vitrinEmptyDark: {
    backgroundColor: '#f8f6f2',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  vitrinLibraryRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  vitrinLibraryImage: {
    backgroundColor: '#eee7dc',
    borderRadius: 8,
    height: 72,
    width: 72,
  },
  vitrinPostActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  vitrinPostPreviewWrap: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 310,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  vitrinPostPreviewMedia: {
    height: '100%',
    width: '100%',
  },
  vitrinProductSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitrinSelectableProduct: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 8,
    minHeight: 190,
    padding: 8,
  },
  vitrinSelectableProductActive: {
    borderColor: '#ff6a3d',
  },
  vitrinSelectableImage: {
    backgroundColor: '#eee7dc',
    borderRadius: 8,
    height: 98,
    width: '100%',
  },
  vitrinSelectableTitle: {
    color: '#171012',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  vitrinSelectableMeta: {
    color: '#6b5d63',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  vitrinFeedProductCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 8,
    width: 150,
  },
  vitrinFeedProductImage: {
    backgroundColor: '#eee7dc',
    borderRadius: 8,
    height: 116,
    width: '100%',
  },
  vitrinSelectMark: {
    color: '#8a817f',
    fontSize: 12,
    fontWeight: '800',
  },
  vitrinSelectMarkActive: {
    color: '#d94c29',
  },
  influencerCreatorRail: {
    gap: 12,
    paddingRight: 18,
  },
  influencerCreatorCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10,
    width: 210,
  },
  creatorHeroImage: {
    backgroundColor: '#352830',
    borderRadius: 8,
    height: 96,
    width: '100%',
  },
  creatorAvatar: {
    backgroundColor: '#342930',
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 3,
    height: 58,
    marginTop: -34,
    width: 58,
  },
  creatorProfileHeroImage: {
    backgroundColor: '#352830',
    borderRadius: 8,
    height: 170,
    width: '100%',
  },
  creatorProfileAvatar: {
    backgroundColor: '#342930',
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 4,
    height: 82,
    marginTop: -48,
    width: 82,
  },
  influencerCardTitle: {
    color: '#151b17',
    fontSize: 16,
    fontWeight: '700',
  },
  influencerMuted: {
    color: '#68706b',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  influencerSmallText: {
    color: '#1f6b4d',
    fontSize: 12,
    fontWeight: '800',
  },
  influencerFollowButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  influencerFollowButtonActive: {
    backgroundColor: '#2a4036',
  },
  influencerFollowText: {
    color: '#181013',
    fontSize: 13,
    fontWeight: '800',
  },
  influencerFollowTextActive: {
    color: '#bdf5d2',
  },
  influencerPostCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  influencerPostTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  postAvatar: {
    backgroundColor: '#342930',
    borderRadius: 999,
    height: 44,
    width: 44,
  },
  influencerMiniButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 10,
  },
  influencerMiniButtonActive: {
    backgroundColor: '#2a4036',
  },
  influencerMiniText: {
    color: '#181013',
    fontSize: 12,
    fontWeight: '800',
  },
  influencerMiniTextActive: {
    color: '#bdf5d2',
  },
  influencerPostImage: {
    backgroundColor: '#ebe4da',
    height: 260,
    width: '100%',
  },
  influencerMediaWrap: {
    position: 'relative',
  },
  vitrinProductHint: {
    backgroundColor: 'rgba(23,32,27,0.78)',
    borderRadius: 999,
    bottom: 10,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'absolute',
    right: 10,
  },
  trendPostCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e6e1d8',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trendMediaWrap: {
    backgroundColor: '#e9ede8',
    minHeight: 520,
    position: 'relative',
  },
  trendMedia: {
    height: 560,
    width: '100%',
  },
  trendProductHint: {
    backgroundColor: 'rgba(23,32,27,0.78)',
    borderRadius: 999,
    bottom: 14,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: 'absolute',
    right: 12,
  },
  trendPostBody: {
    gap: 10,
    padding: 12,
  },
  engagementBox: {
    gap: 8,
  },
  engagementActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  engagementButton: {
    backgroundColor: '#f8f6f2',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  engagementButtonActive: {
    backgroundColor: '#e4f1e9',
    borderColor: '#1f6b4d',
  },
  engagementButtonText: {
    color: '#17201b',
    fontSize: 12,
    fontWeight: '800',
  },
  engagementButtonTextActive: {
    color: '#1f6b4d',
  },
  commentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  commentInput: {
    backgroundColor: '#f8f6f2',
    borderColor: '#ded8cf',
    borderRadius: 999,
    borderWidth: 1,
    color: '#17201b',
    flex: 1,
    fontSize: 13,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  commentSubmitButton: {
    backgroundColor: '#1f6b4d',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  commentSubmitText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  commentList: {
    gap: 6,
  },
  commentBubble: {
    backgroundColor: '#f7f4ee',
    borderColor: '#ebe5db',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  commentAuthor: {
    color: '#17201b',
    fontSize: 12,
    fontWeight: '800',
  },
  commentText: {
    color: '#4e5752',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 2,
  },
  postProductTag: {
    backgroundColor: '#ffffff',
    borderColor: '#ffcf8b',
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 140,
    paddingHorizontal: 9,
    paddingVertical: 6,
    position: 'absolute',
    transform: [{ translateX: -18 }, { translateY: -14 }],
  },
  postProductTagText: {
    color: '#171012',
    fontSize: 11,
    fontWeight: '800',
  },
  videoPlaceholder: {
    alignItems: 'center',
    backgroundColor: '#e9ede8',
    justifyContent: 'center',
    gap: 8,
  },
  videoPlayMark: {
    color: '#39443e',
    fontSize: 18,
    fontWeight: '700',
  },
  videoPlaceholderText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  influencerPostBody: {
    gap: 10,
    padding: 12,
  },
  influencerPostTitle: {
    color: '#17201b',
    fontSize: 21,
    fontWeight: '800',
  },
  influencerEngagement: {
    color: '#1f6b4d',
    fontSize: 13,
    fontWeight: '800',
  },
  influencerTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  influencerTag: {
    backgroundColor: '#e4f1e9',
    borderRadius: 999,
    color: '#1f6b4d',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  productLinkCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  productLinkTitle: {
    color: '#171012',
    fontSize: 15,
    fontWeight: '800',
  },
  productLinkMeta: {
    color: '#6b5d63',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  productLinkAction: {
    color: '#d94c29',
    fontSize: 13,
    fontWeight: '800',
  },
  dangerText: {
    color: '#a83224',
    fontSize: 13,
    fontWeight: '800',
  },
  taggedPostPreview: {
    backgroundColor: '#ebe4da',
    borderRadius: 8,
    height: 260,
    width: '100%',
  },
  taggedProductRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    padding: 10,
  },
  taggedProductActionRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  taggedProductImage: {
    backgroundColor: '#eee7dc',
    borderRadius: 8,
    height: 58,
    width: 58,
  },
  taggedProductTitle: {
    color: '#17201b',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  influencerProductDetail: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  influencerProductDetailImage: {
    backgroundColor: '#ebe4da',
    height: 320,
    width: '100%',
  },
  influencerProductDetailBody: {
    gap: 12,
    padding: 14,
  },
  productDetailPrice: {
    color: '#1f6b4d',
    fontSize: 22,
    fontWeight: '700',
  },
  productDetailInfoBox: {
    backgroundColor: '#faf9f6',
    borderColor: '#e8e3da',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 10,
  },
  productDetailLabel: {
    color: '#69716c',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  productDetailValue: {
    color: '#151b17',
    fontSize: 14,
    fontWeight: '700',
  },
  productOptionGroup: {
    gap: 8,
  },
  productOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  productOptionChip: {
    backgroundColor: '#ffffff',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  productOptionChipActive: {
    backgroundColor: '#1f6b4d',
    borderColor: '#1f6b4d',
  },
  productOptionText: {
    color: '#17201b',
    fontSize: 13,
    fontWeight: '800',
  },
  productOptionTextActive: {
    color: '#ffffff',
  },
  influencerProductCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  vitrinProductActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  vitrinAddButton: {
    backgroundColor: '#ff6a3d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  vitrinAddText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  influencerProductImage: {
    backgroundColor: '#eee7dc',
    borderRadius: 8,
    height: 74,
    width: 74,
  },
  influencerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  influencerGridTile: {
    backgroundColor: '#21171d',
    borderRadius: 8,
    height: 132,
    overflow: 'hidden',
    position: 'relative',
    width: '32%',
  },
  influencerGridImage: {
    height: '100%',
    width: '100%',
  },
  influencerGridOverlay: {
    backgroundColor: 'rgba(0,0,0,0.38)',
    bottom: 0,
    left: 0,
    padding: 6,
    position: 'absolute',
    right: 0,
  },
  influencerGridText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  influencerGridMeta: {
    color: '#ffcf8b',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  influencerSearchResults: {
    gap: 12,
  },
  vitrinCartRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  vitrinCartSummary: {
    alignItems: 'center',
    borderTopColor: '#3a2a31',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  collectionCard: {
    backgroundColor: '#1c181d',
    borderColor: '#342930',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  collectionImage: {
    backgroundColor: '#342930',
    height: 210,
    width: '100%',
  },
  collectionOverlay: {
    gap: 8,
    padding: 12,
  },
  collectionTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  collectionText: {
    color: '#d9d0d4',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  collectionMeta: {
    color: '#ffcf8b',
    fontSize: 12,
    fontWeight: '800',
  },
  legalBox: {
    borderTopColor: '#ece6dd',
    borderTopWidth: 1,
    gap: 6,
    paddingTop: 10,
  },
  smallButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d8d2c8',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  smallButtonText: {
    color: '#17201b',
    fontSize: 13,
    fontWeight: '800',
  },
  empty: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  productCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e8e3da',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  productImage: {
    backgroundColor: '#ece8e1',
    borderRadius: 8,
    height: 82,
    width: 82,
  },
  imageMissing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageMissingText: {
    color: '#8a8178',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  productText: {
    flex: 1,
  },
  reminderRow: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  inlineSaveButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e4f1e9',
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineSaveText: {
    color: '#1f6b4d',
    fontSize: 12,
    fontWeight: '800',
  },
  ratingText: {
    color: '#1f6b4d',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  ratingSummary: {
    backgroundColor: '#eaf3ee',
    borderRadius: 8,
    gap: 2,
    padding: 12,
  },
  ratingSummaryText: {
    color: '#1f6b4d',
    fontSize: 20,
    fontWeight: '800',
  },
  ratingSummaryMeta: {
    color: '#476255',
    fontSize: 12,
    fontWeight: '800',
  },
  ratingPicker: {
    gap: 8,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderColor: '#ded8cf',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  ratingButtonActive: {
    backgroundColor: '#1f6b4d',
    borderColor: '#1f6b4d',
  },
  ratingButtonText: {
    color: '#17201b',
    fontSize: 14,
    fontWeight: '800',
  },
  ratingButtonTextActive: {
    color: '#ffffff',
  },
  detailImage: {
    backgroundColor: '#ebe4da',
    borderRadius: 8,
    height: 190,
    width: '100%',
  },
  cartRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e8e3da',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  cartImage: {
    backgroundColor: '#ebe4da',
    borderRadius: 8,
    height: 72,
    width: 72,
  },
  cartInfo: {
    flex: 1,
    gap: 8,
  },
  savedOrderRow: {
    alignItems: 'center',
    backgroundColor: '#f8f6f2',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  quantityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  quantityButton: {
    alignItems: 'center',
    backgroundColor: '#151b17',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  quantityText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  quantityCount: {
    color: '#17201b',
    fontSize: 16,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  summaryPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#e8e3da',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  addressChoice: {
    backgroundColor: '#f8f6f2',
    borderColor: '#e3ddd4',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  addressChoiceActive: {
    backgroundColor: '#e4f1e9',
    borderColor: '#1f6b4d',
  },
  summaryTotal: {
    color: '#17201b',
    fontSize: 28,
    fontWeight: '800',
  },
  orderImage: {
    backgroundColor: '#ebe4da',
    borderRadius: 8,
    height: 130,
    width: '100%',
  },
  listTitle: {
    color: '#151b17',
    fontSize: 16,
    fontWeight: '700',
  },
  listMeta: {
    color: '#68706b',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
    marginTop: 5,
  },
  infoLine: {
    borderTopColor: '#ece6dd',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  label: {
    color: '#69716c',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  value: {
    color: '#151b17',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  price: {
    color: '#1f6b4d',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  auctionBox: {
    borderColor: '#ece6dd',
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  bidRow: {
    backgroundColor: '#f8f6f2',
    borderRadius: 8,
    padding: 10,
  },
  reviewForm: {
    borderTopColor: '#ece6dd',
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  reviewList: {
    borderTopColor: '#ece6dd',
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12,
  },
  reviewRow: {
    backgroundColor: '#f8f6f2',
    borderRadius: 8,
    gap: 5,
    padding: 10,
  },
  textButton: {
    alignItems: 'center',
    minHeight: 38,
    justifyContent: 'center',
  },
  textButtonText: {
    color: '#6b5540',
    fontSize: 13,
    fontWeight: '800',
  },
  backText: {
    color: '#1f6b4d',
    fontSize: 14,
    fontWeight: '800',
  },
  bottomBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e1ddd6',
    borderTopWidth: 1,
    bottom: Platform.OS === 'ios' ? -28 : 0,
    flexDirection: 'row',
    left: 0,
    minHeight: Platform.OS === 'ios' ? 88 : 72,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    paddingHorizontal: 10,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
  },
  influencerBottomBar: {
    backgroundColor: '#ffffff',
    borderTopColor: '#e1ddd6',
    borderTopWidth: 1,
    bottom: Platform.OS === 'ios' ? -28 : 0,
    flexDirection: 'row',
    left: 0,
    minHeight: Platform.OS === 'ios' ? 88 : 72,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    paddingHorizontal: 10,
    paddingTop: 8,
    position: 'absolute',
    right: 0,
  },
  bottomButton: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  cartBadge: {
    alignItems: 'center',
    backgroundColor: '#1f6b4d',
    borderRadius: 999,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    top: 5,
    transform: [{ translateX: 18 }],
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  bottomText: {
    color: '#6f7772',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomTextActive: {
    color: '#1f6b4d',
  },
  influencerBottomText: {
    color: '#6f7772',
    fontSize: 12,
    fontWeight: '700',
  },
  influencerBottomTextActive: {
    color: '#1f6b4d',
  },
  resetButton: {
    alignItems: 'center',
    marginTop: 18,
    minHeight: 42,
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#8a4b38',
    fontSize: 13,
    fontWeight: '800',
  },
});
