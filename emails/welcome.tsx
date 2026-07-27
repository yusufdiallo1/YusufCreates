import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  name?: string;
}

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to YusufCreates</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "sans-serif" }}>
        <Container style={{ padding: "24px" }}>
          <Heading as="h1">Welcome{name ? `, ${name}` : ""}</Heading>
          <Text>Thanks for signing up. We&apos;re glad you&apos;re here.</Text>
        </Container>
      </Body>
    </Html>
  );
}
