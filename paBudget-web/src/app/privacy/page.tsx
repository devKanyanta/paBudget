import { Legal } from '@/components/legal';
export const metadata = { title: 'Privacy policy' };
export default function Privacy() {
  return (
    <Legal title="Privacy policy" note="Draft for review by a lawyer before launch. Written with Zambia’s Data Protection Act No. 3 of 2021 in mind.">
      <h2>What we collect</h2>
      <p>Your name, email and/or phone number, the content you contribute, and your location only when you tap “near me” or “use my location” and allow it. Photos are stripped of location metadata when uploaded.</p>
      <h2>Why</h2>
      <p>To run your account, identify contributors, show your contributions with your display name, prevent abuse, and improve the service.</p>
      <h2>Your rights</h2>
      <p>You can change your details or delete your account and personal data any time in Settings. Places and reviews you contributed remain but are no longer linked to your identity.</p>
    </Legal>
  );
}
