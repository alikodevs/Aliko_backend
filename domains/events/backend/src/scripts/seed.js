const { PrismaClient } = require('../generated/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Dummy Data for Events Service ---');

  // Promotion Requests
  console.log('Adding Promotion Requests...');
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
        message: 'Annual AI Research Summit 2026 partner request.',
        status: 'PENDING',
        location: 'Skylight Hotel',
      },
      {
        companyName: 'Fintech Connect',
        contactPerson: 'Abebe Kebede',
        email: 'abebe@fintech.et',
        phoneNumber: '+251-912-123456',
        event_type: 'Networking',
        estimatedAttendees: '50_200',
        message: 'Weekly networking meetup for fintech enthusiasts.',
        status: 'CONVERTED',
        location: 'Virtual Platform',
      }
    ]
  });

  // Events (Posts)
  console.log('Adding Events...');
  const event1 = await prisma.post.create({
    data: {
      title: 'Global Leadership Summit 2026',
      type: 'EVENT',
      status: 'PUBLISHED',
      content: 'A high-impact gathering of world leaders and professionals.',
      excerpt: 'The premier leadership event.',
      eventDate: new Date('2026-06-15T09:00:00Z'),
      location: 'Skylight Hotel, Addis Ababa',
      authorId: 'system_admin',
      slug: 'global-leadership-summit-2026',
    }
  });

  const event2 = await prisma.post.create({
    data: {
      title: 'Aliko Rooftop Networking',
      type: 'SOCIAL_EVENT',
      status: 'PUBLISHED',
      content: 'Relaxed evening of music and connection.',
      excerpt: 'Music under the stars.',
      eventDate: new Date('2026-07-20T18:30:00Z'),
      location: 'Aliko Terrace',
      authorId: 'system_admin',
      slug: 'aliko-rooftop-networking',
    }
  });

  // Tickets
  console.log('Adding Tickets...');
  await prisma.ticket.createMany({
    data: [
      { eventId: event1.id, name: 'General Admission', price: 99.99, quantity: 200 },
      { eventId: event1.id, name: 'VIP Pass', price: 299.99, quantity: 20 }
    ]
  });

  // RSVPs
  console.log('Adding RSVPs...');
  await prisma.rSVP.createMany({
    data: [
      { eventId: event2.id, guestName: 'Elias Tadesse', guestEmail: 'elias@example.com', response: 'yes' },
      { eventId: event2.id, guestName: 'Hanna Selassie', guestEmail: 'hanna@example.com', response: 'maybe' }
    ]
  });

  console.log('--- Seed Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
