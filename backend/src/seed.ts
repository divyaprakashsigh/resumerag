import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateMockEmbedding, extractPII } from './utils/embeddings';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  await prisma.matchResult.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const recruiterPassword = await bcrypt.hash('Pass@123', 12);
  const userPassword = await bcrypt.hash('Pass@123', 12);

  const recruiter = await prisma.user.create({
    data: {
      name: 'John Recruiter',
      email: 'recruiter@test.com',
      passwordHash: recruiterPassword,
      role: 'RECRUITER'
    }
  });

  const user = await prisma.user.create({
    data: {
      name: 'Jane User',
      email: 'user@test.com',
      passwordHash: userPassword,
      role: 'USER'
    }
  });

  console.log('✅ Created users');

  // Sample resume texts
  const resume1Text = `
John Smith
Software Engineer
john.smith@email.com
(555) 123-4567

EXPERIENCE
Senior Software Engineer at TechCorp (2020-2023)
- Developed React applications using TypeScript
- Built REST APIs with Node.js and Express
- Managed PostgreSQL databases
- Implemented CI/CD pipelines with Docker
- Led team of 5 developers

Software Engineer at StartupXYZ (2018-2020)
- Created mobile apps with React Native
- Worked with AWS cloud services
- Implemented microservices architecture
- Used Git for version control

SKILLS
- JavaScript, TypeScript, Python
- React, Node.js, Express
- PostgreSQL, MongoDB
- AWS, Docker, Kubernetes
- Git, CI/CD

EDUCATION
Bachelor of Computer Science
University of Technology (2014-2018)
  `;

  const resume2Text = `
Sarah Johnson
Full Stack Developer
sarah.johnson@email.com
(555) 987-6543

PROFESSIONAL SUMMARY
Experienced full-stack developer with 6+ years in web development.
Specialized in modern JavaScript frameworks and cloud technologies.

WORK EXPERIENCE
Lead Developer at Digital Solutions (2021-2024)
- Architected scalable web applications
- Mentored junior developers
- Implemented DevOps best practices
- Used React, Vue.js, and Angular
- Managed AWS infrastructure

Frontend Developer at WebStudio (2019-2021)
- Developed responsive web interfaces
- Optimized application performance
- Collaborated with UX/UI designers
- Used modern CSS frameworks
- Implemented accessibility standards

TECHNICAL SKILLS
Programming: JavaScript, TypeScript, Python, Java
Frontend: React, Vue.js, Angular, HTML5, CSS3
Backend: Node.js, Express, Django, Spring Boot
Database: PostgreSQL, MySQL, Redis
Cloud: AWS, Azure, Google Cloud
Tools: Docker, Kubernetes, Jenkins, Git

EDUCATION
Master of Software Engineering
Tech University (2017-2019)
Bachelor of Computer Science
State University (2013-2017)
  `;

  // Create resumes
  const resume1 = await prisma.resume.create({
    data: {
      userId: user.id,
      filename: 'john_smith_resume.pdf',
      text: resume1Text,
      embedding: generateMockEmbedding(resume1Text),
      pii: extractPII(resume1Text)
    }
  });

  const resume2 = await prisma.resume.create({
    data: {
      userId: user.id,
      filename: 'sarah_johnson_resume.pdf',
      text: resume2Text,
      embedding: generateMockEmbedding(resume2Text),
      pii: extractPII(resume2Text)
    }
  });

  console.log('✅ Created sample resumes');

  // Create sample job
  const job = await prisma.job.create({
    data: {
      title: 'Senior Full Stack Developer',
      description: 'We are looking for an experienced full-stack developer to join our team. You will be responsible for developing and maintaining web applications using modern technologies.',
      requirements: [
        'React and TypeScript experience',
        'Node.js and Express.js',
        'PostgreSQL database knowledge',
        'AWS cloud services',
        'Docker and containerization',
        'Git version control',
        '5+ years of experience',
        'Team leadership skills'
      ]
    }
  });

  console.log('✅ Created sample job');

  // Create sample match results
  await prisma.matchResult.create({
    data: {
      jobId: job.id,
      resumeId: resume1.id,
      score: 85.5,
      evidence: [
        'Developed React applications using TypeScript',
        'Built REST APIs with Node.js and Express',
        'Managed PostgreSQL databases',
        'Implemented CI/CD pipelines with Docker'
      ],
      missing: [
        'Team leadership skills'
      ]
    }
  });

  await prisma.matchResult.create({
    data: {
      jobId: job.id,
      resumeId: resume2.id,
      score: 92.3,
      evidence: [
        'Architected scalable web applications',
        'Used React, Vue.js, and Angular',
        'Managed AWS infrastructure',
        'Mentored junior developers'
      ],
      missing: [
        'Express.js specific experience'
      ]
    }
  });

  console.log('✅ Created sample match results');

  console.log(`
🎉 Database seeded successfully!

Test credentials:
- Recruiter: recruiter@test.com / Pass@123
- User: user@test.com / Pass@123

Sample data:
- 2 resumes uploaded
- 1 job posting created
- 2 match results generated
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
