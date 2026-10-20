import type { Guide } from './guides'

const day = '2026-10-20'

export const guidesB: Guide[] = [
  {
    slug: 'saving-for-a-baby',
    topic: 'Saving',
    label: 'Budgeting for a baby',
    title: 'How to budget for a baby as a couple',
    accent: 'budget for a baby',
    description:
      'Plan your money for a baby: the one-off costs, the new monthly costs, and how to prepare your budget before the baby arrives.',
    lede: 'A baby changes your costs and often your income. A few months of planning makes it calmer.',
    sections: [
      {
        heading: 'Two kinds of cost',
        paragraphs: ['Separate the one-off costs from the new monthly costs.'],
        list: [
          'One-off: pram, car seat, cot, clothes, hospital or birth costs.',
          'Monthly: nappies, food, clothes, childcare, higher bills.',
          'Income: any leave, and how much your pay changes during it.',
        ],
      },
      {
        heading: 'Try the new budget early',
        paragraphs: [
          'Work out a budget for life with a baby and try living on it for a few months before the baby arrives. Put the difference into savings. You learn what is realistic, and you build a cushion.',
        ],
      },
      {
        heading: 'Plan together',
        paragraphs: [
          'Check the rules for leave and benefits where you live, and talk through how you will share costs while one or both of you earn less. Wollie shows the household view for both of you, so the plan is based on the same numbers.',
        ],
      },
    ],
    faqs: [
      {
        question: 'When should we start saving for a baby?',
        answer: 'As early as you can. Even a few months of extra saving gives you a buffer for the first year.',
      },
      {
        question: 'How much does a baby cost?',
        answer: 'It varies a lot by country and choices, especially childcare. Look at your own numbers and local costs rather than a general figure.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'zero-based-budget-explained',
    topic: 'Budgeting methods',
    label: 'Zero-based budget',
    title: 'The zero-based budget, explained simply',
    accent: 'zero-based budget',
    description:
      'In a zero-based budget every euro has a job. Here is how it works, who it suits and how to start.',
    lede: 'You give every euro a purpose, so your income minus your plan equals zero.',
    sections: [
      {
        heading: 'What it means',
        paragraphs: [
          'In a zero-based budget you assign all of your income to something: costs, savings, fun. When you have done this, there is nothing "left over" to disappear. The plan adds up to your income.',
          'It does not mean you spend everything. Savings count as a job for your money.',
        ],
      },
      {
        heading: 'How to do it',
        paragraphs: ['Do it once a month, before the month starts.'],
        list: [
          'Write down your income for the month.',
          'List fixed costs and give each a number.',
          'Add savings goals as lines.',
          'Share what is left across variable costs and fun.',
          'Check that income minus all lines is zero.',
        ],
      },
      {
        heading: 'Who it suits',
        paragraphs: [
          'It suits people who like control and want to stop wondering where the money went. It takes a bit more effort than rules like 50/30/20, but gives a clearer plan. In Wollie, set a monthly amount for each category and savings goal, and see the plan against real spending.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is a zero-based budget the same as spending everything?',
        answer: 'No. Saving is one of the jobs you give your money. The aim is that no money is unplanned.',
      },
      {
        question: 'What if my plan does not match reality?',
        answer: 'Adjust it. Look at what happened, change the numbers for next month, and keep going.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'envelope-budgeting-method',
    topic: 'Budgeting methods',
    label: 'Envelope budgeting',
    title: 'Envelope budgeting: how it works and how to do it digitally',
    accent: 'Envelope budgeting',
    description:
      'The envelope method gives each spending category a fixed amount. Here is how it works and how to use it without cash.',
    lede: 'Put a fixed amount in an envelope. When it is empty, you stop spending in that category.',
    sections: [
      {
        heading: 'The classic method',
        paragraphs: [
          'You take cash for each category, such as groceries or eating out, and put it in a labelled envelope. You pay from the envelope. When it is empty, that category is done until next month.',
          'It works because you can see and feel the limit.',
        ],
      },
      {
        heading: 'Doing it without cash',
        paragraphs: ['Most of us pay by card, so the digital version uses a monthly limit for each category instead.'],
        list: [
          'Choose the categories that tend to run away: eating out, shopping, fun.',
          'Set a monthly amount for each.',
          'Look at how much is left during the month.',
          'Stop or slow down when a category is nearly used.',
        ],
      },
      {
        heading: 'With Wollie',
        paragraphs: [
          'Wollie sorts your payments into categories and compares them to the budget you set. It warns you before you overspend, so each category works like an envelope without any cash.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does envelope budgeting work for couples?',
        answer: 'Yes. Agree on a limit for each shared category, and give each person a personal envelope.',
      },
      {
        question: 'Which categories should be envelopes?',
        answer: 'The ones that vary and tend to run over, like groceries, eating out and shopping. Fixed bills do not need one.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'how-to-track-your-spending',
    topic: 'Budgeting methods',
    label: 'How to track your spending',
    title: 'How to track your spending without a spreadsheet',
    accent: 'without a spreadsheet',
    description:
      'Three simple ways to track what you spend, from a notebook to automatic tracking with a connected bank.',
    lede: 'You cannot change what you cannot see. Here are three ways to see it, from slow to automatic.',
    sections: [
      {
        heading: 'Three ways to track',
        paragraphs: ['Pick the one you will really use.'],
        list: [
          'By hand: write each purchase in a notebook or notes app. It is accurate but easy to forget.',
          'Spreadsheet: copy payments from your bank statement. Flexible, but it takes time each month.',
          'Connected bank: an app reads your payments automatically and sorts them into categories.',
        ],
      },
      {
        heading: 'What to look at',
        paragraphs: [
          'Do not try to review every payment. Look at the totals for each category and compare them to last month. The changes are where the answers are.',
        ],
      },
      {
        heading: 'Automatic and read-only',
        paragraphs: [
          'Wollie connects to your bank with a read-only link. You sign in at your own bank, so Wollie never sees your password and cannot move money. Your payments are sorted by category, so the tracking is done before you open the app.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How long should I track my spending?',
        answer: 'Three months gives you a clear picture. After that, a monthly look is enough.',
      },
      {
        question: 'Is automatic tracking accurate?',
        answer: 'It follows your real bank payments, so it is usually more complete than manual notes. You can still check categories that look wrong.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'find-and-cancel-forgotten-subscriptions',
    topic: 'Budgeting methods',
    label: 'Cancel forgotten subscriptions',
    title: 'How to find and cancel forgotten subscriptions',
    accent: 'forgotten subscriptions',
    description:
      'Small monthly charges add up. Here is how to find every subscription you pay for and decide which to keep.',
    lede: 'Small charges are easy to forget and add up over a year. A twenty-minute review often pays for itself.',
    sections: [
      {
        heading: 'Find them all',
        paragraphs: ['Look through the last three months of payments for anything that repeats.'],
        list: [
          'Streaming, music and games.',
          'Apps and cloud storage.',
          'Gym and clubs.',
          'Newsletters, news and magazines.',
          'Free trials that quietly turned into paid plans.',
        ],
      },
      {
        heading: 'Decide what to keep',
        paragraphs: [
          'For each one, ask: did I use it in the last month? Would I sign up again today? If not, cancel it. You can always come back later.',
          'Do the sum for a year. A €9.99 charge every month is nearly €120.',
        ],
      },
      {
        heading: 'Make it a habit',
        paragraphs: [
          'Review again every few months. Since Wollie sorts your payments by category, you can see your subscription total at a glance and notice when it creeps up.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How do I stop a free trial from charging me?',
        answer: 'Set a reminder for a day before the trial ends, and cancel in the service\'s settings.',
      },
      {
        question: 'Should couples share subscriptions?',
        answer: 'Where the terms allow it, a shared plan can cost less than two. Check the rules of each service.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'grocery-budget-for-two',
    topic: 'Budgeting methods',
    label: 'Grocery budget for two',
    title: 'How to set a grocery budget for two',
    accent: 'grocery budget',
    description:
      'Work out a realistic grocery budget for two people, and a few simple habits to keep to it without feeling restricted.',
    lede: 'Food is usually the biggest cost you can change from month to month. Start with what you really spend.',
    sections: [
      {
        heading: 'Start with your real number',
        paragraphs: [
          'Look at the last three months of grocery payments and take the average. That is your starting point, not a target someone else set.',
          'Keep eating out and takeaway as a separate line, so you can see each one clearly.',
        ],
      },
      {
        heading: 'Small habits that help',
        paragraphs: ['You do not need to eat differently to spend less.'],
        list: [
          'Plan a few dinners for the week before you shop.',
          'Shop with a list, and not when hungry.',
          'Use up what you have before buying more.',
          'Compare unit prices, not package prices.',
        ],
      },
      {
        heading: 'Set a limit, then watch it',
        paragraphs: [
          'Choose a monthly amount that is a little below your average, and see how the month goes. Wollie shows your grocery spending against the budget during the month, so you can adjust before the end.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How much should two people spend on groceries?',
        answer: 'It depends on where you live and how you eat. Use your own average from the last three months as the starting point.',
      },
      {
        question: 'Should eating out be part of the grocery budget?',
        answer: 'Keep it separate. It lets you see each cost clearly and decide which matters more.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'what-is-open-banking',
    topic: 'Banks and safety',
    label: 'What is open banking',
    title: 'What is open banking, and how does it work?',
    accent: 'open banking',
    description:
      'Open banking lets you share your bank data with an app of your choice, safely. Here is how it works and what it means for you.',
    lede: 'Open banking is a way to let an app see your bank payments, with your permission, without giving it your password.',
    sections: [
      {
        heading: 'The short version',
        paragraphs: [
          'Open banking is a set of rules that lets you share your bank data with other services, if you choose to. In Europe these rules come from a law called PSD2.',
          'Instead of giving an app your login, you sign in at your own bank and say what the app may see. The bank then shares that data securely.',
        ],
      },
      {
        heading: 'What you control',
        paragraphs: ['You decide what is shared and for how long.'],
        list: [
          'You sign in only at your own bank.',
          'You choose which accounts to share.',
          'Access can be read-only, so an app can look but not pay.',
          'You can stop sharing at any time.',
        ],
      },
      {
        heading: 'How Wollie uses it',
        paragraphs: [
          'Wollie uses a read-only link. It can see your payments to sort them and compare them to your budget. It cannot make a payment or move your money. Which banks work depends on your country, so check the list on the Wollie home page before you connect.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is open banking safe?',
        answer: 'It is designed so you never share your bank password with the app. You sign in at your bank and choose what to share.',
      },
      {
        question: 'Can an app move my money through open banking?',
        answer: 'Only if you give permission for payments. Wollie asks only for read-only access and cannot move money.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'is-it-safe-to-connect-your-bank-to-a-budget-app',
    topic: 'Banks and safety',
    label: 'Is it safe to connect your bank',
    title: 'Is it safe to connect your bank to a budget app?',
    accent: 'safe to connect your bank',
    description:
      'What to check before you connect a bank to a budgeting app: read-only access, where you sign in, and how to disconnect.',
    lede: 'It can be safe, if the connection works the right way. Here is what to check.',
    sections: [
      {
        heading: 'What a safe connection looks like',
        paragraphs: ['Check these before you connect any app to your bank.'],
        list: [
          'You sign in on your own bank\'s page, never in the app.',
          'Access is read-only, so the app can look but not pay.',
          'The app tells you clearly what it can see.',
          'You can disconnect at any time.',
        ],
      },
      {
        heading: 'Red flags',
        paragraphs: [
          'Be careful with any app that asks for your bank password or card PIN directly. A proper connection never needs them.',
          'Also be careful with an app that will not say who it works with or how it stores your data.',
        ],
      },
      {
        heading: 'How Wollie does it',
        paragraphs: [
          'You sign in at your own bank, so Wollie never sees your password. The link is read-only: Wollie can look at your payments, and cannot make a payment or move your money. You can end the connection whenever you like.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Can a budget app empty my account?',
        answer: 'Not with a read-only connection. Read-only access lets an app look at payments but not make any.',
      },
      {
        question: 'How do I disconnect my bank?',
        answer: 'You can stop the connection in the app, and you can also remove the permission from your bank.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'pay-off-debt-as-a-couple',
    topic: 'Couples and money',
    label: 'Paying off debt as a couple',
    title: 'How to pay off debt as a couple',
    accent: 'pay off debt',
    description:
      'A clear plan to pay off debt together: list it all, choose snowball or avalanche, and stay on track month by month.',
    lede: 'Debt feels lighter when you face it together with a plan. Here are the steps.',
    sections: [
      {
        heading: 'Put it all on the table',
        paragraphs: ['List every debt, with the amount left, the interest rate and the minimum payment. Include each person\'s own debts. Seeing the whole picture is the first step.'],
      },
      {
        heading: 'Pick a method',
        paragraphs: ['Both of these work. Choose the one you will keep up.'],
        list: [
          'Avalanche: pay the debt with the highest interest first. It costs the least overall.',
          'Snowball: pay the smallest debt first. The quick wins can keep you motivated.',
          'Either way: pay the minimum on all of them, and put every extra euro on the one you chose.',
        ],
      },
      {
        heading: 'Make room in the budget',
        paragraphs: [
          'Find the extra by looking at your categories and subscriptions, then set it as a fixed monthly amount. Wollie shows your spending by category and your goals together, so you can see the amount you free up and track the month.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Should we pay off debt or save first?',
        answer: 'Many people build a small emergency fund first, then pay off debt, then grow savings. Your own situation and interest rates matter, so consider advice if you are unsure.',
      },
      {
        question: 'Are we responsible for each other\'s debt?',
        answer: 'It depends on the country, whether you are married, and whether you signed for the debt together. Check the rules where you live.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'how-much-rent-can-you-afford',
    topic: 'Budgeting methods',
    label: 'How much rent you can afford',
    title: 'How much rent can you afford as a couple?',
    accent: 'rent can you afford',
    description:
      'A simple way to work out how much rent you can afford, using your take-home pay and the rest of your budget.',
    lede: 'Rent is usually your biggest cost. Here is a simple way to find a number that still leaves room to live.',
    sections: [
      {
        heading: 'A rule of thumb',
        paragraphs: [
          'A common guide is to keep housing to around 30% of your take-home pay. It is only a rule of thumb. In expensive cities it can be hard to reach, and in cheaper places you might spend less.',
        ],
      },
      {
        heading: 'A better way to check',
        paragraphs: ['Work from the whole budget, not just one rule.'],
        list: [
          'Add both take-home pays.',
          'Subtract savings you want to keep making.',
          'Subtract other fixed costs: bills, insurance, transport.',
          'Subtract a realistic amount for food and fun.',
          'What is left is the most you can put into housing.',
        ],
      },
      {
        heading: 'Test it before you sign',
        paragraphs: [
          'Try paying the new rent into a savings goal for a couple of months before you move. You see if it fits, and you keep the money. Wollie shows both incomes and both banks together, so you can test the numbers as a household.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Should rent be based on gross or take-home pay?',
        answer: 'Take-home pay is the better base, because it is the money you really have each month.',
      },
      {
        question: 'Should we count utilities in the housing cost?',
        answer: 'Yes. Include rent and the bills that come with the home, so you compare the true cost.',
      },
    ],
    published: day,
    updated: day,
  },
  {
    slug: 'how-to-budget-in-your-first-year-living-together',
    topic: 'Couples and money',
    label: 'First year living together',
    title: 'Your first year living together: a simple money plan',
    accent: 'first year living together',
    description:
      'Moving in together? Here is how to share costs, set up your accounts and agree on the money basics in your first year.',
    lede: 'Moving in together changes your money. A short setup in the first month saves a lot of confusion later.',
    sections: [
      {
        heading: 'Agree on the basics early',
        paragraphs: ['Have one calm conversation in the first weeks and settle the main points.'],
        list: [
          'Which costs are shared, and which stay personal.',
          'How you split shared costs.',
          'Who pays what, and when.',
          'What counts as a big purchase you decide together.',
        ],
      },
      {
        heading: 'Set up the routine',
        paragraphs: [
          'Choose a day each month to look at the shared costs and savings together. Keep it short. If one of you does all the paying, switch roles now and then, so you both know how things work.',
        ],
      },
      {
        heading: 'Use one view',
        paragraphs: [
          'You do not need to merge your banks. Each of you connects your own accounts to Wollie, and you see one household plan for rent, bills and goals. Start with a small savings goal for something you want to do together.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Should we open a joint account when we move in together?',
        answer: 'It is a choice, not a rule. Many couples keep their own accounts and agree how to cover the shared costs.',
      },
      {
        question: 'How do we handle the deposit and moving costs?',
        answer: 'Decide up front who pays what, and whether it is split equally or by income. Write it down so you both remember.',
      },
    ],
    published: day,
    updated: day,
  },
]
