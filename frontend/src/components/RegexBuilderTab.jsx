import { useState, useEffect } from 'react';
import { Container, Header, Alert, SpaceBetween, FormField, Textarea, Button, Box, StatusIndicator, Select } from '@cloudscape-design/components';

export function RegexBuilderTab() {
  const [description, setDescription] = useState('');
  const [generatedRegex, setGeneratedRegex] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState({ available: false, has_model: false, models: [], recommended: [] });
  const [selectedModel, setSelectedModel] = useState(null);


  useEffect(() => {
    checkOllamaStatus();
  }, []);

  useEffect(() => {
    if (ollamaStatus.models.length > 0 && !selectedModel) {
      setSelectedModel(ollamaStatus.models[0]);
    }
  }, [ollamaStatus.models, selectedModel]);

  async function checkOllamaStatus() {
    try {
      const response = await fetch('/api/ollama/status?ollama_url=http://ollama:11434');
      const data = await response.json();
      setOllamaStatus(data);
    } catch (err) {
      setOllamaStatus({ available: false, has_model: false, models: [], recommended: [] });
    }
  }



  async function generateRegex() {
    if (!description.trim()) return;
    
    setLoading(true);
    setError('');
    setGeneratedRegex('');
    setExplanation('');

    try {
      const response = await fetch('/api/english-to-regex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, model: selectedModel, ollama_url: 'http://ollama:11434' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate regex');
      }

      const data = await response.json();
      setGeneratedRegex(data.regex);
      setExplanation(data.explanation);
    } catch (err) {
      let errorMsg = err.message;
      if (errorMsg.includes('500')) {
        errorMsg = `Model '${selectedModel}' may be too large for available memory. Try a smaller model like gemma2:2b.`;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SpaceBetween size="l">
      <Container
        header={
          <Header 
            variant="h2" 
            description="AI-powered regex generation using Ollama"
            actions={
              <Button iconName="refresh" onClick={checkOllamaStatus}>
                Check Ollama
              </Button>
            }
          >
            English to RegEx (AI)
          </Header>
        }
      >
        <SpaceBetween size="m">
          <Alert type="warning" header="AI can make mistakes">
            This is a helper tool. Always test generated regex patterns in the tester below before using in production.
          </Alert>

          {!ollamaStatus.available && (
            <Alert type="warning" header="Ollama not detected">
              Install Ollama and pull a model:
              <Box margin={{ top: 'xs' }} fontFamily="monospace">
                ollama pull gemma2:2b
              </Box>
            </Alert>
          )}
          {ollamaStatus.available && !ollamaStatus.has_model && (
            <Alert type="info" header="No models installed">
              Go to the Ollama Tools tab to download a model.
            </Alert>
          )}
          {ollamaStatus.available && ollamaStatus.has_model && (
            <Alert type="success" header="Ollama ready">
              <StatusIndicator type="success">Model available: {ollamaStatus.models.join(', ')}</StatusIndicator>
            </Alert>
          )}

          {ollamaStatus.models.length > 0 && (
            <FormField
              label="Model"
              description="Select from installed models"
            >
              <Select
                selectedOption={selectedModel ? { label: selectedModel, value: selectedModel } : null}
                onChange={({ detail }) => setSelectedModel(detail.selectedOption.value)}
                options={ollamaStatus.models.map(model => ({ label: model, value: model }))}
                placeholder="Select a model"
              />
            </FormField>
          )}

          <FormField
            label="Describe what you want to match"
            description="Example: 'Match email addresses' or 'Find AWS account IDs'"
          >
            <Textarea
              value={description}
              onChange={({ detail }) => setDescription(detail.value)}
              placeholder="Describe the pattern you want to match..."
              rows={3}
            />
          </FormField>

          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="primary"
              onClick={generateRegex}
              loading={loading}
              disabled={!description.trim() || !ollamaStatus.available || !ollamaStatus.has_model || !selectedModel}
            >
              Generate RegEx
            </Button>
          </SpaceBetween>

          {error && (
            <Alert type="error" header="Generation failed">
              {error}
            </Alert>
          )}

          {generatedRegex && (
            <SpaceBetween size="s">
              <FormField label="Generated RegEx">
                <Box padding="s" backgroundColor="background-container-content" fontFamily="monospace">
                  {generatedRegex}
                </Box>
              </FormField>
              {explanation && (
                <FormField label="Explanation">
                  <Box padding="s">
                    {explanation}
                  </Box>
                </FormField>
              )}
            </SpaceBetween>
          )}
        </SpaceBetween>
      </Container>


    </SpaceBetween>
  );
}
