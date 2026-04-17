import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ProPredict'
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.propredict.app'

interface RatingFollowupProps {
  name?: string
  stars?: number
  trackingUrl?: string
}

const RatingFollowupEmail = ({ name, stars, trackingUrl }: RatingFollowupProps) => {
  const greeting = name ? `Hi ${name},` : 'Hi,'
  const ratingText =
    stars === 5
      ? 'a 5-star rating'
      : stars
        ? `a ${stars}-star rating`
        : 'your support'
  const ctaUrl = trackingUrl || PLAY_STORE_URL

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Thank you for your support 🙌</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={brand}>{SITE_NAME}</Heading>
          </Section>

          <Section style={content}>
            <Heading style={h1}>Thank you for your support 🙌</Heading>

            <Text style={text}>{greeting}</Text>

            <Text style={text}>
              Thank you for your support and for leaving {ratingText} — we
              truly appreciate it! ⭐
            </Text>

            <Text style={text}>
              It means a lot to us that you're enjoying {SITE_NAME}. We're
              working every day to improve the app and bring you even better
              match insights and predictions.
            </Text>

            <Text style={text}>
              If you have a moment, we'd really appreciate it if you could
              share your experience on Google Play as well.
            </Text>

            <Text style={textBold}>
              ⭐ Your feedback helps us grow and reach more users.
            </Text>

            <Section style={buttonContainer}>
              <Button href={ctaUrl} style={button}>
                ⭐ Leave a review on Google Play
              </Button>
            </Section>

            <Text style={textSmall}>
              Or copy this link:{' '}
              <Link href={PLAY_STORE_URL} style={link}>
                {PLAY_STORE_URL}
              </Link>
            </Text>

            <Text style={text}>
              It only takes a few seconds, and it helps us a lot 🙌
            </Text>

            <Text style={text}>
              Thanks again for being part of our community.
            </Text>

            <Text style={signature}>— The {SITE_NAME} Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RatingFollowupEmail,
  subject: (data: Record<string, any>) =>
    (data?.subject as string) || 'Thank you for your support 🙌',
  displayName: 'Rating follow-up',
  previewData: { name: 'Marko', stars: 5 },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: '0',
  padding: '0',
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0',
}

const header = {
  padding: '24px 32px',
  borderBottom: '1px solid #e5e7eb',
  textAlign: 'center' as const,
}

const brand = {
  fontSize: '22px',
  fontWeight: '800',
  color: '#0f9b8e',
  margin: '0',
  letterSpacing: '-0.5px',
}

const content = {
  padding: '32px',
}

const h1 = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0 0 24px',
  lineHeight: '1.3',
}

const text = {
  fontSize: '15px',
  color: '#475569',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const textBold = {
  fontSize: '15px',
  color: '#0f172a',
  fontWeight: '600',
  lineHeight: '1.6',
  margin: '20px 0',
}

const textSmall = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '12px 0 24px',
  wordBreak: 'break-all' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

const button = {
  backgroundColor: '#0f9b8e',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700',
  textDecoration: 'none',
  padding: '14px 32px',
  borderRadius: '10px',
  display: 'inline-block',
}

const link = {
  color: '#0f9b8e',
  textDecoration: 'underline',
}

const signature = {
  fontSize: '15px',
  color: '#0f172a',
  fontWeight: '600',
  margin: '24px 0 0',
}
