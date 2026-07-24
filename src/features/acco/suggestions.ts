import { TrendingDown, PiggyBank, FileText, Calendar } from 'lucide-react'

// Starter prompts shown before the first user message.
export const SUGGESTED = [
  {
    label: 'Sole trader tax',
    icon: TrendingDown,
    q: 'How much tax and NI will I pay on £55,000 self-employed profit?',
  },
  {
    label: 'Dividend structure',
    icon: PiggyBank,
    q: 'What is the optimal salary/dividend split for a director in 2026/27?',
  },
  {
    label: 'Pension relief',
    icon: PiggyBank,
    q: 'How do SIPP contributions reduce my tax bill if I earn over £100,000?',
  },
  {
    label: 'MTD obligations',
    icon: Calendar,
    q: 'When are my quarterly MTD submissions due for 2026/27?',
  },
  {
    label: 'Allowable expenses',
    icon: FileText,
    q: 'What home office expenses can I claim as a sole trader?',
  },
  {
    label: 'Payment on account',
    icon: FileText,
    q: 'How does payment on account work and how do I reduce it?',
  },
]
