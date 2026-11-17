import { Legal } from '@/components/legal';
export const metadata = { title: 'Terms of use' };
export default function Terms() {
  return (
    <Legal title="Terms of use" note="Draft for review by a lawyer before launch.">
      <h2>Your contributions</h2>
      <p>You may only upload photos, menus and reviews that you created or have the right to share. By submitting, you give paBudget a free, non-exclusive licence to display them in the app and website. You are responsible for what you post.</p>
      <h2>What we reject</h2>
      <p>Content that is unsafe, offensive, spam, advertising disguised as a review, fake or paid reviews, photos where people are the main subject, or prices you know to be wrong.</p>
      <h2>Moderation</h2>
      <p>Submissions are checked automatically and by our team before they go public. Trusted contributors’ reviews and photos may be published straight away and checked afterwards. We may remove content or suspend accounts.</p>
      <h2>Takedowns</h2>
      <p>If you own a venue or a photo and want something removed, contact us. We handle takedown requests within 72 hours.</p>
      <h2>Prices</h2>
      <p>Prices come from the community and can be out of date. Always confirm with the venue.</p>
    </Legal>
  );
}
