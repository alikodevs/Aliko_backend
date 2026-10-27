# Technical Proposal
## Web Application & Learning Management System (LMS)
### Functional Requirements Document (FRD / SRS)
#### Aligned with WABON (Washington State Board of Nursing) & WAC 246-841A Standards

**Prepared for:** Nat Health Care Academy  
**Prepared by:** GenShifter Technologies  
**Website:** [www.genshifter.com](https://www.genshifter.com)  
**Location:** Bole, Dembel, Tg’s Bldg 12th Floor, Addis Ababa, Ethiopia  
**Contact:** +251 910 81 3571 / +251 910 78 7662 / +1 206 353 5373  
**Email:** info@genshifter.com  

---

## 1. Overview

**GenShifter Technologies** is a dynamic and forward-thinking IT solutions provider committed to driving digital excellence across industries. With a strong focus on innovative software development, seamless system integration, and comprehensive digital transformation services, we empower organizations to thrive in an ever-evolving technological landscape. Founded with a clear vision to transform organizations through the power of technology, GenShifter Technologies offers tailor-made digital solutions that address operational challenges and unlock new educational and commercial opportunities. Our team of skilled professionals combines deep technical expertise with strategic insight to deliver scalable, secure, and future-ready digital products.

This proposal defines a clear roadmap for designing and developing a specialized **Web Application & Healthcare Learning Management System (LMS)** for **Nat Health Care Academy**. The solution establishes a streamlined digital campus tailored specifically for healthcare vocational training, with a primary focus on the **Certified Nursing Assistant (CNA / Nursing Assistant Certified - NAC)** program alongside complementary certifications such as CPR/BLS, Phlebotomy, and Home Health Aide (HHA).

Crucially, the platform is engineered from the ground up to comply with the rigorous educational and administrative standards set by the **Washington State Board of Nursing (WABON)** under **WAC 246-841A (Nursing Assistant Training Programs)**. 

Functionally, the system will support:
- End-to-end prospective student discovery and enrollment.
- Online admissions with WABON-mandated document verification (Washington State Patrol WATCH / DSHS background checks, 2-step TB screening, immunizations, and student disclosure forms).
- Flexible online tuition payment and installment plan processing.
- Interactive nursing course delivery aligned with WABON core curriculum units (theory modules, video skill demonstrations, practice quizzes).
- Digital clinical skills checklist tracking (verifying Washington State Credentia/NNAAP practical skills).
- Direct supervised clinical hours tracking with instructor sign-offs adhering to state-mandated instructor-to-student ratios (1:10).
- Timed mock state certification examinations for Washington nurse aide licensure.
- A comprehensive Administrative & Instructor Dashboard providing faculty and directors with audit-ready WABON compliance reporting and permanent student record archiving.

By centralizing academic management and student onboarding into a unified, mobile-friendly platform, the system will elevate student retention, simplify WABON regulatory audits, reduce administrative overhead, and establish **Nat Health Care Academy** as a premier, tech-forward healthcare training institution.

---

## 2. Requirements

GenShifter Technologies will design, develop, and deploy a modern, cloud-based, and mobile-responsive Web Application and Learning Management System custom-engineered for the specific workflows of **Nat Health Care Academy** and fully aligned with **WABON regulations**. The platform will feature an inviting, professional healthcare interface optimized for prospective students, enrolled nursing candidates, clinical instructors, and institutional administrators.

The system will feature a high-conversion **Public Portal and Course Catalog** presenting detailed WABON-approved CNA/NAC curricula, clinical site requirements, class schedules, and transparent tuition schedules. A streamlined **Admissions & Student Onboarding Module** will allow applicants to enroll, upload required health and background screening documents, and pay registration or tuition fees securely online.

At the educational core, the **CNA Learning & Clinical Management Module** will support modular self-paced theory coursework alongside instructor-led training—covering state-approved nursing fundamentals and core competencies. The system incorporates a digital **Clinical Skills & Competency Tracker**, allowing instructors to evaluate and digitally sign off on practical skills required for Washington State CNA certification.

To maximize student success, the platform includes a **Washington State Board CNA Exam Prep & Practice Testing Hub**, complete with timed mock examinations, instant answer explanations, and readiness analytics. Finally, a robust **Admin & Faculty Dashboard** provides full visibility into cohort progress, attendance logs, tuition ledger balances, and student completion certificates formatted for state licensing submittals.

---

### 2.1 Functional Requirements

GenShifter Technologies will build a user-friendly, responsive, and compliant healthcare educational platform for Nat Health Care Academy, structured into the following operational modules:

#### 1. Landing Page & Public Navigation
The public-facing portal serves as the primary gateway for prospective students and partners, presenting an inspiring, clean, and trustworthy healthcare brand image.
* **Hero Section:**
  * High-impact healthcare imagery and academy mission statement.
  * Direct Call-to-Action (CTA) buttons: *"Apply for Upcoming CNA Cohort"*, *"Explore Programs"*, *"Verify Certification"*.
  * Announcement banner for upcoming class start dates, registration deadlines, and open houses.
* **Dynamic Home Sections:**
  * Featured Healthcare Programs (CNA / NAC, CPR/Basic Life Support, Patient Care Tech).
  * **WABON Program Approval Badge**, State Board licensing recognition, and Graduate First-Time Pass Rates.
  * Student Success Stories and Nursing Career Pathway highlights.
  * Quick tuition and financing options summary.
* **Navigation Menu:**
  * Clean header: Home, About Academy, Programs (CNA & Certifications), Admissions & Tuition, Clinical Training, Resources, Contact.
  * Sticky header with instant "Student Portal Login" and "Apply Now" buttons.
  * Universal search bar for courses, schedules, and FAQs.

#### 2. Program & Course Catalog (WABON-Compliant CNA / NAC Curriculum)
A structured showcase of all academic and vocational offerings designed to convert visitors into enrolled students while clearly communicating state licensing requirements.
* **Program Overview & Syllabus Breakdown:**
  * Detailed program pages (e.g., Certified Nursing Assistant - CNA / NAC WABON-Approved Program).
  * Clear breakdown of state-mandated training hours:
    * **Classroom Theory Hours** (In-person or hybrid online lecture)
    * **Skills Practice Lab Hours** (Hands-on training in academy simulation lab)
    * **Direct Supervised Clinical Hours** (Clinical rotations in long-term care / nursing facilities)
  * Admission prerequisites (minimum age, government ID, high school diploma/GED, CPR/BLS certification).
* **Schedule & Cohort Selector:**
  * Day, Evening, and Weekend cohort schedules.
  * Class start dates, campus lab location, and clinical rotation partner facility details.
  * Real-time seat availability indicator per cohort.
* **Downloadable Information Packets:**
  * One-click download for CNA Student Handbook, Uniform/Scrubs guide, WABON Student Disclosures, and Clinical site onboarding requirements.

#### 3. Student Admissions & WABON Compliance Onboarding Module
A paperless admissions workflow that simplifies enrollment while satisfying all Washington State Board of Nursing pre-clinical requirements.
* **Online Application Form:**
  * Personal information, contact details, emergency contacts, and education history.
  * Cohort selection (Month/Schedule preference).
* **WABON-Mandated Document Upload Portal:**
  * Secure student upload portal for state-required documentation:
    * **Washington State Patrol (WATCH) Background Check** and DSHS criminal history clearance.
    * **Tuberculosis (TB) Screening** (Two-step PPD Mantoux skin test or QuantiFERON blood test clearance).
    * **Immunization Records** (Hepatitis B series, MMR, Tdap, Varicella, and seasonal Flu/COVID-19 vaccination).
    * **Signed WABON Student Disclosure Forms** acknowledging state licensure requirements and criminal history eligibility.
    * Current BLS / CPR card for Healthcare Providers (AHA / Red Cross).
    * Government-issued photo ID & Social Security verification.
* **Tuition & Payment Gateway Integration:**
  * Secure online payment for application fees, registration deposit, and full tuition.
  * Automated payment receipt generation and email confirmation.
  * Multi-channel support (Debit/Credit Cards, Local Bank transfers, Electronic Mobile Wallets).

#### 4. CNA E-Learning & Nursing Curriculum Module
The virtual classroom engine where students complete state-approved nursing theory coursework in compliance with **WABON / WAC 246-841A** educational guidelines.
* **Hierarchical Curriculum & Course Engine:**
  * Multi-tiered structure organizing courses into sequential modules, lessons, and interactive checkpoints.
  * Flexible curriculum configuration enabling faculty to organize WABON core nursing competencies (resident rights, infection control, basic nursing care, restorative skills, and dementia care).
  * Prerequisite module gating: automated progression controls requiring students to complete preceding lessons and pass module quizzes before advancing.
* **Multimedia Lesson Delivery:**
  * Rich content player supporting embedded video lectures, clinical skill demonstration walk-throughs, and downloadable PDF study packets.
  * In-lesson note-taking, slide bookmarks, and lecture search tools.
* **Knowledge Checks & Formative Assessments:**
  * End-of-module comprehension quizzes with configurable passing thresholds (e.g., 80%+ mastery).
  * Instant feedback with nursing rationales to reinforce theoretical comprehension.
  * Retake rules and question-randomization options to uphold academic integrity.
* **WABON Seat-Time & Attendance Tracking:**
  * Automated active engagement tracking recording exact student time-on-task within digital modules.
  * Theory hour completion meters providing students and instructors real-time visibility into required classroom hour benchmarks.

#### 5. Clinical Skills & Competency Checklist
Bridging theoretical classroom learning with practical lab and clinical site evaluations in compliance with WABON training standards.
* **Digital Skills Evaluation Rubric:**
  * Configurable competency checklist aligned with Washington State nurse aide practical examination criteria.
  * Multi-criteria evaluation rubric for clinical faculty (e.g., Satisfactory, Needs Practice, Critical Step Mastered).
  * Timestamped instructor electronic signatures with date and credential verification upon skill sign-off.
* **Supervised Clinical Hours & Attendance Tracking:**
  * Digital attendance logger tracking shift hours completed across affiliated clinical healthcare facilities.
  * Clinical faculty and preceptor verification workflows with evaluation notes and shift performance ratings.
  * Automated ratio verification ensuring compliance with WABON clinical supervision requirements (1:10 instructor-to-student ratio).
  * Automated threshold notifications when students satisfy mandatory clinical hour quotas.

#### 6. Washington State CNA Certification Exam Prep & Mock Testing
Preparing students to pass both the written knowledge examination and the manual skills evaluation administered by Washington State test vendors (Credentia / Pearson VUE).
* **Practice Question Bank:**
  * Extensive question bank categorized by WABON test domains (Physical Care Skills, Psychosocial Care, Role of the Nurse Aide).
  * Timed mock exam simulation replicating official state examination conditions.
* **Instant Explanations & Scoring:**
  * Immediate scoring breakdown showing areas of strength and weakness (e.g., 92% on Infection Control, 68% on Vital Signs).
  * In-depth rationales for correct and incorrect answers to reinforce clinical decision-making.

#### 7. Student & Alumni Resource Center
Supporting students throughout their studies and transition into healthcare employment.
* **Digital Library & Downloadable Assets:**
  * CNA state exam flashcards, medical abbreviations sheet, and nursing terminology dictionary.
  * Washington State Nurse Aide Candidate Handbook (Credentia) and test day preparation guides.
  * Healthcare resume templates, interview coaching guides, and local healthcare employer job boards.
* **Official Certificate & Transcript Generator:**
  * Automatic generation of the **WABON-Compliant Certificate of Completion** upon satisfying all theory, lab, and clinical hours.
  * Unique QR-code verification link for employers, healthcare facilities, and licensing boards to authenticate graduate credentials.

#### 8. Admissions & Student Communication Hub
Ensuring prospective and active students receive prompt assistance and reminders.
* **Interactive Admissions Inquiry Form:**
  * Direct inquiry form for campus visits, financial aid questions, or cohort scheduling.
  * Automated email/SMS acknowledgment sent to the applicant.
* **Automated Notifications & Reminders:**
  * Class schedule updates, lab practical reminders, and clinical shift notifications.
  * Tuition installment due-date alerts.
* **Direct Communication Channels:**
  * Integrated WhatsApp chat widget and Click-to-Call direct academy hotline.
  * Integrated Google Maps showing academy training facility and parking guidance.

#### 9. Comprehensive Admin & Instructor Dashboard (WABON Regulatory Hub)
A secure, role-based command center for academy directors, program coordinators, admissions staff, and clinical instructors.
* **Cohort & Student Roster Management:**
  * View, filter, and organize students by cohort, status (Enrolled, Theory In Progress, Lab Skills, Clinicals, Graduated).
  * Access complete student profiles including uploaded WABON compliance records, background clearances, and contact details.
* **Academic & Clinical Gradebook:**
  * Centralized view of quiz grades, mock test results, and attendance records.
  * Export student transcripts and clinical completion summaries into PDF and Excel for WABON state licensing audits.
* **Tuition & Financial Tracking:**
  * Track tuition payments, outstanding balances, and payment histories per student.
  * Generate invoices, payment reminders, and financial summaries.
* **WABON Regulatory Audit & Reporting Hub:**
  * **One-Click Audit Packet Generation:** Export complete student dossiers (attendance logs, clinical hour verification, skills checklists, background check dates, and final exam scores) ready for WABON inspections.
  * **Permanent Student Record Archiving:** Digital archiving designed to comply with state student record retention mandates (transcripts and completion documentation).
* **Role-Based Access Control:**
  * **Super Admin / Program Director** (Full Academy Control, Regulatory Reports)
  * **Admissions Officer** (Lead and Enrollment Management, Tuition Verification)
  * **Approved Nurse Instructor** (Curriculum Delivery, Clinical Skills Sign-off, Attendance)
  * **Student** (Personal Learning, Skill Review, and Payment Portal)

---

### 2.2 Non-Functional Requirements

To ensure high reliability, security, and strict compliance with healthcare data protection standards, GenShifter Technologies will adhere to the following standards:

#### 1. Performance & Optimization
* **Fast Load Times:** High responsiveness across all devices, ensuring page load times under 2.5 seconds on standard connections.
* **Optimized Media Delivery:** Adaptive video streaming and CDN caching for high-definition clinical video demonstrations and downloadable course materials.
* **Concurrent Capacity:** Ability to support concurrent class sessions, live testing, and simultaneous registrations without lag or downtime.

#### 2. Scalability & Modular Architecture
* **Modular Service Design:** Built on a decoupled, modular foundation that easily accommodates future academy expansion (e.g., launching Phlebotomy, EKG Technician, or RN refresher modules).
* **Database Efficiency:** High-performance database architecture configured for rapid retrieval of student histories, document uploads, and audit records.
* **Continuous Upgrades:** Clean codebase supporting ongoing feature additions and continuous deployment pipelines (CI/CD).

#### 3. Security, Privacy & Healthcare Compliance (HIPAA & FERPA)
* **Data Encryption:** 256-bit SSL/TLS encryption for all data in transit; encrypted storage for sensitive student identity documents, background checks, and health/immunization records.
* **Access Control:** Strict Role-Based Access Control (RBAC) ensuring instructors only access their assigned cohorts and student health records remain confidential.
* **Healthcare & Education Privacy:** Adherence to educational privacy standards (**FERPA**) and healthcare record privacy guidelines (**HIPAA** best practices for patient/student data protection).
* **Threat Mitigation:** Defenses against Common Web Vulnerabilities (SQLi, XSS, CSRF, brute-force login attempts).

#### 4. Reliability & Availability
* **99.9% Uptime Guarantee:** Hosted on enterprise-grade cloud infrastructure with automatic failover and daily automated database backups.
* **Disaster Recovery:** Automated snapshot backups ensuring full system restoration within minimal recovery time objectives (RTO).

#### 5. Cross-Platform & Device Compatibility
* **Mobile-First Responsive Design:** Seamless user experience across smartphones, tablets, laptops, and desktops, allowing busy nursing students to review flashcards or watch skill videos on-the-go.
* **Universal Browser Support:** Fully tested on Google Chrome, Apple Safari, Mozilla Firefox, and Microsoft Edge.
* **Accessibility Guidelines:** Designed in alignment with WCAG 2.1 accessibility recommendations (high-contrast text, clear typography, screen-reader friendly elements).

#### 6. Usability & User Experience (UX/UI)
* **Healthcare Clean Aesthetic:** Intuitive, calming, and professional medical visual theme (medical teal, clean slate, and white tones) that inspires confidence.
* **Frictionless Navigation:** Zero-learning-curve interface enabling non-tech-savvy students and clinical preceptors to submit assignments and sign off competencies effortlessly.

#### 7. System Monitoring & WABON Audit Logging
* **Automated Audit Logs:** Timestamped logging of grade submissions, skill sign-offs, and compliance document approvals.
* **Dedicated Post-Launch Support:** Continuous technical maintenance, bug resolution, and system optimization during the warranty and support period.

---

## 3. Development Process

To guarantee successful delivery on time and within scope, GenShifter Technologies employs a structured, milestone-driven development process:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Planning   │────▶│    Design    │────▶│ Development  │────▶│  Deployment  │
│  & Discovery │     │  & Prototype │     │  & Testing   │     │  & Training  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Phase 1: Planning & WABON Requirements Alignment
* **Kickoff Alignment Session:** Joint review with Nat Health Care Academy leadership and Program Director to verify cohort structures, WABON-approved curriculum hours (theory vs. lab vs. clinical), and clinical partner facility protocols.
* **Workflow Mapping:** Formalization of student application flows, Washington State Patrol WATCH verification workflows, and instructor clinical sign-off procedures.
* **Milestone Roadmap:** Establishing definitive sprint deliverables and review meetings.

### Phase 2: UI/UX Design & Interactive Prototypes
* **Brand & Visual Styling:** Creating a clean, modern healthcare academy aesthetic tailored to Nat Health Care Academy’s branding.
* **Wireframing & Prototyping:** Designing interactive mockups for the student dashboard, WABON clinical skills checklist, and public landing pages.
* **Client Review & Feedback:** Collaborative review sessions with academy leaders to ensure the layouts match staff and student expectations prior to development.

### Phase 3: Implementation & Development
* **Front-End Development:** Crafting responsive, intuitive user interfaces for students, instructors, and admissions officers.
* **Back-End & Database Engineering:** Developing secure database structures, course progression engines, document upload handlers, and authentication services.
* **API & Payment Gateway Integration:** Connecting online payment processors, SMS/Email notification engines, and cloud media storage.

### Phase 4: Rigorous Quality Assurance & Testing
* **Alpha Testing:** Internal functional testing of all modules, permissions, quiz scoring, and document uploads.
* **Beta Testing & Academy Walkthrough:** Hands-on review with selected academy instructors and administrators to simulate:
  * Prospective student applying and submitting WABON-mandated health & background documents.
  * Student completing a CNA theory module and practice quiz.
  * Clinical instructor signing off on Washington State practical skills checklist.
  * Admin exporting cohort WABON compliance reports.
* **Cross-Browser & Mobile Verification:** Verifying speed, responsiveness, and touch interactivity across iOS, Android, and PC devices.

### Phase 5: Deployment, Training & Launch
* **Cloud Environment Setup:** Provisioning production servers, domain connection, SSL certification, and automated backup schedules.
* **Staff Onboarding & Training:** Live walkthrough sessions and user guide provision for academy administrators and teaching staff.
* **Go-Live & Post-Launch Support:** Official platform launch with real-time monitoring and immediate hypercare support.

---

## 4. Timeline: Work Breakdown Structure (2 Months)

The project will be executed across an intensive **8-week (2-Month)** delivery schedule:

| No. | Project Phase & Deliverables | Week 1 - 2 | Week 3 - 4 | Week 5 - 6 | Week 7 - 8 |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **1** | **Planning & WABON Alignment**<br>• Stakeholder alignment & state curriculum review<br>• User journey mapping & requirements sign-off | **[ ██████ ]** | | | |
| **2** | **UI/UX Design & Prototyping**<br>• Healthcare UI design system<br>• Student portal & WABON checklist wireframes<br>• Client design approval | | **[ ██████ ]** | | |
| **3** | **Development & Integration**<br>• Public portal & CNA course catalog<br>• Admissions & document compliance upload portal<br>• E-learning & Clinical skills tracker module<br>• Payment & Notification integration | | | **[ ██████ ]** | |
| **4** | **Testing, Training & Deployment**<br>• QA, Security, and WABON audit simulation<br>• Admin & Instructor training sessions<br>• Cloud deployment & Official Go-Live | | | | **[ ██████ ]** |

---

## 5. Cost Breakdown & Investment

The investment covers end-to-end design, custom development, payment and notification integration, data security configuration, administrative training, and post-launch technical warranty.

| Item | Description | Cost (USD / Local Equivalent) |
| :--- | :--- | :--- |
| **1. UI/UX Healthcare Design & Branding** | Custom modern medical aesthetic, responsive layouts for student portal, clinical checklists, and public academy website. | *Itemized on Request* |
| **2. Public Portal & Admissions Engine** | Dynamic course catalog, cohort schedule selector, document upload portal (TB test, background check), and payment processing. | *Itemized on Request* |
| **3. WABON-Aligned CNA E-Learning Hub** | Modular video/slide lessons, progress bars, practice quizzes, and state board CNA mock exam simulator. | *Itemized on Request* |
| **4. Clinical Skills & Attendance Module** | Digital clinical competency rubric (state competency skills), instructor sign-off tool, attendance logs, and student certificate generator. | *Itemized on Request* |
| **5. Admin & WABON Audit Management Suite** | Cohort management, student gradebook, tuition billing status, one-click state compliance export reports, and role-based permissions. | *Itemized on Request* |
| **6. Deployment, Training & 3-Month Support** | Production cloud launch, staff training sessions, system documentation, and 90 days of dedicated maintenance. | *Included in Package* |
| **Total Project Investment** | **Complete Turnkey Solution** | **[As Per Quotation Schedule]** |

---

## Contract Terms & Next Steps

If Nat Health Care Academy is satisfied with this technical proposal and functional roadmap, the engagement will proceed under the following steps:

1. **Clarifications & Scope Fine-Tuning:** We will gladly review any specialized institutional workflows or state-specific reporting templates you wish to include.
2. **Official Agreement Signing:** We will issue the formal service agreement detailing milestones, deliverables, and payment schedules.
3. **Project Kickoff:** Upon contract execution and initial deposit, our team will immediately launch Week 1 Discovery and Design activities.

We are committed to delivering an outstanding digital academy platform that will elevate Nat Health Care Academy's educational reach, student graduation rates, and operational efficiency.

---

### Thank You

Thank you for the opportunity to present this proposal for the **Nat Health Care Academy Web Application & Learning Management System**. We are enthusiastic about the prospect of partnering with your institution to build a modern, high-impact digital learning environment for the next generation of healthcare professionals.

Please feel free to reach out to us at your convenience to discuss this proposal or schedule our project kickoff session.

**Warm regards,**

**Abdi Aliko**  
CEO & General Manager  
**GenShifter Technologies**  
📧 **Email:** info@genshifter.com  
📱 **Phone:** +1 (206) 353-5373 / +251 910 813 571 / +251 910 787 662  
🌐 **Website:** [www.genshifter.com](https://www.genshifter.com)  
📍 **Office:** Bole, Dembel, Tg’s Bldg 12th Floor, Addis Ababa, Ethiopia  
