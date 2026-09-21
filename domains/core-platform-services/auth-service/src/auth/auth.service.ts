import { Injectable, Logger, HttpStatus, Inject } from '@nestjs/common';
import { RpcException, ClientProxy } from '@nestjs/microservices';
import { UserService } from '../user/user.service';
import { FirebaseService } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Argon2Service } from './argon2.service';
import { EmailService } from './email.service';
import { AcademyRole, ContechRole, EventsRole, GlobalRole, CareersRole, ConsultancyRole, ConshifterRole, AlikowashRole } from '../generated/client';
import { RabbitMQService } from '../rabbitmq.service';

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly userService: UserService,
		private readonly firebaseService: FirebaseService,
		private readonly prisma: PrismaService,
		private readonly jwtService: JwtService,
		private readonly argon2Service: Argon2Service,
		private readonly emailService: EmailService,
		@Inject('ACADEMY_SERVICE') private readonly academyClient: ClientProxy,
		@Inject('CONTECH_SERVICE') private readonly contechClient: ClientProxy,
		@Inject('EVENTS_SERVICE') private readonly eventsClient: ClientProxy,
		@Inject('ALIKOWASH_SERVICE') private readonly alikowashClient: ClientProxy,
		@Inject('CONSHIFTER_SERVICE') private readonly conshifterClient: ClientProxy,
		private readonly rabbitMQService: RabbitMQService,
	) {}

	async register(dto: any) {
		this.logger.log(`Registration attempt for email: ${dto.email}`);
		
		// Register user with Firebase Auth (email/password)
		const firebase = this.firebaseService.getAuth();
		let userRecord;
		try {
			userRecord = await firebase.createUser({
				email: dto.email,
				password: dto.password,
				displayName: dto.firstname + (dto.lastname ? ' ' + dto.lastname : ''),
			});
			this.logger.log(`Firebase user created: ${userRecord.uid}`);
		} catch (e: any) {
			this.logger.error(`Firebase createUser error: ${e.code} - ${e.message}`);
			if (e.code === 'auth/email-already-exists') {
				throw new RpcException({
					statusCode: HttpStatus.CONFLICT,
					message: 'User with this email already exists',
					error: 'Conflict',
				});
			}
			throw new RpcException({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: e.message || 'Failed to create user',
				error: 'Internal Server Error',
			});
		}

		// Hash password for DB storage
		const hashedPassword = dto.password ? await this.argon2Service.hash(dto.password) : undefined;

		// Create user in Prisma if not exists
		let user: any = await this.userService.findByFirebaseId(userRecord.uid);
		if (!user) {
			await this.userService.createUser({
				firebaseId: userRecord.uid,
				email: userRecord.email,
				firstname: dto.firstname,
				lastname: dto.lastname,
				password: hashedPassword,
				globalRole: GlobalRole.USER,
				status: 'ACTIVE',
			});

            // Create local AcademyUser record with default USER role
            await this.prisma.academyUser.create({
                data: {
                    userId: userRecord.uid,
                    role: AcademyRole.USER,
                    status: 'ACTIVE',
                }
            });

            // Create local ContechUser record with default USER role
            await this.prisma.contechUser.create({
                data: {
                    userId: userRecord.uid,
                    role: ContechRole.CLIENT,
                    status: 'ACTIVE',
                }
            });

            // Create local EventsUser record with default USER role
            await this.prisma.eventsUser.create({
                data: {
                    userId: userRecord.uid,
                    role: EventsRole.USER,
                    status: 'ACTIVE',
                }
            });

            // Create local ConsultancyUser record with default USER role
            await this.prisma.consultancyUser.create({
                data: {
                    userId: userRecord.uid,
                    role: ConsultancyRole.USER,
                    status: 'ACTIVE',
                }
            });

            // Create local CareersUser record with default USER role
            await this.prisma.careersUser.create({
                data: {
                    userId: userRecord.uid,
                    role: CareersRole.USER,
                    status: 'ACTIVE',
                }
            });

            // Create local ConshifterUser record with default USER role
            await this.prisma.conshifterUser.create({
                data: {
                    userId: userRecord.uid,
                    role: ConshifterRole.USER,
                    status: 'ACTIVE',
                }
            });

            // Create local AlikowashUser record with default USER role
            await this.prisma.alikowashUser.create({
                data: {
                    userId: userRecord.uid,
                    role: AlikowashRole.USER,
                    status: 'ACTIVE',
                }
            });

			user = await this.userService.findByFirebaseId(userRecord.uid);
			this.logger.log(`User created in database: ${user.id}`);
			
			// Broadcast event to all microservices via RabbitMQ
			await this.rabbitMQService.publishToExchange('user_events', {
				pattern: 'user_created',
				data: {
					userId: user.firebaseId,
					email: user.email,
					firstname: user.firstname,
					lastname: user.lastname,
					role: user.globalRole,
				}
			});

			// Also emit via TCP to individual services
			const eventPayload = {
				userId: user.firebaseId,
				email: user.email,
				firstname: user.firstname,
				lastname: user.lastname,
				role: user.globalRole,
			};
			this.academyClient.emit('user_created', eventPayload);
			this.contechClient.emit('user_created', eventPayload);
			this.eventsClient.emit('user_created', eventPayload);
			this.alikowashClient.emit('user_created', eventPayload);
			this.conshifterClient.emit('user_created', eventPayload);
		}

		// Issue Firebase custom token
		const customToken = await firebase.createCustomToken(userRecord.uid);
		
		// Generate JWT tokens
		const tokens = this.generateTokens(user);

		// Send welcome email (async, don't block registration)
		this.emailService.sendWelcomeEmail(dto.email, dto.firstname).catch((error) => {
			this.logger.error(`Failed to send welcome email to ${dto.email}: ${error.message}`);
		});

		this.logger.log(`Registration successful for: ${dto.email}`);
		
		return {
			user: this.toPlain(user),
			...tokens,
			firebaseCustomToken: customToken,
		};
	}

	async createRecruiter(dto: any) {
		this.logger.log(`Admin creating recruiter: ${dto.email}`);
		
		// 1. Check if user already exists in Main DB
		const existingUser = await this.userService.findByEmail(dto.email);
		if (existingUser) {
			throw new RpcException({
				statusCode: HttpStatus.CONFLICT,
				message: 'User with this email already exists in our database. Please use a different email or update the existing user.',
				error: 'Conflict',
			});
		}

		const firebase = this.firebaseService.getAuth();
		let userRecord;

		// 2. Check if user already exists in Firebase
		try {
			userRecord = await firebase.getUserByEmail(dto.email);
			if (userRecord) {
				throw new RpcException({
					statusCode: HttpStatus.CONFLICT,
					message: 'User with this email already exists in Firebase. Please sync the database or use a different email.',
					error: 'Conflict',
				});
			}
		} catch (e: any) {
			// auth/user-not-found is what we expect
			if (e.code !== 'auth/user-not-found') {
				this.logger.error(`Error checking Firebase for email ${dto.email}:`, e);
				throw new RpcException({
					statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
					message: 'Error verifying user existence in external auth service',
					error: 'Internal Server Error',
				});
			}
		}

		// 3. Create Firebase User
		try {
			userRecord = await firebase.createUser({
				email: dto.email,
				password: dto.password,
				displayName: dto.firstname + (dto.lastname ? ' ' + dto.lastname : ''),
			});
			this.logger.log(`Firebase user created for recruiter: ${userRecord.uid}`);
		} catch (e: any) {
			this.logger.error(`Failed to create Firebase user: ${e.message}`, e);
			throw new RpcException({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: e.message || 'Failed to create external user account',
				error: 'Internal Server Error',
			});
		}

		// Hash password for DB storage
		const hashedPassword = dto.password ? await this.argon2Service.hash(dto.password) : undefined;

		// 4. Create user in Main DB - use a transaction to ensure all domain records are created
		try {
			return await this.prisma.$transaction(async (tx) => {
				const newUser = await tx.user.create({
					data: {
						firebaseId: userRecord.uid,
						email: userRecord.email,
						firstname: dto.firstname,
						lastname: dto.lastname,
						password: hashedPassword,
						globalRole: GlobalRole.USER,
						status: 'ACTIVE',
					}
				});

				// Create CareersUser record with RECRUITER role
				await tx.careersUser.create({
					data: {
						userId: userRecord.uid,
						role: CareersRole.RECRUITER,
						status: 'ACTIVE',
					}
				});

				// Create other domain records with default USER role
				await tx.academyUser.create({
					data: { userId: userRecord.uid, role: AcademyRole.USER, status: 'ACTIVE' }
				});
				await tx.contechUser.create({
					data: { userId: userRecord.uid, role: ContechRole.CLIENT, status: 'ACTIVE' }
				});
				await tx.eventsUser.create({
					data: { userId: userRecord.uid, role: EventsRole.USER, status: 'ACTIVE' }
				});
				await tx.consultancyUser.create({
					data: { userId: userRecord.uid, role: ConsultancyRole.USER, status: 'ACTIVE' }
				});
				await tx.conshifterUser.create({
					data: { userId: userRecord.uid, role: ConshifterRole.USER, status: 'ACTIVE' }
				});
				await tx.alikowashUser.create({
					data: { userId: userRecord.uid, role: AlikowashRole.USER, status: 'ACTIVE' }
				});

				this.logger.log(`Recruiter successfully created in database with ID: ${newUser.id}`);
				
				return {
					user: this.toPlain(newUser),
					message: 'Recruiter created successfully',
				};
			});
		} catch (error: any) {
			this.logger.error(`Failed to create recruiter records in database for user ${userRecord.uid}:`, error);
			// Rollback Firebase user creation if DB creation fails to stay in sync
			try {
				await firebase.deleteUser(userRecord.uid);
				this.logger.log(`Cleaned up Firebase user ${userRecord.uid} after DB failure`);
			} catch (cleanupError) {
				this.logger.error(`Failed to cleanup Firebase user ${userRecord.uid}:`, cleanupError);
			}
			
			throw new RpcException({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: 'Failed to initialize recruiter profile. Please try again.',
				error: 'Internal Server Error',
			});
		}
	}

	async createContechUser(dto: any) {
		this.logger.log(`Admin creating ConTech user: ${dto.email} with role ${dto.role}`);
		
		const existingUser = await this.userService.findByEmail(dto.email);
		if (existingUser) {
			throw new RpcException({
				statusCode: HttpStatus.CONFLICT,
				message: 'User with this email already exists',
				error: 'Conflict',
			});
		}

		const firebase = this.firebaseService.getAuth();
		let userRecord;

		try {
			userRecord = await firebase.createUser({
				email: dto.email,
				password: dto.password,
				displayName: dto.firstname + (dto.lastname ? ' ' + dto.lastname : ''),
			});
			this.logger.log(`Firebase user created for ConTech: ${userRecord.uid}`);
		} catch (e: any) {
			this.logger.error(`Failed to create Firebase user: ${e.message}`, e);
			throw new RpcException({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: e.message || 'Failed to create external user account',
				error: 'Internal Server Error',
			});
		}

		const hashedPassword = dto.password ? await this.argon2Service.hash(dto.password) : undefined;

		try {
			return await this.prisma.$transaction(async (tx) => {
				const newUser = await tx.user.create({
					data: {
						firebaseId: userRecord.uid,
						email: userRecord.email,
						firstname: dto.firstname,
						lastname: dto.lastname,
						password: hashedPassword,
						globalRole: GlobalRole.USER,
						status: 'ACTIVE',
					}
				});

				// Create ContechUser record with specified role
				await tx.contechUser.create({
					data: {
						userId: userRecord.uid,
						role: dto.role as ContechRole,
						status: 'ACTIVE',
					}
				});

				// Create other domain records with default roles
				await tx.academyUser.create({
					data: { userId: userRecord.uid, role: AcademyRole.USER, status: 'ACTIVE' }
				});
				await tx.eventsUser.create({
					data: { userId: userRecord.uid, role: EventsRole.USER, status: 'ACTIVE' }
				});
				await tx.consultancyUser.create({
					data: { userId: userRecord.uid, role: ConsultancyRole.USER, status: 'ACTIVE' }
				});
				await tx.conshifterUser.create({
					data: { userId: userRecord.uid, role: ConshifterRole.USER, status: 'ACTIVE' }
				});
				await tx.alikowashUser.create({
					data: { userId: userRecord.uid, role: AlikowashRole.USER, status: 'ACTIVE' }
				});

				this.logger.log(`ConTech user successfully created in database with ID: ${newUser.id}`);
				
				return {
					user: this.toPlain(newUser),
					message: 'ConTech user created successfully',
				};
			});
		} catch (error: any) {
			this.logger.error(`Failed to create ConTech user records in database for user ${userRecord.uid}:`, error);
			try {
				await firebase.deleteUser(userRecord.uid);
			} catch (cleanupError) {}
			throw new RpcException({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: 'Failed to initialize ConTech profile',
				error: 'Internal Server Error',
			});
		}
	}

	async createEventsUser(dto: any) {
		this.logger.log(`Admin creating Events user: ${dto.email} with role ${dto.role}`);
		
		const existingUser = await this.userService.findByEmail(dto.email);
		if (existingUser) {
			throw new RpcException({
				statusCode: HttpStatus.CONFLICT,
				message: 'User with this email already exists',
				error: 'Conflict',
			});
		}

		const firebase = this.firebaseService.getAuth();
		let userRecord;

		try {
			userRecord = await firebase.createUser({
				email: dto.email,
				password: dto.password,
				displayName: dto.firstname + (dto.lastname ? ' ' + dto.lastname : ''),
			});
			this.logger.log(`Firebase user created for Events: ${userRecord.uid}`);
		} catch (e: any) {
			this.logger.error(`Failed to create Firebase user: ${e.message}`, e);
			throw new RpcException({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: e.message || 'Failed to create external user account',
				error: 'Internal Server Error',
			});
		}

		const hashedPassword = dto.password ? await this.argon2Service.hash(dto.password) : undefined;

		try {
			return await this.prisma.$transaction(async (tx) => {
				const newUser = await tx.user.create({
					data: {
						firebaseId: userRecord.uid,
						email: userRecord.email,
						firstname: dto.firstname,
						lastname: dto.lastname,
						password: hashedPassword,
						globalRole: GlobalRole.USER,
						status: 'ACTIVE',
					}
				});

				// Create EventsUser record with specified role
				await tx.eventsUser.create({
					data: {
						userId: userRecord.uid,
						role: dto.role as EventsRole,
						status: 'ACTIVE',
					}
				});

				// Create other domain records with default roles
				await tx.academyUser.create({
					data: { userId: userRecord.uid, role: AcademyRole.USER, status: 'ACTIVE' }
				});
				await tx.contechUser.create({
					data: { userId: userRecord.uid, role: ContechRole.CLIENT, status: 'ACTIVE' }
				});
				await tx.consultancyUser.create({
					data: { userId: userRecord.uid, role: ConsultancyRole.USER, status: 'ACTIVE' }
				});
				await tx.conshifterUser.create({
					data: { userId: userRecord.uid, role: ConshifterRole.USER, status: 'ACTIVE' }
				});
				await tx.alikowashUser.create({
					data: { userId: userRecord.uid, role: AlikowashRole.USER, status: 'ACTIVE' }
				});

				this.logger.log(`Events user successfully created in database with ID: ${newUser.id}`);
				
				return {
					user: this.toPlain(newUser),
					message: 'Events user created successfully',
				};
			});
		} catch (error: any) {
			this.logger.error(`Failed to create Events user records in database for user ${userRecord.uid}:`, error);
			try {
				await firebase.deleteUser(userRecord.uid);
			} catch (cleanupError) {}
			throw new RpcException({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: 'Failed to initialize Events profile',
				error: 'Internal Server Error',
			});
		}
	}

	async login(dto: any) {
		this.logger.log(`Login attempt for email: ${dto.email}`);
		
		// Find user in database with all relations
		const user = await this.userService.findByEmail(dto.email);
		
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: 'Invalid credentials',
				error: 'Unauthorized',
			});
		}

		// Verify password using Argon2
		if (!user.password || !dto.password) {
			this.logger.warn(`Login failed: password missing for user ID ${user.id} (DB password set: ${!!user.password}, DTO password provided: ${!!dto.password})`);
			throw new RpcException({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: 'Invalid credentials',
				error: 'Unauthorized',
			});
		}

		const isPasswordValid = await this.argon2Service.verify(user.password, dto.password);
		if (!isPasswordValid) {
			throw new RpcException({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: 'Invalid credentials',
				error: 'Unauthorized',
			});
		}

		// Register user with Firebase Auth (email/password) - or just get existing
		const firebase = this.firebaseService.getAuth();
		let userRecord;
		try {
			userRecord = await firebase.getUserByEmail(dto.email);
		} catch (e: any) {
			this.logger.error(`Failed to find Firebase user by email: ${dto.email}`, e);
			// If missing in Firebase but in DB, we might want to sync, but for now unauthorized
			throw new RpcException({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: 'Firebase user not found',
				error: 'Unauthorized',
			});
		}

		// Issue Firebase custom token
		const customToken = await firebase.createCustomToken(userRecord.uid);
		
		// Generate JWT tokens
		const tokens = this.generateTokens(user);
		
		this.logger.log(`Login successful for user: ${user.id}`);
		
		return {
			user: this.toPlain(user),
			...tokens,
			firebaseCustomToken: customToken,
		};
	}

	private toPlain(user: any) {
		if (!user) return null;
		const plain = JSON.parse(JSON.stringify(user));
		delete plain.password;

		// Flatten subdomain roles for easier access in guards
		if (user.academyUser) {
			plain.academyRole = user.academyUser.role;
			plain.academyActiveRole = user.academyUser.activeRole || user.academyUser.role;
			plain.academyStatus = user.academyUser.status;
		}

		if (user.contechUser) {
			plain.contechRole = user.contechUser.role;
			plain.contechStatus = user.contechUser.status;
		}

		if (user.eventsUser) {
			plain.eventsRole = user.eventsUser.role;
			plain.eventsStatus = user.eventsUser.status;
		}

		if (user.careersUser) {
			plain.careersRole = user.careersUser.role;
			plain.careersStatus = user.careersUser.status;
		}

		if (user.conshifterUser) {
			plain.conshifterRole = user.conshifterUser.role;
			plain.conshifterStatus = user.conshifterUser.status;
		}

		if (user.alikowashUser) {
			plain.alikowashRole = user.alikowashUser.role;
			plain.alikowashStatus = user.alikowashUser.status;
		}

		return plain;
	}

	private generateTokens(user: any) {
		const payload = {
			uid: user.firebaseId,
			id: user.id,
			email: user.email,
			firstname: user.firstname,
			lastname: user.lastname,
			globalRole: user.globalRole,
			status: user.status,
			// Subdomain roles and statuses
			academyRole: user.academyUser?.role,
			academyActiveRole: user.academyUser?.activeRole || user.academyUser?.role,
			academyStatus: user.academyUser?.status,
			consultancyRole: user.consultancyUser?.role,
			consultancyStatus: user.consultancyUser?.status,
			contechRole: user.contechUser?.role,
			contechStatus: user.contechUser?.status,
			eventsRole: user.eventsUser?.role,
			eventsStatus: user.eventsUser?.status,
			careersRole: user.careersUser?.role,
			careersStatus: user.careersUser?.status,
			conshifterRole: user.conshifterUser?.role,
			conshifterStatus: user.conshifterUser?.status,
			alikowashRole: user.alikowashUser?.role,
			alikowashStatus: user.alikowashUser?.status,
		};

		const accessToken = this.jwtService.sign(payload);
		
		const refreshPayload = {
			uid: user.firebaseId,
			id: user.id,
			type: 'refresh',
		};
		const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: '7d' });

		return { accessToken, refreshToken };
	}

	async loginWithGoogle(idToken: string) {
		this.logger.log('Processing Google login');
		const firebase = this.firebaseService.getAuth();
		let decoded;
		try {
			decoded = await firebase.verifyIdToken(idToken);
		} catch (e: any) {
			this.logger.error(`Google ID token verification failed: ${e.message}`);
			const detail = String(e?.message || '');
			const audienceMismatch = detail.includes('incorrect "aud"')
				? ' Firebase project mismatch: the client ID token and auth-service credentials must be from the same Firebase project.'
				: '';
			throw new RpcException({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: `Invalid or expired Google ID token.${audienceMismatch}`,
				error: 'Unauthorized',
			});
		}

		// Find or create user in Prisma
		let user: any = await this.userService.findByFirebaseId(decoded.uid);
		let isNewUser = false;

		if (!user) {
			isNewUser = true;
			this.logger.log(`New Google user detected, creating account for: ${decoded.email}`);

			// Parse name from Google profile
			const nameParts = (decoded.name || '').split(' ');
			const firstname = nameParts[0] || decoded.email?.split('@')[0] || 'User';
			const lastname = nameParts.slice(1).join(' ') || '';

			try {
				await this.prisma.$transaction(async (tx) => {
					// Create main user record
					await tx.user.create({
						data: {
							firebaseId: decoded.uid,
							email: decoded.email,
							firstname,
							lastname,
							profilePicture: decoded.picture || null,
							globalRole: GlobalRole.USER,
							authProvider: 'GOOGLE',
							status: 'ACTIVE',
						}
					});

					// Create all domain user records atomically
					await tx.academyUser.create({
						data: { userId: decoded.uid, role: AcademyRole.USER, status: 'ACTIVE' }
					});
					await tx.contechUser.create({
						data: { userId: decoded.uid, role: ContechRole.CLIENT, status: 'ACTIVE' }
					});
					await tx.eventsUser.create({
						data: { userId: decoded.uid, role: EventsRole.USER, status: 'ACTIVE' }
					});
					await tx.consultancyUser.create({
						data: { userId: decoded.uid, role: ConsultancyRole.USER, status: 'ACTIVE' }
					});
					await tx.careersUser.create({
						data: { userId: decoded.uid, role: CareersRole.USER, status: 'ACTIVE' }
					});
					await tx.conshifterUser.create({
						data: { userId: decoded.uid, role: ConshifterRole.USER, status: 'ACTIVE' }
					});
					await tx.alikowashUser.create({
						data: { userId: decoded.uid, role: AlikowashRole.USER, status: 'ACTIVE' }
					});
				});

				// Re-fetch to get all relations
				user = await this.userService.findByFirebaseId(decoded.uid);
				this.logger.log(`Google user created in database: ${user.id}`);

				// Broadcast user_created event via RabbitMQ
				await this.rabbitMQService.publishToExchange('user_events', {
					pattern: 'user_created',
					data: {
						userId: user.firebaseId,
						email: user.email,
						firstname: user.firstname,
						lastname: user.lastname,
						role: user.globalRole,
						authProvider: 'GOOGLE',
					}
				});

				// Also emit via TCP to individual services
				const eventPayload = {
					userId: user.firebaseId,
					email: user.email,
					firstname: user.firstname,
					lastname: user.lastname,
					role: user.globalRole,
				};
				this.academyClient.emit('user_created', eventPayload);
				this.contechClient.emit('user_created', eventPayload);
				this.eventsClient.emit('user_created', eventPayload);
				this.alikowashClient.emit('user_created', eventPayload);
				this.conshifterClient.emit('user_created', eventPayload);

				// Send welcome email (async, don't block login)
				this.emailService.sendWelcomeEmail(decoded.email, firstname).catch((error) => {
					this.logger.error(`Failed to send welcome email to ${decoded.email}: ${error.message}`);
				});
			} catch (error: any) {
				this.logger.error(`Failed to create Google user ${decoded.email}: ${error.message}`, error.stack);
				throw new RpcException({
					statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
					message: 'Failed to create user account from Google sign-in',
					error: 'Internal Server Error',
				});
			}
		}

		// Generate JWT tokens
		const tokens = this.generateTokens(user);

		return {
			user: this.toPlain(user),
			...tokens,
			firebaseIdToken: idToken,
			isNewUser,
		};
	}

	async createSessionCookie(idToken: string, expiresIn: number = 60 * 60 * 24 * 5 * 1000) { // 5 days
		const firebase = this.firebaseService.getAuth();
		try {
			const sessionCookie = await firebase.createSessionCookie(idToken, { expiresIn });
			return { sessionCookie, expiresIn };
		} catch (error: any) {
			this.logger.error(`Failed to create session cookie: ${error.message}`);
			throw new RpcException({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: 'Failed to create session cookie',
				error: 'Unauthorized',
			});
		}
	}

	async verifyAuth({ type, value }: { type: 'cookie' | 'token' | 'jwt'; value: string }) {
		let decoded: any;
		try {
			if (type === 'cookie') {
				const firebase = this.firebaseService.getAuth();
				decoded = await firebase.verifySessionCookie(value, true);
			} else if (type === 'token') {
				const firebase = this.firebaseService.getAuth();
				decoded = await firebase.verifyIdToken(value);
			} else if (type === 'jwt') {
				decoded = this.jwtService.verify(value);
			}
		} catch (e) {
			throw new RpcException({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: 'Invalid or expired token/session',
				error: 'Unauthorized',
			});
		}

		const firebaseId = decoded.uid || decoded.sub;
		this.logger.log(`[verifyAuth] Verifying user with firebaseId: ${firebaseId} (type: ${type})`);
		const user = await this.userService.findByFirebaseId(firebaseId);
		
		if (!user) {
			this.logger.warn(`[verifyAuth] User NOT FOUND in database for firebaseId: ${firebaseId}`);
			throw new RpcException({
				statusCode: HttpStatus.UNAUTHORIZED,
				message: 'User not found',
				error: 'Unauthorized',
			});
		}

		this.logger.log(`[verifyAuth] SUCCESS for user: ${user.email} (id: ${user.id})`);
		return { user: this.toPlain(user), decodedToken: decoded };
	}

	// Academy-specific authentication methods
	async selectAcademyRole(userId: string, role: string) {
		const user: any = await this.userService.findByFirebaseId(userId);
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found',
				error: 'Not Found',
			});
		}

		const targetRole = role.toUpperCase();
		if (targetRole === 'ADMIN' || targetRole === 'ACADEMY_ADMIN') {
			throw new RpcException({
				statusCode: HttpStatus.FORBIDDEN,
				message: 'Cannot select ADMIN role via public selection endpoint',
				error: 'Forbidden',
			});
		}

		if (targetRole === 'STUDENT') {
			// Student role is assigned immediately
			await this.userService.updateAcademyRole(user.firebaseId, 'STUDENT', 'ACTIVE');
			
			// Re-fetch user to get the new AcademyUser relation
			const updatedUser: any = await this.userService.findById(user.id);
			
			// Generate NEW JWT tokens with the new role information
			const tokens = this.generateTokens(updatedUser);

			return {
				message: 'Student role assigned successfully',
				role: 'STUDENT',
				status: 'ACTIVE',
				user: this.toPlain(updatedUser),
				...tokens,
			};
		} else if (targetRole === 'TEACHER' || targetRole === 'INSTRUCTOR') {
			// Check if user already has approved instructor role
			if (user.academyUser && user.academyUser.role === 'INSTRUCTOR' && user.academyUser.status === 'ACTIVE') {
				// User already has approved instructor role
				return {
					message: 'Instructor role already assigned',
					role: 'INSTRUCTOR',
					status: 'ACTIVE',
					user: this.toPlain(user),
				};
			}
			
			// Teacher role requires application process
			throw new RpcException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: 'Instructor role requires application. Please submit a teacher application.',
				error: 'Bad Request',
			});
		}
		
		throw new RpcException({
			statusCode: HttpStatus.BAD_REQUEST,
			message: 'Invalid role selected',
			error: 'Bad Request',
		});
	}

	async applyForTeacherRole(applicationDto: any) {
		const user = await this.userService.findByFirebaseId(applicationDto.userId);
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found',
				error: 'Not Found',
			});
		}

		// Create teacher application
		const application = await this.userService.createTeacherApplication({
			userId: user.id.toString(),
			personalDetails: applicationDto.personalDetails,
			teachingCategories: applicationDto.teachingCategories,
			resumeUrl: applicationDto.resumeUrl,
			interviewResponses: applicationDto.interviewResponses,
			documents: applicationDto.documents || [],
			status: 'PENDING',
			submittedAt: new Date()
		});

		return {
			message: 'Teacher application submitted successfully',
			applicationId: application.id,
			status: 'PENDING'
		};
	}

	async getTeacherApplications(requestingUserRole?: string) {
		if (requestingUserRole !== 'ADMIN') {
			throw new RpcException({
				statusCode: HttpStatus.FORBIDDEN,
				message: 'Only admins can view teacher applications',
				error: 'Forbidden',
			});
		}
		return this.userService.getTeacherApplications();
	}

	async getInstructorById(id: string) {
		// id could be firebaseId or numeric email? Actually it should be what we expect from admin dashboard
		// Let's assume id is firebaseId or numeric database ID
		let user = await this.userService.findByFirebaseId(id);
		if (!user) {
			user = await this.userService.findById(id);
		}

		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found',
				error: 'Not Found',
			});
		}

		// Find application if any
		const application = await this.prisma.application.findUnique({
			where: {
				userId_domain: {
					userId: user.firebaseId,
					domain: 'academy'
				}
			}
		});

		return {
			user: this.toPlain(user),
			application,
			academyStatus: user.academyUser,
		};
	}

	async approveTeacherApplication(applicationId: string, requestingUserRole?: string, reviewerId?: string, reviewNotes?: string) {
		if (requestingUserRole !== 'ADMIN') {
			throw new RpcException({
				statusCode: HttpStatus.FORBIDDEN,
				message: 'Only admins can approve teacher applications',
				error: 'Forbidden',
			});
		}

		if (!reviewNotes) {
			throw new RpcException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: 'Review notes are required for approval',
				error: 'Bad Request',
			});
		}

		const application = await this.userService.getTeacherApplication(applicationId);
		if (!application) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'Application not found',
				error: 'Not Found',
			});
		}

		if (application.status !== 'PENDING') {
			throw new RpcException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: `Application is already ${application.status}`,
				error: 'Bad Request',
			});
		}

		const userId = application.userId;

		// Update application status with reviewer info
		try {
			await this.userService.updateTeacherApplicationStatus(applicationId, 'APPROVED', reviewerId, reviewNotes);
		} catch (error: any) {
			this.logger.error(`Failed to approve teacher application: ${error.message}`);
			throw new RpcException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: error.message || 'Failed to update application status',
				error: 'Bad Request',
			});
		}

		// Assign instructor role to user
		await this.userService.updateAcademyRole(userId, 'INSTRUCTOR', 'ACTIVE');

		return {
			message: 'Teacher application approved and instructor role assigned',
			userId: userId,
			role: 'INSTRUCTOR',
			status: 'ACTIVE'
		};
	}

	async rejectTeacherApplication(applicationId: string, requestingUserRole?: string, reviewerId?: string, reviewNotes?: string) {
		if (requestingUserRole !== 'ADMIN') {
			throw new RpcException({
				statusCode: HttpStatus.FORBIDDEN,
				message: 'Only admins can reject teacher applications',
				error: 'Forbidden',
			});
		}

		if (!reviewNotes) {
			throw new RpcException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: 'Review notes are required for rejection',
				error: 'Bad Request',
			});
		}

		const application = await this.userService.getTeacherApplication(applicationId);
		if (!application) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'Application not found',
				error: 'Not Found',
			});
		}

		if (application.status !== 'PENDING') {
			throw new RpcException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: `Application is already ${application.status}`,
				error: 'Bad Request',
			});
		}

		// Update application status with reviewer info
		try {
			await this.userService.updateTeacherApplicationStatus(applicationId, 'REJECTED', reviewerId, reviewNotes);
		} catch (error: any) {
			this.logger.error(`Failed to reject teacher application: ${error.message}`);
			throw new RpcException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: error.message || 'Failed to update application status',
				error: 'Bad Request',
			});
		}

		return {
			message: 'Teacher application rejected',
			applicationId: applicationId,
			status: 'REJECTED'
		};
	}

	async switchRole(userId: string, newRole: string) {
		const user: any = await this.userService.findByFirebaseId(userId);
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found',
				error: 'Not Found',
			});
		}

		// Role hierarchy definition
		const ROLE_HIERARCHY: { [key: string]: number } = {
			'ADMIN': 4,
			'ACADEMY_ADMIN': 4,
			'COURSE_MANAGER': 3,
			'INSTRUCTOR': 2,
			'TEACHER': 2,
			'STUDENT': 1,
			'USER': 0
		};

		const targetRole = newRole.toUpperCase();

		// Prevent switching to ADMIN roles unless you are ALREADY a global ADMIN
		if ((targetRole === 'ADMIN' || targetRole === 'ACADEMY_ADMIN') && user.globalRole !== 'ADMIN') {
			throw new RpcException({
				statusCode: HttpStatus.FORBIDDEN,
				message: 'Only global administrators can switch to ADMIN roles',
				error: 'Forbidden',
			});
		}
		const userRole = user.academyUser?.role?.toUpperCase();
		
		if (!user.academyUser) {
			throw new RpcException({
				statusCode: HttpStatus.FORBIDDEN,
				message: `User is not enrolled in Academy`,
				error: 'Forbidden',
			});
		}

		const userRoleLevel = ROLE_HIERARCHY[userRole] || 0;
		const targetRoleLevel = ROLE_HIERARCHY[targetRole];

		if (targetRoleLevel === undefined) {
             throw new RpcException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: `Invalid role: ${newRole}`,
				error: 'Bad Request',
			});
        }

		if (userRoleLevel < targetRoleLevel) {
			throw new RpcException({
				statusCode: HttpStatus.FORBIDDEN,
				message: `User does not have permission to switch to ${newRole} role. Current role: ${userRole}`,
				error: 'Forbidden',
			});
		}

		// Update active role
		await this.userService.updateActiveAcademyRole(user.firebaseId, newRole.toUpperCase());

		// Re-fetch user to get the updated information
		const updatedUser: any = await this.userService.findById(user.id);

		// Generate NEW JWT tokens with the new role information
		const tokens = this.generateTokens(updatedUser);

		return {
			message: 'Role switched successfully',
			activeRole: newRole.toUpperCase(),
			user: this.toPlain(updatedUser),
			...tokens,
		};
	}

	async getUserAcademyStatus(userId: string) {
		const user = await this.userService.findById(userId);
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found',
				error: 'Not Found',
			});
		}

		const hasAcademyRole = !!user.academyUser;
		const currentRole = user.academyUser?.role;
		const hasTeacherApplication = await this.userService.hasPendingTeacherApplication(user.id.toString());

		return {
			hasAcademyRole,
			currentRole,
			status: user.academyUser?.status,
			hasTeacherApplication,
			canAccessDashboard: hasAcademyRole && user.academyUser?.status === 'ACTIVE',
			canEnrollCourses: currentRole === 'STUDENT' && user.academyUser?.status === 'ACTIVE',
			canCreateCourses: currentRole === 'INSTRUCTOR' && user.academyUser?.status === 'ACTIVE'
		};
	}

	/**
	 * Resolve the frontend base URL used in the reset email link.
	 * Login verifies the local Argon2 hash — so the link must land on OUR
	 * reset page (not Firebase's hosted page), which calls /reset-password
	 * and updates both Firebase + local DB.
	 */
	private resolvePasswordResetFrontendUrl(input?: {
		frontendUrl?: string;
		app?: string;
	}): string {
		const allowed = [
			process.env.ACADEMY_FRONTEND_URL,
			process.env.EVENTS_FRONTEND_URL,
			process.env.FRONTEND_URL,
			'https://lms.alikohub.com',
			'https://www.lms.alikohub.com',
			'https://academy.alikohub.com',
			'https://events.alikohub.com',
			'http://localhost:5173',
			'http://localhost:3000',
			'http://127.0.0.1:5173',
		].filter(Boolean) as string[];

		const byApp: Record<string, string | undefined> = {
			academy: process.env.ACADEMY_FRONTEND_URL || 'https://lms.alikohub.com',
			events: process.env.EVENTS_FRONTEND_URL || 'https://events.alikohub.com',
		};

		if (input?.frontendUrl) {
			try {
				const parsed = new URL(input.frontendUrl);
				const normalized = `${parsed.protocol}//${parsed.host}`;
				const ok = allowed.some((a) => {
					try {
						const allowedUrl = new URL(a);
						return (
							allowedUrl.protocol === parsed.protocol &&
							allowedUrl.host === parsed.host
						);
					} catch {
						return false;
					}
				});
				if (ok) return normalized.replace(/\/$/, '');
				this.logger.warn(
					`Rejected frontendUrl for password reset: ${input.frontendUrl}`,
				);
			} catch {
				this.logger.warn(`Invalid frontendUrl for password reset: ${input.frontendUrl}`);
			}
		}

		if (input?.app && byApp[input.app.toLowerCase()]) {
			return byApp[input.app.toLowerCase()]!.replace(/\/$/, '');
		}

		return (
			process.env.FRONTEND_URL ||
			process.env.ACADEMY_FRONTEND_URL ||
			'https://lms.alikohub.com'
		).replace(/\/$/, '');
	}

	async forgotPassword(
		email: string,
		options?: { frontendUrl?: string; app?: string },
	) {
		this.logger.log(`Password reset request for email: ${email}`);
		const user = await this.userService.findByEmail(email);
		if (!user) {
			// Don't reveal if user exists for security
			return { message: 'If an account exists with this email, a reset link has been sent.' };
		}

		try {
			const frontendUrl = this.resolvePasswordResetFrontendUrl(options);
			// Signed token — NOT Firebase oobCode. Login uses local Argon2, so
			// Firebase-hosted reset alone leaves the DB password stale.
			const token = await this.jwtService.signAsync(
				{
					email: user.email,
					firebaseId: user.firebaseId,
					purpose: 'password-reset',
				},
				{ expiresIn: '1h' },
			);
			const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;

			await this.emailService.sendPasswordResetEmail(
				email,
				user.firstname,
				resetLink,
			);
			this.logger.log(`Password reset email sent for ${email} (frontend: ${frontendUrl})`);

			return { message: 'If an account exists with this email, a reset link has been sent.' };
		} catch (error: any) {
			this.logger.error(`Failed to generate password reset link for ${email}: ${error.message}`);
			throw new RpcException({
				statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
				message: 'Failed to process password reset request',
				error: 'Internal Server Error',
			});
		}
	}

	async resetPassword(payload: {
		email?: string;
		newPassword: string;
		token?: string;
	}) {
		this.logger.log(
			`Processing password reset for: ${payload.email || '(from token)'}`,
		);
		try {
			if (!payload.token) {
				throw new RpcException({
					statusCode: HttpStatus.BAD_REQUEST,
					message: 'Reset token is required. Use the link from your email.',
					error: 'Bad Request',
				});
			}

			let tokenPayload: {
				email?: string;
				firebaseId?: string;
				purpose?: string;
			};
			try {
				tokenPayload = await this.jwtService.verifyAsync(payload.token);
			} catch {
				throw new RpcException({
					statusCode: HttpStatus.BAD_REQUEST,
					message: 'Invalid or expired reset token. Please request a new link.',
					error: 'Bad Request',
				});
			}

			if (tokenPayload.purpose !== 'password-reset' || !tokenPayload.email) {
				throw new RpcException({
					statusCode: HttpStatus.BAD_REQUEST,
					message: 'Invalid reset token.',
					error: 'Bad Request',
				});
			}

			if (
				payload.email &&
				payload.email.toLowerCase() !== tokenPayload.email.toLowerCase()
			) {
				throw new RpcException({
					statusCode: HttpStatus.BAD_REQUEST,
					message: 'Email does not match the reset token.',
					error: 'Bad Request',
				});
			}

			const user = await this.userService.findByEmail(tokenPayload.email);
			if (!user) {
				throw new RpcException({
					statusCode: HttpStatus.NOT_FOUND,
					message: 'User not found',
					error: 'Not Found',
				});
			}

			// Update password in Firebase using Admin SDK
			const firebase = this.firebaseService.getAuth();
			await firebase.updateUser(user.firebaseId, {
				password: payload.newPassword,
			});

			// Sync with local DB (required — login verifies Argon2, not Firebase)
			const hashedPassword = await this.argon2Service.hash(payload.newPassword);
			await this.userService.updateProfile(user.firebaseId, {
				password: hashedPassword,
			});

			return { message: 'Password reset successfully' };
		} catch (error: any) {
			this.logger.error(`Password reset failed: ${error.message}`);
			if (error instanceof RpcException) throw error;
			throw new RpcException({
				statusCode: HttpStatus.BAD_REQUEST,
				message: error.message || 'Failed to reset password',
				error: 'Bad Request',
			});
		}
	}

	async logout(userId: string) {
		return {
			message: 'Logged out successfully'
		};
	}

	async syncContechUser(userId: string) {
		const user = await this.userService.findByFirebaseId(userId);
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found in Auth Service',
				error: 'Not Found',
			});
		}

		let contechUser = await this.prisma.contechUser.findUnique({
			where: { userId: user.firebaseId },
		});

		const isAdmin = user.globalRole === GlobalRole.ADMIN;
		const targetRole = isAdmin ? ContechRole.ADMIN : (contechUser?.role || ContechRole.CLIENT);

		if (!contechUser) {
			contechUser = await this.prisma.contechUser.create({
				data: {
					userId: user.firebaseId,
					role: targetRole,
					status: 'ACTIVE',
				}
			});
			this.logger.log(`Created ContechUser record for user: ${user.firebaseId} with role: ${targetRole}`);
		} else if (isAdmin && contechUser.role !== ContechRole.ADMIN) {
			contechUser = await this.prisma.contechUser.update({
				where: { userId: user.firebaseId },
				data: { role: ContechRole.ADMIN }
			});
			this.logger.log(`Automatically promoted ConTech user ${user.firebaseId} to ADMIN because of global role`);
		}

		return contechUser;
	}

	async syncEventsUser(userId: string) {
		const user = await this.userService.findByFirebaseId(userId);
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found in Auth Service',
				error: 'Not Found',
			});
		}

		let eventsUser = await this.prisma.eventsUser.findUnique({
			where: { userId: user.firebaseId },
		});

		const isAdmin = user.globalRole === GlobalRole.ADMIN;
		const targetRole = isAdmin ? EventsRole.ADMIN : (eventsUser?.role || EventsRole.USER);

		if (!eventsUser) {
			eventsUser = await this.prisma.eventsUser.create({
				data: {
					userId: user.firebaseId,
					role: targetRole,
					status: 'ACTIVE',
				}
			});
			this.logger.log(`Created EventsUser record for user: ${user.firebaseId} with role: ${targetRole}`);
		} else if (isAdmin && eventsUser.role !== EventsRole.ADMIN) {
			eventsUser = await this.prisma.eventsUser.update({
				where: { userId: user.firebaseId },
				data: { role: EventsRole.ADMIN }
			});
			this.logger.log(`Automatically promoted Events user ${user.firebaseId} to ADMIN because of global role`);
		}

		return eventsUser;
	}

	async syncCareersUser(userId: string) {
		const user = await this.userService.findByFirebaseId(userId);
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found in Auth Service',
				error: 'Not Found',
			});
		}

		let careersUser = await this.prisma.careersUser.findUnique({
			where: { userId: user.firebaseId },
		});

		const isAdmin = user.globalRole === GlobalRole.ADMIN;
		const targetRole = isAdmin ? CareersRole.ADMIN : (careersUser?.role || CareersRole.USER);

		if (!careersUser) {
			careersUser = await this.prisma.careersUser.create({
				data: {
					userId: user.firebaseId,
					role: targetRole,
					status: 'ACTIVE',
				}
			});
			this.logger.log(`Created CareersUser record for user: ${user.firebaseId} with role: ${targetRole}`);
		} else if (isAdmin && careersUser.role !== CareersRole.ADMIN) {
			careersUser = await this.prisma.careersUser.update({
				where: { userId: user.firebaseId },
				data: { role: CareersRole.ADMIN }
			});
			this.logger.log(`Automatically promoted Careers user ${user.firebaseId} to ADMIN because of global role`);
		}

		return careersUser;
	}

	async syncAcademyUser(userId: string) {
		const user = await this.userService.findByFirebaseId(userId);
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found in Auth Service',
				error: 'Not Found',
			});
		}

		let academyUser = await this.prisma.academyUser.findUnique({
			where: { userId: user.firebaseId },
		});

		const isAdmin = user.globalRole === GlobalRole.ADMIN;
		const targetRole = isAdmin ? AcademyRole.ADMIN : (academyUser?.role || AcademyRole.USER);

		if (!academyUser) {
			academyUser = await this.prisma.academyUser.create({
				data: {
					userId: user.firebaseId,
					role: targetRole,
					status: 'ACTIVE',
				}
			});
			this.logger.log(`Created AcademyUser record for user: ${user.firebaseId} with role: ${targetRole}`);
		} else if (isAdmin && academyUser.role !== AcademyRole.ADMIN) {
			academyUser = await this.prisma.academyUser.update({
				where: { userId: user.firebaseId },
				data: { role: AcademyRole.ADMIN }
			});
			this.logger.log(`Automatically promoted Academy user ${user.firebaseId} to ADMIN because of global role`);
		}

		return {
			...academyUser,
			globalRole: user.globalRole,
		};
	}

	async syncConshifterUser(userId: string) {
		const user = await this.userService.findByFirebaseId(userId);
		if (!user) {
			throw new RpcException({
				statusCode: HttpStatus.NOT_FOUND,
				message: 'User not found in Auth Service',
				error: 'Not Found',
			});
		}

		let conshifterUser = await this.prisma.conshifterUser.findUnique({
			where: { userId: user.firebaseId },
		});

		const isAdmin = user.globalRole === GlobalRole.ADMIN;
		const targetRole = isAdmin ? ConshifterRole.ADMIN : (conshifterUser?.role || ConshifterRole.USER);

		if (!conshifterUser) {
			conshifterUser = await this.prisma.conshifterUser.create({
				data: {
					userId: user.firebaseId,
					role: targetRole,
					status: 'ACTIVE',
				}
			});
			this.logger.log(`Created ConshifterUser record for user: ${user.firebaseId} with role: ${targetRole}`);
		} else if (isAdmin && conshifterUser.role !== ConshifterRole.ADMIN) {
			conshifterUser = await this.prisma.conshifterUser.update({
				where: { userId: user.firebaseId },
				data: { role: ConshifterRole.ADMIN }
			});
			this.logger.log(`Automatically promoted Conshifter user ${user.firebaseId} to ADMIN because of global role`);
		}

		return {
			userId: user.firebaseId,
			role: conshifterUser.role,
			status: conshifterUser.status,
		};
	}

	async sendContactEmail(dto: any) {
		return this.emailService.sendContactEmail(dto);
	}

	async updateContechRole(userId: string, role: string) {
		this.logger.log(`Updating ConTech role for user ${userId} to ${role}`);
		const user = await this.userService.updateContechRole(userId, role);
		return { message: 'ConTech role updated successfully', user: this.toPlain(user) };
	}

  async updateCareersRole(userId: string, role: string) {
    this.logger.log(`Updating Careers role for user ${userId} to ${role}`);
    const user = await this.userService.updateCareersRole(userId, role);
    return { message: 'Careers role updated successfully', user: this.toPlain(user) };
  }

	async updateStatus(firebaseId: string, status: string) {
		const user = await this.userService.updateStatus(firebaseId, status);
		return { message: 'User status updated successfully', user: this.toPlain(user) };
	}

	async deleteUser(firebaseId: string) {
		// 1. Delete from Firebase
		const firebase = this.firebaseService.getAuth();
		try {
			await firebase.deleteUser(firebaseId);
			this.logger.log(`Firebase user deleted: ${firebaseId}`);
		} catch (e: any) {
			this.logger.error(`Firebase deleteUser error for ${firebaseId}: ${e.message}`);
			// Continue even if firebase delete fails (maybe already deleted)
		}

		// 2. Delete from Prisma (Cascading will handle relations)
		await this.userService.deleteProfile(firebaseId);
		this.logger.log(`User deleted from database: ${firebaseId}`);

		return { message: 'User deleted successfully' };
	}
}
