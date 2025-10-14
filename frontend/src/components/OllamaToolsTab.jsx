import { useState, useEffect } from 'react';
import { Container, Header, SpaceBetween, FormField, Select, Button, Alert, ProgressBar, Box, StatusIndicator, ColumnLayout, Input, Table } from '@cloudscape-design/components';

export function OllamaToolsTab() {
  const [ollamaStatus, setOllamaStatus] = useState({ available: false, has_model: false, models: [], recommended: [] });
  const [systemSpecs, setSystemSpecs] = useState({ container_memory_limit: 'Unknown', container_memory_limit_bytes: 0 });
  const [selectedModel, setSelectedModel] = useState('gemma2:2b');
  const [customModel, setCustomModel] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState({ status: '', percent: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    checkOllamaStatus();
    fetchSystemSpecs();
  }, []);

  async function checkOllamaStatus() {
    try {
      const response = await fetch('/api/ollama/status?ollama_url=http://ollama:11434');
      const data = await response.json();
      setOllamaStatus(data);
    } catch (err) {
      setOllamaStatus({ available: false, has_model: false, models: [], recommended: [] });
    }
  }

  async function fetchSystemSpecs() {
    try {
      const response = await fetch('/api/system/specs');
      const data = await response.json();
      setSystemSpecs(data);
    } catch (err) {
      setSystemSpecs({ container_memory_limit: 'Unknown', container_memory_limit_bytes: 0 });
    }
  }

  function parseMemoryGB(memStr) {
    const match = memStr.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  function exceedsMemory(ramRequired) {
    const containerLimit = systemSpecs.container_memory_limit_bytes / (1024**3);
    const required = parseMemoryGB(ramRequired);
    return containerLimit > 0 && required > containerLimit;
  }

  async function pullModel() {
    setPulling(true);
    setError('');
    setPullProgress({ status: 'Connecting...', percent: 0 });
    
    const modelToPull = useCustom ? customModel.trim() : selectedModel;
    
    try {
      const response = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelToPull, ollama_url: 'http://ollama:11434' })
      });
      
      if (!response.ok) {
        throw new Error('Failed to start model pull');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          const data = JSON.parse(line.slice(6));
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          if (data.status) {
            const percent = data.completed && data.total 
              ? Math.round((data.completed / data.total) * 100)
              : 0;
            setPullProgress({ status: data.status, percent });
          }
        }
      }
      
      setPullProgress({ status: 'Complete', percent: 100 });
      setTimeout(async () => {
        await checkOllamaStatus();
        setPullProgress({ status: '', percent: 0 });
      }, 1000);
    } catch (err) {
      setError(err.message);
      setPullProgress({ status: '', percent: 0 });
    } finally {
      setPulling(false);
    }
  }

  return (
    <SpaceBetween size="l">
      <Container
        header={
          <Header 
            variant="h2"
            description="Manage Ollama AI models for regex generation"
            actions={
              <Button iconName="refresh" onClick={checkOllamaStatus}>
                Refresh Status
              </Button>
            }
          >
            Ollama Status
          </Header>
        }
      >
        <SpaceBetween size="m">
          {!ollamaStatus.available ? (
            <Alert type="error" header="Ollama not available">
              The Ollama service is not running or not accessible.
            </Alert>
          ) : (
            <Alert type="success" header="Ollama is running">
              <StatusIndicator type="success">Connected to Ollama service</StatusIndicator>
            </Alert>
          )}

          {ollamaStatus.available && (
            <Box>
              <Box variant="awsui-key-label" margin={{ bottom: 'xs' }}>Container Memory Limit: {systemSpecs.container_memory_limit}</Box>
            </Box>
          )}

          {ollamaStatus.available && ollamaStatus.model_details && ollamaStatus.model_details.length > 0 && (
            <Table
              columnDefinitions={[
                { id: 'name', header: 'Model', cell: item => item.name },
                { id: 'size', header: 'Download Size', cell: item => item.size },
                { 
                  id: 'ram', 
                  header: 'RAM Required', 
                  cell: item => (
                    <span style={{ color: exceedsMemory(item.ram_required) ? '#d13212' : 'inherit', fontWeight: exceedsMemory(item.ram_required) ? 'bold' : 'normal' }}>
                      {item.ram_required}
                      {exceedsMemory(item.ram_required) && ' ⚠️'}
                    </span>
                  )
                },
                { id: 'vram', header: 'VRAM (GPU)', cell: item => item.vram_required }
              ]}
              items={ollamaStatus.model_details || []}
              variant="embedded"
              empty={
                <Box textAlign="center" color="inherit">
                  <Box variant="p" color="inherit">No models installed</Box>
                </Box>
              }
            />
          )}

          {ollamaStatus.available && (!ollamaStatus.model_details || ollamaStatus.model_details.length === 0) && (
            <Alert type="info" header="No models installed">
              Pull a model below to get started with AI-powered regex generation. Container memory limit: {systemSpecs.container_memory_limit}
            </Alert>
          )}

          {ollamaStatus.available && ollamaStatus.model_details && ollamaStatus.model_details.some(m => exceedsMemory(m.ram_required)) && (
            <Alert type="warning" header="Memory warning">
              Some models (marked with ⚠️) require more RAM than the container limit ({systemSpecs.container_memory_limit}). They may fail to load or run slowly.
            </Alert>
          )}
        </SpaceBetween>
      </Container>

      <Container
        header={
          <Header variant="h2" description="Download AI models for regex generation">
            Pull Model
          </Header>
        }
      >
        <SpaceBetween size="m">
          <Alert type="info" header="Model sizes">
            Smaller models are faster but may be less accurate. Recommended: gemma2:2b (1.6GB)
          </Alert>

          <FormField
            label="Select model to download"
            description="Choose from popular models or enter a custom model name"
          >
            <Select
              selectedOption={{ label: selectedModel, value: selectedModel }}
              onChange={({ detail }) => {
                setSelectedModel(detail.selectedOption.value);
                setUseCustom(false);
              }}
              options={[
                { label: 'gemma2:2b (1.6GB - Recommended)', value: 'gemma2:2b' },
                { label: 'gemma2:9b (5.4GB)', value: 'gemma2:9b' },
                { label: 'phi3:mini (2.3GB)', value: 'phi3:mini' },
                { label: 'phi3:medium (7.9GB)', value: 'phi3:medium' },
                { label: 'qwen2.5:0.5b (400MB - Fastest)', value: 'qwen2.5:0.5b' },
                { label: 'qwen2.5:1.5b (1GB)', value: 'qwen2.5:1.5b' },
                { label: 'qwen2.5:3b (2GB)', value: 'qwen2.5:3b' },
                { label: 'qwen2.5:7b (4.7GB)', value: 'qwen2.5:7b' },
                { label: 'qwen2.5-coder:1.5b (1GB)', value: 'qwen2.5-coder:1.5b' },
                { label: 'qwen2.5-coder:7b (4.7GB)', value: 'qwen2.5-coder:7b' },
                { label: 'deepseek-coder-v2:16b (9GB)', value: 'deepseek-coder-v2:16b' },
                { label: 'codellama:7b (3.8GB)', value: 'codellama:7b' }
              ]}
              disabled={!ollamaStatus.available || pulling || useCustom}
            />
          </FormField>

          <FormField
            label="Or enter custom model name"
            description="Paste any model name from ollama.com/library (e.g., llama3.2:3b)"
          >
            <Input
              value={customModel}
              onChange={({ detail }) => {
                setCustomModel(detail.value);
                setUseCustom(detail.value.trim().length > 0);
              }}
              placeholder="llama3.2:3b"
              disabled={!ollamaStatus.available || pulling}
            />
          </FormField>

          <Button
            variant="primary"
            onClick={pullModel}
            loading={pulling}
            disabled={!ollamaStatus.available || (!useCustom && !selectedModel) || (useCustom && !customModel.trim())}
            iconName="download"
          >
            Pull {useCustom ? customModel : selectedModel}
          </Button>

          {pulling && pullProgress.status && (
            <ProgressBar
              value={pullProgress.percent}
              label="Downloading model"
              description={pullProgress.status}
              variant="standalone"
            />
          )}

          {error && (
            <Alert type="error" header="Pull failed">
              {error}
            </Alert>
          )}
        </SpaceBetween>
      </Container>
    </SpaceBetween>
  );
}
