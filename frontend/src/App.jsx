import { useState, useEffect } from 'react';
import { AppLayout, Header, SpaceBetween, Button } from '@cloudscape-design/components';
import '@cloudscape-design/global-styles/index.css';
import { MaskingForm } from './components/MaskingForm';
import { applyMode, Mode } from '@cloudscape-design/global-styles';

function App() {
  const [theme, setTheme] = useState(() => 
    localStorage.getItem('theme') || Mode.Dark
  );

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
          <div id="header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 0' }}>
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
          <MaskingForm />
        </SpaceBetween>
      }
    />
  );
}

export default App;
