import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding dummy data for Events Service...');

  // 1. Clear existing data (Optional - depends on if user wants a clean start. I'll skip to avoid accidental loss)
  // await prisma.registration.deleteMany();
  // await prisma.ticket.deleteMany();
  // await prisma.rSVP.deleteMany();
  // await prisma.post.deleteMany();
  // await prisma.promotionRequest.deleteMany();

  // 2. Create Promotion Requests
  console.log('Creating Promotion Requests...');
  await prisma.promotionRequest.createMany({
    data: [
      {
        companyName: 'TechVision Global',
        contactPerson: 'Dr. Michael Chen',
        email: 'michael.chen@techvision.com',
        phoneNumber: '+1-555-0123',
        organization: 'Innovation Council',
        event_type: 'Summit',
        estimatedAttendees: '200_500',
        message: 'We are looking to partner with AlikoHub for our annual AI Research Summit 2026. We need a premium venue and digital promotion.',
        status: 'PENDING',
        location: 'Addis Ababa - Creative Arts Center',
      },
      {
        companyName: 'Artisans Collective',
        contactPerson: 'Sarah Berhe',
        email: 'sarah@artisans.org',
        phoneNumber: '+251-911-556677',
        event_type: 'Workshop',
        estimatedAttendees: 'under_50',
        message: 'Hosting a localized pottery and design workshop to promote young Ethiopian artists.',
        status: 'REVIEWED',
        location: 'Aliko Creative Space',
      },
      {
        companyName: 'Fintech Connect',
        contactPerson: 'Abebe Kebede',
        email: 'abebe@fintech.et',
        phoneNumber: '+251-912-123456',
        event_type: 'Networking',
        estimatedAttendees: '50_200',
        message: 'Weekly networking meetup for fintech enthusiasts and startup founders.',
        status: 'CONVERTED',
        location: 'Virtual Platform',
      }
    ]
  });

  // 3. Create Events (Posts)
  console.log('Creating Events...');
  const event1 = await prisma.post.create({
    data: {
      title: 'Global Leadership Summit 2026',
      type: 'EVENT',
      status: 'PUBLISHED',
      content: 'A high-impact gathering of world leaders and professionals discussing the future of economy and technology in Sub-Saharan Africa.',
      excerpt: 'The premier leadership event of the year.',
      eventDate: new Date('2026-06-15T09:00:00Z'),
      location: 'Skylight Hotel, Addis Ababa',
      authorId: 'system_admin',
      slug: 'global-leadership-summit-2026',
      coverImage: 'https://images.unsplash.com/photo-1540575861501-7ad05823c9f5?auto=format&fit=crop&q=80&w=1000',
    }
  });

  const event2 = await prisma.post.create({
    data: {
      title: 'Aliko Summer Networking Night',
      type: 'SOCIAL_EVENT',
      status: 'PUBLISHED',
      content: 'Join us for a relaxed evening of music, refreshments, and connection. Meet the brightest minds in the AlikoHub community.',
      excerpt: 'Refreshments and music under the stars.',
      eventDate: new Date('2026-07-20T18:30:00Z'),
      location: 'Aliko Rooftop Terrace',
      authorId: 'system_admin',
      slug: 'aliko-summer-networking',
      coverImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=1000',
    }
  });

  // 4. Create Ticket Tiers
  console.log('Creating Tickets...');
  await prisma.ticket.createMany({
    data: [
      {
        eventId: event1.id,
        name: 'Early Bird Pass',
        price: 49.99,
        quantity: 50,
      },
      {
        eventId: event1.id,
        name: 'General Admission',
        price: 99.99,
        quantity: 200,
      },
      {
        eventId: event1.id,
        name: 'VIP Experience',
        price: 249.99,
        quantity: 20,
      }
    ]
  });

  // 5. Create RSVPs for Social Event
  console.log('Creating RSVPs...');
  await prisma.rSVP.createMany({
    data: [
      {
        eventId: event2.id,
        guestName: 'Elias Tadesse',
        guestEmail: 'elias@example.com',
        response: 'yes',
        notes: 'Looking forward to it!',
      },
      {
        eventId: event2.id,
        guestName: 'Hanna Selassie',
        guestEmail: 'hanna@example.com',
        response: 'maybe',
        plusOneName: 'Samuel Selassie',
      },
      {
        eventId: event2.id,
        guestName: 'Daniel Mengesha',
        guestEmail: 'daniel@example.com',
        response: 'yes',
      }
    ]
  });

  // 6. Create Registrations for Main Event
  console.log('Creating Registrations...');
  await prisma.registration.createMany({
    data: [
      {
        eventId: event1.id,
        attendeeName: 'Bruh Tesfaye',
        attendeeEmail: 'bruh@example.com',
        totalPaid: 99.99,
        paymentStatus: 'paid',
        qrCodeValue: 'ticket_BRUH_XYZ123',
      },
      {
        eventId: event1.id,
        attendeeName: 'Luliya Girma',
        attendeeEmail: 'luli@example.com',
        totalPaid: 249.99,
        paymentStatus: 'paid',
        qrCodeValue: 'ticket_LULI_VIP456',
      }
    ]
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
