const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@sadevitrin.local';
  const phone = process.env.ADMIN_PHONE || '05550000000';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      role: 'ADMIN',
      name: 'SadeVitrin Yonetici',
      phone,
      email,
      passwordHash,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
    update: {
      role: 'ADMIN',
      passwordHash,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  console.log(`Admin ready: ${admin.email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
