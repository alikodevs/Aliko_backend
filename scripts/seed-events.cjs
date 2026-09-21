const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'domains', 'events', 'backend', 'src', 'generated', 'client'));

const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://alikohub:SecurePassword123!@localhost:5432/alikohub_db?schema=events' } },
});

async function main() {
  console.log('Seeding MORE Events Database Content...');

  // Get Admin and CM Firebase IDs
  const adminId = 'K3SKLgYJsHY8SFOSL3MyT1jV6FP2';
  const cmId = 'Sh4oT6ShBhenYJeXIj03m7HC71s1';
  const userId = 'OwCMXYKEjPPv4a4Fsk1beESpdcw1';
  
  // -------------------------------------------------------------
  // PROFESSIONAL EVENTS
  // -------------------------------------------------------------
  const event2 = await prisma.post.create({
    data: {
      type: 'EVENT',
      status: 'PUBLISHED',
      title: 'Africa FinTech Disrupt 2026',
      excerpt: 'The premier fintech event connecting startups and investors.',
      content: '<p>Join us in Kigali to witness the next generation of financial technology in Africa...</p>',
      authorId: adminId,
      publishDate: new Date(),
      slug: 'africa-fintech-disrupt-2026',
      eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
      endEventDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
      startTime: '08:00',
      endTime: '18:00',
      timezone: 'EAT',
      location: 'Kigali Convention Centre',
      locationAddress: 'KG 2 Roundabout, Kigali, Rwanda',
      externalLink: 'https://alikohub.com/fintech',
      registrations: {
        create: [
          { attendeeName: 'Alice Johnson', attendeeEmail: 'alice@finup.co', paymentStatus: 'paid', totalPaid: 300, isCheckedIn: false, qrCodeValue: 'QR_FIN_ALICE' },
          { attendeeName: 'Bob Williams', attendeeEmail: 'bob@capitall.io', paymentStatus: 'paid', totalPaid: 300, isCheckedIn: true, checkedInAt: new Date(), qrCodeValue: 'QR_FIN_BOB' },
          { attendeeName: 'Charlie Davis', attendeeEmail: 'charlie@bank.com', paymentStatus: 'pending', totalPaid: 0, isCheckedIn: false, qrCodeValue: 'QR_FIN_CHARLIE' },
          { attendeeName: 'Diana Prince', attendeeEmail: 'diana@amazon.com', paymentStatus: 'paid', totalPaid: 500, isCheckedIn: true, checkedInAt: new Date(), qrCodeValue: 'QR_FIN_DIANA' },
        ]
      },
      tickets: {
        create: [
          { name: 'Standard Ticket', price: 300, quantity: 500, isActive: true },
          { name: 'Investor Pass', price: 1500, quantity: 50, isActive: true }
        ]
      },
      sessions: {
        create: [
          { title: 'The Future of Mobile Money', speakerName: 'Jane CEO', startTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), endTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 3600000) },
          { title: 'Crypto Regulations in Africa', speakerName: 'Regulator John', startTime: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), endTime: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000 + 3600000) }
        ]
      },
      sponsors: { create: [{ name: 'FinBank', tier: 'Platinum' }, { name: 'PaymentGateway', tier: 'Gold' }] }
    }
  });

  const event3 = await prisma.post.create({
    data: {
      type: 'EVENT',
      status: 'PUBLISHED',
      title: 'Web3 & AI Developer Workshop',
      excerpt: 'A hands-on coding workshop for intermediate developers.',
      content: '<p>Master smart contracts and AI agents over a weekend intensive.</p>',
      authorId: cmId,
      publishDate: new Date(),
      slug: 'web3-ai-dev-workshop-2026',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
      startTime: '10:00',
      endTime: '15:00',
      timezone: 'UTC',
      location: 'Virtual',
      registrations: {
        create: [
          { attendeeName: 'Eve Hacker', attendeeEmail: 'eve@code.org', paymentStatus: 'paid', totalPaid: 50, isCheckedIn: true, checkedInAt: new Date(), qrCodeValue: 'QR_DEV_EVE' },
          { attendeeName: 'Frank Dev', attendeeEmail: 'frank@github.com', paymentStatus: 'paid', totalPaid: 50, isCheckedIn: false, qrCodeValue: 'QR_DEV_FRANK' },
          { attendeeName: 'Grace Hopper', attendeeEmail: 'grace@navy.mil', paymentStatus: 'paid', totalPaid: 0, isCheckedIn: true, checkedInAt: new Date(), qrCodeValue: 'QR_DEV_GRACE' },
        ]
      },
      tickets: {
        create: [
          { name: 'General Admission', price: 50, quantity: 100, isActive: true },
          { name: 'Student Discount', price: 20, quantity: 50, isActive: true }
        ]
      },
      sessions: {
        create: [{ title: 'Intro to Solidity', speakerName: 'Vitalik B.', startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 7200000) }]
      }
    }
  });

  const event4 = await prisma.post.create({
    data: {
      type: 'EVENT',
      status: 'DRAFT',
      title: 'Startup Pitch Competition - Q3',
      excerpt: 'Pitch your startup to top VCs.',
      content: '<p>Submit your pitch deck and present live to our panel of judges.</p>',
      authorId: adminId,
      slug: 'pitch-comp-q3-2026',
      eventDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      tickets: { create: [{ name: 'Pitch Slot', price: 0, quantity: 10, isActive: true }] }
    }
  });

  // -------------------------------------------------------------
  // SOCIAL EVENTS
  // -------------------------------------------------------------
  const social2 = await prisma.post.create({
    data: {
      type: 'SOCIAL_EVENT',
      status: 'PUBLISHED',
      title: 'Founders Pizza Night',
      excerpt: 'Casual networking over pizza and drinks.',
      content: '<p>A relaxed evening for founders to share stories and a slice.</p>',
      authorId: adminId,
      publishDate: new Date(),
      slug: 'founders-pizza-night',
      eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      startTime: '19:00',
      endTime: '21:00',
      timezone: 'UTC',
      location: 'Luigis Pizza, Downtown',
      hostName: 'AlikoHub Founders Club',
      privacy: 'public',
      templateId: 'fun',
      rsvps: {
        create: [
          { guestName: 'Harry Potter', guestEmail: 'harry@hogwarts.edu', response: 'yes', mealPreference: 'Pepperoni' },
          { guestName: 'Hermione G', guestEmail: 'hermione@hogwarts.edu', response: 'yes', mealPreference: 'Vegan', plusOneName: 'Ron W' },
          { guestName: 'Neville L', guestEmail: 'neville@hogwarts.edu', response: 'no' },
          { guestName: 'Luna Lovegood', guestEmail: 'luna@quibbler.com', response: 'maybe' },
        ]
      }
    }
  });

  const social3 = await prisma.post.create({
    data: {
      type: 'SOCIAL_EVENT',
      status: 'PUBLISHED',
      title: 'Tech Board Game Afternoon',
      excerpt: 'Unplug and play board games with fellow developers.',
      content: '<p>Bring your favorite board games or join one of ours!</p>',
      authorId: cmId,
      publishDate: new Date(Date.now() - 10000),
      slug: 'tech-board-game-afternoon',
      eventDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      startTime: '14:00',
      endTime: '18:00',
      timezone: 'UTC',
      location: 'The Coffee Shop',
      hostName: 'DevRel Team',
      privacy: 'link_only',
      templateId: 'minimal',
      rsvps: {
        create: [
          { guestName: 'Alice', guestEmail: 'alice@wonderland.com', response: 'yes' },
          { guestName: 'Mad Hatter', guestEmail: 'hatter@wonderland.com', response: 'yes', plusOneName: 'March Hare' },
        ]
      }
    }
  });

  const social4 = await prisma.post.create({
    data: {
      type: 'SOCIAL_EVENT',
      status: 'PUBLISHED',
      title: 'End of Year Gala 2026',
      excerpt: 'Celebrate the successes of the year.',
      content: '<p>Formal dress code required. Dinner and dancing.</p>',
      authorId: adminId,
      publishDate: new Date(),
      slug: 'eoy-gala-2026',
      eventDate: new Date('2026-12-15T19:00:00Z'),
      startTime: '19:00',
      endTime: '23:59',
      location: 'Grand Hotel',
      hostName: 'AlikoHub Executive Team',
      rsvps: {
        create: [
          { guestName: 'VIP Guest 1', guestEmail: 'vip1@example.com', response: 'yes' },
          { guestName: 'VIP Guest 2', guestEmail: 'vip2@example.com', response: 'maybe' },
        ]
      }
    }
  });

  // -------------------------------------------------------------
  // ANNOUNCEMENTS
  // -------------------------------------------------------------
  await prisma.post.create({
    data: {
      type: 'ANNOUNCEMENT', status: 'PUBLISHED', title: 'Welcome to the New Events System',
      excerpt: 'We have updated our internal events platform.',
      content: '<p>You can now RSVP and register directly within AlikoHub!</p>',
      authorId: adminId, publishDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    }
  });
  
  await prisma.post.create({
    data: {
      type: 'ANNOUNCEMENT', status: 'PUBLISHED', title: 'Community Guidelines Update',
      excerpt: 'Please review the updated code of conduct.',
      content: '<p>Our community rules have been updated to ensure a safer environment.</p>',
      authorId: cmId, publishDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    }
  });
  
  await prisma.post.create({
    data: {
      type: 'ANNOUNCEMENT', status: 'PUBLISHED', title: 'Q3 Townhall Meeting Scheduled',
      excerpt: 'Mark your calendars for the company-wide townhall.',
      content: '<p>The CEO will be discussing our Q3 metrics and Q4 roadmap.</p>',
      authorId: adminId, publishDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    }
  });

  // -------------------------------------------------------------
  // NEWS
  // -------------------------------------------------------------
  await prisma.post.create({
    data: {
      type: 'NEWS', status: 'PUBLISHED', title: 'Startup of the Month: EcoTech',
      excerpt: 'How EcoTech is changing urban farming.',
      content: '<p>EcoTech, an AlikoHub alumni, just raised a Series A...</p>',
      authorId: cmId, publishDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    }
  });

  await prisma.post.create({
    data: {
      type: 'NEWS', status: 'PUBLISHED', title: 'The Rise of AI in Construction',
      excerpt: 'ConTech is seeing massive AI adoption.',
      content: '<p>A new report suggests that 40% of construction firms...</p>',
      authorId: adminId, publishDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    }
  });

  await prisma.post.create({
    data: {
      type: 'NEWS', status: 'PUBLISHED', title: 'AlikoHub Partners with AWS',
      excerpt: 'Strategic partnership to provide credits to startups.',
      content: '<p>Founders in our network will now receive up to $100k in AWS credits...</p>',
      authorId: adminId, publishDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    }
  });

  // -------------------------------------------------------------
  // PROMOTION REQUESTS
  // -------------------------------------------------------------
  const promo2 = await prisma.promotionRequest.create({
    data: {
      companyName: 'DataGen AI',
      contactPerson: 'David Chen',
      email: 'd.chen@datagen.ai',
      organization: 'DataGen Internal',
      event_type: 'Hackathon',
      estimatedAttendees: '200+',
      preferredDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      location: 'Nairobi',
      type: 'EVENT',
      message: 'We want AlikoHub to co-sponsor an AI Hackathon with us.',
      // Intentionally left pending
    }
  });

  const promo3 = await prisma.promotionRequest.create({
    data: {
      companyName: 'Acme Corp',
      contactPerson: 'Wile E.',
      email: 'wile@acme.com',
      event_type: 'Networking',
      estimatedAttendees: '20-50',
      preferredDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      location: 'Virtual',
      type: 'SOCIAL_EVENT',
      message: 'Looking to host an online networking session for engineers.',
      status: 'REVIEWED'
    }
  });
  
  const promo4 = await prisma.promotionRequest.create({
    data: {
      companyName: 'Green Energy Coop',
      contactPerson: 'Greta T.',
      email: 'greta@gec.org',
      event_type: 'Conference',
      estimatedAttendees: '500+',
      type: 'ANNOUNCEMENT',
      message: 'Can you announce our upcoming Climate Tech grant application?',
      status: 'CONVERTED'
    }
  });

  console.log('✅ HUGE Seeding Phase 2 completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
