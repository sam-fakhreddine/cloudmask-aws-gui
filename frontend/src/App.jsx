import { useState, useEffect } from 'react';
import { AppLayout, Header, SpaceBetween, Button, Tabs, Select, FormField } from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';
import { MaskingForm } from './components/MaskingForm';
import { UnmaskingForm } from './components/UnmaskingForm';
import { ConfigurationTab } from './components/ConfigurationTab';
import { RegexBuilderTab } from './components/RegexBuilderTab';
import { applyMode, Mode } from '@cloudscape-design/global-styles';

function App() {
  const [theme, setTheme] = useState(() => 
    localStorage.getItem('theme') || Mode.Dark
  );
  const [activeTab, setActiveTab] = useState('masking');
  const [config, setConfig] = useState({
    company_names: [],
    custom_patterns: [],
    preserve_prefixes: true,
    anonymize_ips: true,
    anonymize_domains: false,
    seed: ''
  });
  const [savedConfigs, setSavedConfigs] = useState([]);
  const [selectedConfigName, setSelectedConfigName] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('cloudmask_configs');
    if (saved) {
      setSavedConfigs(JSON.parse(saved));
    }
  }, []);

  function loadConfig(configName) {
    const found = savedConfigs.find(c => c.name === configName);
    if (found) {
      setConfig(found.config);
      setSelectedConfigName(configName);
    }
  }

  useEffect(() => {
    applyMode(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === Mode.Dark ? Mode.Light : Mode.Dark);
  };

  return (
    <AppLayout
      navigationHide
      toolsHide
      maxContentWidth={Number.MAX_VALUE}
      headerSelector="#header"
      content={
        <SpaceBetween size="l">
          <div id="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <FormField label="Config in use" stretch={false}>
              <Select
                selectedOption={selectedConfigName ? { label: selectedConfigName, value: selectedConfigName } : null}
                onChange={({ detail }) => loadConfig(detail.selectedOption.value)}
                options={savedConfigs.map(c => ({ label: c.name, value: c.name }))}
                placeholder="Default (no config)"
                empty="No saved configurations"
              />
            </FormField>
            <Button
              iconName={theme === Mode.Dark ? 'view-full' : 'view-horizontal'}
              onClick={toggleTheme}
            >
              {theme === Mode.Dark ? 'Light' : 'Dark'} mode
            </Button>
          </div>
          <Header 
            variant="h1"
            description="Anonymize AWS infrastructure identifiers for secure LLM processing"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img src="/logo.png" alt="CloudMask" style={{ height: '48px' }} />
              CloudMask GUI
            </div>
          </Header>
          <Tabs
            activeTabId={activeTab}
            onChange={({ detail }) => setActiveTab(detail.activeTabId)}
            tabs={[
              {
                id: 'masking',
                label: 'Mask Data',
                content: <MaskingForm config={config} />
              },
              {
                id: 'unmasking',
                label: 'Unmask Data',
                content: <UnmaskingForm />
              },
              {
                id: 'config',
                label: 'Configuration',
                content: <ConfigurationTab config={config} setConfig={setConfig} savedConfigs={savedConfigs} setSavedConfigs={setSavedConfigs} setSelectedConfigName={setSelectedConfigName} />
              },
              {
                id: 'regex',
                label: 'RegEx Builder',
                content: <RegexBuilderTab />
              }
            ]}
          />
        </SpaceBetween>
      }
    />
  );
}

export default App;
