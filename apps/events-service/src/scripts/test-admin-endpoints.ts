import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { EventsRole, PostStatus, PostType } from '../generated/client';
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function testAdminEndpoints() {
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3004,
    },
  });

  const adminUser = {
    firebaseId: 'test-admin-id',
    email: 'admin@example.com',
    firstname: 'Admin',
    lastname: 'User',
    role: 'ADMIN',
    globalRole: 'ADMIN',
    status: 'ACTIVE',
  };

  const regularUser = {
    firebaseId: 'test-user-id',
    email: 'user@example.com',
    firstname: 'Regular',
    lastname: 'User',
    role: 'USER',
    globalRole: 'USER',
    status: 'ACTIVE',
  };

  console.log('--- Testing Admin Endpoints ---');

  // 0. Setup Mock Data
  console.log('\n0. Setting up mock data...');
  const mockPost = await prisma.post.upsert({
    where: { id: 'test-pending-post-id' },
    update: { status: PostStatus.PENDING },
    create: {
      id: 'test-pending-post-id',
      title: 'Test Pending Post',
      content: 'Content',
      type: PostType.EVENT,
      status: PostStatus.PENDING,
      authorId: 'test-user-id',
    },
  });

  const mockPromotion = await prisma.promotionRequest.upsert({
    where: { id: 'test-promotion-id' },
    update: { status: 'PENDING' },
    create: {
      id: 'test-promotion-id',
      companyName: 'Test Company',
      contactPerson: 'Contact',
      email: 'test@company.com',
      message: 'Promotion message',
      status: 'PENDING',
    },
  });

  try {
    console.log('\n1. Testing get_all_profiles with Admin user...');
    const profiles = await firstValueFrom(client.send({ cmd: 'get_all_profiles' }, { user: adminUser }));
    console.log('Success! Profiles found:', profiles?.length || 0);
  } catch (error) {
    console.error('Failed get_all_profiles (Admin):', error.message);
  }

  try {
    console.log('\n2. Testing get_all_profiles with Regular user (should fail)...');
    await firstValueFrom(client.send({ cmd: 'get_all_profiles' }, { user: regularUser }));
    console.log('Error: This should have failed but succeeded!');
  } catch (error) {
    console.log('Success! Regular user was blocked:', error.message);
  }

  try {
    console.log('\n3. Testing review_post (POST in Gateway) with Admin user...');
    const result = await firstValueFrom(client.send({ cmd: 'review_post' }, { 
      id: mockPost.id, 
      status: PostStatus.PUBLISHED,
      user: adminUser 
    }));
    console.log('Success! Post approved and published:', result.status);
  } catch (error) {
    console.error('Failed review_post (Admin):', error.message);
  }

  try {
    console.log('\n4. Testing review_post with Regular user (should fail)...');
    await firstValueFrom(client.send({ cmd: 'review_post' }, { 
      id: mockPost.id, 
      status: PostStatus.REJECTED,
      user: regularUser 
    }));
    console.log('Error: This should have failed but succeeded!');
  } catch (error) {
    console.log('Success! Regular user was blocked from reviewing post:', error.message);
  }

  try {
    console.log('\n5. Testing convert_promotion_to_event (POST in Gateway) with Admin user...');
    const result = await firstValueFrom(client.send({ cmd: 'convert_promotion_to_event' }, { 
      id: mockPromotion.id, 
      user: adminUser 
    }));
    console.log('Success! Promotion converted to event draft:', result.id);
  } catch (error) {
    console.error('Failed convert_promotion_to_event (Admin):', error.message);
  }

  // 7. checkin_attendee (POST in Gateway)
  console.log('\n7. Setting up registration for check-in test...');
  const mockRegistration = await prisma.registration.upsert({
    where: { id: 'test-registration-id' },
    update: { isCheckedIn: false },
    create: {
      id: 'test-registration-id',
      eventId: mockPost.id,
      attendeeName: 'Test Attendee',
      attendeeEmail: 'attendee@example.com',
      isCheckedIn: false,
    },
  });

  try {
    console.log('Testing checkin_attendee (POST in Gateway) with Admin user...');
    const result = await firstValueFrom(client.send({ cmd: 'checkin_attendee' }, { 
      id: mockPost.id,
      registrationId: mockRegistration.id,
      user: adminUser 
    }));
    console.log('Success! Attendee checked in:', result.isCheckedIn);
  } catch (error) {
    console.error('Failed checkin_attendee (Admin):', error.message);
  }

  // 8. create_portfolio (POST in Gateway)
  try {
    console.log('\n8. Testing create_portfolio (POST in Gateway) with Admin user...');
    const result = await firstValueFrom(client.send({ cmd: 'create_portfolio' }, { 
      dto: {
        portal: 'professional',
        category: 'Test Category',
        title: 'Test Media',
        mediaType: 'image',
        mediaUrl: 'https://example.com/image.jpg'
      },
      user: adminUser 
    }));
    console.log('Success! Portfolio media created:', result.id);
    // Cleanup portfolio media for repeated tests
    await prisma.portfolioMedia.delete({ where: { id: result.id } });
  } catch (error) {
    console.error('Failed create_portfolio (Admin):', error.message);
  }

  // 9. create_ticket (POST in Gateway)
  try {
    console.log('\n9. Testing create_ticket (POST in Gateway) with Admin user...');
    const result = await firstValueFrom(client.send({ cmd: 'create_ticket' }, { 
      dto: {
        eventId: mockPost.id,
        name: 'VIP Ticket',
        price: 99.99,
        quantity: 10
      },
      user: adminUser 
    }));
    console.log('Success! Ticket tier created:', result.id);
    // Cleanup ticket tier
    await prisma.ticket.delete({ where: { id: result.id } });
  } catch (error) {
    console.error('Failed create_ticket (Admin):', error.message);
  }

  process.exit(0);
}

testAdminEndpoints();
