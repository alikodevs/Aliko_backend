const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Comprehensive Seeding for Events Service ---');

  const userId = 'system_admin_user';

  // 1. Cleanup
  console.log('Cleaning up existing data...');
  await prisma.registration.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.rSVP.deleteMany();
  await prisma.session.deleteMany();
  await prisma.sponsor.deleteMany();
  await prisma.portfolioMedia.deleteMany();
  await prisma.post.deleteMany();
  await prisma.promotionRequest.deleteMany();

  // 2. Promotion Requests
  console.log('Creating Promotion Requests...');
  await prisma.promotionRequest.createMany({
    data: [
      {
        companyName: 'Luli Tech Solutions',
        contactPerson: 'Luliya Girma',
        email: 'luli@tech.et',
        phoneNumber: '+251-911-000000',
        event_type: 'Product Launch',
        message: 'Launching our new SaaS product and want to collaborate with AlikoHub for the event.',
        status: 'PENDING',
        userId: userId,
      },
      {
        companyName: 'Coffee Artisans',
        contactPerson: 'Elias Tadesse',
        email: 'elias@coffee.et',
        phoneNumber: '+251-912-000000',
        event_type: 'Tasting Event',
        message: 'A celebration of specialty coffee from across Ethiopia.',
        status: 'CONVERTED',
        userId: userId,
      }
    ]
  });

  // 3. Professional Event (with detailed sub-entities)
  console.log('Creating Professional Event...');
  const proEvent = await prisma.post.create({
    data: {
      title: 'Ethio-Tech Summit 2026',
      type: 'EVENT',
      status: 'PUBLISHED',
      content: 'The most anticipated tech gathering in the region, focusing on blockchain, AI, and sustainable tech.',
      excerpt: 'Where innovation meets opportunity.',
      slug: 'ethio-tech-summit-2026',
      eventDate: new Date('2026-08-10T09:00:00Z'),
      location: 'African Union Hall, Addis Ababa',
      authorId: userId,
      coverImage: 'https://images.unsplash.com/photo-1591115765373-520b7a217282?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80',
      sessions: {
        create: [
          { title: 'Opening Keynote', speakerName: 'Dr. Tesfaye M.', startTime: new Date('2026-08-10T09:30:00Z'), endTime: new Date('2026-08-10T11:00:00Z') },
          { title: 'The Future of AI in Ethiopia', speakerName: 'Sara K.', startTime: new Date('2026-08-10T11:30:00Z'), endTime: new Date('2026-08-10T13:00:00Z') }
        ]
      },
      sponsors: {
        create: [
          { name: 'Safara-Telecom', tier: 'Diamond', logoUrl: 'https://logo.clearbit.com/safaricom.co.ke' },
          { name: 'Ethio-Bank', tier: 'Gold', logoUrl: 'https://logo.clearbit.com/ethiobank.com' }
        ]
      }
    }
  });

  // 4. Tickets for Pro Event
  console.log('Creating Tickets...');
  const ticket1 = await prisma.ticket.create({
    data: {
      eventId: proEvent.id,
      name: 'Early Bird Access',
      price: 25.0,
      quantity: 100,
    }
  });

  const ticket2 = await prisma.ticket.create({
    data: {
      eventId: proEvent.id,
      name: 'Professional Pass',
      price: 75.0,
      quantity: 500,
    }
  });

  // 5. Registrations (Attendees)
  console.log('Creating Attendees...');
  await prisma.registration.createMany({
    data: [
      {
        eventId: proEvent.id,
        ticketId: ticket1.id,
        attendeeName: 'Yonas Abebe',
        attendeeEmail: 'yonas@test.com',
        totalPaid: 25.0,
        paymentStatus: 'paid',
        qrCodeValue: 'REG-YONAS-001',
        isCheckedIn: true,
        checkedInAt: new Date(),
      },
      {
        eventId: proEvent.id,
        ticketId: ticket2.id,
        attendeeName: 'Melat Kebede',
        attendeeEmail: 'melat@test.com',
        totalPaid: 75.0,
        paymentStatus: 'paid',
        qrCodeValue: 'REG-MELAT-002',
        isCheckedIn: false,
      }
    ]
  });

  // 6. Social Event
  console.log('Creating Social Event and RSVPs...');
  const socialEvent = await prisma.post.create({
    data: {
      title: 'Founder\'s Garden Gala',
      type: 'SOCIAL_EVENT',
      status: 'PUBLISHED',
      content: 'An elegant evening celebrating our community of founders and mentors.',
      excerpt: 'Elegance and networking in the garden.',
      slug: 'founders-gala-2026',
      eventDate: new Date('2026-09-05T19:00:00Z'),
      location: 'Aliko Private Gardens',
      authorId: userId,
      coverImage: 'https://images.unsplash.com/photo-1541250848049-b4f71413cc30?ixlib=rb-4.0.3&auto=format&fit=crop&w=1287&q=80',
    }
  });

  await prisma.rSVP.createMany({
    data: [
      { eventId: socialEvent.id, guestName: 'Dawit Solomon', guestEmail: 'dawit@gala.com', response: 'yes', plusOneName: 'Hanna S.' },
      { eventId: socialEvent.id, guestName: 'Bruh Tesfaye', guestEmail: 'bruh@gala.com', response: 'maybe' },
      { eventId: socialEvent.id, guestName: 'Kidist Hailu', guestEmail: 'kidi@gala.com', response: 'yes' }
    ]
  });

  // 7. Portfolio Media
  console.log('Creating Portfolio Media...');
  await prisma.portfolioMedia.createMany({
    data: [
      {
        portal: 'professional',
        category: 'Tech Fair',
        title: 'Main Hall Setup',
        description: 'Exhibition booths at the 2025 Tech Expo.',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1582192732843-fbca5ff9c27b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1335&q=80',
        createdBy: userId,
      },
      {
        portal: 'social',
        category: 'Wedding',
        title: 'Outdoor Recption',
        description: 'Floral arrangements and lighting for twilight weddings.',
        mediaType: 'image',
        mediaUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1474&q=80',
        createdBy: userId,
      }
    ]
  });

  console.log('--- Seeding Completed! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
