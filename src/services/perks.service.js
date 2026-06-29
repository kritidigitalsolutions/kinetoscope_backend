/**
 * Service to dynamically generate client perks based on their category/tier.
 * 
 * @param {string} tier - Client category/tier (DIAMOND, PLATINUM, GOLD, SILVER)
 * @returns {Array<Object>} List of perk objects with title, description, badge, and icon
 */
const getPerksByTier = (tier) => {
  const normalizedTier = (tier || 'SILVER').toUpperCase();

  switch (normalizedTier) {
    case 'DIAMOND':
      return [
        {
          title: 'Priority Support',
          description: 'Direct 24/7 dedicated support helpline and query resolution within 2 hours.',
          badge: 'DIAMOND',
          icon: 'phone',
        },
        {
          title: 'Annual Gala Invite',
          description: 'Complimentary premium access and VIP seating at the annual film gala and awards.',
          badge: 'DIAMOND',
          icon: 'ticket',
        },
        {
          title: 'Quarterly Review',
          description: 'One-on-one portfolio review sessions with senior strategists.',
          badge: 'DIAMOND',
          icon: 'chart',
        },
      ];
    case 'PLATINUM':
      return [
        {
          title: 'Priority Support',
          description: 'Helpline support and query resolution within 4 hours.',
          badge: 'PLATINUM',
          icon: 'phone',
        },
        {
          title: 'Annual Gala Invite',
          description: 'Complimentary standard access at the annual film gala and awards.',
          badge: 'PLATINUM',
          icon: 'ticket',
        },
        {
          title: 'Semi-Annual Review',
          description: 'One-on-one portfolio review sessions with senior investment advisers.',
          badge: 'PLATINUM',
          icon: 'chart',
        },
      ];
    case 'GOLD':
      return [
        {
          title: 'Standard Support',
          description: 'Query resolution within 24 hours.',
          badge: 'GOLD',
          icon: 'phone',
        },
        {
          title: 'Annual Review',
          description: 'One-on-one portfolio review session with an investment analyst once a year.',
          badge: 'GOLD',
          icon: 'chart',
        },
        {
          title: 'Premium Newsletter',
          description: 'Access to our premium weekly market updates and investment research.',
          badge: 'GOLD',
          icon: 'mail',
        },
      ];
    case 'SILVER':
    default:
      return [
        {
          title: 'Standard Support',
          description: 'Query resolution within 48 hours.',
          badge: 'SILVER',
          icon: 'phone',
        },
        {
          title: 'Basic Newsletter',
          description: 'Access to our monthly market newsletter.',
          badge: 'SILVER',
          icon: 'mail',
        },
      ];
  }
};

module.exports = {
  getPerksByTier,
};
