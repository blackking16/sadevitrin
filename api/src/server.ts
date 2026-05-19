import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { z } from 'zod';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { AuthRequest, hashPassword, requireAuth, requireRole, signToken, verifyPassword } from './auth';
import { prisma } from './prisma';

const app = express();
const port = Number(process.env.PORT || 4000);
const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite';
const geminiModels = [
  geminiModel,
  ...(process.env.GEMINI_FALLBACK_MODELS?.split(',') ?? ['gemini-2.5-flash']),
]
  .map((model) => model.trim())
  .filter((model, index, models) => Boolean(model) && models.indexOf(model) === index);
const seedDemoData = process.env.SEED_DEMO_DATA === 'true';
const categorySchema = z.enum(['PET', 'BABY']);
const categoryNameSchema = z.string().min(2).max(50).transform((value) => value.trim());
const categoryLabelSchema = z.string().min(1).max(50).transform((value) => value.trim()).optional();
const paymentMethodSchema = z.enum(['CARD', 'CASH_ON_DELIVERY']);
const orderStatusSchema = z.enum(['PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']);
const productSortSchema = z.enum(['RECOMMENDED', 'LOWEST_PRICE', 'FASTEST_DELIVERY', 'HIGHEST_STOCK']);
const petTypeSchema = z.enum(['CAT', 'DOG', 'BIRD', 'FISH', 'OTHER']);
const petSubCategorySchema = z.enum(['DRY_FOOD', 'WET_FOOD', 'TREAT', 'LITTER', 'TOY', 'CARE', 'ACCESSORY', 'OTHER']);
const babySubCategorySchema = z.enum(['DIAPER', 'WIPES', 'FOOD', 'CARE', 'TOY', 'TEXTILE', 'OTHER']);
const imageUrlSchema = z.string().min(1).refine(
  (value) => value.startsWith('/uploads/') || /^https?:\/\//.test(value),
  'Görsel URL http/https veya yüklenen dosya yolu olmalı.',
);

function publicUser<T extends { passwordHash?: string }>(user: T | null) {
  if (!user) {
    return user;
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
const mediaUrlSchema = z.string().min(1).refine(
  (value) => value.startsWith('/uploads/') || /^https?:\/\//.test(value),
  'Medya URL http/https veya yuklenen dosya yolu olmali.',
);
const searchDemandStatusSchema = z.enum(['OPEN', 'REVIEWED', 'AUCTION_PLANNED', 'CLOSED']);
const barcodeDemandStatusSchema = z.enum(['OPEN', 'LINKED', 'REVIEWED', 'CLOSED']);
const barcodeSchema = z.string().min(5).max(32).regex(/^[0-9A-Za-z-]+$/).transform((value) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase());
const experienceModeSchema = z.enum(['SIMPLE', 'DISCOVERY']);
const notificationPreferencesSchema = z.object({
  orderUpdates: z.boolean(),
  reorderReminders: z.boolean(),
  savedItemUpdates: z.boolean(),
  searchDemandUpdates: z.boolean(),
  newProducts: z.boolean(),
  campaigns: z.boolean(),
});

const categoryCatalog = [
  { name: 'Tümü', subCategories: [], segments: [] },
  { name: 'Pet', subCategories: ['Kuru mama', 'Yaş mama', 'Ödül', 'Kum', 'Oyuncak', 'Bakım', 'Aksesuar', 'Diğer'], segments: ['Kedi', 'Köpek', 'Kuş', 'Balık', 'Diğer'] },
  { name: 'Bebek', subCategories: ['Bebek bezi', 'Islak mendil', 'Mama', 'Bakım', 'Oyuncak', 'Tekstil', 'Diğer'], segments: [] },
  { name: 'Giyim', subCategories: ['Kadın', 'Erkek', 'Çocuk', 'Ayakkabı', 'Çanta', 'Aksesuar', 'Diğer'], segments: ['Günlük', 'Spor', 'Klasik', 'Outdoor'] },
  { name: 'Teknoloji', subCategories: ['Telefon', 'Bilgisayar', 'Kulaklık', 'Akıllı saat', 'Oyun', 'Aksesuar', 'Diğer'], segments: ['Apple', 'Android', 'Gaming', 'Ofis'] },
  { name: 'Ev & Yaşam', subCategories: ['Mutfak', 'Temizlik', 'Dekorasyon', 'Mobilya', 'Bahçe', 'Diğer'], segments: ['Küçük ev', 'Aile', 'Profesyonel'] },
  { name: 'Kozmetik', subCategories: ['Cilt bakım', 'Makyaj', 'Saç bakım', 'Parfüm', 'Kişisel bakım', 'Diğer'], segments: ['Kadın', 'Erkek', 'Unisex'] },
  { name: 'Takı & Aksesuar', subCategories: ['Kolye', 'Bileklik', 'Küpe', 'Saat', 'Gözlük', 'Diğer'], segments: ['Günlük', 'Özel gün', 'Minimal'] },
] as const;

function inferLegacyCategory(categoryName?: string): 'PET' | 'BABY' {
  return normalizeQuery(categoryName ?? '').includes('bebek') ? 'BABY' : 'PET';
}

const productKeywordGroups = {
  pet: {
    CAT: ['kedi', 'cat', 'kitten'],
    DOG: ['köpek', 'kopek', 'dog', 'puppy'],
    BIRD: ['kuş', 'kus', 'muhabbet', 'kanarya', 'papağan', 'papagan'],
    FISH: ['balık', 'balik', 'akvaryum', 'fish'],
    OTHER: ['hamster', 'tavşan', 'tavsan', 'kemirgen', 'kaplumbağa', 'kaplumbaga'],
  },
  petSub: {
    DRY_FOOD: ['kuru mama', 'dry food'],
    WET_FOOD: ['yaş mama', 'yas mama', 'konserve', 'pouch', 'wet food'],
    TREAT: ['ödül', 'odul', 'treat', 'snack'],
    LITTER: ['kum', 'bentonit', 'silika'],
    TOY: ['oyuncak', 'top', 'ip', 'tünel', 'tunel'],
    CARE: ['bakım', 'bakim', 'şampuan', 'sampuan', 'tarak', 'fırça', 'firca', 'sağlık', 'saglik', 'vitamin'],
    ACCESSORY: ['tas', 'kap', 'tasma', 'çanta', 'canta', 'yatak', 'mama kabı', 'mama kabi'],
    OTHER: [],
  },
  baby: {
    DIAPER: ['bebek bezi', 'bez', 'diaper'],
    WIPES: ['ıslak mendil', 'islak mendil', 'mendil', 'wipe'],
    FOOD: ['mama', 'devam sütü', 'devam sutu', 'formül', 'formul'],
    CARE: ['bakım', 'bakim', 'şampuan', 'sampuan', 'krem', 'pişik', 'pisik', 'losyon'],
    TOY: ['oyuncak', 'çıngırak', 'cingirak', 'diş kaşıyıcı', 'dis kasiyici'],
    TEXTILE: ['zıbın', 'zibin', 'body', 'battaniye', 'tulum', 'önlük', 'onluk'],
    OTHER: [],
  },
} as const;

function textSearchConditions(words: readonly string[]) {
  return words.flatMap((word) => [
    { title: { contains: word, mode: 'insensitive' as const } },
    { description: { contains: word, mode: 'insensitive' as const } },
  ]);
}

async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  metadata?: Prisma.InputJsonValue,
) {
  const preferenceField = getNotificationPreferenceField(type);

  if (preferenceField) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        experienceMode: true,
        notifyOrderUpdates: true,
        notifyReorderReminders: true,
        notifySavedItemUpdates: true,
        notifySearchDemandUpdates: true,
        notifyNewProducts: true,
        notifyCampaigns: true,
      },
    });

    if (!user || !user[preferenceField]) {
      return null;
    }

    if ((preferenceField === 'notifyNewProducts' || preferenceField === 'notifyCampaigns') && user.experienceMode !== 'DISCOVERY') {
      return null;
    }
  }

  return prisma.notification.create({
    data: { userId, type, title, body, metadata },
  });
}

function getNotificationPreferenceField(type: string) {
  if (type.startsWith('ORDER_')) return 'notifyOrderUpdates' as const;
  if (type.startsWith('REORDER_')) return 'notifyReorderReminders' as const;
  if (type.startsWith('SAVED_')) return 'notifySavedItemUpdates' as const;
  if (type.startsWith('SEARCH_DEMAND_')) return 'notifySearchDemandUpdates' as const;
  if (type.startsWith('NEW_PRODUCT_')) return 'notifyNewProducts' as const;
  if (type.startsWith('CAMPAIGN_')) return 'notifyCampaigns' as const;
  return null;
}

const statusText = (status: string) => {
  if (status === 'PREPARING') return 'hazırlanıyor';
  if (status === 'SHIPPED') return 'kargoya verildi';
  if (status === 'DELIVERED') return 'teslim edildi';
  if (status === 'CANCELLED') return 'iptal edildi';
  if (status === 'RETURNED') return 'iade edildi';
  return status.toLowerCase();
};

async function ensureDemandPoolSeller() {
  const sellerId = 'system-demand-pool-seller';
  const email = 'talep-havuzu@sadevitrin.local';

  const seller = await prisma.user.upsert({
    where: { id: sellerId },
    create: {
      id: sellerId,
      role: 'SELLER',
      name: 'SadeVitrin Talep Havuzu',
      phone: '05559990000',
      email,
      passwordHash: await hashPassword('SadeVitrinTalepHavuzu!'),
      isEmailVerified: true,
      isPhoneVerified: true,
      sellerProfile: {
        create: {
          companyName: 'SadeVitrin Talep Havuzu',
          taxNumber: '9999999999',
          status: 'APPROVED',
          sellInSimple: true,
          sellInVitrin: false,
        },
      },
    },
    update: {
      role: 'SELLER',
      name: 'SadeVitrin Talep Havuzu',
      email,
      isEmailVerified: true,
      isPhoneVerified: true,
      sellerProfile: {
        upsert: {
          create: {
            companyName: 'SadeVitrin Talep Havuzu',
            taxNumber: '9999999999',
            status: 'APPROVED',
            sellInSimple: true,
            sellInVitrin: false,
          },
          update: {
            companyName: 'SadeVitrin Talep Havuzu',
            status: 'APPROVED',
            sellInSimple: true,
            sellInVitrin: false,
          },
        },
      },
    },
  });

  return seller;
}

function demandModelText(query: string) {
  return query.trim().slice(0, 90) || 'Kullanıcı talebi';
}

const normalizeQuery = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ');

const normalizeBarcode = (value: string) => value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();

const geminiInsightSchema = z.object({
  category: z.string().trim().min(1).max(60).default('Genel'),
  subCategory: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
  targetAudience: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  summary: z.string().trim().min(1).max(400).default('Vitrin içeriği.'),
  qualityScore: z.number().min(0).max(100).default(50),
  commercialIntent: z.number().min(0).max(100).default(50),
  risk: z.enum(['low', 'medium', 'high']).default('low'),
});

type GeminiInsight = z.infer<typeof geminiInsightSchema>;

const clampScore = (value: number, min = 0, max = 100000) => Math.max(min, Math.min(max, Math.round(value)));

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  }
};

const mediaMimeFromPath = (mediaUrl: string) => {
  const ext = mediaUrl.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'webm') return 'video/webm';
  return 'image/jpeg';
};

const geminiResponseSchema = {
  type: 'object',
  properties: {
    category: { type: 'string' },
    subCategory: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    targetAudience: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    qualityScore: { type: 'integer' },
    commercialIntent: { type: 'integer' },
    risk: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: ['category', 'tags', 'summary', 'qualityScore', 'commercialIntent', 'risk'],
};

async function callGeminiInsight(parts: any[]) {
  let lastResult: { ok: false; model: string; status: number; body: string } | null = null;

  for (const modelName of geminiModels) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey!,
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: geminiResponseSchema,
          },
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        return { ok: true as const, model: modelName, data: await response.json() as any };
      }

      const body = await response.text().catch(() => '');
      lastResult = { ok: false, model: modelName, status: response.status, body };

      if (![429, 500, 502, 503, 504].includes(response.status)) {
        return lastResult;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return lastResult ?? { ok: false as const, model: geminiModel, status: 0, body: 'Gemini modeli çağrılamadı.' };
}

async function mediaPartForGemini(mediaUrl?: string | null) {
  if (!mediaUrl?.startsWith('/uploads/')) {
    return null;
  }

  const relative = mediaUrl.replace(/^\/uploads\//, '');
  const filePath = path.join(process.cwd(), 'uploads', relative);
  const bytes = await readFile(filePath);

  if (bytes.byteLength > 8 * 1024 * 1024) {
    return null;
  }

  return {
    inlineData: {
      mimeType: mediaMimeFromPath(mediaUrl),
      data: bytes.toString('base64'),
    },
  };
}

function buildFallbackInsight(post: {
  title: string;
  caption: string;
  tags: string[];
  productTitle: string;
  productPrice: string;
}, products: { title: string; description?: string | null; linkText?: string | null }[]): GeminiInsight {
  const text = normalizeQuery(`${post.title} ${post.caption} ${post.productTitle} ${post.tags.join(' ')} ${products.map((item) => `${item.title} ${item.description ?? ''} ${item.linkText ?? ''}`).join(' ')}`);
  const category = text.includes('ayakkabi') || text.includes('canta') || text.includes('kiyafet') || text.includes('kombin')
    ? 'Moda'
    : text.includes('telefon') || text.includes('kulaklik') || text.includes('teknoloji')
      ? 'Teknoloji'
      : text.includes('bebek')
        ? 'Bebek'
        : text.includes('kedi') || text.includes('kopek') || text.includes('mama')
          ? 'Pet'
          : 'Genel';
  const tags = [...new Set([...post.tags, category.toLocaleLowerCase('tr-TR'), ...products.map((item) => item.linkText || item.title).slice(0, 6)])]
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);

  return {
    category,
    subCategory: products[0]?.linkText || products[0]?.title,
    tags,
    targetAudience: category === 'Moda' ? ['stil odaklı kullanıcılar'] : ['alışveriş ilgisi yüksek kullanıcılar'],
    summary: post.caption || `${post.title} için vitrin içeriği.`,
    qualityScore: post.caption.length > 80 ? 68 : 55,
    commercialIntent: products.length ? 82 : 45,
    risk: 'low',
  };
}

function computeDiscoverScore(post: { likeCount: number; commentCount: number; dailyScore: number; weeklyScore: number; monthlyScore: number; createdAt: Date }, insight: GeminiInsight) {
  const ageHours = Math.max(0, (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60));
  const freshness = Math.max(0, 120 - ageHours * 4);
  const engagement = post.likeCount * 8 + post.commentCount * 14 + post.dailyScore * 0.25 + post.weeklyScore * 0.08 + post.monthlyScore * 0.03;
  const aiScore = insight.qualityScore * 2.4 + insight.commercialIntent * 2.2;
  const riskPenalty = insight.risk === 'high' ? 220 : insight.risk === 'medium' ? 90 : 0;
  return clampScore(aiScore + engagement + freshness - riskPenalty);
}

async function analyzeInfluencerPostWithGemini(postId: string) {
  const post = await prisma.influencerPost.findUnique({
    where: { id: postId },
    include: { influencer: true },
  });

  if (!post) {
    return null;
  }

  const productLinks = Array.isArray(post.productLinks)
    ? post.productLinks as { productId: string; label?: string }[]
    : [];
  const productIds = [...new Set([post.productId, ...productLinks.map((link) => link.productId)].filter(Boolean))] as string[];
  const products = productIds.length
    ? await prisma.influencerProduct.findMany({ where: { id: { in: productIds } } })
    : [];
  const fallback = buildFallbackInsight(post, products);
  let insight = fallback;
  let raw: Prisma.InputJsonValue | undefined;
  let model: string | undefined;

  if (geminiApiKey) {
    try {
      const mediaPart = await mediaPartForGemini(post.mediaUrl).catch(() => null);
      const parts: any[] = [{
        text: [
          'SadeVitrin vitrin keşfet algoritması için bu ticari postu analiz et.',
          'Çıktıyı yalnızca verilen JSON şemasına uygun döndür.',
          'Puanlar 0-100 arasında olsun. qualityScore görsel/metin kalitesi, commercialIntent alışverişe yönlendirme gücüdür.',
          '',
          `İçerik tipi: ${post.type}`,
          `Başlık: ${post.title}`,
          `Açıklama: ${post.caption}`,
          `Influencer: ${post.influencer.name} ${post.influencer.handle} ${post.influencer.specialty}`,
          `Etiketler: ${post.tags.join(', ')}`,
          `Bağlı ürünler: ${products.map((product) => `${product.title} | ${product.priceText} | ${product.sellerName} | ${product.linkText ?? ''} | ${product.description}`).join(' || ') || 'Yok'}`,
        ].join('\n'),
      }];

      if (mediaPart) {
        parts.push(mediaPart);
      }

      const response = await callGeminiInsight(parts);

      if (response.ok) {
        const data = response.data;
        const text = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text).filter(Boolean).join('') ?? '';
        const parsed = safeJsonParse(text);
        insight = geminiInsightSchema.parse(parsed);
        raw = data as Prisma.InputJsonValue;
        model = response.model;
      } else {
        console.warn('Gemini insight fallback kullan?ld?:', response.model, response.status, response.body.slice(0, 240));
      }
    } catch (error) {
      console.warn('Gemini insight fallback kullanıldı:', error instanceof Error ? error.message : error);
    }
  }

  const algorithmScore = computeDiscoverScore(post, insight);
  const saved = await prisma.influencerContentInsight.upsert({
    where: { postId: post.id },
    update: {
      category: insight.category,
      subCategory: insight.subCategory,
      tags: insight.tags,
      targetAudience: insight.targetAudience,
      summary: insight.summary,
      qualityScore: Math.round(insight.qualityScore),
      commercialIntent: Math.round(insight.commercialIntent),
      risk: insight.risk,
      algorithmScore,
      model,
      raw,
      analyzedAt: new Date(),
    },
    create: {
      postId: post.id,
      category: insight.category,
      subCategory: insight.subCategory,
      tags: insight.tags,
      targetAudience: insight.targetAudience,
      summary: insight.summary,
      qualityScore: Math.round(insight.qualityScore),
      commercialIntent: Math.round(insight.commercialIntent),
      risk: insight.risk,
      algorithmScore,
      model,
      raw,
    },
  });

  await prisma.influencerPost.update({
    where: { id: post.id },
    data: {
      dailyScore: algorithmScore,
      weeklyScore: clampScore(algorithmScore * 0.75 + post.weeklyScore * 0.25),
      monthlyScore: clampScore(algorithmScore * 0.55 + post.monthlyScore * 0.45),
    },
  });

  return saved;
}

function flattenInfluencerPostInsight<T extends { insight?: any }>(post: T) {
  const insight = post.insight;
  const { insight: _insight, ...rest } = post as any;

  return {
    ...rest,
    aiCategory: insight?.category,
    aiSubCategory: insight?.subCategory,
    aiTags: insight?.tags ?? [],
    aiTargetAudience: insight?.targetAudience ?? [],
    aiSummary: insight?.summary,
    aiQualityScore: insight?.qualityScore,
    aiCommercialIntent: insight?.commercialIntent,
    aiRisk: insight?.risk,
    aiAlgorithmScore: insight?.algorithmScore,
    aiAnalyzedAt: insight?.analyzedAt,
    aiModel: insight?.model,
  };
}

async function flattenInfluencerPostsWithComments(posts: any[]) {
  const postIds = posts.map((post) => post.id);

  if (!postIds.length) {
    return [];
  }

  const comments = await prisma.influencerPostComment.findMany({
    where: { postId: { in: postIds } },
    orderBy: { createdAt: 'asc' },
    take: 120,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(comments.map((comment) => comment.profileId))] } },
    select: { id: true, name: true },
  });
  const userNames = new Map(users.map((user) => [user.id, user.name]));

  return posts.map((post) => ({
    ...flattenInfluencerPostInsight(post),
    comments: comments
      .filter((comment) => comment.postId === post.id)
      .map((comment) => ({
        id: comment.id,
        postId: comment.postId,
        profileId: comment.profileId,
        profileName: userNames.get(comment.profileId) ?? 'Kullanıcı',
        text: comment.text,
        createdAt: comment.createdAt,
      })),
  }));
}

let influencerInsightWarmup: Promise<void> | null = null;

function queueInfluencerInsightWarmup() {
  if (influencerInsightWarmup) {
    return;
  }

  influencerInsightWarmup = (async () => {
    const staleBefore = new Date(Date.now() - 60 * 60 * 1000);
    const missingPosts = await prisma.influencerPost.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { insight: { is: null } },
          { insight: { is: { algorithmScore: { in: [1000, 10000] }, analyzedAt: { lt: staleBefore } } } },
        ],
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: geminiApiKey ? 6 : 20,
    });

    for (const post of missingPosts) {
      await analyzeInfluencerPostWithGemini(post.id).catch((error) => {
        console.warn('Vitrin AI warmup tamamlanamadı:', error instanceof Error ? error.message : error);
      });
    }
  })().finally(() => {
    influencerInsightWarmup = null;
  });
}

const influencerSeedProfiles = [
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
    verified: false,
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
    verified: false,
  },
];

const influencerSeedPosts = [
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
    productLinks: [
      { productId: 'vproduct-kulaklik', label: 'Kulaklık', x: 54, y: 36 },
    ],
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
    productLinks: [
      { productId: 'vproduct-mutfak', label: 'Set', x: 62, y: 45 },
    ],
    likeCount: 1320,
    commentCount: 88,
    dailyScore: 430,
    weeklyScore: 1890,
    monthlyScore: 6900,
    campaign: 'Koleksiyon indirimi',
    tags: ['Ev', 'Mutfak', 'Kampanya'],
  },
];

const influencerSeedProducts = [
  {
    id: 'vproduct-ayakkabi',
    influencerId: 'style-aylin',
    title: 'Beyaz spor ayakkabı',
    description: 'Post üzerindeki ayakkabı linkinden açılan vitrin ürünü.',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80',
    priceText: '1.899 TL',
    sellerName: 'Aylin Kombin Mağazası',
    detailText: 'Günlük kombinler için hafif tabanlı beyaz spor ayakkabı.',
    sizes: ['36', '37', '38', '39', '40'],
    colors: ['Beyaz', 'Krem'],
    linkText: 'Post etiketi',
    stockText: 'Beden se?imi gerekli',
    dailyHits: 88,
    weeklyHits: 480,
    monthlyHits: 1600,
  },
  {
    id: 'vproduct-canta',
    influencerId: 'style-aylin',
    title: 'Minimal siyah çapraz çanta',
    description: 'Vitrin içeriğine bağlı, kombin odaklı çanta önerisi. Sade pazar ürünlerinden ayrı tutulur.',
    imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
    priceText: '1.249 TL',
    sellerName: 'Aylin Kombin Mağazası',
    detailText: 'Ayarlanabilir askılı, günlük kullanıma uygun minimal çanta.',
    sizes: ['Standart'],
    colors: ['Siyah', 'Kahverengi'],
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
    description: 'Kısa video incelemesine bağlı teknoloji vitrin ürünü.',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    priceText: '2.899 TL',
    sellerName: 'Tekno Deniz Store',
    detailText: 'Aktif gürültü azaltma, hızlı eşleşme ve uzun pil ömrü.',
    sizes: ['Standart'],
    colors: ['Siyah', 'Beyaz'],
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
    description: 'Mutfak düzeni koleksiyonunda önerilen ayrı vitrin ürünü.',
    imageUrl: 'https://images.unsplash.com/photo-1584473457406-6240486418e9?auto=format&fit=crop&w=900&q=80',
    priceText: '799 TL',
    sellerName: 'Evde Seda Se?kisi',
    detailText: 'Mutfak düzeni için 6 parçalı cam saklama kabı seti.',
    sizes: ['6 par?a'],
    colors: ['?effaf'],
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
    description: 'Aile ve bebek içeriklerine bağlı vitrin ürünü.',
    imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80',
    priceText: '649 TL',
    sellerName: 'Mini Rota Ma?azas?',
    detailText: 'Dışarı çıkışlarda bez, mendil ve bakım ürünleri için set.',
    sizes: ['Standart'],
    colors: ['Gri', 'Bej'],
    linkText: 'İçerik etiketi',
    stockText: 'Haftanın listesi',
    dailyHits: 47,
    weeklyHits: 310,
    monthlyHits: 980,
  },
];

const influencerSeedCollections = [
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

async function ensureInfluencerSeed() {
  if (!seedDemoData) {
    return;
  }

  for (const profile of influencerSeedProfiles) {
    await prisma.influencerProfile.upsert({
      where: { id: profile.id },
      update: profile,
      create: profile,
    });
  }

  for (const product of influencerSeedProducts) {
    await prisma.influencerProduct.upsert({
      where: { id: product.id },
      update: product,
      create: product,
    });
  }

  for (const post of influencerSeedPosts) {
    await prisma.influencerPost.upsert({
      where: { id: post.id },
      update: post,
      create: post,
    });
  }

  for (const collection of influencerSeedCollections) {
    await prisma.influencerCollection.upsert({
      where: { id: collection.id },
      update: collection,
      create: collection,
    });
  }
}

app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '32mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/admin-assets', express.static(path.join(process.cwd(), 'public')));

app.get('/', (_req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>SadeVitrin API</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #f6f5f1; color: #17201b; margin: 0; padding: 40px; }
          main { max-width: 680px; margin: 0 auto; background: #fff; border: 1px solid #e3ddd4; border-radius: 8px; padding: 24px; }
          a { color: #1f6b4d; font-weight: 800; }
          code { background: #f1eee8; padding: 3px 6px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <main>
          <h1>SadeVitrin API ?al???yor</h1>
          <p>Bu adres mobil uygulama ekrani degil, backend/API adresidir.</p>
          <p>Mobil/Expo icin: <a href="http://localhost:8081">http://localhost:8081</a></p>
          <p>Yonetici paneli: <a href="/admin">/admin</a></p>
          <p>Saglik kontrolu: <a href="/health">/health</a></p>
        </main>
      </body>
    </html>
  `);
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'sadevitrin-api',
    gemini: {
      configured: Boolean(geminiApiKey),
      models: geminiModels,
    },
  });
});

app.get('/categories', (_req, res) => {
  res.json(categoryCatalog);
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'admin.html'));
});

app.post('/uploads/images', requireAuth, requireRole('CUSTOMER', 'SELLER', 'ADMIN'), async (req: AuthRequest, res) => {
  const body = z.object({
    fileName: z.string().optional(),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']).default('image/jpeg'),
    base64: z.string().min(20),
  }).parse(req.body);

  const extension = body.mimeType === 'image/png'
    ? 'png'
    : body.mimeType === 'image/webp'
      ? 'webp'
      : body.mimeType === 'video/mp4'
        ? 'mp4'
        : body.mimeType === 'video/quicktime'
          ? 'mov'
          : body.mimeType === 'video/webm'
            ? 'webm'
            : 'jpg';
  const uploadDir = path.join(process.cwd(), 'uploads');
  const fileName = `${randomUUID()}.${extension}`;
  const bytes = Buffer.from(body.base64, 'base64');

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes);

  res.status(201).json({
    url: `/uploads/${fileName}`,
    originalName: body.fileName,
  });
});

app.post('/auth/register', async (req, res) => {
  const body = z.object({
    role: z.enum(['CUSTOMER', 'SELLER']),
    name: z.string().min(2),
    phone: z.string().min(5),
    email: z.string().email(),
    password: z.string().min(6),
    address: z.object({
      title: z.string().default('Ev'),
      city: z.string().min(2),
      district: z.string().min(2),
      detail: z.string().min(5),
    }),
    seller: z.object({
      companyName: z.string().min(2),
      taxNumber: z.string().min(5),
      sellInSimple: z.boolean().optional(),
      sellInVitrin: z.boolean().optional(),
    }).optional(),
  }).parse(req.body);

  if (body.role === 'SELLER' && !body.seller) {
    return res.status(400).json({ message: 'Satıcı bilgileri gerekli.' });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: body.email }, { phone: body.phone }],
    },
  });

  if (existingUser) {
    return res.status(409).json({ message: 'Bu e-posta veya telefonla daha ?nce kay?t olu?turulmu?.' });
  }

  const user = await prisma.user.create({
    data: {
      role: body.role,
      name: body.name,
      phone: body.phone,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      addresses: {
        create: {
          title: body.address.title,
          city: body.address.city,
          district: body.address.district,
          detail: body.address.detail,
          isDefault: true,
        },
      },
      sellerProfile: body.role === 'SELLER' && body.seller
        ? {
            create: {
              companyName: body.seller.companyName,
              taxNumber: body.seller.taxNumber,
              sellInSimple: body.seller.sellInSimple ?? true,
              sellInVitrin: body.seller.sellInVitrin ?? true,
            },
          }
        : undefined,
    },
    include: { sellerProfile: true, addresses: true },
  });

  await createNotification(
    user.id,
    'WELCOME',
    'Hesabın hazır',
    body.role === 'SELLER'
      ? 'Satıcı hesabın oluşturuldu. Ürün talebi göndererek ilk ihale sürecini başlatabilirsin.'
      : 'Kullanıcı hesabın oluşturuldu. Siparişlerini ve kayıtlı adreslerini buradan takip edebilirsin.',
  );

  res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

app.post('/auth/login', async (req, res) => {
  const body = z.object({
    identifier: z.string().min(3),
    password: z.string().min(1),
  }).parse(req.body);

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: body.identifier }, { phone: body.identifier }],
    },
    include: { sellerProfile: true, addresses: true },
  });

  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return res.status(401).json({ message: 'E-posta/telefon veya şifre hatalı.' });
  }

  res.json({ user: publicUser(user), token: signToken(user) });
});

app.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { sellerProfile: true, addresses: true },
  });

  res.json(publicUser(user));
});

app.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const body = z.object({
    name: z.string().min(2).max(80),
    phone: z.string().min(10).max(20),
    email: z.string().email(),
    experienceMode: experienceModeSchema.optional(),
    notificationPreferences: notificationPreferencesSchema.optional(),
    seller: z.object({
      companyName: z.string().min(2).max(120).optional(),
      taxNumber: z.string().min(5).max(20).optional(),
      sellInSimple: z.boolean().optional(),
      sellInVitrin: z.boolean().optional(),
    }).optional(),
  }).parse(req.body);

  const existing = await prisma.user.findFirst({
    where: {
      id: { not: req.user!.id },
      OR: [{ email: body.email.trim() }, { phone: body.phone.trim() }],
    },
  });

  if (existing) {
    return res.status(409).json({ message: 'Bu e-posta veya telefon başka bir hesapta kullanılıyor.' });
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email.trim(),
      experienceMode: body.experienceMode,
      notifyOrderUpdates: body.notificationPreferences?.orderUpdates,
      notifyReorderReminders: body.notificationPreferences?.reorderReminders,
      notifySavedItemUpdates: body.notificationPreferences?.savedItemUpdates,
      notifySearchDemandUpdates: body.notificationPreferences?.searchDemandUpdates,
      notifyNewProducts: body.notificationPreferences?.newProducts,
      notifyCampaigns: body.notificationPreferences?.campaigns,
      sellerProfile: body.seller
        ? {
            update: {
              companyName: body.seller.companyName?.trim(),
              taxNumber: body.seller.taxNumber?.trim(),
              sellInSimple: body.seller.sellInSimple,
              sellInVitrin: body.seller.sellInVitrin,
            },
          }
        : undefined,
    },
    include: { sellerProfile: true, addresses: true },
  });

  res.json(user);
});

app.get('/notifications', requireAuth, async (req: AuthRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(notifications);
});

app.patch('/notifications/read', requireAuth, async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });

  res.status(204).send();
});

app.post('/search-demands', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const body = z.object({
    query: z.string().min(2),
    resultCount: z.number().int().min(0).default(0),
    category: categorySchema.optional(),
    categoryName: categoryLabelSchema,
    subCategoryName: categoryLabelSchema,
    segmentName: categoryLabelSchema,
    petType: petTypeSchema.optional(),
    petSubCategory: petSubCategorySchema.optional(),
    babySubCategory: babySubCategorySchema.optional(),
  }).parse(req.body);

  const demand = await prisma.searchDemand.create({
    data: {
      userId: req.user!.id,
      query: body.query.trim(),
      normalizedQuery: normalizeQuery(body.query),
      resultCount: body.resultCount,
      category: body.category,
      categoryName: body.categoryName,
      subCategoryName: body.subCategoryName,
      segmentName: body.segmentName,
      petType: body.petType,
      petSubCategory: body.petSubCategory,
      babySubCategory: body.babySubCategory,
    },
  });

  await createNotification(
    req.user!.id,
    'SEARCH_DEMAND_CREATED',
    'Aradığın ürün takipte',
    `"${body.query.trim()}" satışa açılırsa haber verebilmek için talebini kaydettik.`,
    { demandId: demand.id },
  );

  res.status(201).json(demand);
});

app.get('/barcodes/:barcode', requireAuth, async (req: AuthRequest, res) => {
  const barcode = normalizeBarcode(String(req.params.barcode));

  if (barcode.length < 5) {
    return res.status(400).json({ message: 'Barkod geçersiz.' });
  }

  const product = await prisma.product.findFirst({
    where: { barcode, isActive: true },
    include: { reviews: true, seller: { select: { name: true, sellerProfile: true } } },
  });

  if (product) {
    return res.json({ status: 'FOUND', barcode, product });
  }

  const knownRequest = await prisma.productRequest.findFirst({
    where: { barcode },
    include: { auction: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (knownRequest) {
    return res.json({ status: 'KNOWN_NOT_ACTIVE', barcode, request: knownRequest });
  }

  res.json({ status: 'UNKNOWN', barcode });
});

app.post('/barcode-demands', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const body = z.object({
    barcode: barcodeSchema,
    note: z.string().min(2).max(250).optional(),
  }).parse(req.body);

  const demand = await prisma.barcodeDemand.create({
    data: {
      userId: req.user!.id,
      barcode: body.barcode,
      note: body.note?.trim(),
    },
  });

  await createNotification(
    req.user!.id,
    'BARCODE_DEMAND_CREATED',
    'Barkod talebin alındı',
    body.note
      ? `"${body.note.trim()}" notuyla barkod talebini kaydettik.`
      : `${body.barcode} barkodunu ürün hafızamıza eklemek için kaydettik.`,
    { demandId: demand.id, barcode: body.barcode },
  );

  res.status(201).json(demand);
});

app.post('/addresses', requireAuth, async (req: AuthRequest, res) => {
  const body = z.object({
    title: z.string().min(1),
    city: z.string().min(2),
    district: z.string().min(2),
    detail: z.string().min(5),
    isDefault: z.boolean().optional(),
  }).parse(req.body);

  const address = await prisma.address.create({
    data: { ...body, userId: req.user!.id },
  });

  res.status(201).json(address);
});

app.get('/addresses', requireAuth, async (req: AuthRequest, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  res.json(addresses);
});

app.get('/products', async (req, res) => {
  const query = z.object({
    q: z.string().optional(),
    category: categorySchema.optional(),
    categoryName: z.string().optional(),
    subCategoryName: z.string().optional(),
    segmentName: z.string().optional(),
    pet: petTypeSchema.optional(),
    petSub: petSubCategorySchema.optional(),
    baby: babySubCategorySchema.optional(),
    sort: productSortSchema.default('RECOMMENDED'),
  }).parse(req.query);

  const andConditions: Prisma.ProductWhereInput[] = [];

  if (query.q) {
    andConditions.push({ OR: textSearchConditions([query.q]) });
  }

  if (query.categoryName) {
    andConditions.push({ categoryName: { equals: query.categoryName, mode: 'insensitive' } });
  }

  if (query.subCategoryName) {
    andConditions.push({ subCategoryName: { equals: query.subCategoryName, mode: 'insensitive' } });
  }

  if (query.segmentName) {
    andConditions.push({ segmentName: { equals: query.segmentName, mode: 'insensitive' } });
  }

  if (query.pet) {
    andConditions.push({
      OR: [
        { petType: query.pet },
        ...textSearchConditions(productKeywordGroups.pet[query.pet]),
      ],
    });
  }

  if (query.petSub) {
    andConditions.push({
      OR: [
        { petSubCategory: query.petSub },
        ...textSearchConditions(productKeywordGroups.petSub[query.petSub]),
      ],
    });
  }

  if (query.baby) {
    andConditions.push({
      OR: [
        { babySubCategory: query.baby },
        ...textSearchConditions(productKeywordGroups.baby[query.baby]),
      ],
    });
  }

  const orderBy =
    query.sort === 'LOWEST_PRICE'
      ? { price: 'asc' as const }
      : query.sort === 'FASTEST_DELIVERY'
        ? { deliveryDays: 'asc' as const }
        : query.sort === 'HIGHEST_STOCK'
          ? { stock: 'desc' as const }
          : { createdAt: 'desc' as const };

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      category: query.category,
      AND: andConditions.length ? andConditions : undefined,
    },
    include: { reviews: true, seller: { select: { name: true, sellerProfile: true } } },
    orderBy,
  });

  res.json(products);
});

app.get('/products/:productId', async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { id: String(req.params.productId), isActive: true },
    include: {
      seller: { select: { name: true, sellerProfile: true } },
      reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
      auction: { include: { request: true, winnerBid: true } },
    },
  });

  if (!product) {
    return res.status(404).json({ message: 'Ürün bulunamadı.' });
  }

  res.json(product);
});

app.post('/seller/product-requests', requireAuth, requireRole('SELLER'), async (req: AuthRequest, res) => {
  const body = z.object({
    category: categorySchema.optional(),
    categoryName: categoryNameSchema.default('Genel'),
    subCategoryName: categoryLabelSchema,
    segmentName: categoryLabelSchema,
    petType: petTypeSchema.optional(),
    petSubCategory: petSubCategorySchema.optional(),
    babySubCategory: babySubCategorySchema.optional(),
    brand: z.string().min(1),
    model: z.string().min(1),
    packageInfo: z.string().min(1),
    barcode: barcodeSchema.optional(),
    imageUrl: imageUrlSchema.optional(),
    description: z.string().min(10),
  }).parse(req.body);

  const request = await prisma.productRequest.create({
    data: {
      ...body,
      category: body.category ?? inferLegacyCategory(body.categoryName),
      sellerId: req.user!.id,
    },
  });

  await createNotification(
    req.user!.id,
    'PRODUCT_REQUEST_CREATED',
    'Ürün talebin alındı',
    `${body.brand} ${body.model} talebin yönetici onayına gönderildi.`,
    { requestId: request.id },
  );

  res.status(201).json(request);
});

app.get('/seller/product-requests', requireAuth, requireRole('SELLER'), async (req: AuthRequest, res) => {
  const requests = await prisma.productRequest.findMany({
    where: { sellerId: req.user!.id },
    include: { auction: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(requests);
});

app.get('/seller/bids', requireAuth, requireRole('SELLER'), async (req: AuthRequest, res) => {
  const bids = await prisma.bid.findMany({
    where: { sellerId: req.user!.id },
    include: { auction: { include: { request: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json(bids);
});

app.get('/seller/products', requireAuth, requireRole('SELLER'), async (req: AuthRequest, res) => {
  const products = await prisma.product.findMany({
    where: { sellerId: req.user!.id },
    include: { reviews: true, seller: { select: { name: true, sellerProfile: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json(products);
});

app.patch('/seller/products/:productId', requireAuth, requireRole('SELLER'), async (req: AuthRequest, res) => {
  const body = z.object({
    stock: z.number().int().min(0).optional(),
    deliveryDays: z.number().int().positive().optional(),
    imageUrl: imageUrlSchema.optional(),
    description: z.string().min(10).optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);

  const product = await prisma.product.findFirst({
    where: { id: String(req.params.productId), sellerId: req.user!.id },
  });

  if (!product) {
    return res.status(404).json({ message: 'Ürün bulunamadı.' });
  }

  const updated = await prisma.product.update({
    where: { id: product.id },
    data: body,
    include: { reviews: true, seller: { select: { name: true, sellerProfile: true } } },
  });

  res.json(updated);
});

app.patch('/seller/orders/:orderId/status', requireAuth, requireRole('SELLER'), async (req: AuthRequest, res) => {
  const body = z.object({
    status: orderStatusSchema,
  }).parse(req.body);

  const order = await prisma.order.findFirst({
    where: {
      id: String(req.params.orderId),
      items: { some: { sellerId: req.user!.id } },
    },
  });

  if (!order) {
    return res.status(404).json({ message: 'Sipariş bulunamadı.' });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: body.status,
      shipment: body.status === 'SHIPPED' || body.status === 'DELIVERED'
        ? {
            upsert: {
              create: {
                status: body.status === 'DELIVERED' ? 'DELIVERED' : 'SHIPPED',
                shippedAt: body.status === 'SHIPPED' ? new Date() : undefined,
                deliveredAt: body.status === 'DELIVERED' ? new Date() : undefined,
              },
              update: {
                status: body.status === 'DELIVERED' ? 'DELIVERED' : 'SHIPPED',
                shippedAt: body.status === 'SHIPPED' ? new Date() : undefined,
                deliveredAt: body.status === 'DELIVERED' ? new Date() : undefined,
              },
            },
          }
        : undefined,
    },
    include: { address: true, items: { include: { product: { include: { seller: { select: { name: true, sellerProfile: true } } } } } }, payment: true, shipment: true, reviews: true },
  });

  await createNotification(
    order.userId,
    'ORDER_STATUS_CHANGED',
    'Sipariş durumun güncellendi',
    `${order.orderNumber} numaralı siparişin ${statusText(body.status)}.`,
    { orderId: order.id, orderNumber: order.orderNumber, status: body.status },
  );

  res.json(updated);
});

app.get('/auctions/open', requireAuth, requireRole('SELLER', 'ADMIN'), async (_req, res) => {
  const auctions = await prisma.auction.findMany({
    where: { status: 'OPEN' },
    include: { request: true, bids: true },
    orderBy: { endsAt: 'asc' },
  });

  res.json(auctions);
});

app.post('/auctions/:auctionId/bids', requireAuth, requireRole('SELLER'), async (req: AuthRequest, res) => {
  const body = z.object({
    price: z.number().positive(),
    stock: z.number().int().positive(),
    deliveryDays: z.number().int().positive(),
    note: z.string().optional(),
  }).parse(req.body);

  const bid = await prisma.bid.create({
    data: {
      auctionId: String(req.params.auctionId),
      sellerId: req.user!.id,
      price: body.price,
      stock: body.stock,
      deliveryDays: body.deliveryDays,
      note: body.note,
    },
  });

  const auction = await prisma.auction.findUnique({
    where: { id: String(req.params.auctionId) },
    include: { request: true },
  });

  await createNotification(
    req.user!.id,
    'BID_CREATED',
    'Teklifin kaydedildi',
    auction
      ? `${auction.request.brand} ${auction.request.model} ihalesi için teklifin alındı.`
      : 'İhale teklifin alındı.',
    { auctionId: String(req.params.auctionId), bidId: bid.id },
  );

  res.status(201).json(bid);
});

app.get('/admin/product-requests', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const requests = await prisma.productRequest.findMany({
    include: { seller: { select: { name: true, email: true, phone: true, sellerProfile: true } }, auction: { include: { bids: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json(requests);
});

app.get('/admin/sellers', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const sellers = await prisma.user.findMany({
    where: { role: 'SELLER' },
    include: {
      sellerProfile: true,
      products: true,
      bids: true,
      productRequests: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(sellers);
});

app.patch('/admin/sellers/:sellerId/status', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const body = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']),
  }).parse(req.body);

  const seller = await prisma.sellerProfile.update({
    where: { userId: String(req.params.sellerId) },
    data: { status: body.status },
    include: { user: true },
  });

  await createNotification(
    seller.userId,
    'SELLER_STATUS_CHANGED',
    'Satıcı hesabın güncellendi',
    body.status === 'APPROVED'
      ? 'Satıcı hesabın onaylandı. Ürün talepleri ve ihalelerle satışa başlayabilirsin.'
      : body.status === 'SUSPENDED'
        ? 'Satıcı hesabın geçici olarak askıya alındı.'
        : 'Satıcı hesabın tekrar inceleme durumuna alındı.',
    { status: body.status },
  );

  res.json(seller);
});

app.post('/admin/product-requests/:requestId/auction', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const body = z.object({
    endsAt: z.string().datetime().optional(),
    durationDays: z.number().int().positive().default(7),
  }).parse(req.body);

  const now = new Date();
  const endsAt = body.endsAt ? new Date(body.endsAt) : new Date(now.getTime() + body.durationDays * 24 * 60 * 60 * 1000);

  const auction = await prisma.auction.create({
    data: {
      requestId: String(req.params.requestId),
      startsAt: now,
      endsAt,
      status: 'OPEN',
    },
    include: { request: true, bids: true },
  });

  await prisma.productRequest.update({
    where: { id: String(req.params.requestId) },
    data: { status: 'AUCTION_OPEN' },
  });

  await createNotification(
    auction.request.sellerId,
    'AUCTION_OPENED',
    'Talebin ihaleye açıldı',
    `${auction.request.brand} ${auction.request.model} için teklifler alınmaya başladı.`,
    { requestId: auction.requestId, auctionId: auction.id },
  );

  res.status(201).json(auction);
});

app.get('/admin/auctions', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const auctions = await prisma.auction.findMany({
    include: {
      request: { include: { seller: { select: { name: true, email: true, phone: true, sellerProfile: true } } } },
      bids: { include: { seller: { select: { name: true, email: true, phone: true, sellerProfile: true } } } },
      product: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(auctions);
});

app.get('/admin/products', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const products = await prisma.product.findMany({
    include: {
      seller: { select: { name: true, email: true, phone: true, sellerProfile: true } },
      reviews: true,
      auction: { include: { request: true, winnerBid: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(products);
});

app.get('/admin/influencers', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  await ensureInfluencerSeed();

  const profiles = await prisma.influencerProfile.findMany({
    include: {
      posts: true,
      products: true,
      collections: true,
      follows: true,
      owner: { select: { name: true, email: true, phone: true } },
    },
    orderBy: [{ verified: 'desc' }, { followerCount: 'desc' }],
  });

  res.json(profiles);
});

app.get('/admin/orders', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      address: true,
      items: { include: { product: { include: { seller: { select: { name: true, email: true, phone: true, sellerProfile: true } } } } } },
      payment: true,
      shipment: true,
      reviews: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(orders);
});

app.get('/admin/search-demands', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const demands = await prisma.searchDemand.findMany({
    include: { user: { select: { name: true, email: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  res.json(demands);
});

app.patch('/admin/search-demands/:demandId/status', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const body = z.object({
    status: searchDemandStatusSchema,
  }).parse(req.body);

  const demand = await prisma.searchDemand.update({
    where: { id: String(req.params.demandId) },
    data: { status: body.status },
  });

  if (demand.userId && body.status === 'AUCTION_PLANNED') {
    await createNotification(
      demand.userId,
      'SEARCH_DEMAND_PLANNED',
      'Aradığın ürün inceleniyor',
      `"${demand.query}" için ürün/ihale planlamasına alındı.`,
      { demandId: demand.id },
    );
  }

  res.json(demand);
});

app.post('/admin/search-demands/:demandId/auction', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const body = z.object({
    durationDays: z.number().int().positive().default(7),
  }).parse(req.body);

  const demand = await prisma.searchDemand.findUnique({
    where: { id: String(req.params.demandId) },
    include: { user: { select: { id: true, name: true } } },
  });

  if (!demand) {
    return res.status(404).json({ message: 'Kullanıcı talebi bulunamadı.' });
  }

  const existingRequest = await prisma.productRequest.findUnique({
    where: { id: `search-demand-request-${demand.id}` },
    include: { auction: { include: { bids: true } } },
  });

  if (existingRequest?.auction) {
    return res.json({ request: existingRequest, auction: existingRequest.auction });
  }

  const poolSeller = await ensureDemandPoolSeller();
  const now = new Date();
  const endsAt = new Date(now.getTime() + body.durationDays * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const request = await tx.productRequest.upsert({
      where: { id: `search-demand-request-${demand.id}` },
      create: {
        id: `search-demand-request-${demand.id}`,
        sellerId: poolSeller.id,
        category: demand.category ?? inferLegacyCategory(demand.categoryName ?? demand.query),
        categoryName: demand.categoryName ?? 'Genel',
        subCategoryName: demand.subCategoryName,
        segmentName: demand.segmentName,
        petType: demand.petType,
        petSubCategory: demand.petSubCategory,
        babySubCategory: demand.babySubCategory,
        brand: demand.categoryName ?? 'Kullanıcı talebi',
        model: demandModelText(demand.query),
        packageInfo: 'Standart ürün talebi',
        description: `Kullanıcı arama talebinden oluşturuldu: ${demand.query}`,
        status: 'AUCTION_OPEN',
      },
      update: {
        status: 'AUCTION_OPEN',
        categoryName: demand.categoryName ?? 'Genel',
        subCategoryName: demand.subCategoryName,
        segmentName: demand.segmentName,
        petType: demand.petType,
        petSubCategory: demand.petSubCategory,
        babySubCategory: demand.babySubCategory,
        model: demandModelText(demand.query),
        description: `Kullanıcı arama talebinden oluşturuldu: ${demand.query}`,
      },
    });

    const auction = await tx.auction.create({
      data: {
        requestId: request.id,
        startsAt: now,
        endsAt,
        status: 'OPEN',
      },
      include: { request: true, bids: true },
    });

    const updatedDemand = await tx.searchDemand.update({
      where: { id: demand.id },
      data: { status: 'AUCTION_PLANNED' },
    });

    return { request, auction, demand: updatedDemand };
  });

  if (demand.userId) {
    await createNotification(
      demand.userId,
      'SEARCH_DEMAND_PLANNED',
      'Aradığın ürün ihaleye alındı',
      `"${demand.query}" için satıcılardan teklif alınmaya başlandı.`,
      { demandId: demand.id, requestId: result.request.id, auctionId: result.auction.id },
    );
  }

  res.status(201).json(result);
});

app.get('/admin/barcode-demands', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const demands = await prisma.barcodeDemand.findMany({
    include: { user: { select: { name: true, email: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  res.json(demands);
});

app.patch('/admin/barcode-demands/:demandId/status', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const body = z.object({
    status: barcodeDemandStatusSchema,
  }).parse(req.body);

  const currentDemand = await prisma.barcodeDemand.findUnique({
    where: { id: String(req.params.demandId) },
  });

  if (!currentDemand) {
    return res.status(404).json({ message: 'Barkod talebi bulunamadı.' });
  }

  const poolSeller = body.status === 'LINKED' ? await ensureDemandPoolSeller() : null;

  const demand = body.status === 'LINKED' && poolSeller
    ? await prisma.$transaction(async (tx) => {
        const note = currentDemand.note?.trim() || `${currentDemand.barcode} barkodlu ürün`;

        await tx.productRequest.upsert({
          where: { id: `barcode-memory-request-${currentDemand.id}` },
          create: {
            id: `barcode-memory-request-${currentDemand.id}`,
            sellerId: poolSeller.id,
            category: inferLegacyCategory(note),
            categoryName: normalizeQuery(note).includes('bebek') ? 'Bebek' : 'Pet',
            subCategoryName: undefined,
            segmentName: undefined,
            barcode: currentDemand.barcode,
            brand: 'Barkod hafızası',
            model: demandModelText(note),
            packageInfo: currentDemand.barcode,
            description: `Barkod talebinden ürün hafızasına eklendi: ${note}`,
            status: 'BARCODE_LINKED',
          },
          update: {
            barcode: currentDemand.barcode,
            model: demandModelText(note),
            packageInfo: currentDemand.barcode,
            description: `Barkod talebinden ürün hafızasına eklendi: ${note}`,
            status: 'BARCODE_LINKED',
          },
        });

        return tx.barcodeDemand.update({
          where: { id: currentDemand.id },
          data: { status: body.status },
        });
      })
    : await prisma.barcodeDemand.update({
        where: { id: currentDemand.id },
        data: { status: body.status },
      });

  if (demand.userId && body.status === 'LINKED') {
    await createNotification(
      demand.userId,
      'BARCODE_DEMAND_LINKED',
      'Barkod talebin işlendi',
      `${demand.barcode} barkodu ürün hafızasına bağlanmak üzere işlendi.`,
      { demandId: demand.id, barcode: demand.barcode },
    );
  }

  res.json(demand);
});

app.patch('/admin/products/:productId', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const body = z.object({
    title: z.string().min(3).optional(),
    imageUrl: imageUrlSchema.nullable().optional(),
    description: z.string().min(10).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().min(0).optional(),
    deliveryDays: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  }).parse(req.body);

  const product = await prisma.product.update({
    where: { id: String(req.params.productId) },
    data: body,
    include: { reviews: true, seller: { select: { name: true, sellerProfile: true } } },
  });

  res.json(product);
});

app.post('/admin/auctions/:auctionId/complete', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const body = z.object({
    winnerBidId: z.string().optional(),
  }).parse(req.body);

  const auction = await prisma.auction.findUnique({
    where: { id: String(req.params.auctionId) },
    include: { request: true, bids: true, product: true },
  });

  if (!auction) {
    return res.status(404).json({ message: 'İhale bulunamadı.' });
  }

  if (auction.product) {
    return res.status(409).json({ message: 'Bu ihale zaten ürüne dönüştürülmüş.' });
  }

  const winner = body.winnerBidId
    ? auction.bids.find((bid) => bid.id === body.winnerBidId)
    : [...auction.bids].sort((a, b) => {
        const aScore = Number(a.price) + a.deliveryDays * 10 - a.stock * 0.05;
        const bScore = Number(b.price) + b.deliveryDays * 10 - b.stock * 0.05;
        return aScore - bScore;
      })[0];

  if (!winner) {
    return res.status(400).json({ message: 'İhaleyi sonuçlandırmak için en az bir teklif gerekli.' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedAuction = await tx.auction.update({
      where: { id: auction.id },
      data: { status: 'COMPLETED', winnerBidId: winner.id },
    });

    await tx.productRequest.update({
      where: { id: auction.requestId },
      data: { status: 'COMPLETED' },
    });

    const product = await tx.product.create({
      data: {
        auctionId: auction.id,
        sellerId: winner.sellerId,
        category: auction.request.category,
        categoryName: auction.request.categoryName,
        subCategoryName: auction.request.subCategoryName,
        segmentName: auction.request.segmentName,
        petType: auction.request.petType,
        petSubCategory: auction.request.petSubCategory,
        babySubCategory: auction.request.babySubCategory,
        title: `${auction.request.brand} ${auction.request.model} ${auction.request.packageInfo}`,
        barcode: auction.request.barcode,
        imageUrl: auction.request.imageUrl,
        description: auction.request.description,
        price: winner.price,
        stock: winner.stock,
        deliveryDays: winner.deliveryDays,
        isActive: true,
      },
      include: { reviews: true, seller: { select: { name: true, sellerProfile: true } } },
    });

    return { auction: updatedAuction, product };
  });

  await createNotification(
    winner.sellerId,
    'AUCTION_WON',
    'İhaleyi kazandın',
    `${auction.request.brand} ${auction.request.model} artık ürünlerinde yayında.`,
    { auctionId: auction.id, productId: result.product.id, bidId: winner.id },
  );

  const discoveryCustomers = await prisma.user.findMany({
    where: { role: 'CUSTOMER', experienceMode: 'DISCOVERY', notifyNewProducts: true },
    select: { id: true },
  });

  await Promise.all(discoveryCustomers.map((customer) =>
    createNotification(
      customer.id,
      'NEW_PRODUCT_OPENED',
      'Yeni ürün satışa açıldı',
      `${result.product.title} parametre bazlı seçilen satıcı modeliyle yayına alındı.`,
      { productId: result.product.id, auctionId: auction.id },
    ),
  ));

  const losingSellerIds = [...new Set(auction.bids.map((bid) => bid.sellerId).filter((sellerId) => sellerId !== winner.sellerId))];
  await Promise.all(losingSellerIds.map((sellerId) =>
    createNotification(
      sellerId,
      'AUCTION_LOST',
      'İhale sonuçlandı',
      `${auction.request.brand} ${auction.request.model} ihalesi başka bir teklifle sonuçlandı.`,
      { auctionId: auction.id },
    ),
  ));

  res.json(result);
});

app.get('/cart', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const cart = await prisma.cartItem.findMany({
    where: { userId: req.user!.id },
    include: { product: { include: { seller: { select: { name: true, sellerProfile: true } } } } },
  });

  res.json(cart);
});

app.post('/cart', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const body = z.object({
    productId: z.string(),
    quantity: z.number().int().positive().default(1),
  }).parse(req.body);

  const item = await prisma.cartItem.upsert({
    where: { userId_productId: { userId: req.user!.id, productId: body.productId } },
    create: { userId: req.user!.id, productId: body.productId, quantity: body.quantity },
    update: { quantity: { increment: body.quantity } },
  });

  res.status(201).json(item);
});

app.patch('/cart/:cartItemId', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const body = z.object({
    quantity: z.number().int().min(0),
  }).parse(req.body);

  if (body.quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { id: String(req.params.cartItemId), userId: req.user!.id } });
    return res.status(204).send();
  }

  const item = await prisma.cartItem.update({
    where: { id: String(req.params.cartItemId) },
    data: { quantity: body.quantity },
  });

  res.json(item);
});

app.post('/orders', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const body = z.object({
    addressId: z.string(),
    paymentMethod: paymentMethodSchema,
  }).parse(req.body);

  const cart = await prisma.cartItem.findMany({
    where: { userId: req.user!.id },
    include: { product: true },
  });

  if (cart.length === 0) {
    return res.status(400).json({ message: 'Sepet boş.' });
  }

  const total = cart.reduce((sum: number, item) => sum + Number(item.product.price) * item.quantity, 0);
  const orderNumber = `SP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: req.user!.id,
        addressId: body.addressId,
        paymentMethod: body.paymentMethod,
        paymentStatus: body.paymentMethod === 'CARD' ? 'PAID' : 'PENDING',
        subtotal: total,
        total,
        items: {
          create: cart.map((item) => ({
            productId: item.productId,
            sellerId: item.product.sellerId,
            title: item.product.title,
            imageUrl: item.product.imageUrl,
            quantity: item.quantity,
            unitPrice: item.product.price,
            total: Number(item.product.price) * item.quantity,
          })),
        },
        payment: {
          create: {
            provider: 'DEMO',
            method: body.paymentMethod,
            status: body.paymentMethod === 'CARD' ? 'PAID' : 'PENDING',
            amount: total,
          },
        },
      },
      include: { items: true, payment: true },
    });

    await tx.cartItem.deleteMany({ where: { userId: req.user!.id } });

    return createdOrder;
  });

  await createNotification(
    req.user!.id,
    'ORDER_CREATED',
    'Siparişin alındı',
    `${order.orderNumber} numaralı siparişin oluşturuldu.`,
    { orderId: order.id, orderNumber: order.orderNumber },
  );

  const sellerIds = [...new Set(cart.map((item) => item.product.sellerId))];
  await Promise.all(sellerIds.map((sellerId) =>
    createNotification(
      sellerId,
      'SELLER_ORDER_CREATED',
      'Yeni sipariş var',
      `${order.orderNumber} numaralı siparişte sana ait ürün bulunuyor.`,
      { orderId: order.id, orderNumber: order.orderNumber },
    ),
  ));

  res.status(201).json(order);
});

app.get('/orders', requireAuth, async (req: AuthRequest, res) => {
  const query = z.object({
    status: orderStatusSchema.optional(),
  }).parse(req.query);

  const where = req.user!.role === 'SELLER'
    ? { items: { some: { sellerId: req.user!.id } }, status: query.status }
    : { userId: req.user!.id, status: query.status };

  const orders = await prisma.order.findMany({
    where,
    include: { address: true, items: { include: { product: { include: { seller: { select: { name: true, sellerProfile: true } } } } } }, payment: true, shipment: true, reviews: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(orders);
});

app.get('/influencers/public', async (_req, res) => {
  await ensureInfluencerSeed();
  queueInfluencerInsightWarmup();

  const [profiles, posts, products, collections] = await Promise.all([
    prisma.influencerProfile.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ verified: 'desc' }, { followerCount: 'desc' }],
    }),
    prisma.influencerPost.findMany({
      where: { status: 'PUBLISHED', type: { in: ['post', 'video', 'campaign'] } },
      include: { insight: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.influencerProduct.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ dailyHits: 'desc' }, { weeklyHits: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.influencerCollection.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({ profiles, posts: await flattenInfluencerPostsWithComments(posts), products, collections, follows: [], likedPostIds: [] });
});

app.get('/influencers', requireAuth, async (req: AuthRequest, res) => {
  await ensureInfluencerSeed();
  queueInfluencerInsightWarmup();

  const [profiles, posts, products, collections, follows, likedPosts] = await Promise.all([
    prisma.influencerProfile.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ verified: 'desc' }, { followerCount: 'desc' }],
    }),
    prisma.influencerPost.findMany({
      where: { status: 'PUBLISHED', type: { in: ['post', 'video', 'campaign'] } },
      include: { insight: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.influencerProduct.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ dailyHits: 'desc' }, { weeklyHits: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.influencerCollection.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.influencerFollow.findMany({
      where: { profileId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.influencerPostLike.findMany({
      where: { profileId: req.user!.id },
      select: { postId: true },
    }),
  ]);

  res.json({ profiles, posts: await flattenInfluencerPostsWithComments(posts), products, collections, follows, likedPostIds: likedPosts.map((item) => item.postId) });
});

app.post('/influencers/me', requireAuth, requireRole('CUSTOMER', 'SELLER'), async (req: AuthRequest, res) => {
  await ensureInfluencerSeed();

  const body = z.object({
    specialty: z.string().trim().min(2).max(80).optional(),
    bio: z.string().trim().min(2).max(300).optional(),
  }).parse(req.body);

  const authUser = req.user!;
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
  }

  const handleBase = normalizeQuery(user.name || user.email.split('@')[0])
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18) || 'vitrin';
  const handle = `@${handleBase}${user.id.slice(-4).toLowerCase()}`;

  const profile = await prisma.influencerProfile.upsert({
    where: { ownerId: user.id },
    update: {
      status: 'PUBLISHED',
      specialty: body.specialty || 'Kişisel vitrin',
      bio: body.bio || `${user.name} tarafından hazırlanan ürün bağlantılı vitrin.`,
    },
    create: {
      ownerId: user.id,
      name: user.name,
      handle,
      specialty: body.specialty || 'Kişisel vitrin',
      bio: body.bio || `${user.name} tarafından hazırlanan ürün bağlantılı vitrin.`,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80',
      heroUrl: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80',
      status: 'PUBLISHED',
    },
  });

  await createNotification(
    user.id,
    'INFLUENCER_PROFILE_CREATED',
    'Vitrinin açıldı',
    'Mevcut kullanıcı hesabınla vitrin profili oluşturuldu. Vitrin ürünleri sade pazardan ayrı tutulur.',
    { influencerId: profile.id },
  );

  res.status(201).json(profile);
});

app.put('/influencers/me', requireAuth, requireRole('CUSTOMER', 'SELLER'), async (req: AuthRequest, res) => {
  const body = z.object({
    name: z.string().trim().min(2).max(80),
    handle: z.string().trim().min(3).max(40).regex(/^@[a-zA-Z0-9_.-]+$/),
    specialty: z.string().trim().min(2).max(80),
    bio: z.string().trim().min(2).max(300),
    avatarUrl: mediaUrlSchema,
    heroUrl: mediaUrlSchema,
  }).parse(req.body);

  const authUser = req.user!;
  const existing = await prisma.influencerProfile.findUnique({
    where: { ownerId: authUser.id },
  });

  if (!existing) {
    return res.status(404).json({ message: 'Önce vitrin açmalısın.' });
  }

  const handleOwner = await prisma.influencerProfile.findUnique({
    where: { handle: body.handle },
  });

  if (handleOwner && handleOwner.id !== existing.id) {
    return res.status(409).json({ message: 'Bu vitrin adı kullanılıyor.' });
  }

  const profile = await prisma.influencerProfile.update({
    where: { id: existing.id },
    data: body,
  });

  res.json(profile);
});

app.post('/influencer-products', requireAuth, requireRole('SELLER'), async (req: AuthRequest, res) => {
  const body = z.object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(2).max(500),
    imageUrl: mediaUrlSchema,
    imageUrls: z.array(mediaUrlSchema).max(8).default([]),
    priceText: z.string().trim().min(1).max(40),
    sellerName: z.string().trim().min(2).max(100).optional(),
    detailText: z.string().trim().max(500).optional(),
    sizes: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
    colors: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
    linkText: z.string().trim().max(80).optional(),
    stockText: z.string().trim().max(80).optional(),
  }).parse(req.body);

  const seller = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { sellerProfile: true },
  });

  if (!seller || seller.role !== 'SELLER') {
    return res.status(403).json({ message: 'Vitrin ürünü eklemek için satıcı hesabı gerekli.' });
  }

  const handleBase = normalizeQuery(seller.sellerProfile?.companyName || seller.name || seller.email.split('@')[0])
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18) || 'vitrin';
  const profile = await prisma.influencerProfile.upsert({
    where: { ownerId: seller.id },
    update: { status: 'PUBLISHED' },
    create: {
      ownerId: seller.id,
      name: seller.sellerProfile?.companyName || seller.name,
      handle: `@${handleBase}${seller.id.slice(-4).toLowerCase()}`,
      specialty: 'Vitrin satıcısı',
      bio: `${seller.sellerProfile?.companyName || seller.name} tarafından hazırlanan vitrin ürünleri.`,
      avatarUrl: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=240&q=80',
      heroUrl: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=900&q=80',
      status: 'PUBLISHED',
    },
  });

  const product = await prisma.influencerProduct.create({
    data: {
      influencerId: profile.id,
      sellerId: seller.id,
      title: body.title,
      description: body.description,
      imageUrl: body.imageUrl,
      imageUrls: body.imageUrls.length ? body.imageUrls : [body.imageUrl],
      priceText: body.priceText,
      sellerName: body.sellerName || seller.sellerProfile?.companyName || seller.name,
      detailText: body.detailText,
      sizes: body.sizes,
      colors: body.colors,
      linkText: body.linkText,
      stockText: body.stockText,
    },
  });

  res.status(201).json(product);
});

app.get('/influencer-posts/me', requireAuth, requireRole('CUSTOMER', 'SELLER'), async (req: AuthRequest, res) => {
  const profile = await prisma.influencerProfile.findUnique({
    where: { ownerId: req.user!.id },
  });

  if (!profile) {
    return res.json([]);
  }

  const posts = await prisma.influencerPost.findMany({
    where: {
      influencerId: profile.id,
      status: { not: 'DELETED' },
      type: { in: ['post', 'video', 'campaign'] },
    },
    include: { insight: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json(await flattenInfluencerPostsWithComments(posts));
});

app.post('/influencer-posts', requireAuth, requireRole('CUSTOMER', 'SELLER'), async (req: AuthRequest, res) => {
  const body = z.object({
    type: z.enum(['post', 'video', 'campaign']),
    title: z.string().trim().min(2).max(120),
    caption: z.string().trim().min(2).max(500),
    mediaUrl: mediaUrlSchema,
    mediaUrls: z.array(mediaUrlSchema).max(10).default([]),
    productId: z.string().optional(),
    productTitle: z.string().trim().min(1).max(120).optional(),
    productQuery: z.string().trim().min(1).max(120).optional(),
    productPrice: z.string().trim().min(1).max(40).optional(),
    campaign: z.string().trim().max(80).optional(),
    tags: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
    productLinks: z.array(z.object({
      productId: z.string(),
      label: z.string().trim().min(1).max(40),
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })).max(8).optional(),
  }).parse(req.body);

  const profile = await prisma.influencerProfile.findUnique({
    where: { ownerId: req.user!.id },
  });

  if (!profile) {
    return res.status(404).json({ message: 'Önce vitrin açmalısın.' });
  }

  const productLinkIds = [...new Set((body.productLinks ?? []).map((link) => link.productId))];
  const productLinkProducts = productLinkIds.length
    ? await prisma.influencerProduct.findMany({
        where: { id: { in: productLinkIds }, status: 'PUBLISHED' },
      })
    : [];

  if (productLinkIds.length && productLinkProducts.length !== productLinkIds.length) {
    return res.status(404).json({ message: 'Paylaşımdaki vitrin ürünlerinden biri bulunamadı.' });
  }

  const linkedProduct = body.productId
    ? await prisma.influencerProduct.findFirst({
        where: { id: body.productId, status: 'PUBLISHED' },
      })
    : null;

  if (body.productId && !linkedProduct) {
    return res.status(404).json({ message: 'Vitrin ürünü bulunamadı.' });
  }

  const firstLinkProduct = productLinkProducts[0];
  const productTitle = body.productTitle || linkedProduct?.title || firstLinkProduct?.title || body.title;
  const productPrice = body.productPrice || linkedProduct?.priceText || firstLinkProduct?.priceText || 'Vitrin ürünü';

  const post = await prisma.influencerPost.create({
    data: {
      influencerId: profile.id,
      productId: linkedProduct?.id,
      type: body.type,
      title: body.title,
      caption: body.caption,
      mediaUrl: body.mediaUrl,
      mediaUrls: body.mediaUrls.length ? body.mediaUrls : [body.mediaUrl],
      productTitle,
      productQuery: body.productQuery || productTitle,
      productPrice,
      campaign: body.campaign,
      tags: body.tags,
      productLinks: body.productLinks?.length ? body.productLinks : linkedProduct ? [{ productId: linkedProduct.id, label: linkedProduct.title, x: 50, y: 50 }] : undefined,
    },
  });

  await analyzeInfluencerPostWithGemini(post.id).catch((error) => {
    console.warn('Vitrin post AI analizi tamamlanamadı:', error instanceof Error ? error.message : error);
  });

  const postWithInsight = await prisma.influencerPost.findUnique({
    where: { id: post.id },
    include: { insight: true },
  });

  res.status(201).json(postWithInsight ? flattenInfluencerPostInsight(postWithInsight) : post);
});

const influencerPostBodySchema = z.object({
  type: z.enum(['post', 'video', 'campaign']).optional(),
  title: z.string().trim().min(2).max(120).optional(),
  caption: z.string().trim().min(2).max(500).optional(),
  mediaUrl: mediaUrlSchema.optional(),
  mediaUrls: z.array(mediaUrlSchema).max(10).optional(),
  productId: z.string().nullable().optional(),
  productTitle: z.string().trim().min(1).max(120).optional(),
  productQuery: z.string().trim().min(1).max(120).optional(),
  productPrice: z.string().trim().min(1).max(40).optional(),
  campaign: z.string().trim().max(80).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).optional(),
  productLinks: z.array(z.object({
    productId: z.string(),
    label: z.string().trim().min(1).max(40),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  })).max(8).optional(),
  status: z.enum(['PUBLISHED', 'HIDDEN']).optional(),
});

app.patch('/influencer-posts/:postId', requireAuth, requireRole('CUSTOMER', 'SELLER', 'ADMIN'), async (req: AuthRequest, res) => {
  const postId = String(req.params.postId);
  const body = influencerPostBodySchema.parse(req.body);
  const existing = await prisma.influencerPost.findFirst({
    where: { id: postId, status: { not: 'DELETED' } },
    include: { influencer: true },
  });

  if (!existing) {
    return res.status(404).json({ message: 'Paylaşım bulunamadı.' });
  }

  if (req.user!.role !== 'ADMIN' && existing.influencer.ownerId !== req.user!.id) {
    return res.status(403).json({ message: 'Bu paylaşımı düzenleme yetkin yok.' });
  }

  const productLinkIds = [...new Set((body.productLinks ?? []).map((link) => link.productId))];
  const productLinkProducts = productLinkIds.length
    ? await prisma.influencerProduct.findMany({ where: { id: { in: productLinkIds }, status: 'PUBLISHED' } })
    : [];

  if (productLinkIds.length && productLinkProducts.length !== productLinkIds.length) {
    return res.status(404).json({ message: 'Paylaşımdaki vitrin ürünlerinden biri bulunamadı.' });
  }

  const linkedProduct = body.productId
    ? await prisma.influencerProduct.findFirst({ where: { id: body.productId, status: 'PUBLISHED' } })
    : null;

  if (body.productId && !linkedProduct) {
    return res.status(404).json({ message: 'Vitrin ürünü bulunamadı.' });
  }

  const mediaUrls = body.mediaUrls ?? undefined;
  const updated = await prisma.influencerPost.update({
    where: { id: postId },
    data: {
      ...(body.type ? { type: body.type } : {}),
      ...(body.title ? { title: body.title } : {}),
      ...(body.caption ? { caption: body.caption } : {}),
      ...(body.mediaUrl ? { mediaUrl: body.mediaUrl } : {}),
      ...(mediaUrls ? { mediaUrls: mediaUrls.length ? mediaUrls : body.mediaUrl ? [body.mediaUrl] : existing.mediaUrls } : {}),
      ...(body.productId !== undefined ? { productId: linkedProduct?.id ?? null } : {}),
      ...(body.productTitle ? { productTitle: body.productTitle } : {}),
      ...(body.productQuery ? { productQuery: body.productQuery } : {}),
      ...(body.productPrice ? { productPrice: body.productPrice } : {}),
      ...(body.campaign !== undefined ? { campaign: body.campaign || null } : {}),
      ...(body.tags ? { tags: body.tags } : {}),
      ...(body.productLinks ? { productLinks: body.productLinks.length ? body.productLinks : undefined } : {}),
      ...(body.status ? { status: body.status } : {}),
    },
    include: { insight: true },
  });

  await analyzeInfluencerPostWithGemini(updated.id).catch((error) => {
    console.warn('Vitrin post AI analizi tamamlanamadı:', error instanceof Error ? error.message : error);
  });

  const updatedPost = await prisma.influencerPost.findUnique({
    where: { id: postId },
    include: { insight: true },
  });

  res.json(updatedPost ? flattenInfluencerPostInsight(updatedPost) : updated);
});

app.delete('/influencer-posts/:postId', requireAuth, requireRole('CUSTOMER', 'SELLER', 'ADMIN'), async (req: AuthRequest, res) => {
  const postId = String(req.params.postId);
  const existing = await prisma.influencerPost.findFirst({
    where: { id: postId, status: { not: 'DELETED' } },
    include: { influencer: true },
  });

  if (!existing) {
    return res.status(404).json({ message: 'Paylaşım bulunamadı.' });
  }

  if (req.user!.role !== 'ADMIN' && existing.influencer.ownerId !== req.user!.id) {
    return res.status(403).json({ message: 'Bu paylaşımı silme yetkin yok.' });
  }

  await prisma.influencerPost.update({
    where: { id: postId },
    data: { status: 'DELETED' },
  });

  res.status(204).send();
});

app.post('/influencer-posts/:postId/analyze', requireAuth, async (req: AuthRequest, res) => {
  const postId = String(req.params.postId);
  const post = await prisma.influencerPost.findFirst({
    where: { id: postId, status: 'PUBLISHED' },
    include: { influencer: true },
  });

  if (!post) {
    return res.status(404).json({ message: 'Payla??m bulunamad?.' });
  }

  if (req.user!.role !== 'ADMIN' && post.influencer.ownerId !== req.user!.id) {
    return res.status(403).json({ message: 'Bu payla??m? analiz etme yetkin yok.' });
  }

  await analyzeInfluencerPostWithGemini(post.id);
  const updatedPost = await prisma.influencerPost.findUnique({
    where: { id: post.id },
    include: { insight: true },
  });

  res.json(updatedPost ? flattenInfluencerPostInsight(updatedPost) : post);
});

app.post('/influencer-posts/:postId/like', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const postId = String(req.params.postId);
  const post = await prisma.influencerPost.findFirst({
    where: { id: postId, status: 'PUBLISHED' },
  });

  if (!post) {
    return res.status(404).json({ message: 'Paylaşım bulunamadı.' });
  }

  const existing = await prisma.influencerPostLike.findUnique({
    where: {
      postId_profileId: {
        postId,
        profileId: req.user!.id,
      },
    },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.influencerPostLike.delete({ where: { id: existing.id } });
      const updated = await tx.influencerPost.update({
        where: { id: postId },
        data: { likeCount: Math.max(post.likeCount - 1, 0) },
      });

      return { liked: false, likeCount: updated.likeCount, commentCount: updated.commentCount };
    }

    await tx.influencerPostLike.create({
      data: {
        postId,
        profileId: req.user!.id,
      },
    });

    const updated = await tx.influencerPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 }, dailyScore: { increment: 1 }, weeklyScore: { increment: 1 }, monthlyScore: { increment: 1 } },
    });

    return { liked: true, likeCount: updated.likeCount, commentCount: updated.commentCount };
  });

  res.json(result);
});

app.post('/influencer-posts/:postId/comments', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const body = z.object({
    text: z.string().trim().min(1).max(300),
  }).parse(req.body);
  const postId = String(req.params.postId);
  const post = await prisma.influencerPost.findFirst({
    where: { id: postId, status: 'PUBLISHED' },
  });

  if (!post) {
    return res.status(404).json({ message: 'Paylaşım bulunamadı.' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const comment = await tx.influencerPostComment.create({
      data: {
        postId,
        profileId: req.user!.id,
        text: body.text,
      },
    });

    const updated = await tx.influencerPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 }, dailyScore: { increment: 2 }, weeklyScore: { increment: 2 }, monthlyScore: { increment: 2 } },
    });

    return { comment, likeCount: updated.likeCount, commentCount: updated.commentCount };
  });

  res.status(201).json({
    ...result,
    comment: {
      id: result.comment.id,
      postId: result.comment.postId,
      profileId: result.comment.profileId,
      profileName: 'Sen',
      text: result.comment.text,
      createdAt: result.comment.createdAt,
    },
  });
});

app.post('/influencers/:influencerId/follow', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  await ensureInfluencerSeed();

  const influencerId = String(req.params.influencerId);
  const influencer = await prisma.influencerProfile.findFirst({
    where: { id: influencerId, status: 'PUBLISHED' },
  });

  if (!influencer) {
    return res.status(404).json({ message: 'Vitrin bulunamadı.' });
  }

  const follow = await prisma.influencerFollow.upsert({
    where: {
      profileId_influencerId: {
        profileId: req.user!.id,
        influencerId,
      },
    },
    update: {},
    create: {
      profileId: req.user!.id,
      influencerId,
    },
  });

  res.status(201).json(follow);
});

app.delete('/influencers/:influencerId/follow', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  await prisma.influencerFollow.deleteMany({
    where: {
      profileId: req.user!.id,
      influencerId: String(req.params.influencerId),
    },
  });

  res.status(204).send();
});

app.post('/influencer-applications', requireAuth, async (req: AuthRequest, res) => {
  const body = z.object({
    note: z.string().max(500).optional(),
  }).parse(req.body);

  const complaint = await prisma.complaint.create({
    data: {
      userId: req.user!.id,
      subject: 'Influencer/vitrin başvurusu',
      message: body.note?.trim() || 'Kullanıcı mevcut hesabıyla vitrin açmak istiyor.',
    },
  });

  await createNotification(
    req.user!.id,
    'INFLUENCER_APPLICATION_CREATED',
    'Vitrin başvurun alındı',
    'Başvurun yönetici paneline iletildi. Onaydan sonra mevcut hesabına vitrin yetkisi bağlanacak.',
    { complaintId: complaint.id },
  );

  res.status(201).json(complaint);
});

app.get('/saved-items', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const items = await prisma.savedItem.findMany({
    where: { userId: req.user!.id },
    include: {
      product: { include: { reviews: true, seller: { select: { name: true, sellerProfile: true } } } },
      order: { include: { items: { include: { product: { include: { seller: { select: { name: true, sellerProfile: true } } } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(items);
});

app.post('/saved-items', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const body = z.object({
    productId: z.string().optional(),
    orderId: z.string().optional(),
  }).refine((value) => Boolean(value.productId) !== Boolean(value.orderId), {
    message: 'Ürün veya siparişten yalnızca biri kaydedilebilir.',
  }).parse(req.body);

  const existing = await prisma.savedItem.findFirst({
    where: {
      userId: req.user!.id,
      productId: body.productId ?? null,
      orderId: body.orderId ?? null,
    },
  });

  if (existing) {
    return res.json(existing);
  }

  const item = await prisma.savedItem.create({
    data: {
      userId: req.user!.id,
      productId: body.productId,
      orderId: body.orderId,
    },
  });

  res.status(201).json(item);
});

app.delete('/saved-items/:savedItemId', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  await prisma.savedItem.deleteMany({
    where: { id: String(req.params.savedItemId), userId: req.user!.id },
  });

  res.status(204).send();
});

app.post('/complaints', requireAuth, async (req: AuthRequest, res) => {
  const body = z.object({
    subject: z.string().min(3),
    message: z.string().min(10),
  }).parse(req.body);

  const complaint = await prisma.complaint.create({
    data: {
      userId: req.user!.id,
      subject: body.subject,
      message: body.message,
    },
  });

  await createNotification(
    req.user!.id,
    'COMPLAINT_CREATED',
    'Talebin alındı',
    'Destek/şikayet kaydın yönetici paneline iletildi.',
    { complaintId: complaint.id },
  );

  res.status(201).json(complaint);
});

app.get('/admin/complaints', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const complaints = await prisma.complaint.findMany({
    include: { user: { select: { name: true, email: true, phone: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.json(complaints);
});

app.patch('/admin/complaints/:complaintId/status', requireAuth, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  const body = z.object({
    status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED']),
  }).parse(req.body);

  const complaint = await prisma.complaint.update({
    where: { id: String(req.params.complaintId) },
    data: { status: body.status },
  });

  await createNotification(
    complaint.userId,
    'COMPLAINT_STATUS_CHANGED',
    'Destek talebin güncellendi',
    `Destek/şikayet kaydının durumu ${body.status} olarak güncellendi.`,
    { complaintId: complaint.id, status: body.status },
  );

  res.json(complaint);
});

app.post('/reviews', requireAuth, requireRole('CUSTOMER'), async (req: AuthRequest, res) => {
  const body = z.object({
    orderId: z.string(),
    productId: z.string(),
    productRating: z.number().int().min(1).max(5),
    sellerRating: z.number().int().min(1).max(5),
    comment: z.string().min(2),
  }).parse(req.body);

  const order = await prisma.order.findFirst({
    where: { id: body.orderId, userId: req.user!.id, status: 'DELIVERED' },
  });

  if (!order) {
    return res.status(400).json({ message: 'Değerlendirme teslim edilen siparişten sonra yapılabilir.' });
  }

  const review = await prisma.review.create({
    data: {
      orderId: body.orderId,
      productId: body.productId,
      userId: req.user!.id,
      productRating: body.productRating,
      sellerRating: body.sellerRating,
      comment: body.comment,
    },
  });

  res.status(201).json(review);
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: 'Geçersiz veri.', issues: error.issues });
  }

  console.error(error);
  return res.status(500).json({ message: 'Sunucu hatası.' });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
