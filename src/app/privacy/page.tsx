import LegalShell, { H, P } from '../legal-shell';

export const metadata = { title: 'Privacy — OpenStatus' };

export default function Privacy() {
  return (
    <LegalShell title="Privacy" updated="September 2026">
      <P>
        Short version: we collect what is needed to run your page and nothing we
        cannot justify. We do not sell anything about you or your customers.
      </P>

      <H>What we hold about business owners</H>
      <P>
        Your email address and password (stored hashed, by Supabase, never by us in
        readable form). Your business details — name, address, phone, website,
        hours, category, photos and links — because that is the page. If you connect
        Google, we store the access tokens needed to read and update your listing.
      </P>

      <H>What we hold about your visitors</H>
      <P>
        When someone opens your page we record that a view happened, which row they
        tapped, and a rough source such as &ldquo;Instagram&rdquo; or
        &ldquo;Direct&rdquo;. We keep a random visitor identifier so a person
        returning twice is not counted as two people. We do not store IP addresses
        or the full referring URL, and there is no advertising tracking on your
        page.
      </P>

      <H>Who else sees it</H>
      <P>
        Supabase hosts the database. Vercel serves the site. Google receives the
        hours you ask us to publish and returns your listing&rsquo;s photos, rating
        and reviews. That is the whole list.
      </P>

      <H>Your private phone link</H>
      <P>
        The link that lets you change hours from your phone is a secret. Treat it
        like a password. It can be revoked at any time from the builder, which
        immediately signs out every device that used it.
      </P>

      <H>Deleting your data</H>
      <P>
        Deleting your account from Settings removes your business, your page, your
        hours and your analytics. Email{' '}
        <a href="mailto:info@openstatus.co" style={{ color: '#3F3F3F' }}>info@openstatus.co</a>{' '}
        if you want a copy of your data first, or if you would rather we did the
        deletion for you.
      </P>
    </LegalShell>
  );
}
