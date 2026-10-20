import type { Guide } from './guides'

const day = '2026-10-20'

export const guidesA: Guide[] = [
  {
    slug: 'how-to-talk-about-money-with-your-partner',
    topic: 'Couples and money',
    label: 'Talking about money as a couple',
    title: 'How to talk about money with your partner without a fight',
    accent: 'without a fight',
    description:
      'A calm way to start the money talk with your partner: when to have it, what to say, and how to keep it short and kind.',
    lede: 'Money talks go wrong when they start in the middle of a bad moment. A little setup makes them easy.',
    sections: [
      {
        heading: 'Pick the moment',
        paragraphs: [
          'Do not start it when one of you is stressed, tired or in the middle of a bill. Choose a calm time and say what it is for: "Can we look at our month together on Sunday? Twenty minutes."',
          'A short, planned chat works better than a long, surprise one.',
        ],
      },
      {
        heading: 'Start with the same numbers',
        paragraphs: [
          'Most fights are really about different pictures of the same month. Before you talk, look at the same list of payments, so nobody has to guess or defend.',
          'Start with what happened, not who did it. "We spent more on eating out this month" lands softer than "you keep ordering food".',
        ],
        list: [
          'What came in and what went out.',
          'Which categories were higher or lower than usual.',
          'One thing you are happy about.',
          'One thing you want to change next month.',
        ],
      },
      {
        heading: 'Agree on one small step',
        paragraphs: [
          'End with one decision you both agree on, such as a monthly limit for one category or a fixed amount for a goal. Write it down. Small and clear beats big and vague.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How often should couples talk about money?',
        answer: 'A short monthly check-in is enough for most couples. Add a quick chat before any big purchase.',
      },
      {
        question: 'What if one of us does not like talking about money?',
        answer: 'Keep it short, use the same numbers for both of you, and focus on one small decision. A calm routine makes it easier over time.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'how-to-split-expenses-fairly-as-a-couple',
    topic: 'Couples and money',
    label: 'Splitting expenses fairly',
    title: 'How to split expenses fairly as a couple',
    accent: 'fairly',
    description:
      'Split 50/50, split by income, or put everything in one pot? Here is how each way works and how to choose.',
    lede: 'Fair does not always mean equal. Here are the three common ways couples split costs.',
    sections: [
      {
        heading: 'Three common ways to split',
        paragraphs: ['There is no single right answer. Pick the one that feels fair to both of you, and check it again once a year.'],
        list: [
          'Half each: simple, and works well when you earn about the same.',
          'By income: each pays the same share of their pay. If one earns twice as much, that person pays twice as much of the shared costs.',
          'One pot: you both put money into a shared pot for household costs, and keep the rest as your own.',
        ],
      },
      {
        heading: 'A quick example',
        paragraphs: [
          'Shared costs are €2,000 a month. One of you takes home €3,000 and the other €1,000. Half each means €1,000 each, which is a third of one income and the whole of the other. By income, you pay €1,500 and €500, which is half of each income.',
        ],
      },
      {
        heading: 'Make it easy to keep up',
        paragraphs: [
          'Decide which costs are shared (rent, groceries, utilities) and which are personal. Then look at the shared costs together each month, so nobody has to keep a tally. Wollie shows both of your banks in one household view, so you see the shared numbers without opening a joint account.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is it fair to split bills 50/50 if we earn different amounts?',
        answer: 'It can be, but many couples find splitting by income feels fairer. What matters is that both of you agree and that it still feels right as things change.',
      },
      {
        question: 'Do we need a joint account to split costs?',
        answer: 'No. You can each pay your share from your own account, or move a set amount into a shared pot each month.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'joint-account-or-separate-accounts',
    topic: 'Couples and money',
    label: 'Joint or separate accounts',
    title: 'Joint account or separate accounts: which is better for couples?',
    accent: 'which is better for couples?',
    description:
      'The pros and cons of a joint account, separate accounts, and a mix of both, so you can choose what suits your relationship.',
    lede: 'Both can work. The best setup is the one you will actually keep using.',
    sections: [
      {
        heading: 'A joint account',
        paragraphs: ['One account for shared costs, or for everything.'],
        list: [
          'Good: everything is in one place and easy to see.',
          'Good: no need to move money back and forth.',
          'Harder: less privacy, and you need to agree on most spending.',
        ],
      },
      {
        heading: 'Separate accounts',
        paragraphs: ['Each keeps their own bank and pays their share of the costs.'],
        list: [
          'Good: independence and privacy.',
          'Good: no change to what you already have.',
          'Harder: it is easy to lose track of the shared picture.',
        ],
      },
      {
        heading: 'A mix, and how to see it as one',
        paragraphs: [
          'Many couples keep their own accounts and add a small shared account for rent and bills. Whatever you choose, the real need is the same: seeing one household plan.',
          'With Wollie you can keep separate banks and still see everything together, so the choice of accounts does not decide how well you plan.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Should married couples have a joint account?',
        answer: 'There is no rule. Some married couples have one, some keep separate accounts, and many use both. Choose what you are both comfortable with.',
      },
      {
        question: 'Can we plan together with separate accounts?',
        answer: 'Yes. Wollie combines each partner\'s own accounts into one household view.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'budgeting-on-an-irregular-income',
    topic: 'Budgeting methods',
    label: 'Budgeting on an irregular income',
    title: 'How to budget on an irregular income',
    accent: 'irregular income',
    description:
      'If your pay changes from month to month, here is a simple way to budget: plan on your lowest months and save the extra.',
    lede: 'When your income moves around, the trick is to plan for the quiet months and treat the good ones as a bonus.',
    sections: [
      {
        heading: 'Start from your lowest months',
        paragraphs: [
          'Look back over the last six to twelve months and find your lowest normal month. Build your budget on that number. Anything above it is extra.',
        ],
      },
      {
        heading: 'Pay yourself a steady amount',
        paragraphs: [
          'In a good month, do not spend the extra. Move it to a buffer, then pay yourself a steady amount each month from that buffer, so your life feels regular even when your income is not.',
        ],
        list: [
          'Cover fixed costs first: rent, bills, insurance.',
          'Set aside tax if it is not taken for you.',
          'Fill a buffer of a few months of costs.',
          'Only then spend or save the rest.',
        ],
      },
      {
        heading: 'Keep an eye on the month',
        paragraphs: [
          'With a changing income, a quick look at where the month stands matters more. Wollie shows spending by category against your monthly budget, so you notice early when a month is running high.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How big should my buffer be if my income changes?',
        answer: 'Many people aim for several months of basic costs. Start with one month and build up.',
      },
      {
        question: 'Should I save a percentage or a fixed amount?',
        answer: 'A percentage of every payment you receive works well for changing income. Move it as soon as the money arrives.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'household-budget-template',
    topic: 'Budgeting methods',
    label: 'Household budget template',
    title: 'A simple household budget template for two',
    accent: 'household budget template',
    description:
      'A plain monthly household budget you can copy: the categories to include, how to fill it in, and how to keep it up to date.',
    lede: 'A good budget is short. Here are the lines most households need.',
    sections: [
      {
        heading: 'The lines to include',
        paragraphs: ['Start with these and remove what you do not need.'],
        list: [
          'Income: both pay slips, and anything regular on the side.',
          'Housing: rent or mortgage, utilities, home insurance.',
          'Food: groceries, and eating out as its own line.',
          'Transport: public transport, fuel, car costs.',
          'Health and insurance.',
          'Subscriptions and phone.',
          'Fun and personal spending for each of you.',
          'Savings goals: home, trips, a buffer.',
        ],
      },
      {
        heading: 'How to fill it in',
        paragraphs: [
          'Look at the last two or three months of real payments, not your memory. Put the average next to each line. Then adjust the numbers you want to change.',
          'Leave room for the unexpected: a small "everything else" line stops a normal month from feeling like a failure.',
        ],
      },
      {
        heading: 'Skip the spreadsheet',
        paragraphs: [
          'A spreadsheet works until you stop updating it. Wollie reads your payments from your bank and sorts them into categories, so the real numbers are already there. You set the monthly amount for each category and see how the month is going.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How many categories should a budget have?',
        answer: 'Eight to twelve is plenty. Too many categories makes it hard to keep up.',
      },
      {
        question: 'Should each partner have personal spending money?',
        answer: 'Many couples set a small personal amount for each person, with no questions asked. It prevents small arguments.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'money-dates-for-couples',
    topic: 'Couples and money',
    label: 'Money dates for couples',
    title: 'Money dates: a 20-minute monthly check-in for couples',
    accent: 'monthly check-in',
    description:
      'How to run a short monthly money date with your partner: a simple agenda, the numbers to look at and how to keep it positive.',
    lede: 'A money date is a short, regular chat about your shared plan. Twenty minutes a month is enough.',
    sections: [
      {
        heading: 'Make it a habit',
        paragraphs: [
          'Pick a fixed day, such as the first Sunday of the month, and keep it short. Add a coffee. A routine you look forward to is a routine you keep.',
        ],
      },
      {
        heading: 'A simple agenda',
        paragraphs: ['Follow the same five steps each time.'],
        list: [
          'Look back: how did last month go against the plan?',
          'Celebrate one thing that went well.',
          'Look at your savings goals: are you on track?',
          'Look ahead: any big costs coming up?',
          'Agree on one change for next month.',
        ],
      },
      {
        heading: 'Keep it positive',
        paragraphs: [
          'Talk about the plan, not about blame. If you both see the same numbers, there is less to argue about. Wollie gives you both one shared view of the month, so the date can be about decisions instead of finding information.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How long should a money date take?',
        answer: 'About twenty minutes. If it takes much longer, you are probably covering too much at once.',
      },
      {
        question: 'What should we do if we disagree?',
        answer: 'Write down both views, pick one small thing to try for a month, and look at the result next time.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'how-much-emergency-fund-do-you-need',
    topic: 'Saving',
    label: 'How big an emergency fund',
    title: 'How big should your emergency fund be?',
    accent: 'emergency fund',
    description:
      'How much to keep for emergencies, how to work out your number, and how to build it a little at a time.',
    lede: 'An emergency fund is money you keep only for surprises. Here is how to choose the amount.',
    sections: [
      {
        heading: 'A common rule of thumb',
        paragraphs: [
          'Many advisers suggest keeping three to six months of essential costs. Essential costs are the things you must pay: housing, food, utilities, insurance, transport and minimum debt payments.',
          'It is a guide, not a law. Two incomes, a secure job and no children may need less. One income, a variable income or a family may need more.',
        ],
      },
      {
        heading: 'Work out your number',
        paragraphs: ['Add up your essential monthly costs, then multiply by the number of months you want to cover.'],
        list: [
          'Essential costs per month: for example €2,400.',
          'Months to cover: for example 3.',
          'Target: €7,200.',
        ],
      },
      {
        heading: 'Build it in small steps',
        paragraphs: [
          'Start with one month of costs, then keep going. Set a fixed amount each month and keep it in an account you can reach but will not touch for everyday spending. In Wollie, make it a savings goal with a monthly amount and see it ticked off when the money lands.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Where should I keep my emergency fund?',
        answer: 'In an easy-to-reach savings account, separate from your everyday account, so you are not tempted to spend it.',
      },
      {
        question: 'Do couples need one fund or two?',
        answer: 'Either works. One shared fund is simpler, and each partner can also keep a small personal one.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'saving-for-a-wedding',
    topic: 'Saving',
    label: 'Saving for a wedding',
    title: 'How to save for a wedding together',
    accent: 'save for a wedding',
    description:
      'A simple plan to save for your wedding: set the budget, choose the date, split the saving and track it month by month.',
    lede: 'Weddings feel big because the cost arrives all at once. Saving a fixed amount each month makes it calm.',
    sections: [
      {
        heading: 'Start with a number and a date',
        paragraphs: [
          'Decide what you can afford before you decide what you want. Agree on a total, then pick a date. Divide the total by the number of months until then.',
          'For example, €12,000 over 24 months is €500 a month.',
        ],
      },
      {
        heading: 'Decide who pays what',
        paragraphs: ['Agree how the saving is shared, and whether family is contributing. Write it down so there are no surprises.'],
        list: [
          'Total budget and what is in it.',
          'Your monthly saving, and how it is split between you.',
          'Any money from family, and when it arrives.',
          'A small buffer, because costs often rise.',
        ],
      },
      {
        heading: 'Track it as a goal',
        paragraphs: [
          'Set it up as a savings goal in Wollie with a fixed monthly amount. You both see the progress, and the month is ticked off when the money lands in your savings.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How far ahead should we start saving for a wedding?',
        answer: 'As early as you can. Twelve to twenty-four months gives you time to spread the cost.',
      },
      {
        question: 'Should we use credit to pay for a wedding?',
        answer: 'It is safer to plan the wedding around what you can save. If you borrow, be sure you both understand the monthly cost.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'sinking-funds-explained',
    topic: 'Saving',
    label: 'Sinking funds explained',
    title: 'Sinking funds explained: save for big costs a little at a time',
    accent: 'Sinking funds',
    description:
      'A sinking fund is money you set aside each month for a known future cost. Here is how to use them for holidays, gifts, repairs and more.',
    lede: 'Some costs are not surprises, they are just not monthly. A sinking fund turns them into a small monthly amount.',
    sections: [
      {
        heading: 'What a sinking fund is',
        paragraphs: [
          'A sinking fund is a pot of money for a cost you know is coming: car insurance, a holiday, birthdays, a boiler service. You save a little every month, so the bill is already covered when it arrives.',
        ],
      },
      {
        heading: 'How to work it out',
        paragraphs: ['Take the cost and divide it by the months until it is due.'],
        list: [
          'Car insurance of €600 due in 12 months: €50 a month.',
          'A €1,800 holiday in 9 months: €200 a month.',
          'Gifts and holidays of €480 a year: €40 a month.',
        ],
      },
      {
        heading: 'Keep them visible',
        paragraphs: [
          'The idea only works if you can see each pot. In Wollie each one is a savings goal with its own monthly amount, so you can see which ones are on track.',
        ],
      },
    ],
    faqs: [
      {
        question: 'What is the difference between a sinking fund and an emergency fund?',
        answer: 'A sinking fund is for costs you know are coming. An emergency fund is for surprises.',
      },
      {
        question: 'How many sinking funds should I have?',
        answer: 'Start with the two or three costs that hurt most when they arrive, then add more as you get used to it.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'saving-for-a-holiday-together',
    topic: 'Saving',
    label: 'Saving for a holiday',
    title: 'How to save for a holiday together',
    accent: 'save for a holiday',
    description:
      'Plan and save for a trip as a couple: set the total, split it by month, and keep spending money separate from the booking.',
    lede: 'A holiday is easier to enjoy when it is already paid for. Here is a simple way to get there.',
    sections: [
      {
        heading: 'Add up the whole trip',
        paragraphs: ['Count more than flights and a hotel. Many trips cost more than people expect because of the small things.'],
        list: [
          'Travel and getting around.',
          'Where you stay.',
          'Food and drink.',
          'Activities and tickets.',
          'Insurance and a small buffer.',
        ],
      },
      {
        heading: 'Turn it into a monthly amount',
        paragraphs: [
          'Divide the total by the months left. If the trip costs €2,400 and you leave in eight months, that is €300 a month between you. If it feels too high, pick a later date or a cheaper plan.',
        ],
      },
      {
        heading: 'Keep it separate',
        paragraphs: [
          'Put the money in a pot you do not touch for everyday costs. In Wollie, make it a savings goal so you both see it growing, and you can enjoy the trip without checking your balance.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much should we save for spending money on a trip?',
        answer: 'Set a daily amount for food, activities and extras, multiply by the number of days, and add a small buffer.',
      },
      {
        question: 'Should we pay for the holiday on credit?',
        answer: 'It is calmer to save first. Paying later can turn a one-week trip into months of payments.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'pay-yourself-first',
    topic: 'Saving',
    label: 'Pay yourself first',
    title: 'Pay yourself first: the easiest way to save every month',
    accent: 'Pay yourself first',
    description:
      'Pay yourself first means saving on payday, before you spend. Here is how to set it up so saving happens by itself.',
    lede: 'Most people save what is left. People who save well save first, and spend what is left.',
    sections: [
      {
        heading: 'The idea',
        paragraphs: [
          'When you save what is left at the end of the month, there is often nothing left. Pay yourself first reverses it: on payday, you move your savings amount straight away, and live on the rest.',
        ],
      },
      {
        heading: 'How to set it up',
        paragraphs: ['Make it automatic so you do not have to decide each month.'],
        list: [
          'Choose a monthly amount for each goal.',
          'Pick the day your pay arrives.',
          'Set up a standing order at your bank for that day.',
          'Check once a month that it arrived.',
        ],
      },
      {
        heading: 'How Wollie helps',
        paragraphs: [
          'Wollie cannot move your money, and that is on purpose. You choose the amount for each goal, and set up the standing order at your bank. Wollie sees it arrive and ticks the month off, so you can see at a glance whether you are on track.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much should I pay myself first?',
        answer: 'Start with what feels easy, even 5% of your pay, and raise it when you can.',
      },
      {
        question: 'Why not just save what is left?',
        answer: 'Because spending tends to grow to fill the month. Saving first protects the goal.',
      },
    ],
    published: day,
    updated: day,
  },
]
