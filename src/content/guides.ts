export type GuideSection = {
  heading: string
  paragraphs: string[]
  list?: string[]
}

export type GuideTopic = 'Couples and money' | 'Saving' | 'Budgeting methods' | 'Banks and safety'

export type Guide = {
  slug: string
  topic: GuideTopic
  /** Short name used in the footer and on cards. */
  label: string
  /** Page title and h1 text. */
  title: string
  /** Part of the h1 shown in italics. Must appear inside `title`. */
  accent: string
  description: string
  lede: string
  sections: GuideSection[]
  faqs: { question: string; answer: string }[]
  published: string
  updated: string
}

import { moreGuides } from './guides-more'

const coreGuides: Guide[] = [
  {
    slug: 'budget-app-for-couples',
    topic: 'Couples and money',
    label: 'Budget app for couples',
    title: 'A budget app for couples that keeps your banks separate',
    accent: 'keeps your banks separate',
    description:
      'Wollie is a budget app for couples. Each of you connects your own bank, and Wollie puts them together in one household plan.',
    lede: 'Most couples do not want one joint account for everything. Wollie lets you keep your own banks and still see one plan.',
    sections: [
      {
        heading: 'What couples usually struggle with',
        paragraphs: [
          'Money talks go wrong when nobody can see the same numbers. One person checks one app, the other checks a spreadsheet, and the monthly chat turns into guessing.',
          'A joint account fixes that, but many couples do not want one. You may have different banks, different salaries, or simply prefer to keep part of your money your own.',
        ],
      },
      {
        heading: 'How Wollie works for two people',
        paragraphs: [
          'Each of you connects your own bank accounts. The connection is read-only, and you sign in at your own bank, so Wollie never sees your password and cannot move money.',
          'Then you plan together. You both see where the money goes, the monthly budgets, and the savings goals. Wollie combines both banks into one household view, and your bank logins stay private.',
        ],
        list: [
          'Spending sorted by category, so you can see what the month looked like.',
          'A monthly budget for each category, with a warning before you overspend.',
          'Savings goals with a fixed amount a month, ticked off when the money lands.',
          'Different banks for each of you, in one view.',
        ],
      },
      {
        heading: 'Who it is for',
        paragraphs: [
          'Wollie suits partners who want to be open about money without sharing every account. It also works on your own: you can start alone and invite your partner later.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Do we need a joint bank account to use Wollie?',
        answer: 'No. Each of you connects your own accounts, even at different banks. Wollie combines them into one household view, so you plan together without a joint account.',
      },
      {
        question: 'Can I use Wollie on my own?',
        answer: 'Yes. You can start alone and invite your partner later.',
      },
    ],
    published: '2026-10-18',
    updated: '2026-10-18',
  },
  {
    slug: 'budget-app-for-multiple-banks',
    topic: 'Banks and safety',
    label: 'Budget app for multiple banks',
    title: 'See all your banks in one budget app',
    accent: 'all your banks',
    description:
      'Connect more than one bank to Wollie and see your spending, budgets and savings in one place. The connection is read-only.',
    lede: 'If your money sits in two or three banks, one clear picture is hard to get. Wollie brings them together without touching your money.',
    sections: [
      {
        heading: 'Why one bank app is not enough',
        paragraphs: [
          'Every bank app shows only its own accounts. Add a second bank, a travel card, or a partner with a different bank, and you end up adding things up by hand.',
        ],
      },
      {
        heading: 'How the connection works',
        paragraphs: [
          'Wollie uses open banking. You pick your bank from the list, sign in at the bank, and say yes to read-only access. Wollie can look at your payments. It cannot make a payment or move your money.',
          'Support depends on your country, so check the bank list on the home page before you connect.',
        ],
      },
      {
        heading: 'What you see once the banks are connected',
        paragraphs: [],
        list: [
          'Every payment sorted by category, across all your banks.',
          'This month against last month, so you can see if you are spending more or less.',
          'Budgets for each category and savings goals for what matters.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can Wollie move my money?',
        answer: 'No. The bank link is read-only. Wollie cannot make payments or see your bank password.',
      },
      {
        question: 'What if my bank is not on the list?',
        answer: 'Banks depend on your country. If yours is not on the list, it is not supported yet.',
      },
    ],
    published: '2026-10-18',
    updated: '2026-10-18',
  },
  {
    slug: 'how-to-budget-as-a-couple',
    topic: 'Couples and money',
    label: 'How to budget as a couple',
    title: 'How to budget as a couple, step by step',
    accent: 'as a couple',
    description:
      'A simple way for two people to budget together: agree on the goal, split the bills, set category budgets and review once a month.',
    lede: 'You do not need a perfect system. You need the same numbers in front of both of you, and a short check-in once a month.',
    sections: [
      {
        heading: '1. Agree on what the money is for',
        paragraphs: [
          'Start with the goal, not the spreadsheet. A home, a trip, a safety cushion, paying off a loan. Pick two or three and say them out loud.',
        ],
      },
      {
        heading: '2. Decide how you share the bills',
        paragraphs: [
          'There is no single right split. Some couples split everything in half. Others split in proportion to income, so the person who earns less keeps a fair amount left over. Some use a joint account for shared bills and keep the rest separate.',
          'Pick one, write it down, and revisit it when your situation changes.',
        ],
      },
      {
        heading: '3. Look at a few months of real spending',
        paragraphs: [
          'Guessing is where budgets fail. Look at what you actually spent in the last two or three months, by category: groceries, transport, eating out, fun, shopping.',
        ],
      },
      {
        heading: '4. Set a budget for each category',
        paragraphs: [
          'Give every category a monthly limit based on what you really spend, then trim where you both agree. Keep the number of categories small, around five to eight.',
        ],
      },
      {
        heading: '5. Save first, with a fixed amount',
        paragraphs: [
          'Choose an amount for each goal and move it on payday. For example, €1,000 a month towards a home. Doing it right after the salary arrives is easier than saving what is left at the end of the month.',
        ],
      },
      {
        heading: '6. Check in once a month',
        paragraphs: [
          'Fifteen minutes is enough. What went over budget, what went under, and are the goals still on track. Then you are done until next month.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Should couples share a bank account?',
        answer:
          'It depends on what works for you. Some couples use one joint account for shared bills. Others keep separate accounts and plan together. Both work if you both see the same numbers.',
      },
      {
        question: 'How often should we review our budget?',
        answer: 'Once a month is enough for most couples, with a short look when something big changes.',
      },
    ],
    published: '2026-10-18',
    updated: '2026-10-18',
  },
  {
    slug: 'saving-for-a-house-as-a-couple',
    topic: 'Saving',
    label: 'Saving for a house together',
    title: 'Saving for a house as a couple',
    accent: 'a house',
    description:
      'How two people can save for a home together: set a target, pick a monthly amount, and keep going with a fixed transfer on payday.',
    lede: 'A home is a big number, so it helps to turn it into one small number: how much you set aside each month.',
    sections: [
      {
        heading: 'Start with a target and a date',
        paragraphs: [
          'Work out roughly how much you need for the deposit and costs, and when you would like to buy. Divide the target by the number of months. That is your monthly amount.',
          'For example, €36,000 over 36 months is €1,000 a month. If that is too much, extend the date or lower the target. A smaller amount you keep paying beats a big one you drop.',
        ],
      },
      {
        heading: 'Decide who puts in what',
        paragraphs: [
          'You can each put in the same amount, or an amount that matches your income. Agree on it once, so it does not come up every month.',
        ],
      },
      {
        heading: 'Pay it on payday',
        paragraphs: [
          'Move the money to a savings account as soon as your salary arrives, or set a standing order at your bank. Saving what is left over rarely works.',
        ],
      },
      {
        heading: 'How Wollie helps',
        paragraphs: [
          'Wollie cannot move money, and that is on purpose. You set the amount for the goal, you make the transfer at your bank, and Wollie sees the money arrive in savings and ticks the month off. You both see how far along you are.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much should we save each month for a house?',
        answer:
          'Divide your target by the number of months until you want to buy. Then check that the amount still leaves room for your normal budget.',
      },
      {
        question: 'Can Wollie move money into savings for us?',
        answer: 'No. You make the transfer yourselves. Wollie sees it arrive and ticks off the month.',
      },
    ],
    published: '2026-10-18',
    updated: '2026-10-18',
  },
  {
    slug: '50-30-20-rule',
    topic: 'Budgeting methods',
    label: 'The 50/30/20 rule',
    title: 'The 50/30/20 budget rule, explained',
    accent: '50/30/20',
    description:
      'The 50/30/20 rule splits your after-tax income into needs, wants and savings. Here is how it works and how to use it.',
    lede: 'A simple starting point: half for needs, thirty percent for wants, twenty percent for savings.',
    sections: [
      {
        heading: 'What the rule says',
        paragraphs: [
          'The 50/30/20 rule splits the money you take home after tax into three parts. Senator Elizabeth Warren and her daughter Amelia Warren Tyagi wrote about it in the 2005 book All Your Worth.',
        ],
        list: [
          '50% for needs: rent or mortgage, groceries, utilities, transport, insurance, minimum debt payments.',
          '30% for wants: eating out, hobbies, subscriptions, trips, shopping.',
          '20% for savings and extra debt payments.',
        ],
      },
      {
        heading: 'An example',
        paragraphs: [
          'If you take home €3,000 a month, that is €1,500 for needs, €900 for wants and €600 for savings.',
        ],
      },
      {
        heading: 'When it does not fit',
        paragraphs: [
          'In an expensive city, needs can take more than half. In that case, treat the rule as a guide and adjust the numbers. The point is to see the three groups clearly, not to hit exact percentages.',
        ],
      },
      {
        heading: 'Using it with Wollie',
        paragraphs: [
          'Wollie sorts your payments into categories. Look at last month, mark each category as a need or a want, and see where you land. Then set a monthly budget for each category and a fixed monthly amount for your savings goals.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is the 50/30/20 rule based on gross or net income?',
        answer: 'It uses your income after tax, the money that reaches your bank account.',
      },
      {
        question: 'What if I cannot save 20%?',
        answer: 'Start with what you can, even 5%, and raise it over time. A habit matters more than the exact number.',
      },
    ],
    published: '2026-10-18',
    updated: '2026-10-18',
  },
]

export const guides: Guide[] = [...coreGuides, ...moreGuides]

export const guideTopics: GuideTopic[] = ['Couples and money', 'Saving', 'Budgeting methods', 'Banks and safety']

export function getGuide(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug)
}
