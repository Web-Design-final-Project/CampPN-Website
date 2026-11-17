/* =====================================================================
   CampPN — seed data (V1)
   These are the sample events shown across the site. They map to the
   `categories` and `events` tables in the Next Step doc. When a real
   backend exists, this file is replaced by API calls (see store.js).
   NOTE: titles/dates/places are SAMPLE content — replace with real
   events from your pilot organizers.
   ===================================================================== */

import imgUxui from './assets/Explore-event-assets/uxui.png';
import imgCareer from './assets/Explore-event-assets/career.png';
import imgBasketball from './assets/Explore-event-assets/Basketball-competition.jpg';
import imgCloud from './assets/Explore-event-assets/cloud.png';
import imgStartup from './assets/Explore-event-assets/Starup-uniprenuer.JPG';
import imgAI from './assets/Explore-event-assets/AI&Data.png';
import imgRiverside from './assets/Explore-event-assets/riverside.png';
import imgBands from './assets/Explore-event-assets/bands.png';
import imgDebate from './assets/Explore-event-assets/debate.png';
import imgCompetition from './assets/Explore-event-assets/competition.png';

export const CATEGORIES = [
  { id: 'Workshop', icon: 'design_services' },
  { id: 'Seminar', icon: 'forum' },
  { id: 'Competition', icon: 'emoji_events' },
  { id: 'Sports', icon: 'sports_basketball' },
  { id: 'Career', icon: 'work' },
  { id: 'Technology', icon: 'memory' },
  { id: 'Club Activity', icon: 'groups' },
  { id: 'Social', icon: 'celebration' },
];

export const categoryIcon = (name) =>
  (CATEGORIES.find((c) => c.id === name) || { icon: 'event' }).icon;

const LOCATION_TYPES = {
  'Innovation Hub, Room 204': 'Innovation Hub',
  'Innovation Hub': 'Innovation Hub',
  'Main Auditorium': 'Auditorium',
  'Auditorium A': 'Auditorium',
  'Business Faculty Hall': 'Auditorium',
  'Computer Lab 1': 'Classroom',
  'Computer Lab 2': 'Classroom',
  'Classroom B204': 'Classroom',
};
export const locationType = (loc) => LOCATION_TYPES[loc] || 'Campus';

const common = {
  language: 'Khmer & English',
  audience: 'University students',
  entry: 'Free',
};

// date: YYYY-MM-DD, start/end: 24h HH:MM (Phnom Penh time). Registration closes 23:59 the day before.
export const EVENTS = [
  {
    id: 'ui-ux-design-workshop',
    title: 'UI/UX Design Workshop',
    category: 'Workshop',
    img: imgUxui,
    desc: 'Learn user research, wireframing, and prototyping fundamentals through hands-on exercises.',
    about: [
      'This hands-on workshop is designed for students who want to understand the fundamentals of UI/UX design and improve their digital product design skills.',
      'You will explore user research, information architecture, wireframing, visual design, prototyping, and usability testing through practical activities.',
    ],
    learn: ['User research fundamentals', 'Wireframing techniques', 'Design system basics', 'Interactive prototyping'],
    date: '2026-09-25', start: '14:00', end: '16:00',
    location: 'Innovation Hub, Room 204', address: 'Building A, Room 204',
    organizer: 'Design Club', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 100, seedRegistered: 68, ...common,
  },
  {
    id: 'career-fair-2026',
    title: 'Career Fair 2026',
    category: 'Career',
    img: imgCareer,
    desc: 'Meet recruiters from 30+ companies hiring across technology, finance, and marketing.',
    about: [
      'The annual Career Fair brings employers and students together in one place.',
      'Bring copies of your CV, talk to recruiters, and learn about internships and graduate roles.',
    ],
    learn: ['How recruiters read a CV', 'Internship and graduate opportunities', 'Networking with employers', 'Questions to ask at a career fair'],
    date: '2026-10-02', start: '09:00', end: '13:00',
    location: 'Main Auditorium', address: 'Main Auditorium, Main Campus',
    organizer: 'Career Center', organizerBlurb: 'University department · Phnom Penh',
    capacity: 300, seedRegistered: 212, ...common,
  },
  {
    id: 'inter-faculty-basketball-finals',
    title: 'Inter-Faculty Basketball Finals',
    category: 'Sports',
    img: imgBasketball,
    desc: 'Cheer on your faculty in the final match of the inter-faculty basketball league.',
    about: [
      'The two top faculties meet in the final match of this season\u2019s inter-faculty league.',
      'Come with your classmates and support your team from the stands.',
    ],
    learn: ['Match schedule and rules', 'Team line-ups', 'Where to sit with your faculty', 'Trophy ceremony'],
    date: '2026-10-06', start: '17:00', end: '19:00',
    location: 'Campus Sports Arena', address: 'Campus Sports Arena',
    organizer: 'Sports Committee', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 400, seedRegistered: 178, ...common,
  },
  {
    id: 'intro-to-cloud-computing',
    title: 'Intro to Cloud Computing',
    category: 'Seminar',
    img: imgCloud,
    desc: 'Explore cloud platforms, deployment fundamentals, and career opportunities in cloud technology.',
    about: [
      'A beginner-friendly seminar covering what the cloud is and how applications are deployed to it.',
      'You will also hear about career paths in cloud engineering and DevOps.',
    ],
    learn: ['Cloud service models', 'Deploying a web app', 'Cost and security basics', 'Cloud career paths'],
    date: '2026-10-09', start: '15:00', end: '16:30',
    location: 'Auditorium A', address: 'Auditorium A, Main Campus',
    organizer: 'Coding Club', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 120, seedRegistered: 96, ...common,
  },
  {
    id: 'startup-pitch-competition',
    title: 'Startup Pitch Competition',
    category: 'Competition',
    img: imgStartup,
    desc: 'Student teams pitch original startup ideas to a panel of local founders and entrepreneurs.',
    about: [
      'Student teams present original startup ideas in a short pitch followed by questions from a judging panel.',
      'Audience members are welcome to watch and vote for the people\u2019s choice award.',
    ],
    learn: ['How to structure a pitch', 'What judges look for', 'Validating a startup idea', 'Feedback from local founders'],
    date: '2026-10-14', start: '13:00', end: '17:00',
    location: 'Innovation Hub', address: 'Innovation Hub, Main Campus',
    organizer: 'Business Club', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 150, seedRegistered: 101, ...common,
  },
  {
    id: 'ai-data-science-talk',
    title: 'AI & Data Science Talk',
    category: 'Technology',
    img: imgAI,
    desc: 'Hear from technology professionals about real-world AI applications and future career paths.',
    about: [
      'Practitioners share how AI and data science are used in real products and teams.',
      'Ask questions and learn which skills to build next.',
    ],
    learn: ['Real-world AI use cases', 'Skills employers look for', 'Getting started with data science', 'Q&A with practitioners'],
    date: '2026-10-16', start: '16:00', end: '17:30',
    location: 'Computer Lab 1', address: 'Computer Lab 1, Main Campus',
    organizer: 'Coding Club', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 60, seedRegistered: 52, ...common,
  },
  {
    id: 'photography-walk-riverside',
    title: 'Photography Walk: Riverside',
    category: 'Club Activity',
    img: imgRiverside,
    desc: 'An early-morning photography walk open to beginners, intermediate, and advanced photographers.',
    about: [
      'Join the Photography Club for a relaxed early-morning walk along the riverside.',
      'All skill levels are welcome \u2014 bring any camera, including your phone.',
    ],
    learn: ['Composition basics', 'Shooting in morning light', 'Street photography etiquette', 'Photo feedback from club members'],
    date: '2026-10-18', start: '06:00', end: '08:00',
    location: 'Meet at Main Gate', address: 'Main Gate, Main Campus',
    organizer: 'Photography Club', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 40, seedRegistered: 31, ...common,
  },
  {
    id: 'battle-of-the-bands',
    title: 'Battle of the Bands',
    category: 'Social',
    img: imgBands,
    desc: 'Student bands compete live for the campus music crown in an evening full of music and entertainment.',
    about: [
      'Student bands take the stage in a live competition judged by a panel and the audience.',
      'Food stalls and activities will be open around the venue.',
    ],
    learn: ['Live performances from student bands', 'Audience voting', 'Meet other student musicians', 'Winner announcement'],
    date: '2026-10-24', start: '18:30', end: '21:30',
    location: 'Main Quad', address: 'Main Quad, Main Campus',
    organizer: 'Music Society', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 500, seedRegistered: 260, ...common,
  },
  {
    id: 'debate-night-tech-ethics',
    title: 'Debate Night: Tech Ethics',
    category: 'Seminar',
    img: imgDebate,
    desc: 'An open discussion about AI ethics, technology, and its impact on future careers.',
    about: [
      'Teams debate the ethics of AI and emerging technology, followed by an open floor discussion.',
      'Everyone is welcome to listen and join the discussion.',
    ],
    learn: ['Arguments on AI ethics', 'How structured debate works', 'Technology and the future of work', 'Open floor discussion'],
    date: '2026-10-29', start: '17:00', end: '18:30',
    location: 'Auditorium A', address: 'Auditorium A, Main Campus',
    organizer: 'Debate Society', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 120, seedRegistered: 45, ...common,
  },
  {
    id: 'campus-innovation-hackathon',
    title: 'Campus Innovation Hackathon',
    category: 'Technology',
    img: imgCompetition,
    desc: 'Build innovative technology solutions with your team and compete for exciting prizes.',
    about: [
      'A one-day hackathon where teams build a working prototype around a campus challenge.',
      'Mentors will be available throughout the day and teams present to judges in the evening.',
    ],
    learn: ['Rapid prototyping', 'Working in a team under time pressure', 'Presenting a product demo', 'Mentor feedback'],
    date: '2026-11-02', start: '08:00', end: '20:00',
    location: 'Innovation Hub', address: 'Innovation Hub, Main Campus',
    organizer: 'Tech Community', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 80, seedRegistered: 55, ...common,
  },
  {
    id: 'cv-interview-masterclass',
    title: 'CV & Interview Masterclass',
    category: 'Workshop',
    img: imgCareer,
    desc: 'Improve your CV, LinkedIn profile, interview skills, and professional communication.',
    about: [
      'A practical session on writing a strong CV and performing well in interviews.',
      'You will review sample CVs and practise common interview questions.',
    ],
    learn: ['CV structure that works', 'Building a LinkedIn profile', 'Answering common interview questions', 'Professional communication'],
    date: '2026-11-05', start: '14:00', end: '16:00',
    location: 'Career Center', address: 'Career Center, Main Campus',
    organizer: 'Career Center', organizerBlurb: 'University department · Phnom Penh',
    capacity: 60, seedRegistered: 22, ...common,
  },
  {
    id: 'student-community-day',
    title: 'Student Community Day',
    category: 'Social',
    img: imgRiverside,
    desc: 'Meet new friends, discover student organizations, and enjoy activities across campus.',
    about: [
      'Student organizations set up booths across campus so new and returning students can discover them.',
      'Join games and activities, and find a club that fits your interests.',
    ],
    learn: ['Discover student clubs', 'Meet new friends', 'Join campus activities', 'Sign up for organizations'],
    date: '2026-11-08', start: '09:00', end: '15:00',
    location: 'Main Campus', address: 'Main Campus',
    organizer: 'Student Union', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 600, seedRegistered: 120, ...common,
  },
  {
    id: 'python-for-beginners',
    title: 'Python for Beginners',
    category: 'Workshop',
    img: imgAI,
    desc: 'Start programming with Python through practical exercises designed for complete beginners.',
    about: [
      'No programming experience required. You will write your first Python programs step by step.',
      'Bring a laptop; setup help is available at the start.',
    ],
    learn: ['Variables and data types', 'Conditions and loops', 'Functions', 'Writing your first small program'],
    date: '2026-11-10', start: '15:00', end: '17:00',
    location: 'Computer Lab 2', address: 'Computer Lab 2, Main Campus',
    organizer: 'Coding Club', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 40, seedRegistered: 18, ...common,
  },
  {
    id: 'public-speaking-workshop',
    title: 'Public Speaking Workshop',
    category: 'Workshop',
    img: imgDebate,
    desc: 'Build confidence and learn practical techniques for presentations and public speaking.',
    about: [
      'Practise structuring a talk, managing nerves, and engaging an audience.',
      'Everyone gets a chance to speak and receive friendly feedback.',
    ],
    learn: ['Structuring a short talk', 'Managing nerves', 'Voice and body language', 'Handling questions'],
    date: '2026-11-13', start: '13:30', end: '15:30',
    location: 'Classroom B204', address: 'Classroom B204, Main Campus',
    organizer: 'Debate Society', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 35, seedRegistered: 12, ...common,
  },
  {
    id: 'business-case-challenge',
    title: 'Business Case Challenge',
    category: 'Competition',
    img: imgCompetition,
    desc: 'Solve real-world business problems and present your strategy to a panel of industry professionals.',
    about: [
      'Teams receive a real-world business case and have a limited time to analyse it and present a strategy.',
      'Industry professionals judge the presentations and give feedback.',
    ],
    learn: ['Structuring a business case', 'Working in a team', 'Presenting a strategy', 'Feedback from professionals'],
    date: '2026-11-18', start: '09:00', end: '16:00',
    location: 'Business Faculty Hall', address: 'Business Faculty Hall, Main Campus',
    organizer: 'Business Club', organizerBlurb: 'Student organization · Phnom Penh',
    capacity: 90, seedRegistered: 34, ...common,
  },
];

// Sample reviews so rating summaries are not empty. Marked as sample data;
// real reviews are stored per user (see store.js).
export const SEED_REVIEWS = [
  { id: 'seed-r1', eventId: 'ui-ux-design-workshop', userName: 'Sample student', rating: 5, comment: 'Very useful workshop and the speaker explained everything clearly.', createdAt: '2026-09-26T09:00:00Z' },
  { id: 'seed-r2', eventId: 'ui-ux-design-workshop', userName: 'Sample student', rating: 4, comment: 'Good hands-on exercises. I would like a longer session next time.', createdAt: '2026-09-27T09:00:00Z' },
  { id: 'seed-r3', eventId: 'career-fair-2026', userName: 'Sample student', rating: 5, comment: 'Met several recruiters and learned a lot about internships.', createdAt: '2026-10-03T09:00:00Z' },
  { id: 'seed-r4', eventId: 'inter-faculty-basketball-finals', userName: 'Sample student', rating: 5, comment: 'Great atmosphere in the arena!', createdAt: '2026-10-07T09:00:00Z' },
  { id: 'seed-r5', eventId: 'intro-to-cloud-computing', userName: 'Sample student', rating: 4, comment: 'Clear introduction for beginners.', createdAt: '2026-10-10T09:00:00Z' },
];
