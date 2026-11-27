/**
 * CA-20: Seed the 22 Washington State (WABON) Nursing Assistant Core Skills
 * and remove any temporary/test CoreSkill rows not in the official 22-skill list.
 *
 * Usage:
 *   npx ts-node --transpile-only -r dotenv/config -r tsconfig-paths/register scripts/seed_core_skills.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client/academy';

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUrl =
  process.env.DATABASE_URL_ACADEMY ||
  (process.env.ACADEMY_DATABASE_URL ? process.env.ACADEMY_DATABASE_URL.replace('@postgres:', '@127.0.0.1:') : undefined) ||
  process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

const WABON_22_CORE_SKILLS = [
  {
    skillNumber: 'SKILL-01',
    name: 'Handwashing',
    category: 'Infection Control',
    steps: [
      'Wet hands and wrists thoroughly with warm running water',
      'Apply soap and lather all surfaces including wrists, palms, backs of hands, fingers, and under nails for at least 20 seconds',
      'Rinse hands thoroughly with fingers pointed downward',
      'Dry hands with clean paper towel and use paper towel to turn off faucet',
    ],
  },
  {
    skillNumber: 'SKILL-02',
    name: 'Applies One Knee-High Elastic Stocking',
    category: 'Personal Care',
    steps: [
      'Position client supine with leg flat and expose one leg while maintaining privacy',
      'Turn stocking inside out to heel, slip over foot, and pull smoothly up leg to below knee',
      'Verify heel is properly positioned and no wrinkles or twists remain',
      'Check toes for warmth and circulation and place call light within reach',
    ],
  },
  {
    skillNumber: 'SKILL-03',
    name: 'Assists to Ambulate Using Transfer Belt',
    category: 'Mobility & Transfers',
    steps: [
      'Lock bed/wheelchair brakes and apply non-skid footwear',
      'Apply transfer (gait) belt snugly over clothing around waist',
      'Assist client to stand using proper body mechanics',
      'Walk slightly behind and to the weaker side while holding transfer belt',
    ],
  },
  {
    skillNumber: 'SKILL-04',
    name: 'Assist with Use of Bedpan',
    category: 'Elimination & Output',
    steps: [
      'Don gloves, place protective pad, and position bedpan properly under client',
      'Raise head of bed for comfort, provide toilet tissue and call light, step out for privacy',
      'Lower head of bed, remove bedpan carefully, and assist with perineal and hand hygiene',
      'Empty, rinse, and store bedpan; remove gloves and perform handwashing',
    ],
  },
  {
    skillNumber: 'SKILL-05',
    name: 'Cleans Upper and Lower Denture',
    category: 'Personal Care',
    steps: [
      'Don gloves and line sink with paper towel/washcloth and fill partially with cool/tepid water',
      'Brush all surfaces of upper and lower dentures with denture brush/toothpaste',
      'Rinse dentures thoroughly under cool/tepid running water and place in labeled denture cup',
      'Remove gloves, discard liner, and perform handwashing',
    ],
  },
  {
    skillNumber: 'SKILL-06',
    name: 'Counts and Records Radial Pulse',
    category: 'Vital Signs',
    steps: [
      'Perform handwashing and identify client',
      'Locate radial artery on thumb side of wrist using fingertips',
      'Count beats for 60 full seconds (noting rhythm and strength)',
      'Record rate accurately within +/- 4 bpm of evaluator',
    ],
  },
  {
    skillNumber: 'SKILL-07',
    name: 'Counts and Records Respirations',
    category: 'Vital Signs',
    steps: [
      'Count respirations unobtrusively immediately after radial pulse',
      'Observe one full rise and fall of chest as one respiration for 60 full seconds',
      'Record rate accurately within +/- 2 breaths per minute of evaluator',
    ],
  },
  {
    skillNumber: 'SKILL-08',
    name: 'Donning and Removing PPE',
    category: 'Infection Control',
    steps: [
      'Perform handwashing before donning PPE',
      'Put on gown, mask, goggles/face shield (if required), and gloves in proper sequence',
      'Remove gloves first without contaminating skin, then gown, and mask/eye protection',
      'Perform handwashing immediately after removing all PPE',
    ],
  },
  {
    skillNumber: 'SKILL-09',
    name: 'Dresses Client with Affected (Weak) Arm',
    category: 'Personal Care',
    steps: [
      'Provide privacy and allow client to choose clothing',
      'Undress unaffected/strong side first; dress affected/weak arm first',
      'Handle affected limb gently and support joints without pulling',
      'Ensure clothing is neat, comfortable, and call light is within reach',
    ],
  },
  {
    skillNumber: 'SKILL-10',
    name: 'Feeds Client who Cannot Feed Self',
    category: 'Nutrition & Hydration',
    steps: [
      'Position client upright (75-90 degrees) and verify name/diet card',
      'Offer small bites and fluids at client pace, alternating food and liquids',
      'Wipe mouth as needed and keep client upright after meal',
      'Calculate and record percentage of meal eaten and fluid intake',
    ],
  },
  {
    skillNumber: 'SKILL-11',
    name: 'Gives Modified Bed Bath',
    category: 'Personal Care',
    steps: [
      'Test water temperature and have client verify comfort',
      'Wash eyes from inner to outer canthus with plain water, then wash face',
      'Wash, rinse, and dry arm, hand, chest, and abdomen while keeping client covered',
      'Apply lotion/deodorant as requested, lower bed, and perform handwashing',
    ],
  },
  {
    skillNumber: 'SKILL-13',
    name: 'Measures and Records Urinary Output',
    category: 'Elimination & Output',
    steps: [
      'Don gloves and pour urine from bedpan/urinal/drainage bag into graduate container',
      'Place graduate on flat surface and read measurement at eye level',
      'Empty urine into toilet, rinse/store equipment, and remove gloves',
      'Perform handwashing and record output accurately in mL',
    ],
  },
  {
    skillNumber: 'SKILL-14',
    name: 'Measures and Records Weight of Ambulatory Client',
    category: 'Vital Signs',
    steps: [
      'Balance scale at zero before client steps on',
      'Ensure client wears non-skid footwear and light clothing',
      'Assist client onto scale safely without holding onto scale/wall',
      'Read and record weight accurately',
    ],
  },
  {
    skillNumber: 'SKILL-15',
    name: 'Performs Modified Passive Range of Motion for One Knee and One Ankle',
    category: 'Restorative Care',
    steps: [
      'Explain procedure and support joints above and below during movement',
      'Move knee through flexion/extension and ankle through dorsiflexion/plantar flexion slowly',
      'Stop immediately if client reports pain or resistance is felt',
      'Ensure client comfort and call light access upon completion',
    ],
  },
  {
    skillNumber: 'SKILL-16',
    name: 'Performs Modified Passive Range of Motion for One Shoulder',
    category: 'Restorative Care',
    steps: [
      'Explain procedure and support wrist and elbow during movement',
      'Move shoulder slowly through flexion/extension and abduction/adduction',
      'Stop immediately if client reports pain or resistance is felt',
      'Ensure client comfort and call light access upon completion',
    ],
  },
  {
    skillNumber: 'SKILL-17',
    name: 'Positions on Side',
    category: 'Mobility & Transfers',
    steps: [
      'Lock bed brakes and raise bed to comfortable working height',
      'Move client to side of bed and roll gently onto side',
      'Place pillows behind back, between knees/ankles, and under upper arm',
      'Lower bed to lowest position and place call light within reach',
    ],
  },
  {
    skillNumber: 'SKILL-18',
    name: 'Provides Catheter Care for Female',
    category: 'Elimination & Output',
    steps: [
      'Don gloves and inspect meatus/tubing for irritation or kinks',
      'Stabilize catheter near meatus and cleanse 4 inches down tubing away from meatus',
      'Rinse and pat dry; keep drainage bag below bladder level off the floor',
      'Remove gloves and perform handwashing',
    ],
  },
  {
    skillNumber: 'SKILL-19',
    name: 'Provides Foot Care on One Foot',
    category: 'Personal Care',
    steps: [
      'Test water temperature, soak foot in basin, and wash gently including between toes',
      'Rinse and dry foot thoroughly, especially between toes',
      'Apply lotion to top and bottom of foot (avoiding between toes)',
      'Put on clean sock/non-skid footwear, clean supplies, and perform handwashing',
    ],
  },
  {
    skillNumber: 'SKILL-20',
    name: 'Provides Mouth Care',
    category: 'Personal Care',
    steps: [
      'Don gloves and position client upright (or on side if unconscious)',
      'Brush all tooth surfaces and tongue gently with moistened toothbrush/toothpaste',
      'Assist client to rinse mouth into emesis basin and dry face',
      'Remove gloves, store supplies properly, and perform handwashing',
    ],
  },
  {
    skillNumber: 'SKILL-21',
    name: 'Provides Perineal Care for Female',
    category: 'Personal Care',
    steps: [
      'Don gloves, provide privacy, and test water temperature',
      'Cleanse from cleanest to dirtiest area (front to back) using clean cloth sections',
      'Rinse thoroughly and pat dry gently',
      'Dispose of soiled linen/gloves properly and perform handwashing',
    ],
  },
  {
    skillNumber: 'SKILL-22',
    name: 'Transfers From Bed to Wheelchair Using Transfer Belt',
    category: 'Mobility & Transfers',
    steps: [
      'Position wheelchair at bedside, lock brakes, and remove/swing away footrests',
      'Apply transfer belt snugly and assist client to sitting position on edge of bed',
      'Pivot client smoothly into wheelchair using proper body mechanics',
      'Remove transfer belt, position footrests, and place call light within reach',
    ],
  },
  {
    skillNumber: 'SKILL-23',
    name: 'Measures and Records Manual Blood Pressure',
    category: 'Vital Signs',
    steps: [
      'Clean earpieces and diaphragm of stethoscope; position cuff 1 inch above brachial artery',
      'Palpate brachial/radial pulse, inflate cuff 30 mmHg above disappearance point',
      'Release valve slowly (2-3 mmHg/sec), note systolic and diastolic sounds',
      'Deflate cuff completely, remove, and record BP accurately',
    ],
  },
];

// Exact unit mapping from Doc 5 (S10 · Skills Lab & S11 · Curriculum Crosswalk)
const SKILL_UNIT_MAP: Record<string, string> = {
  'SKILL-01': 'Unit 4',
  'SKILL-02': 'Unit 8',
  'SKILL-03': 'Unit 5',
  'SKILL-04': 'Unit 8',
  'SKILL-05': 'Unit 8',
  'SKILL-06': 'Unit 6',
  'SKILL-07': 'Unit 6',
  'SKILL-08': 'Unit 4',
  'SKILL-09': 'Unit 7',
  'SKILL-10': 'Unit 8',
  'SKILL-11': 'Unit 8',
  'SKILL-13': 'Unit 6',
  'SKILL-14': 'Unit 6',
  'SKILL-15': 'Unit 7',
  'SKILL-16': 'Unit 7',
  'SKILL-17': 'Unit 5',
  'SKILL-18': 'Unit 8',
  'SKILL-19': 'Unit 8',
  'SKILL-20': 'Unit 8',
  'SKILL-21': 'Unit 8',
  'SKILL-22': 'Unit 5',
  'SKILL-23': 'Unit 6',
};

async function seedCoreSkills() {
  console.log('Seeding 22 WABON Nursing Assistant Core Skills (CA-20)...');

  const officialNumbers = WABON_22_CORE_SKILLS.map((s) => s.skillNumber);
  const deleted = await prisma.coreSkill.deleteMany({
    where: {
      skillNumber: { notIn: officialNumbers },
    },
  });
  if (deleted.count > 0) {
    console.log(`Removed ${deleted.count} non-official/test CoreSkill records.`);
  }

  for (const skill of WABON_22_CORE_SKILLS) {
    const taughtInUnit = SKILL_UNIT_MAP[skill.skillNumber] || 'Unit 6';
    await prisma.coreSkill.upsert({
      where: { skillNumber: skill.skillNumber },
      update: {
        name: skill.name,
        category: skill.category,
        steps: skill.steps,
        taughtInUnit,
      },
      create: {
        skillNumber: skill.skillNumber,
        name: skill.name,
        category: skill.category,
        steps: skill.steps,
        taughtInUnit,
      },
    });
  }

  console.log(`Successfully seeded ${WABON_22_CORE_SKILLS.length} WABON core skills.`);
}

seedCoreSkills()
  .catch((err) => {
    console.error('Failed to seed core skills:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
