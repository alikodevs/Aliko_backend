import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UserData {
	email: string;
	firebaseId: string;
	firstname: string;
	lastname: string;
	globalRole?: string;
	status?: string;
	profilePicture?: string;
	resumeUrl?: string;
	bio?: string;
	phone?: string;
	location?: string;
	linkedInUrl?: string;
	portfolioUrl?: string;
	yearsOfExperience?: number;
	skills?: string[];
	password?: string;
}

export interface ApplicationData {
	userId: string;
	domain?: string;
	requestedRole?: string;
	formData?: object;
	resumeUrl?: string;
	personalDetails?: any;
	teachingCategories?: string[];
	interviewResponses?: any;
	documents?: any[];
	status?: string;
	submittedAt?: Date;
}

@Injectable()
export class UserService {
	private readonly logger = new Logger(UserService.name);

	constructor(private readonly prisma: PrismaService) {}

	async findByFirebaseId(firebaseId: string) {
		this.logger.log(`Finding user by Firebase ID: ${firebaseId}`);
		const user = await this.prisma.user.findUnique({ 
			where: { firebaseId },
			include: {
				academyUser: true,
				consultancyUser: true,
				contechUser: true,
				eventsUser: true,
				careersUser: true,
				conshifterUser: true,
			}
		});
		this.logger.log(`User ${user ? 'found' : 'not found'} for Firebase ID: ${firebaseId}`);
		return user;
	}

	async findByEmail(email: string) {
		this.logger.log(`Finding user by email: ${email}`);
		const user = await this.prisma.user.findUnique({ 
			where: { email },
			include: {
				academyUser: true,
				consultancyUser: true,
				contechUser: true,
				eventsUser: true,
				careersUser: true,
				conshifterUser: true,
			}
		});
		this.logger.log(`User ${user ? 'found' : 'not found'} for email: ${email}`);
		return user;
	}

	async findById(userId: string | number) {
		const id = typeof userId === 'string' ? parseInt(userId) : userId;
		this.logger.log(`Finding user by ID: ${id}`);
		const user = await this.prisma.user.findUnique({ 
			where: { id },
			include: {
				academyUser: true,
				consultancyUser: true,
				contechUser: true,
				eventsUser: true,
				careersUser: true,
				conshifterUser: true,
			}
		});
		this.logger.log(`User ${user ? 'found' : 'not found'} for ID: ${id}`);
		return user;
	}

	async createUser(data: UserData) {
		this.logger.log(`Creating user with email: ${data.email}`);
		try {
			const user = await this.prisma.user.create({ data: data as any });
			this.logger.log(`Successfully created user with ID: ${user.id}`);
			return user;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			this.logger.error(`Failed to create user with email: ${data.email}`, errorMessage);
			throw error;
		}
	}

	async createOrUpdateUser(data: UserData) {
		this.logger.log(`Upserting user with email: ${data.email}`);
		const user = await this.prisma.user.upsert({
			where: { email: data.email },
			update: data as any,
			create: data as any,
		});
		this.logger.log(`Successfully upserted user with ID: ${user.id}`);
		return user;
	}

	// Academy-specific methods
	async updateAcademyRole(firebaseId: string, role: string, status: string) {
		return this.prisma.academyUser.upsert({
			where: { userId: firebaseId },
			update: { role: role as any, status },
			create: { userId: firebaseId, role: role as any, status },
		});
	}

	async updateActiveAcademyRole(firebaseId: string, activeRole: string) {
		return this.prisma.academyUser.update({
			where: { userId: firebaseId },
			data: { 
				activeRole: activeRole as any
			},
		});
	}

	async createTeacherApplication(applicationData: ApplicationData & { resumeUrl?: string }) {
		const { userId, ...formData } = applicationData;
		
		// Validate resumeUrl if present
		if (applicationData.resumeUrl) {
			try {
				const url = new URL(applicationData.resumeUrl);
				if (!['http:', 'https:'].includes(url.protocol)) {
					throw new Error('Invalid protocol');
				}
			} catch (e) {
				throw new Error('Invalid resume URL provided. Must be a valid HTTP/HTTPS URL.');
			}
		}

		// Find user's firebaseId since application model uses it as a relation
		const user = await this.prisma.user.findUnique({
			where: { id: parseInt(userId) }
		});

		if (!user) throw new Error('User not found');

		return this.prisma.application.upsert({
			where: {
				userId_domain: {
					userId: user.firebaseId,
					domain: 'academy'
				}
			},
			update: {
				requestedRole: 'INSTRUCTOR',
				formData: formData as any,
				status: 'PENDING',
				updatedAt: new Date()
			},
			create: {
				userId: user.firebaseId,
				domain: 'academy',
				requestedRole: 'INSTRUCTOR',
				formData: formData as any,
				status: 'PENDING'
			}
		});
	}

	async getTeacherApplications() {
		return this.prisma.application.findMany({
			where: {
				domain: 'academy',
				requestedRole: 'INSTRUCTOR'
			},
			include: {
				user: {
					select: {
						id: true,
						firebaseId: true, // Needed for role assignment but not sensitive like hash
						firstname: true,
						lastname: true,
						email: true,
						profilePicture: true,
						createdAt: true,
						status: true
					}
				}
			}
		});
	}

	async getTeacherApplication(applicationId: string) {
		if (applicationId.startsWith('mock-id')) return null;
		
		return this.prisma.application.findUnique({
			where: { id: parseInt(applicationId) },
			include: { 
				user: {
					select: {
						id: true,
						firebaseId: true,
						firstname: true,
						lastname: true,
						email: true,
						profilePicture: true,
						createdAt: true,
						status: true
					}
				}
			}
		});
	}

	async updateTeacherApplicationStatus(applicationId: string, status: string, reviewedBy?: string, reviewNotes?: string) {
		if (applicationId.startsWith('mock-id')) return { id: applicationId, status };

		// Enforce review details for final states
		if ((status === 'APPROVED' || status === 'REJECTED') && !reviewedBy) {
			throw new Error('ReviewedBy is required when approving or rejecting an application');
		}

		if (status === 'REJECTED' && !reviewNotes) {
			throw new Error('Review notes are required when rejecting an application');
		}

		if (status === 'APPROVED') {
			const app = await this.prisma.application.findUnique({ where: { id: parseInt(applicationId) } });
			const formData = app?.formData as Record<string, any>;
			
			if (!formData?.resumeUrl) throw new Error('Cannot approve application without a resume');
		}

		return this.prisma.application.update({
			where: { id: parseInt(applicationId) },
			data: { 
				status: status as any,
				reviewedBy,
				reviewNotes,
				updatedAt: new Date()
			}
		});
	}

	async hasPendingTeacherApplication(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });

        if (!user) return false;

		const application = await this.prisma.application.findFirst({
			where: {
				userId: user.firebaseId,
				domain: 'academy',
				status: 'PENDING'
			}
		});
		return !!application;
	}

	// General User Methods
	async findAll() {
		this.logger.log('Finding all users');
		return this.prisma.user.findMany({
			include: {
				academyUser: true,
				consultancyUser: true,
				contechUser: true,
				eventsUser: true,
				careersUser: true,
				conshifterUser: true,
			}
		});
	}

	async updateProfile(firebaseId: string, data: Partial<UserData>) {
		this.logger.log(`Updating profile for user: ${firebaseId}`);
		const user = await this.prisma.user.update({
			where: { firebaseId },
			data: {
				firstname: data.firstname,
				lastname: data.lastname,
				password: data.password,
				profilePicture: data.profilePicture,
				bio: data.bio,
				phone: data.phone,
				location: data.location,
				linkedInUrl: data.linkedInUrl,
				portfolioUrl: data.portfolioUrl,
				yearsOfExperience: data.yearsOfExperience,
				skills: data.skills,
				careersUser: data.resumeUrl ? {
					upsert: {
						create: {
							resumeUrl: data.resumeUrl,
							role: 'USER',
						},
						update: {
							resumeUrl: data.resumeUrl,
						}
					}
				} : undefined
			}
		});

		if (data.profilePicture) {
			try {
				new URL(data.profilePicture);
			} catch (e) {
				// Log warning but allow update for now, or throw error -> deciding to just log for existing flexibility
				this.logger.warn(`Invalid profile picture URL for user ${firebaseId}: ${data.profilePicture}`);
			}
		}

		return user;
	}

	async deleteProfile(firebaseId: string) {
		this.logger.log(`Deleting profile for user: ${firebaseId}`);
		return this.prisma.user.delete({
			where: { firebaseId }
		});
	}

	async updateContechRole(userId: string, role: string) {
		this.logger.log(`Updating ConTech role for user ${userId} to ${role}`);
		
		// Update the contechUser relation in the Auth service database
		const user = await this.prisma.user.update({
			where: { firebaseId: userId },
			data: {
				contechUser: {
					upsert: {
						create: {
							role: role as any,
							status: 'ACTIVE'
						},
						update: {
							role: role as any
						}
					}
				}
			},
			include: {
				academyUser: true,
				consultancyUser: true,
				contechUser: true,
				eventsUser: true,
				careersUser: true,
				conshifterUser: true,
			}
		});

		this.logger.log(`ConTech role updated successfully for user ${userId}`);
		return user;
	}

	async updateUserGlobalRole(firebaseId: string, role: string) {
		this.logger.log(`Updating global role for user ${firebaseId} to ${role}`);
		return this.prisma.user.update({
			where: { firebaseId },
			data: { globalRole: role as any },
		});
	}

  async updateCareersRole(userId: string, role: string) {
    this.logger.log(`Updating Careers role for user ${userId} to ${role}`);
    const user = await this.prisma.user.update({
      where: { firebaseId: userId },
      data: {
        careersUser: {
          upsert: {
            create: {
              role: role as any,
              status: 'ACTIVE'
            },
            update: {
              role: role as any
            }
          }
        }
      },
      include: {
        academyUser: true,
        consultancyUser: true,
        contechUser: true,
        eventsUser: true,
        careersUser: true,
        conshifterUser: true,
      }
    });
    this.logger.log(`Careers role updated successfully for user ${userId}`);
    return user;
  }

	async updateStatus(firebaseId: string, status: string) {
		this.logger.log(`Updating status for user ${firebaseId} to ${status}`);
		return this.prisma.user.update({
			where: { firebaseId },
			data: { status: status as any },
		});
	}
}
