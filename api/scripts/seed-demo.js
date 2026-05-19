const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const password = 'Demo1234!';
const image = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

const demoUsers = [
  {
    id: 'demo-admin',
    role: 'ADMIN',
    name: 'SadeVitrin Yonetici',
    phone: '05550000000',
    email: 'admin@sadevitrin.local',
  },
  {
    id: 'demo-customer-ayse',
    role: 'CUSTOMER',
    name: 'Ayse Demir',
    phone: '05551110000',
    email: 'ayse.demo@sadevitrin.local',
    experienceMode: 'DISCOVERY',
    notifyNewProducts: true,
    notifyCampaigns: true,
  },
  {
    id: 'demo-customer-emre',
    role: 'CUSTOMER',
    name: 'Emre Kaya',
    phone: '05552220000',
    email: 'emre.demo@sadevitrin.local',
  },
  {
    id: 'demo-seller-pet',
    role: 'SELLER',
    name: 'Pati Market Yetkilisi',
    phone: '05553330000',
    email: 'pati.demo@sadevitrin.local',
  },
  {
    id: 'demo-seller-baby',
    role: 'SELLER',
    name: 'Minik Dunya Yetkilisi',
    phone: '05554440000',
    email: 'minik.demo@sadevitrin.local',
  },
  {
    id: 'demo-seller-style',
    role: 'SELLER',
    name: 'Nova Stil Yetkilisi',
    phone: '05555550000',
    email: 'nova.demo@sadevitrin.local',
  },
  {
    id: 'demo-creator-zeynep',
    role: 'CUSTOMER',
    name: 'Zeynep Acar',
    phone: '05556660000',
    email: 'zeynep.creator@sadevitrin.local',
    experienceMode: 'DISCOVERY',
  },
  {
    id: 'demo-creator-deniz',
    role: 'CUSTOMER',
    name: 'Deniz Arslan',
    phone: '05557770000',
    email: 'deniz.creator@sadevitrin.local',
    experienceMode: 'DISCOVERY',
  },
];

const sellerProfiles = [
  {
    userId: 'demo-seller-pet',
    companyName: 'Pati Market',
    taxNumber: '1111111111',
    status: 'APPROVED',
    sellInSimple: true,
    sellInVitrin: true,
    rating: '4.7',
  },
  {
    userId: 'demo-seller-baby',
    companyName: 'Minik Dunya',
    taxNumber: '2222222222',
    status: 'APPROVED',
    sellInSimple: true,
    sellInVitrin: false,
    rating: '4.8',
  },
  {
    userId: 'demo-seller-style',
    companyName: 'Nova Stil',
    taxNumber: '3333333333',
    status: 'APPROVED',
    sellInSimple: false,
    sellInVitrin: true,
    rating: '4.6',
  },
];

const addresses = [
  {
    id: 'demo-address-ayse-home',
    userId: 'demo-customer-ayse',
    title: 'Ev',
    city: 'Istanbul',
    district: 'Kadikoy',
    detail: 'Moda Mahallesi, Sade Sokak No:12 D:4',
    isDefault: true,
  },
  {
    id: 'demo-address-emre-home',
    userId: 'demo-customer-emre',
    title: 'Ev',
    city: 'Ankara',
    district: 'Cankaya',
    detail: 'Ataturk Bulvari No:22',
    isDefault: true,
  },
];

const simpleProducts = [
  {
    requestId: 'demo-request-cat-food',
    auctionId: 'demo-auction-cat-food',
    bidId: 'demo-bid-cat-food',
    productId: 'demo-product-cat-food',
    sellerId: 'demo-seller-pet',
    category: 'PET',
    categoryName: 'Pet',
    subCategoryName: 'Kuru mama',
    segmentName: 'Kedi',
    petType: 'CAT',
    petSubCategory: 'DRY_FOOD',
    brand: 'Mio',
    model: 'Somonlu Sterilised',
    packageInfo: '10 kg',
    barcode: '8690000000011',
    imageUrl: image('photo-1589924691995-400dc9ecc119'),
    description: 'Kisirlastirilmis yetiskin kediler icin somonlu, standart 10 kg paket.',
    price: '1189.90',
    stock: 72,
    deliveryDays: 2,
    title: 'Mio Somonlu Sterilised Kedi Maması 10 kg',
  },
  {
    requestId: 'demo-request-dog-food',
    auctionId: 'demo-auction-dog-food',
    bidId: 'demo-bid-dog-food',
    productId: 'demo-product-dog-food',
    sellerId: 'demo-seller-pet',
    category: 'PET',
    categoryName: 'Pet',
    subCategoryName: 'Kuru mama',
    segmentName: 'Köpek',
    petType: 'DOG',
    petSubCategory: 'DRY_FOOD',
    brand: 'Rexo',
    model: 'Kuzu Etli Adult',
    packageInfo: '15 kg',
    barcode: '8690000000012',
    imageUrl: image('photo-1601758063541-d2f50b4aafb2'),
    description: 'Yetişkin köpekler için kuzu etli, parametre bazlı seçilen satıcıyla listelenen standart paket.',
    price: '1399.00',
    stock: 45,
    deliveryDays: 3,
    title: 'Rexo Kuzu Etli Yetişkin Köpek Maması 15 kg',
  },
  {
    requestId: 'demo-request-diaper',
    auctionId: 'demo-auction-diaper',
    bidId: 'demo-bid-diaper',
    productId: 'demo-product-diaper',
    sellerId: 'demo-seller-baby',
    category: 'BABY',
    categoryName: 'Bebek',
    subCategoryName: 'Bebek bezi',
    segmentName: 'Bakim',
    babySubCategory: 'DIAPER',
    brand: 'MiniSoft',
    model: '4 Numara Maxi',
    packageInfo: '120 adet',
    barcode: '8690000000021',
    imageUrl: image('photo-1515488042361-ee00e0ddd4e4'),
    description: '4 numara 120 adet bebek bezi. Sade tarafta parametre bazlı seçilen satıcı modeliyle listelenir.',
    price: '549.90',
    stock: 130,
    deliveryDays: 1,
    title: 'MiniSoft 4 Numara Bebek Bezi 120 Adet',
  },
];

const vitrinProfiles = [
  {
    id: 'demo-vitrin-zeynep',
    ownerId: 'demo-creator-zeynep',
    name: 'Zeynep Acar',
    handle: 'zeynepacar',
    specialty: 'Gündelik stil',
    bio: 'Sade kombinler, rahat parçalar ve gerçek kullanım notları.',
    avatarUrl: image('photo-1494790108377-be9c29b29330'),
    heroUrl: image('photo-1483985988355-763728e1935b'),
    followerCount: 12400,
    verified: true,
  },
  {
    id: 'demo-vitrin-deniz',
    ownerId: 'demo-creator-deniz',
    name: 'Deniz Arslan',
    handle: 'deniztech',
    specialty: 'Teknoloji ve setup',
    bio: 'Masa üstü düzeni, kulaklık, aksesuar ve günlük teknoloji seçimleri.',
    avatarUrl: image('photo-1500648767791-00dcc994a43e'),
    heroUrl: image('photo-1497366754035-f200968a6e72'),
    followerCount: 8600,
    verified: true,
  },
  {
    id: 'demo-vitrin-evim',
    ownerId: null,
    name: 'Evimde Sade',
    handle: 'evimdesade',
    specialty: 'Ev ve yaşam',
    bio: 'Mutfak, depolama ve düzen için ticari ama sakin öneriler.',
    avatarUrl: image('photo-1580489944761-15a19d654956'),
    heroUrl: image('photo-1556912172-45b7abe8b7e1'),
    followerCount: 5300,
    verified: false,
  },
];

const vitrinProducts = [
  {
    id: 'demo-vitrin-product-bag',
    influencerId: 'demo-vitrin-zeynep',
    sellerId: 'demo-seller-style',
    title: 'Nova Mini Omuz Çantası',
    description: 'Günlük kombinlerde hafif, fermuarlı ve ayarlanabilir askılı mini çanta.',
    imageUrl: image('photo-1594223274512-ad4803739b7c'),
    imageUrls: [
      image('photo-1594223274512-ad4803739b7c'),
      image('photo-1584917865442-de89df76afd3'),
    ],
    priceText: '899 TL',
    sellerName: 'Nova Stil',
    detailText: 'Suni deri, 22 x 15 cm, ayarlanabilir askılı.',
    sizes: ['Standart'],
    colors: ['Siyah', 'Krem', 'Taba'],
    linkText: 'Çantaya git',
    stockText: '42 adet',
    dailyHits: 420,
    weeklyHits: 3100,
    monthlyHits: 12100,
  },
  {
    id: 'demo-vitrin-product-sneaker',
    influencerId: 'demo-vitrin-zeynep',
    sellerId: 'demo-seller-style',
    title: 'Nova Beyaz Sneaker',
    description: 'Yumuşak tabanlı, sade beyaz sneaker. Kombin postlarında etiketlenebilir.',
    imageUrl: image('photo-1549298916-b41d501d3772'),
    imageUrls: [
      image('photo-1549298916-b41d501d3772'),
      image('photo-1608231387042-66d1773070a5'),
    ],
    priceText: '1.349 TL',
    sellerName: 'Nova Stil',
    detailText: '36-40 numara, vegan deri, günlük kullanım.',
    sizes: ['36', '37', '38', '39', '40'],
    colors: ['Beyaz'],
    linkText: 'Sneakeri incele',
    stockText: '23 adet',
    dailyHits: 610,
    weeklyHits: 4500,
    monthlyHits: 17300,
  },
  {
    id: 'demo-vitrin-product-keyboard',
    influencerId: 'demo-vitrin-deniz',
    sellerId: 'demo-seller-style',
    title: 'DeskMate Mekanik Klavye',
    description: 'Sessiz switch, kompakt gövde ve kablosuz bağlantı.',
    imageUrl: image('photo-1587829741301-dc798b83add3'),
    imageUrls: [
      image('photo-1587829741301-dc798b83add3'),
      image('photo-1618384887929-16ec33fab9ef'),
    ],
    priceText: '2.199 TL',
    sellerName: 'Nova Stil',
    detailText: 'Bluetooth, USB-C, TR tuş dizilimi.',
    sizes: ['75%'],
    colors: ['Gri', 'Siyah'],
    linkText: 'Klavyeye git',
    stockText: '18 adet',
    dailyHits: 390,
    weeklyHits: 2800,
    monthlyHits: 9300,
  },
];

const vitrinPosts = [
  {
    id: 'demo-vitrin-post-style',
    influencerId: 'demo-vitrin-zeynep',
    productId: 'demo-vitrin-product-bag',
    type: 'post',
    title: 'Hafta sonu sade kombin',
    caption: 'Tek parça elbise, beyaz sneaker ve mini çanta. Ürünleri basılı tutunca ayrı listede görebilirsin.',
    mediaUrl: image('photo-1483985988355-763728e1935b'),
    mediaUrls: [
      image('photo-1483985988355-763728e1935b'),
      image('photo-1503342217505-b0a15ec3261c'),
    ],
    productTitle: 'Nova Mini Omuz Çantası',
    productQuery: 'mini omuz çantası beyaz sneaker',
    productPrice: '899 TL',
    campaign: 'Haftanın kombini',
    tags: ['stil', 'çanta', 'sneaker'],
    productLinks: [
      { productId: 'demo-vitrin-product-bag', label: 'Çanta', x: 62, y: 58 },
      { productId: 'demo-vitrin-product-sneaker', label: 'Sneaker', x: 46, y: 86 },
    ],
    likeCount: 1140,
    commentCount: 2,
    dailyScore: 94,
    weeklyScore: 820,
    monthlyScore: 2600,
  },
  {
    id: 'demo-vitrin-post-tech',
    influencerId: 'demo-vitrin-deniz',
    productId: 'demo-vitrin-product-keyboard',
    type: 'post',
    title: 'Sakin masa üstü',
    caption: 'Küçük masada temiz görünüm. Klavye ve aydınlatma linkleri ürün listesinde.',
    mediaUrl: image('photo-1497366811353-6870744d04b2'),
    mediaUrls: [
      image('photo-1497366811353-6870744d04b2'),
      image('photo-1516321318423-f06f85e504b3'),
    ],
    productTitle: 'DeskMate Mekanik Klavye',
    productQuery: 'mekanik klavye masa setup',
    productPrice: '2.199 TL',
    tags: ['teknoloji', 'setup', 'klavye'],
    productLinks: [
      { productId: 'demo-vitrin-product-keyboard', label: 'Klavye', x: 48, y: 64 },
    ],
    likeCount: 780,
    commentCount: 1,
    dailyScore: 88,
    weeklyScore: 640,
    monthlyScore: 2100,
  },
];

const comments = [
  {
    id: 'demo-comment-style-1',
    postId: 'demo-vitrin-post-style',
    profileId: 'demo-customer-ayse',
    text: 'Çanta boyutu günlük kullanım için çok iyi duruyor.',
  },
  {
    id: 'demo-comment-style-2',
    postId: 'demo-vitrin-post-style',
    profileId: 'demo-customer-emre',
    text: 'Sneaker linki de basılı tutunca çıkıyor, güzel.',
  },
  {
    id: 'demo-comment-tech-1',
    postId: 'demo-vitrin-post-tech',
    profileId: 'demo-customer-ayse',
    text: 'Klavye sesiyle ilgili detay eklenmesi iyi olur.',
  },
];

const searchDemands = [
  {
    id: 'demo-search-demand-cat-litter',
    userId: 'demo-customer-ayse',
    query: 'topaklanan lavanta kokulu kedi kumu 10 lt',
    normalizedQuery: 'topaklanan lavanta kokulu kedi kumu 10 lt',
    resultCount: 0,
    category: 'PET',
    categoryName: 'Pet',
    subCategoryName: 'Kum',
    segmentName: 'Kedi',
    petType: 'CAT',
    petSubCategory: 'LITTER',
    status: 'OPEN',
  },
  {
    id: 'demo-search-demand-baby-wipes',
    userId: 'demo-customer-emre',
    query: 'alkolsuz islak mendil 12 paket',
    normalizedQuery: 'alkolsuz islak mendil 12 paket',
    resultCount: 0,
    category: 'BABY',
    categoryName: 'Bebek',
    subCategoryName: 'Islak mendil',
    segmentName: 'Bakım',
    babySubCategory: 'WIPES',
    status: 'OPEN',
  },
];

const barcodeDemands = [
  {
    id: 'demo-barcode-demand-cat-treat',
    userId: 'demo-customer-ayse',
    barcode: '8690000099991',
    note: 'Kediler için somonlu ödül maması, küçük paket.',
    status: 'OPEN',
  },
  {
    id: 'demo-barcode-demand-bottle',
    userId: 'demo-customer-emre',
    barcode: '8690000099992',
    note: 'Bebek biberonu, 250 ml, cam gövde olabilir.',
    status: 'OPEN',
  },
];

async function upsertUser(user, passwordHash) {
  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      ...user,
      passwordHash,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
    update: {
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
      passwordHash,
      isEmailVerified: true,
      isPhoneVerified: true,
      experienceMode: user.experienceMode ?? 'SIMPLE',
      notifyNewProducts: user.notifyNewProducts ?? false,
      notifyCampaigns: user.notifyCampaigns ?? false,
    },
  });
}

async function upsertSimpleProduct(item) {
  await prisma.productRequest.upsert({
    where: { id: item.requestId },
    create: {
      id: item.requestId,
      sellerId: item.sellerId,
      category: item.category,
      categoryName: item.categoryName,
      subCategoryName: item.subCategoryName,
      segmentName: item.segmentName,
      petType: item.petType,
      petSubCategory: item.petSubCategory,
      babySubCategory: item.babySubCategory,
      brand: item.brand,
      model: item.model,
      packageInfo: item.packageInfo,
      barcode: item.barcode,
      imageUrl: item.imageUrl,
      description: item.description,
      status: 'APPROVED',
    },
    update: {
      imageUrl: item.imageUrl,
      description: item.description,
      status: 'APPROVED',
    },
  });

  await prisma.auction.upsert({
    where: { id: item.auctionId },
    create: {
      id: item.auctionId,
      requestId: item.requestId,
      startsAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: 'COMPLETED',
    },
    update: {
      status: 'COMPLETED',
      endsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.bid.upsert({
    where: { id: item.bidId },
    create: {
      id: item.bidId,
      auctionId: item.auctionId,
      sellerId: item.sellerId,
      price: item.price,
      stock: item.stock,
      deliveryDays: item.deliveryDays,
      note: 'Demo kazanan teklif',
    },
    update: {
      price: item.price,
      stock: item.stock,
      deliveryDays: item.deliveryDays,
    },
  });

  await prisma.auction.update({
    where: { id: item.auctionId },
    data: { winnerBidId: item.bidId },
  });

  await prisma.product.upsert({
    where: { id: item.productId },
    create: {
      id: item.productId,
      auctionId: item.auctionId,
      sellerId: item.sellerId,
      category: item.category,
      categoryName: item.categoryName,
      subCategoryName: item.subCategoryName,
      segmentName: item.segmentName,
      petType: item.petType,
      petSubCategory: item.petSubCategory,
      babySubCategory: item.babySubCategory,
      title: item.title,
      barcode: item.barcode,
      imageUrl: item.imageUrl,
      description: item.description,
      price: item.price,
      stock: item.stock,
      deliveryDays: item.deliveryDays,
      isActive: true,
    },
    update: {
      title: item.title,
      imageUrl: item.imageUrl,
      description: item.description,
      price: item.price,
      stock: item.stock,
      deliveryDays: item.deliveryDays,
      isActive: true,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  for (const user of demoUsers) {
    await upsertUser(user, passwordHash);
  }

  for (const profile of sellerProfiles) {
    await prisma.sellerProfile.upsert({
      where: { userId: profile.userId },
      create: profile,
      update: profile,
    });
  }

  for (const address of addresses) {
    await prisma.address.upsert({
      where: { id: address.id },
      create: address,
      update: address,
    });
  }

  for (const product of simpleProducts) {
    await upsertSimpleProduct(product);
  }

  for (const profile of vitrinProfiles) {
    await prisma.influencerProfile.upsert({
      where: { id: profile.id },
      create: profile,
      update: profile,
    });
  }

  for (const product of vitrinProducts) {
    await prisma.influencerProduct.upsert({
      where: { id: product.id },
      create: product,
      update: product,
    });
  }

  for (const post of vitrinPosts) {
    await prisma.influencerPost.upsert({
      where: { id: post.id },
      create: {
        ...post,
        productLinks: post.productLinks,
      },
      update: {
        ...post,
        productLinks: post.productLinks,
      },
    });
  }

  await prisma.influencerCollection.upsert({
    where: { id: 'demo-collection-zeynep' },
    create: {
      id: 'demo-collection-zeynep',
      influencerId: 'demo-vitrin-zeynep',
      title: 'Sade hafta sonu',
      text: 'Çanta, sneaker ve kolay kombin parçaları.',
      productCount: 2,
      mediaUrl: image('photo-1503342217505-b0a15ec3261c'),
    },
    update: {
      productCount: 2,
      mediaUrl: image('photo-1503342217505-b0a15ec3261c'),
    },
  });

  await prisma.influencerFollow.upsert({
    where: {
      profileId_influencerId: {
        profileId: 'demo-customer-ayse',
        influencerId: 'demo-vitrin-zeynep',
      },
    },
    create: {
      id: 'demo-follow-ayse-zeynep',
      profileId: 'demo-customer-ayse',
      influencerId: 'demo-vitrin-zeynep',
    },
    update: {},
  });

  await prisma.influencerFollow.upsert({
    where: {
      profileId_influencerId: {
        profileId: 'demo-customer-ayse',
        influencerId: 'demo-vitrin-deniz',
      },
    },
    create: {
      id: 'demo-follow-ayse-deniz',
      profileId: 'demo-customer-ayse',
      influencerId: 'demo-vitrin-deniz',
    },
    update: {},
  });

  await prisma.influencerPostLike.upsert({
    where: {
      postId_profileId: {
        postId: 'demo-vitrin-post-style',
        profileId: 'demo-customer-ayse',
      },
    },
    create: {
      id: 'demo-like-style-ayse',
      postId: 'demo-vitrin-post-style',
      profileId: 'demo-customer-ayse',
    },
    update: {},
  });

  for (const comment of comments) {
    await prisma.influencerPostComment.upsert({
      where: { id: comment.id },
      create: comment,
      update: { text: comment.text },
    });
  }

  for (const demand of searchDemands) {
    await prisma.searchDemand.upsert({
      where: { id: demand.id },
      create: demand,
      update: {
        query: demand.query,
        normalizedQuery: demand.normalizedQuery,
        resultCount: demand.resultCount,
        category: demand.category,
        categoryName: demand.categoryName,
        subCategoryName: demand.subCategoryName,
        segmentName: demand.segmentName,
        petType: demand.petType,
        petSubCategory: demand.petSubCategory,
        babySubCategory: demand.babySubCategory,
        status: demand.status,
      },
    });
  }

  for (const demand of barcodeDemands) {
    await prisma.barcodeDemand.upsert({
      where: { id: demand.id },
      create: demand,
      update: {
        barcode: demand.barcode,
        note: demand.note,
        status: demand.status,
      },
    });
  }

  await prisma.notification.createMany({
    data: [
      {
        userId: 'demo-customer-ayse',
        type: 'DEMO',
        title: 'Demo veriler hazir',
        body: 'Sade ürünler ve vitrin paylaşımları test için eklendi.',
      },
      {
        userId: 'demo-seller-pet',
        type: 'DEMO',
        title: 'Kazanan teklif ?rne?i',
        body: 'Sade tarafta parametre bazlı seçilen satıcı modeli için demo teklif oluşturuldu.',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Demo seed tamamlandi.');
  console.log(`Sifre tum demo hesaplarda: ${password}`);
  console.log('Kullanici: ayse.demo@sadevitrin.local');
  console.log('Satici: pati.demo@sadevitrin.local');
  console.log('Yonetici: admin@sadevitrin.local');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
