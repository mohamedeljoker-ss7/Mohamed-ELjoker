import heroItUniversityImg from '../assets/images/hero_it_university_hub_1794831739531.jpg';
import courseProgrammingCyberImg from '../assets/images/course_programming_cyber_1794831740142.jpg';
import courseHardwarePhysicsImg from '../assets/images/course_hardware_physics_1794831740442.jpg';
import engMohamedAvatarImg from '../assets/images/eng_mohamed_avatar_1794831756954.jpg';

export const HERO_IT_UNIVERSITY_IMG = heroItUniversityImg;
export const COURSE_PROGRAMMING_CYBER_IMG = courseProgrammingCyberImg;
export const COURSE_HARDWARE_PHYSICS_IMG = courseHardwarePhysicsImg;
export const ENG_MOHAMED_AVATAR_IMG = engMohamedAvatarImg;

export function getCourseFallbackImage(key?: string): string {
  const k = (key || '').toLowerCase();
  if (
    k.includes('python') ||
    k.includes('cyber') ||
    k.includes('program') ||
    k.includes('sec') ||
    k.includes('english')
  ) {
    return COURSE_PROGRAMMING_CYBER_IMG;
  }
  if (
    k.includes('phys') ||
    k.includes('it') ||
    k.includes('math') ||
    k.includes('hardware') ||
    k.includes('essential')
  ) {
    return COURSE_HARDWARE_PHYSICS_IMG;
  }
  return HERO_IT_UNIVERSITY_IMG;
}
