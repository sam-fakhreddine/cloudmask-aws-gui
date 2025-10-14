import { Container, Header, Alert } from '@cloudscape-design/components';

export function RegexBuilderTab() {
  return (
    <Container
      header={
        <Header variant="h2" description="Interactive regex testing and debugging">
          RegEx Builder
        </Header>
      }
    >
      <Alert type="info" header="Powered by OpenRegex">
        Test and debug regular expressions with multiple engine support (Python, Java, JavaScript, C++)
      </Alert>
      <iframe
        src="/regex/"
        style={{
          width: '100%',
          height: '800px',
          border: '1px solid var(--color-border-divider-default)',
          borderRadius: '8px',
          marginTop: '16px'
        }}
        title="OpenRegex - Regex Builder"
      />
    </Container>
  );
}
