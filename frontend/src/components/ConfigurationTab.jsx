import { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  FormField,
  Input,
  Textarea,
  Button,
  ColumnLayout,
  Flashbar,
  Alert,
  Badge,
  Toggle,
  ExpandableSection,
  Select,
  Modal,
  Box
} from '@cloudscape-design/components';
import axios from 'axios';
import { fileSave, fileOpen } from 'browser-fs-access';
import JSZip from 'jszip';
import yaml from 'js-yaml';

export function ConfigurationTab({ config, setConfig, savedConfigs, setSavedConfigs, setSelectedConfigName }) {
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showImportSaveModal, setShowImportSaveModal] = useState(false);
  const [configName, setConfigName] = useState('');
  const [importedConfig, setImportedConfig] = useState(null);
  
  const [companyName, setCompanyName] = useState('');
  const [patternName, setPatternName] = useState('');
  const [patternRegex, setPatternRegex] = useState('');
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  function saveConfigToStorage() {
    if (!configName.trim()) {
      setNotifications([{
        type: 'error',
        content: 'Config name is required',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    const newConfig = {
      name: configName,
      config: config,
      timestamp: new Date().toISOString()
    };

    const existing = savedConfigs.filter(c => c.name !== configName);
    const updated = [...existing, newConfig];
    
    localStorage.setItem('cloudmask_configs', JSON.stringify(updated));
    setSavedConfigs(updated);
    setSelectedConfigName(configName);
    setShowSaveModal(false);
    setConfigName('');
    
    setNotifications([{
      type: 'success',
      content: `Configuration "${configName}" saved`,
      dismissible: true,
      onDismiss: () => setNotifications([])
    }]);
  }

  function loadConfigFromStorage(configName) {
    const found = savedConfigs.find(c => c.name === configName);
    if (found) {
      setConfig(found.config);
      setSelectedConfig({ label: found.name, value: found.name });
      setSelectedConfigName(configName);
      setNotifications([{
        type: 'success',
        content: `Loaded configuration "${found.name}"`,
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    }
  }

  function deleteConfig(configName) {
    const updated = savedConfigs.filter(c => c.name !== configName);
    localStorage.setItem('cloudmask_configs', JSON.stringify(updated));
    setSavedConfigs(updated);
    if (selectedConfig?.value === configName) {
      setSelectedConfig(null);
      setSelectedConfigName(null);
    }
    setNotifications([{
      type: 'success',
      content: `Deleted configuration "${configName}"`,
      dismissible: true,
      onDismiss: () => setNotifications([])
    }]);
  }

  async function exportConfig() {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    try {
      await fileSave(blob, {
        fileName: `cloudmask-config-${Date.now()}.json`,
        extensions: ['.json']
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        setNotifications([{
          type: 'error',
          content: 'Failed to export config',
          dismissible: true,
          onDismiss: () => setNotifications([])
        }]);
      }
    }
  }

  async function importConfig() {
    try {
      const file = await fileOpen({
        extensions: ['.json', '.yml', '.yaml'],
        description: 'CloudMask Config',
        startIn: 'documents'
      });
      const text = await file.text();
      const imported = file.name.endsWith('.json') 
        ? JSON.parse(text)
        : yaml.load(text);
      setConfig(imported);
      setImportedConfig(imported);
      const baseName = file.name.replace(/\.(json|ya?ml)$/, '');
      setConfigName(baseName);
      setShowImportSaveModal(true);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setNotifications([{
          type: 'error',
          content: 'Failed to import config',
          dismissible: true,
          onDismiss: () => setNotifications([])
        }]);
      }
    }
  }

  function saveImportedConfig() {
    if (!configName.trim()) {
      setNotifications([{
        type: 'error',
        content: 'Config name is required',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    const newConfig = {
      name: configName,
      config: importedConfig,
      timestamp: new Date().toISOString()
    };

    const existing = savedConfigs.filter(c => c.name !== configName);
    const updated = [...existing, newConfig];
    
    localStorage.setItem('cloudmask_configs', JSON.stringify(updated));
    setSavedConfigs(updated);
    setSelectedConfigName(configName);
    setShowImportSaveModal(false);
    setConfigName('');
    setImportedConfig(null);
    
    setNotifications([{
      type: 'success',
      content: `Configuration "${configName}" imported and saved`,
      dismissible: true,
      onDismiss: () => setNotifications([])
    }]);
  }

  async function backupAllConfigs() {
    if (savedConfigs.length === 0) {
      setNotifications([{
        type: 'warning',
        content: 'No configurations to backup',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    try {
      const zip = new JSZip();
      
      savedConfigs.forEach(cfg => {
        const filename = `${cfg.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        zip.file(filename, JSON.stringify(cfg.config, null, 2));
      });
      
      const blob = await zip.generateAsync({ type: 'blob' });
      const now = new Date();
      const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
      
      await fileSave(blob, {
        fileName: `cloudmask-configs-backup-${timestamp}.zip`,
        extensions: ['.zip']
      });
      
      setNotifications([{
        type: 'success',
        content: `Backed up ${savedConfigs.length} configuration(s)`,
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setNotifications([{
          type: 'error',
          content: 'Failed to backup configs',
          dismissible: true,
          onDismiss: () => setNotifications([])
        }]);
      }
    }
  }

  function addCompanyName() {
    if (!companyName.trim()) return;
    setConfig({
      ...config,
      company_names: [...config.company_names, companyName.trim()]
    });
    setCompanyName('');
  }

  function removeCompanyName(index) {
    setConfig({
      ...config,
      company_names: config.company_names.filter((_, i) => i !== index)
    });
  }

  function addCustomPattern() {
    if (!patternName.trim() || !patternRegex.trim()) {
      setNotifications([{
        type: 'error',
        content: 'Pattern name and regex are required',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    setConfig({
      ...config,
      custom_patterns: [...config.custom_patterns, {
        name: patternName.trim(),
        pattern: patternRegex.trim()
      }]
    });
    setPatternName('');
    setPatternRegex('');
  }

  function removeCustomPattern(index) {
    setConfig({
      ...config,
      custom_patterns: config.custom_patterns.filter((_, i) => i !== index)
    });
  }

  async function testRegex() {
    if (!patternRegex.trim() || !testText.trim()) {
      setNotifications([{
        type: 'error',
        content: 'Both regex pattern and test text are required',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/test-regex', {
        pattern: patternRegex,
        text: testText
      });
      setTestResult(response.data);
      setNotifications([{
        type: 'success',
        content: `Found ${response.data.matches.length} match(es)`,
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } catch (err) {
      setNotifications([{
        type: 'error',
        content: err.response?.data?.detail || 'Regex test failed',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
      setTestResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function validateConfig() {
    setLoading(true);
    try {
      await axios.post('/api/validate-config', config);
      setNotifications([{
        type: 'success',
        content: 'Configuration is valid',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } catch (err) {
      setNotifications([{
        type: 'error',
        content: err.response?.data?.detail || 'Configuration validation failed',
        dismissible: true,
        onDismiss: () => setNotifications([])
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SpaceBetween size="l">
      <Flashbar items={notifications} />

      <ColumnLayout columns={2}>
        <SpaceBetween size="l">
          <Container header={<Header variant="h2">General Settings</Header>}>
            <SpaceBetween size="m">
              <FormField label="Seed" description="Deterministic seed for consistent anonymization">
                <Input
                  value={config.seed}
                  onChange={e => setConfig({ ...config, seed: e.detail.value })}
                  placeholder="my-secret-seed"
                />
              </FormField>

              <Toggle
                checked={config.preserve_prefixes}
                onChange={e => setConfig({ ...config, preserve_prefixes: e.detail.checked })}
              >
                Preserve AWS resource prefixes (vpc-, i-, sg-, etc.)
              </Toggle>

              <Toggle
                checked={config.anonymize_ips}
                onChange={e => setConfig({ ...config, anonymize_ips: e.detail.checked })}
              >
                Anonymize IP addresses
              </Toggle>

              <Toggle
                checked={config.anonymize_domains}
                onChange={e => setConfig({ ...config, anonymize_domains: e.detail.checked })}
              >
                Anonymize domain names
              </Toggle>
            </SpaceBetween>
          </Container>

          <Container header={<Header variant="h2">Company Names</Header>}>
            <SpaceBetween size="m">
              <FormField description="Add company names to anonymize">
                <SpaceBetween direction="horizontal" size="xs">
                  <Input
                    value={companyName}
                    onChange={e => setCompanyName(e.detail.value)}
                    placeholder="Acme Corp"
                    onKeyDown={e => e.detail.key === 'Enter' && addCompanyName()}
                  />
                  <Button onClick={addCompanyName} disabled={!companyName.trim()}>
                    Add
                  </Button>
                </SpaceBetween>
              </FormField>

              {config.company_names.length > 0 && (
                <SpaceBetween size="xs">
                  {config.company_names.map((name, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Badge>{name}</Badge>
                      <Button
                        variant="icon"
                        iconName="close"
                        onClick={() => removeCompanyName(i)}
                      />
                    </div>
                  ))}
                </SpaceBetween>
              )}
            </SpaceBetween>
          </Container>
        </SpaceBetween>

        <SpaceBetween size="l">
          <Container header={<Header variant="h2">Custom Patterns</Header>}>
            <SpaceBetween size="m">
              <FormField label="Pattern name" description="Identifier for this pattern">
                <Input
                  value={patternName}
                  onChange={e => setPatternName(e.detail.value)}
                  placeholder="ticket"
                />
              </FormField>

              <FormField label="Regex pattern" description="Regular expression to match">
                <Input
                  value={patternRegex}
                  onChange={e => setPatternRegex(e.detail.value)}
                  placeholder="\bTICKET-\d{4,6}\b"
                />
              </FormField>

              <Button onClick={addCustomPattern} disabled={!patternName.trim() || !patternRegex.trim()}>
                Add pattern
              </Button>

              {config.custom_patterns.length > 0 && (
                <SpaceBetween size="xs">
                  {config.custom_patterns.map((pattern, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <Badge color="blue">{pattern.name}</Badge>
                      <code style={{ fontSize: '12px', background: 'var(--color-background-code-block)', padding: '2px 6px', borderRadius: '4px' }}>
                        {pattern.pattern}
                      </code>
                      <Button
                        variant="icon"
                        iconName="close"
                        onClick={() => removeCustomPattern(i)}
                      />
                    </div>
                  ))}
                </SpaceBetween>
              )}
            </SpaceBetween>
          </Container>

          <Container header={<Header variant="h2">Regex Helper</Header>}>
            <SpaceBetween size="m">
              <Alert type="info">
                Test your regex patterns before adding them to the configuration
              </Alert>

              <FormField label="Test text" description="Sample text to test against">
                <Textarea
                  value={testText}
                  onChange={e => setTestText(e.detail.value)}
                  rows={4}
                  placeholder="Enter sample text containing patterns to match..."
                />
              </FormField>

              <Button
                onClick={testRegex}
                loading={loading}
                disabled={!patternRegex.trim() || !testText.trim()}
              >
                Test regex
              </Button>

              {testResult && (
                <ExpandableSection headerText={`Matches found: ${testResult.matches.length}`} defaultExpanded>
                  <SpaceBetween size="xs">
                    {testResult.matches.length > 0 ? (
                      testResult.matches.map((match, i) => (
                        <Badge key={i} color="green">{match}</Badge>
                      ))
                    ) : (
                      <Alert type="warning">No matches found</Alert>
                    )}
                  </SpaceBetween>
                </ExpandableSection>
              )}
            </SpaceBetween>
          </Container>
        </SpaceBetween>
      </ColumnLayout>

      <Container header={<Header variant="h2">Manage Configurations</Header>}>
        <SpaceBetween size="m">
          <Alert type="info">
            To import from ~/.cloudmask, navigate to your home directory and select the .cloudmask folder when the file picker opens.
          </Alert>
          <FormField label="Saved configurations" description="Load a previously saved configuration">
            <SpaceBetween direction="horizontal" size="xs">
              <Select
                selectedOption={selectedConfig}
                onChange={({ detail }) => loadConfigFromStorage(detail.selectedOption.value)}
                options={savedConfigs.map(c => ({ label: c.name, value: c.name }))}
                placeholder="Select a configuration"
                empty="No saved configurations"
              />
              {selectedConfig && (
                <Button
                  iconName="remove"
                  onClick={() => deleteConfig(selectedConfig.value)}
                >
                  Delete
                </Button>
              )}
            </SpaceBetween>
          </FormField>

          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="primary" onClick={validateConfig} loading={loading}>
              Validate
            </Button>
            <Button onClick={() => setShowSaveModal(true)}>
              Save as...
            </Button>
            <Button onClick={exportConfig}>
              Export config
            </Button>
            <Button onClick={importConfig}>
              Import config
            </Button>
            <Button iconName="download" onClick={backupAllConfigs}>
              Backup all configs
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      </Container>

      <Modal
        visible={showSaveModal}
        onDismiss={() => setShowSaveModal(false)}
        header="Save Configuration"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => setShowSaveModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={saveConfigToStorage}>
                Save
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Configuration name">
          <Input
            value={configName}
            onChange={e => setConfigName(e.detail.value)}
            placeholder="e.g., Production AWS"
          />
        </FormField>
      </Modal>

      <Modal
        visible={showImportSaveModal}
        onDismiss={() => {
          setShowImportSaveModal(false);
          setConfigName('');
          setImportedConfig(null);
        }}
        header="Save Imported Configuration"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => {
                setShowImportSaveModal(false);
                setConfigName('');
                setImportedConfig(null);
                setNotifications([{
                  type: 'info',
                  content: 'Configuration loaded but not saved',
                  dismissible: true,
                  onDismiss: () => setNotifications([])
                }]);
              }}>Skip</Button>
              <Button variant="primary" onClick={saveImportedConfig}>
                Save
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="info">
            Save this configuration to access it later from the dropdown.
          </Alert>
          <FormField label="Configuration name">
            <Input
              value={configName}
              onChange={e => setConfigName(e.detail.value)}
              placeholder="e.g., Production AWS"
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
}
