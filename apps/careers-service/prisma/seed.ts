import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.jobApplication.deleteMany();
  await prisma.job.deleteMany();
  await prisma.venture.deleteMany();
  await prisma.company.deleteMany();

  console.log('Seeding ventures...');
  const ventures = [
    { id: "v1", name: "AlikoHub", slug: "alikohub", description: "The central innovation and operations hub powering all Aliko ventures. We build infrastructure, strategy, and culture.", tagline: "The platform that powers everything", accentColor: "hsl(207, 90%, 42%)", icon: "🏢", sector: "Platform & Operations" },
    { id: "v2", name: "Aliko Academy", slug: "aliko-academy", description: "A next-generation learning platform. We create world-class educational experiences, curriculum, and talent development programs.", tagline: "Learn. Grow. Lead.", accentColor: "hsl(145, 65%, 40%)", icon: "🎓", sector: "Education & Training" },
    { id: "v3", name: "Aliko Events", slug: "aliko-events", description: "Premier event production and management worldwide. From corporate conferences to cultural celebrations.", tagline: "Experiences that move people", accentColor: "hsl(280, 70%, 50%)", icon: "🎪", sector: "Events & Experiences" },
    { id: "v4", name: "Aliko Tech", slug: "aliko-tech", description: "Building software, AI, and digital infrastructure for businesses worldwide.", tagline: "Technology for the next billion", accentColor: "hsl(195, 85%, 42%)", icon: "💻", sector: "Technology" },
    { id: "v5", name: "Aliko Construction", slug: "aliko-construction", description: "Sustainable construction, real estate development, and infrastructure projects globally.", tagline: "Building the future", accentColor: "hsl(30, 80%, 45%)", icon: "🏗️", sector: "Construction & Real Estate" },
    { id: "v6", name: "Aliko WASH", slug: "aliko-wash", description: "Water, Sanitation, and Hygiene solutions for communities. Clean water access and sanitation infrastructure.", tagline: "Clean water. Healthy communities.", accentColor: "hsl(190, 75%, 45%)", icon: "💧", sector: "WASH & Social Impact" },
    { id: "v7", name: "Conshifter Africa", slug: "conshifter-africa", description: "Sustainability consulting and conscious business transformation across the continent.", tagline: "Shift to conscious business", accentColor: "hsl(160, 60%, 40%)", icon: "🌍", sector: "Sustainability Consulting" },
    { id: "v8", name: "Aliko Detailing", slug: "aliko-detailing", description: "Premium automotive detailing, care, and lifestyle services.", tagline: "Precision in every detail", accentColor: "hsl(0, 0%, 20%)", icon: "✨", sector: "Automotive & Lifestyle" },
  ];

  for (const v of ventures) {
    await prisma.venture.create({ data: v });
  }

  console.log('Seeding companies...');
  const companies = [
    { id: "c1", name: "TechBridge Africa", slug: "techbridge-africa", description: "Pan-African technology consultancy connecting global enterprises with African tech talent.", sector: "Technology", size: "201-500", headquarters: "Lagos, Nigeria", website: "https://techbridge.africa", verified: true, logoPlaceholder: "TB" },
    { id: "c2", name: "GreenFields Energy", slug: "greenfields-energy", description: "Renewable energy company focused on solar and wind solutions across Sub-Saharan Africa.", sector: "Energy", size: "51-200", headquarters: "Nairobi, Kenya", website: "https://greenfields.energy", verified: true, logoPlaceholder: "GF" },
    { id: "c3", name: "Savanna Health", slug: "savanna-health", description: "Digital health platform providing telemedicine and health data solutions.", sector: "Healthcare", size: "51-200", headquarters: "Accra, Ghana", website: "https://savannahealth.com", verified: true, logoPlaceholder: "SH" },
    { id: "c4", name: "Atlas Logistics", slug: "atlas-logistics", description: "Supply chain and last-mile delivery solutions across Africa.", sector: "Logistics", size: "501-1000", headquarters: "Johannesburg, South Africa", website: "https://atlaslogistics.co", verified: true, logoPlaceholder: "AL" },
    { id: "c5", name: "Nexus Finance", slug: "nexus-finance", description: "Fintech company offering mobile banking and micro-lending solutions.", sector: "Finance", size: "201-500", headquarters: "Kigali, Rwanda", website: "https://nexusfinance.rw", verified: true, logoPlaceholder: "NF" },
  ];

  for (const c of companies) {
    await prisma.company.create({ data: c });
  }

  console.log('Seeding jobs...');
  const jobs = [
    { id: 1, title: "Chief of Staff", ventureId: "v1", companyId: null, ventureName: "AlikoHub", department: "Executive Office", location: "Lagos, Nigeria", region: "West Africa", workMode: "HYBRID", employmentType: "FULL_TIME", level: "Senior", salaryMin: 120000, salaryMax: 180000, currency: "USD", description: "Partner with the CEO to drive strategic initiatives across all AlikoHub ventures. You'll coordinate cross-venture projects, manage executive communications, and ensure operational excellence.", responsibilities: ["Drive cross-venture strategic initiatives", "Manage board and investor communications", "Lead OKR planning and quarterly reviews", "Coordinate executive team operations"], qualifications: ["8+ years in strategy, consulting, or operations", "MBA or equivalent experience", "Experience in multi-business environments", "Strong analytical and communication skills"], preferredQualifications: ["Africa market experience", "Startup or venture-building background"], benefits: ["Competitive salary + equity", "Health insurance", "Flexible work arrangement", "Professional development budget", "Annual retreat"], tags: ["Leadership", "Strategy", "Executive"], featured: true, urgent: false, category: "Leadership", postedBy: "admin" },
    { id: 2, title: "Senior Product Designer", ventureId: "v1", companyId: null, ventureName: "AlikoHub", department: "Design", location: "Remote", region: "Global", workMode: "REMOTE", employmentType: "FULL_TIME", level: "Senior", salaryMin: 85000, salaryMax: 130000, currency: "USD", description: "Shape the design language across AlikoHub's product suite. Lead design for our internal tools and public-facing platforms.", responsibilities: ["Lead product design for AlikoHub platforms", "Create and maintain design system", "Conduct user research and usability testing", "Mentor junior designers"], qualifications: ["6+ years product design experience", "Strong portfolio in B2B/B2C products", "Proficiency in Figma and prototyping tools", "Experience with design systems"], preferredQualifications: ["Experience in marketplace or multi-product platforms", "Motion design skills"], benefits: ["Remote-first culture", "Home office stipend", "Health insurance", "Learning budget"], tags: ["Design", "Product", "Remote"], featured: true, urgent: false, category: "Design", postedBy: "admin" },
    { id: 4, title: "Full-Stack Engineer", ventureId: "v4", companyId: null, ventureName: "Aliko Tech", department: "Engineering", location: "Lagos, Nigeria", region: "West Africa", workMode: "HYBRID", employmentType: "FULL_TIME", level: "Mid-Senior", salaryMin: 70000, salaryMax: 110000, currency: "USD", description: "Build scalable applications powering Aliko Tech's product suite. Work with React, Node.js, and cloud infrastructure.", responsibilities: ["Build and ship features end-to-end", "Design scalable APIs and data models", "Participate in code reviews and architecture decisions", "Collaborate with product and design teams"], qualifications: ["4+ years full-stack development", "Proficiency in TypeScript, React, Node.js", "Experience with PostgreSQL and cloud services", "Strong problem-solving skills"], preferredQualifications: ["Experience with AI/ML integration", "Open source contributions"], benefits: ["Competitive salary", "Equity options", "Remote flexibility", "Tech conference budget"], tags: ["Engineering", "React", "Node.js", "TypeScript"], featured: true, urgent: true, category: "Engineering", postedBy: "admin" },
  ];

  for (const j of jobs) {
    const { id, ventureId, companyId, ...jobData } = j;
    await prisma.job.create({
      data: {
        ...jobData,
        workMode: j.workMode as any,
        employmentType: j.employmentType as any,
        venture: ventureId ? { connect: { id: ventureId } } : undefined,
        company: companyId ? { connect: { id: companyId } } : undefined,
      }
    });
  }

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
