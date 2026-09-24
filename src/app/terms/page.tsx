import LegalShell, { H, P } from '../legal-shell';

export const metadata = { title: 'Terms — OpenStatus' };

export default function Terms() {
  return (
    <LegalShell title="Terms of service" updated="September 2026">
      <P>
        OpenStatus gives a small business one link that shows whether they are open
        right now, along with the things a customer needs next. By creating an
        account you agree to what follows.
      </P>

      <H>Your account</H>
      <P>
        You need an account to build a page. Keep your password to yourself, and
        keep your private phone link to yourself too — anyone who has it can change
        your hours. If you lose a device, use &ldquo;Get a new link&rdquo; in the
        builder, which signs out every phone that had the old one.
      </P>

      <H>Your page and your content</H>
      <P>
        Your business name, photos, hours, links and offers stay yours. You give us
        permission to show them on your OpenStatus page and to pass them to the
        services you connect, which today means Google Business Profile. You are
        responsible for what your page says: if it advertises an offer or an
        opening time, that is a promise you are making to your customers, not one
        we are making for you.
      </P>

      <H>Connecting Google</H>
      <P>
        If you connect Google Business Profile, you are allowing OpenStatus to read
        your listing and to write your regular and special hours back to it. We do
        not change anything else about your listing. You can disconnect at any time
        from your Google account settings.
      </P>

      <H>What we do not promise</H>
      <P>
        We work hard to keep your page up and accurate, but we cannot guarantee it
        is always reachable or always right. Hours shown depend on what you and
        Google tell us. We are not liable for business lost because a page was
        down, slow, or showing a status you had not updated.
      </P>

      <H>Ending things</H>
      <P>
        You can delete your account at any time from Settings, which removes your
        page and your data. We may suspend an account that is being used to
        impersonate a business, break the law, or abuse the service.
      </P>

      <H>Changes</H>
      <P>
        If these terms change in a way that matters, we will say so by email before
        it takes effect.
      </P>
    </LegalShell>
  );
}
