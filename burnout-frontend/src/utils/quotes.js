// Contextual motivational quotes for the Burnout AI app
// Organized by burnout level and general wellness themes

export const QUOTES = {
  High: [
    { text: "You don't have to be positive all the time. It's perfectly okay to feel sad, angry, annoyed, frustrated, scared, or anxious. Having feelings doesn't make you a negative person. It makes you human.", author: "Lori Deschene" },
    { text: "Rest when you're weary. Refresh and renew yourself, your body, your mind, your spirit. Then get back to work.", author: "Ralph Marston" },
    { text: "Almost everything will work again if you unplug it for a few minutes — including you.", author: "Anne Lamott" },
    { text: "You are allowed to be both a masterpiece and a work in progress simultaneously.", author: "Sophia Bush" },
    { text: "Self-care is not self-indulgence, it is self-preservation.", author: "Audre Lorde" },
    { text: "Be gentle with yourself. You are a child of the universe, no less than the trees and the stars.", author: "Max Ehrmann" },
    { text: "You can't pour from an empty cup. Take care of yourself first.", author: "Unknown" },
    { text: "Healing is not linear. Some days will feel harder than others, and that's okay.", author: "Unknown" },
  ],
  Medium: [
    { text: "Progress, not perfection, is the goal.", author: "Unknown" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Small steps every day add up to big changes over time.", author: "Unknown" },
    { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { text: "One step at a time is all it takes to get you there.", author: "Emily Dickinson" },
    { text: "It's okay to slow down. You're not behind — you're on your own path.", author: "Unknown" },
    { text: "You've survived 100% of your worst days so far.", author: "Unknown" },
    { text: "Stress is caused by being 'here' but wanting to be 'there'.", author: "Eckhart Tolle" },
  ],
  Low: [
    { text: "Keep going. Your hardest times often lead to the greatest moments of your life.", author: "Roy T. Bennett" },
    { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Your wellbeing is your superpower. Protect it.", author: "Unknown" },
    { text: "Balance is not something you find. It's something you create.", author: "Jana Kingsford" },
    { text: "Healthy mind, healthy life. You're doing it right.", author: "Unknown" },
    { text: "The groundwork of all happiness is health.", author: "Leigh Hunt" },
  ],
  general: [
    { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
    { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
    { text: "Your mental health is a priority. Your happiness is an essential. Your self-care is a necessity.", author: "Unknown" },
    { text: "Breathe. You're going to be okay. Breathe and remember you've been in this place before.", author: "Daniell Koepke" },
    { text: "Every day may not be good, but there is something good in every day.", author: "Alice Morse Earle" },
    { text: "You are stronger than you think.", author: "Unknown" },
    { text: "The only way out is through.", author: "Robert Frost" },
    { text: "Stars can't shine without darkness.", author: "Unknown" },
    { text: "You are enough, just as you are.", author: "Meghan Markle" },
    { text: "Tough times never last, but tough people do.", author: "Robert H. Schuller" },
  ],
};

/**
 * Get a quote for the given burnout level.
 * Rotates based on the day so it changes daily but is consistent within a session.
 */
export function getDailyQuote(level = "general") {
  const pool = [
    ...(QUOTES[level] || []),
    ...QUOTES.general,
  ];
  const dayIndex = Math.floor(Date.now() / 86400000); // changes each day
  return pool[dayIndex % pool.length];
}

/**
 * Get a random quote from the pool for the given level.
 */
export function getRandomQuote(level = "general") {
  const pool = [...(QUOTES[level] || []), ...QUOTES.general];
  return pool[Math.floor(Math.random() * pool.length)];
}
