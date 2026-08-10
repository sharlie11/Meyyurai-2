export interface HelplineItem {
  id: string;
  name: string;
  number: string;
  category: 'national' | 'women' | 'child' | 'senior' | 'cyber' | 'legal';
  description: string;
  availableHours: string;
}

export const HELPLINES: HelplineItem[] = [
  {
    id: '1',
    name: 'National Emergency Response System',
    number: '112',
    category: 'national',
    description: 'Single emergency number for Police, Fire, and Ambulance service across India.',
    availableHours: '24x7 Toll Free',
  },
  {
    id: '2',
    name: 'Women Helpline',
    number: '1091',
    category: 'women',
    description: 'Direct emergency helpline for women in distress, domestic violence, and assault.',
    availableHours: '24x7 Toll Free',
  },
  {
    id: '3',
    name: 'National Cyber Crime Helpline',
    number: '1930',
    category: 'cyber',
    description: 'Instant reporting for online financial fraud, UPI scam, and bank account freeze.',
    availableHours: '24x7 Toll Free',
  },
  {
    id: '4',
    name: 'Childline Helpline',
    number: '1098',
    category: 'child',
    description: 'Emergency care, protection, and rescue helpline for children in distress.',
    availableHours: '24x7 Toll Free',
  },
  {
    id: '5',
    name: 'Elderline (Senior Citizens Helpline)',
    number: '14567',
    category: 'senior',
    description: 'Free legal advice, rescue, emotional support, and pension guidance for senior citizens.',
    availableHours: '8 AM - 8 PM Toll Free',
  },
  {
    id: '6',
    name: 'NALSA Free Legal Aid Helpline',
    number: '15100',
    category: 'legal',
    description: 'National Legal Services Authority helpline for free lawyer assignment and advice.',
    availableHours: '10 AM - 5 PM',
  },
];

export const HELP_CENTERS = [
  {
    name: 'All Women Police Station (AWPS) Teynampet',
    type: 'Police Station',
    phone: '044-24341091',
    address: 'DMS Complex, Teynampet, Chennai, Tamil Nadu',
    hours: '24 Hours',
  },
  {
    name: 'District Legal Services Authority (DLSA) Chennai',
    type: 'Legal Aid Office',
    phone: '044-25342525',
    address: 'High Court Building Complex, George Town, Chennai',
    hours: '10:00 AM - 5:00 PM',
  },
  {
    name: 'District Social Welfare Office & Protection Officer',
    type: 'Welfare Office',
    phone: '044-25264567',
    address: 'District Collectorate Complex, Rajaji Salai, Chennai',
    hours: '9:30 AM - 5:30 PM',
  },
];
