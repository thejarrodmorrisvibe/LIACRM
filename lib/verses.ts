/*
  Verse of the day — curated verses on encouragement, courage, renewing of the
  mind, perseverance, and character. One per day, rotating deterministically so
  it's stable for the whole day and changes daily.

  Translation: New Living Translation (NLT). Used within Tyndale's permission to
  quote up to 500 verses with attribution (see ATTRIBUTION below).
*/

export interface Verse {
  text: string;
  reference: string;
}

export const TRANSLATION = "NLT";
export const ATTRIBUTION =
  "Scripture quotations are taken from the Holy Bible, New Living Translation, copyright © 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers, Carol Stream, Illinois 60188. All rights reserved.";

export const VERSES: Verse[] = [
  { text: "This is my command—be strong and courageous! Do not be afraid or discouraged. For the LORD your God is with you wherever you go.", reference: "Joshua 1:9" },
  { text: "For I can do everything through Christ, who gives me strength.", reference: "Philippians 4:13" },
  { text: "Don't be afraid, for I am with you. Don't be discouraged, for I am your God. I will strengthen you and help you. I will hold you up with my victorious right hand.", reference: "Isaiah 41:10" },
  { text: "Don't copy the behavior and customs of this world, but let God transform you into a new person by changing the way you think.", reference: "Romans 12:2" },
  { text: "But those who trust in the LORD will find new strength. They will soar high on wings like eagles. They will run and not grow weary. They will walk and not faint.", reference: "Isaiah 40:31" },
  { text: "For God has not given us a spirit of fear and timidity, but of power, love, and self-discipline.", reference: "2 Timothy 1:7" },
  { text: "Trust in the LORD with all your heart; do not depend on your own understanding. Seek his will in all you do, and he will show you which path to take.", reference: "Proverbs 3:5-6" },
  { text: "So let's not get tired of doing what is good. At just the right time we will reap a harvest of blessing if we don't give up.", reference: "Galatians 6:9" },
  { text: "Be on guard. Stand firm in the faith. Be courageous. Be strong.", reference: "1 Corinthians 16:13" },
  { text: "The LORD is my light and my salvation—so why should I be afraid? The LORD is my fortress, protecting me from danger, so why should I tremble?", reference: "Psalm 27:1" },
  { text: "So be strong and courageous, all you who put your hope in the LORD!", reference: "Psalm 31:24" },
  { text: "And we know that God causes everything to work together for the good of those who love God and are called according to his purpose for them.", reference: "Romans 8:28" },
  { text: "Commit your actions to the LORD, and your plans will succeed.", reference: "Proverbs 16:3" },
  { text: "As iron sharpens iron, so a friend sharpens a friend.", reference: "Proverbs 27:17" },
  { text: "So, my dear brothers and sisters, be strong and immovable. Always work enthusiastically for the Lord, for you know that nothing you do for the Lord is ever useless.", reference: "1 Corinthians 15:58" },
  { text: "So be strong and courageous! Do not be afraid and do not panic before them. For the LORD your God will personally go ahead of you. He will neither fail you nor abandon you.", reference: "Deuteronomy 31:6" },
  { text: "Work willingly at whatever you do, as though you were working for the Lord rather than for people.", reference: "Colossians 3:23" },
  { text: "You will keep in perfect peace all who trust in you, all whose thoughts are fixed on you!", reference: "Isaiah 26:3" },
  { text: "God is our refuge and strength, always ready to help in times of trouble.", reference: "Psalm 46:1" },
  { text: "Fix your thoughts on what is true, and honorable, and right, and pure, and lovely, and admirable. Think about things that are excellent and worthy of praise.", reference: "Philippians 4:8" },
  { text: "And let us run with endurance the race God has set before us.", reference: "Hebrews 12:1" },
  { text: "“For I know the plans I have for you,” says the LORD. “They are plans for good and not for disaster, to give you a future and a hope.”", reference: "Jeremiah 29:11" },
  { text: "Seek the Kingdom of God above all else, and live righteously, and he will give you everything you need.", reference: "Matthew 6:33" },
  { text: "We can rejoice, too, when we run into problems and trials, for we know that they help us develop endurance.", reference: "Romans 5:3" },
  { text: "God blesses those who patiently endure testing and temptation. Afterward they will receive the crown of life that God has promised to those who love him.", reference: "James 1:12" },
  { text: "Don't be dejected and sad, for the joy of the LORD is your strength!", reference: "Nehemiah 8:10" },
  { text: "This means that anyone who belongs to Christ has become a new person. The old life is gone; a new life has begun!", reference: "2 Corinthians 5:17" },
  { text: "For I hold you by your right hand—I, the LORD your God. And I say to you, 'Don't be afraid. I am here to help you.'", reference: "Isaiah 41:13" },
  { text: "Commit everything you do to the LORD. Trust him, and he will help you.", reference: "Psalm 37:5" },
  { text: "O people, the LORD has told you what is good, and this is what he requires of you: to do what is right, to love mercy, and to walk humbly with your God.", reference: "Micah 6:8" },
  { text: "The faithful love of the LORD never ends! His mercies never cease. Great is his faithfulness; his mercies begin afresh each morning.", reference: "Lamentations 3:22-23" },
  { text: "Your word is a lamp to guide my feet and a light for my path.", reference: "Psalm 119:105" },
  { text: "Instead, let the Spirit renew your thoughts and attitudes.", reference: "Ephesians 4:23" },
  { text: "Wait patiently for the LORD. Be brave and courageous. Yes, wait patiently for the LORD.", reference: "Psalm 27:14" },
];

/** Deterministic verse for a given day — same all day, changes each day. */
export function verseForDay(date: Date = new Date()): Verse {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return VERSES[((dayIndex % VERSES.length) + VERSES.length) % VERSES.length];
}
