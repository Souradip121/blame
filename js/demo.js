// The demo repo (Souradip121/hostel-mess-app) has a made-up team whose emails GitHub can't link
// to any account, so it has no avatars. These are their (generated) portraits. Only that repo uses them.
export const DEMO_REPO = 'Souradip121/hostel-mess-app';

const PORTRAITS = {
  'riya.sharma@team7.example': 'riya',
  'arjun.m@team7.example': 'arjun',
  'arjun.mehta@college.example': 'arjun',
  'soham@team7.example': 'soham',
  'tisha.nair@team7.example': 'tisha',
};

export function demoPortrait(repoFullName, person) {
  if (String(repoFullName).toLowerCase() !== DEMO_REPO.toLowerCase()) return null;
  for (const e of person.emails) if (PORTRAITS[e]) return `assets/suspects/${PORTRAITS[e]}.webp`;
  return null;
}
