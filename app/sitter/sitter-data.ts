export type NavKey = 'home' | 'feeding' | 'walks' | 'crate' | 'contacts';

export const tripWindow = { label: 'Aug 29 to Sep 14, 2026' };

export const welcome = [
  'Thank you for doing this. It means we can actually relax.',
  'Jeremy, glad you will be around too. Everything here goes for you as well.',
  'Portugal is 5 hours ahead. Call anyway if something is wrong.',
];

export type QuickRefRow = { label: string; value: string };
export const quickReference: QuickRefRow[] = [
  { label: 'Bengt AM', value: '**1.5 cups** + powder + spoonful of sardines' },
  { label: 'Bengt PM', value: '**1.5 cups** + spoonful of sardines' },
  { label: 'Chloe AM', value: '**1 cup** + powder + **2 crushed allergy pills** + sardines' },
  { label: 'Chloe PM', value: '**1 cup** + spoonful of sardines' },
  { label: 'Alone', value: '**4 hours max** for Bengt. Chloe can go about 6.' },
  { label: 'Trash', value: 'Out **Thursday evening**.' },
  { label: 'Daycare', value: 'Playtime Pet Resort, 215-910-4991' },
  { label: 'Closest help', value: 'Ruth next door, 484-888-6733' },
  { label: 'Wifi', value: '' },
];

export type Section = { id: string; title: string; lines: string[] };

export const homeSections: Section[] = [
  {
    id: 'leaving',
    title: 'Leaving the house',
    lines: [
      'Daycare twice a week at **Playtime Pet Resort**, 989 E Lancaster Ave, Downingtown. 215-910-4991, 7 AM to 8 PM weekdays.',
      'Other days, coming home at lunch is ideal.',
      'Take Bengt out to pee before you go.',
      'Close our bedroom door and they get the rest of the house.',
      '**Four hours max for Bengt.** Chloe can go about six.',
    ],
  },
  {
    id: 'expect',
    title: 'Things that will happen',
    lines: [
      'Chloe raids the trash if anything in it smells good, and Bengt shreds whatever she drags out. Take it out or block the can with a chair.',
      'Bengt chews what he should not. Keep your things out of reach and leave his toys around.',
      'Bengt will probably have an accident, which is fine. Take him out right when he wakes up and right when he comes out of the crate.',
      'He asks to go out by running over and starting to play, so sudden attention usually means he needs to go.',
    ],
  },
  {
    id: 'house',
    title: 'The house',
    lines: [
      '**Trash** out Thursday evening, picked up early Friday.',
      '**Packages** come to the front door.',
      '**Plants** were watered before we left. They will probably only need water toward the end.',
      '**Thermostat** is on a day/night timer, about 74 and 76 upstairs. Change it however you like.',
    ],
  },
];

export type Bowl = { dog: string; amount: string; adds: string[] };
export type Meal = { id: string; label: string; when: string; before: string[]; bowls: Bowl[]; after: string[] };

export const feedingNote = 'Bengt gets **3 cups a day**, split 1.5 in the morning and 1.5 at night. That is the right amount for his 40 pounds.';

export const meals: Meal[] = [
  {
    id: 'am',
    label: 'Morning',
    when: 'First thing',
    before: ['Bengt straight out to potty.'],
    bowls: [
      { dog: 'Chloe', amount: '1 cup', adds: ['nutrition powder', '2 crushed allergy pills', 'spoonful of sardines'] },
      { dog: 'Bengt', amount: '1.5 cups', adds: ['nutrition powder', 'spoonful of sardines'] },
    ],
    after: ['Walk after. Usually both poop and pee.'],
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    when: 'Midday',
    before: ['Walk and pee.'],
    bowls: [],
    after: ['No meal. The rest of his food comes at dinner.'],
  },
  {
    id: 'pm',
    label: 'Evening',
    when: 'Dinner',
    before: [],
    bowls: [
      { dog: 'Chloe', amount: '1 cup', adds: ['spoonful of sardines'] },
      { dog: 'Bengt', amount: '1.5 cups', adds: ['spoonful of sardines'] },
    ],
    after: [],
  },
];

export const walkSections: Section[] = [
  {
    id: 'walking',
    title: 'Walking',
    lines: [
      'You have walked both of them with Patrik, so you know the routine.',
      '**If either of them pulls,** stop walking completely and give a little slack back. If they pull again, stop again. Once the leash is slack and they are not pulling, start walking.',
      'Chloe pulls mainly when she spots a friend. Bengt walks well, though he is still a puppy.',
      'Together or separately, whatever is easier.',
    ],
  },
  {
    id: 'training',
    title: 'Training and treats',
    lines: [
      'Highly encouraged. They both like it.',
      'They know **touch, sit, stay, place, here, back up,** and **stop.**',
      'Treats are in the usual spot.',
    ],
  },
];

export const crateSections: Section[] = [
  {
    id: 'sleep',
    title: 'He needs the sleep',
    lines: [
      'When he gets nippy and wild, he is overtired. More exercise will make it worse.',
      'Say **"let\'s go take a nap"** and he goes to his place. He will protest a bit. Once he is in he sleeps two hours or more.',
    ],
  },
  {
    id: 'crying',
    title: 'When he cries',
    lines: [
      '**Nonstop, no breaks:** take him straight outside to potty, then right back in the crate. Do not let him play or stay out.',
      '**Pauses for a minute or two:** he is settled enough to come out. Take him to potty and he can stay out.',
      'In practice he rarely cries nonstop. Usually a minute or two, then he sleeps for a few hours.',
    ],
  },
];

export type Contact = { name: string; note: string; phone: string };
export type ContactGroup = { id: string; title: string; contacts: Contact[] };

export const contactGroups: ContactGroup[] = [
  {
    id: 'closest',
    title: 'Closest by',
    contacts: [
      { name: 'Ruth', note: 'Next door, always home.', phone: '484-888-6733' },
    ],
  },
  {
    id: 'vets',
    title: 'Vets',
    contacts: [
      { name: 'Ruth', note: 'Also a neighbor, and a vet. This is a different Ruth.', phone: '610-400-9235' },
      { name: 'East Bradford Veterinary', note: 'Our regular practice.', phone: '' },
    ],
  },
  {
    id: 'help',
    title: 'General help',
    contacts: [
      { name: 'Jenn', note: "Bubba's mom, Chloe's scraggly-haired friend. You have met him.", phone: '484-639-1322' },
      { name: 'Marigold', note: 'Neighbor.', phone: '610-329-7502' },
    ],
  },
  {
    id: 'backup',
    title: 'If you have to leave',
    contacts: [
      { name: 'Sweta', note: 'If you cannot finish the stay, she will take them.', phone: '215-206-8041' },
      { name: 'Will', note: "Sweta's husband.", phone: '615-438-3585' },
    ],
  },
];

export const contactsFooter = 'You have our numbers. WhatsApp is the best way to reach us. It works over wifi with no international charges either direction.';
