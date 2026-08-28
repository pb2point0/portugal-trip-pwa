export const tripWindow = {
  startLabel: 'Aug 29',
  endLabel: 'Sep 14, 2026',
  timezoneNote: 'Portugal is **5 hours ahead** of us, so 9:00 PM here is 2:00 AM there. If something is urgent, call anyway.',
};

export type QuickRefRow = { label: string; value: string };
export const quickReference: QuickRefRow[] = [
  { label: 'Chloe', value: '2 cups/day. **2 crushed allergy pills** in the morning.' },
  { label: 'Bengt', value: '3 to 4 cups/day. No allergy pill.' },
  { label: 'Both', value: 'Nutrition powder sprinkled on the morning meal.' },
  { label: 'After Bengt eats', value: 'Keep him calm for 30 to 60 minutes.' },
  { label: 'Daycare', value: 'Playtime Pet Resort, Downingtown. 215-910-4991' },
  { label: 'Max time alone', value: '4 hours (Bengt). Chloe is fine up to 6.' },
  { label: 'Trash', value: 'Out **Thursday evening** (they come early Friday).' },
  { label: 'Wifi', value: '' },
];

export type GuideSection = { id: string; title: string; paragraphs: string[] };
export const guideSections: GuideSection[] = [
  {
    id: 'feeding',
    title: 'Feeding',
    paragraphs: [
      '**Chloe:** 2 cups of her food per day, with sweet potato or similar topper mixed in. We will leave the topper out for you.',
      '**Bengt:** 3 to 4 cups per day depending on how much topper he gets. If he gets a good amount of sweet potato, 3 cups is plenty. He is a growing puppy, so that range is fine.',
      'Ideally Bengt eats **3 or 4 smaller meals a day**, because two large meals can upset his stomach. We completely understand that is not always possible. Two cups in the morning and two at night works fine.',
      '**If he does eat two cups at once, keep him calm for 30 to 60 minutes afterward.** No running, no wrestling, no stairs races. A big meal followed by hard activity is genuinely risky for a dog his size.',
      'This one is about Bengt. **Chloe is fine**, she can eat and carry on as normal.',
      '**Every morning, both bowls get:** a sprinkle of the nutrition powder.',
      "**Chloe's morning bowl only:** **two** crushed allergy pills. Bengt does not get any.",
      'There are treats in the usual spot. Feel free to work on tricks with them, they both enjoy it.',
    ],
  },
  {
    id: 'walks',
    title: 'Walks',
    paragraphs: [
      'You have already walked both dogs with Patrik, so you know the routine. Two things worth repeating:',
      '**Chloe pulls when she spots one of her friends.** You saw this on the practice run. It does not happen often, but when it does you want to already have a good grip: shorten the leash, stay calm, let her know you are in control. She settles right down once she knows that.',
      '**Bengt is very good on leash, but he is still a puppy.** Nothing unusual to watch for, just stay attentive.',
      'They walk well together with Patrik, but **feel free to take them out separately** if that is easier for you. Entirely your call.',
    ],
  },
  {
    id: 'crate',
    title: 'Bengt and the crate (the important one)',
    paragraphs: [
      'Bengt is a puppy and he needs a lot of sleep. **If he gets nippy or wild and full of energy, that is the tell that he is overtired**, not that he needs more exercise.',
      'Say **"let\'s go take a nap"** and he knows to go to his place. He may put up a fight because he is being a little punk about it, but he knows the command. Once he is in, he will sleep for two hours or more.',
      '**When he cries in the crate, here is the rule:**',
      '- **Actively crying** means nonstop, no breaks in it. If you open the crate while he is doing that, the **only** thing you do is take him straight outside to potty. If he goes, pee or poop, bring him right back to the crate and close it up again. No play, no staying out.',
      '- **Why:** we do not want him learning that crying gets him out to play. We want him learning that crying gets him a potty trip. That is the whole thing.',
      '- **If he pauses for a minute or two**, he is fine to come out for good. He will be all cuddles. Take him out to potty and he can stay out.',
      'In practice he almost never does the nonstop version. Usually it is a minute or two, maybe three, and then he passes out for a few hours. If you know he has recently gone, he is just being a diva. Wait him out.',
    ],
  },
  {
    id: 'leaving',
    title: 'Leaving the house',
    paragraphs: [
      'Both dogs go to **daycare twice a week**:',
      '**Playtime Pet Resort** — 989 E Lancaster Ave, Downingtown, PA 19335 — 215-910-4991 — Open 7:00 AM to 8:00 PM weekdays.',
      'On the other days, coming home at lunch is ideal, and we will see how Bengt does.',
      'Before you leave, **take Bengt out to pee.** He poops twice a day now, and otherwise we just take him out to pee as often as we can.',
      'For containment, closing our bedroom door and giving them run of the house should be fine. We think they will do well with it.',
      '**Do not leave them more than 4 hours**, especially Bengt. Chloe can handle around 6.',
    ],
  },
  {
    id: 'expect',
    title: 'Things that will probably happen (and are fine)',
    paragraphs: [
      '**Chloe will get into the trash** if there is anything good-smelling in it. Then Bengt will happily shred whatever she pulls out. Easiest fix: take the trash out, or block the can with a chair.',
      '**Bengt will chew things he should not.** He is still a puppy. He has only ruined a couple of things so far, but the way to keep it that way is to keep your own belongings up and out of his reach. Leave plenty of his toys around and he will go for those instead.',
      '**Bengt will probably have a potty accident.** That is completely okay, do not worry about it. To minimize them, get him outside **right when he wakes up** and **right when he comes out of the crate**.',
      'His way of asking to go out is unfortunately subtle: he runs over to you and starts playing. Not the clearest signal in the world, but if he suddenly wants your attention, that is usually what it means.',
    ],
  },
];

export type ContactRow = { who: string; role: string; contact: string };
export const emergencyContacts: ContactRow[] = [
  { who: 'Ruth', role: 'Vet, lives across the street. Call first.', contact: '' },
  { who: 'East Bradford Veterinary', role: 'Our regular practice', contact: '' },
  { who: 'Vet down the street', role: 'Also knows the dogs', contact: '' },
  { who: 'Sweta', role: 'Primary backup person', contact: '' },
  { who: 'Jen', role: 'Neighbor', contact: '' },
];

export type HouseNote = { label: string; value: string };
export const houseNotes: HouseNote[] = [
  { label: 'Trash', value: 'Out **Thursday evening**, they come early Friday morning.' },
  { label: 'Packages', value: 'Delivered to the front door.' },
  { label: 'Plants', value: 'Watered before we leave. They will probably only need water toward the end of the two weeks. You have a good eye for this.' },
  { label: 'Thermostat', value: 'Currently on a day/night timer, roughly 74 and 76 upstairs. **Change the schedule, the temperature, whatever you like.** It swings warm and cold this time of year and we adjust it regularly, so please do the same.' },
  { label: 'Wifi', value: 'Password above.' },
];

export const reachUs: ContactRow[] = [
  { who: 'Patrik', role: '', contact: '' },
  { who: 'Megan', role: '', contact: '' },
  { who: 'WhatsApp', role: '', contact: 'Best way to reach us. Works over wifi, no international charges either direction.' },
];
